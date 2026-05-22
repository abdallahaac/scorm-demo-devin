/**
 * src/preview.js
 *
 * Purpose:
 * Loads the temporary authoring preview payload and renders the learner page.
 */
import { renderCourse } from "./learner/runtime.js";

const PREVIEW_STORAGE_PREFIX = "d2l-scorm-authoring-demo:preview:";
const root = document.querySelector("#course");

const renderError = () => {
	if (!root) return;
	root.innerHTML = `
		<section class="course-empty">
			<h1>Preview unavailable</h1>
			<p>Return to the editor and open preview again.</p>
		</section>
	`;
};

const getPreviewPage = () => {
	const previewId = new URLSearchParams(window.location.search).get("preview");
	if (!previewId) return null;
	try {
		const stored = window.localStorage.getItem(`${PREVIEW_STORAGE_PREFIX}${previewId}`);
		return stored ? JSON.parse(stored) : null;
	} catch {
		return null;
	}
};

const pageState = getPreviewPage();
if (pageState) {
	renderCourse({ root, pageState });
} else {
	renderError();
}
