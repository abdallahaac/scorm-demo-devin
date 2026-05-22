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
 * - previewMode: kept false in the editor; learner preview opens separately.
 * - appRoot: DOM node where the authoring shell is rendered.
 */
import { renderJson, renderShell } from "./authoring/shell.js";
import { initializeActivityInteractions } from "./authoring/activity-interactions.js";
import { updateBlockItemField, updateBlockOrder, updateEditableValue, updateInputValue } from "./authoring/editor-actions.js";
import { pickTier1Icon } from "./authoring/icon-picker.js";
import { createBlock, getBlockLabel } from "./insertion/element-definitions.js";
import { createLayoutBlock, layoutDefinitions } from "./insertion/layout-definitions.js";
import { downloadJson, downloadScormZip } from "./scorm/exporter.js";
import { loadPageState, resetPageState, savePageState } from "./state/page-state.js";
import { showToast } from "./ui/toast.js";

let pageState = loadPageState();
let previewMode = false;
let appRoot;
const PREVIEW_STORAGE_PREFIX = "basic-d2l-scorm-demo:preview:";

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
	renderShell({ root: appRoot, pageState, previewMode });
	initializeActivityInteractions({ root: appRoot, pageState, previewMode });
}

/**
 * Routes click events from toolbar buttons, modal options, block controls,
 * learner preview, and export buttons.
 *
 * @param {MouseEvent} event - Browser click event from document-level delegation.
 * @returns {void}
 *
 * This function mutates pageState when users insert, reorder, or remove blocks.
 * It also opens D2L dialogs and delegates SCORM downloads to src/scorm/exporter.js.
 */
async function handleClick(event) {
	const target = event.target;
	if (target.closest("#saveBtn")) {
		savePage();
		return;
	}
	if (target.closest("#startOverBtn")) {
		resetPage();
		return;
	}
	if (target.closest("#insertElementBtn")) {
		document.querySelector("#insertElementDialog").opened = true;
		return;
	}
	if (target.closest("#layoutBtn")) {
		document.querySelector("#layoutDialog").opened = true;
		return;
	}
	if (target.closest("#previewBtn")) {
		openLearnerPreview();
		return;
	}
	if (target.closest("#exportBtn")) {
		document.querySelector("#exportDialog").opened = true;
		return;
	}

	const insertElement = target.closest("[data-insert-element]");
	if (insertElement) {
		const block = createBlock(insertElement.dataset.insertElement);
		pageState.blocks.push(block);
		document.querySelector("#insertElementDialog").opened = false;
		render();
		showToast(`${getBlockLabel(block)} inserted`, "success");
		return;
	}

	const insertLayout = target.closest("[data-insert-layout]");
	if (insertLayout) {
		const layout = layoutDefinitions.find((definition) => definition.id === insertLayout.dataset.insertLayout);
		if (!layout) return;
		const block = createLayoutBlock(layout);
		pageState.blocks.push(block);
		document.querySelector("#layoutDialog").opened = false;
		render();
		showToast(`${layout.title} inserted`, "success");
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

	const editable = event.target.closest?.("[data-editable]");
	if (editable) {
		updateEditableValue(pageState, editable, editable.textContent.trim());
		syncComponentPreview(editable);
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
		pageState = savePageState(pageState);
		render();
		showToast("Page saved to localStorage", "success");
	} catch {
		showToast("The browser blocked localStorage for this page", "critical");
	}
}

/**
 * Resets the editor to the default starter page and clears persisted draft data.
 *
 * @returns {void}
 */
function resetPage() {
	const shouldReset = window.confirm(
		"Start over and reset to the default page? This clears your saved draft.",
	);
	if (!shouldReset) return;
	pageState = resetPageState();
	cleanupPreviewStorage();
	render();
	showToast("Editor reset to the default page", "success");
}

/**
 * Opens the current unsaved page as the learner-facing course in a new tab.
 *
 * @returns {void}
 */
function openLearnerPreview() {
	const previewId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
	try {
		cleanupPreviewStorage();
		window.localStorage.setItem(
			`${PREVIEW_STORAGE_PREFIX}${previewId}`,
			JSON.stringify(pageState),
		);
	} catch {
		showToast("The browser blocked learner preview storage", "critical");
		return;
	}

	const previewUrl = new URL("./preview.html", window.location.href);
	previewUrl.searchParams.set("preview", previewId);
	const previewWindow = window.open(previewUrl.href, "_blank");
	if (!previewWindow) {
		showToast("The browser blocked the preview tab", "critical");
		return;
	}
	previewWindow.opener = null;
	showToast("Learner preview opened in a new tab", "success");
}

function cleanupPreviewStorage() {
	Object.keys(window.localStorage)
		.filter((key) => key.startsWith(PREVIEW_STORAGE_PREFIX))
		.forEach((key) => window.localStorage.removeItem(key));
}

function syncComponentPreview(editable) {
	const block = pageState.blocks.find((item) => item.id === editable.dataset.blockId);
	const blockElement = editable.closest("[data-block-id]");
	if (!block || !blockElement) return;

	if (block.type === "collapsible" || block.type === "accordion") {
		blockElement
			.querySelectorAll("d2l-collapsible-panel")
			.forEach((panel, index) => {
				const title = block.items?.[index]?.title;
				if (!title) return;
				panel.setAttribute("panel-title", title);
				panel.panelTitle = title;
			});
		return;
	}

	if (block.type !== "dropdown-menu") return;
	const label = block.label || "Open menu";
	const labelPreview = blockElement.querySelector("[data-dropdown-label-preview]");
	if (labelPreview) labelPreview.textContent = label;
	const menu = blockElement.querySelector("d2l-menu");
	if (menu) menu.setAttribute("label", label);
	blockElement.querySelectorAll("[data-dropdown-item-preview]").forEach((item, index) => {
		const text = block.items?.[index]?.text || "";
		item.setAttribute("text", text);
		item.text = text;
	});
}
