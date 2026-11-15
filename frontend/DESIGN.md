---
version: alpha
name: deathlabs
description: Design system for deathlabs, a security software company focused on detection engineering and threat hunting. One jewel color (amethyst) on grayscale shades, in dark and light modes.
colors:
  primary: "#7526AD"
  primary-deep: "#5E188F"
  primary-rich: "#69209E"
  primary-bright: "#8531C2"
  primary-muted: "#9966CC"
  primary-glow: "#E0C2F5"
  primary-wash: "#F4EBFA"
  on-primary: "#FFFFFF"
  dark-background: "#1A1A1A"
  dark-surface: "#262626"
  dark-border: "#404040"
  dark-border-strong: "#595959"
  dark-text: "#F2F2F2"
  dark-text-secondary: "#A6A6A6"
  dark-nav-active: "#2C1C38"
  light-background: "#F2F2F2"
  light-surface: "#FFFFFF"
  light-border: "#D9D9D9"
  light-border-strong: "#A6A6A6"
  light-text: "#1A1A1A"
  light-text-secondary: "#595959"
  light-nav-active: "#F4EBFA"
typography:
  headline-lg:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 28px
    fontWeight: 500
  title-md:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 18px
    fontWeight: 500
  body-md:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
  body-md-strong:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 500
  body-sm:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 15px
    fontWeight: 400
  label-md:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 15px
    fontWeight: 500
  label-sm:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 500
  caption:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
rounded:
  sm: 6px
  md: 8px
  lg: 12px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  control-height: 44px
  sidebar-width: 220px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-md-strong}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "{spacing.control-height}"
  button-primary-hover:
    backgroundColor: "{colors.primary-bright}"
    textColor: "{colors.on-primary}"
  button-primary-active:
    backgroundColor: "{colors.primary-deep}"
    textColor: "{colors.on-primary}"
  button-outline-dark:
    backgroundColor: "transparent"
    textColor: "{colors.dark-text}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "{spacing.control-height}"
  button-outline-light:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "{spacing.control-height}"
  filter-pill-dark:
    backgroundColor: "transparent"
    textColor: "{colors.dark-text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "{spacing.control-height}"
  filter-pill-selected-dark:
    backgroundColor: "{colors.dark-nav-active}"
    textColor: "{colors.primary-glow}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "{spacing.control-height}"
  filter-pill-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "{spacing.control-height}"
  filter-pill-selected-light:
    backgroundColor: "{colors.primary-wash}"
    textColor: "{colors.primary-deep}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "{spacing.control-height}"
  severity-high:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "3px 10px"
  severity-medium-dark:
    backgroundColor: "transparent"
    textColor: "{colors.primary-glow}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "3px 10px"
  severity-medium-light:
    backgroundColor: "transparent"
    textColor: "{colors.primary-deep}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "3px 10px"
  severity-low-dark:
    backgroundColor: "transparent"
    textColor: "{colors.dark-text-secondary}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "3px 10px"
  severity-low-light:
    backgroundColor: "transparent"
    textColor: "{colors.light-text-secondary}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "3px 10px"
  table-header-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-text-secondary}"
    typography: "{typography.caption}"
    padding: "12px 16px"
  table-header-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-text-secondary}"
    typography: "{typography.caption}"
    padding: "12px 16px"
  table-row-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-text}"
    typography: "{typography.body-md}"
    padding: "14px 16px"
  table-row-selected-dark:
    backgroundColor: "{colors.dark-nav-active}"
    textColor: "{colors.dark-text}"
    typography: "{typography.body-md}"
    padding: "14px 16px"
  table-row-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-text}"
    typography: "{typography.body-md}"
    padding: "14px 16px"
  table-row-selected-light:
    backgroundColor: "{colors.primary-wash}"
    textColor: "{colors.light-text}"
    typography: "{typography.body-md}"
    padding: "14px 16px"
  identifier-dark:
    textColor: "{colors.primary-glow}"
    typography: "{typography.body-md-strong}"
  identifier-light:
    textColor: "{colors.primary-deep}"
    typography: "{typography.body-md-strong}"
  nav-item-dark:
    textColor: "{colors.dark-text-secondary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  nav-item-active-dark:
    backgroundColor: "{colors.dark-nav-active}"
    textColor: "{colors.primary-glow}"
    typography: "{typography.body-md-strong}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  nav-item-light:
    textColor: "{colors.light-text-secondary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  nav-item-active-light:
    backgroundColor: "{colors.light-nav-active}"
    textColor: "{colors.primary-deep}"
    typography: "{typography.body-md-strong}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  input-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-text}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "{spacing.control-height}"
  input-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-text}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "{spacing.control-height}"
  card-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-text}"
    rounded: "{rounded.lg}"
    padding: "18px 20px"
  card-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.lg}"
    padding: "18px 20px"
---

# deathlabs design system

## Overview

deathlabs builds security software for detection engineering and threat hunting. This system is shared by all deathlabs apps. Each app is a workspace for investigating and analyzing, so it should feel calm, precise, and evidence-first. Nothing should shout. Information density is welcome, decoration is not.

The system uses one jewel color, amethyst, on grayscale shades. Amethyst marks what the analyst can act on and what matters most: primary actions, high severity, the selected item. Everything else stays gray so the amethyst keeps its meaning. Dark and light are both first-class modes, and they share the same amethyst and the same structure. Only the grayscale surfaces and the text colors change.

All sections of the spec are present in this file, so nothing is listed as omitted.

## Colors

The palette follows one rule: one jewel color plus shades. Amethyst values sit in the jewel range (saturation 73 to 83, brightness 56 to 76) for the core steps, with two lighter tints added for text and background washes.

Amethyst ramp:

- primary (#7526AD, H275 S78 B68): the base. Primary fills, high-severity chips, and amethyst text on light surfaces.
- primary-deep (#5E188F): pressed state, and amethyst text on the lightest washes.
- primary-rich (#69209E): an intermediate step between deep and base. Defined, not used in the current screens.
- primary-bright (#8531C2): hover state for primary fills.
- primary-muted (#9966CC): a softer mid-tone. Defined, not used in the current screens. It also serves as the border for medium-severity chips in dark mode.
- primary-glow (#E0C2F5): amethyst text, links, and icons on dark surfaces, where the base is too dim.
- primary-wash (#F4EBFA): selected rows and active nav in light mode.
- on-primary (#FFFFFF): text on any amethyst fill.

Dark mode shades (all saturation 0): dark-background #1A1A1A, dark-surface #262626, dark-border #404040, dark-border-strong #595959, dark-text #F2F2F2, dark-text-secondary #A6A6A6. dark-nav-active (#2C1C38) is a deep amethyst tint used for the active nav item and the selected row.

Light mode shades (all saturation 0): light-background #F2F2F2, light-surface #FFFFFF, light-border #D9D9D9, light-border-strong #A6A6A6, light-text #1A1A1A, light-text-secondary #595959. light-nav-active is the same value as primary-wash.

Contrast to respect:

- White on primary is about 8:1, so primary fills always take on-primary text.
- primary on dark-background is only about 2.2:1. In dark mode, use primary for fills and bars, and use primary-glow for any amethyst text or thin icon.
- primary on white is about 8:1, so amethyst works as text and as an outline on light surfaces.
- Secondary text is about 6:1 on dark-surface and about 7:1 on light-surface.

Mode tokens use the dark- and light- prefixes. A screen uses one set or the other, never both.

## Typography

One family, Inter, at two weights: 400 for reading text and 500 for emphasis. No bold beyond 500. Use sentence case everywhere.

- headline-lg (28px, 500): the page title.
- title-md (18px, 500): card titles and the wordmark.
- body-md (16px, 400): default text, table cells, inputs.
- body-md-strong (16px, 500): record identifiers, the active nav item, the page-level primary button.
- body-sm (15px, 400): unselected filter pills.
- label-md (15px, 500): buttons inside content areas and selected filter pills.
- label-sm (14px, 500): severity chips.
- caption (14px, 400): table column headers.

## Elevation & Depth

The system is flat. There are no shadows. Depth comes from two things: stepping the surface lighter than the background (dark-background to dark-surface, light-background to light-surface), and a 0.5px border in dark-border or light-border on cards and tables.

The selected row and the active nav item are marked with a tinted fill, not with elevation and not with a side accent.

## Shapes

Corners are rounded, never sharp. Scale: sm 6px, md 8px, lg 12px, full for pills.

- sm: the small amethyst brand mark in the sidebar.
- md: buttons, nav items, and inputs.
- lg: cards and the table container.
- full: severity chips and filter pills.

## Components

Every component has a dark and a light variant, named with a -dark or -light suffix. Border colors are not expressible in the token schema, so they are listed here.

Buttons:

- button-primary is the single main action on a screen, with hover (primary-bright) and active (primary-deep) states. Those two states come from the amethyst ramp and are not drawn in the screens.
- button-outline-dark has a 1px dark-border-strong border and dark-text label. button-outline-light has a 1px primary border and a primary label.
- Filter pills: unselected pills use a 1px border (dark-border-strong or light-border-strong). Selected pills use a 1px primary border with the nav-active fill and an amethyst label.

Severity chips: three levels, distinguished by fill and outline as well as color, so they read without relying on hue.

- High: solid primary fill with white text.
- Medium: transparent with a 1px outline. In dark mode the border is primary-muted and the text is primary-glow. In light mode the border is primary and the text is primary-deep.
- Low: transparent with a gray 1px outline (dark-border-strong or light-border-strong) and secondary text.

Status markers sit left of the status label and use shape, not just color:

- In progress: a solid 8px dot (for example, Investigating).
- Pending: an 8px ring with a 1.5px stroke (for example, Awaiting review).
- Complete: a small check mark (for example, Contained or Recovered).

Status labels are chosen per app. The shapes carry the meaning.

The marker color is primary-glow in dark mode and primary in light mode.

Table and rows: the table sits in a card with a header row (caption text) and rows separated by 0.5px borders. The selected row uses the nav-active fill. Identifiers such as record or host IDs use identifier-dark or identifier-light. Metadata columns use secondary text.

Navigation, input, and cards:

- Nav items are plain text in secondary color. The active item uses the nav-active fill and amethyst text in 500 weight.
- The search field is a 0.5px bordered box (dark-border-strong or light-border-strong) with a magnifier icon and secondary-colored icon stroke.
- Cards use the surface fill, a 0.5px border, lg corners, and 18px by 20px padding.

## Do's and Don'ts

Do:

- Keep amethyst scarce so it keeps its meaning.
- Use on-primary text on every amethyst fill.
- Use primary-glow for amethyst text and icons in dark mode.
- Differentiate severity and status by fill, outline, and shape as well as color.
- Keep controls at least 44px tall.
- Use sentence case for all labels, buttons, and headings.

Don't:

- Don't add a second hue. Warm or cool accents would compete with amethyst.
- Don't use primary as text on dark surfaces. It fails contrast.
- Don't add shadows, gradients, or glow effects.
- Don't use font weights above 500.
- Don't use a colored left border as an accent on cards or rows.
- Don't rely on color alone to show severity or status.
- Don't mix dark- and light- tokens on the same screen.
