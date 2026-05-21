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
	title: "Creator+ SCORM Authoring Demo",
	metadata: {
		schemaVersion: 1,
		locale: "en",
		source: "D2L Core Library authoring demo",
		lastSaved: null,
	},
	blocks: [
		{
			id: createId("block"),
			type: "heading",
			content: "Build a page from editable JSON blocks",
			metadata: { insertedFrom: "starter" },
		},
		{
			id: createId("block"),
			type: "text",
			content:
				"Use Insert Element or Layouts to add content. Each editable region updates the JSON state and can be saved to localStorage or exported as a SCORM-style package.",
			metadata: { insertedFrom: "starter" },
		},
		{
			id: createId("block"),
			type: "layout",
			layoutType: "image-left-text-right",
			title: "Image left / text right",
			settings: { columns: 2 },
			regions: [
				{
					id: createId("region"),
					role: "Image",
					kind: "media",
					span: 1,
					content: "Image placeholder. Replace this with a course visual or D2L asset reference.",
				},
				{
					id: createId("region"),
					role: "Text",
					kind: "content",
					span: 1,
					content: "Editable panel text. This region is represented as JSON and exported into assets/data/page.json.",
				},
			],
			metadata: { insertedFrom: "starter" },
		},
	],
};
