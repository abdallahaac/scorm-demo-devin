/**
 * src/shared/html.js
 *
 * Purpose:
 * Provides HTML escaping helpers shared by renderers and export templates.
 *
 * Intent:
 * This file is responsible for escaping text, escaping attributes, and keeping
 * generated markup safe because the demo renders author-entered JSON into both
 * the editor canvas and exported SCORM files.
 *
 * Role in the app:
 * - Used by authoring renderers, insertion dialogs, manifest generation, and
 *   package HTML templates.
 * - Prevents user-editable text from becoming executable markup.
 *
 * Data received/exported:
 * - Receives unknown values and returns escaped strings.
 * - Exports escapeHtml and escapeAttr.
 */

/**
 * Escapes a value for safe HTML text or attribute output.
 *
 * @param {*} value - Value to convert into escaped text.
 * @returns {string} HTML-escaped string.
 *
 * This function does not mutate data. It supports authoring and SCORM export
 * by safely rendering JSON fields into generated HTML.
 */
export const escapeHtml = (value) =>
	String(value ?? "").replace(/[&<>"']/g, (match) => ({
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#039;",
	}[match]));

/**
 * Alias for escaping attribute values.
 *
 * @param {*} value - Value to convert into escaped attribute text.
 * @returns {string} HTML-escaped string.
 *
 * This export keeps call sites readable when templates are building attributes.
 */
export const escapeAttr = escapeHtml;
