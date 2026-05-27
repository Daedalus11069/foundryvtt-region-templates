/**
 * foundryvtt-template-regions
 *
 * A Foundry VTT v13 module for saving and applying Region Behavior templates.
 *
 * A "Region Template" is a named set of RegionBehavior definitions.  Templates
 * live in world settings (not tied to any Scene), so they are fully portable:
 * they can be exported to JSON and re-imported in any world.
 *
 * Key features
 * ───────────────────────────────────────────────────────
 *  - Template index  → compendium-like browser window (scene-controls toolbar)
 *  - Template editor → create / edit templates; add behaviors by type or by
 *                      capturing them from a currently-selected Region
 *  - Drag & drop    → drag a template card from the index onto the canvas and
 *                      it will be applied to the nearest / controlled Region
 *  - Apply via API  → game.modules.get("region-templates").api.applyTemplateToRegion()
 *  - Export / Import → single JSON file, world-agnostic
 *  - RegionConfig badge → "Save as Template" button inside the Region sheet
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MODULE_ID = "region-templates";
const SETTING_TEMPLATES = "templates";

// ─────────────────────────────────────────────────────────────────────────────
// Localisation helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Localise a key, with variable substitution.
 *
 * @param {string} key            - Translation key
 * @param {Record<string,string>} [vars] - Optional substitution variables
 * @returns {string}
 */
function loc(key, vars) {
  return vars ? game.i18n.format(key, vars) : game.i18n.localize(key);
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML escaping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Escape a string for safe insertion inside HTML attribute values or text nodes.
 * @param {unknown} value
 * @returns {string}
 */
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return all saved region templates.
 * @returns {RegionTemplate[]}
 */
function getTemplates() {
  return game.settings.get(MODULE_ID, SETTING_TEMPLATES) ?? [];
}

/**
 * Overwrite the full templates array in settings.
 * @param {RegionTemplate[]} templates
 * @returns {Promise<void>}
 */
async function saveTemplates(templates) {
  await game.settings.set(MODULE_ID, SETTING_TEMPLATES, templates);
}

/**
 * Find a single template by its id.
 * @param {string} id
 * @returns {RegionTemplate|null}
 */
function getTemplate(id) {
  return getTemplates().find(t => t.id === id) ?? null;
}

/**
 * Create or replace a template (matched by id).
 * @param {RegionTemplate} template
 * @returns {Promise<void>}
 */
async function upsertTemplate(template) {
  const all = getTemplates();
  const idx = all.findIndex(t => t.id === template.id);
  if (idx >= 0) all[idx] = template;
  else all.push(template);
  await saveTemplates(all);
}

/**
 * Permanently remove a template by id.
 * @param {string} id
 * @returns {Promise<void>}
 */
async function deleteTemplate(id) {
  await saveTemplates(getTemplates().filter(t => t.id !== id));
}

// ─────────────────────────────────────────────────────────────────────────────
// Region / Behavior utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve a human-readable label for a RegionBehavior type.
 * @param {string} type
 * @returns {string}
 */
function getBehaviorTypeLabel(type) {
  const cls = CONFIG.RegionBehavior?.dataModels?.[type];
  if (cls?.metadata?.label) {
    const t = game.i18n.localize(cls.metadata.label);
    if (t !== cls.metadata.label) return t;
  }
  return type;
}

/**
 * Return an alphabetically-sorted list of all registered RegionBehavior types.
 * @returns {{ type: string, label: string }[]}
 */
function listBehaviorTypes() {
  return Object.keys(CONFIG.RegionBehavior?.dataModels ?? {})
    .map(type => ({ type, label: getBehaviorTypeLabel(type) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Serialize an existing Region's behaviors into the storable format used by
 * this module.
 *
 * @param {RegionDocument} regionDoc
 * @returns {BehaviorData[]}
 */
function captureBehaviorsFromRegion(regionDoc) {
  return [...regionDoc.behaviors].map(b => ({
    type: b.type,
    name: b.name,
    disabled: b.disabled ?? false,
    system: foundry.utils.deepClone(b.toObject().system ?? {})
  }));
}

/**
 * Apply a template to a RegionDocument by creating its behaviors as embedded
 * documents.  Any behaviors the Region already has are left untouched.
 *
 * @param {RegionTemplate}  template
 * @param {RegionDocument}  regionDoc
 * @returns {Promise<void>}
 */
async function applyTemplateToRegion(template, regionDoc) {
  const behaviorData = template.behaviors.map(b => ({
    type: b.type,
    name: b.name,
    disabled: b.disabled ?? false,
    system: foundry.utils.deepClone(b.system ?? {})
  }));
  await regionDoc.createEmbeddedDocuments("RegionBehavior", behaviorData);
  ui.notifications.info(
    loc("REGIONTEMPLATES.Applied", {
      name: template.name,
      region: regionDoc.name
    })
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Minimal stylesheet  (injected on init so no separate CSS file is required)
// ─────────────────────────────────────────────────────────────────────────────

const MODULE_CSS = /* css */ `
/* ── Region Templates module ── */

/* Index window */
.region-template-index-inner {
  display: flex; flex-direction: column; height: 100%; overflow: hidden;
}
.index-header {
  display: flex; align-items: center; gap: 6px;
  padding: 6px; border-bottom: 1px solid var(--color-border-light-tertiary, #ccc);
  flex: 0 0 auto;
}
.template-search { flex: 1 1 auto; }

.region-template-list {
  list-style: none; margin: 0; padding: 2px 0;
  flex: 1 1 auto; overflow-y: auto;
}
.region-template-list .empty {
  padding: 12px; text-align: center; color: var(--color-text-light-6, #888);
  font-style: italic;
}
.region-template-row {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 10px;
  border-bottom: 1px solid var(--color-border-light-tertiary, #e0e0e0);
  cursor: grab;
}
.region-template-row:hover { background: rgba(0,0,0,0.04); }
.template-icon { color: var(--color-text-light-5, #888); pointer-events: none; }
.template-name { flex: 1 1 auto; font-weight: 600; }
.behavior-count-badge {
  background: var(--color-border-dark, #999); color: #fff;
  border-radius: 3px; padding: 0 5px; font-size: 0.78em; flex: 0 0 auto;
}
.template-controls { display: flex; gap: 4px; flex: 0 0 auto; }
.template-controls .icon { padding: 2px 4px; cursor: pointer; }
.template-controls .icon:hover { color: var(--color-level-warning, #c50); }
.template-controls .icon[data-action="delete"]:hover { color: var(--color-level-error, #c00); }

.index-footer {
  display: flex; gap: 6px;
  padding: 6px; border-top: 1px solid var(--color-border-light-tertiary, #ccc);
  flex: 0 0 auto;
}
.index-footer button { flex: 1; }

/* Editor window */
.region-template-editor-form {
  display: flex; flex-direction: column; height: 100; overflow: hidden;
}
.behaviors-fieldset {
  flex: 1 1 auto; display: flex; flex-direction: column; overflow: hidden;
  margin-top: 8px;
}
.behaviors-fieldset legend { font-weight: 600; padding: 0 4px; }
.behavior-list {
  list-style: none; margin: 0; padding: 0;
  flex: 1 1 auto; overflow-y: auto; min-height: 60px;
  border: 1px solid var(--color-border-light-tertiary, #ccc); border-radius: 3px;
}
.behavior-list .empty {
  padding: 10px; text-align: center;
  color: var(--color-text-light-6, #888); font-style: italic;
}
.behavior-row {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 8px;
  border-bottom: 1px solid var(--color-border-light-tertiary, #e0e0e0);
}
.behavior-row:last-child { border-bottom: none; }
.behavior-name { flex: 1 1 auto; font-weight: 600; }
.behavior-type  { font-size: 0.82em; color: var(--color-text-light-6, #888); flex: 0 0 auto; }
.behavior-disabled-label { display: flex; align-items: center; gap: 4px; font-size: 0.85em; flex: 0 0 auto; }
.behavior-delete { cursor: pointer; padding: 2px 4px; flex: 0 0 auto; }
.behavior-delete:hover { color: var(--color-level-error, #c00); }

.add-behavior-row {
  display: flex; gap: 6px; align-items: center;
  padding: 6px 0 0;
}
.behavior-type-select { flex: 1 1 auto; }
.editor-footer {
  display: flex; gap: 6px; padding: 6px 0 0;
  border-top: 1px solid var(--color-border-light-tertiary, #ccc);
  margin-top: 6px; flex: 0 0 auto;
}
.editor-footer button { flex: 1; }

/* RegionConfig injection */
.save-as-template-btn { margin: 6px 0 4px; width: 100%; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// RegionTemplateIndex  –  compendium-like browser for all saved templates
// ─────────────────────────────────────────────────────────────────────────────

class RegionTemplateIndex extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "region-template-index",
    classes: ["region-template-index"],
    window: {
      title: "REGIONTEMPLATES.IndexTitle",
      icon: "fa-solid fa-layer-group",
      resizable: true
    },
    position: { width: 420, height: 560 }
  };

  /** @type {string} */
  #filter = "";

  /* ── Singleton access ── */

  /**
   * Open (or focus) the singleton index window.
   * @returns {RegionTemplateIndex}
   */
  static open() {
    const existing = foundry.applications.instances.get(
      "region-template-index"
    );
    if (existing) {
      existing.render({ force: true });
      return existing;
    }
    return new RegionTemplateIndex().render({ force: true });
  }

  /* ── ApplicationV2 overrides ── */

  get title() {
    return loc("REGIONTEMPLATES.IndexTitle");
  }

  /** @override */
  async _renderHTML(_context, _options) {
    const filter = this.#filter.toLowerCase();
    const templates = getTemplates().filter(
      t =>
        !filter ||
        t.name.toLowerCase().includes(filter) ||
        (t.description ?? "").toLowerCase().includes(filter)
    );

    const rows = templates
      .map(
        t => `
      <li class="region-template-row"
          data-id="${esc(t.id)}"
          draggable="true"
          title="${esc(loc("REGIONTEMPLATES.DragHint"))}">
        <i class="fa-solid fa-layer-group template-icon"></i>
        <span class="template-name">${esc(t.name)}</span>
        <span class="behavior-count-badge"
              title="${esc(loc("REGIONTEMPLATES.Behaviors"))}">
          ${t.behaviors.length}
        </span>
        <span class="template-controls">
          <a class="icon" data-action="editTemplate" data-id="${esc(t.id)}" title="Edit">
            <i class="fa-solid fa-edit"></i>
          </a>
          <a class="icon" data-action="deleteTemplate" data-id="${esc(t.id)}" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </a>
        </span>
      </li>
    `
      )
      .join("");

    return `
      <div class="region-template-index-inner">
        <header class="index-header">
          <input type="search" class="template-search"
                 placeholder="Filter…" value="${esc(this.#filter)}">
          <button type="button" data-action="createTemplate"
                  title="${esc(loc("REGIONTEMPLATES.CreateNew"))}">
            <i class="fa-solid fa-plus"></i>
          </button>
        </header>
        <ul class="region-template-list">
          ${rows || `<li class="empty">${loc("REGIONTEMPLATES.NoTemplates")}</li>`}
        </ul>
        <footer class="index-footer">
          <button type="button" data-action="importTemplates">
            <i class="fa-solid fa-file-import"></i> Import
          </button>
          <button type="button" data-action="exportTemplates">
            <i class="fa-solid fa-file-export"></i> Export
          </button>
        </footer>
      </div>
    `;
  }

  /** @override */
  _replaceHTML(result, content, _options) {
    content.innerHTML = result;
    this._activateIndexListeners(content);
  }

  _activateIndexListeners(html) {
    /* Search / filter */
    html.querySelector(".template-search")?.addEventListener("input", ev => {
      this.#filter = ev.target.value;
      this.render();
    });

    /* Create new template */
    html
      .querySelector("[data-action='createTemplate']")
      ?.addEventListener("click", () => {
        RegionTemplateEditor.open(null);
      });

    /* Edit individual template */
    for (const el of html.querySelectorAll("[data-action='editTemplate']")) {
      el.addEventListener("click", ev => {
        ev.stopPropagation();
        RegionTemplateEditor.open(el.dataset.id);
      });
    }

    /* Delete individual template */
    for (const el of html.querySelectorAll("[data-action='deleteTemplate']")) {
      el.addEventListener("click", async ev => {
        ev.stopPropagation();
        const id = el.dataset.id;
        const tmpl = getTemplate(id);
        if (!tmpl) return;
        const ok = await foundry.applications.api.DialogV2.confirm({
          window: { title: loc("REGIONTEMPLATES.DeleteTitle") },
          content: `<p>${loc("REGIONTEMPLATES.DeleteConfirm", { name: tmpl.name })}</p>`
        });
        if (!ok) return;
        await deleteTemplate(id);
        this.render();
      });
    }

    /* Export all templates to a JSON file */
    html
      .querySelector("[data-action='exportTemplates']")
      ?.addEventListener("click", () => {
        this._exportTemplates();
      });

    /* Import templates from a JSON file */
    html
      .querySelector("[data-action='importTemplates']")
      ?.addEventListener("click", () => {
        this._importTemplates();
      });

    /* Drag template from index → canvas */
    for (const row of html.querySelectorAll(
      ".region-template-row[draggable='true']"
    )) {
      row.addEventListener("dragstart", ev => {
        const id = row.dataset.id;
        const tmpl = getTemplate(id);
        if (!tmpl) return;

        const dragData = {
          type: "RegionTemplate",
          moduleId: MODULE_ID,
          id
        };

        ev.dataTransfer.effectAllowed = "copy";
        ev.dataTransfer.setData("text/plain", JSON.stringify(dragData));
      });
    }
  }

  /* ── Export / Import ── */

  _exportTemplates() {
    const payload = JSON.stringify(
      { regionTemplates: getTemplates() },
      null,
      2
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "region-templates.json";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  _importTemplates() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;

      let parsed;
      try {
        parsed = JSON.parse(await file.text());
      } catch {
        ui.notifications.error(loc("REGIONTEMPLATES.ImportError"));
        return;
      }

      if (!Array.isArray(parsed?.regionTemplates)) {
        ui.notifications.error(loc("REGIONTEMPLATES.InvalidImport"));
        return;
      }

      const incoming = parsed.regionTemplates;
      const valid = incoming.filter(
        t => t?.id && t?.name && Array.isArray(t?.behaviors)
      );
      const skipped = incoming.length - valid.length;

      if (skipped) {
        ui.notifications.warn(
          loc("REGIONTEMPLATES.ImportSkipped", { count: skipped })
        );
      }

      const existing = getTemplates();
      for (const t of valid) {
        const idx = existing.findIndex(e => e.id === t.id);
        if (idx >= 0) existing[idx] = t;
        else existing.push(t);
      }

      await saveTemplates(existing);
      ui.notifications.info(
        loc("REGIONTEMPLATES.Imported", { count: valid.length })
      );
      this.render();
    });
    input.click();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RegionTemplateEditor  –  create or edit a single template
// ─────────────────────────────────────────────────────────────────────────────

class RegionTemplateEditor extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    classes: ["region-template-editor"],
    window: {
      title: "REGIONTEMPLATES.EditorTitle",
      icon: "fa-solid fa-layer-group",
      resizable: true
    },
    position: { width: 500, height: 640 }
  };

  /** @type {RegionTemplate} */
  #template;

  /* ── Static factory ── */

  /**
   * Open an editor for the given template id, or open a blank editor for a
   * new template when `templateId` is null.
   *
   * Re-uses an existing editor window for the same id if one is already open.
   *
   * @param {string|null} templateId
   * @returns {RegionTemplateEditor}
   */
  static open(templateId) {
    const appId = templateId
      ? `region-template-editor-${templateId}`
      : `region-template-editor-new-${foundry.utils.randomID()}`;

    const existing = foundry.applications.instances.get(appId);
    if (existing) {
      existing.render({ force: true });
      return existing;
    }

    const template = templateId ? getTemplate(templateId) : null;
    return new RegionTemplateEditor({ _appId: appId, template }).render({
      force: true
    });
  }

  /* ── Constructor ── */

  /**
   * @param {{ _appId: string, template: RegionTemplate|null } & object} options
   */
  constructor({ _appId, template, ...rest } = {}) {
    super({ id: _appId, ...rest });
    this.#template = template
      ? foundry.utils.deepClone(template)
      : {
          id: foundry.utils.randomID(),
          name: "",
          description: "",
          behaviors: []
        };
  }

  /* ── ApplicationV2 overrides ── */

  get title() {
    return this.#template.name
      ? loc("REGIONTEMPLATES.EditingNamed", { name: this.#template.name })
      : loc("REGIONTEMPLATES.NewTemplate");
  }

  /** @override */
  async _renderHTML(_context, _options) {
    const behaviorTypes = listBehaviorTypes();
    const typeOptions = behaviorTypes
      .map(bt => `<option value="${esc(bt.type)}">${esc(bt.label)}</option>`)
      .join("");

    const behaviorRows = this.#template.behaviors
      .map((b, idx) => {
        const typeLabel = getBehaviorTypeLabel(b.type);
        return `
        <li class="behavior-row" data-idx="${idx}">
          <span class="behavior-name">${esc(b.name || typeLabel)}</span>
          <span class="behavior-type">(${esc(typeLabel)})</span>
          <label class="behavior-disabled-label">
            <input type="checkbox" class="js-behavior-disabled"
                   data-idx="${idx}"${b.disabled ? " checked" : ""}>
            ${esc(loc("REGIONTEMPLATES.Disabled"))}
          </label>
          <a class="behavior-delete js-behavior-delete" data-idx="${idx}" title="Remove">
            <i class="fa-solid fa-times"></i>
          </a>
        </li>
      `;
      })
      .join("");

    return `
      <form class="region-template-editor-form standard-form">
        <div class="form-group">
          <label>Name</label>
          <input type="text" name="name" value="${esc(this.#template.name)}"
                 placeholder="${esc(loc("REGIONTEMPLATES.TemplateName"))}" required>
        </div>

        <div class="form-group stacked">
          <label>${esc(loc("REGIONTEMPLATES.Description"))}</label>
          <textarea name="description" rows="2">${esc(this.#template.description ?? "")}</textarea>
        </div>

        <fieldset class="behaviors-fieldset">
          <legend>${esc(loc("REGIONTEMPLATES.Behaviors"))}</legend>
          <ul class="behavior-list">
            ${behaviorRows || `<li class="empty">${loc("REGIONTEMPLATES.NoBehaviors")}</li>`}
          </ul>
          <div class="add-behavior-row">
            <select name="newBehaviorType" class="behavior-type-select">
              ${typeOptions || `<option value="">(no behavior types registered)</option>`}
            </select>
            <button type="button" data-action="addBehavior">
              <i class="fa-solid fa-plus"></i> ${esc(loc("REGIONTEMPLATES.AddBehavior"))}
            </button>
          </div>
        </fieldset>

        <footer class="editor-footer">
          <button type="button" data-action="captureFromRegion">
            <i class="fa-solid fa-download"></i>
            ${esc(loc("REGIONTEMPLATES.CaptureFromRegion"))}
          </button>
          <button type="button" data-action="saveTemplate" class="bright">
            <i class="fa-solid fa-floppy-disk"></i>
            ${esc(loc("REGIONTEMPLATES.SaveTemplate"))}
          </button>
        </footer>
      </form>
    `;
  }

  /** @override */
  _replaceHTML(result, content, _options) {
    content.innerHTML = result;
    this._activateEditorListeners(content);
  }

  _activateEditorListeners(html) {
    const form = html.querySelector("form");

    /* Remove a behavior entry */
    for (const el of html.querySelectorAll(".js-behavior-delete")) {
      el.addEventListener("click", () => {
        const idx = parseInt(el.dataset.idx, 10);
        this.#template.behaviors.splice(idx, 1);
        this.render();
      });
    }

    /* Toggle disabled flag (live, no full re-render needed) */
    for (const el of html.querySelectorAll(".js-behavior-disabled")) {
      el.addEventListener("change", ev => {
        const idx = parseInt(el.dataset.idx, 10);
        this.#template.behaviors[idx].disabled = ev.target.checked;
      });
    }

    /* Add a new behavior slot */
    html
      .querySelector("[data-action='addBehavior']")
      ?.addEventListener("click", () => {
        const type = form.querySelector("[name='newBehaviorType']")?.value;
        if (!type) return;
        this.#template.behaviors.push({
          type: type,
          name: getBehaviorTypeLabel(type),
          disabled: false,
          system: {}
        });
        this.render();
      });

    /* Capture all behaviors from the currently-controlled canvas Region */
    html
      .querySelector("[data-action='captureFromRegion']")
      ?.addEventListener("click", async () => {
        const controlled = canvas.regions?.controlled ?? [];
        if (!controlled.length) {
          ui.notifications.warn(loc("REGIONTEMPLATES.NoRegionSelected"));
          return;
        }
        const regionDoc = controlled[0].document;
        if (!regionDoc.behaviors.size) {
          ui.notifications.warn(loc("REGIONTEMPLATES.RegionNoBehaviors"));
          return;
        }
        const ok = await foundry.applications.api.DialogV2.confirm({
          window: { title: loc("REGIONTEMPLATES.CaptureConfirmTitle") },
          content: `<p>${loc("REGIONTEMPLATES.CaptureConfirm", {
            region: regionDoc.name,
            count: regionDoc.behaviors.size
          })}</p>`
        });
        if (!ok) return;
        this.#template.behaviors = captureBehaviorsFromRegion(regionDoc);
        this.render();
      });

    /* Save template */
    html
      .querySelector("[data-action='saveTemplate']")
      ?.addEventListener("click", async () => {
        const name = form.querySelector("[name='name']")?.value?.trim() ?? "";
        if (!name) {
          ui.notifications.warn(loc("REGIONTEMPLATES.NameRequired"));
          return;
        }
        this.#template.name = name;
        this.#template.description =
          form.querySelector("[name='description']")?.value ?? "";
        await upsertTemplate(this.#template);
        ui.notifications.info(
          loc("REGIONTEMPLATES.Saved", { name: this.#template.name })
        );
        /* Refresh the index window if it is open */
        foundry.applications.instances.get("region-template-index")?.render();
        await this.close();
      });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Module initialisation hooks
// ─────────────────────────────────────────────────────────────────────────────

Hooks.once("init", () => {
  /* Register world-scoped setting that stores all templates as a JSON array. */
  game.settings.register(MODULE_ID, SETTING_TEMPLATES, {
    name: "Region Templates Data",
    scope: "world",
    config: false, // hidden from the settings UI – managed by our own windows
    type: Array,
    default: []
  });

  /* Inject module stylesheet */
  const style = document.createElement("style");
  style.dataset.moduleId = MODULE_ID;
  style.textContent = MODULE_CSS;
  document.head.appendChild(style);
});

Hooks.once("ready", () => {
  /**
   * Public API – accessible from macros and third-party modules via
   *   game.modules.get("region-templates").api
   */
  game.modules.get(MODULE_ID).api = {
    /** @returns {RegionTemplate[]} */
    getTemplates,
    /** @param {string} id @returns {RegionTemplate|null} */
    getTemplate,
    /** @param {RegionTemplate} template @returns {Promise<void>} */
    upsertTemplate,
    /** @param {string} id @returns {Promise<void>} */
    deleteTemplate,
    /**
     * Apply a template to a RegionDocument.
     * @param {RegionTemplate}  template
     * @param {RegionDocument}  regionDoc
     * @returns {Promise<void>}
     */
    applyTemplateToRegion,
    /** Open the Region Template browser window. */
    openIndex: () => RegionTemplateIndex.open(),
    /** Open the editor for a specific template id (or null for a new one). */
    openEditor: id => RegionTemplateEditor.open(id ?? null)
  };

  console.log(`${MODULE_ID} | Ready`);
});

// ─────────────────────────────────────────────────────────────────────────────
// Scene Controls  –  add a "Region Templates" button to the Regions tool bar
// ─────────────────────────────────────────────────────────────────────────────

Hooks.on("getSceneControlButtons", controls => {
  // In v13+, controls is an object with properties for each control layer
  if (!controls.regions) return;

  // Ensure tools object exists
  controls.regions.tools ??= {};

  controls.regions.tools.regionTemplates = {
    name: "regionTemplates",
    title: loc("REGIONTEMPLATES.OpenIndex"),
    icon: "fa-solid fa-layer-group",
    order: Object.keys(controls.regions.tools).length,
    button: true,
    visible: true,
    onChange: () => RegionTemplateIndex.open()
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Canvas drop handler  –  when a template card is dragged onto the canvas
// ─────────────────────────────────────────────────────────────────────────────

Hooks.on("dropCanvasData", async (_canvas, data) => {
  /* Only react to our own drag payloads */
  if (data.type !== "RegionTemplate" || data.moduleId !== MODULE_ID) return;

  const template = getTemplate(data.id);
  if (!template) {
    ui.notifications.error(loc("REGIONTEMPLATES.TemplateNotFound"));
    return;
  }

  /* ── Strategy 1: exactly one controlled Region → apply immediately ── */
  const controlled = canvas.regions?.controlled ?? [];

  if (controlled.length === 1) {
    await applyTemplateToRegion(template, controlled[0].document);
    return;
  }

  /* ── Strategy 2: multiple controlled Regions → let user pick ── */
  if (controlled.length > 1) {
    await _promptRegionChoice(
      template,
      controlled.map(r => r.document)
    );
    return;
  }

  /* ── Strategy 3: nothing controlled → hit-test at drop coordinates ── */
  const dropX = data.x ?? 0;
  const dropY = data.y ?? 0;
  const allDocs = canvas.scene?.regions?.contents ?? [];

  if (!allDocs.length) {
    ui.notifications.warn(loc("REGIONTEMPLATES.NoRegionsInScene"));
    return;
  }

  /*
   * Quick spatial filter: check each Region's rendered bounding box.
   *
   * Foundry's Region placeable stores its geometry in `bounds` (a
   * PIXI.Rectangle).  This may over-select for non-rectangular shapes, but
   * gives a cheap, reliable first pass.  We could refine with a polygon
   * containment test using the region's shape data, but that complexity is
   * unnecessary when the user can simply control a region before dragging.
   */
  const candidates = allDocs.filter(regionDoc => {
    const obj = canvas.regions?.get(regionDoc.id);
    return obj?.bounds?.contains(dropX, dropY) ?? false;
  });

  if (!candidates.length) {
    /*
     * No spatial match.  Fall back to listing all scene regions so the user
     * can still choose – this handles unusual polygon shapes or edge cases.
     */
    await _promptRegionChoice(template, allDocs);
    return;
  }

  if (candidates.length === 1) {
    await applyTemplateToRegion(template, candidates[0]);
    return;
  }

  await _promptRegionChoice(template, candidates);
});

/**
 * Show a dialog asking the user to choose which Region to apply the template
 * to, then apply it.
 *
 * @param {RegionTemplate}  template
 * @param {RegionDocument[]} regions
 * @returns {Promise<void>}
 */
async function _promptRegionChoice(template, regions) {
  const buttons = [
    ...regions.map(r => ({ label: r.name || r.id, action: r.id })),
    { label: game.i18n.localize("Cancel") || "Cancel", action: "cancel" }
  ];

  const chosen = await foundry.applications.api.DialogV2.wait({
    window: { title: loc("REGIONTEMPLATES.SelectRegion") },
    content: `<p>${loc("REGIONTEMPLATES.SelectRegionHint", { template: template.name })}</p>`,
    buttons
  });

  if (!chosen || chosen === "cancel") return;
  const regionDoc = regions.find(r => r.id === chosen);
  if (regionDoc) await applyTemplateToRegion(template, regionDoc);
}

// ─────────────────────────────────────────────────────────────────────────────
// RegionConfig integration  –  inject "Save as Template" into the Region sheet
// ─────────────────────────────────────────────────────────────────────────────

/**
 * After the Region configuration sheet renders, inject a "Save as Template"
 * button at the top of the Behaviors tab so GMs can capture a Region's current
 * behavior set with one click.
 *
 * In v13 ApplicationV2, the hook receives (app, element, context, options)
 * where `element` is the root HTMLElement of the window frame.
 */
Hooks.on("renderRegionConfig", (app, element, _context, _options) => {
  /* Locate the behaviors tab panel */
  const behaviorsTab = element.querySelector('.tab[data-tab="behaviors"]');
  if (!behaviorsTab) return;

  /* Prevent duplicates on partial re-renders */
  if (behaviorsTab.querySelector(".save-as-template-btn")) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "save-as-template-btn";
  btn.innerHTML = `<i class="fa-solid fa-layer-group"></i> ${esc(loc("REGIONTEMPLATES.SaveAsTemplate"))}`;

  btn.addEventListener("click", async () => {
    const regionDoc = app.document;

    if (!regionDoc.behaviors.size) {
      ui.notifications.warn(loc("REGIONTEMPLATES.RegionNoBehaviors"));
      return;
    }

    /* Build a new template pre-populated from this region's behaviors */
    const newTemplate = {
      id: foundry.utils.randomID(),
      name: loc("REGIONTEMPLATES.NewTemplateName", { region: regionDoc.name }),
      description: "",
      behaviors: captureBehaviorsFromRegion(regionDoc)
    };

    await upsertTemplate(newTemplate);
    ui.notifications.info(
      loc("REGIONTEMPLATES.Saved", { name: newTemplate.name })
    );

    /* Refresh the index window if open, then open the editor so the user can
     * rename / adjust the template before finalising it. */
    foundry.applications.instances.get("region-template-index")?.render();
    RegionTemplateEditor.open(newTemplate.id);
  });

  behaviorsTab.prepend(btn);
});

// ─────────────────────────────────────────────────────────────────────────────
// Regions Sidebar – Enable drag-and-drop onto region list items
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add drop handlers to region legend entries so users can drag templates
 * directly onto regions in the legend list.
 */
function attachRegionLegendDropHandlers(html) {
  // Find all region legend entries - try multiple selector patterns
  const regionElements = html.querySelectorAll(
    "[data-region-id], .region-legend-item, .legend-entry, li[data-document-id], .control-icon[data-action='control']"
  );

  if (regionElements.length === 0) return;

  for (const element of regionElements) {
    // Skip if already has drop handler
    if (element.dataset.templateDropEnabled) continue;
    element.dataset.templateDropEnabled = "true";

    // Get the parent that might have the region data
    const listItem = element.closest("li") || element;

    // Allow dropping on this element
    listItem.addEventListener("dragover", ev => {
      ev.preventDefault();
      ev.dataTransfer.dropEffect = "copy";
      listItem.classList.add("drop-target");
    });

    listItem.addEventListener("dragleave", () => {
      listItem.classList.remove("drop-target");
    });

    listItem.addEventListener("drop", async ev => {
      ev.preventDefault();
      listItem.classList.remove("drop-target");

      let data;
      try {
        data = JSON.parse(ev.dataTransfer.getData("text/plain"));
      } catch (e) {
        return;
      }

      // Only handle our template drops
      if (data.type !== "RegionTemplate" || data.moduleId !== MODULE_ID) return;

      const template = getTemplate(data.id);
      if (!template) {
        ui.notifications.error(loc("REGIONTEMPLATES.TemplateNotFound"));
        return;
      }

      // Find the region document by ID from various possible attributes
      const regionId =
        element.dataset.regionId ||
        listItem.dataset.regionId ||
        element.dataset.documentId ||
        listItem.dataset.documentId ||
        element.dataset.entryId;

      const regionDoc = canvas.scene?.regions?.get(regionId);

      if (!regionDoc) {
        ui.notifications.error("Region not found: " + regionId);
        return;
      }

      await applyTemplateToRegion(template, regionDoc);
    });
  }
}

// Try multiple hook variations for the region legend
Hooks.on("renderSceneRegionLegend", (_app, html) => {
  attachRegionLegendDropHandlers(html[0] || html);
});

Hooks.on("renderRegionLegend", (_app, html) => {
  attachRegionLegendDropHandlers(html[0] || html);
});

Hooks.on("renderApplication", (app, html) => {
  if (
    app.constructor.name?.includes("Region") &&
    app.constructor.name?.includes("Legend")
  ) {
    attachRegionLegendDropHandlers(html[0] || html);
  }
});

// Also try to attach on canvasReady in case the legend already exists
Hooks.on("canvasReady", () => {
  // Look for the legend in the DOM
  const legendElement = document.querySelector(
    ".scene-region-legend, #region-legend, .regions-layer .legend"
  );
  if (legendElement) {
    attachRegionLegendDropHandlers(legendElement);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// JSDoc typedefs  (for editor tooling / future TypeScript migration)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {object} BehaviorData
 * @property {string}  type     - The RegionBehavior type key (e.g. "pauseGame")
 * @property {string}  name     - Display name for this behavior slot
 * @property {boolean} disabled - Whether the behavior starts disabled
 * @property {object}  system   - Type-specific system data
 */

/**
 * @typedef {object} RegionTemplate
 * @property {string}         id          - Unique random id (foundry.utils.randomID)
 * @property {string}         name        - Human-readable template name
 * @property {string}         description - Optional description
 * @property {BehaviorData[]} behaviors   - Ordered list of behavior definitions
 */
