---
tags: [ui, design, frontend]
---

# UI Design — Two-Pane Layout

Split screen: left pane config/input, right pane live README preview. Dark theme default, light/dark toggle top-right of preview pane.

## Left Pane — Project Configuration

### Repository URL
- Input field, placeholder `owner/repo`, e.g. `vercel/next.js`
- `Generate` button (blue, primary), triggers `/api/generate-readme`

### Configuration
- **Tone** dropdown: `Professional`, `Technical`, `Friendly`
- **Badges Toggle**
  - `Include Badges?` — on/off switch
  - `Badges` — on/off switch (style variant?)
- **Sections** — checkboxes, multi-select:
  - Installation
  - Features
  - Tech Stack
  - License

### Edit View
- Tab/segmented control: `Raw Markdown` | `Optimal`
- Below: live-editable markdown source (monospace), numbered lines

## Right Pane — README.md Preview

### Preview Actions (toolbar)
- `Copy Markdown` button
- `Download README.md` button
- theme toggle (sun/moon icons)

### Rendered Preview
- Title (h1) — repo name, e.g. `next.js`
- Badges row — rendered shields (license, stars, npm, contributors etc.)
- `# Installation` — heading + code block (install command)
- `# Features` — heading + bullet list
- `# Tech Stack` — heading + row of tech icons/badges
- `# License` — heading (scrolls below fold)

## Component Breakdown (for [[05-Frontend-Specifications]])

| Component | Notes |
| :--- | :--- |
| `RepoUrlInput` | controlled input + validation for `owner/repo` or full URL |
| `GenerateButton` | disabled state while loading, calls `POST /api/generate-readme` |
| `ToneSelect` | dropdown, feeds into agent prompt config |
| `BadgesToggle` x2 | boolean switches, feeds generation options |
| `SectionsChecklist` | multi-select, controls which `#` sections agent outputs |
| `EditViewTabs` | `Raw Markdown` vs `Optimal` (rendered/cleaned) view toggle |
| `MarkdownEditor` | raw source, editable, synced with preview |
| `PreviewToolbar` | Copy / Download / theme toggle |
| `MarkdownPreview` | uses `react-markdown` + `react-syntax-highlighter`, see [[03-Technology-Stack]] |

Status shown bottom-left: `Connected` indicator (websocket/API health) + version tag bottom-right (e.g. `v1.0.0`).

Related: [[05-Frontend-Specifications]], [[07-Endpoint-Matrix]]
