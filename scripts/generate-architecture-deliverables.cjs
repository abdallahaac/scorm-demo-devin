const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");
const architectureDir = path.join(root, "assets", "architecture");
const outputDir = path.join(root, "deliverables", "architecture");
const pngDir = path.join(outputDir, "generated-images");
let crcTable;

const diagrams = [
	{
		id: "flow-01-entry",
		title: "Iteration 1: The shortest path",
		caption: "From browser entry to the visible editor.",
		width: 1200,
		height: 720,
	},
	{
		id: "flow-02-state-ui",
		title: "Iteration 2: Add the live page blueprint",
		caption: "Adds pageState JSON, the render layer, the JSON panel, and localStorage.",
		width: 1200,
		height: 720,
	},
	{
		id: "flow-03-authoring-actions",
		title: "Iteration 3: Add authoring behavior",
		caption: "Shows typing, insertion, layout selection, block actions, saving, preview, and re-rendering.",
		width: 1200,
		height: 720,
	},
	{
		id: "flow-04-export-paths",
		title: "Iteration 4: Add SCORM export",
		caption: "Shows editable and production package paths through manifest, template, and zip generation.",
		width: 1200,
		height: 720,
	},
	{
		id: "flow-05-full-architecture",
		title: "Iteration 5: Full codebase map",
		caption: "Shows the browser, controller, UI modules, state, insertion, helpers, styles, server, and SCORM export modules.",
		width: 1400,
		height: 900,
	},
].map((diagram) => ({
	...diagram,
	svgPath: path.join(architectureDir, `${diagram.id}.svg`),
	pngPath: path.join(pngDir, `${diagram.id}.png`),
}));

const docxPath = path.join(outputDir, "Codebase_Architecture_Map.docx");
const pptxPath = path.join(outputDir, "Codebase_Architecture_Map.pptx");

fs.mkdirSync(pngDir, { recursive: true });

generatePngs();
writeFile(docxPath, buildDocx());
writeFile(pptxPath, buildPptx());

console.log(`Generated ${docxPath}`);
console.log(`Generated ${pptxPath}`);
diagrams.forEach((diagram) => console.log(`Generated ${diagram.pngPath}`));

function generatePngs() {
	const chromePath = findChrome();
	if (!chromePath) {
		throw new Error("Chrome or Edge was not found. PNG generation needs a local headless browser.");
	}

	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "architecture-render-"));
	const profileDir = path.join(tempDir, "chrome-profile");
	fs.mkdirSync(profileDir, { recursive: true });

	try {
		diagrams.forEach((diagram) => {
			if (!fs.existsSync(diagram.svgPath)) {
				throw new Error(`Missing source SVG: ${diagram.svgPath}`);
			}
			const htmlPath = path.join(tempDir, `${diagram.id}.html`);
			const html = `<!doctype html>
<html>
	<head>
		<meta charset="UTF-8" />
		<style>
			html,
			body {
				background: #ffffff;
				height: ${diagram.height}px;
				margin: 0;
				overflow: hidden;
				width: ${diagram.width}px;
			}

			img {
				display: block;
				height: ${diagram.height}px;
				width: ${diagram.width}px;
			}
		</style>
	</head>
	<body>
		<img src="${pathToFileURL(diagram.svgPath).href}" alt="${escapeAttr(diagram.title)}" />
	</body>
</html>
`;
			fs.writeFileSync(htmlPath, html, "utf8");
			execFileSync(chromePath, [
				"--headless=new",
				"--disable-gpu",
				"--hide-scrollbars",
				`--user-data-dir=${profileDir}`,
				`--window-size=${diagram.width},${diagram.height}`,
				`--screenshot=${diagram.pngPath}`,
				pathToFileURL(htmlPath).href,
			], { stdio: "pipe" });

			const bytes = fs.readFileSync(diagram.pngPath);
			const isPng = bytes.length > 8
				&& bytes[0] === 0x89
				&& bytes[1] === 0x50
				&& bytes[2] === 0x4e
				&& bytes[3] === 0x47;
			if (!isPng) {
				throw new Error(`Chrome did not create a valid PNG: ${diagram.pngPath}`);
			}
		});
	} finally {
		fs.rmSync(tempDir, { recursive: true, force: true });
	}
}

function findChrome() {
	const candidates = [
		process.env.CHROME_PATH,
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
		"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	].filter(Boolean);
	return candidates.find((candidate) => fs.existsSync(candidate));
}

function buildDocx() {
	const files = [
		{ path: "[Content_Types].xml", content: docxContentTypes() },
		{ path: "_rels/.rels", content: rootRelationships("word/document.xml") },
		{ path: "docProps/core.xml", content: coreProperties("Codebase Architecture Map") },
		{ path: "docProps/app.xml", content: appProperties("Microsoft Word") },
		{ path: "word/document.xml", content: wordDocumentXml() },
		{ path: "word/_rels/document.xml.rels", content: wordRelationships() },
		...diagrams.map((diagram) => ({
			path: `word/media/${path.basename(diagram.pngPath)}`,
			content: fs.readFileSync(diagram.pngPath),
		})),
	];
	return createZipBuffer(files);
}

function docxContentTypes() {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
	<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
	<Default Extension="xml" ContentType="application/xml"/>
	<Default Extension="png" ContentType="image/png"/>
	<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
	<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
	<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
}

function wordRelationships() {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${diagrams.map((diagram, index) => `	<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${escapeAttr(path.basename(diagram.pngPath))}"/>`).join("\n")}
</Relationships>`;
}

function wordDocumentXml() {
	const body = [
		wordParagraph("Codebase Architecture Map", { size: 34, bold: true }),
		wordParagraph("D2L SCORM Authoring Demo", { size: 20, color: "5C6470" }),
		wordParagraph("This document explains the codebase as a page builder: the editor changes a live JSON blueprint, and the exporter turns that blueprint into a SCORM package for an LMS.", { spacingAfter: 240 }),
		wordParagraph("How to read this", { size: 22, bold: true }),
		wordParagraph("The diagrams start simple and add detail each time. By the final image, every major folder and workflow is visible: startup, state, authoring UI, insertion, saving, export, helpers, styles, and local serving."),
		wordParagraph("Plain-language architecture summary", { size: 22, bold: true }),
		wordParagraph("1. index.html is the doorway. It loads the D2L component bundle, the app stylesheet, and app.js."),
		wordParagraph("2. app.js starts src/main.js, which acts as the traffic controller for the browser app."),
		wordParagraph("3. pageState JSON is the page blueprint. It holds the title, metadata, blocks, layout regions, quiz details, and export-ready content."),
		wordParagraph("4. The authoring modules render that blueprint as toolbar controls, an editable canvas, dialogs, and a live JSON panel."),
		wordParagraph("5. The SCORM modules package the same blueprint as either an editable LMS package or a production learner package.", { spacingAfter: 360 }),
		...diagrams.flatMap((diagram, index) => [
			index === 0 ? "" : wordPageBreak(),
			wordParagraph(diagram.title, { size: 24, bold: true }),
			wordParagraph(diagram.caption, { color: "5C6470", spacingAfter: 180 }),
			wordImage(diagram, index + 1),
		]),
		wordPageBreak(),
		wordParagraph("Module guide", { size: 26, bold: true }),
		wordParagraph("index.html: browser doorway for the live editor."),
		wordParagraph("app.js: small starter switch that hands #app to src/main.js."),
		wordParagraph("src/main.js: traffic controller for clicks, typing, preview, save, insert, and export."),
		wordParagraph("src/state/: loads the default page, a saved browser draft, or an exported package seed."),
		wordParagraph("src/authoring/: renders the editor shell, visible blocks, and block-level changes."),
		wordParagraph("src/insertion/: defines insertable content blocks and layout shapes."),
		wordParagraph("src/scorm/: builds the export dialog, manifest, package templates, and zip file."),
		wordParagraph("src/shared/ and src/ui/: small safety and feedback helpers."),
		wordParagraph("styles/: visual layout for the editor, dialogs, export panel, responsive behavior, and this architecture page."),
		wordParagraph("server.cjs: local static server used so modules, CSS imports, fetch calls, and export packaging work over HTTP."),
	].join("");

	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
	xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
	xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
	xmlns:o="urn:schemas-microsoft-com:office:office"
	xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
	xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
	xmlns:v="urn:schemas-microsoft-com:vml"
	xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
	xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
	xmlns:w10="urn:schemas-microsoft-com:office:word"
	xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
	xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
	xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
	xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
	xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
	xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
	mc:Ignorable="w14 wp14">
	<w:body>
		${body}
		<w:sectPr>
			<w:pgSz w:w="12240" w:h="15840"/>
			<w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/>
		</w:sectPr>
	</w:body>
</w:document>`;
}

function wordParagraph(text, options = {}) {
	const size = options.size || 20;
	const color = options.color || "202122";
	const bold = options.bold ? "<w:b/>" : "";
	const spacingAfter = options.spacingAfter ?? 120;
	return `<w:p>
	<w:pPr>
		<w:spacing w:after="${spacingAfter}"/>
	</w:pPr>
	<w:r>
		<w:rPr>${bold}<w:color w:val="${color}"/><w:sz w:val="${size * 2}"/><w:szCs w:val="${size * 2}"/></w:rPr>
		<w:t>${escapeXml(text)}</w:t>
	</w:r>
</w:p>`;
}

function wordPageBreak() {
	return `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
}

function wordImage(diagram, index) {
	const maxWidth = inches(7.1);
	const cx = Math.round(maxWidth);
	const cy = Math.round(maxWidth * diagram.height / diagram.width);
	return `<w:p>
	<w:pPr>
		<w:jc w:val="center"/>
		<w:spacing w:after="300"/>
	</w:pPr>
	<w:r>
		<w:drawing>
			<wp:inline distT="0" distB="0" distL="0" distR="0">
				<wp:extent cx="${cx}" cy="${cy}"/>
				<wp:effectExtent l="0" t="0" r="0" b="0"/>
				<wp:docPr id="${index}" name="${escapeAttr(diagram.title)}" descr="${escapeAttr(diagram.caption)}"/>
				<wp:cNvGraphicFramePr>
					<a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
				</wp:cNvGraphicFramePr>
				<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
					<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
						<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
							<pic:nvPicPr>
								<pic:cNvPr id="${index}" name="${escapeAttr(path.basename(diagram.pngPath))}"/>
								<pic:cNvPicPr/>
							</pic:nvPicPr>
							<pic:blipFill>
								<a:blip r:embed="rId${index}"/>
								<a:stretch><a:fillRect/></a:stretch>
							</pic:blipFill>
							<pic:spPr>
								<a:xfrm>
									<a:off x="0" y="0"/>
									<a:ext cx="${cx}" cy="${cy}"/>
								</a:xfrm>
								<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
							</pic:spPr>
						</pic:pic>
					</a:graphicData>
				</a:graphic>
			</wp:inline>
		</w:drawing>
	</w:r>
</w:p>`;
}

function buildPptx() {
	const slides = [
		coverSlideXml(),
		...diagrams.map((diagram, index) => imageSlideXml(diagram, index + 2)),
	];
	const files = [
		{ path: "[Content_Types].xml", content: pptxContentTypes(slides.length) },
		{ path: "_rels/.rels", content: rootRelationships("ppt/presentation.xml") },
		{ path: "docProps/core.xml", content: coreProperties("Codebase Architecture Map Presentation") },
		{ path: "docProps/app.xml", content: appProperties("Microsoft PowerPoint") },
		{ path: "ppt/presentation.xml", content: presentationXml(slides.length) },
		{ path: "ppt/_rels/presentation.xml.rels", content: presentationRelationships(slides.length) },
		{ path: "ppt/slideMasters/slideMaster1.xml", content: slideMasterXml() },
		{ path: "ppt/slideMasters/_rels/slideMaster1.xml.rels", content: slideMasterRelationships() },
		{ path: "ppt/slideLayouts/slideLayout1.xml", content: slideLayoutXml() },
		{ path: "ppt/slideLayouts/_rels/slideLayout1.xml.rels", content: slideLayoutRelationships() },
		{ path: "ppt/theme/theme1.xml", content: themeXml() },
		{ path: "ppt/tableStyles.xml", content: tableStylesXml() },
		...slides.map((content, index) => ({ path: `ppt/slides/slide${index + 1}.xml`, content })),
		{ path: "ppt/slides/_rels/slide1.xml.rels", content: slideRelationships() },
		...diagrams.map((diagram, index) => ({
			path: `ppt/slides/_rels/slide${index + 2}.xml.rels`,
			content: slideRelationships(`../media/${path.basename(diagram.pngPath)}`),
		})),
		...diagrams.map((diagram) => ({
			path: `ppt/media/${path.basename(diagram.pngPath)}`,
			content: fs.readFileSync(diagram.pngPath),
		})),
	];
	return createZipBuffer(files);
}

function pptxContentTypes(slideCount) {
	const slideOverrides = Array.from({ length: slideCount }, (_, index) =>
		`	<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`,
	).join("\n");
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
	<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
	<Default Extension="xml" ContentType="application/xml"/>
	<Default Extension="png" ContentType="image/png"/>
	<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
	<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
	<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
	<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
	<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
	<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
	<Override PartName="/ppt/tableStyles.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"/>
${slideOverrides}
</Types>`;
}

function presentationXml(slideCount) {
	const slideIds = Array.from({ length: slideCount }, (_, index) =>
		`		<p:sldId id="${256 + index}" r:id="rId${index + 2}"/>`,
	).join("\n");
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
	<p:sldMasterIdLst>
		<p:sldMasterId id="2147483648" r:id="rId1"/>
	</p:sldMasterIdLst>
	<p:sldIdLst>
${slideIds}
	</p:sldIdLst>
	<p:sldSz cx="12192000" cy="6858000" type="wide"/>
	<p:notesSz cx="6858000" cy="9144000"/>
	<p:defaultTextStyle>
		<a:defPPr>
			<a:defRPr lang="en-US"/>
		</a:defPPr>
	</p:defaultTextStyle>
</p:presentation>`;
}

function presentationRelationships(slideCount) {
	const slides = Array.from({ length: slideCount }, (_, index) =>
		`	<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`,
	).join("\n");
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
	<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
${slides}
	<Relationship Id="rId${slideCount + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/tableStyles" Target="tableStyles.xml"/>
</Relationships>`;
}

function coverSlideXml() {
	return slideXml([
		textBox(1, "Codebase Architecture Map", 0.75, 1.15, 11.75, 1.1, 38, true, "202122"),
		textBox(2, "D2L SCORM Authoring Demo", 0.78, 2.18, 11.0, 0.5, 18, false, "5C6470"),
		textBox(3, "A layman-friendly walkthrough of how the editor, JSON blueprint, insertion tools, save flow, and SCORM exporter work together.", 0.78, 3.05, 10.7, 1.25, 23, false, "39424E"),
		textBox(4, "The next five slides show the same architecture with more detail added at each step.", 0.78, 5.4, 10.8, 0.7, 18, true, "006FBF"),
	]);
}

function imageSlideXml(diagram, shapeStartId) {
	const image = fitImage(diagram.width, diagram.height, 0.45, 0.75, 12.4, 5.9);
	return slideXml([
		textBox(1, diagram.title, 0.5, 0.18, 12.2, 0.45, 18, true, "202122"),
		picture(2, diagram, image.x, image.y, image.w, image.h),
		textBox(shapeStartId + 20, diagram.caption, 0.65, 6.82, 12.0, 0.35, 12, false, "5C6470"),
	]);
}

function slideXml(shapes) {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
	<p:cSld>
		<p:bg>
			<p:bgPr>
				<a:solidFill><a:srgbClr val="F6F8FB"/></a:solidFill>
			</p:bgPr>
		</p:bg>
		<p:spTree>
			<p:nvGrpSpPr>
				<p:cNvPr id="1" name=""/>
				<p:cNvGrpSpPr/>
				<p:nvPr/>
			</p:nvGrpSpPr>
			<p:grpSpPr>
				<a:xfrm>
					<a:off x="0" y="0"/>
					<a:ext cx="0" cy="0"/>
					<a:chOff x="0" y="0"/>
					<a:chExt cx="0" cy="0"/>
				</a:xfrm>
			</p:grpSpPr>
			${shapes.join("\n")}
		</p:spTree>
	</p:cSld>
	<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
}

function textBox(id, text, x, y, w, h, fontSize, bold, color) {
	return `<p:sp>
	<p:nvSpPr>
		<p:cNvPr id="${id + 10}" name="Text ${id}"/>
		<p:cNvSpPr txBox="1"/>
		<p:nvPr/>
	</p:nvSpPr>
	<p:spPr>
		<a:xfrm>
			<a:off x="${emu(x)}" y="${emu(y)}"/>
			<a:ext cx="${emu(w)}" cy="${emu(h)}"/>
		</a:xfrm>
		<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
		<a:noFill/>
	</p:spPr>
	<p:txBody>
		<a:bodyPr wrap="square" anchor="t"/>
		<a:lstStyle/>
		<a:p>
			<a:r>
				<a:rPr lang="en-US" sz="${fontSize * 100}"${bold ? ' b="1"' : ""}>
					<a:solidFill><a:srgbClr val="${color}"/></a:solidFill>
					<a:latin typeface="Lato"/>
				</a:rPr>
				<a:t>${escapeXml(text)}</a:t>
			</a:r>
		</a:p>
	</p:txBody>
</p:sp>`;
}

function picture(id, diagram, x, y, w, h) {
	return `<p:pic>
	<p:nvPicPr>
		<p:cNvPr id="${id + 40}" name="${escapeAttr(path.basename(diagram.pngPath))}" descr="${escapeAttr(diagram.caption)}"/>
		<p:cNvPicPr>
			<a:picLocks noChangeAspect="1"/>
		</p:cNvPicPr>
		<p:nvPr/>
	</p:nvPicPr>
	<p:blipFill>
		<a:blip r:embed="rId2"/>
		<a:stretch><a:fillRect/></a:stretch>
	</p:blipFill>
	<p:spPr>
		<a:xfrm>
			<a:off x="${emu(x)}" y="${emu(y)}"/>
			<a:ext cx="${emu(w)}" cy="${emu(h)}"/>
		</a:xfrm>
		<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
	</p:spPr>
</p:pic>`;
}

function fitImage(pixelWidth, pixelHeight, x, y, maxW, maxH) {
	const aspect = pixelWidth / pixelHeight;
	let w = maxW;
	let h = w / aspect;
	if (h > maxH) {
		h = maxH;
		w = h * aspect;
	}
	return {
		x: x + (maxW - w) / 2,
		y,
		w,
		h,
	};
}

function slideRelationships(imageTarget) {
	const imageRelationship = imageTarget
		? `	<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${escapeAttr(imageTarget)}"/>`
		: "";
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
	<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
${imageRelationship}
</Relationships>`;
}

function slideMasterXml() {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
	<p:cSld>
		<p:spTree>
			<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
			<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
		</p:spTree>
	</p:cSld>
	<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
	<p:sldLayoutIdLst>
		<p:sldLayoutId id="2147483649" r:id="rId1"/>
	</p:sldLayoutIdLst>
	<p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles>
</p:sldMaster>`;
}

function slideMasterRelationships() {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
	<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
	<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`;
}

function slideLayoutXml() {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
	<p:cSld name="Blank">
		<p:spTree>
			<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
			<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
		</p:spTree>
	</p:cSld>
	<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`;
}

function slideLayoutRelationships() {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
	<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;
}

function themeXml() {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Architecture Map">
	<a:themeElements>
		<a:clrScheme name="Architecture">
			<a:dk1><a:srgbClr val="202122"/></a:dk1>
			<a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
			<a:dk2><a:srgbClr val="39424E"/></a:dk2>
			<a:lt2><a:srgbClr val="F6F8FB"/></a:lt2>
			<a:accent1><a:srgbClr val="006FBF"/></a:accent1>
			<a:accent2><a:srgbClr val="16805B"/></a:accent2>
			<a:accent3><a:srgbClr val="A76500"/></a:accent3>
			<a:accent4><a:srgbClr val="6954C9"/></a:accent4>
			<a:accent5><a:srgbClr val="087990"/></a:accent5>
			<a:accent6><a:srgbClr val="B3261E"/></a:accent6>
			<a:hlink><a:srgbClr val="006FBF"/></a:hlink>
			<a:folHlink><a:srgbClr val="6954C9"/></a:folHlink>
		</a:clrScheme>
		<a:fontScheme name="Architecture">
			<a:majorFont><a:latin typeface="Lato"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>
			<a:minorFont><a:latin typeface="Lato"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>
		</a:fontScheme>
		<a:fmtScheme name="Architecture">
			<a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>
			<a:lnStyleLst><a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln></a:lnStyleLst>
			<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
			<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>
		</a:fmtScheme>
	</a:themeElements>
	<a:objectDefaults/>
	<a:extraClrSchemeLst/>
</a:theme>`;
}

function tableStylesXml() {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:tblStyleLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>`;
}

function rootRelationships(target) {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
	<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="${escapeAttr(target)}"/>
	<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
	<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function coreProperties(title) {
	const timestamp = new Date().toISOString();
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<dc:title>${escapeXml(title)}</dc:title>
	<dc:subject>D2L SCORM authoring demo codebase architecture</dc:subject>
	<dc:creator>Codex</dc:creator>
	<cp:lastModifiedBy>Codex</cp:lastModifiedBy>
	<dcterms:created xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:created>
	<dcterms:modified xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:modified>
</cp:coreProperties>`;
}

function appProperties(application) {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
	<Application>${escapeXml(application)}</Application>
	<Company></Company>
</Properties>`;
}

function writeFile(filePath, buffer) {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, buffer);
}

function createZipBuffer(files) {
	const now = new Date();
	const { dosDate, dosTime } = getDosDateTime(now);
	const localParts = [];
	const centralParts = [];
	let offset = 0;

	files.forEach((file) => {
		const nameBytes = Buffer.from(file.path, "utf8");
		const dataBytes = Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content, "utf8");
		const crc = crc32(dataBytes);
		const localHeader = createLocalFileHeader({ nameBytes, dataBytes, crc, dosDate, dosTime });
		localParts.push(localHeader, dataBytes);
		centralParts.push(createCentralDirectoryHeader({ nameBytes, dataBytes, crc, dosDate, dosTime, offset }));
		offset += localHeader.length + dataBytes.length;
	});

	const centralDirectoryOffset = offset;
	const centralDirectorySize = centralParts.reduce((sum, part) => sum + part.length, 0);
	const endRecord = createEndRecord({
		fileCount: files.length,
		centralDirectorySize,
		centralDirectoryOffset,
	});
	return Buffer.concat([...localParts, ...centralParts, endRecord]);
}

function createLocalFileHeader({ nameBytes, dataBytes, crc, dosDate, dosTime }) {
	const header = Buffer.alloc(30 + nameBytes.length);
	header.writeUInt32LE(0x04034b50, 0);
	header.writeUInt16LE(20, 4);
	header.writeUInt16LE(0, 6);
	header.writeUInt16LE(0, 8);
	header.writeUInt16LE(dosTime, 10);
	header.writeUInt16LE(dosDate, 12);
	header.writeUInt32LE(crc, 14);
	header.writeUInt32LE(dataBytes.length, 18);
	header.writeUInt32LE(dataBytes.length, 22);
	header.writeUInt16LE(nameBytes.length, 26);
	header.writeUInt16LE(0, 28);
	nameBytes.copy(header, 30);
	return header;
}

function createCentralDirectoryHeader({ nameBytes, dataBytes, crc, dosDate, dosTime, offset }) {
	const header = Buffer.alloc(46 + nameBytes.length);
	header.writeUInt32LE(0x02014b50, 0);
	header.writeUInt16LE(20, 4);
	header.writeUInt16LE(20, 6);
	header.writeUInt16LE(0, 8);
	header.writeUInt16LE(0, 10);
	header.writeUInt16LE(dosTime, 12);
	header.writeUInt16LE(dosDate, 14);
	header.writeUInt32LE(crc, 16);
	header.writeUInt32LE(dataBytes.length, 20);
	header.writeUInt32LE(dataBytes.length, 24);
	header.writeUInt16LE(nameBytes.length, 28);
	header.writeUInt16LE(0, 30);
	header.writeUInt16LE(0, 32);
	header.writeUInt16LE(0, 34);
	header.writeUInt16LE(0, 36);
	header.writeUInt32LE(0, 38);
	header.writeUInt32LE(offset, 42);
	nameBytes.copy(header, 46);
	return header;
}

function createEndRecord({ fileCount, centralDirectorySize, centralDirectoryOffset }) {
	const record = Buffer.alloc(22);
	record.writeUInt32LE(0x06054b50, 0);
	record.writeUInt16LE(0, 4);
	record.writeUInt16LE(0, 6);
	record.writeUInt16LE(fileCount, 8);
	record.writeUInt16LE(fileCount, 10);
	record.writeUInt32LE(centralDirectorySize, 12);
	record.writeUInt32LE(centralDirectoryOffset, 16);
	record.writeUInt16LE(0, 20);
	return record;
}

function getDosDateTime(date) {
	const year = Math.max(date.getFullYear(), 1980);
	return {
		dosDate: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
		dosTime: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
	};
}

function crc32(bytes) {
	if (!crcTable) crcTable = createCrcTable();
	let crc = 0xffffffff;
	for (let index = 0; index < bytes.length; index += 1) {
		crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[index]) & 0xff];
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function createCrcTable() {
	const table = new Uint32Array(256);
	for (let index = 0; index < 256; index += 1) {
		let value = index;
		for (let bit = 0; bit < 8; bit += 1) {
			value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
		}
		table[index] = value >>> 0;
	}
	return table;
}

function escapeXml(value) {
	return String(value ?? "").replace(/[&<>"']/g, (match) => ({
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&apos;",
	}[match]));
}

function escapeAttr(value) {
	return escapeXml(value);
}

function inches(value) {
	return Math.round(value * 914400);
}

function emu(value) {
	return inches(value);
}
