/**
 * src/main.js
 *
 * Purpose:
 * Coordinates the full browser demo after app.js starts it.
 *
 * Intent:
 * This file is responsible for state ownership, global event routing, and
 * workflow coordination because the editor needs one central controller that
 * connects authoring UI, insertion modals, saving, preview, and SCORM export.
 *
 * Role in the app:
 * - Loads the page JSON model from src/state/page-state.js.
 * - Renders the top-level authoring shell from src/authoring/shell.js.
 * - Delegates block mutations to src/authoring/editor-actions.js.
 * - Creates new blocks from src/insertion/element-definitions.js and
 *   src/insertion/layout-definitions.js.
 * - Sends JSON and SCORM export requests to src/scorm/exporter.js.
 *
 * Important state:
 * - pageState: the current JSON model for the page.
 * - previewMode: toggles editable authoring chrome vs learner-facing preview.
 * - appRoot: DOM node where the authoring shell is rendered.
 */
import { renderJson, renderShell } from "./authoring/shell.js";
import { initializeActivityInteractions } from "./authoring/activity-interactions.js";
import { checkQuizAnswer, insertBlockIntoRegion, updateBlockItemField, updateBlockOrder, updateEditableValue, updateInputValue } from "./authoring/editor-actions.js";
import { pickTier1Icon } from "./authoring/icon-picker.js";
import { createBlock, getBlockLabel } from "./insertion/element-definitions.js";
import { createLayoutBlock, layoutDefinitions } from "./insertion/layout-definitions.js";
import { downloadJson, downloadScormZip } from "./scorm/exporter.js";
import { clone } from "./shared/object.js";
import {
	addModule,
	addSubmodule,
	deleteModule,
	ensureModuleCourse,
	findModule,
	getActiveBlocks,
	getModuleNeighbors,
	isModuleCourse,
	normalizeCourseState,
} from "./state/course-structure.js";
import { defaultPage } from "./state/default-page.js";
import { loadPageState, savePageState, STORAGE_KEY } from "./state/page-state.js";
import { showToast } from "./ui/toast.js";

let pageState = normalizeCourseState(loadPageState());
let previewMode = false;
let appRoot;
let setupStep = getInitialSetupStep(pageState);
let setupTransition = "";
let setupTransitionTimer;
let insertionTarget = null;

/**
 * Starts the authoring demo and registers document-level event handlers.
 *
 * @param {object} options - Startup options.
 * @param {HTMLElement} options.root - DOM element that receives the rendered app shell.
 * @returns {void}
 *
 * This function supports the authoring workflow by creating one controller
 * instance that keeps the JSON model, editable canvas, D2L dialogs, preview
 * mode, save flow, and export flow in sync.
 */
export function startAuthoringDemo({ root }) {
	appRoot = root;
	document.addEventListener("click", handleClick);
	document.addEventListener("input", handleInput);
	document.addEventListener("change", handleInput);
	render();
}

/**
 * Renders the complete app shell from current state.
 *
 * @returns {void}
 *
 * This function does not mutate pageState; it translates the current state into
 * visible UI by calling src/authoring/shell.js.
 */
function render() {
	renderShell({
		root: appRoot,
		pageState,
		previewMode,
		setupStep,
		setupTransition,
		insertionTarget,
	});
	initializeActivityInteractions({ root: appRoot, pageState, previewMode });
}

/**
 * Routes click events from toolbar buttons, modal options, block controls,
 * preview interactions, and export buttons.
 *
 * @param {MouseEvent} event - Browser click event from document-level delegation.
 * @returns {void}
 *
 * This function mutates pageState when users insert, reorder, or remove blocks.
 * It also opens D2L dialogs and delegates SCORM downloads to src/scorm/exporter.js.
 */
async function handleClick(event) {
	const target = event.target;
	const courseFormat = target.closest("[data-course-format]");
	if (courseFormat) {
		previewMode = false;
		insertionTarget = null;
		pageState.metadata.courseFormat = courseFormat.dataset.courseFormat;
		pageState.metadata.parentContainerSelected = false;
		if (isModuleCourse(pageState)) {
			ensureModuleCourse(pageState);
		} else {
			pageState.modules = [];
			pageState.activeModuleId = null;
		}
		transitionSetup("container");
		return;
	}
	if (target.closest("[data-setup-back]")) {
		pageState.metadata.courseFormat = null;
		pageState.metadata.parentContainerSelected = false;
		transitionSetup("course-type");
		return;
	}
	const parentLayout = target.closest("[data-parent-layout]");
	if (parentLayout) {
		const inserted = insertParentContainer(parentLayout.dataset.parentLayout);
		if (!inserted) return;
		setupStep = "editor";
		setupTransition = "";
		pageState.metadata.parentContainerSelected = true;
		insertionTarget = null;
		render();
		showToast(`${inserted.title} parent container selected`, "success");
		return;
	}
	if (target.closest("#saveBtn")) {
		savePage();
		return;
	}
	if (target.closest("#setupBtn")) {
		previewMode = false;
		insertionTarget = null;
		setupStep = "course-type";
		setupTransition = "enter";
		render();
		window.setTimeout(() => {
			setupTransition = "";
			render();
		}, 260);
		return;
	}
	if (target.closest("#startOverBtn")) {
		startOver();
		return;
	}
	if (target.closest("#insertElementBtn")) {
		insertionTarget = null;
		document.querySelector("#insertElementDialog").opened = true;
		return;
	}
	if (target.closest("#layoutBtn")) {
		insertionTarget = null;
		document.querySelector("#layoutDialog").opened = true;
		return;
	}
	if (target.closest("#previewBtn")) {
		previewMode = !previewMode;
		render();
		showToast(previewMode ? "Preview mode enabled" : "Editing mode enabled", "success");
		return;
	}
	if (target.closest("#exportBtn")) {
		document.querySelector("#exportDialog").opened = true;
		return;
	}

	const insertElement = target.closest("[data-insert-element]");
	if (insertElement) {
		const block = createBlock(insertElement.dataset.insertElement);
		insertBlock(block);
		document.querySelector("#insertElementDialog").opened = false;
		render();
		showToast(`${getBlockLabel(block)} inserted`, "success");
		return;
	}

	const insertLayout = target.closest("[data-insert-layout]");
	if (insertLayout) {
		const block = createLayoutFromId(insertLayout.dataset.insertLayout);
		if (!block) return;
		insertBlock(block);
		document.querySelector("#layoutDialog").opened = false;
		render();
		showToast(`${block.title} inserted`, "success");
		return;
	}

	const regionElement = target.closest("[data-region-insert-element]");
	if (regionElement) {
		insertionTarget = {
			blockId: regionElement.dataset.blockId,
			regionId: regionElement.dataset.regionId,
		};
		document.querySelector("#insertElementDialog").opened = true;
		return;
	}

	const regionLayout = target.closest("[data-region-insert-layout]");
	if (regionLayout) {
		insertionTarget = {
			blockId: regionLayout.dataset.blockId,
			regionId: regionLayout.dataset.regionId,
		};
		document.querySelector("#layoutDialog").opened = true;
		return;
	}

	const moduleSelect = target.closest("[data-module-select]");
	if (moduleSelect) {
		pageState.activeModuleId = moduleSelect.dataset.moduleSelect;
		insertionTarget = null;
		render();
		return;
	}

	const moduleToggle = target.closest("[data-module-toggle]");
	if (moduleToggle) {
		const module = findModule(pageState.modules, moduleToggle.dataset.moduleToggle);
		if (module) module.expanded = !(module.expanded ?? true);
		render();
		return;
	}

	if (target.closest("[data-module-add]")) {
		addModule(pageState);
		insertionTarget = null;
		render();
		showToast("Module added", "success");
		return;
	}

	const addChild = target.closest("[data-module-add-child]");
	if (addChild) {
		const child = addSubmodule(pageState, addChild.dataset.moduleAddChild);
		if (!child) return;
		insertionTarget = null;
		render();
		showToast("Submodule added", "success");
		return;
	}

	const deleteButton = target.closest("[data-module-delete]");
	if (deleteButton) {
		const module = findModule(pageState.modules, deleteButton.dataset.moduleDelete);
		if (!module) return;
		const confirmed =
			typeof window.confirm !== "function" ||
			window.confirm(`Delete "${module.title}" and all content inside it?`);
		if (!confirmed) return;
		const result = deleteModule(pageState, deleteButton.dataset.moduleDelete);
		if (!result.deleted) {
			showToast(result.reason || "Module was not deleted", "warning");
			return;
		}
		insertionTarget = null;
		render();
		showToast(`${result.module.title} deleted`, "success");
		return;
	}

	const moduleNav = target.closest("[data-module-nav]");
	if (moduleNav) {
		const neighbors = getModuleNeighbors(pageState);
		const nextModule =
			moduleNav.dataset.moduleNav === "previous"
				? neighbors.previous
				: neighbors.next;
		if (!nextModule) return;
		pageState.activeModuleId = nextModule.id;
		insertionTarget = null;
		render();
		return;
	}

	const blockAction = target.closest("[data-block-action]");
	if (blockAction) {
		const result = updateBlockOrder(pageState, blockAction.dataset.blockId, blockAction.dataset.blockAction);
		render();
		if (result.message) showToast(result.message, "success");
		return;
	}

	const iconPicker = target.closest("[data-icon-picker]");
	if (iconPicker) {
		event.preventDefault();
		const selectedIcon = await pickTier1Icon({
			currentIcon: iconPicker.dataset.currentIcon || "tier1:search",
		});
		if (!selectedIcon) return;
		const updated = updateBlockItemField(
			pageState,
			iconPicker.dataset.blockId,
			iconPicker.dataset.itemIndex,
			"icon",
			selectedIcon,
		);
		if (!updated) return;
		render();
		showToast("Icon updated", "success");
		return;
	}

	if (target.closest("[data-download-json]")) {
		downloadJson(pageState, showToast);
		return;
	}

	const zipButton = target.closest("[data-download-zip]");
	if (zipButton) {
		downloadScormZip(pageState, zipButton.dataset.downloadZip, showToast);
		return;
	}

	const flipCard = target.closest("[data-flip-preview]");
	if (flipCard) {
		const flipped = !flipCard.classList.contains("is-flipped");
		flipCard.classList.toggle("is-flipped", flipped);
		flipCard.setAttribute("aria-pressed", String(flipped));
		return;
	}

	const quizCheck = target.closest("[data-quiz-check]");
	if (quizCheck) {
		checkQuizAnswer(pageState, quizCheck.dataset.blockId);
	}
}

/**
 * Routes editable text and D2L input changes into the JSON model.
 *
 * @param {InputEvent|Event} event - Input/change event from the editable canvas.
 * @returns {void}
 *
 * This function mutates pageState title, block fields, layout regions, or input
 * fields, then refreshes the JSON side panel so presenters can show live data updates.
 */
function handleInput(event) {
	const title = event.target.closest?.("[data-page-title]");
	if (title) {
		pageState.title = title.textContent.trim() || "Untitled page";
		renderJson(pageState);
		return;
	}

	const moduleTitle = event.target.closest?.("[data-module-title]");
	if (moduleTitle) {
		const module = findModule(pageState.modules, moduleTitle.dataset.moduleTitle);
		if (module) module.title = moduleTitle.textContent.trim() || "Untitled module";
		renderJson(pageState);
		return;
	}

	const editable = event.target.closest?.("[data-editable]");
	if (editable) {
		updateEditableValue(pageState, editable, editable.textContent.trim());
		renderJson(pageState);
		return;
	}

	const input = event.target.closest?.("[data-input-field]");
	if (input) {
		updateInputValue(pageState, input);
		renderJson(pageState);
	}
}

/**
 * Saves the current page JSON to localStorage.
 *
 * @returns {void}
 *
 * This function replaces pageState with the saved copy returned by
 * savePageState so the lastSaved metadata is reflected in the toolbar and
 * JSON panel. It supports the demo save workflow without requiring a backend.
 */
function savePage() {
	try {
		normalizeCourseState(pageState);
		pageState = savePageState(pageState);
		render();
		showToast("Page saved to localStorage", "success");
	} catch {
		showToast("The browser blocked localStorage for this page", "critical");
	}
}

function startOver() {
	const confirmed =
		typeof window.confirm !== "function" ||
		window.confirm("Start over and clear the current authoring draft?");
	if (!confirmed) return;
	window.clearTimeout(setupTransitionTimer);
	pageState = normalizeCourseState(clone(defaultPage));
	previewMode = false;
	setupStep = "course-type";
	setupTransition = "enter";
	insertionTarget = null;
	try {
		window.localStorage.removeItem(STORAGE_KEY);
	} catch {
		// Storage can be unavailable in restrictive browser or LMS settings.
	}
	render();
	window.setTimeout(() => {
		setupTransition = "";
		render();
	}, 260);
	showToast("Authoring draft reset", "success");
}

function getInitialSetupStep(state) {
	if (state.metadata?.courseFormat && state.metadata?.parentContainerSelected) {
		if (isModuleCourse(state)) ensureModuleCourse(state);
		return "editor";
	}
	if (state.metadata?.courseFormat) {
		if (isModuleCourse(state)) ensureModuleCourse(state);
		return "container";
	}
	return "course-type";
}

function transitionSetup(nextStep) {
	window.clearTimeout(setupTransitionTimer);
	setupTransition = "exit";
	render();
	setupTransitionTimer = window.setTimeout(() => {
		setupStep = nextStep;
		setupTransition = "enter";
		render();
		setupTransitionTimer = window.setTimeout(() => {
			setupTransition = "";
			render();
		}, 260);
	}, 240);
}

function createLayoutFromId(layoutId) {
	const layout = layoutDefinitions.find((definition) => definition.id === layoutId);
	if (!layout) return null;
	return createLayoutBlock(layout);
}

function insertParentContainer(layoutId) {
	const block = createLayoutFromId(layoutId);
	if (!block) return null;
	block.metadata.insertedFrom = "Parent container picker";
	block.metadata.parentContainer = true;
	const blocks = getActiveBlocks(pageState);
	blocks.splice(0, blocks.length, block);
	return block;
}

function insertBlock(block) {
	if (insertionTarget) {
		const inserted = insertBlockIntoRegion(
			pageState,
			insertionTarget.blockId,
			insertionTarget.regionId,
			block,
		);
		if (inserted) {
			block.metadata = {
				...block.metadata,
				insertedIntoRegion: insertionTarget.regionId,
			};
			insertionTarget = null;
			return;
		}
	}
	getActiveBlocks(pageState).push(block);
	insertionTarget = null;
}
