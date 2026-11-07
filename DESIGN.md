---
name: Classic Giga
description: School management for Indian K-12 schools, kept like a well-run register.
colors:
  register-green: "#047857"
  register-green-deep: "#065f46"
  register-green-bright: "#059669"
  register-green-wash: "#ecfdf5"
  register-green-rule: "#a7f3d0"
  ink: "#0f172a"
  ink-strong: "#1e293b"
  ink-body: "#334155"
  ink-muted: "#64748b"
  ink-faint: "#94a3b8"
  hairline: "#e2e8f0"
  hairline-soft: "#f1f5f9"
  canvas: "#f8fafc"
  surface: "#ffffff"
  register-paper: "#fffdf7"
  register-ruling: "#f1eee6"
  pending-wash: "#fffbeb"
  pending-rule: "#fde68a"
  pending-ink: "#92400e"
  alert-wash: "#fff1f2"
  alert-rule: "#fecdd3"
  alert-ink: "#9f1239"
typography:
  page-title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  section-title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
  body-compact:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.5
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.05em"
  figure:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
  register-title:
    fontFamily: "ui-serif, Georgia, Cambria, serif"
    fontSize: "1.25rem"
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: "-0.025em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.register-green}"
    textColor: "{colors.surface}"
    typography: "{typography.body-compact}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.register-green-deep}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-body}"
    typography: "{typography.body-compact}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-secondary-hover:
    backgroundColor: "{colors.canvas}"
  input-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-strong}"
    typography: "{typography.body-compact}"
    rounded: "{rounded.lg}"
    padding: "8px 14px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "20px"
  nav-item:
    textColor: "{colors.ink-muted}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "10px 14px"
  nav-item-active:
    backgroundColor: "{colors.register-green-wash}"
    textColor: "{colors.register-green-deep}"
  badge-active:
    backgroundColor: "{colors.register-green-wash}"
    textColor: "{colors.register-green}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  badge-pending:
    backgroundColor: "{colors.pending-wash}"
    textColor: "{colors.pending-ink}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  badge-alert:
    backgroundColor: "{colors.alert-wash}"
    textColor: "{colors.alert-ink}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
---

# Design System: Classic Giga

## Overview

**Creative North Star: "The School Register"**

Classic Giga should feel like a school office's best-kept register: paper-clear, ordered, and written in green ink that carries authority. Each screen is a page of records. Its job is to show what stands, who entered it, and what can happen next. The interface is calm because the work is serious: attendance becomes a legal record, marks reach parents, and fees have to reconcile.

Screens are dense but well organized. Office staff and teachers work through lists of students, sections and invoices, so the system uses small, firm type, white sheets on a pale slate desk, and thin dividing lines rather than heavy panels. Green is used sparingly as the ink of authority: the main action, the current page, a confirmed state. The rest stays in slate.

One place breaks the plainness on purpose. The **register notebook** (cream ruled paper, serif title, green spine) marks a real record book. It belongs only to register-like records and is never used as decoration.

The dark zinc-and-indigo look on the landing, login, registration, password-reset and invitation pages, and the dark purple platform console, are **legacy drift**. They predate this system and should be brought into the light register world when they are next touched.

**Key Characteristics:**

- Light slate canvas, white working sheets, hairline borders.
- One brand hue: register green. Amber and rose appear only as status.
- Small, bold Geist Sans; Geist Mono for identifiers and amounts.
- Flat by default; motion and lift only communicate state.
- A single tactile signature, the paper register, kept for records.

## Colors

A slate-ink-on-paper palette with one authoritative green and two status inks.

### Primary

- **Register Green** (`register-green`): the ink of authority. Primary buttons, confirmed or active states, focus borders, key links. On any screen it should cover about a tenth of the area or less.
- **Register Green Deep** (`register-green-deep`): hover and pressed state for primary actions, active nav text, the register spine.
- **Register Green Bright** (`register-green-bright`): small accents only: the active-nav pill bar, icon tiles, the active underline. Never body text.
- **Register Green Wash** (`register-green-wash`) and **Rule** (`register-green-rule`): background and border for active nav items, approved/present/paid badges, and success notices.

### Neutral

- **Ink** (`ink`): page titles, primary figures, names.
- **Ink Strong** (`ink-strong`): input text and emphasized row content.
- **Ink Body** (`ink-body`): default body and table text, secondary button labels.
- **Ink Muted** (`ink-muted`): supporting text, subtitles, inactive nav.
- **Ink Faint** (`ink-faint`): placeholders, disabled text, decorative icons. It is too low in contrast for information.
- **Hairline** (`hairline`) and **Hairline Soft** (`hairline-soft`): card borders and internal row dividers respectively.
- **Canvas** (`canvas`): the app background (the desk) and table header strips.
- **Surface** (`surface`): cards, modals, sidebar (the sheet).

### Register Paper (signature only)

- **Register Paper** (`register-paper`) with **Register Ruling** (`register-ruling`) lines every 28px: the inside page of a register notebook. Used nowhere else.

### Status

- **Pending** (`pending-wash` / `pending-rule` / `pending-ink`): draft, pending, late, partially paid, awaiting review.
- **Alert** (`alert-wash` / `alert-rule` / `alert-ink`): absent, rejected, due, cancelled, reversed, destructive confirmation.
- Active / approved / present / paid use the Register Green wash, rule and ink.

### Named Rules

**The Green Ink Rule.** Register Green means authority or a confirmed state. Don't use it for decoration, illustration fills, or gradients on stat cards.

**The Status Is Semantic Rule.** Amber always means "not yet final"; rose always means "missing, owed, or undone." Never use either for branding, roles, or emphasis.

**The Role Badge Rule.** Role hues (school admin emerald, teacher blue, accountant amber, platform admin purple) appear only in role badges and avatars. They never color buttons, nav items, page chrome, or sidebar labels such as "PRIMARY".

## Typography

**Body Font:** Geist Sans (system sans-serif fallback), loaded via `next/font` as `--font-geist-sans`.
**Figure Font:** Geist Mono, for admission numbers, APAAR IDs, receipt numbers (`REC-YYYYMMDD-XXXX`), and amounts.
**Register Font:** the system serif stack, inside the register notebook only.

**Character:** a compact, heavy-weighted sans that reads like printed office forms. The serif appears only where a page is meant to look like a hand-kept book.

### Hierarchy

- **Page Title** (`page-title`): one per page, top-left of the main column. It may scale up one step at `sm` and above.
- **Section Title** (`section-title`): card headers and modal titles.
- **Body** (`body`): navigation, prose and explanatory text.
- **Body Compact** (`body-compact`): the working size for tables, form fields, buttons and badges. It is the most-used size in the app and suits dense records.
- **Label** (`label`): uppercase, tracked. Table headers, stat-card captions, field group headings.
- **Figure** (`figure`): Geist Mono for identifiers and money. Stat values use the Page Title style at heavy weight.
- **Register Title** (`register-title`): serif, used only for the class/section name on a register notebook.

### Named Rules

**The Mono for Records Rule.** Any value a person might read aloud to check, such as an ID, receipt number or amount in ₹, is set in Geist Mono so digits line up and can be compared.

**The Serif Is a Book Rule.** Serif type appears only inside a register notebook. A serif heading anywhere else is drift.

## Layout

The app shell is a fixed left sidebar (256px, collapsing to 80px on desktop, off-canvas below `md`) beside a top header and a centered main column capped at `max-w-7xl` (1280px). The main column's padding steps from 16px to 24px to 32px across `sm` and `lg` and leaves 96px of bottom space; sections stack with a 24px gap.

Spacing follows a 4px grid. Controls use 8px vertical by 14–16px horizontal padding; cards use 20px; modals use 24px with a 16px header band; table cells use 12–14px vertical by 16–20px horizontal. Gaps within rows are 6–12px.

Stat cards sit in responsive grids, one column on mobile and up to four on desktop. Tables scroll horizontally inside their card rather than breaking the page. Modals are centered, default to `max-w-2xl`, and cap their body at 85vh with internal scroll.

## Elevation & Depth

Flat by default. Depth comes from tone: the white sheet on the slate canvas, with a hairline border, does the work. Cards carry at most a barely-there resting shadow. Real elevation is reserved for things that float above the page: modals, menus and the mobile sidebar, each with a dimmed, lightly blurred slate backdrop.

### Shadow Vocabulary

- **Sheet** (`box-shadow: 0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px -1px rgba(0,0,0,0.05)`, token `--shadow-card`): resting cards.
- **Raised Sheet** (`box-shadow: 0 10px 15px -3px rgba(0,0,0,0.07), 0 4px 6px -4px rgba(0,0,0,0.05)`, token `--shadow-card-hover`): hover on a card that opens something.
- **Notebook** (`box-shadow: 0 4px 20px -2px rgba(0,0,0,0.08), 0 2px 6px -1px rgba(0,0,0,0.04)`): the register notebook at rest.
- **Overlay** (Tailwind `shadow-2xl`): modals and dialogs only.

### Named Rules

**The Flat Desk Rule.** Surfaces rest flat. A card lifts (at most 2px) only when clicking it opens something. Colored glows such as `shadow-emerald-glow` and `hover:scale` on buttons are retired.

## Shapes

Gently rounded, consistent corners. Controls (buttons, inputs, nav items) use 12px; cards and modals use 16px; small chips and icon buttons use 8px; status and role badges are full pills. Borders are 1px hairlines in `hairline`, softened to `hairline-soft` for dividers inside a card. The only non-rectangular silhouette is the notebook's spine with its spiral rings.

## Components

### Buttons

Firm and quiet: solid, compact, no flourish.

- **Shape:** gently rounded (12px).
- **Primary:** Register Green fill, white Body Compact text, 8px × 16px padding. Hover deepens to Register Green Deep. Disabled drops to 50% opacity with a not-allowed cursor.
- **Secondary:** white fill, hairline border, Ink Body text. Hover shifts to the Canvas tint.
- **Destructive:** Alert Ink fill with a white label, used only in confirmation dialogs.
- **Loading:** a spinning icon replaces or precedes the label and the button stays disabled. Required on every async action.
- **Focus:** a visible 2px Register Green ring at 20% alpha. Never rely on `outline-none` alone.

### Badges / Chips

- **Style:** pill, 1px tinted border, wash background, deep ink text (Body Compact; Label size at `sm`).
- **Semantic variants:** active/present/paid (green), pending/late/partial (amber), absent/due/cancelled (rose), default (slate).
- **Role badges:** follow the Role Badge Rule.

### Cards / Containers

- **Corner Style:** 16px.
- **Background:** Surface on Canvas.
- **Shadow Strategy:** Sheet at rest (see Elevation).
- **Border:** hairline, at 80% alpha on stat cards.
- **Internal Padding:** 20px; header bands use Canvas at 50–60% with a soft divider.
- **Stat Card:** uppercase Label caption, heavy figure, muted subtitle, 44px icon tile on the right. Stat cards are plain white; the gradient variants are legacy.

### Inputs / Fields

- **Style:** white (or Canvas inside dense forms) with a hairline border, 12px radius, 8px × 14px padding, Body Compact text, Ink Faint placeholder.
- **Focus:** the border turns Register Green and a soft 20% green ring appears.
- **Error:** Alert Rule border with an Alert Ink message beneath. **Disabled:** Canvas fill, Ink Faint text.
- Every field has a visible `<label>` or an `aria-label`.

### Navigation

- **Sidebar:** white with a right hairline. The brand block sits in a 64px header. Items use 14px text with 20px Lucide icons (1.75 stroke, 2.2 when active).
- **States:** inactive items are Ink Muted; hover adds a Canvas tint. The active item gets a Register Green Wash background, Register Green Deep text and a 6px green pill bar on the trailing edge.
- **Mobile:** the sidebar slides in over a dimmed backdrop. Collapsed desktop mode shows icons with tooltips.

### Tables

- Header strip in Canvas with uppercase Label text in Ink Muted. Rows are divided by Hairline Soft, and hovering a row tints it Canvas.
- Identifier and money columns are set in Geist Mono and right-aligned where numeric.

### Modal

- Centered sheet, 16px radius, Overlay shadow, over a 50% slate backdrop with a small blur.
- Title band in Section Title style with a close icon button. Escape closes it; focus moves into the dialog and returns to the trigger.

### Register Notebook (signature)

The register for one class and section, drawn as a bound book: a 48–56px green spine (Register Green Deep gradient) with spiral rings, a Register Paper page ruled every 28px, a tracked serif eyebrow, a Register Title for the class name, and a footer showing who is responsible plus a green action chip. On hover it lifts 4px with a green-tinted Notebook shadow. Use it only for register-like records: attendance registers, mark sheets, and possibly receipt books.

## Do's and Don'ts

### Do:

- **Do** keep every app screen on the Canvas desk with white Surface sheets and hairline borders.
- **Do** use Register Green for the one primary action per view and for confirmed states, and nothing else.
- **Do** map workflow states to the fixed status inks: green for final, amber for pending or draft, rose for missing, owed or undone.
- **Do** set IDs, receipt numbers and ₹ amounts in Geist Mono.
- **Do** show a loading state on every async button and a visible focus ring on every control.
- **Do** bring legacy dark zinc/indigo pages (landing, login, register-school, forgot-password, accept-invitation) and the purple platform console into this light register world when you next touch them.

### Don't:

- **Don't** introduce indigo, purple or blue as interface accents. Indigo-on-zinc is the legacy look being retired.
- **Don't** use role colors outside role badges and avatars.
- **Don't** use the cream paper, serif type or spiral spine outside register-like records.
- **Don't** add gradient stat cards, colored glow shadows, or `hover:scale` on buttons.
- **Don't** use Ink Faint for information a user needs to read; it is for placeholders and decoration.
- **Don't** fall back to Arial: the `body` rule in `globals.css` still names it, but the app font is Geist Sans.
