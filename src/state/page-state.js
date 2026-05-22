/**
 * src/state/page-state.js
 *
 * Purpose:
 * Loads and saves the JSON page model for the demo.
 *
 * Intent:
 * This file is responsible for storage key selection, page loading, and page
 * saving because the authoring tool needs persistence without a backend and
 * editable SCORM packages need to seed their own local draft.
 *
 * Role in the app:
 * - Called by src/main.js during startup and save actions.
 * - Falls back to src/state/default-page.js when no saved draft exists.
 * - Reads window.D2L_AUTHORING_DEMO_PAGE when the editable LMS export seeds
 *   the page JSON inside an exported package.
 *
 * Data received/exported:
 * - Receives pageState during save.
 * - Exports STORAGE_KEY, loadPageState(), savePageState(), and resetPageState().
 */
import { defaultPage } from "./default-page.js";
import { clone } from "../shared/object.js";

export const STORAGE_KEY = window.D2L_AUTHORING_STORAGE_KEY || "basic-d2l-scorm-demo:page";

/**
 * Loads the current page JSON model.
 *
 * @returns {object} Page JSON model from localStorage, editable package seed, or defaultPage.
 *
 * This function does not mutate the returned object after creation. It supports
 * normal authoring startup and editable LMS package startup.
 */
export function loadPageState() {
	try {
		const stored = window.localStorage.getItem(STORAGE_KEY);
		if (stored) return JSON.parse(stored);
	} catch {
		// Storage can be unavailable in restrictive browser or LMS settings.
	}
	if (window.D2L_AUTHORING_DEMO_PAGE) {
		return clone(window.D2L_AUTHORING_DEMO_PAGE);
	}
	return clone(defaultPage);
}

/**
 * Saves the current page JSON model to localStorage.
 *
 * @param {object} pageState - Current page JSON model.
 * @returns {object} New pageState copy with updated metadata.lastSaved.
 *
 * This function writes to localStorage and returns a new top-level object so
 * src/main.js can re-render the updated last-saved status.
 */
export function savePageState(pageState) {
	const nextState = {
		...pageState,
		metadata: {
			...pageState.metadata,
			lastSaved: new Date().toISOString(),
		},
	};
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
	return nextState;
}

/**
 * Clears the saved draft and returns the starter page JSON.
 *
 * @returns {object} Fresh clone of the default page model.
 *
 * This function resets the editor to the baseline starter content, including
 * metadata.lastSaved, so the next render matches a first-time page load.
 */
export function resetPageState() {
	try {
		window.localStorage.removeItem(STORAGE_KEY);
	} catch {
		// Storage can be unavailable in restrictive browser or LMS settings.
	}
	return clone(defaultPage);
}
