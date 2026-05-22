# Basic D2L SCORM Demo

Very small presentation demo for the core idea: edit a default page layout, add a few D2L Core components, preview the learner page, and export either an LMS-editable package or a production package. The app is intentionally build-free: browser ES modules, static CSS, and the copied `brightspace-core-bundle.js`.

## Run

```powershell
npm run dev
```

Open `http://localhost:5174`.

## Project Map

```text
index.html                       App shell and D2L bundle loader
app.js                           Small browser entry point
server.cjs                       Static local dev server
brightspace-core-bundle.js        D2L Core component bundle copied from the source repo

src/main.js                      Coordinates state, rendering, events, save, insert, preview, export

src/authoring/
  shell.js                       Top toolbar, editable canvas, JSON side panel, D2L dialogs
  block-renderers.js             JSON-driven block rendering for text, layouts, interactions
  editor-actions.js              Edit, reorder, remove, input update, quiz check helpers

src/insertion/
  element-definitions.js          Insert Element definitions and block factory
  layout-definitions.js           Layout definitions and layout block factory
  insert-dialogs.js               Insert Element and Layouts modal rendering

src/scorm/
  export-dialog.js                Two-option SCORM export modal
  exporter.js                     Builds and downloads JSON/editor/production packages
  package-config.js               Export package labels and file lists
  manifest.js                     imsmanifest.xml generation
  course-runtime-template.js      Production runtime, course CSS, package index templates
  zip.js                          Dependency-free ZIP writer

src/state/
  default-page.js                 Starter JSON content model
  page-state.js                   localStorage load/save and editable-package seed loading

src/shared/
  html.js                         HTML escaping helpers
  ids.js                          Demo ID helper
  object.js                       JSON clone helper

src/ui/
  toast.js                        D2L toast helper

styles.css                       CSS import manifest
styles/base.css                  Global tokens, D2L-aligned typography assumptions, toolbar
styles/authoring/editor.css      Canvas, block, JSON panel, editable region, interaction styling
styles/insertion/modals.css      Insert Element and Layouts modal grids/thumbnails
styles/scorm/export.css          SCORM export option cards and file lists
styles/responsive.css            Responsive layout rules
```

## Main Concepts

Authoring is centered in `src/main.js` and `src/authoring/`. The page is rendered from one JSON model, edited directly on the canvas, saved to `localStorage`, and shown in the JSON side panel.

Element and interaction addition is centered in `src/insertion/`. Definitions are data-first, so adding a block usually means adding a definition and factory case, then rendering support in `block-renderers.js`.

SCORM export is centered in `src/scorm/`. The editable LMS package includes the editor modules and CSS so the imported LMS item can still be changed. The production package includes only the learner runtime, generated course CSS, JSON data, manifest, D2L bundle, and language stub.

For step-by-step instructions on adding a new element, interaction, or layout, see [README_ADDING_ELEMENTS_AND_INTERACTIONS.md](README_ADDING_ELEMENTS_AND_INTERACTIONS.md).

## Part 2 Presentation Walkthrough

### 1. Basic Demo Walkthrough

Use this sequence when presenting the demo:

1. Open `http://localhost:5174`.
2. Edit the page title directly on the canvas.
3. Edit the starter text and the two default layout regions.
4. Click `Add D2L Component`.
5. Add `Collapsible dropdown`, `D2L alert`, or `D2L dropdown menu`.
6. Click `Add Layout`.
7. Insert the `Default page layout`.
8. Edit the placeholder text inside the inserted layout regions.
9. Show the JSON panel updating as edits are made.
10. Click `Save`.
11. Click `Preview` to open the learner view in a new tab.
12. Click `Export SCORM`.
13. Show both export options:
    - `Export editable in LMS`
    - `Export production LMS package`

This demonstrates the core concept: author content, insert a layout and three allowed D2L components, save JSON, preview the learner view, and export SCORM.

### 2a. Authoring Tool Logic

Relevant files:

- `src/main.js`
- `src/authoring/shell.js`
- `src/authoring/block-renderers.js`
- `src/authoring/editor-actions.js`
- `src/state/page-state.js`

How the files work together:

1. `src/main.js` acts as the controller for the demo.
2. `pageState` is the source of truth for the page.
3. `src/authoring/shell.js` renders the toolbar, editable canvas, JSON panel, and dialogs.
4. `src/authoring/block-renderers.js` converts JSON blocks into editable HTML and D2L UI.
5. `src/authoring/editor-actions.js` updates the JSON when the user edits text, reorders blocks, removes blocks, edits inputs, or checks quiz answers.
6. `src/state/page-state.js` loads and saves the page model with `localStorage`.

The important technical idea is that `pageState.blocks` is the content model. The app does not treat arbitrary HTML as the main source of truth; the canvas is rendered from structured JSON.

### 2b. Element and Interaction Library

Relevant files:

- `src/insertion/element-definitions.js`
- `src/insertion/layout-definitions.js`
- `src/insertion/insert-dialogs.js`
- `src/authoring/block-renderers.js`

The demo does not automatically scan the D2L Core Library to discover components. Instead, it defines a tiny controlled authoring library in `src/insertion/element-definitions.js`.

D2L Core provides the UI components used to display and operate those blocks:

- `d2l-dialog` for modals
- `d2l-button` and `d2l-button-subtle` for actions
- `d2l-icon` for icons
- `d2l-collapsible-panel` for the collapsible dropdown
- `d2l-input-text` and `d2l-input-textarea` for form controls
- `d2l-dropdown`, `d2l-dropdown-menu`, `d2l-menu`, and `d2l-menu-item` for the dropdown menu
- `d2l-alert` and `d2l-alert-toast` for feedback

The element insertion flow is:

```text
element-definitions.js
defines available authoring blocks

insert-dialogs.js
renders those blocks in the Insert Element modal

main.js
adds the selected block to pageState.blocks

block-renderers.js
renders the block using D2L components where possible
```

The visible insertable components are `Collapsible dropdown`, `D2L alert`, and `D2L dropdown menu`.

### 2c. Export and Repackaging System

Relevant files:

- `src/scorm/export-dialog.js`
- `src/scorm/exporter.js`
- `src/scorm/package-config.js`
- `src/scorm/manifest.js`
- `src/scorm/course-runtime-template.js`
- `src/scorm/zip.js`

How the export files work together:

1. `src/scorm/export-dialog.js` renders the two export choices.
2. `src/scorm/package-config.js` defines the files included in each package.
3. `src/scorm/exporter.js` gathers the current JSON model and required files.
4. `src/scorm/manifest.js` generates `imsmanifest.xml`.
5. `src/scorm/course-runtime-template.js` generates the production learner runtime, course CSS, and package HTML templates.
6. `src/scorm/zip.js` creates the downloadable ZIP directly in the browser.

The editable LMS package includes:

```text
index.html
imsmanifest.xml
assets/data/page.json
app.js
src/*
styles/*
brightspace-core-bundle.js
lang/en.js
```

This package keeps the authoring tool inside the LMS so reviewers or authors can continue editing after import.

The production package includes:

```text
index.html
imsmanifest.xml
assets/data/page.json
assets/js/runtime.js
assets/css/course.css
brightspace-core-bundle.js
lang/en.js
```

This package removes the authoring interface and gives learners a clean SCORM-style course.

The key technical point is:

```text
Both exports use the same pageState JSON.
The editable export keeps the editor.
The production export renders only the learner experience.
```

## D2L Core Usage

The app uses the copied D2L Core bundle for buttons, dialogs, icons, inputs, alerts, tabs, collapsible panels, loading feedback, and toast feedback.

Fallbacks are limited to the editable canvas shell, layout thumbnails, and picker rows because D2L Core does not provide a dedicated authoring-canvas or layout-picker primitive. Those fallbacks use D2L-style spacing, borders, focus states, and typography assumptions.

## Export Options

- `Export editable in LMS`: keeps editing available after import into an LMS.
- `Export production LMS package`: creates a learner-facing SCORM-style package with authoring removed.

The export is realistic enough for presentation and architecture discussion, but it is not a full LMS certification package.
