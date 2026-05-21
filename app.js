/**
 * app.js
 *
 * Purpose:
 * Provides the smallest possible browser entry point for the demo.
 *
 * Intent:
 * This file is responsible for locating the app mount node, importing the
 * authoring controller, and starting the demo because the rest of the codebase
 * is organized into focused ES modules under src/.
 *
 * Role in the app:
 * - Runs after index.html loads the D2L Core bundle and CSS.
 * - Passes the #app element into src/main.js.
 * - Keeps startup simple so presentation viewers can immediately find the
 *   real authoring, insertion, and SCORM export logic in the src folders.
 *
 * Data received/exported:
 * - Receives the DOM root from document.querySelector("#app").
 * - Exports nothing; it starts the browser app as a side effect.
 */
import { startAuthoringDemo } from "./src/main.js";

startAuthoringDemo({
	root: document.querySelector("#app"),
});
