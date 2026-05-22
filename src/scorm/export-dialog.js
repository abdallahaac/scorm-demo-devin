/**
 * src/scorm/export-dialog.js
 *
 * Purpose:
 * Renders the SCORM export modal with editable and production package choices.
 *
 * Intent:
 * This file is responsible for presenting export options, package descriptions,
 * and included file lists because authors need to understand the difference
 * between an LMS-editable package and a production learner package.
 *
 * Role in the app:
 * - Called by src/authoring/shell.js when rendering the hidden D2L dialogs.
 * - Reads package labels and file lists from src/scorm/package-config.js.
 * - Emits data-download-zip attributes handled by src/main.js and src/scorm/exporter.js.
 * - Uses D2L Core dialog, alert, button, button-subtle, and loading spinner components.
 */
import { EXPORT_PACKAGES, getExportFileList } from "./package-config.js";
import { escapeHtml } from "../shared/html.js";

/**
 * Renders the full SCORM export dialog.
 *
 * @returns {string} HTML for the export dialog.
 *
 * This function does not mutate state. It supports SCORM export by making both
 * packaging paths visible and presentation-friendly.
 */
export function renderExportDialog() {
	const editorFiles = getExportFileList("editor");
	const productionFiles = getExportFileList("production");
	return `
		<d2l-dialog id="exportDialog" title-text="SCORM Export">
			<div class="dialog-body">
				<d2l-alert type="default">
					Choose Editable in LMS when reviewers still need the page editor. Choose Production export when the page is ready for learners.
				</d2l-alert>
				<div class="export-package-grid">
					${renderPackageCard("editor", editorFiles)}
					${renderPackageCard("production", productionFiles)}
				</div>
				<div id="exportProgress" class="export-progress" aria-live="polite">
					<d2l-loading-spinner size="24"></d2l-loading-spinner>
					<span>Preparing package...</span>
				</div>
				<div class="export-actions">
					<d2l-button-subtle text="Download page.json" icon="tier1:download" data-download-json></d2l-button-subtle>
				</div>
			</div>
			<d2l-button slot="footer" data-dialog-action>Close</d2l-button>
		</d2l-dialog>
	`;
}

/**
 * Renders one export package option card.
 *
 * @param {"editor"|"production"} packageType - Export mode represented by the card.
 * @param {string[]} files - File paths shown to presenters and authors.
 * @returns {string} HTML for one package card.
 *
 * This function connects package-config metadata to the D2L button that starts
 * the selected export workflow.
 */
function renderPackageCard(packageType, files) {
	const packageConfig = EXPORT_PACKAGES[packageType];
	const primary = packageType === "production" ? "primary" : "";
	const titleId = `${packageType}ExportTitle`;
	return `
		<section class="export-package-card" aria-labelledby="${titleId}">
			<h3 id="${titleId}" class="export-package-card__title">${escapeHtml(packageConfig.label)}</h3>
			<p class="export-note">${escapeHtml(packageConfig.description)}</p>
			<p class="export-note">Files included:</p>
			<ul class="export-files">
				${files.map((file) => `<li><code>${escapeHtml(file)}</code></li>`).join("")}
			</ul>
			<d2l-button ${primary} data-download-zip="${packageType}">
				${packageType === "editor" ? "Export editable in LMS" : "Export production LMS package"}
			</d2l-button>
		</section>
	`;
}
