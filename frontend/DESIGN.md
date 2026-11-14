---
name: Starter App
colors:
  primary: "#2563eb"
  primary-hover: "#1d4ed8"
  surface: "#f8fafc"
  border: "#e2e8f0"
  text: "#0f172a"
  text-muted: "#64748b"
  on-primary: "#ffffff"
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
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: 12px
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
---

## Overview

Calm, professional, and spacious. Prioritize readability and clear hierarchy.

## Colors

Primary for CTAs; surface for cards; keep text/muted from the token map.

## Typography

Inter for headings and body. Avoid mixing extra families without tokens.

## Layout

Use the spacing scale in front matter. Default stack gap: `{spacing.md}`.

## Components

Primary button and card tokens drive generated UI. Prefer refs over raw hex.

## Do's and Don'ts

- Do run `npx @google/design.md lint DESIGN.md` before merging
- Don't put the real palette only as `--color-*` bullets in Markdown
- Do list intentional gaps under `omitted` instead of ignoring warnings
