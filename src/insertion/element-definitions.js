/**
 * src/insertion/element-definitions.js
 *
 * Defines the three D2L components that can be added in the basic demo.
 */
import { createId } from "../shared/ids.js";

export const elementDefinitions = [
	{
		type: "collapsible",
		icon: "tier1:chevron-down",
		title: "Collapsible dropdown",
		description: "Add a D2L collapsible panel with editable title and body text.",
	},
	{
		type: "alert",
		icon: "tier1:info",
		title: "D2L alert",
		description: "Add an editable d2l-alert message.",
	},
	{
		type: "dropdown-menu",
		icon: "tier1:more",
		title: "D2L dropdown menu",
		description: "Add an editable d2l-dropdown with menu items.",
	},
];

export function getElementDefinition(type) {
	return elementDefinitions.find((definition) => definition.type === type);
}

export function getBlockLabel(block) {
	if (block.type === "layout") return block.title || "Layout";
	return getElementDefinition(block.type)?.title || block.type;
}

export function createBlock(type) {
	const base = {
		id: createId("block"),
		type,
		metadata: {
			insertedAt: new Date().toISOString(),
			insertedFrom: "Add D2L Component modal",
		},
	};

	switch (type) {
		case "collapsible":
			return {
				...base,
				items: [
					{
						title: "Expandable topic",
						body: "This content appears when the learner opens the collapsible panel.",
					},
				],
				settings: { allowMultipleOpen: false },
			};
		case "alert":
			return {
				...base,
				alertType: "default",
				title: "D2L alert",
				body: "Use this alert for a short learner-facing note.",
			};
		case "dropdown-menu":
			return {
				...base,
				label: "Open menu",
				items: [
					{ text: "First menu option" },
					{ text: "Second menu option" },
					{ text: "Third menu option" },
				],
			};
		default:
			return { ...base, content: "New content block" };
	}
}
