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
import { escapeHtml } from "../shared/html.js";
import { renderBlock } from "./block-renderers.js";
import { renderInsertDialog, renderLayoutDialog } from "../insertion/insert-dialogs.js";
import { renderExportDialog } from "../scorm/export-dialog.js";

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
export function renderShell({ root, pageState, previewMode }) {
	const lastSaved = pageState.metadata.lastSaved
		? new Date(pageState.metadata.lastSaved).toLocaleString()
		: "Not saved in this browser";

	root.innerHTML = `
		<div class="app-shell ${previewMode ? "preview-mode" : ""}">
			<header class="topbar">
				<div class="brand">
					<p class="brand__eyebrow">D2L Core authoring demo</p>
					<p class="brand__title">SCORM page editor</p>
				</div>
				<nav class="toolbar-actions" aria-label="Authoring actions">
					<d2l-button-subtle id="saveBtn" text="Save" icon="tier1:save"></d2l-button-subtle>
					<d2l-button-subtle id="insertElementBtn" text="Insert Element" icon="tier1:add"></d2l-button-subtle>
					<d2l-button-subtle id="layoutBtn" text="Layouts" icon="tier1:style"></d2l-button-subtle>
					<d2l-button-subtle id="previewBtn" text="${previewMode ? "Edit" : "Preview"}" icon="tier1:preview"></d2l-button-subtle>
					<d2l-button id="exportBtn" primary>Export SCORM</d2l-button>
				</nav>
			</header>
			<div class="status-strip">
				<span><strong>${previewMode ? "Preview mode" : "Editing"}</strong></span>
				<span>Blocks: ${pageState.blocks.length}</span>
				<span>Last saved: ${escapeHtml(lastSaved)}</span>
			</div>
			<main class="workspace">
				<section class="canvas-panel" aria-labelledby="pageTitle">
					<h1
						id="pageTitle"
						class="page-title"
						${previewMode ? "" : 'contenteditable="true" spellcheck="true"'}
						data-page-title="true"
					>${escapeHtml(pageState.title)}</h1>
					<p class="canvas-help">${previewMode ? "Preview shows the learner-facing page rendered from the JSON model." : "Select text directly on the canvas to edit. Use block controls to reorder or remove content."}</p>
					<div id="editor-canvas" class="editor-canvas" aria-label="Editable page canvas">
						${pageState.blocks.map((block, index) => renderBlock(block, index, pageState, previewMode)).join("")}
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
