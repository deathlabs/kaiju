---
name: Starter App
colors:
  primary: "#2563eb"
  primary-hover: "#1d4ed8"
  background: "#ffffff"
  surface: "#f8fafc"
  border: "#e2e8f0"
  text: "#0f172a"
  text-muted: "#64748b"
  on-primary: "#ffffff"
  dark-primary: "#1e5a8a"
  dark-secondary: "#4f6d7a"
  accent: "#f2a541"
  accent-light: "#f5b767"
  accent-dark: "#a9732e"
  dark-background: "#0f1720"
  dark-surface: "#17212b"
  dark-text: "#e6ecf2"
  dark-text-muted: "rgba(230, 236, 242, 0.6)"
  on-accent: "rgba(0, 0, 0, 0.87)"
typography:
  h1:
    fontFamily: Inter
    fontSize: 2.25rem
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
rounded:
  md: 6px
spacing:
  sm: 8px
  md: 16px
  lg: 24px
components:
  app:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
  app-dark:
    backgroundColor: "{colors.dark-background}"
    textColor: "{colors.dark-text}"
    typography: "{typography.body}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: 12px
  button-primary-dark:
    backgroundColor: "{colors.dark-primary}"
    textColor: "{colors.dark-text}"
    rounded: "{rounded.md}"
    padding: 12px
  button-secondary-dark:
    backgroundColor: "{colors.dark-secondary}"
    textColor: "{colors.dark-text}"
    rounded: "{rounded.md}"
    padding: 12px
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.md}"
    padding: 12px
  button-accent-light:
    backgroundColor: "{colors.accent-light}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.md}"
    padding: 12px
  button-accent-dark:
    backgroundColor: "{colors.accent-dark}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.md}"
    padding: 12px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  card-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-text}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  divider:
    backgroundColor: "{colors.border}"
    height: 1px
  text-muted:
    textColor: "{colors.text-muted}"
    typography: "{typography.body}"
  text-muted-dark:
    textColor: "{colors.dark-text-muted}"
    typography: "{typography.body}"
---

## Overview

Calm, professional, and spacious. Prioritize readability and clear hierarchy in both color modes.

## Colors

Use primary for CTAs and accent for emphasis. Use the matching surface and text tokens for each mode.

Use dark mode by default. Keep the selected mode only for the current page session and reset it after a reload.

## Typography

Inter for headings and body. Avoid mixing extra families without tokens.

## Layout

* Use the spacing scale in front matter. Default stack gap: `{spacing.md}`.
* For modals, put buttons that save or modify data on the bottom left of the modal. On the right of these buttons, put cancel. On the far right of the modal, when applicable, put the delete button and only use the word "Delete". 

## Components

Primary button, card, and text tokens drive generated UI.

Use token references instead of raw color values.

## Do's and Don'ts

* Do apply one color mode consistently to the complete interface.
* Do list intentional gaps under `omitted` instead of ignoring warnings.
* Do run `npx @google/design.md lint DESIGN.md` before merging.
* Don't mix light surfaces with the dark theme tokens.
* Don't put the real palette only as `--color-*` bullets in Markdown.
