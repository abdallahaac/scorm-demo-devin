/**
 * src/state/default-page.js
 *
 * Purpose:
 * Provides the starter JSON model shown when the demo first opens.
 *
 * Intent:
 * This file is responsible for sample page metadata, starter blocks, and
 * starter layout regions because the authoring tool needs meaningful content
 * before a user inserts new elements or imports an editable package seed.
 *
 * Role in the app:
 * - Imported by src/state/page-state.js as the fallback page model.
 * - Rendered by src/authoring/shell.js and src/authoring/block-renderers.js.
 * - Saved and exported as the same JSON shape used by SCORM packaging.
 *
 * Data exported:
 * - defaultPage: object with title, metadata, and blocks array.
 * - Each block needs id, type, type-specific content, and optional metadata.
 */
import { createId } from "../shared/ids.js";

// Starter model rendered by the authoring canvas. The same structure is saved
// to localStorage and exported as assets/data/page.json in both SCORM packages.
export const defaultPage = {
	title: "Basic D2L SCORM Demo Page",
	metadata: {
		schemaVersion: 1,
		locale: "en",
		source: "Basic D2L Core SCORM demo",
		lastSaved: null,
	},
	blocks: [
		{
			id: createId("block"),
			type: "heading",
			content: "Default page layout",
			metadata: { insertedFrom: "starter" },
		},
		{
			id: createId("block"),
			type: "text",
			content:
				"Edit this starter content directly on the page. Use Add D2L Component to insert a collapsible panel, alert, or dropdown menu, then export either an editable LMS package or a production learner package.",
			metadata: { insertedFrom: "starter" },
		},
		{
			id: createId("block"),
			type: "layout",
			layoutType: "default-page-layout",
			title: "Default page layout",
			settings: { columns: 2 },
			regions: [
				{
					id: createId("region"),
					role: "Left content",
					kind: "content",
					span: 1,
					content: "Editable left column content for the lesson page.",
				},
				{
					id: createId("region"),
					role: "Right content",
					kind: "content",
					span: 1,
					content: "Editable right column content. These fields update the JSON used by both SCORM exports.",
				},
			],
			metadata: { insertedFrom: "starter" },
		},
	],
};
