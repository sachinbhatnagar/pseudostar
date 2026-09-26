---
name: PseudoStar Studio
description: Compact subject workspaces for tasks, work, and results.
colors:
  ict-accent: "#315b45"
  english-accent: "#684658"
  white: "#ffffff"
  ict-ink: "#28332e"
  ict-line: "#dbe1dc"
  ict-surface: "#f7f9f7"
  english-ink: "#303036"
  english-muted: "#65616a"
  english-line: "#dedade"
  english-surface: "#faf9fa"
  english-wash: "#f3eff2"
  english-field-line: "#c7bcc3"
  english-hover: "#513543"
  ict-hover: "#233c28"
  ict-button-text: "#f7f9f5"
typography:
  brand:
    fontFamily: "system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.5px"
  heading:
    fontFamily: "system-ui, sans-serif"
    fontSize: "20px"
    lineHeight: 1.35
  english-body:
    fontFamily: "system-ui, sans-serif"
    fontSize: "13px"
    lineHeight: 1.5
  ict-body:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "14px"
  navigation:
    fontFamily: "system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
  block-fields:
    fontFamily: '"SFMono-Regular", Consolas, monospace'
    fontSize: "13px"
    fontWeight: 500
rounded:
  control: "4px"
  ict-panel: "6px"
  dialog: "8px"
spacing:
  compact: "8px"
  gap: "12px"
  panel: "16px"
  inset: "18px"
  page: "24px"
components:
  button-ict-primary:
    backgroundColor: "{colors.ict-accent}"
    textColor: "{colors.ict-button-text}"
    rounded: "{rounded.control}"
    padding: "12px 18px"
  button-english-primary:
    backgroundColor: "{colors.english-accent}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    padding: "7px 13px"
  button-english-primary-hover:
    backgroundColor: "{colors.english-hover}"
    textColor: "{colors.white}"
  button-english-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.english-ink}"
    rounded: "{rounded.control}"
    padding: "6px 11px"
  english-response:
    backgroundColor: "{colors.white}"
    textColor: "{colors.english-ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  ict-panel:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.ict-panel}"
    padding: "18px"
---

# Design System: PseudoStar Studio

## Overview

**Creative North Star: "The Compact Studio"**

The approved compact studio gives ICT and English one working structure: a shared top bar, a task area, a work area, and results. Small system type and restrained subject colors keep the work in view. The real editor and response fields are the main visual objects.

This document records the current implementation. Sources are `code/src/app/studio.css`, `code/src/english/english.css`, `code/src/app/App.tsx`, and the English workspace and attempt components. Base editor rules remain in `code/src/style.css` and `code/src/app/production.css`. The shared stylesheet loads after those base styles. This record does not establish browser verification or production release status.

**Key Characteristics:**

- Compact system typography.
- Forest accents for ICT; mulberry accents for English.
- White working surfaces with small corners and clear boundaries.
- Task, work, and results remain in reading order on small screens.

## Colors

### Primary

Forest marks ICT actions, the brand symbol, and active editor controls. Mulberry has the same role in English. The subject defines the accent; it does not change the shared navigation structure.

### Neutral

White is the page and primary work surface. Each subject supplies its own ink, boundary, and soft-surface colors. English wash distinguishes quiet hover states and table headers. Muted English ink is for secondary text, save status, and word counts.

### Functional colors

Blockly retains the category palette in `code/src/editor/blocks.ts`: output, input, variables, selection, loops, and routines. These colors encode instruction type. Keep the category colors and selection marks when changing the surrounding workspace.

## Typography

Use system type for the brand, headings, navigation, forms, and dialogs. Use monospace for pseudocode and block fields. Existing Sentient font assets are not the approved studio display face.

The brand uses the frontmatter role and becomes 18px on phones. Workspace headings use the heading role; English attempt titles are 17px. English panel headings are 15px; ICT results headings are 14px. Supporting text is generally 11–12px. Timers, word counts, and scores use tabular numerals. Sign-in headings are 32px on desktop and 28px on phones.

## Layout

The top bar holds the brand, native subject selector, subject navigation, and account controls. Its minimum height is 64px, with 12px vertical and 24px horizontal padding. Controls can wrap. Below 760px, navigation occupies its own row and the header has 16px side padding.

ICT uses an outer task/workbench grid: `minmax(220px, 0.85fr) minmax(0, 2.6fr)`. The workbench divides into work and results at `minmax(0, 1.6fr) minmax(250px, 1fr)`. Gaps are 12px. The page margin is 18px 24px 24px. Task, compose, and result panels have 20px, 16px, and 18px padding respectively. The task sidebar can collapse; fullscreen belongs to the workbench.

English attempts use `minmax(220px, 0.85fr) minmax(320px, 1.6fr) minmax(260px, 1fr)`, with 10px gaps and 15px panel padding. Dashboard tools use four columns; the dashboard focus region uses two. Long prose can wrap within panels, and English data tables have a horizontal scroll container.

At 1100px and below, ICT results move below the editor and output/variables share a row. English review spans the row below task and response; tools use two columns. At 760px and below, task, work, and results stack in source order. ICT page margins become 16px, and English page padding becomes 15px 12px. English settings become an inline panel on phones.

## Elevation & Depth

Work panels stay flat. White surfaces, subject-tinted interiors, and quiet boundaries define regions. Settings menus use small directional shadows: ICT `0 4px 12px #28332e14`, English `0 5px 12px #35232d12`. English mobile settings remove the shadow. Buttons have no hover translation. Keep focus outlines distinct from elevation.

## Shapes

Controls and English panels use the control radius. ICT work and result panels use the ICT panel radius. Dialogs use the dialog radius. Native Blockly connection shapes and statement cavities remain intact. Do not replace executable block structure with decorative rounded cards.

## Components

### Buttons

ICT primary actions use forest with pale text. Run controls reduce the primary padding to 8px 10px and use 12px type. English primary actions use mulberry with white text and darken on hover. English secondary actions use a white surface and a quiet border; hover uses English wash. Disabled English controls use 0.55 opacity. Keep existing action handlers and disabled conditions.

### Inputs and response fields

Use visible labels and a white input surface. English response fields use the field boundary color, vertical resizing, and 1.65 line height. Response textareas have a 125px minimum height. Focus uses a 2px mulberry outline with 3px offset; ICT buttons and links retain their 3px forest focus outline with 4px offset. Do not replace native selectors or textareas with visual props.

### Navigation and settings

The top bar uses compact 13px navigation with 8px 10px padding. Current English navigation uses accent text, a soft surface, and heavier type. User settings use native details/summary disclosure. The subject selector remains a native select. On narrow screens, wrapping must preserve every action.

### Task, work, and results

ICT shows the problem beside the live block/text editor and execution results. English shows instructions and assessment criteria beside a response form and review. Saved attempts, feedback, revisions, and timers remain real application state. Empty, busy, error, and save-conflict messages must remain visible.

### Blockly editor

Instruction colors and connections carry meaning. IF contains conditional branches; loops and routines contain statement bodies. The workspace uses the Zelos renderer and generates ordered pseudocode. Preserve block/text synchronization, zoom, fit, undo, redo, keyboard access, and the existing touch flow. These are behavior constraints, not optional visual effects.

### Motion

Use short color transitions only where controls already use them: ICT 160ms ease and English 140ms ease-out. Reduced-motion rules remove transitions. Text and controls must be visible before motion runs.

## Do's and Don'ts

### Do:

- Do use the shared top bar and subject tokens for new workspace screens.
- Do preserve real editor connections, text editing, execution, saving, and feedback behavior.
- Do keep content visible without animation and retain visible keyboard focus.
- Do test long responses, variable values, narrow screens, and open settings for overflow.
- Do treat the approved compact system font as the identity for this studio.

### Don't:

- Don't restore the previous serif-led, large-heading visual system.
- Don't add decorative hero panels, glows, floating cards, or entrance-hidden content.
- Don't recolor Blockly categories to the English accent or remove their semantic distinctions.
- Don't describe this source record as proof of completed testing or deployment.
