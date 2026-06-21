---
name: codexcali
description: Open and operate a local Excalidraw canvas for AI image holders, image insertion, and annotation-based clean edits in the current Codex project.
---

# Codexcali

Use Codexcali when the user wants to work with an Excalidraw infinite canvas inside the current project, create an AI image holder, fill a selected holder with a generated image, or use an annotated screenshot to produce a clean revised image beside the original.

## Workflow

1. Open the canvas with `codexcali:open-canvas`.
2. Ask the user to select or create an AI image holder when image placement matters.
3. Read state with `codexcali:get-selection` before inserting generated output.
4. Generate or edit the image with Codex image capabilities.
5. Insert the local image path or data URL with `codexcali:insert-image`.
6. For annotated screenshots, generate a clean image without the markup and call `codexcali:place-clean-edit-beside-original`.

## Notes

- Canvas data is stored under the current project by default: `codexcali/pages/<page-id>/`.
- Do not delete or move the original annotated image unless the user asks.
- Prefer placing clean revisions beside the original so the comparison is preserved.
- If no holder is selected, create one with `codexcali:create-image-holder` or insert the image at explicit coordinates.
