/**
 * src/insertion/element-definitions.js
 *
 * Purpose:
 * Defines the Insert Element library and creates default JSON blocks.
 *
 * Intent:
 * This file is responsible for listing insertable elements, labeling blocks,
 * and creating default block data because the modal needs a data-driven source
 * of truth for content and interaction insertion.
 *
 * Role in the app:
 * - Consumed by src/insertion/insert-dialogs.js to render Insert Element rows.
 * - Used by src/main.js when a user chooses an element to insert.
 * - Used by src/authoring/block-renderers.js to label and icon block chrome.
 *
 * Required fields for each element definition:
 * - type: unique block type stored in pageState.blocks.
 * - icon: D2L tier1 icon name used in the picker and block shell.
 * - title: visible Insert Element label.
 * - description: short explanation shown in the modal.
 */
import { createId } from "../shared/ids.js";

// Insert Element modal options. Keeping this list declarative makes it easy
// to add new D2L-style blocks without editing the modal renderer.
export const elementDefinitions = [
	{
		type: "text",
		icon: "tier1:file-document",
		title: "Text block",
		description: "Add editable paragraph content to the page canvas.",
	},
	{
		type: "heading",
		icon: "tier1:bookmark-hollow",
		title: "Heading block",
		description: "Insert a semantic section heading.",
	},
	{
		type: "image",
		icon: "tier1:file-image",
		title: "Image block",
		description: "Add an image placeholder with editable URL and alt text.",
	},
	{
		type: "callout",
		icon: "tier1:info",
		title: "Callout block",
		description: "Highlight supporting guidance or an author note.",
	},
	{
		type: "accordion",
		icon: "tier1:chevron-down",
		title: "Accordion interaction",
		description: "Insert expandable D2L-style panels.",
	},
	{
		type: "tabs",
		icon: "tier1:style",
		title: "Tabs interaction",
		description: "Create two editable tab panels.",
	},
	{
		type: "flipcard",
		icon: "tier1:reply",
		title: "Flip card interaction",
		description: "Create an editable two-sided card.",
	},
	{
		type: "quiz",
		icon: "tier1:quizzing",
		title: "Quiz question",
		description: "Add a single multiple-choice question.",
	},
	{
		type: "reflection",
		icon: "tier1:file-document",
		title: "Reflection prompt",
		description: "Ask learners to pause and write a response.",
	},
	{
		type: "scenario",
		icon: "tier1:search",
		title: "Scenario card",
		description: "Add a decision-focused scenario prompt.",
	},
	{
		type: "divider",
		icon: "tier1:dragger",
		title: "Divider",
		description: "Separate sections with a simple rule.",
	},
	{
		type: "button",
		icon: "tier1:link",
		title: "Button/link block",
		description: "Add a learner-facing call-to-action link.",
	},
	{
		type: "checklist",
		icon: "tier1:check",
		title: "Checklist interaction",
		description: "Add a short list of learner-facing checklist items.",
	},
	{
		type: "sequencing",
		icon: "tier1:dragger",
		title: "Sequencing interaction",
		description: "Ask learners to match concepts with the correct sequence items.",
	},
	{
		type: "sorting",
		icon: "tier1:sort-type",
		title: "Sorting interaction",
		description: "Ask learners to sort items into the correct categories.",
	},
];

/**
 * Looks up Insert Element metadata by block type.
 *
 * @param {string} type - Block type such as "text", "quiz", or "accordion".
 * @returns {object|undefined} Matching element definition.
 *
 * This function does not mutate data. It supports the authoring UI by keeping
 * labels and D2L icon names centralized in one library.
 */
export function getElementDefinition(type) {
	return elementDefinitions.find((definition) => definition.type === type);
}

/**
 * Returns the label used in the block chrome.
 *
 * @param {object} block - JSON block from pageState.blocks.
 * @returns {string} Human-readable block label.
 *
 * This function supports authoring readability by displaying the correct label
 * for element blocks and layout blocks.
 */
export function getBlockLabel(block) {
	if (block.type === "layout") return block.title || "Layout";
	return getElementDefinition(block.type)?.title || block.type;
}

/**
 * Creates default JSON for a newly inserted non-layout block.
 *
 * @param {string} type - Block type selected in the Insert Element modal.
 * @returns {object} New JSON block ready to push into pageState.blocks.
 *
 * This function supports the insertion workflow by converting a user modal
 * selection into a real editable block with starter content and metadata.
 */
export function createBlock(type) {
	const base = {
		id: createId("block"),
		type,
		metadata: {
			insertedAt: new Date().toISOString(),
			insertedFrom: "Insert Element modal",
		},
	};

	switch (type) {
		case "heading":
			return { ...base, content: "New section heading" };
		case "text":
			return { ...base, content: "Add paragraph text for learners." };
		case "image":
			return {
				...base,
				src: "",
				alt: "Course image placeholder",
				caption: "Image caption",
			};
		case "callout":
			return {
				...base,
				title: "Key point",
				body: "Use this callout for a short reminder, note, or Brightspace-style guidance.",
			};
		case "accordion":
			return {
				...base,
				items: [
					{ title: "Accordion panel 1", body: "Editable accordion content." },
					{ title: "Accordion panel 2", body: "Add supporting detail here." },
				],
				settings: { allowMultipleOpen: true },
			};
		case "tabs":
			return {
				...base,
				items: [
					{ title: "Tab 1", body: "Editable tab content." },
					{ title: "Tab 2", body: "Add related content here." },
				],
				settings: { selectedIndex: 0 },
			};
		case "flipcard":
			return {
				...base,
				front: "Front of card",
				back: "Back of card with the reveal or explanation.",
				settings: { interaction: "click-to-flip" },
			};
		case "quiz":
			return {
				...base,
				question: "Which option best fits this learning check?",
				options: [
					{ text: "Correct option", correct: true },
					{ text: "Distractor option", correct: false },
					{ text: "Distractor option", correct: false },
				],
				feedback: "This feedback appears after the learner checks the answer.",
			};
		case "reflection":
			return {
				...base,
				prompt: "What is one idea you want to apply from this section?",
				guidance:
					"Use this prompt for private reflection or facilitated discussion.",
			};
		case "scenario":
			return {
				...base,
				title: "Scenario",
				situation: "Describe a workplace or learning scenario.",
				prompt: "What should the learner consider before deciding?",
			};
		case "divider":
			return { ...base };
		case "button":
			return {
				...base,
				label: "Open resource",
				url: "https://www.d2l.com/",
				description: "Optional context for the learner-facing link.",
			};
		case "checklist":
			return {
				...base,
				items: [
					{ text: "First checklist item", checked: false },
					{ text: "Second checklist item", checked: false },
					{ text: "Third checklist item", checked: false },
				],
				settings: {
					showProgress: true,
				},
			};
		case "sequencing":
			return {
				...base,
				prompt: "Match each thinking skill with the definition that best describes it.",
				instructions:
					"Drag answers between rows or use each row's dropdown to choose a definition, then check your answers.",
				items: [
					{
						id: createId("seq"),
						label: "Critical Thinking",
						definition:
							"The process of analyzing available facts, evidence, and arguments to reach a reasoned judgment.",
						hint: "judging/evaluating",
						correctMessage:
							"Critical thinking includes judging information before accepting it as true.",
						icon: "tier1:search",
					},
					{
						id: createId("seq"),
						label: "Strategic Thinking",
						definition:
							"A mental process of planning a clear path toward a desired future goal.",
						hint: "plan",
						correctMessage:
							"Strategic thinking focuses on choosing a path that is grounded in reality.",
						icon: "tier1:bullseye",
					},
					{
						id: createId("seq"),
						label: "Creative Thinking",
						definition:
							"The ability to think in a new way and generate original, valuable ideas.",
						hint: "new",
						correctMessage:
							"Creative thinking generates new ideas that can then be refined.",
						icon: "tier1:style",
					},
					{
						id: createId("seq"),
						label: "Problem Solving",
						definition: "The process of finding and choosing the best solution or option.",
						hint: "solution",
						correctMessage:
							"Problem solving uses analysis, option generation, and judgment to choose a solution.",
						icon: "tier1:gear",
					},
				],
			};
		case "sorting": {
			const firstCategoryId = createId("category");
			const secondCategoryId = createId("category");
			return {
				...base,
				prompt:
					"Sort each observable behavior into the category where it belongs.",
				instructions:
					"Drag an item to a category, or select an item and then select a category.",
				categories: [
					{ id: firstCategoryId, title: "Aaron's behaviors" },
					{ id: secondCategoryId, title: "Soraiya's behaviors" },
				],
				items: [
					{
						id: createId("sort"),
						text: "Responds quickly without analyzing the situation carefully.",
						categoryId: firstCategoryId,
						feedbackCorrect:
							"Critical thinking takes time and effort. This behavior shows a rushed judgment.",
						feedbackIncorrect:
							"Look for the category connected to rushing to judgment.",
					},
					{
						id: createId("sort"),
						text: "Takes time to analyze the situation carefully and seek new information.",
						categoryId: secondCategoryId,
						feedbackCorrect:
							"Critical thinking requires careful analysis and seeking better information.",
						feedbackIncorrect:
							"Look for the category connected to deliberate analysis.",
					},
				],
			};
		}
		default:
			return { ...base, content: "New content block" };
	}
}
