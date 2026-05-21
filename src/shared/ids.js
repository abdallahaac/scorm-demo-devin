/**
 * src/shared/ids.js
 *
 * Purpose:
 * Creates lightweight ids for demo blocks and layout regions.
 *
 * Intent:
 * This file is responsible for block ids, region ids, and prefix-based id
 * generation because the JSON model needs stable references for editing,
 * reordering, rendering, and export.
 *
 * Role in the app:
 * - Used by element and layout factories when inserting new content.
 * - The generated ids appear in pageState.blocks and data-block-id attributes.
 *
 * Data received/exported:
 * - Receives a prefix such as "block" or "region".
 * - Exports createId().
 */

/**
 * Creates a demo id with a readable prefix and random/time suffix.
 *
 * @param {string} prefix - Prefix that identifies the object type.
 * @returns {string} Generated id.
 *
 * This function does not mutate state. It supports authoring by giving each
 * inserted block and layout region a unique reference.
 */
export const createId = (prefix) =>
	`${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
