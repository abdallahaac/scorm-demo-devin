/**
 * src/learner/runtime.js
 *
 * Purpose:
 * Renders the learner-facing course used by browser preview and production
 * SCORM packages.
 *
 * Intent:
 * This module keeps live preview and exported learner output on the same code
 * path so authors see the course without editor chrome before packaging it.
 */
import { initializeActivityInteractions } from "../authoring/activity-interactions.js";

const courseState = new WeakMap();

const escapeHtml = (value) =>
	String(value ?? "").replace(
		/[&<>"']/g,
		(match) =>
			({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&#039;",
			})[match],
	);

const escapeAttr = escapeHtml;

/**
 * Loads page JSON and renders it into the production course root.
 *
 * @param {object} [options] - Runtime options.
 * @param {HTMLElement} [options.root] - Course mount node.
 * @param {string} [options.pageUrl] - URL for assets/data/page.json.
 * @returns {Promise<void>}
 */
export async function loadProductionCourse({
	root = document.querySelector("#course"),
	pageUrl = "./assets/data/page.json",
} = {}) {
	const response = await fetch(pageUrl);
	if (!response.ok) {
		throw new Error(`Unable to load course JSON: ${response.status}`);
	}
	const pageState = await response.json();
	renderCourse({ root, pageState });
}

/**
 * Renders a complete learner page and wires learner-only interactions.
 *
 * @param {object} options - Render options.
 * @param {HTMLElement} options.root - Course mount node.
 * @param {object} options.pageState - Authored page JSON.
 * @returns {void}
 */
export function renderCourse({ root, pageState }) {
	if (!root || !pageState) return;
	document.title = pageState.title || document.title;
	document.documentElement.lang = pageState.metadata?.locale || "en";
	courseState.set(root, pageState);
	bindCourseEvents(root);
	root.innerHTML = `
		<header class="course-header">
			<div class="course-header__copy">
				<h1>${escapeHtml(pageState.title || "Untitled course")}</h1>
			</div>
		</header>
		<div class="course-content">
			${(pageState.blocks || []).map(renderBlock).join("")}
		</div>
	`;
	initializeActivityInteractions({ pageState, previewMode: true, root });
}

function bindCourseEvents(root) {
	if (root.dataset.courseEventsBound === "true") return;
	root.dataset.courseEventsBound = "true";
	root.addEventListener("click", handleCourseClick);
}

function handleCourseClick(event) {
	const root = event.currentTarget;
	const pageState = courseState.get(root);
	if (!pageState) return;

	const flipCard = event.target.closest("[data-flip-card]");
	if (flipCard && root.contains(flipCard)) {
		const flipped = !flipCard.classList.contains("is-flipped");
		flipCard.classList.toggle("is-flipped", flipped);
		flipCard.setAttribute("aria-pressed", String(flipped));
		return;
	}

	const quizCheck = event.target.closest("[data-quiz-check]");
	if (quizCheck && root.contains(quizCheck)) {
		checkQuizAnswer(quizCheck.closest("[data-quiz-block]"), pageState);
	}
}

function renderBlock(block) {
	switch (block.type) {
		case "heading":
			return renderText(block.content, "h2");
		case "text":
			return renderText(block.content);
		case "callout":
			return renderCallout(block);
		case "image":
			return renderImage(block);
		case "accordion":
			return renderAccordion(block);
		case "tabs":
			return renderTabs(block);
		case "flipcard":
			return renderFlipCard(block);
		case "quiz":
			return renderQuiz(block);
		case "reflection":
			return renderReflection(block);
		case "scenario":
			return renderScenario(block);
		case "layout":
			return renderLayout(block);
		case "divider":
			return '<hr class="course-divider" />';
		case "button":
			return renderButton(block);
		case "checklist":
			return renderChecklist(block);
		case "sequencing":
			return renderSequencing(block);
		case "sorting":
			return renderSorting(block);
		default:
			return renderText(block.content || "");
	}
}

function renderText(value, tag = "p") {
	return `<${tag}>${escapeHtml(value)}</${tag}>`;
}

function renderCallout(block) {
	return `
		<section class="course-callout">
			<h2>${escapeHtml(block.title)}</h2>
			<p>${escapeHtml(block.body)}</p>
		</section>
	`;
}

function renderImage(block) {
	const imageMarkup = block.src
		? `<img src="${escapeAttr(block.src)}" alt="${escapeAttr(block.alt)}" />`
		: '<div class="course-region">Image placeholder</div>';
	return `
		<figure>
			${imageMarkup}
			<figcaption>${escapeHtml(block.caption)}</figcaption>
		</figure>
	`;
}

function renderAccordion(block) {
	return `
		<d2l-collapsible-panel-group>
			${(block.items || [])
				.map(
					(item, index) => `
						<d2l-collapsible-panel panel-title="${escapeAttr(item.title)}" heading-level="3" ${index === 0 ? "expanded" : ""}>
							<p>${escapeHtml(item.body)}</p>
						</d2l-collapsible-panel>
					`,
				)
				.join("")}
		</d2l-collapsible-panel-group>
	`;
}

function renderTabs(block) {
	const tabs = (block.items || [])
		.map(
			(item, index) =>
				`<d2l-tab id="${escapeAttr(block.id)}-tab-${index}" text="${escapeAttr(item.title)}" slot="tabs" ${index === 0 ? "selected" : ""}></d2l-tab>`,
		)
		.join("");
	const panels = (block.items || [])
		.map(
			(item, index) =>
				`<d2l-tab-panel labelled-by="${escapeAttr(block.id)}-tab-${index}" slot="panels"><p>${escapeHtml(item.body)}</p></d2l-tab-panel>`,
		)
		.join("");
	return `<d2l-tabs text="Course tabs">${tabs}${panels}</d2l-tabs>`;
}

function renderFlipCard(block) {
	return `
		<button class="flip-card-button" type="button" data-flip-card aria-pressed="false">
			<span class="front">${escapeHtml(block.front)}</span>
			<span class="back">${escapeHtml(block.back)}</span>
		</button>
	`;
}

function renderQuiz(block) {
	const groupName = `${block.id}-quiz`;
	return `
		<section class="quiz-block" data-quiz-block="${escapeAttr(block.id)}" aria-label="Quiz question">
			<h2>${escapeHtml(block.question)}</h2>
			<ul class="quiz-options">
				${(block.options || [])
					.map(
						(option, index) => `
							<li class="quiz-option">
								<input type="radio" name="${escapeAttr(groupName)}" value="${index}" />
								<span>${escapeHtml(option.text)}</span>
							</li>
						`,
					)
					.join("")}
			</ul>
			<d2l-button data-quiz-check>Check answer</d2l-button>
			<p class="quiz-feedback" data-quiz-feedback role="status" aria-live="polite"></p>
		</section>
	`;
}

function renderReflection(block) {
	return `
		<section class="course-callout reflection-block" aria-label="Reflection prompt">
			<h2>${escapeHtml(block.prompt)}</h2>
			<p>${escapeHtml(block.guidance)}</p>
			<d2l-input-textarea label="Reflection response" rows="4"></d2l-input-textarea>
		</section>
	`;
}

function renderScenario(block) {
	return `
		<section class="course-region">
			<h2>${escapeHtml(block.title)}</h2>
			<p>${escapeHtml(block.situation)}</p>
			<p>${escapeHtml(block.prompt)}</p>
		</section>
	`;
}

function renderLayout(block) {
	return `
		<section class="course-layout" style="--columns:${Number(block.settings?.columns || 1)}">
			${(block.regions || [])
				.map(
					(region) => `
						<div class="course-region" style="grid-column:span ${Number(region.span || 1)}">
							<strong>${escapeHtml(region.role)}</strong>
							<p>${escapeHtml(region.content)}</p>
						</div>
					`,
				)
				.join("")}
		</section>
	`;
}

function renderButton(block) {
	return `
		<p class="course-link-row">
			<a class="course-button" href="${escapeAttr(block.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(block.label)}</a>
			${block.description ? `<span>${escapeHtml(block.description)}</span>` : ""}
		</p>
	`;
}

function renderChecklist(block) {
	return `
		<section class="course-region checklist-block" aria-label="Checklist interaction">
			<ul class="checklist-block__items">
				${(block.items || [])
					.map(
						(item) => `
							<li class="checklist-block__item">
								<input type="checkbox" ${item.checked ? "checked" : ""} />
								<span>${escapeHtml(item.text)}</span>
							</li>
						`,
					)
					.join("")}
			</ul>
		</section>
	`;
}

function renderSequencing(block) {
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

function renderSorting(block) {
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

function checkQuizAnswer(quizRoot, pageState) {
	if (!quizRoot) return;
	const block = (pageState.blocks || []).find(
		(item) => item.id === quizRoot.dataset.quizBlock,
	);
	const feedback = quizRoot.querySelector("[data-quiz-feedback]");
	const checked = quizRoot.querySelector('input[type="radio"]:checked');
	if (!block || !feedback) return;
	if (!checked) {
		feedback.textContent = "Select an answer before checking.";
		return;
	}
	const option = block.options?.[Number(checked.value)];
	feedback.textContent = option?.correct ? "Correct." : block.feedback;
}
