/**
 * src/scorm/package-config.js
 *
 * Purpose:
 * Defines package labels, filenames, and file manifests for export.
 *
 * Intent:
 * This file is responsible for editable package files, production package
 * files, and export labels because exporter.js needs one authoritative place
 * to decide what goes into each SCORM zip.
 *
 * Role in the app:
 * - Consumed by src/scorm/export-dialog.js to display included files.
 * - Consumed by src/scorm/exporter.js to read source modules and name zips.
 * - Consumed by src/scorm/manifest.js so imsmanifest.xml matches the zip contents.
 *
 * Configuration:
 * - SOURCE_MODULE_FILES and STYLE_FILES are included only in the editable LMS package.
 * - EXPORT_PACKAGES stores user-facing labels and download filenames.
 */
export const SOURCE_MODULE_FILES = [
	"src/main.js",
	"src/authoring/activity-interactions.js",
	"src/authoring/block-renderers.js",
	"src/authoring/editor-actions.js",
	"src/authoring/icon-picker.js",
	"src/authoring/shell.js",
	"src/insertion/element-definitions.js",
	"src/insertion/insert-dialogs.js",
	"src/insertion/layout-definitions.js",
	"src/scorm/course-runtime-template.js",
	"src/scorm/export-dialog.js",
	"src/scorm/exporter.js",
	"src/scorm/manifest.js",
	"src/scorm/package-config.js",
	"src/scorm/zip.js",
	"src/shared/html.js",
	"src/shared/ids.js",
	"src/shared/object.js",
	"src/shared/tier1-icons.js",
	"src/state/course-structure.js",
	"src/state/default-page.js",
	"src/state/page-state.js",
	"src/ui/toast.js",
];

export const STYLE_FILES = [
	"styles.css",
	"styles/base.css",
	"styles/authoring/editor.css",
	"styles/insertion/modals.css",
	"styles/scorm/export.css",
	"styles/responsive.css",
];

export const EXPORT_PACKAGES = {
	editor: {
		fileName: "d2l-scorm-authoring-demo-editor.zip",
		label: "Editable LMS package",
		description: "Keeps the authoring toolbar, insert modals, editable canvas, localStorage save, JSON panel, and SCORM export controls inside the LMS.",
		toast: "Editable LMS SCORM package prepared",
	},
	production: {
		fileName: "d2l-scorm-authoring-demo-production.zip",
		label: "Production package",
		description: "Exports a learner-facing SCORM package with the saved JSON rendered by a compact runtime and no authoring controls.",
		toast: "Production SCORM package prepared",
	},
};

/**
 * Returns the file list for a package type.
 *
 * @param {"editor"|"production"} [packageType="production"] - Package mode to describe.
 * @returns {string[]} File paths that should be shown in the dialog and manifest.
 *
 * This function does not mutate state. It supports SCORM export by keeping the
 * visible file list, package builder, and manifest generation aligned.
 */
export function getExportFileList(packageType = "production") {
	if (packageType === "editor") {
		return [
			"index.html",
			"imsmanifest.xml",
			"assets/data/page.json",
			"app.js",
			...SOURCE_MODULE_FILES,
			...STYLE_FILES,
			"brightspace-core-bundle.js",
			"lang/en.js",
		];
	}
	return [
		"index.html",
		"imsmanifest.xml",
		"assets/data/page.json",
		"assets/js/runtime.js",
		"assets/css/course.css",
		"src/authoring/activity-interactions.js",
		"brightspace-core-bundle.js",
		"lang/en.js",
	];
}
