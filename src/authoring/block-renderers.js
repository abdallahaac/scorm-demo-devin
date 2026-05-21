/**
 * src/authoring/block-renderers.js
 *
 * Purpose:
 * Converts JSON content blocks into editable authoring markup.
 *
 * Intent:
 * This file is responsible for rendering blocks, interaction previews, and
 * editable data attributes because the canvas needs a single translation layer
 * between pageState JSON and D2L/Core-aligned UI.
 *
 * Role in the app:
 * - Called by src/authoring/shell.js for every block in pageState.blocks.
 * - Uses element definitions to label blocks and choose D2L icons.
 * - Emits data attributes consumed by src/authoring/editor-actions.js.
 * - Uses D2L components for buttons, tabs, accordions, inputs, and text areas
 *   wherever the demo block has an appropriate D2L Core equivalent.
 *
 * Data received/exported:
 * - Receives a block, its index, pageState, and previewMode.
 * - Exports renderBlock(), which returns HTML strings for the canvas.
 */
import { escapeAttr, escapeHtml } from "../shared/html.js";
import {
	getBlockLabel,
	getElementDefinition,
} from "../insertion/element-definitions.js";

/**
 * Builds shared contenteditable and data attributes for editable fields.
 *
 * @param {object} block - JSON block that owns the editable field.
 * @param {string} field - Field name to update on the block or nested item.
 * @param {object} [extra={}] - Extra data attributes such as itemIndex or regionId.
 * @param {boolean} [previewMode=false] - When true, editing attributes are omitted.
 * @returns {string} HTML attribute string used by rendered editable elements.
 *
 * This function does not mutate state. It supports authoring by encoding enough
 * context in markup for editor-actions.js to update the correct JSON field.
 */
function editableAttributes(block, field, extra = {}, previewMode = false) {
	if (previewMode) return "";
	const attrs = [
		'contenteditable="true"',
		'spellcheck="true"',
		'data-editable="true"',
		`data-block-id="${escapeAttr(block.id)}"`,
		`data-field="${escapeAttr(field)}"`,
	];
	Object.entries(extra).forEach(([key, value]) => {
		const dataName = key.replace(
			/[A-Z]/g,
			(letter) => `-${letter.toLowerCase()}`,
		);
		attrs.push(`data-${dataName}="${escapeAttr(value)}"`);
	});
	return attrs.join(" ");
}

/**
 * Renders one authoring block shell plus its type-specific body.
 *
 * @param {object} block - JSON block to render.
 * @param {number} index - Position of the block in pageState.blocks.
 * @param {object[]} siblingBlocks - Block list that contains this block.
 * @param {boolean} previewMode - Whether editing chrome should be hidden.
 * @param {number} [depth=0] - Nested layout depth.
 * @returns {string} HTML for the complete block.
 *
 * This function does not mutate pageState. It supports authoring by pairing a
 * reusable block control header with the specialized content renderer.
 */
export function renderBlock(
	block,
	index,
	siblingBlocks,
	previewMode,
	depth = 0,
) {
	const label = getBlockLabel(block);
	const definition = getElementDefinition(block.type);
	const icon =
		block.type === "layout"
			? "tier1:style"
			: definition?.icon || "tier1:file-document";
	return `
		<article class="content-block ${depth > 0 ? "content-block--nested" : ""}" data-block-id="${escapeAttr(block.id)}" data-depth="${depth}">
			<header class="content-block__header">
				<span class="content-block__label">
					<d2l-icon icon="${icon}"></d2l-icon>
					${escapeHtml(label)}
				</span>
				<div class="block-actions" aria-label="${escapeAttr(label)} block actions">
					<d2l-button-icon text="Move block up" icon="tier1:chevron-up" data-block-action="up" data-block-id="${escapeAttr(block.id)}" ${index === 0 ? "disabled" : ""}></d2l-button-icon>
					<d2l-button-icon text="Move block down" icon="tier1:chevron-down" data-block-action="down" data-block-id="${escapeAttr(block.id)}" ${index === siblingBlocks.length - 1 ? "disabled" : ""}></d2l-button-icon>
					<d2l-button-icon text="Remove block" icon="tier1:delete" data-block-action="delete" data-block-id="${escapeAttr(block.id)}"></d2l-button-icon>
				</div>
			</header>
			<div class="content-block__body">
				${renderBlockContent(block, previewMode, depth)}
			</div>
		</article>
	`;
}

/**
 * Selects the correct renderer for a block type.
 *
 * @param {object} block - JSON block whose type determines the renderer.
 * @param {boolean} previewMode - Whether to render editable or learner-facing content.
 * @param {number} [depth=0] - Nested layout depth.
 * @returns {string} HTML for the block body.
 *
 * This function is the central switchboard for element and interaction
 * rendering, including text, layouts, tabs, accordions, quiz, reflection, and buttons.
 */
function renderBlockContent(block, previewMode, depth = 0) {
	switch (block.type) {
		case "heading":
			return `<h2 ${editableAttributes(block, "content", {}, previewMode)} class="editable editor-heading">${escapeHtml(block.content)}</h2>`;
		case "text":
			return `<p ${editableAttributes(block, "content", {}, previewMode)} class="editable editor-paragraph">${escapeHtml(block.content)}</p>`;
		case "image":
			return renderImageBlock(block, previewMode);
		case "callout":
			return renderCalloutBlock(block, previewMode);
		case "accordion":
			return renderAccordionBlock(block, previewMode);
		case "tabs":
			return renderTabsBlock(block, previewMode);
		case "flipcard":
			return renderFlipCardBlock(block, previewMode);
		case "quiz":
			return renderQuizBlock(block, previewMode);
		case "reflection":
			return renderReflectionBlock(block, previewMode);
		case "scenario":
			return renderScenarioBlock(block, previewMode);
		case "divider":
			return `<hr class="divider-block" />`;
		case "button":
			return renderButtonBlock(block, previewMode);
		case "layout":
			return renderLayoutBlock(block, previewMode, depth);
		case "checklist":
			return renderChecklistBlock(block, previewMode);
		case "sequencing":
			return renderSequencingBlock(block, previewMode);
		case "sorting":
			return renderSortingBlock(block, previewMode);
		default:
			return `<p ${editableAttributes(block, "content", {}, previewMode)} class="editable">${escapeHtml(block.content || "")}</p>`;
	}
}

/**
 * Renders an image placeholder or image URL with editable metadata fields.
 *
 * @param {object} block - Image block with src, alt, and caption fields.
 * @param {boolean} previewMode - Whether D2L input controls should be hidden.
 * @returns {string} HTML for the image block.
 *
 * This function supports authoring by exposing image URL and alt text as
 * structured JSON fields rather than opaque HTML.
 */
function renderImageBlock(block, previewMode) {
	return `
		<figure class="image-block">
			<div class="image-frame">
				${block.src ? `<img src="${escapeAttr(block.src)}" alt="${escapeAttr(block.alt)}" />` : `<d2l-icon icon="tier1:file-image"></d2l-icon><span>No image selected</span>`}
			</div>
			<figcaption ${editableAttributes(block, "caption", {}, previewMode)} class="editable">${escapeHtml(block.caption)}</figcaption>
			${
				previewMode
					? ""
					: `
				<div class="field-grid">
					<d2l-input-text label="Image URL" value="${escapeAttr(block.src)}" data-input-field="src" data-block-id="${escapeAttr(block.id)}"></d2l-input-text>
					<d2l-input-text label="Alt text" value="${escapeAttr(block.alt)}" data-input-field="alt" data-block-id="${escapeAttr(block.id)}"></d2l-input-text>
				</div>
			`
			}
		</figure>
	`;
}

/**
 * Renders a D2L-style callout block.
 *
 * @param {object} block - Callout block with title and body fields.
 * @param {boolean} previewMode - Whether fields should be editable.
 * @returns {string} HTML for the callout.
 *
 * This function supports interaction/content insertion by turning a simple
 * JSON block into an editable highlighted message.
 */
function renderCalloutBlock(block, previewMode) {
	return `
		<section class="callout-block" aria-label="Callout">
			<p ${editableAttributes(block, "title", {}, previewMode)} class="editable callout-block__title">${escapeHtml(block.title)}</p>
			<p ${editableAttributes(block, "body", {}, previewMode)} class="editable editor-paragraph">${escapeHtml(block.body)}</p>
		</section>
	`;
}

/**
 * Renders an accordion interaction using D2L collapsible panels.
 *
 * @param {object} block - Accordion block with an items array.
 * @param {boolean} previewMode - Whether title editor controls should be shown.
 * @returns {string} HTML for D2L accordion panels and optional editors.
 *
 * This function demonstrates how an authoring block maps to D2L Core UI:
 * each item becomes a d2l-collapsible-panel while JSON remains editable.
 */
function renderAccordionBlock(block, previewMode) {
	const panels = block.items
		.map(
			(item, index) => `
		<d2l-collapsible-panel panel-title="${escapeAttr(item.title)}" heading-level="3" ${index === 0 ? "expanded" : ""}>
			<p ${editableAttributes(block, "body", { itemIndex: index }, previewMode)} class="editable editor-paragraph">${escapeHtml(item.body)}</p>
		</d2l-collapsible-panel>
	`,
		)
		.join("");

	const editor = previewMode
		? ""
		: `
		<div class="interaction-editor" aria-label="Accordion title editor">
			${block.items
				.map(
					(item, index) => `
				<div class="interaction-row">
					<span class="layout-region__label">Panel ${index + 1} title</span>
					<div ${editableAttributes(block, "title", { itemIndex: index }, previewMode)} class="editable">${escapeHtml(item.title)}</div>
				</div>
			`,
				)
				.join("")}
		</div>
	`;

	return `<d2l-collapsible-panel-group>${panels}</d2l-collapsible-panel-group>${editor}`;
}

/**
 * Renders a tabs interaction using D2L tabs and tab panels.
 *
 * @param {object} block - Tabs block with an items array.
 * @param {boolean} previewMode - Whether tab label editor controls should be shown.
 * @returns {string} HTML for D2L tabs and optional editors.
 *
 * This function supports interaction insertion by mapping JSON tab items to
 * d2l-tab and d2l-tab-panel components.
 */
function renderTabsBlock(block, previewMode) {
	const tabs = block.items
		.map(
			(item, index) => `
		<d2l-tab id="${escapeAttr(block.id)}-tab-${index}" text="${escapeAttr(item.title)}" slot="tabs" ${index === 0 ? "selected" : ""}></d2l-tab>
	`,
		)
		.join("");
	const panels = block.items
		.map(
			(item, index) => `
		<d2l-tab-panel labelled-by="${escapeAttr(block.id)}-tab-${index}" slot="panels">
			<p ${editableAttributes(block, "body", { itemIndex: index }, previewMode)} class="editable editor-paragraph">${escapeHtml(item.body)}</p>
		</d2l-tab-panel>
	`,
		)
		.join("");
	const editor = previewMode
		? ""
		: `
		<div class="interaction-editor" aria-label="Tab label editor">
			${block.items
				.map(
					(item, index) => `
				<div class="interaction-row">
					<span class="layout-region__label">Tab ${index + 1} label</span>
					<div ${editableAttributes(block, "title", { itemIndex: index }, previewMode)} class="editable">${escapeHtml(item.title)}</div>
				</div>
			`,
				)
				.join("")}
		</div>
	`;

	return `<d2l-tabs text="Editable tab interaction">${tabs}${panels}</d2l-tabs>${editor}`;
}

/**
 * Renders an editable flip card or a clickable preview-mode card.
 *
 * @param {object} block - Flip card block with front and back fields.
 * @param {boolean} previewMode - Whether to show learner click-to-flip behavior.
 * @returns {string} HTML for the flip card.
 *
 * This function supports the demo interaction library with a lightweight
 * custom fallback where D2L Core does not provide a direct flip-card component.
 */
function renderFlipCardBlock(block, previewMode) {
	if (previewMode) {
		return `
			<button class="flip-card-button" type="button" data-flip-preview aria-pressed="false">
				<span class="front">${escapeHtml(block.front)}</span>
				<span class="back">${escapeHtml(block.back)}</span>
			</button>
		`;
	}
	return `
		<div class="flip-card" aria-label="Flip card editor">
			<div class="flip-card__side">
				<span class="layout-region__label">Front</span>
				<div ${editableAttributes(block, "front", {}, previewMode)} class="editable">${escapeHtml(block.front)}</div>
			</div>
			<div class="flip-card__side">
				<span class="layout-region__label">Back</span>
				<div ${editableAttributes(block, "back", {}, previewMode)} class="editable">${escapeHtml(block.back)}</div>
			</div>
		</div>
	`;
}

/**
 * Renders a multiple-choice quiz block.
 *
 * @param {object} block - Quiz block with question, options, and feedback fields.
 * @param {boolean} previewMode - Whether answer checking should be active.
 * @returns {string} HTML for the quiz editor or preview.
 *
 * This function supports interaction insertion by keeping the question and
 * options in JSON while exposing a simple learner preview.
 */
function renderQuizBlock(block, previewMode) {
	const groupName = `${block.id}-quiz`;
	const options = block.options
		.map(
			(option, index) => `
		<li class="quiz-option">
			<input type="radio" name="${escapeAttr(groupName)}" value="${index}" ${previewMode ? "" : "disabled"} />
			<span ${editableAttributes(block, "text", { optionIndex: index }, previewMode)} class="editable">${escapeHtml(option.text)}${option.correct && !previewMode ? " (correct)" : ""}</span>
		</li>
	`,
		)
		.join("");
	return `
		<section aria-label="Quiz question">
			<p ${editableAttributes(block, "question", {}, previewMode)} class="editable editor-heading">${escapeHtml(block.question)}</p>
			<ul class="quiz-options">${options}</ul>
			${previewMode ? `<d2l-button data-quiz-check data-block-id="${escapeAttr(block.id)}">Check answer</d2l-button>` : ""}
			<p class="quiz-feedback" data-quiz-feedback="${escapeAttr(block.id)}">${previewMode ? "" : escapeHtml(block.feedback)}</p>
			${previewMode ? "" : `<p ${editableAttributes(block, "feedback", {}, previewMode)} class="editable editor-paragraph">${escapeHtml(block.feedback)}</p>`}
		</section>
	`;
}

/**
 * Renders a reflection prompt and optional learner response field.
 *
 * @param {object} block - Reflection block with prompt and guidance fields.
 * @param {boolean} previewMode - Whether to show the D2L textarea response input.
 * @returns {string} HTML for the reflection prompt.
 *
 * This function uses D2L input-textarea in preview mode to show how a learner
 * reflection interaction could appear.
 */
function renderReflectionBlock(block, previewMode) {
	return `
		<section class="reflection-block" aria-label="Reflection prompt">
			<p ${editableAttributes(block, "prompt", {}, previewMode)} class="editable editor-heading">${escapeHtml(block.prompt)}</p>
			<p ${editableAttributes(block, "guidance", {}, previewMode)} class="editable editor-paragraph">${escapeHtml(block.guidance)}</p>
			${previewMode ? `<d2l-input-textarea label="Reflection response" rows="4"></d2l-input-textarea>` : ""}
		</section>
	`;
}

/**
 * Renders a scenario card with editable setup and prompt text.
 *
 * @param {object} block - Scenario block with title, situation, and prompt fields.
 * @param {boolean} previewMode - Whether fields should be editable.
 * @returns {string} HTML for the scenario card.
 *
 * This function supports interaction insertion by representing scenario-based
 * learning as structured JSON fields.
 */
function renderScenarioBlock(block, previewMode) {
	return `
		<section class="scenario-block" aria-label="Scenario card">
			<p ${editableAttributes(block, "title", {}, previewMode)} class="editable scenario-block__title">${escapeHtml(block.title)}</p>
			<p ${editableAttributes(block, "situation", {}, previewMode)} class="editable editor-paragraph">${escapeHtml(block.situation)}</p>
			<p ${editableAttributes(block, "prompt", {}, previewMode)} class="editable editor-paragraph">${escapeHtml(block.prompt)}</p>
		</section>
	`;
}

/**
 * Renders a learner-facing button/link block and its editable fields.
 *
 * @param {object} block - Button block with label, url, and description fields.
 * @param {boolean} previewMode - Whether D2L input controls should be hidden.
 * @returns {string} HTML for the button block.
 *
 * This function supports authoring by separating displayed button text, link
 * URL, and explanatory copy into exportable JSON fields.
 */
function renderButtonBlock(block, previewMode) {
	return `
		<div class="button-preview">
			<d2l-button>${escapeHtml(block.label)}</d2l-button>
			<span ${editableAttributes(block, "description", {}, previewMode)} class="editable">${escapeHtml(block.description)}</span>
		</div>
		${
			previewMode
				? ""
				: `
			<div class="field-grid">
				<d2l-input-text label="Button label" value="${escapeAttr(block.label)}" data-input-field="label" data-block-id="${escapeAttr(block.id)}"></d2l-input-text>
				<d2l-input-text label="Link URL" value="${escapeAttr(block.url)}" data-input-field="url" data-block-id="${escapeAttr(block.id)}"></d2l-input-text>
			</div>
		`
		}
	`;
}

/**
 * Renders an inserted layout block as editable regions.
 *
 * @param {object} block - Layout block with layoutType, settings, and regions.
 * @param {boolean} previewMode - Whether regions should be editable.
 * @param {number} [depth=0] - Nested layout depth.
 * @returns {string} HTML for the layout grid.
 *
 * This function supports layout insertion by turning layout definition regions
 * into editable JSON-backed panels on the canvas.
 */
function renderLayoutBlock(block, previewMode, depth = 0) {
	return `
		<section aria-label="${escapeAttr(block.title)}">
			<div class="layout-grid" style="--layout-columns: ${Number(block.settings?.columns || 1)}" data-layout-type="${escapeAttr(block.layoutType)}">
				${block.regions
					.map(
						(region) => `
					<div class="layout-region" data-role="${escapeAttr(region.role.toLowerCase())}" data-span="${escapeAttr(region.span || 1)}">
						<div class="layout-region__header">
							<span class="layout-region__label">${escapeHtml(region.role)}</span>
							${
								previewMode
									? ""
									: `
								<div class="layout-region__actions" aria-label="${escapeAttr(region.role)} insertion actions">
									<d2l-button-subtle text="Element" icon="tier1:add" data-region-insert-element data-block-id="${escapeAttr(block.id)}" data-region-id="${escapeAttr(region.id)}"></d2l-button-subtle>
									<d2l-button-subtle text="Sub layout" icon="tier1:style" data-region-insert-layout data-block-id="${escapeAttr(block.id)}" data-region-id="${escapeAttr(region.id)}"></d2l-button-subtle>
								</div>
							`
							}
						</div>
						<div ${editableAttributes(block, "content", { regionId: region.id }, previewMode)} class="editable">${escapeHtml(region.content)}</div>
						${
							(region.blocks || []).length
								? `
							<div class="nested-blocks" aria-label="${escapeAttr(region.role)} nested blocks">
								${region.blocks
									.map((nestedBlock, nestedIndex) =>
										renderBlock(
											nestedBlock,
											nestedIndex,
											region.blocks || [],
											previewMode,
											depth + 1,
										),
									)
									.join("")}
							</div>
						`
								: previewMode
									? ""
									: `<p class="layout-region__empty">Add elements, interactions, or sub layouts here.</p>`
						}
					</div>
				`,
					)
					.join("")}
			</div>
		</section>
	`;
}

/**
 * Renders an editable checklist interaction.
 *
 * @param {object} block - Checklist block with an items array.
 * @param {boolean} previewMode - Whether learner checkboxes should be interactive.
 * @returns {string} HTML for the checklist.
 */
function renderChecklistBlock(block, previewMode) {
	return `
    <section class="checklist-block" aria-label="Checklist interaction">
      <ul class="checklist-block__items">
        ${block.items
					.map(
						(item, index) => `
          <li class="checklist-block__item">
            <input type="checkbox" ${item.checked ? "checked" : ""} ${previewMode ? "" : "disabled"} />
            <span
              ${editableAttributes(block, "text", { itemIndex: index }, previewMode)}
              class="editable"
            >${escapeHtml(item.text)}</span>
          </li>
        `,
					)
					.join("")}
      </ul>
    </section>
  `;
}

/**
 * Renders the sequencing interaction editor or preview host.
 *
 * @param {object} block - Sequencing block with prompt, instructions, and items.
 * @param {boolean} previewMode - Whether learner interaction should be active.
 * @returns {string} HTML for the sequencing block.
 */
function renderSequencingBlock(block, previewMode) {
	if (previewMode) {
		return `
			<section class="sequencing-activity" data-sequencing-activity data-block-id="${escapeAttr(block.id)}" aria-label="Sequencing interaction">
				<div class="activity-copy">
					<h2>${escapeHtml(block.prompt || "Sequencing activity")}</h2>
					<p>${escapeHtml(block.instructions || "Match each item with the correct answer.")}</p>
				</div>
				<div class="seq-container" role="list"></div>
				<div class="activity-alert" data-activity-alert role="status" aria-live="polite"></div>
				<div class="activity-actions">
					<d2l-button data-seq-check primary>Check answers</d2l-button>
					<d2l-button data-seq-reset class="is-hidden">Try again</d2l-button>
				</div>
			</section>
		`;
	}

	return `
		<section class="activity-authoring" aria-label="Sequencing interaction editor">
			<div class="activity-copy">
				<h2 ${editableAttributes(block, "prompt", {}, previewMode)} class="editable editor-heading">${escapeHtml(block.prompt)}</h2>
				<p ${editableAttributes(block, "instructions", {}, previewMode)} class="editable editor-paragraph">${escapeHtml(block.instructions)}</p>
			</div>
			<div class="interaction-editor">
				${(block.items || [])
					.map(
						(item, index) => `
					<div class="interaction-row activity-editor-row">
						<span class="layout-region__label">Sequence item ${index + 1}</span>
						<label class="activity-editor-field">
							<span>Label</span>
							<div ${editableAttributes(block, "label", { itemIndex: index }, previewMode)} class="editable">${escapeHtml(item.label)}</div>
						</label>
						<label class="activity-editor-field">
							<span>Definition</span>
							<div ${editableAttributes(block, "definition", { itemIndex: index }, previewMode)} class="editable">${escapeHtml(item.definition)}</div>
						</label>
						<label class="activity-editor-field">
							<span>Hint</span>
							<div ${editableAttributes(block, "hint", { itemIndex: index }, previewMode)} class="editable">${escapeHtml(item.hint)}</div>
						</label>
						<label class="activity-editor-field">
							<span>Correct feedback</span>
							<div ${editableAttributes(block, "correctMessage", { itemIndex: index }, previewMode)} class="editable">${escapeHtml(item.correctMessage)}</div>
						</label>
						<label class="activity-editor-field">
							<span>D2L icon</span>
							<button
								class="icon-picker-trigger"
								type="button"
								data-icon-picker
								data-block-id="${escapeAttr(block.id)}"
								data-item-index="${index}"
								data-current-icon="${escapeAttr(item.icon || "tier1:search")}"
							>
								<span class="icon-picker-trigger__preview" aria-hidden="true">
									<d2l-icon icon="${escapeAttr(item.icon || "tier1:search")}"></d2l-icon>
								</span>
								<span class="icon-picker-trigger__name">${escapeHtml(item.icon || "tier1:search")}</span>
								<span class="icon-picker-trigger__action">Choose icon</span>
							</button>
						</label>
					</div>
				`,
					)
					.join("")}
			</div>
		</section>
	`;
}

/**
 * Renders the sorting interaction editor or preview host.
 *
 * @param {object} block - Sorting block with categories and sortable items.
 * @param {boolean} previewMode - Whether learner interaction should be active.
 * @returns {string} HTML for the sorting block.
 */
function renderSortingBlock(block, previewMode) {
	const categories = block.categories || [];
	if (previewMode) {
		return `
			<section class="sorting-activity" data-sorting-activity data-block-id="${escapeAttr(block.id)}" aria-label="Sorting interaction">
				<div class="activity-copy">
					<h2>${escapeHtml(block.prompt || "Sorting activity")}</h2>
					<p>${escapeHtml(block.instructions || "Sort each item into the correct category.")}</p>
				</div>
				<div class="sort-category-grid" data-sort-categories></div>
				<section class="sort-pool" aria-label="Sortable items">
					<h3 class="section-title">Sortable Items</h3>
					<div class="sort-items-dropzone" data-sort-pool tabindex="0">
						<ul class="sort-items-list"></ul>
						<div class="sort-drop-placeholder" aria-hidden="true"><d2l-icon icon="tier1:plus-large-thick"></d2l-icon></div>
					</div>
				</section>
				<p class="sr-only" data-sort-live aria-live="polite"></p>
				<div class="activity-actions" data-sort-actions>
					<d2l-button data-sort-check primary>Check answers</d2l-button>
					<d2l-button data-sort-reset class="is-hidden">Try again</d2l-button>
				</div>
			</section>
		`;
	}

	return `
		<section class="activity-authoring" aria-label="Sorting interaction editor">
			<div class="activity-copy">
				<h2 ${editableAttributes(block, "prompt", {}, previewMode)} class="editable editor-heading">${escapeHtml(block.prompt)}</h2>
				<p ${editableAttributes(block, "instructions", {}, previewMode)} class="editable editor-paragraph">${escapeHtml(block.instructions)}</p>
			</div>
			<div class="interaction-editor">
				<div class="activity-editor-section">
					<span class="layout-region__label">Categories</span>
					${categories
						.map(
							(category, index) => `
						<label class="activity-editor-field">
							<span>Category ${index + 1}</span>
							<div ${editableAttributes(block, "title", { categoryIndex: index }, previewMode)} class="editable">${escapeHtml(category.title)}</div>
						</label>
					`,
						)
						.join("")}
				</div>
				<div class="activity-editor-section">
					<span class="layout-region__label">Sortable items</span>
					${(block.items || [])
						.map(
							(item, index) => `
						<div class="interaction-row activity-editor-row">
							<label class="activity-editor-field">
								<span>Item text</span>
								<div ${editableAttributes(block, "text", { itemIndex: index }, previewMode)} class="editable">${escapeHtml(item.text)}</div>
							</label>
							<label class="activity-editor-field">
								<span>Correct category</span>
								<select data-input-field="categoryId" data-block-id="${escapeAttr(block.id)}" data-item-index="${index}">
									${categories
										.map(
											(category) =>
												`<option value="${escapeAttr(category.id)}" ${item.categoryId === category.id ? "selected" : ""}>${escapeHtml(category.title)}</option>`,
										)
										.join("")}
								</select>
							</label>
							<label class="activity-editor-field">
								<span>Correct feedback</span>
								<div ${editableAttributes(block, "feedbackCorrect", { itemIndex: index }, previewMode)} class="editable">${escapeHtml(item.feedbackCorrect)}</div>
							</label>
							<label class="activity-editor-field">
								<span>Incorrect feedback</span>
								<div ${editableAttributes(block, "feedbackIncorrect", { itemIndex: index }, previewMode)} class="editable">${escapeHtml(item.feedbackIncorrect)}</div>
							</label>
						</div>
					`,
						)
						.join("")}
				</div>
			</div>
		</section>
	`;
}
