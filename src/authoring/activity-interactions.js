/**
 * src/authoring/activity-interactions.js
 *
 * Purpose:
 * Adds learner-facing behavior to sequencing and sorting blocks.
 *
 * Intent:
 * This module is deliberately DOM-scoped and pageState-driven so the editor
 * preview and exported production runtime can share the same interactions.
 */

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

const getMenuItemValue = (element) =>
	element?.getAttribute?.("value") || element?.value || "";

const syncRadioMenuSelection = (menuRoot, selectedValue) => {
	menuRoot?.querySelectorAll("d2l-menu-item-radio").forEach((radio) => {
		const selected = getMenuItemValue(radio) === selectedValue;
		radio.selected = selected;
		if (selected) radio.setAttribute("selected", "");
		else radio.removeAttribute("selected");
		radio.setAttribute("aria-checked", selected ? "true" : "false");
	});
};

const getBlockById = (pageState, blockId, type) =>
	pageState?.blocks?.find(
		(block) => block.id === blockId && block.type === type,
	);

const setHidden = (element, hidden) => {
	element?.classList.toggle("is-hidden", hidden);
};

const normalizeSequencingItems = (block) =>
	(block.items || []).map((item, index) => ({
		id: String(item.id || `${block.id}-seq-${index + 1}`),
		label: item.label || `Item ${index + 1}`,
		definition: item.definition || `Definition ${index + 1}`,
		hint: item.hint || "Review the definition.",
		correctMessage: item.correctMessage || "Correct.",
		icon: item.icon || "tier1:search",
	}));

const getRotatedIds = (items) => {
	const ids = items.map((item) => item.id);
	if (ids.length <= 1) return ids;
	return ids.map((_, index) => ids[(index + 1) % ids.length]);
};

const initSequencingActivity = (activityRoot, block) => {
	if (activityRoot.dataset.initialized === "true") return;
	activityRoot.dataset.initialized = "true";

	const container = activityRoot.querySelector(".seq-container");
	const alert = activityRoot.querySelector("[data-activity-alert]");
	const checkButton = activityRoot.querySelector("[data-seq-check]");
	const resetButton = activityRoot.querySelector("[data-seq-reset]");
	if (!container || !checkButton || !resetButton) return;
	const items = normalizeSequencingItems(block);
	let assignments = getRotatedIds(items);
	let hasChecked = false;

	const getItem = (itemId) => items.find((item) => item.id === itemId);
	const isCorrect = (index) => assignments[index] === items[index]?.id;
	const correctCount = () =>
		items.filter((_, index) => isCorrect(index)).length;

	const showAlert = (type, message) => {
		if (!alert) return;
		alert.dataset.state = type;
		alert.textContent = message;
		alert.classList.add("is-visible");
	};

	const assignItem = (rowIndex, itemId) => {
		if (hasChecked) return;
		const otherIndex = assignments.findIndex(
			(assignedId, index) => assignedId === itemId && index !== rowIndex,
		);
		if (otherIndex >= 0) {
			const currentId = assignments[rowIndex];
			assignments[rowIndex] = itemId;
			assignments[otherIndex] = currentId;
		} else {
			assignments[rowIndex] = itemId;
		}
		render();
	};

	const swapItems = (fromIndex, toIndex) => {
		if (hasChecked || fromIndex === toIndex) return;
		[assignments[fromIndex], assignments[toIndex]] = [
			assignments[toIndex],
			assignments[fromIndex],
		];
		render();
	};

	const render = () => {
		if (!container) return;
		if (!items.length) {
			container.innerHTML = `<p class="activity-empty">Add sequencing items to this block.</p>`;
			return;
		}

		container.innerHTML = items
			.map((item, index) => {
				const assignedItem = getItem(assignments[index]) || items[index];
				const checkedClass = hasChecked
					? isCorrect(index)
						? "is-correct"
						: "is-incorrect"
					: "";
				return `
					<div class="seq-row ${checkedClass}" role="listitem" data-seq-index="${index}">
						<div class="seq-left">
							<div class="left-icon"><d2l-icon icon="${escapeHtml(item.icon)}"></d2l-icon></div>
							<div class="left-label">${escapeHtml(item.label)}</div>
							<div class="dropdown-wrap">
								<d2l-dropdown boundary="viewport">
									<d2l-button-icon
										class="chev-btn d2l-dropdown-opener"
										icon="tier1:chevron-down"
										text="Select definition for ${escapeHtml(item.label)}"
										aria-label="Select definition for ${escapeHtml(item.label)}"
										${hasChecked ? "disabled" : ""}
									></d2l-button-icon>
									<d2l-dropdown-menu
										class="seq-dropdown-menu"
										align="start"
										boundary="viewport"
										max-width="460"
										no-auto-close
										trap-focus
										vertical-offset="4"
									>
										<d2l-menu label="${escapeHtml(item.label)}" data-seq-menu="${index}">
											${items
												.map(
													(option) =>
														`<d2l-menu-item-radio text="${escapeHtml(option.definition)}" value="${escapeHtml(option.id)}" ${option.id === assignedItem.id ? "selected" : ""}></d2l-menu-item-radio>`,
												)
												.join("")}
										</d2l-menu>
										<button type="button" class="seq-dropdown-submit" slot="footer" data-seq-submit="${index}" ${hasChecked ? "disabled" : ""}>Submit</button>
									</d2l-dropdown-menu>
								</d2l-dropdown>
							</div>
						</div>
						<div class="seq-right">
							<div class="answer-card" draggable="${hasChecked ? "false" : "true"}" data-seq-answer="${index}">
								${hasChecked ? "" : `<span class="drag-handle" aria-hidden="true"><d2l-icon icon="tier1:dragger"></d2l-icon></span>`}
								<span class="answer-text">${escapeHtml(assignedItem.definition)}</span>
							</div>
							${
								hasChecked
									? `<div class="seq-feedback ${isCorrect(index) ? "correct" : "incorrect"}">
										<strong>${isCorrect(index) ? "Correct" : "Incorrect"}</strong>
										<span>${escapeHtml(isCorrect(index) ? item.correctMessage : `Hint: ${item.hint}`)}</span>
									</div>`
									: ""
							}
						</div>
					</div>
				`;
			})
			.join("");

		container.querySelectorAll("[data-seq-menu]").forEach((menu) => {
			const rowIndex = Number(menu.dataset.seqMenu);
			let pendingItemId = assignments[rowIndex] || "";
			const dropdownMenu = menu.closest("d2l-dropdown-menu");
			const dropdown = menu.closest("d2l-dropdown");
			const submit = dropdownMenu?.querySelector("[data-seq-submit]");
			const resetPendingSelection = () => {
				pendingItemId = assignments[rowIndex] || "";
				syncRadioMenuSelection(menu, pendingItemId);
			};

			menu.addEventListener("d2l-menu-item-change", (event) => {
				const radio =
					event.target?.closest?.("d2l-menu-item-radio") || event.target;
				if (!menu.contains(radio)) return;
				event.stopPropagation();
				if (!event.detail?.selected) return;
				pendingItemId = getMenuItemValue(radio);
				syncRadioMenuSelection(menu, pendingItemId);
			});
			dropdownMenu?.addEventListener(
				"d2l-dropdown-open",
				resetPendingSelection,
			);
			dropdownMenu?.addEventListener(
				"d2l-dropdown-close",
				resetPendingSelection,
			);
			submit?.addEventListener("click", () => {
				assignItem(rowIndex, pendingItemId);
				if (typeof dropdownMenu?.close === "function") dropdownMenu.close();
				if (dropdown && "opened" in dropdown) dropdown.opened = false;
			});
			resetPendingSelection();
		});

		container.querySelectorAll(".seq-row").forEach((row) => {
			row.addEventListener("dragover", (event) => {
				if (hasChecked) return;
				event.preventDefault();
				row.classList.add("drop-target");
			});
			row.addEventListener("dragleave", () =>
				row.classList.remove("drop-target"),
			);
			row.addEventListener("drop", (event) => {
				event.preventDefault();
				row.classList.remove("drop-target");
				const fromIndex = Number(event.dataTransfer.getData("text/plain"));
				const toIndex = Number(row.dataset.seqIndex);
				if (!Number.isNaN(fromIndex) && !Number.isNaN(toIndex)) {
					swapItems(fromIndex, toIndex);
				}
			});
		});

		container.querySelectorAll("[data-seq-answer]").forEach((answer) => {
			answer.addEventListener("dragstart", (event) => {
				if (hasChecked) return;
				answer.classList.add("dragging");
				event.dataTransfer.effectAllowed = "move";
				event.dataTransfer.setData("text/plain", answer.dataset.seqAnswer);
			});
			answer.addEventListener("dragend", () => {
				answer.classList.remove("dragging");
				container.querySelectorAll(".drop-target").forEach((row) => {
					row.classList.remove("drop-target");
				});
			});
		});
	};

	checkButton?.addEventListener("click", () => {
		hasChecked = true;
		const count = correctCount();
		showAlert(
			count === items.length ? "success" : "warning",
			count === items.length
				? `Nice work. You got ${count} of ${items.length} correct.`
				: `You got ${count} of ${items.length} correct. Try again when ready.`,
		);
		setHidden(checkButton, true);
		setHidden(resetButton, false);
		render();
	});

	resetButton?.addEventListener("click", () => {
		assignments = getRotatedIds(items);
		hasChecked = false;
		alert?.classList.remove("is-visible");
		if (alert) alert.textContent = "";
		setHidden(checkButton, false);
		setHidden(resetButton, true);
		render();
	});

	render();
};

const normalizeSortingConfig = (block) => {
	const categories = (block.categories || []).map((category, index) => ({
		id: String(category.id || `${block.id}-category-${index + 1}`),
		title: category.title || `Category ${index + 1}`,
	}));
	const items = (block.items || []).map((item, index) => ({
		id: String(item.id || `${block.id}-sort-${index + 1}`),
		text: item.text || `Sortable item ${index + 1}`,
		categoryId: String(item.categoryId || categories[0]?.id || ""),
		feedbackCorrect: item.feedbackCorrect || "Correct.",
		feedbackIncorrect: item.feedbackIncorrect || "Try again.",
	}));
	return { categories, items };
};

const initSortingActivity = (activityRoot, block) => {
	if (activityRoot.dataset.initialized === "true") return;
	activityRoot.dataset.initialized = "true";

	const { categories, items } = normalizeSortingConfig(block);
	const categoryGrid = activityRoot.querySelector("[data-sort-categories]");
	const pool = activityRoot.querySelector("[data-sort-pool]");
	const poolList = activityRoot.querySelector(".sort-items-list");
	const live = activityRoot.querySelector("[data-sort-live]");
	const checkButton = activityRoot.querySelector("[data-sort-check]");
	const resetButton = activityRoot.querySelector("[data-sort-reset]");
	if (!categoryGrid || !pool || !poolList || !checkButton || !resetButton)
		return;
	let selected = Object.fromEntries(items.map((item) => [item.id, "pool"]));
	let activeItemId = null;
	let hasChecked = false;

	const getItem = (itemId) => items.find((item) => item.id === itemId);
	const categoryTitle = (categoryId) =>
		categories.find((category) => category.id === categoryId)?.title ||
		"Sortable Items";
	const isCorrect = (itemId) =>
		selected[itemId] === getItem(itemId)?.categoryId;
	const countCorrect = () => items.filter((item) => isCorrect(item.id)).length;
	const announce = (message) => {
		if (live) live.textContent = message;
	};
	const assignedItems = (categoryId) =>
		items.filter((item) => selected[item.id] === categoryId);

	const moveActiveTo = (categoryId) => {
		if (hasChecked || !activeItemId) return;
		const item = getItem(activeItemId);
		selected[activeItemId] = categoryId;
		announce(`Moved ${item?.text || "item"} to ${categoryTitle(categoryId)}.`);
		activeItemId = null;
		render();
	};

	const moveDraggedTo = (itemId, categoryId) => {
		if (hasChecked || !selected[itemId]) return;
		selected[itemId] = categoryId;
		activeItemId = null;
		render();
	};

	const selectItem = (itemId) => {
		if (hasChecked) return;
		const item = getItem(itemId);
		activeItemId = activeItemId === itemId ? null : itemId;
		announce(
			activeItemId
				? `Selected ${item?.text || "item"}. Choose a category.`
				: `Selection cleared for ${item?.text || "item"}.`,
		);
		render();
	};

	const sortableMarkup = (item) => {
		const correct = isCorrect(item.id);
		const checkedClass = hasChecked
			? correct
				? "is-correct"
				: "is-incorrect"
			: "";
		const activeClass = activeItemId === item.id ? "is-selected" : "";
		return `
			<li class="sortable ${activeClass} ${checkedClass}" draggable="${hasChecked ? "false" : "true"}" tabindex="0" role="button" data-sort-item="${escapeHtml(item.id)}">
				${hasChecked ? "" : `<span class="drag-handle" aria-hidden="true"><d2l-icon icon="tier1:dragger"></d2l-icon></span>`}
				<span class="sortable-text">${escapeHtml(item.text)}</span>
				${
					hasChecked
						? `<span class="sortable-feedback"><d2l-icon icon="${correct ? "tier1:check" : "tier1:close-default"}"></d2l-icon><strong>${correct ? "Correct" : "Incorrect"}</strong></span>
							<span class="sortable-feedback-text">${escapeHtml(correct ? item.feedbackCorrect : item.feedbackIncorrect)}</span>`
						: ""
				}
			</li>
		`;
	};

	const attachSortableEvents = (scope) => {
		scope.querySelectorAll("[data-sort-item]").forEach((element) => {
			element.addEventListener("click", (event) => {
				event.stopPropagation();
				selectItem(element.dataset.sortItem);
			});
			element.addEventListener("keydown", (event) => {
				if (event.key !== "Enter" && event.key !== " ") return;
				event.preventDefault();
				selectItem(element.dataset.sortItem);
			});
			element.addEventListener("dragstart", (event) => {
				if (hasChecked) return;
				event.dataTransfer.effectAllowed = "move";
				event.dataTransfer.setData("text/plain", element.dataset.sortItem);
			});
		});
	};

	const attachDropzoneEvents = (dropzone, categoryId) => {
		dropzone.addEventListener("click", (event) => {
			if (event.target.closest("[data-sort-item]")) return;
			moveActiveTo(categoryId);
		});
		dropzone.addEventListener("keydown", (event) => {
			if (event.currentTarget !== event.target) return;
			if (event.key !== "Enter" && event.key !== " ") return;
			event.preventDefault();
			moveActiveTo(categoryId);
		});
		dropzone.addEventListener("dragover", (event) => {
			if (hasChecked) return;
			event.preventDefault();
			dropzone.classList.add("drag-over");
		});
		dropzone.addEventListener("dragleave", () => {
			dropzone.classList.remove("drag-over");
		});
		dropzone.addEventListener("drop", (event) => {
			event.preventDefault();
			dropzone.classList.remove("drag-over");
			moveDraggedTo(event.dataTransfer.getData("text/plain"), categoryId);
		});
	};

	const render = () => {
		if (!categoryGrid || !pool || !poolList) return;
		if (!categories.length || !items.length) {
			categoryGrid.innerHTML = `<p class="activity-empty">Add categories and sortable items to this block.</p>`;
			return;
		}

		activityRoot.classList.toggle("is-checked", hasChecked);
		categoryGrid.innerHTML = categories
			.map((category) => {
				const categoryItems = assignedItems(category.id);
				const expectedTotal = items.filter(
					(item) => item.categoryId === category.id,
				).length;
				return `
					<section class="sort-category">
						<header class="sort-category-header">
							<h3>${escapeHtml(category.title)}</h3>
						</header>
						<div class="sort-category-content ${activeItemId ? "ready-to-drop" : ""}" tabindex="0" data-sort-category="${escapeHtml(category.id)}">
							<p class="category-info">Sortable Items: ${categoryItems.length} / ${expectedTotal}</p>
							<ul class="sort-category-items">${categoryItems.map(sortableMarkup).join("")}</ul>
							<div class="sort-drop-placeholder" aria-hidden="true"><d2l-icon icon="tier1:plus-large-thick"></d2l-icon></div>
						</div>
					</section>
				`;
			})
			.join("");

		const poolItems = assignedItems("pool");
		pool.classList.toggle("ready-to-drop", Boolean(activeItemId));
		pool.classList.toggle("is-empty", poolItems.length === 0);
		poolList.innerHTML = poolItems.map(sortableMarkup).join("");

		categoryGrid
			.querySelectorAll("[data-sort-category]")
			.forEach((dropzone) => {
				attachDropzoneEvents(dropzone, dropzone.dataset.sortCategory);
			});
		attachSortableEvents(categoryGrid);
		attachSortableEvents(pool);
	};

	checkButton?.addEventListener("click", () => {
		hasChecked = true;
		const count = countCorrect();
		announce(`Checked answers. ${count} of ${items.length} correct.`);
		setHidden(checkButton, true);
		setHidden(resetButton, false);
		render();
	});

	resetButton?.addEventListener("click", () => {
		selected = Object.fromEntries(items.map((item) => [item.id, "pool"]));
		activeItemId = null;
		hasChecked = false;
		announce("Sorting activity reset.");
		setHidden(checkButton, false);
		setHidden(resetButton, true);
		render();
	});

	attachDropzoneEvents(pool, "pool");
	render();
};

/**
 * Activates all sequencing and sorting activities in a rendered root.
 *
 * @param {object} options - Init options.
 * @param {object} options.pageState - Current page JSON model.
 * @param {boolean} options.previewMode - Whether learner interactions should run.
 * @param {ParentNode} [options.root=document] - DOM root to scan.
 * @returns {void}
 */
export function initializeActivityInteractions({
	pageState,
	previewMode = false,
	root = document,
} = {}) {
	if (!previewMode) return;

	root
		.querySelectorAll("[data-sequencing-activity]")
		.forEach((activityRoot) => {
			const block = getBlockById(
				pageState,
				activityRoot.dataset.blockId,
				"sequencing",
			);
			if (block) initSequencingActivity(activityRoot, block);
		});

	root.querySelectorAll("[data-sorting-activity]").forEach((activityRoot) => {
		const block = getBlockById(
			pageState,
			activityRoot.dataset.blockId,
			"sorting",
		);
		if (block) initSortingActivity(activityRoot, block);
	});
}
