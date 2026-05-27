# Region Templates

A Foundry VTT v13 module for saving and applying Region Behavior templates.

## Overview

Region Templates allows you to save sets of Region Behaviors as reusable templates that can be applied to any region in any scene. Templates are stored at the world level, making them fully portable and exportable between worlds.

## Features

- **Template Browser** - Compendium-like window accessible from the scene controls toolbar
- **Template Editor** - Create and edit templates; add behaviors by type or capture them from existing regions
- **Drag & Drop** - Drag template cards from the browser onto canvas regions or region legend entries
- **Quick Save** - "Save as Template" button integrated into the Region configuration sheet
- **Import/Export** - Export templates to JSON files and import them into any world
- **Programmatic API** - Apply templates via JavaScript for macro and module integration

## Installation

### Via Manifest URL

1. In Foundry VTT, go to **Add-on Modules** and click **Install Module**
2. Paste the following manifest URL:
   ```
   https://github.com/Daedalus11069/foundryvtt-region-templates/releases/latest/download/module.json
   ```
3. Click **Install**

### Manual Installation

1. Download the latest release from the [Releases](https://github.com/Daedalus11069/foundryvtt-region-templates/releases) page
2. Extract the contents to your Foundry VTT `Data/modules/region-templates` folder
3. Restart Foundry VTT and enable the module in your world

## Usage

### Creating Templates

**From an Existing Region:**

1. Open a Region's configuration sheet
2. Go to the **Behaviors** tab
3. Click the **Save as Template** button
4. Edit the template name and description in the Template Editor
5. Click **Save Template**

**From Scratch:**

1. Click the **Region Templates** button in the Regions layer controls
2. Click the **+** button in the template browser
3. Add behaviors using the **Add Behavior** dropdown
4. Configure each behavior's settings
5. Click **Save Template**

### Applying Templates

**Via Drag & Drop (Canvas):**

1. Open the Region Templates browser
2. Drag a template card onto a region on the canvas
3. If multiple regions are controlled, you'll be prompted to choose one
4. If no regions are controlled, it will apply to the region at the drop location

**Via Drag & Drop (Legend):**

1. Open the Region Templates browser
2. Drag a template card onto a region entry in the region legend
3. The template is applied instantly

**Via Region Sheet:**

1. Select a region on the canvas
2. Open the Region Templates browser
3. Click the **Edit** icon on any template
4. Capture behaviors from the selected region using **Capture from Selected Region**

### Managing Templates

**Editing:**

- Click the edit icon on any template in the browser
- Modify behaviors, settings, name, or description
- Click **Save Template**

**Deleting:**

- Click the trash icon on any template in the browser
- Confirm the deletion

**Import/Export:**

- Click **Export** to download all templates as a JSON file
- Click **Import** to load templates from a JSON file
- Templates are merged with existing ones (duplicates by name will be replaced)

## API Reference

The module exposes a public API accessible via `game.modules.get("region-templates").api`:

### Methods

#### `getTemplates()`

Returns all saved region templates.

```javascript
const templates = game.modules.get("region-templates").api.getTemplates();
```

#### `getTemplate(id)`

Returns a single template by its ID.

```javascript
const template = game.modules
  .get("region-templates")
  .api.getTemplate("templateId");
```

#### `upsertTemplate(template)`

Creates or updates a template.

```javascript
await game.modules.get("region-templates").api.upsertTemplate({
  id: foundry.utils.randomID(),
  name: "My Template",
  description: "A custom template",
  behaviors: [...]
});
```

#### `deleteTemplate(id)`

Deletes a template by ID.

```javascript
await game.modules.get("region-templates").api.deleteTemplate("templateId");
```

#### `applyTemplateToRegion(template, regionDoc)`

Applies a template to a specific region document.

```javascript
const template = game.modules
  .get("region-templates")
  .api.getTemplate("templateId");
const region = canvas.scene.regions.get("regionId");
await game.modules
  .get("region-templates")
  .api.applyTemplateToRegion(template, region);
```

#### `openIndex()`

Opens the Region Templates browser window.

```javascript
game.modules.get("region-templates").api.openIndex();
```

#### `openEditor(id)`

Opens the Template Editor for a specific template (or creates a new one if `id` is `null`).

```javascript
game.modules.get("region-templates").api.openEditor("templateId");
// Or create a new template:
game.modules.get("region-templates").api.openEditor(null);
```

## Compatibility

- **Foundry VTT**: Version 13+
- **System Agnostic**: Works with any game system

## Support

For bug reports, feature requests, or questions, please open an issue on the [GitHub repository](https://github.com/Daedalus11069/foundryvtt-region-templates/issues).

## License

This module is provided as-is for use with Foundry Virtual Tabletop.
