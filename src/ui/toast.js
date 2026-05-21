/**
 * src/ui/toast.js
 *
 * Purpose:
 * Centralizes small D2L toast feedback messages.
 *
 * Intent:
 * This file is responsible for toast lookup, toast content, and toast opening
 * because authoring actions, saves, and exports need consistent D2L-style
 * feedback without duplicating DOM code.
 *
 * Role in the app:
 * - Called by src/main.js and src/scorm/exporter.js after user actions.
 * - Uses the d2l-alert-toast element declared in index.html.
 *
 * Data received/exported:
 * - Receives message text and a D2L alert type.
 * - Exports showToast().
 */

/**
 * Shows a D2L toast message.
 *
 * @param {string} message - Message displayed in the toast.
 * @param {"success"|"critical"|"default"|"warning"} [type="success"] - D2L alert type.
 * @returns {void}
 *
 * This function mutates the toast DOM element only. It supports the demo by
 * confirming save, insertion, preview, and export actions.
 */
export function showToast(message, type = "success") {
	const toast = document.querySelector("#toast");
	if (!toast) return;
	toast.type = type;
	toast.textContent = message;
	toast.open = false;
	window.setTimeout(() => {
		toast.open = true;
	}, 0);
}
