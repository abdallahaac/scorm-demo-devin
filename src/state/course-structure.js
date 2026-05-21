/**
 * src/state/course-structure.js
 *
 * Purpose:
 * Provides helpers for SPA and module-based course structure.
 *
 * Intent:
 * This file keeps course mode, module tree traversal, and active content list
 * lookups in one place because the editor can now author either one page or a
 * module/submodule course.
 */
import { createId } from "../shared/ids.js";

/**
 * Creates a module tree node.
 *
 * @param {string} title - Module or submodule title.
 * @param {object} [options={}] - Optional blocks, children, and expanded state.
 * @returns {object} Module node JSON.
 */
export function createModuleNode(title, options = {}) {
	return {
		id: createId("module"),
		title,
		expanded: options.expanded ?? true,
		blocks: options.blocks || [],
		children: options.children || [],
	};
}

/**
 * Creates the default module/submodule outline for a module-based course.
 *
 * @returns {object[]} Default module tree.
 */
export function createDefaultModuleTree() {
	const firstModule = createModuleNode("Module 1: Foundations", {
		expanded: true,
		children: [
			createModuleNode("Lesson 1.1: Overview"),
			createModuleNode("Lesson 1.2: Practice"),
		],
	});
	const secondModule = createModuleNode("Module 2: Apply", {
		expanded: false,
		children: [
			createModuleNode("Lesson 2.1: Scenario"),
			createModuleNode("Lesson 2.2: Knowledge check"),
		],
	});
	return [firstModule, secondModule];
}

/**
 * Returns whether the page is configured as a module-based course.
 *
 * @param {object} pageState - Current course JSON model.
 * @returns {boolean} Whether module course mode is active.
 */
export function isModuleCourse(pageState) {
	return pageState?.metadata?.courseFormat === "module";
}

/**
 * Ensures required course fields exist without discarding existing content.
 *
 * @param {object} pageState - Current course JSON model.
 * @returns {object} The same pageState object after normalization.
 */
export function normalizeCourseState(pageState) {
	pageState.metadata = pageState.metadata || {};
	pageState.blocks = Array.isArray(pageState.blocks) ? pageState.blocks : [];
	pageState.modules = Array.isArray(pageState.modules) ? pageState.modules : [];
	normalizeNestedBlocks(pageState.blocks);
	normalizeModuleNodes(pageState.modules);
	return pageState;
}

/**
 * Ensures module mode has a module tree and a valid active module id.
 *
 * @param {object} pageState - Current course JSON model.
 * @returns {object} Active module node.
 */
export function ensureModuleCourse(pageState) {
	normalizeCourseState(pageState);
	if (!pageState.modules.length) {
		pageState.modules = createDefaultModuleTree();
	}
	normalizeModuleNodes(pageState.modules);
	const modules = flattenModules(pageState.modules);
	if (!modules.some((module) => module.id === pageState.activeModuleId)) {
		pageState.activeModuleId = modules[0]?.id || null;
	}
	return getActiveModule(pageState);
}

/**
 * Returns a flat, display-ordered list of module tree nodes.
 *
 * @param {object[]} modules - Module tree.
 * @returns {object[]} Flat module list.
 */
export function flattenModules(modules = []) {
	const flattened = [];
	const visit = (nodes) => {
		nodes.forEach((node) => {
			flattened.push(node);
			visit(node.children || []);
		});
	};
	visit(modules);
	return flattened;
}

/**
 * Finds a module node by id.
 *
 * @param {object[]} modules - Module tree.
 * @param {string} moduleId - Module id.
 * @returns {object|undefined} Matching module node.
 */
export function findModule(modules = [], moduleId) {
	for (const module of modules) {
		if (module.id === moduleId) return module;
		const child = findModule(module.children || [], moduleId);
		if (child) return child;
	}
	return undefined;
}

/**
 * Returns the active module for module mode.
 *
 * @param {object} pageState - Current course JSON model.
 * @returns {object|undefined} Active module node.
 */
export function getActiveModule(pageState) {
	if (!isModuleCourse(pageState)) return undefined;
	return findModule(pageState.modules || [], pageState.activeModuleId);
}

/**
 * Returns the active root block list for the current course mode.
 *
 * @param {object} pageState - Current course JSON model.
 * @returns {object[]} Active block list.
 */
export function getActiveBlocks(pageState) {
	normalizeCourseState(pageState);
	if (!isModuleCourse(pageState)) return pageState.blocks;
	return ensureModuleCourse(pageState)?.blocks || pageState.blocks;
}

/**
 * Returns previous/next module navigation metadata.
 *
 * @param {object} pageState - Current course JSON model.
 * @returns {{currentIndex: number, total: number, previous: object|undefined, next: object|undefined}}
 */
export function getModuleNeighbors(pageState) {
	const modules = flattenModules(pageState.modules || []);
	const currentIndex = modules.findIndex(
		(module) => module.id === pageState.activeModuleId,
	);
	return {
		currentIndex,
		total: modules.length,
		previous: currentIndex > 0 ? modules[currentIndex - 1] : undefined,
		next:
			currentIndex >= 0 && currentIndex < modules.length - 1
				? modules[currentIndex + 1]
				: undefined,
	};
}

/**
 * Adds a new top-level module.
 *
 * @param {object} pageState - Current course JSON model.
 * @returns {object} New module node.
 */
export function addModule(pageState) {
	ensureModuleCourse(pageState);
	const module = createModuleNode(`Module ${pageState.modules.length + 1}`);
	pageState.modules.push(module);
	pageState.activeModuleId = module.id;
	return module;
}

/**
 * Adds a submodule under a parent module.
 *
 * @param {object} pageState - Current course JSON model.
 * @param {string} parentModuleId - Parent module id.
 * @returns {object|undefined} New submodule node.
 */
export function addSubmodule(pageState, parentModuleId) {
	const parent = findModule(pageState.modules || [], parentModuleId);
	if (!parent) return undefined;
	parent.children = parent.children || [];
	const child = createModuleNode(
		`${parent.title.replace(/:.*$/, "")}.${parent.children.length + 1}`,
	);
	parent.children.push(child);
	parent.expanded = true;
	pageState.activeModuleId = child.id;
	return child;
}

/**
 * Deletes a module or submodule from the tree.
 *
 * @param {object} pageState - Current course JSON model.
 * @param {string} moduleId - Module id to delete.
 * @returns {{deleted: boolean, module?: object, reason?: string}} Deletion result.
 */
export function deleteModule(pageState, moduleId) {
	ensureModuleCourse(pageState);
	const target = findModule(pageState.modules || [], moduleId);
	if (!target) return { deleted: false, reason: "Module not found" };
	if (pageState.modules.length === 1 && pageState.modules[0]?.id === moduleId) {
		return {
			deleted: false,
			reason: "A module-based course needs at least one top-level module.",
		};
	}

	const modulesBefore = flattenModules(pageState.modules || []);
	const targetIds = new Set(flattenModules([target]).map((module) => module.id));
	const targetIndex = modulesBefore.findIndex((module) => module.id === moduleId);
	const remainingModules = modulesBefore.filter((module) => !targetIds.has(module.id));
	const fallback =
		remainingModules[Math.min(targetIndex, remainingModules.length - 1)] ||
		remainingModules[0];

	const deleted = removeModuleFromList(pageState.modules, moduleId);
	if (!deleted) return { deleted: false, reason: "Module not found" };

	if (
		targetIds.has(pageState.activeModuleId) ||
		!findModule(pageState.modules || [], pageState.activeModuleId)
	) {
		pageState.activeModuleId = fallback?.id || null;
	}

	return { deleted: true, module: target };
}

function normalizeModuleNodes(nodes = []) {
	nodes.forEach((node) => {
		node.blocks = Array.isArray(node.blocks) ? node.blocks : [];
		node.children = Array.isArray(node.children) ? node.children : [];
		node.expanded = node.expanded ?? true;
		normalizeNestedBlocks(node.blocks);
		normalizeModuleNodes(node.children);
	});
}

function normalizeNestedBlocks(blocks = []) {
	blocks.forEach((block) => {
		if (block.type !== "layout") return;
		(block.regions || []).forEach((region) => {
			region.blocks = Array.isArray(region.blocks) ? region.blocks : [];
			normalizeNestedBlocks(region.blocks);
		});
	});
}

function removeModuleFromList(nodes = [], moduleId) {
	const index = nodes.findIndex((node) => node.id === moduleId);
	if (index >= 0) {
		nodes.splice(index, 1);
		return true;
	}
	return nodes.some((node) => removeModuleFromList(node.children || [], moduleId));
}
