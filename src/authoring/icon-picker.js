/**
 * src/authoring/icon-picker.js
 *
 * Purpose:
 * Provides a D2L Tier 1 icon picker for editable interaction fields.
 */
import { TIER1_ICONS } from "../shared/tier1-icons.js";
import { escapeAttr, escapeHtml } from "../shared/html.js";

let dialog;
let activeResolve;
let selectedIcon = null;

function iconLabel(iconName) {
	return iconName.replace(/^tier1:/, "").replace(/-/g, " ");
}

function ensureDialog() {
	if (dialog?.isConnected) return dialog;

	dialog = document.createElement("d2l-dialog");
	dialog.className = "icon-picker-dialog";
	dialog.setAttribute("title-text", "Choose D2L icon");
	dialog.innerHTML = `
		<div class="icon-picker-dialog__body">
			<d2l-input-text label="Search tier1 icons" data-icon-picker-search></d2l-input-text>
			<div class="icon-picker-grid" data-icon-picker-grid></div>
		</div>
		<d2l-button slot="footer" data-icon-picker-cancel>Cancel</d2l-button>
	`;
	document.body.appendChild(dialog);

	dialog.addEventListener("d2l-dialog-close", () => {
		const resolve = activeResolve;
		activeResolve = null;
		resolve?.(selectedIcon);
	});
	dialog.querySelector("[data-icon-picker-cancel]")?.addEventListener("click", () => {
		selectedIcon = null;
		dialog.opened = false;
	});
	dialog.querySelector("[data-icon-picker-search]")?.addEventListener("input", () => {
		renderIconOptions();
	});

	return dialog;
}

function renderIconOptions(currentIcon = dialog?.dataset.currentIcon || "") {
	const grid = dialog.querySelector("[data-icon-picker-grid]");
	const search = dialog.querySelector("[data-icon-picker-search]");
	const filter = String(search?.value || "").trim().toLowerCase();
	const matches = TIER1_ICONS.filter((iconName) =>
		filter ? iconName.toLowerCase().includes(filter) : true,
	);

	if (!matches.length) {
		grid.innerHTML = `<p class="icon-picker-empty">No icons match this search.</p>`;
		return;
	}

	grid.innerHTML = matches
		.map(
			(iconName) => `
				<button
					class="icon-picker-option ${iconName === currentIcon ? "is-selected" : ""}"
					type="button"
					data-icon-picker-choice="${escapeAttr(iconName)}"
					aria-label="Choose ${escapeAttr(iconName)}"
				>
					<d2l-icon icon="${escapeAttr(iconName)}"></d2l-icon>
					<span>${escapeHtml(iconLabel(iconName))}</span>
				</button>
			`,
		)
		.join("");

	grid.querySelectorAll("[data-icon-picker-choice]").forEach((button) => {
		button.addEventListener("click", () => {
			selectedIcon = button.dataset.iconPickerChoice;
			dialog.opened = false;
		});
	});
}

/**
 * Opens the icon picker and resolves with a selected icon, or null.
 *
 * @param {object} options - Picker options.
 * @param {string} [options.currentIcon=""] - Current icon name.
 * @returns {Promise<string|null>} Selected tier1 icon.
 */
export function pickTier1Icon({ currentIcon = "" } = {}) {
	const picker = ensureDialog();
	const search = picker.querySelector("[data-icon-picker-search]");
	selectedIcon = null;
	picker.dataset.currentIcon = currentIcon;
	if (search) search.value = "";
	renderIconOptions(currentIcon);

	return new Promise((resolve) => {
		activeResolve = resolve;
		picker.opened = true;
		window.setTimeout(() => search?.focus(), 0);
	});
}
