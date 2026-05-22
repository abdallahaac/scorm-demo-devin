/**
 * src/scorm/manifest.js
 *
 * Purpose:
 * Generates imsmanifest.xml for the demo SCORM packages.
 *
 * Intent:
 * This file is responsible for package identifiers, organization metadata, and
 * resource file entries because SCORM packages need a manifest that points the
 * LMS to index.html and lists the files being delivered.
 *
 * Role in the app:
 * - Called by src/scorm/exporter.js for both editable and production packages.
 * - Uses src/scorm/package-config.js so the manifest file entries match the
 *   actual package file list.
 * - Receives pageState so the manifest title reflects the authored page.
 *
 * Output:
 * - Returns an XML string written into imsmanifest.xml inside the zip.
 */
import { getExportFileList } from "./package-config.js";
import { escapeAttr, escapeHtml } from "../shared/html.js";

/**
 * Builds a simple SCORM 1.2-style manifest.
 *
 * @param {object} pageState - Current page JSON model used for titles.
 * @param {"editor"|"production"} [packageType="production"] - Package mode.
 * @returns {string} imsmanifest.xml content.
 *
 * This function does not mutate data. It supports SCORM export by producing
 * the LMS entry point and resource listing for the selected package.
 */
export function buildManifestXml(pageState, packageType = "production") {
	const packageId = packageType === "editor" ? "basic-d2l-demo-editable-lms" : "basic-d2l-demo-production-lms";
	const packageTitle = packageType === "editor" ? `${pageState.title} - editable in LMS` : pageState.title;
	return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${escapeAttr(packageId)}" version="1.0"
	xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
	xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
	xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<metadata>
		<schema>ADL SCORM</schema>
		<schemaversion>1.2</schemaversion>
	</metadata>
	<organizations default="demo-org">
		<organization identifier="demo-org">
			<title>${escapeHtml(packageTitle)}</title>
			<item identifier="demo-item" identifierref="demo-resource">
				<title>${escapeHtml(packageTitle)}</title>
			</item>
		</organization>
	</organizations>
	<resources>
		<resource identifier="demo-resource" type="webcontent" adlcp:scormtype="sco" href="index.html">
			${getExportFileList(packageType).filter((file) => file !== "imsmanifest.xml").map((file) => `<file href="${escapeAttr(file)}" />`).join("\n\t\t\t")}
		</resource>
	</resources>
</manifest>
`;
}
