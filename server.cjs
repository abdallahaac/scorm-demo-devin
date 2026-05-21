/**
 * server.cjs
 *
 * Purpose:
 * Serves the build-free demo from the local workspace.
 *
 * Intent:
 * This file is responsible for static file serving, MIME types, and path
 * containment because ES modules, CSS imports, the D2L bundle, and exported
 * package source files must be available over HTTP during the demo.
 *
 * Role in the app:
 * - Used by npm run dev.
 * - Serves index.html, app.js, src modules, styles, and brightspace-core-bundle.js.
 * - Keeps server code CommonJS so it works even though browser app modules use
 *   package.json type=module.
 *
 * Data received/exported:
 * - Receives HTTP requests from the browser.
 * - Sends static file responses; exports nothing.
 */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const rootPrefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
const port = Number(process.argv[2] || 5174);

const mimeTypes = {
	".css": "text/css; charset=utf-8",
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".map": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".zip": "application/zip",
};

/**
 * Handles one static-file HTTP request.
 *
 * @param {import("node:http").IncomingMessage} request - Browser request.
 * @param {import("node:http").ServerResponse} response - Response stream.
 * @returns {void}
 *
 * This callback prevents path traversal, resolves the requested file inside the
 * workspace, and serves it with a useful MIME type for browser ES modules.
 */
const server = http.createServer((request, response) => {
	const url = new URL(request.url, `http://${request.headers.host}`);
	const requestedPath = decodeURIComponent(url.pathname);
	const relativePath = requestedPath === "/" ? "index.html" : requestedPath.slice(1);
	const filePath = path.resolve(root, relativePath);

	if (filePath !== root && !filePath.startsWith(rootPrefix)) {
		response.writeHead(403);
		response.end("Forbidden");
		return;
	}

	fs.readFile(filePath, (error, data) => {
		if (error) {
			response.writeHead(404);
			response.end("Not found");
			return;
		}
		response.writeHead(200, {
			"Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
		});
		response.end(data);
	});
});

/**
 * Starts the local static server.
 *
 * @returns {void}
 *
 * This supports the demo workflow by giving the browser an HTTP origin for
 * ES module imports, CSS imports, fetch-based packaging, and D2L bundle loading.
 */
server.listen(port, "127.0.0.1", () => {
	console.log(`D2L SCORM authoring demo running at http://localhost:${port}`);
});
