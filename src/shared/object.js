/**
 * src/shared/object.js
 *
 * Purpose:
 * Provides a simple clone helper for JSON-compatible demo data.
 *
 * Intent:
 * This file is responsible for cloning page models, default content, and
 * editable package seed data because the app should avoid sharing mutable
 * references between defaults, local state, and exported JSON.
 *
 * Role in the app:
 * - Used by src/state/page-state.js when loading defaultPage or an editable
 *   package seed from window.D2L_AUTHORING_DEMO_PAGE.
 *
 * Data received/exported:
 * - Receives JSON-compatible values.
 * - Exports clone().
 */

/**
 * Deep-clones a JSON-compatible value.
 *
 * @param {*} value - Plain JSON-compatible value.
 * @returns {*} Cloned value.
 *
 * This function does not mutate the input. It supports the state workflow by
 * giving each editing session its own copy of starter or seeded content.
 */
export const clone = (value) => JSON.parse(JSON.stringify(value));
