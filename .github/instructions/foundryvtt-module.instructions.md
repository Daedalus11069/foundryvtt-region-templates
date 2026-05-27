---
description: "Use when writing, extending, or reviewing code for this Foundry VTT module. Covers module structure, Foundry v13 API usage, localisation, HTML rendering, and coding conventions."
applyTo: "*.js"
---

# Foundry VTT Module Conventions

## Module structure

- All code lives in a single `module.js` file — no bundler, no build step, no TypeScript.
- No external npm dependencies. Use only browser-native APIs and the Foundry VTT global (`foundry`, `game`, `canvas`, `ui`, `Hooks`, `CONFIG`).
- Organise the file with clearly labelled ASCII-rule section separators:
  ```js
  // ─────────────────────────────────────────────────────────────────────────────
  // Section Name
  // ─────────────────────────────────────────────────────────────────────────────
  ```
- Order of sections: Constants → Helpers (localisation, escaping, settings, utilities) → CSS constant → UI classes → Hooks → JSDoc typedefs.

## Constants

- Define `MODULE_ID` once as a `const` at the top. Never hardcode the module-id string anywhere else.
- All world-scoped setting keys must be named `SETTING_<NAME>` constants.

## Localisation

- Always call `loc(key, vars)` for any user-visible string — never call `game.i18n.localize()` directly.
- Add every new key to the `EN` fallback table so the module works without a lang file.
- Key format: `MODULENAME.CamelCaseName` (e.g. `REGIONTEMPLATES.SaveTemplate`).
- Variable interpolation uses `{varName}` in the string value; pass `{ varName: value }` as the second argument to `loc()`.

## HTML rendering & security

- Build HTML as template-literal strings inside `_renderHTML`.
- Wrap every dynamic value with `esc(value)` before interpolating it into HTML. No exceptions.
- The `esc()` helper handles `&`, `<`, `>`, `"`, and `'` — use it for both text nodes and attribute values.
- CSS is defined as a single `MODULE_CSS` template-literal constant and injected into `<head>` in the `init` hook. No separate CSS file.

## Foundry v13 API

- UI windows must extend `foundry.applications.api.ApplicationV2`.
- Override `_renderHTML(context, options)` (returns an HTML string) and `_replaceHTML(result, content, options)` (sets `content.innerHTML` and activates listeners).
- Name listener activation methods `_activate<Name>Listeners(html)`.
- Implement the singleton pattern using `foundry.applications.instances.get(appId)` before constructing a new instance.
- Use `foundry.applications.api.DialogV2.confirm()` and `DialogV2.wait()` for confirmation/choice dialogs.
- Clone stored data with `foundry.utils.deepClone()` before mutating it.
- Generate unique ids with `foundry.utils.randomID()`.
- Use `canvas.regions?.controlled`, `canvas.scene?.regions?.contents`, etc. — always use optional chaining on canvas properties.

## Settings

- Register data-storage settings with `config: false` (hidden from the settings UI) and `scope: "world"`.
- Expose a thin helper layer: `getTemplates()`, `saveTemplates()`, `getTemplate(id)`, `upsertTemplate()`, `deleteTemplate()`.

## Hooks

- Use `Hooks.once("init", ...)` for settings registration and stylesheet injection.
- Use `Hooks.once("ready", ...)` to expose the public API on `game.modules.get(MODULE_ID).api`.
- Use `Hooks.on(...)` for repeating or cancellable hooks (e.g. `getSceneControlButtons`, `dropCanvasData`, `renderRegionConfig`).

## Public API

- Expose all stable, macro-friendly functions on `game.modules.get(MODULE_ID).api` in the `ready` hook.
- Each property must have a JSDoc `@param`/`@returns` comment in the `api` object literal.

## JSDoc & types

- Every function that is not a trivial one-liner must have a JSDoc block with `@param` and `@returns` tags.
- Define data shapes as `@typedef` blocks at the bottom of the file.
- Use `{string|null}` and `{Promise<void>}` rather than omitting return types.

## Event binding pattern

- Attach events in `_activate...Listeners(html)` by querying `html.querySelector` / `querySelectorAll`.
- Use `data-action="actionName"` attributes on interactive elements rather than class-based selectors for actions.
- For indexed items (e.g. behavior rows), store the index in `data-idx` and read it with `parseInt(el.dataset.idx, 10)`.

## Notifications

- Informational feedback: `ui.notifications.info(loc(...))`.
- Validation warnings: `ui.notifications.warn(loc(...))`.
- Errors: `ui.notifications.error(loc(...))`.
