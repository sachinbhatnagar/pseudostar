# PseudoStar design

## Overview

Target: complete production application. Current implementation is incomplete.
Mode: Operate. Help a Grade 8 learner arrange and inspect textbook pseudocode.
This records the current implementation, not final user visual approval or full app delivery.
Sources: PRODUCT.md, code/src/style.css, code/src/blocks.ts; interaction wiring in code/src/main.tsx.

## Colors

- Main ink: #283e30; page: #edf1eb; studio: #f7f9f5.
- Lesson: #e4ebe0; canvas: #f0f4ed; code panel: #eaf0e6; help: #dce6da.
- Canvas CSS overrides the Blockly theme workspace background (#f7f9f5).
- Download: #344f39 with #f7f9f5 text; hover: #243e29.
- Focus outline: #547960; selected block stroke: #385d42; Blockly text: #283b2e.
- Block fill / theme edge: OUTPUT #d2e3d3 / #92ad94; INPUT #e8d8d7 / #b89d9a.
- Assignment #e4e1cc / #b8b293; selection #e9d7c4 / #ba9c7b.
- Loop #d4e2e5 / #95afb4; routine and call #d9dcd0 / #9ea88c.
- Code ink: #324c32; bold keywords: #264c33; line numbers: #6a7c65.

## Typography

- Brand and lesson heading: Sentient, Georgia, serif; other headings use the body family.
- Brand: 28px, weight 600; lesson heading: 37px, weight 500, line height 1.14.
- Body: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; base 14px.
- Block fields and code: "SFMono-Regular", Consolas, monospace; Blockly theme 12px/500.
- Preview code: 10px with 25px line height; line numbers use generic monospace.
- Sentient weights 500 and 600 currently load remotely through a Fontshare CSS import.
- Final release requirement: self-host the licensed font files; remote loading is provisional.

## Layout

- Desktop: lesson 255px, editor minmax(580px, 1fr), preview 300px; studio margin 24px.
- At 1600px and above: lesson 280px, preview 330px, block tray 190px.
- At 1190px and below: lesson/editor columns; preview spans the row below.
- At 760px and below: lesson, editor, preview stack; tray becomes a horizontal scroll row.
- Mobile tray blocks are 135px wide; studio side margins are 10px; preview scrolls horizontally.
- Workspace resizes with its host; zoom and pan keep larger programs accessible.

## Elevation & Depth

Surface tones separate the work areas. CSS removes Blockly light/dark path shading.
No CSS box shadows. Editable fields use translucent white; selection uses a 2px stroke.

## Shapes

Studio radius: 18px, reduced to 13px on mobile. Download radius: 7px.
Tray blocks have asymmetric 5px/10px corners and a small connector tab.
Workspace blocks use real Blockly Zelos connections and statement cavities.

## Components

- Real nesting: IF has THEN/ELSE statement inputs; FOR and SUB-ROUTINE have BODY inputs.
- Connected blocks generate ordered pseudocode with four-space nesting and explicit closing syntax.
- Mouse: drag from the tray into the canvas, or click to add; workspace blocks connect and move.
- Touch: tap the tray to add; native tray/page scrolling remains available through touch-action:auto.
- Tray touch input bypasses custom mouse pointer capture; arrange added blocks in Blockly.
- Live preview is read-only. Download exports pseudocode; browser storage retains the workspace.
- Help, progressive hints, Undo, Redo, zoom and fit have handlers; no fake Run control exists.
- Button color transitions last 0.16s; reduced-motion disables transitions; focus stays visible.

## Do's and Don'ts

- Preserve textbook syntax, actual block structure, legible fields and the complete production scope.
- Do not present planned text editing, execution, accounts or saved-program services as implemented.
- Do not treat this code record as browser verification or final visual approval.

## Final interface review - 2026-09-06

Reviewed the complete anti-slop rules against the app. The working pseudocode editor is the visual focus. Sentient is self-hosted under its publisher licence; body text uses the system font. Palette colours distinguish instruction roles. Controls use stable geometry and tonal states. There are no decorative glows, hero templates, entrance-hidden content, fake product panels, or ornamental icon tiles.

Desktop and phone inspection verified field centering, text contrast, padding, block nesting, readable source, dialogs, hints and output. Fixed the touch instruction wrapping into a narrow column, pale execution highlighting, and loop labels that did not follow the source syntax. Browser tests cover tablet/phone overflow, keyboard use and reduced motion. Real pointer dragging, snapping, execution and undo were also checked.
