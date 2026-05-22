/**
 * src/scorm/course-runtime-template.js
 *
 * Purpose:
 * Generates HTML, runtime JavaScript, and course CSS for exported packages.
 *
 * Intent:
 * This file is responsible for production package templates, editable package
 * templates, and learner runtime assets because SCORM export needs generated
 * files that can run independently after they are zipped.
 *
 * Role in the app:
 * - Called by src/scorm/exporter.js while assembling package contents.
 * - Uses pageState to seed either a learner-facing course or an editable LMS tool.
 * - Produces templates that load the same D2L Core bundle used by the demo.
 *
 * Data received/exported:
 * - Receives pageState for title, locale, and editable-package seed data.
 * - Exports string builder functions for index.html, runtime.js, and course.css.
 */
import { escapeAttr, escapeHtml } from "../shared/html.js";

/**
 * Builds the learner-facing index.html for the production package.
 *
 * @param {object} pageState - Current page JSON model.
 * @returns {string} HTML document string.
 *
 * This function does not mutate state. It supports production export by
 * creating a clean entry point that loads runtime.js and course.css.
 */
export function buildProductionIndexHtml(pageState) {
	return `<!doctype html>
<html lang="${escapeAttr(pageState.metadata.locale || "en")}">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>${escapeHtml(pageState.title)}</title>
		<script type="module" src="./brightspace-core-bundle.js"></script>
		<link rel="stylesheet" href="./assets/css/course.css" />
	</head>
	<body>
		<main id="course"></main>
		<script type="module" src="./assets/js/runtime.js"></script>
	</body>
</html>
`;
}

/**
 * Builds the authoring-enabled index.html for the editable LMS package.
 *
 * @param {object} pageState - Current page JSON model used as the package seed.
 * @returns {string} HTML document string.
 *
 * This function does not mutate pageState. It supports editable LMS export by
 * embedding the current JSON as window.D2L_AUTHORING_DEMO_PAGE and loading app.js.
 */
export function buildEditorIndexHtml(pageState) {
	const seedJson = JSON.stringify(pageState).replace(/</g, "\\u003c");
	const storageKey =
		`basic-d2l-scorm-demo:editor:${pageState.metadata.schemaVersion || 1}:${Date.now()}:${pageState.title}`
			.replace(/[^a-z0-9:_-]+/gi, "-")
			.toLowerCase();
	return `<!doctype html>
<html lang="${escapeAttr(pageState.metadata.locale || "en")}">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>${escapeHtml(pageState.title)} - editable LMS package</title>
		<script>
			window.D2L_AUTHORING_DEMO_PAGE = ${seedJson};
			window.D2L_AUTHORING_STORAGE_KEY = "${escapeAttr(storageKey)}";
		</script>
		<script type="module" src="./brightspace-core-bundle.js"></script>
		<link rel="stylesheet" href="./styles.css" />
	</head>
	<body>
		<a class="skip-link" href="#editor-canvas">Skip to editor canvas</a>
		<div id="app"></div>
		<d2l-alert-toast id="toast" type="success"></d2l-alert-toast>
		<script type="module" src="./app.js"></script>
	</body>
</html>
`;
}

/**
 * Builds the standalone learner runtime JavaScript.
 *
 * @returns {string} JavaScript source for assets/js/runtime.js.
 *
 * This function returns a string rather than executing code. It supports
 * production export by rendering assets/data/page.json without authoring controls.
 */
export function buildRuntimeJs() {
	return `/**
 * assets/js/runtime.js
 *
 * Purpose:
 * Starts the production SCORM learner page from assets/data/page.json.
 */
import { loadProductionCourse } from "../../src/learner/runtime.js";

loadProductionCourse();
`;
}

/**
 * Builds the standalone CSS for the production learner package.
 *
 * @returns {string} CSS source for assets/css/course.css.
 *
 * This function returns generated CSS and does not read or mutate app state.
 * It keeps the production package compact and separate from authoring styles.
 */
export function buildCourseCss() {
	return `body {
	margin: 0;
	padding: 2rem;
	color: #202122;
	font-family: "Lato", "Noto Sans", "Segoe UI", Arial, sans-serif;
	line-height: 1.5;
}

main {
	margin: 0 auto;
	max-width: 980px;
}

h1,
h2,
h3 {
	line-height: 1.25;
}

img {
	border-radius: 8px;
	display: block;
	height: auto;
	max-width: 100%;
}

.course-callout,
.course-region {
	border: 1px solid #d3d9e3;
	border-radius: 8px;
	padding: 1rem;
}

.course-callout {
	background: #f5faf7;
}

.course-layout {
	display: grid;
	gap: 0.75rem;
	grid-template-columns: repeat(var(--columns, 1), minmax(0, 1fr));
	margin: 1rem 0;
}

.course-button {
	background: #006fbf;
	border-radius: 6px;
	color: #ffffff;
	display: inline-block;
	font-weight: 700;
	padding: 0.55rem 1rem;
	text-decoration: none;
}

.activity-copy,
.sequencing-activity,
.sorting-activity,
.seq-container,
.sort-category-grid,
.sort-pool {
	display: grid;
	gap: 1rem;
}

.activity-copy {
	gap: 0.45rem;
}

.activity-copy h2,
.activity-copy p,
.sort-category-header h3,
.section-title,
.category-info {
	margin: 0;
}

.seq-row {
	background: #ffffff;
	border: 1px solid #d3d9e3;
	border-radius: 8px;
	display: grid;
	grid-template-columns: minmax(14rem, 17rem) minmax(0, 1fr);
	overflow: hidden;
}

.seq-row.drop-target,
.sort-category-content.drag-over,
.sort-category-content.ready-to-drop,
.sort-items-dropzone.drag-over,
.sort-items-dropzone.ready-to-drop {
	border-color: #006fbf;
	box-shadow: 0 0 0 3px rgba(0, 111, 191, 0.14);
}

.seq-row.is-correct {
	border-color: #2f8f46;
}

.seq-row.is-incorrect {
	border-color: #c3423f;
}

.seq-left {
	align-items: center;
	background: #ffffff;
	border-right: 1px solid #d3d9e3;
	display: grid;
	gap: 0.65rem;
	grid-template-columns: auto minmax(0, 1fr) auto;
	padding: 0.85rem;
}

.left-icon {
	align-items: center;
	background: #ffffff;
	border: 1px solid #d3d9e3;
	border-radius: 6px;
	display: inline-flex;
	height: 2.5rem;
	justify-content: center;
	width: 2.5rem;
}

.left-label {
	font-weight: 700;
	line-height: 1.25;
	text-align: center;
}

.dropdown-wrap {
	display: flex;
	justify-content: flex-end;
}

.chev-btn::part(button) {
	min-height: 2.5rem;
	min-width: 2.5rem;
	padding: 0;
}

.seq-right {
	display: grid;
	gap: 0.65rem;
	padding: 0.85rem;
}

.answer-card,
.sortable {
	align-items: center;
	background: #ffffff;
	border: 1px solid #d3d9e3;
	border-radius: 6px;
	color: #202122;
	display: grid;
	gap: 0.65rem;
	grid-template-columns: auto minmax(0, 1fr);
	min-height: 3.5rem;
	padding: 0.7rem 0.8rem;
}

.answer-card {
	background: transparent;
	border-color: transparent;
}

.answer-card,
.sortable {
	cursor: pointer;
}

.answer-card.dragging {
	opacity: 0.55;
}

.drag-handle {
	color: #565a5c;
	display: inline-flex;
}

.answer-text,
.sortable-text {
	overflow-wrap: anywhere;
}

.seq-feedback {
	border-radius: 6px;
	display: grid;
	font-size: 0.9rem;
	gap: 0.2rem;
	padding: 0.65rem;
}

.seq-feedback.correct,
.sortable.is-correct {
	background: #f3fbf5;
}

.seq-feedback.incorrect,
.sortable.is-incorrect {
	background: #fff6f6;
}

.seq-dropdown-menu d2l-menu-item-radio::part(text) {
	display: block;
	line-height: 1.35;
	overflow: visible;
	overflow-wrap: anywhere;
	text-overflow: clip;
	white-space: normal;
}

.seq-dropdown-submit {
	align-items: center;
	background: #006fbf;
	border: 0;
	border-radius: 6px;
	color: #ffffff;
	cursor: pointer;
	display: inline-flex;
	font: inherit;
	font-weight: 700;
	justify-content: center;
	margin: 0.65rem;
	min-height: 2.65rem;
	padding: 0.55rem 1rem;
	width: calc(100% - 1.3rem);
}

.seq-dropdown-submit:hover,
.seq-dropdown-submit:focus-visible {
	background: #005a9e;
	outline: 3px solid rgba(0, 111, 191, 0.2);
	outline-offset: 2px;
}

.activity-alert {
	border: 1px solid #d3d9e3;
	border-radius: 8px;
	display: none;
	font-weight: 700;
	padding: 0.75rem;
}

.activity-alert.is-visible {
	display: block;
}

.activity-alert[data-state="success"] {
	background: #f3fbf5;
	border-color: #2f8f46;
}

.activity-alert[data-state="warning"] {
	background: #fff9e8;
	border-color: #d18b00;
}

.activity-actions {
	align-items: center;
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
}

.is-hidden {
	display: none !important;
}

.sort-category-grid {
	grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
}

.sort-category {
	display: grid;
}

.sort-category-header {
	background: #ffffff;
	border: 1px solid #d3d9e3;
	border-radius: 8px 8px 0 0;
	padding: 0.75rem;
	text-align: center;
}

.sort-category-header h3 {
	font-size: 1rem;
	line-height: 1.3;
}

.sort-category-content,
.sort-items-dropzone {
	border: 1px dashed #b7c2d0;
	border-radius: 0 0 8px 8px;
	cursor: pointer;
	min-height: 9rem;
	padding: 0.75rem;
	position: relative;
}

.sort-items-dropzone {
	border-radius: 8px;
}

.category-info {
	color: #565a5c;
	font-size: 0.82rem;
	padding-bottom: 0.65rem;
	text-align: center;
}

.sort-category-items,
.sort-items-list {
	display: grid;
	gap: 0.65rem;
	list-style: none;
	margin: 0;
	padding: 0;
}

.sortable.is-selected,
.sortable:focus-visible,
.sort-category-content:focus-visible,
.sort-items-dropzone:focus-visible,
.chev-btn:focus-visible {
	outline: 3px solid rgba(0, 111, 191, 0.22);
	outline-offset: 2px;
}

.sorting-activity.is-checked .sortable {
	grid-template-columns: minmax(0, 1fr);
	text-align: center;
}

.sortable-feedback,
.sortable-feedback-text {
	display: none;
	font-size: 0.9rem;
}

.sorting-activity.is-checked .sortable-feedback,
.sorting-activity.is-checked .sortable-feedback-text {
	display: inline-flex;
	justify-content: center;
}

.sortable-feedback {
	align-items: center;
	gap: 0.35rem;
}

.sort-drop-placeholder {
	color: #b7c2d0;
	display: grid;
	justify-content: center;
	padding: 0.6rem;
	pointer-events: none;
}

.sr-only {
	border: 0;
	clip: rect(0, 0, 0, 0);
	height: 1px;
	margin: -1px;
	overflow: hidden;
	padding: 0;
	position: absolute;
	white-space: nowrap;
	width: 1px;
}

@media (max-width: 44rem) {
	body {
		padding: 1rem;
	}

	.course-layout {
		grid-template-columns: 1fr !important;
	}

	.course-region {
		grid-column: auto !important;
	}

	.seq-row {
		grid-template-columns: 1fr;
	}

	.seq-left {
		border-bottom: 1px solid #d3d9e3;
		border-right: 0;
	}
}
`;
}
