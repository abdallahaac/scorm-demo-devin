/**
 * src/authoring/editor-actions.js
 *
 * Purpose:
 * Contains the mutation helpers for editable canvas actions.
 *
 * Intent:
 * This file is responsible for finding blocks, updating editable fields, and
 * reordering/removing content because src/main.js needs focused helpers that
 * modify the JSON model without knowing every block shape.
 *
 * Role in the app:
 * - Receives pageState from src/main.js.
 * - Mutates pageState in response to contenteditable changes, D2L input changes,
 *   block movement, block deletion, and quiz checking.
 * - Works with src/authoring/block-renderers.js because rendered data attributes
 *   identify which JSON field should change.
 *
 * Data received/exported:
 * - Receives pageState, block ids, DOM elements, and action names.
 * - Exports small action functions used by the main controller.
 */
import { getBlockLabel } from "../insertion/element-definitions.js";

/**
 * Finds a block in the current page JSON by id.
 *
 * @param {object} pageState - Current page JSON model.
 * @param {string} blockId - Block id from the rendered data-block-id attribute.
 * @returns {object|undefined} The matching block, if present.
 *
 * This helper does not mutate state; it gives other authoring actions a stable
 * way to locate the JSON object that backs a rendered block.
 */
export function findBlock(pageState, blockId) {
	return findBlockEntry(pageState, blockId)?.block;
}

/**
 * Inserts a block inside a layout region.
 *
 * @param {object} pageState - Current page JSON model to mutate.
 * @param {string} parentBlockId - Layout block id that owns the region.
 * @param {string} regionId - Region id that receives the new block.
 * @param {object} block - New block to insert.
 * @returns {boolean} Whether the block was inserted.
 */
export function insertBlockIntoRegion(pageState, parentBlockId, regionId, block) {
	const parentBlock = findBlock(pageState, parentBlockId);
	const region = parentBlock?.regions?.find((item) => item.id === regionId);
	if (!region) return false;
	region.blocks = Array.isArray(region.blocks) ? region.blocks : [];
	region.blocks.push(block);
	return true;
}

/**
 * Updates a text value coming from a contenteditable canvas element.
 *
 * @param {object} pageState - Current page JSON model to mutate.
 * @param {HTMLElement} element - Editable element carrying block/field data attributes.
 * @param {string} value - Text value read from the editable element.
 * @returns {void}
 *
 * This function mutates pageState. It supports authoring by routing generic
 * editable text back into block fields, nested interaction items, quiz options,
 * or layout regions.
 */
export function updateEditableValue(pageState, element, value) {
	const block = findBlock(pageState, element.dataset.blockId);
	if (!block) return;

	const itemIndex = element.dataset.itemIndex;
	const optionIndex = element.dataset.optionIndex;
	const categoryIndex = element.dataset.categoryIndex;
	const regionId = element.dataset.regionId;
	const field = element.dataset.field;

	if (regionId) {
		const region = block.regions?.find((item) => item.id === regionId);
		if (region) region.content = value;
		return;
	}

	if (itemIndex !== undefined && block.items?.[Number(itemIndex)]) {
		block.items[Number(itemIndex)][field] = value;
		return;
	}

	if (optionIndex !== undefined && block.options?.[Number(optionIndex)]) {
		block.options[Number(optionIndex)][field] = value;
		return;
	}

	if (categoryIndex !== undefined && block.categories?.[Number(categoryIndex)]) {
		block.categories[Number(categoryIndex)][field] = value;
		return;
	}

	block[field] = value;
}

/**
 * Updates a block field from a D2L input component.
 *
 * @param {object} pageState - Current page JSON model to mutate.
 * @param {HTMLElement} input - D2L input carrying data-input-field and data-block-id.
 * @returns {void}
 *
 * This function mutates pageState for structured fields such as image URLs,
 * alt text, button labels, and link URLs.
 */
export function updateInputValue(pageState, input) {
	const block = findBlock(pageState, input.dataset.blockId);
	if (!block) return;
	const itemIndex = input.dataset.itemIndex;
	if (itemIndex !== undefined && block.items?.[Number(itemIndex)]) {
		block.items[Number(itemIndex)][input.dataset.inputField] = input.value || "";
		return;
	}
	block[input.dataset.inputField] = input.value || "";
}

/**
 * Updates one nested item field on a block.
 *
 * @param {object} pageState - Current page JSON model to mutate.
 * @param {string} blockId - Block id containing the item.
 * @param {number|string} itemIndex - Index in block.items.
 * @param {string} field - Item field to update.
 * @param {string} value - New field value.
 * @returns {boolean} Whether the update happened.
 */
export function updateBlockItemField(pageState, blockId, itemIndex, field, value) {
	const block = findBlock(pageState, blockId);
	const item = block?.items?.[Number(itemIndex)];
	if (!item) return false;
	item[field] = value;
	return true;
}

/**
 * Moves or deletes a block in pageState.blocks.
 *
 * @param {object} pageState - Current page JSON model to mutate.
 * @param {string} blockId - Id of the block being moved or removed.
 * @param {"up"|"down"|"delete"} action - Requested block action.
 * @returns {{message: string|null}} Optional toast message for the caller.
 *
 * This function mutates block order or removes a block. It supports the
 * authoring workflow by keeping canvas controls and JSON order aligned.
 */
export function updateBlockOrder(pageState, blockId, action) {
	const entry = findBlockEntry(pageState, blockId);
	if (!entry) return { message: null };
	const { list, index } = entry;
	if (index < 0) return { message: null };

	if (action === "delete") {
		const [removed] = list.splice(index, 1);
		return { message: `${getBlockLabel(removed)} removed` };
	}

	if (action === "up" && index > 0) {
		[list[index - 1], list[index]] = [list[index], list[index - 1]];
	}

	if (action === "down" && index < list.length - 1) {
		[list[index + 1], list[index]] = [list[index], list[index + 1]];
	}

	return { message: null };
}

/**
 * Checks the selected answer for a preview-mode quiz block.
 *
 * @param {object} pageState - Current page JSON model.
 * @param {string} blockId - Quiz block id.
 * @returns {void}
 *
 * This function does not mutate pageState; it writes learner-facing feedback
 * into the rendered preview so the interaction can be demonstrated.
 */
export function checkQuizAnswer(pageState, blockId) {
	const block = findBlock(pageState, blockId);
	if (!block) return;
	const article = document.querySelector(`[data-block-id="${CSS.escape(blockId)}"]`);
	const checked = article?.querySelector(`input[type="radio"]:checked`);
	const feedback = document.querySelector(`[data-quiz-feedback="${CSS.escape(blockId)}"]`);
	if (!feedback) return;
	if (!checked) {
		feedback.textContent = "Select an answer before checking.";
		return;
	}
	const option = block.options[Number(checked.value)];
	feedback.textContent = option?.correct ? "Correct." : block.feedback;
}

function findBlockEntry(pageState, blockId) {
	const lists = [pageState.blocks || []];
	collectModuleBlockLists(pageState.modules || [], lists);
	for (const list of lists) {
		const entry = findBlockEntryInList(list, blockId);
		if (entry) return entry;
	}
	return undefined;
}

function findBlockEntryInList(list = [], blockId) {
	for (let index = 0; index < list.length; index += 1) {
		const block = list[index];
		if (block.id === blockId) return { block, list, index };
		if (block.type !== "layout") continue;
		for (const region of block.regions || []) {
			const entry = findBlockEntryInList(region.blocks || [], blockId);
			if (entry) return entry;
		}
	}
	return undefined;
}

function collectModuleBlockLists(nodes = [], lists) {
	nodes.forEach((node) => {
		if (Array.isArray(node.blocks)) lists.push(node.blocks);
		collectModuleBlockLists(node.children || [], lists);
	});
}
