/**
 * src/scorm/exporter.js
 *
 * Purpose:
 * Builds downloadable JSON and SCORM-style ZIP files from the current page model.
 *
 * Intent:
 * This file is responsible for collecting source files, creating package
 * contents, and triggering browser downloads because the demo export workflow
 * needs to repackage the authored JSON into either an editable LMS tool or a
 * production learner course.
 *
 * Role in the app:
 * - Called by src/main.js when users click export buttons.
 * - Uses src/scorm/package-config.js to decide package contents.
 * - Uses src/scorm/manifest.js and src/scorm/course-runtime-template.js to
 *   generate package-specific files.
 * - Uses src/scorm/zip.js to create the final downloadable zip.
 *
 * Data received/exported:
 * - Receives pageState and showToast callback.
 * - Produces browser downloads; it does not persist data.
 */
import { buildEditorIndexHtml, buildProductionIndexHtml, buildRuntimeJs } from "./course-runtime-template.js";
import { buildManifestXml } from "./manifest.js";
import { EXPORT_PACKAGES, SOURCE_MODULE_FILES, STYLE_FILES } from "./package-config.js";
import { createZipBlob } from "./zip.js";

/**
 * Downloads the current page JSON as page.json.
 *
 * @param {object} pageState - Current page JSON model.
 * @param {Function} showToast - UI feedback callback from src/ui/toast.js.
 * @returns {void}
 *
 * This function does not mutate pageState. It supports presentation and export
 * debugging by exposing the exact JSON that both SCORM package types use.
 */
export function downloadJson(pageState, showToast) {
	const blob = new Blob([`${JSON.stringify(pageState, null, 2)}\n`], {
		type: "application/json",
	});
	downloadBlob(blob, "page.json");
	showToast("page.json prepared", "success");
}

/**
 * Builds and downloads the selected SCORM-style package.
 *
 * @param {object} pageState - Current page JSON model to package.
 * @param {"editor"|"production"} [packageType="production"] - Package mode.
 * @param {Function} showToast - UI feedback callback.
 * @returns {Promise<void>} Resolves after the browser download is triggered.
 *
 * This function does not mutate pageState. It supports the SCORM export
 * workflow by gathering files, creating a zip, and updating D2L loading feedback.
 */
export async function downloadScormZip(pageState, packageType = "production", showToast) {
	const packageConfig = EXPORT_PACKAGES[packageType] || EXPORT_PACKAGES.production;
	const progress = document.querySelector("#exportProgress");
	const progressText = progress?.querySelector("span");
	if (progressText) progressText.textContent = `Preparing ${packageConfig.label}...`;
	progress?.classList.add("is-visible");

	try {
		const files = await getExportFiles(pageState, packageType);
		const blob = createZipBlob(files);
		downloadBlob(blob, packageConfig.fileName);
		showToast(packageConfig.toast, "success");
	} catch (error) {
		console.error(error);
		showToast("SCORM export did not complete", "critical");
	} finally {
		progress?.classList.remove("is-visible");
	}
}

/**
 * Creates the in-memory file list used by the ZIP writer.
 *
 * @param {object} pageState - Current page JSON model.
 * @param {"editor"|"production"} [packageType="production"] - Package mode.
 * @returns {Promise<Array<{path: string, content: string|Uint8Array}>>} Files for the zip.
 *
 * This function reads source files over HTTP but does not mutate pageState. It
 * is the core repackaging step that separates editable LMS output from production output.
 */
async function getExportFiles(pageState, packageType = "production") {
	const bundleText = await fetchText("./brightspace-core-bundle.js");
	if (packageType === "editor") {
		const sourceFiles = await readNamedFiles(["app.js", "preview.html", ...SOURCE_MODULE_FILES, ...STYLE_FILES]);
		return [
			{ path: "index.html", content: buildEditorIndexHtml(pageState) },
			{ path: "imsmanifest.xml", content: buildManifestXml(pageState, "editor") },
			{ path: "assets/data/page.json", content: `${JSON.stringify(pageState, null, 2)}\n` },
			...sourceFiles,
			{ path: "brightspace-core-bundle.js", content: bundleText },
			{ path: "lang/en.js", content: "export default {};\n" },
		];
	}

	const activityInteractions = await fetchText("./src/authoring/activity-interactions.js");
	const learnerRuntime = await fetchText("./src/learner/runtime.js");
	const courseCss = await fetchText("./styles/learner/course.css");
	return [
		{ path: "index.html", content: buildProductionIndexHtml(pageState) },
		{ path: "imsmanifest.xml", content: buildManifestXml(pageState, "production") },
		{ path: "assets/data/page.json", content: `${JSON.stringify(pageState, null, 2)}\n` },
		{ path: "assets/js/runtime.js", content: buildRuntimeJs() },
		{ path: "assets/css/course.css", content: courseCss },
		{ path: "src/learner/runtime.js", content: learnerRuntime },
		{ path: "src/authoring/activity-interactions.js", content: activityInteractions },
		{ path: "brightspace-core-bundle.js", content: bundleText },
		{ path: "lang/en.js", content: "export default {};\n" },
	];
}

/**
 * Reads a list of local source files for inclusion in the editable package.
 *
 * @param {string[]} paths - Paths relative to the app root.
 * @returns {Promise<Array<{path: string, content: string}>>} Source file objects.
 *
 * This function supports editable SCORM export by preserving the modular source
 * tree inside the LMS-editable package.
 */
async function readNamedFiles(paths) {
	return Promise.all(paths.map(async (path) => ({
		path,
		content: await fetchText(`./${path}`),
	})));
}

/**
 * Fetches a local text file and reports HTTP failures clearly.
 *
 * @param {string} url - Local URL to fetch.
 * @returns {Promise<string>} Text content.
 *
 * This utility supports packaging by reading JS, CSS, HTML, and bundle files
 * from the running static server.
 */
async function fetchText(url) {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Unable to read ${url}: ${response.status}`);
	}
	return response.text();
}

/**
 * Triggers a browser download for an in-memory Blob.
 *
 * @param {Blob} blob - File content to download.
 * @param {string} fileName - Suggested download filename.
 * @returns {void}
 *
 * This function creates temporary object URLs and does not mutate application
 * state; it is the final handoff from package generation to the browser.
 */
function downloadBlob(blob, fileName) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = fileName;
	document.body.appendChild(link);
	link.click();
	link.remove();
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
