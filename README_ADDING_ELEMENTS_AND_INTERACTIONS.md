# Adding Elements and Interactions

This guide explains how to add a new item to the `Insert Element` list, how the item becomes editable authoring content, and how it appears in SCORM exports.

Use this when you want to familiarize yourself with the code or add a new authoring block such as a checklist, hotspot, note, timeline, or custom interaction.

## Mental Model

The demo is JSON-driven.

```text
Insert Element modal
  -> creates a block object
  -> pushes it into pageState.blocks
  -> canvas renders the block
  -> edits update the same JSON object
  -> SCORM export packages that JSON
```

The important files are:

```text
src/insertion/element-definitions.js
  Defines the Insert Element list and creates default JSON blocks.

src/insertion/insert-dialogs.js
  Renders the Insert Element modal from elementDefinitions.
  Usually does not need changes when adding a normal element.

src/main.js
  Handles clicks from the Insert Element modal.
  Usually does not need changes because it already calls createBlock(type).

src/authoring/block-renderers.js
  Converts each JSON block into editable authoring UI.
  This is where most new element rendering work happens.

src/authoring/editor-actions.js
  Updates JSON when editable text or D2L inputs change.
  Only change this if your new block has a new nested data shape.

src/scorm/course-runtime-template.js
  Renders the production SCORM learner view.
  Add a production render case for every new block type.

src/scorm/package-config.js
  Lists files included in the editable LMS export.
  Only change this if you add a new source file.

styles/authoring/editor.css
  Canvas and block styling.

styles/insertion/modals.css
  Insert modal styling.

styles/scorm/export.css
  Export modal styling.
```

## How Elements Are Gathered

The demo does not scan the D2L Core Library automatically.

Instead, `src/insertion/element-definitions.js` defines an approved authoring library:

```js
export const elementDefinitions = [
  {
    type: "accordion",
    icon: "tier1:chevron-down",
    title: "Accordion interaction",
    description: "Insert expandable D2L-style panels.",
  },
];
```

`src/insertion/insert-dialogs.js` maps that array into modal rows. Each row gets a `data-insert-element` attribute:

```js
data-insert-element="${definition.type}"
```

`src/main.js` listens for clicks on those rows:

```js
const insertElement = target.closest("[data-insert-element]");
if (insertElement) {
  const block = createBlock(insertElement.dataset.insertElement);
  pageState.blocks.push(block);
  render();
}
```

That means adding a normal element usually starts with `element-definitions.js`, then continues in `block-renderers.js`.

## Add a Simple Element

Example goal: add a `Checklist` interaction.

### 1. Add the item to `elementDefinitions`

Edit `src/insertion/element-definitions.js`.

Add a new object to the `elementDefinitions` array:

```js
{
  type: "checklist",
  icon: "tier1:check",
  title: "Checklist interaction",
  description: "Add a short list of learner-facing checklist items.",
},
```

Required fields:

```text
type
  Unique block type stored in pageState.blocks.

icon
  D2L icon name used in the Insert Element modal and block header.

title
  Visible label shown in the modal and block header.

description
  Short helper text shown in the modal.
```

### 2. Add default JSON in `createBlock`

In the same file, add a `case` inside `createBlock(type)`:

```js
case "checklist":
  return {
    ...base,
    items: [
      { text: "First checklist item", checked: false },
      { text: "Second checklist item", checked: false },
      { text: "Third checklist item", checked: false },
    ],
    settings: {
      showProgress: true,
    },
  };
```

This is the JSON that gets inserted into `pageState.blocks`.

Example resulting block:

```json
{
  "id": "block-123",
  "type": "checklist",
  "items": [
    { "text": "First checklist item", "checked": false }
  ],
  "settings": {
    "showProgress": true
  },
  "metadata": {
    "insertedAt": "2026-05-21T00:00:00.000Z",
    "insertedFrom": "Insert Element modal"
  }
}
```

### 3. Render the block on the canvas

Edit `src/authoring/block-renderers.js`.

Add a case to `renderBlockContent(block, previewMode)`:

```js
case "checklist":
  return renderChecklistBlock(block, previewMode);
```

Then add a renderer function near the other block renderers:

```js
/**
 * Renders an editable checklist interaction.
 *
 * @param {object} block - Checklist block with an items array.
 * @param {boolean} previewMode - Whether learner checkboxes should be interactive.
 * @returns {string} HTML for the checklist.
 */
function renderChecklistBlock(block, previewMode) {
  return `
    <section class="checklist-block" aria-label="Checklist interaction">
      <ul class="checklist-block__items">
        ${block.items.map((item, index) => `
          <li class="checklist-block__item">
            <input type="checkbox" ${item.checked ? "checked" : ""} ${previewMode ? "" : "disabled"} />
            <span
              ${editableAttributes(block, "text", { itemIndex: index }, previewMode)}
              class="editable"
            >${escapeHtml(item.text)}</span>
          </li>
        `).join("")}
      </ul>
    </section>
  `;
}
```

This uses the existing `editableAttributes()` helper so `editor-actions.js` can update `block.items[index].text`.

### 4. Add CSS if the block needs visual styling

Edit `styles/authoring/editor.css`.

Example:

```css
.checklist-block__items {
  display: grid;
  gap: 0.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.checklist-block__item {
  align-items: center;
  display: flex;
  gap: 0.5rem;
}
```

Keep custom CSS minimal. Use D2L-like spacing, borders, and typography. Do not create a separate visual design system.

### 5. Add production SCORM rendering

Edit `src/scorm/course-runtime-template.js`.

Inside the generated `renderBlock(block)` switch in `buildRuntimeJs()`, add:

```js
case "checklist":
  return `<section class="course-region"><ul>${block.items.map((item) => `<li>${escapeHtml(item.text)}</li>`).join("")}</ul></section>`;
```

This ensures the production package shows learner-facing checklist content instead of falling back to raw JSON.

### 6. Test the new item

Run:

```powershell
npm run dev
```

Open:

```text
http://localhost:5174
```

Then verify:

```text
1. Click Insert Element.
2. Confirm Checklist interaction appears.
3. Insert it.
4. Edit checklist item text on the canvas.
5. Confirm the JSON panel updates.
6. Click Save.
7. Open Preview and confirm the learner tab has no editor toolbar.
8. Export both SCORM options.
```

## Add a D2L-Based Interaction

Use D2L Core components when a matching component exists.

For example:

```text
Accordion
  Uses d2l-collapsible-panel-group and d2l-collapsible-panel.

Tabs
  Uses d2l-tabs, d2l-tab, and d2l-tab-panel.

Reflection prompt
  Uses d2l-input-textarea in preview mode.

Image and button blocks
  Use d2l-input-text and d2l-button.
```

If you add an interaction that maps to a D2L component, the pattern is:

```text
1. Define the interaction metadata in element-definitions.js.
2. Create default JSON in createBlock().
3. Render D2L Core components in block-renderers.js.
4. Use contenteditable or D2L inputs for author-editable fields.
5. Add a production runtime case in course-runtime-template.js.
```

Example D2L pattern:

```js
function renderExampleD2LInteraction(block, previewMode) {
  return `
    <d2l-collapsible-panel-group>
      ${block.items.map((item, index) => `
        <d2l-collapsible-panel
          panel-title="${escapeAttr(item.title)}"
          heading-level="3"
          ${index === 0 ? "expanded" : ""}
        >
          <p
            ${editableAttributes(block, "body", { itemIndex: index }, previewMode)}
            class="editable editor-paragraph"
          >${escapeHtml(item.body)}</p>
        </d2l-collapsible-panel>
      `).join("")}
    </d2l-collapsible-panel-group>
  `;
}
```

## Add a Block With D2L Inputs

Some block fields should not use `contenteditable`. Image URL, alt text, and button URL are examples.

Use a D2L input with these data attributes:

```js
<d2l-input-text
  label="Resource URL"
  value="${escapeAttr(block.url)}"
  data-input-field="url"
  data-block-id="${escapeAttr(block.id)}"
></d2l-input-text>
```

`src/main.js` sends input events to `updateInputValue(pageState, input)`.

`src/authoring/editor-actions.js` then updates:

```js
block[input.dataset.inputField] = input.value || "";
```

This works for top-level fields such as:

```text
block.src
block.alt
block.label
block.url
```

If your input needs to edit nested data, add a focused helper in `editor-actions.js`.

## When to Change `editor-actions.js`

You usually do not need to change `editor-actions.js` if your block uses one of the existing shapes:

```text
Top-level field:
  block.content
  block.title
  block.body

Nested interaction item:
  block.items[index].title
  block.items[index].body
  block.items[index].text

Quiz option:
  block.options[index].text

Layout region:
  block.regions[index].content
```

The existing `updateEditableValue()` supports those through data attributes:

```text
data-block-id
data-field
data-item-index
data-option-index
data-region-id
```

Change `editor-actions.js` only if your block introduces a new nested structure, such as:

```json
{
  "type": "hotspot",
  "markers": [
    {
      "label": "Marker 1",
      "x": 20,
      "y": 40
    }
  ]
}
```

In that case, add a small, specific update path rather than rewriting the whole editor.

## Add a Layout Option

Layouts are separate from normal elements.

Edit `src/insertion/layout-definitions.js`.

Add a new object to `layoutDefinitions`:

```js
{
  category: "Content-focused layouts",
  id: "media-caption-stack",
  title: "Media + caption stack",
  description: "A media region followed by a full-width caption region.",
  columns: 1,
  regions: [
    { role: "Media", kind: "media" },
    { role: "Caption", kind: "content" },
  ],
},
```

Required fields:

```text
category
  Section heading in the Layouts modal.

id
  Unique layoutType stored in JSON.

title
  Visible layout row title.

description
  Short subtitle in the modal.

columns
  Grid column count for thumbnails and canvas rendering.

regions
  Editable panels inserted into the layout block.
```

`insert-dialogs.js` automatically renders the new layout row and thumbnail.

`createLayoutBlock(layoutDefinition)` automatically creates editable region JSON.

## If You Add a New Source File

Most additions can stay inside existing files.

If you create a new source file, such as:

```text
src/authoring/checklist-renderer.js
```

then update `src/scorm/package-config.js`:

```js
export const SOURCE_MODULE_FILES = [
  "src/main.js",
  "src/authoring/checklist-renderer.js",
  ...
];
```

Why this matters:

```text
Editable LMS export includes the source files listed in SOURCE_MODULE_FILES.
If a new file is missing from that list, the editable package may fail after import.
```

The production export usually does not include authoring source files. It uses generated files from `course-runtime-template.js`.

## File-by-File Checklist

Use this checklist when adding a new element or interaction:

```text
src/insertion/element-definitions.js
  Add the modal definition.
  Add the createBlock() default JSON case.

src/authoring/block-renderers.js
  Add a renderBlockContent() switch case.
  Add a render function for the new block.
  Use D2L Core components where available.
  Use editableAttributes() for editable text.

src/authoring/editor-actions.js
  Only update if the new block uses a new nested JSON shape.

styles/authoring/editor.css
  Add minimal styling if needed.

src/scorm/course-runtime-template.js
  Add a production renderBlock() case.

src/scorm/package-config.js
  Only update if you added new source files.

README_ADDING_ELEMENTS_AND_INTERACTIONS.md
  Update this guide if the extension pattern changes.
```

## Recommended Block Shape

Use predictable JSON names so the editor and exporter stay easy to explain.

Good:

```json
{
  "id": "block-123",
  "type": "checklist",
  "items": [
    {
      "text": "Review the policy example",
      "checked": false
    }
  ],
  "settings": {
    "showProgress": true
  },
  "metadata": {
    "insertedAt": "2026-05-21T00:00:00.000Z",
    "insertedFrom": "Insert Element modal"
  }
}
```

Avoid:

```json
{
  "type": "custom",
  "html": "<div>Everything in one HTML string</div>"
}
```

The demo is easier to present when content is structured JSON, not opaque HTML.

## D2L Core Rules for New Items

Follow these rules when adding UI:

```text
Use d2l-button for actions.
Use d2l-button-icon for icon-only block controls.
Use d2l-dialog for modals.
Use d2l-icon for modal thumbnails and block labels.
Use d2l-input-text or d2l-input-textarea for form fields.
Use d2l-tabs for tab interactions.
Use d2l-collapsible-panel for accordion interactions.
Use existing typography classes and browser semantic headings.
```

If D2L Core does not have the exact component, create a minimal fallback in the local CSS and keep it visually aligned with the existing demo.

## Final Verification

After adding an element, verify the full workflow:

```text
Authoring:
  New item appears in Insert Element.
  New block inserts into the canvas.
  Text and inputs edit correctly.
  Reorder and delete controls still work.

JSON:
  JSON panel updates after edits.
  Saved page reloads from localStorage.

Preview:
  Preview opens the learner runtime in a new tab.
  Learner-facing behavior still works without authoring controls.

SCORM:
  Download JSON works.
  Editable LMS package exports.
  Production package exports.
  Production package renders the new block.
```
