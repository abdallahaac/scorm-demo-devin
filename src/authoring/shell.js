/**
 * src/authoring/shell.js
 *
 * Purpose:
 * Renders the complete authoring shell around the editable page canvas.
 *
 * Intent:
 * This file is responsible for composing the toolbar, editable canvas, JSON
 * state panel, and D2L modal shells because the demo needs one place where the
 * current page JSON becomes the presentation-friendly editor interface.
 *
 * Role in the app:
 * - Called by src/main.js whenever pageState or previewMode changes.
 * - Uses src/authoring/block-renderers.js to render each JSON block.
 * - Includes Insert Element, Layouts, and SCORM Export dialogs from the
 *   insertion and scorm modules.
 * - Displays the JSON side panel that proves the authoring tool is model-driven.
 *
 * Data received/exported:
 * - Receives root, pageState, and previewMode.
 * - Exports renderShell() and renderJson().
 */
import { escapeAttr, escapeHtml } from "../shared/html.js";
import { renderBlock } from "./block-renderers.js";
import { renderInsertDialog, renderLayoutDialog } from "../insertion/insert-dialogs.js";
import { layoutDefinitions } from "../insertion/layout-definitions.js";
import { renderExportDialog } from "../scorm/export-dialog.js";
import {
	getActiveBlocks,
	getActiveModule,
	getModuleNeighbors,
	isModuleCourse,
} from "../state/course-structure.js";

/**
 * Renders the toolbar, canvas, JSON panel, and D2L dialogs.
 *
 * @param {object} options - Render options.
 * @param {HTMLElement} options.root - DOM node that receives the shell markup.
 * @param {object} options.pageState - Current JSON model for the page.
 * @param {boolean} options.previewMode - Whether authoring controls should be hidden.
 * @returns {void}
 *
 * This function does not mutate pageState. It supports authoring, preview, and
 * export by ensuring every visible surface is rebuilt from the same JSON model.
 */
export function renderShell({
	root,
	pageState,
	previewMode,
	setupStep = "editor",
	setupTransition = "",
	insertionTarget = null,
}) {
	if (setupStep !== "editor") {
		root.innerHTML = renderSetupExperience({
			pageState,
			setupStep,
			setupTransition,
		});
		return;
	}

	const lastSaved = pageState.metadata.lastSaved
		? new Date(pageState.metadata.lastSaved).toLocaleString()
		: "Not saved in this browser";
	const moduleMode = isModuleCourse(pageState);
	const activeModule = getActiveModule(pageState);
	const activeBlocks = getActiveBlocks(pageState);
	const canvasTitle = activeModule?.title || pageState.title;
	const titleAttributes = previewMode
		? ""
		: moduleMode && activeModule
			? `contenteditable="true" spellcheck="true" data-module-title="${escapeAttr(activeModule.id)}"`
			: 'contenteditable="true" spellcheck="true" data-page-title="true"';
	const courseFormatLabel = moduleMode ? "Module-based course" : "SPA";

	root.innerHTML = `
		<div class="app-shell ${previewMode ? "preview-mode" : ""}">
			<header class="topbar">
				<div class="brand">
					<p class="brand__eyebrow">D2L Core authoring demo</p>
					<p class="brand__title">SCORM page editor</p>
				</div>
				<nav class="toolbar-actions" aria-label="Authoring actions">
					<d2l-button-subtle id="saveBtn" text="Save" icon="tier1:save"></d2l-button-subtle>
					<d2l-button-subtle id="setupBtn" text="Setup" icon="tier1:gear"></d2l-button-subtle>
					<d2l-button-subtle id="startOverBtn" text="Start Over" icon="tier1:refresh"></d2l-button-subtle>
					<d2l-button-subtle id="insertElementBtn" text="Insert Element" icon="tier1:add"></d2l-button-subtle>
					<d2l-button-subtle id="layoutBtn" text="Layouts" icon="tier1:style"></d2l-button-subtle>
					<d2l-button-subtle id="previewBtn" text="${previewMode ? "Edit" : "Preview"}" icon="tier1:preview"></d2l-button-subtle>
					<d2l-button id="exportBtn" primary>Export SCORM</d2l-button>
				</nav>
			</header>
			<div class="status-strip">
				<span><strong>${previewMode ? "Preview mode" : "Editing"}</strong></span>
				<span>Course type: ${courseFormatLabel}</span>
				<span>Blocks: ${activeBlocks.length}</span>
				${insertionTarget ? `<span>Insertion target: selected container region</span>` : ""}
				<span>Last saved: ${escapeHtml(lastSaved)}</span>
			</div>
			<main class="workspace ${moduleMode ? "workspace--module" : ""}">
				${moduleMode ? renderModuleSidebar(pageState) : ""}
				<section class="canvas-panel" aria-labelledby="pageTitle">
					${moduleMode ? renderModulePager(pageState) : ""}
					<h1
						id="pageTitle"
						class="page-title"
						${titleAttributes}
					>${escapeHtml(canvasTitle)}</h1>
					<p class="canvas-help">${previewMode ? "Preview shows the learner-facing page rendered from the JSON model." : "Select text directly on the canvas to edit. Use block controls or region insert buttons to build the course."}</p>
					<div id="editor-canvas" class="editor-canvas" aria-label="Editable page canvas">
						${
							activeBlocks.length
								? activeBlocks
									.map((block, index) =>
										renderBlock(block, index, activeBlocks, previewMode),
									)
									.join("")
								: renderEmptyContainerPicker(moduleMode ? activeModule?.title : pageState.title)
						}
					</div>
				</section>
				${
					previewMode
						? ""
						: `
					<aside class="json-panel" aria-labelledby="jsonTitle">
						<div class="json-panel__header">
							<h2 id="jsonTitle" class="json-panel__title">JSON state</h2>
							<d2l-button-subtle text="Download JSON" icon="tier1:download" data-download-json></d2l-button-subtle>
						</div>
						<pre id="jsonOutput" class="json-output"></pre>
					</aside>
				`
				}
			</main>
		</div>
		${renderInsertDialog()}
		${renderLayoutDialog()}
		${renderExportDialog()}
	`;
	renderJson(pageState);
}

/**
 * Writes the current page JSON into the side panel.
 *
 * @param {object} pageState - Current JSON model shown to authors.
 * @returns {void}
 *
 * This function supports the presentation demo by making every authoring edit
 * visible as structured export-ready data.
 */
export function renderJson(pageState) {
	const output = document.querySelector("#jsonOutput");
	if (!output) return;
	output.textContent = `${JSON.stringify(pageState, null, 2)}\n`;
}

function renderSetupExperience({ pageState, setupStep, setupTransition }) {
	const transitionClass = setupTransition
		? `setup-stage--${escapeAttr(setupTransition)}`
		: "";
	return `
		<main class="setup-screen" aria-live="polite">
			<section class="setup-stage ${transitionClass}">
				${
					setupStep === "course-type"
						? renderCourseTypeQuestion()
						: renderParentContainerQuestion(pageState)
				}
			</section>
		</main>
	`;
}

function renderCourseTypeQuestion() {
	return `
		<div class="setup-kicker" aria-hidden="true">
			<span></span><span></span><span></span>
		</div>
		<div class="setup-copy">
			<p class="setup-eyebrow">Course setup</p>
			<h1>Would you like to build a SPA (single page application) or a module-based course?</h1>
		</div>
		<div class="course-choice-grid" role="list" aria-label="Course type options">
			<button class="course-choice" type="button" data-course-format="spa">
				<span class="course-choice__icon" aria-hidden="true"><d2l-icon icon="tier1:file-document"></d2l-icon></span>
				<span class="course-choice__body">
					<span class="course-choice__title">SPA</span>
					<span class="course-choice__description">One continuous page with layout containers, nested elements, and interactions.</span>
				</span>
				<d2l-icon icon="tier1:chevron-right" aria-hidden="true"></d2l-icon>
			</button>
			<button class="course-choice" type="button" data-course-format="module">
				<span class="course-choice__icon" aria-hidden="true"><d2l-icon icon="tier1:style"></d2l-icon></span>
				<span class="course-choice__body">
					<span class="course-choice__title">Module-based course</span>
					<span class="course-choice__description">A collapsible module/submodule tree with Brightspace-style previous and next navigation.</span>
				</span>
				<d2l-icon icon="tier1:chevron-right" aria-hidden="true"></d2l-icon>
			</button>
		</div>
	`;
}

function renderParentContainerQuestion(pageState) {
	const moduleMode = isModuleCourse(pageState);
	return `
		<div class="setup-copy setup-copy--wide">
			<button class="setup-back" type="button" data-setup-back>
				<d2l-icon icon="tier1:chevron-left" aria-hidden="true"></d2l-icon>
				<span>Back</span>
			</button>
			<p class="setup-eyebrow">${moduleMode ? "Module-based course" : "SPA"} setup</p>
			<h1>Select a parent container</h1>
			<p class="setup-support">Choose the first layout container. Each region starts with default text and can receive sub layouts, content elements, and interactions.</p>
		</div>
		<div class="setup-picker-layout ${moduleMode ? "setup-picker-layout--module" : ""}">
			${moduleMode ? renderSetupModulePreview(pageState) : ""}
			<div class="parent-layout-grid" role="list" aria-label="Parent layout containers">
				${layoutDefinitions.map((layout) => renderParentLayoutOption(layout)).join("")}
			</div>
		</div>
	`;
}

function renderSetupModulePreview(pageState) {
	return `
		<aside class="setup-module-preview" aria-label="Starting module outline">
			<h2>Course tree</h2>
			<ol>
				${(pageState.modules || [])
					.map((module) => renderSetupModulePreviewNode(module))
					.join("")}
			</ol>
		</aside>
	`;
}

function renderSetupModulePreviewNode(module) {
	return `
		<li>
			<span>${escapeHtml(module.title)}</span>
			${
				(module.children || []).length
					? `<ol>${module.children.map((child) => renderSetupModulePreviewNode(child)).join("")}</ol>`
					: ""
			}
		</li>
	`;
}

function renderParentLayoutOption(layout) {
	const defaultText = layout.regions
		.map((region) => `${region.role} default text`)
		.join(" | ");
	return `
		<button class="parent-layout-option" type="button" data-parent-layout="${escapeAttr(layout.id)}">
			${renderBuilderLayoutThumbnail(layout)}
			<span class="parent-layout-option__body">
				<span class="parent-layout-option__title">${escapeHtml(layout.title)}</span>
				<span class="parent-layout-option__description">${escapeHtml(layout.description)}</span>
				<span class="parent-layout-option__default">${escapeHtml(defaultText)}</span>
			</span>
		</button>
	`;
}

function renderBuilderLayoutThumbnail(layout) {
	return `
		<span class="builder-layout-thumb" style="--thumb-columns: ${Number(layout.columns || 1)}" aria-hidden="true">
			${layout.regions
				.map(
					(region) =>
						`<span data-span="${escapeAttr(region.span || 1)}" data-kind="${escapeAttr(region.kind || "content")}"></span>`,
				)
				.join("")}
		</span>
	`;
}

function renderModuleSidebar(pageState) {
	return `
		<aside class="module-tree-panel" aria-label="Module and submodule tree">
			<header class="module-tree-panel__header">
				<h2>Modules</h2>
				<d2l-button-icon text="Add module" icon="tier1:add" data-module-add></d2l-button-icon>
			</header>
			<ol class="module-tree">
				${(pageState.modules || [])
					.map((module) => renderModuleTreeNode(module, pageState.activeModuleId))
					.join("")}
			</ol>
		</aside>
	`;
}

function renderModuleTreeNode(module, activeModuleId) {
	const hasChildren = (module.children || []).length > 0;
	const expanded = module.expanded ?? true;
	const active = module.id === activeModuleId;
	return `
		<li class="module-tree__item">
			<div class="module-tree__row ${active ? "is-active" : ""}">
				${
					hasChildren
						? `
					<button class="module-tree__toggle" type="button" data-module-toggle="${escapeAttr(module.id)}" aria-label="${expanded ? "Collapse" : "Expand"} ${escapeAttr(module.title)}" aria-expanded="${expanded}">
						<d2l-icon icon="${expanded ? "tier1:chevron-down" : "tier1:chevron-right"}" aria-hidden="true"></d2l-icon>
					</button>
				`
						: `<span class="module-tree__toggle-spacer"></span>`
				}
				<button class="module-tree__select" type="button" data-module-select="${escapeAttr(module.id)}">
					${escapeHtml(module.title)}
				</button>
				<d2l-button-icon text="Add submodule" icon="tier1:add" data-module-add-child="${escapeAttr(module.id)}"></d2l-button-icon>
				<d2l-button-icon text="Delete module" icon="tier1:delete" data-module-delete="${escapeAttr(module.id)}"></d2l-button-icon>
			</div>
			${
				hasChildren && expanded
					? `<ol class="module-tree module-tree--nested">${module.children
						.map((child) => renderModuleTreeNode(child, activeModuleId))
						.join("")}</ol>`
					: ""
			}
		</li>
	`;
}

function renderModulePager(pageState) {
	const neighbors = getModuleNeighbors(pageState);
	const current = neighbors.currentIndex >= 0 ? neighbors.currentIndex + 1 : 0;
	return `
		<nav class="module-pager" aria-label="Module navigation">
			<d2l-button-icon text="Previous module" icon="tier1:chevron-left" data-module-nav="previous" ${neighbors.previous ? "" : "disabled"}></d2l-button-icon>
			<span class="module-pager__title">${current} of ${neighbors.total}: ${escapeHtml(getActiveModule(pageState)?.title || "Module")}</span>
			<d2l-button-icon text="Next module" icon="tier1:chevron-right" data-module-nav="next" ${neighbors.next ? "" : "disabled"}></d2l-button-icon>
		</nav>
	`;
}

function renderEmptyContainerPicker(title = "this page") {
	return `
		<section class="empty-container-picker" aria-label="Select a parent container">
			<h2>Select a parent container for ${escapeHtml(title)}</h2>
			<div class="parent-layout-grid parent-layout-grid--compact">
				${layoutDefinitions
					.slice(0, 8)
					.map((layout) => renderParentLayoutOption(layout))
					.join("")}
			</div>
		</section>
	`;
}
