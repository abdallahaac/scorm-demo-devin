/**
 * src/insertion/layout-definitions.js
 *
 * Defines the single starter layout used by the basic demo.
 */
import { createId } from "../shared/ids.js";

export const layoutDefinitions = [
	{
		category: "Page layout",
		id: "default-page-layout",
		title: "Default page layout",
		description: "A simple two-column editable page section.",
		columns: 2,
		regions: [{ role: "Left content" }, { role: "Right content" }],
	},
];

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
			order: index + 1,
		})),
		metadata: {
			insertedAt: new Date().toISOString(),
			insertedFrom: "Layouts modal",
		},
	};
}
