/**
 * src/insertion/layout-definitions.js
 *
 * Purpose:
 * Defines all layout options shown in the Layouts modal.
 *
 * Intent:
 * This file is responsible for describing layout thumbnails, layout metadata,
 * and default editable regions because layout insertion needs structured JSON
 * that can render on the canvas and export cleanly to SCORM.
 *
 * Role in the app:
 * - Consumed by src/insertion/insert-dialogs.js to render layout options.
 * - Used by src/main.js when a user selects a layout.
 * - Rendered by src/authoring/block-renderers.js as editable region panels.
 *
 * Required fields for each layout definition:
 * - category: section heading in the Layouts modal.
 * - id: unique layoutType stored in the JSON model.
 * - title: visible row title.
 * - description: short row subtitle.
 * - columns: grid column count for thumbnail and canvas rendering.
 * - regions: ordered region definitions with role, optional span, and optional kind.
 */
import { createId } from "../shared/ids.js";

// Layout modal options. Each item defines the thumbnail shape and the JSON
// regions that are inserted into the editable canvas.
export const layoutDefinitions = [
	{
		category: "Basic layouts",
		id: "one-full-width-panel",
		title: "One full-width panel",
		description: "A single region for a focused content block.",
		columns: 1,
		regions: [{ role: "Panel", span: 1 }],
	},
	{
		category: "Basic layouts",
		id: "two-equal-panels",
		title: "Two equal panels",
		description: "Two balanced side-by-side regions.",
		columns: 2,
		regions: [{ role: "Panel 1" }, { role: "Panel 2" }],
	},
	{
		category: "Basic layouts",
		id: "three-equal-panels",
		title: "Three equal panels",
		description: "Three balanced regions for short related content.",
		columns: 3,
		regions: [{ role: "Panel 1" }, { role: "Panel 2" }, { role: "Panel 3" }],
	},
	{
		category: "Basic layouts",
		id: "four-equal-panels",
		title: "Four equal panels",
		description: "Four compact regions for a grid of ideas.",
		columns: 4,
		regions: [
			{ role: "Panel 1" },
			{ role: "Panel 2" },
			{ role: "Panel 3" },
			{ role: "Panel 4" },
		],
	},
	{
		category: "Asymmetrical layouts",
		id: "one-third-two-thirds",
		title: "One third / two thirds",
		description: "A narrow support region beside a wide region.",
		columns: 3,
		regions: [{ role: "One third", span: 1 }, { role: "Two thirds", span: 2 }],
	},
	{
		category: "Asymmetrical layouts",
		id: "two-thirds-one-third",
		title: "Two thirds / one third",
		description: "A wide content region followed by a narrow support region.",
		columns: 3,
		regions: [{ role: "Two thirds", span: 2 }, { role: "One third", span: 1 }],
	},
	{
		category: "Asymmetrical layouts",
		id: "one-quarter-three-quarters",
		title: "One quarter / three quarters",
		description: "A compact sidebar with a large content region.",
		columns: 4,
		regions: [{ role: "One quarter", span: 1 }, { role: "Three quarters", span: 3 }],
	},
	{
		category: "Asymmetrical layouts",
		id: "three-quarters-one-quarter",
		title: "Three quarters / one quarter",
		description: "A large content region with a compact aside.",
		columns: 4,
		regions: [{ role: "Three quarters", span: 3 }, { role: "One quarter", span: 1 }],
	},
	{
		category: "Asymmetrical layouts",
		id: "one-half-two-quarters",
		title: "One half / two quarters",
		description: "One broad region paired with two compact regions.",
		columns: 4,
		regions: [
			{ role: "One half", span: 2 },
			{ role: "Quarter 1", span: 1 },
			{ role: "Quarter 2", span: 1 },
		],
	},
	{
		category: "Asymmetrical layouts",
		id: "two-quarters-one-half",
		title: "Two quarters / one half",
		description: "Two compact regions paired with one broad region.",
		columns: 4,
		regions: [
			{ role: "Quarter 1", span: 1 },
			{ role: "Quarter 2", span: 1 },
			{ role: "One half", span: 2 },
		],
	},
	{
		category: "Stacked layouts",
		id: "two-stacked-rows",
		title: "Two stacked rows",
		description: "Two full-width rows for sequential content.",
		columns: 1,
		regions: [{ role: "Row 1" }, { role: "Row 2" }],
	},
	{
		category: "Stacked layouts",
		id: "three-stacked-rows",
		title: "Three stacked rows",
		description: "Three full-width rows for a short progression.",
		columns: 1,
		regions: [{ role: "Row 1" }, { role: "Row 2" }, { role: "Row 3" }],
	},
	{
		category: "Stacked layouts",
		id: "header-two-columns",
		title: "Header + two columns",
		description: "A full-width heading region with two content columns.",
		columns: 2,
		regions: [
			{ role: "Header", span: 2 },
			{ role: "Column 1" },
			{ role: "Column 2" },
		],
	},
	{
		category: "Stacked layouts",
		id: "header-three-columns",
		title: "Header + three columns",
		description: "A full-width heading region with three content columns.",
		columns: 3,
		regions: [
			{ role: "Header", span: 3 },
			{ role: "Column 1" },
			{ role: "Column 2" },
			{ role: "Column 3" },
		],
	},
	{
		category: "Stacked layouts",
		id: "two-columns-footer",
		title: "Two columns + footer",
		description: "Two columns followed by a full-width closing region.",
		columns: 2,
		regions: [
			{ role: "Column 1" },
			{ role: "Column 2" },
			{ role: "Footer", span: 2 },
		],
	},
	{
		category: "Stacked layouts",
		id: "header-two-columns-footer",
		title: "Header + two columns + footer",
		description: "A complete section scaffold with opening and closing rows.",
		columns: 2,
		regions: [
			{ role: "Header", span: 2 },
			{ role: "Column 1" },
			{ role: "Column 2" },
			{ role: "Footer", span: 2 },
		],
	},
	{
		category: "Content-focused layouts",
		id: "image-left-text-right",
		title: "Image left / text right",
		description: "A visual region beside explanatory text.",
		columns: 2,
		regions: [{ role: "Image", kind: "media" }, { role: "Text" }],
	},
	{
		category: "Content-focused layouts",
		id: "text-left-image-right",
		title: "Text left / image right",
		description: "Explanatory text beside a visual region.",
		columns: 2,
		regions: [{ role: "Text" }, { role: "Image", kind: "media" }],
	},
	{
		category: "Content-focused layouts",
		id: "feature-card-grid",
		title: "Feature card grid",
		description: "Three editable feature regions.",
		columns: 3,
		regions: [
			{ role: "Feature 1" },
			{ role: "Feature 2" },
			{ role: "Feature 3" },
		],
	},
	{
		category: "Content-focused layouts",
		id: "callout-content",
		title: "Callout + content",
		description: "A highlighted note next to main content.",
		columns: 3,
		regions: [{ role: "Callout", kind: "callout" }, { role: "Content", span: 2 }],
	},
	{
		category: "Content-focused layouts",
		id: "sidebar-navigation-content",
		title: "Sidebar navigation + content",
		description: "A narrow navigation rail and editable content area.",
		columns: 4,
		regions: [{ role: "Sidebar", span: 1 }, { role: "Content", span: 3 }],
	},
	{
		category: "Content-focused layouts",
		id: "timeline-row-layout",
		title: "Timeline row layout",
		description: "A date or step region followed by timeline content.",
		columns: 4,
		regions: [{ role: "Step", span: 1 }, { role: "Timeline content", span: 3 }],
	},
	{
		category: "Content-focused layouts",
		id: "comparison-table-layout",
		title: "Comparison table layout",
		description: "Two editable comparison regions.",
		columns: 2,
		regions: [{ role: "Option A" }, { role: "Option B" }],
	},
	{
		category: "Content-focused layouts",
		id: "question-answer-layout",
		title: "Question + answer layout",
		description: "A prompt region with a response or explanation region.",
		columns: 2,
		regions: [{ role: "Question", kind: "callout" }, { role: "Answer" }],
	},
	{
		category: "Interaction layouts",
		id: "accordion-section-layout",
		title: "Accordion section layout",
		description: "A heading region followed by accordion panel placeholders.",
		columns: 2,
		regions: [
			{ role: "Section intro", span: 2 },
			{ role: "Accordion panel 1" },
			{ role: "Accordion panel 2" },
		],
	},
	{
		category: "Interaction layouts",
		id: "tabs-layout",
		title: "Tabs layout",
		description: "A tab introduction with two editable tab panels.",
		columns: 2,
		regions: [{ role: "Tab 1" }, { role: "Tab 2" }],
	},
	{
		category: "Interaction layouts",
		id: "flip-card-grid-layout",
		title: "Flip-card grid layout",
		description: "Three regions arranged like flip-card prompts.",
		columns: 3,
		regions: [{ role: "Card 1" }, { role: "Card 2" }, { role: "Card 3" }],
	},
	{
		category: "Interaction layouts",
		id: "quiz-question-layout",
		title: "Quiz question layout",
		description: "A prompt region and feedback region.",
		columns: 2,
		regions: [{ role: "Question", kind: "callout" }, { role: "Feedback" }],
	},
	{
		category: "Interaction layouts",
		id: "reflection-prompt-layout",
		title: "Reflection prompt layout",
		description: "A full-width prompt with supporting guidance.",
		columns: 3,
		regions: [{ role: "Prompt", span: 2 }, { role: "Guidance", span: 1 }],
	},
	{
		category: "Interaction layouts",
		id: "scenario-card-layout",
		title: "Scenario card layout",
		description: "A scenario setup with decision and feedback regions.",
		columns: 3,
		regions: [
			{ role: "Scenario", span: 1 },
			{ role: "Decision", span: 1 },
			{ role: "Feedback", span: 1 },
		],
	},
];

/**
 * Creates a JSON layout block from a selected layout definition.
 *
 * @param {object} layoutDefinition - Definition selected from layoutDefinitions.
 * @returns {object} New layout block with editable region placeholders.
 *
 * This function supports layout insertion by turning declarative layout config
 * into the pageState.blocks structure consumed by the authoring canvas and exporter.
 */
export function createLayoutBlock(layoutDefinition) {
	return {
		id: createId("block"),
		type: "layout",
		layoutType: layoutDefinition.id,
		title: layoutDefinition.title,
		settings: { columns: layoutDefinition.columns },
		regions: layoutDefinition.regions.map((region, index) => ({
			id: createId("region"),
			role: region.role,
			kind: region.kind || "content",
			span: region.span || 1,
			content: `${region.role} placeholder content. Edit this region on the canvas.`,
			blocks: [],
			order: index + 1,
		})),
		metadata: {
			insertedAt: new Date().toISOString(),
			insertedFrom: "Layouts modal",
		},
	};
}
