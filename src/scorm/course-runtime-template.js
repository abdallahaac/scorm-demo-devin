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
		`d2l-scorm-authoring-demo:editor:${pageState.metadata.schemaVersion || 1}:${Date.now()}:${pageState.title}`
			.replace(/[^a-z0-9:_-]+/gi, "-")
			.toLowerCase();
	return `<!doctype html>
<html lang="${escapeAttr(pageState.metadata.locale || "en")}">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>${escapeHtml(pageState.title)} - editable SCORM package</title>
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
 * Renders the production SCORM learner page from assets/data/page.json.
 *
 * Intent:
 * This file is responsible for loading JSON, rendering learner blocks, and
 * using D2L Core interactions because the production package removes the
 * authoring tool but still needs to display the authored content.
 */

/**
 * Escapes JSON text before inserting it into generated HTML.
 *
 * @param {*} value - Value from assets/data/page.json.
 * @returns {string} HTML-safe string.
 */
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (match) => ({
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#039;",
}[match]));

/**
 * Renders simple text content with a requested semantic tag.
 *
 * @param {string} value - Text from the page JSON.
 * @param {string} [tag="p"] - HTML tag name.
 * @returns {string} HTML string.
 */
const renderEditableText = (value, tag = "p") => \`<\${tag}>\${escapeHtml(value)}</\${tag}>\`;

/**
 * Renders one production learner block from JSON.
 *
 * @param {object} block - Block from page.blocks.
 * @returns {string} Learner-facing HTML.
 *
 * This generated function supports production SCORM export by rendering the
 * same JSON model without editing controls.
 */
function renderBlock(block) {
	switch (block.type) {
		case "heading":
			return renderEditableText(block.content, "h2");
		case "text":
			return renderEditableText(block.content);
		case "callout":
			return \`<section class="course-callout"><h3>\${escapeHtml(block.title)}</h3><p>\${escapeHtml(block.body)}</p></section>\`;
		case "image":
			return \`<figure>\${block.src ? \`<img src="\${escapeHtml(block.src)}" alt="\${escapeHtml(block.alt)}" />\` : \`<div class="course-region">Image placeholder</div>\`}<figcaption>\${escapeHtml(block.caption)}</figcaption></figure>\`;
		case "accordion":
			return \`<d2l-collapsible-panel-group>\${block.items.map((item, index) => \`<d2l-collapsible-panel panel-title="\${escapeHtml(item.title)}" heading-level="3" \${index === 0 ? "expanded" : ""}><p>\${escapeHtml(item.body)}</p></d2l-collapsible-panel>\`).join("")}</d2l-collapsible-panel-group>\`;
		case "tabs":
			return \`<d2l-tabs text="Course tabs">\${block.items.map((item, index) => \`<d2l-tab id="\${block.id}-tab-\${index}" text="\${escapeHtml(item.title)}" slot="tabs" \${index === 0 ? "selected" : ""}></d2l-tab>\`).join("")}\${block.items.map((item, index) => \`<d2l-tab-panel labelled-by="\${block.id}-tab-\${index}" slot="panels"><p>\${escapeHtml(item.body)}</p></d2l-tab-panel>\`).join("")}</d2l-tabs>\`;
		case "flipcard":
			return \`<section class="course-layout" style="--columns:2"><div class="course-region"><strong>Front</strong><p>\${escapeHtml(block.front)}</p></div><div class="course-region"><strong>Back</strong><p>\${escapeHtml(block.back)}</p></div></section>\`;
		case "quiz":
			return \`<section class="course-region"><h2>\${escapeHtml(block.question)}</h2><ul>\${block.options.map((option) => \`<li>\${escapeHtml(option.text)}</li>\`).join("")}</ul><p>\${escapeHtml(block.feedback)}</p></section>\`;
		case "reflection":
			return \`<section class="course-callout"><h2>\${escapeHtml(block.prompt)}</h2><p>\${escapeHtml(block.guidance)}</p></section>\`;
		case "scenario":
			return \`<section class="course-region"><h2>\${escapeHtml(block.title)}</h2><p>\${escapeHtml(block.situation)}</p><p>\${escapeHtml(block.prompt)}</p></section>\`;
		case "layout":
			return \`<section class="course-layout" style="--columns:\${block.settings?.columns || 1}">\${block.regions.map((region) => \`<div class="course-region" style="grid-column:span \${region.span || 1}"><strong>\${escapeHtml(region.role)}</strong><p>\${escapeHtml(region.content)}</p></div>\`).join("")}</section>\`;
		case "divider":
			return "<hr />";
		case "button":
			return \`<p><a class="course-button" href="\${escapeHtml(block.url)}">\${escapeHtml(block.label)}</a></p>\`;
		case "checklist":
			return \`<section class='course-region'><ul>\${block.items.map((item) => \`<li>\${escapeHtml(item.text)}</li>\`).join("")}</ul></section>\`;
		default:
			return \`<section><pre>\${escapeHtml(JSON.stringify(block, null, 2))}</pre></section>\`;
	}
}

fetch("./assets/data/page.json")
	.then((response) => response.json())
	.then((page) => {
		document.title = page.title;
		document.querySelector("#course").innerHTML = \`<h1>\${escapeHtml(page.title)}</h1>\${page.blocks.map(renderBlock).join("")}\`;
	});
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
}
`;
}
