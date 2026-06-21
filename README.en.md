# Codexcali

Codexcali is a local whiteboard plugin for Codex. It embeds Excalidraw into the current project so image generation, visual feedback, and revised results can live together on a lightweight hand-drawn canvas.

## What It Does

- Opens a project-local Excalidraw board for arranging source images, sketches, prompts, and generated outputs.
- Stores the canvas document and image assets inside the current project instead of relying on cloud storage.
- Adds AI image holders that Codex can detect, target, and replace with generated images.
- Lets Codex use annotated screenshots as edit instructions, then places the cleaned-up result beside the original image.
- Exposes MCP tools for reading selection state, creating holders, inserting image files, and saving the page.

## Local Files

Codexcali writes project-owned data under `codexcali/` by default:

```text
codexcali/
  pages/
    <page-id>/
      codexcali-canvas.excalidraw.json
      assets/
```

Environment variables:

- `CODEXCALI_PORT`: local canvas server port. Defaults to `43218`.
- `CODEXCALI_PROJECT_DIR`: project directory used for canvas data.
- `CODEXCALI_CANVAS_DIR`: explicit canvas data directory. Defaults to `$CODEXCALI_PROJECT_DIR/codexcali`.

## Installation

### Option 1: Use The Installer

Windows PowerShell:

```powershell
iwr https://raw.githubusercontent.com/Yipalex/codexcali/master/scripts/install-codexcali.ps1 -OutFile $env:TEMP\install-codexcali.ps1
powershell -ExecutionPolicy Bypass -File $env:TEMP\install-codexcali.ps1
```

macOS / Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/Yipalex/codexcali/master/scripts/install-codexcali.sh | bash
```

The installer clones the repository, runs `npm install` and `npm run build`, registers the personal marketplace, and runs `codex plugin add codexcali@personal` when the Codex CLI is available.

### Option 2: Manual Install And Registration

```bash
mkdir -p ~/plugins
git clone https://github.com/Yipalex/codexcali.git ~/plugins/codexcali
cd ~/plugins/codexcali
npm install
npm run build
```

Then make sure your personal marketplace contains a `codexcali` entry. The default file is `~/.agents/plugins/marketplace.json`; the plugin entry should look like this:

```json
{
  "name": "codexcali",
  "source": {
    "source": "local",
    "path": "./plugins/codexcali"
  },
  "policy": {
    "installation": "AVAILABLE",
    "authentication": "ON_INSTALL"
  },
  "category": "Productivity"
}
```

Install the plugin:

```bash
codex plugin add codexcali@personal
```

If your terminal cannot find `codex`, install the Codex CLI first:

```bash
npm install -g @openai/codex@latest
codex --version
```

On Windows, if `codex` still resolves to the Microsoft Store / WindowsApps alias, make sure `%APPDATA%\npm` appears before WindowsApps in PATH. Open a new Codex thread after installation so the new skill and MCP tools are loaded.

## Usage Examples

Open the canvas:

```text
Open the Codexcali canvas for this project.
```

Fill the selected holder:

```text
Generate an image for the selected Codexcali holder.
```

Create a clean image from an annotated screenshot:

```text
Create a clean revised image from this Codexcali annotation screenshot and place it beside the original.
```

Default local URL:

```text
http://127.0.0.1:43218/
```

## MCP Tools

- `codexcali:open-canvas`: start or reuse the local canvas server.
- `codexcali:get-selection`: read the active page, selected elements, selected holder, page path, and assets directory.
- `codexcali:create-image-holder`: add an image holder that Codex can fill.
- `codexcali:insert-image`: save an image asset and place it on the canvas or into a holder.
- `codexcali:save-page`: save the active page.
- `codexcali:place-clean-edit-beside-original`: place a cleaned-up revision beside the selected original image.

## Development

```bash
npm install
npm run dev:server
npm run dev
```

Build and test:

```bash
npm run build
npm test
```

## License

Codexcali is released under the MIT License. Excalidraw is also MIT licensed.

## Inspiration

Codexcali's naming pattern and the idea of using a local Codex canvas for AI image work were inspired by Cowart. Codexcali is an independent clean-room implementation built around Excalidraw.

Cowart GitHub project: [https://github.com/zhongerxin/cowart](https://github.com/zhongerxin/cowart)
