/**
 * src/insertion/insert-dialogs.js
 *
 * Purpose:
 * Renders the Insert Element and Layouts modal markup.
 *
 * Intent:
 * This file is responsible for displaying picker dialogs, option rows, and
 * layout thumbnails because authors need D2L-style workflows for adding
 * content blocks, interactions, and layout structures to the JSON model.
 *
 * Role in the app:
 * - Called by src/authoring/shell.js so dialogs exist beside the canvas.
 * - Reads data from element-definitions.js and layout-definitions.js.
 * - Emits data-insert-element and data-insert-layout attributes handled by src/main.js.
 * - Uses D2L Core d2l-dialog, d2l-button, and d2l-icon components.
 */
import { elementDefinitions } from "./element-definitions.js";
import { layoutDefinitions } from "./layout-definitions.js";
import { escapeAttr, escapeHtml } from "../shared/html.js";

/**
 * Renders the Insert Element D2L dialog.
 *
 * @returns {string} HTML for the element picker dialog.
 *
 * This function does not mutate state. It supports content and interaction
 * insertion by exposing every elementDefinitions item as a clickable row.
 */
export function renderInsertDialog() {
	return `
		<d2l-dialog id="insertElementDialog" title-text="Add D2L Component">
			<div class="dialog-body">
				<div class="element-grid" role="list" aria-label="Insertable elements">
					${elementDefinitions.map((definition) => `
						<button class="element-option" type="button" data-insert-element="${escapeAttr(definition.type)}">
							<span class="element-option__icon" aria-hidden="true">
								<d2l-icon icon="${escapeAttr(definition.icon)}"></d2l-icon>
							</span>
							<span>
								<span class="element-option__title">${escapeHtml(definition.title)}</span>
								<span class="element-option__description">${escapeHtml(definition.description)}</span>
							</span>
						</button>
					`).join("")}
				</div>
			</div>
			<d2l-button slot="footer" data-dialog-action>Close</d2l-button>
		</d2l-dialog>
	`;
}

/**
 * Renders the Layouts D2L dialog.
 *
 * @returns {string} HTML for categorized layout rows and thumbnails.
 *
 * This function does not mutate state. It supports layout insertion by
 * presenting layoutDefinitions in a visual picker similar to Creator+ workflows.
 */
export function renderLayoutDialog() {
	const categories = [...new Set(layoutDefinitions.map((layout) => layout.category))];
	return `
		<d2l-dialog id="layoutDialog" title-text="Add Layout">
			<div class="dialog-body">
				${categories.map((category) => `
					<section class="layout-category" aria-labelledby="${escapeAttr(category.replace(/\s+/g, "-").toLowerCase())}">
						<h3 class="layout-category__title" id="${escapeAttr(category.replace(/\s+/g, "-").toLowerCase())}">${escapeHtml(category)}</h3>
						${layoutDefinitions.filter((layout) => layout.category === category).map(renderLayoutOption).join("")}
					</section>
				`).join("")}
			</div>
			<d2l-button slot="footer" data-dialog-action>Close</d2l-button>
		</d2l-dialog>
	`;
}

/**
 * Renders one clickable layout row.
 *
 * @param {object} layout - Layout definition from layout-definitions.js.
 * @returns {string} HTML for a layout option.
 *
 * This function connects layout metadata to the data-insert-layout value that
 * src/main.js uses to create a layout block.
 */
function renderLayoutOption(layout) {
	return `
		<button class="layout-option" type="button" data-insert-layout="${escapeAttr(layout.id)}">
			${renderLayoutThumbnail(layout)}
			<span>
				<span class="layout-option__title">${escapeHtml(layout.title)}</span>
				<span class="layout-option__description">${escapeHtml(layout.description)}</span>
			</span>
			<d2l-icon icon="tier1:add" aria-hidden="true"></d2l-icon>
		</button>
	`;
}

/**
 * Renders a compact visual preview for a layout definition.
 *
 * @param {object} layout - Layout definition with columns and regions.
 * @returns {string} HTML thumbnail made from simple spans.
 *
 * This fallback exists because D2L Core does not provide a purpose-built
 * layout thumbnail component for authoring tools.
 */
function renderLayoutThumbnail(layout) {
	return `
		<span class="layout-thumb" style="--thumb-columns: ${Number(layout.columns || 1)}" aria-hidden="true">
			${layout.regions.map((region) => `
				<span data-span="${escapeAttr(region.span || 1)}" data-kind="${escapeAttr(region.kind || "content")}"></span>
			`).join("")}
		</span>
	`;
}
