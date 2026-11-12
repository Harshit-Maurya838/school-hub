---
name: Academix AI
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
  register-gutter: "#ebe5d6"
  register-seam: "#e7e1d3"
  desk: "#e7ebef"
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
  book-display:
    fontFamily: "Libre Caslon Text, var(--font-register), Georgia, serif"
    fontSize: "4.1rem"
    fontWeight: 700
    lineHeight: 1.06
    letterSpacing: "-0.02em"
  book-title:
    fontFamily: "Libre Caslon Text, var(--font-register), Georgia, serif"
    fontSize: "1.75rem"
    fontWeight: 400
    lineHeight: "32px"
  book-numeral:
    fontFamily: "Libre Caslon Text, var(--font-register), Georgia, serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "32px"
  index-entry:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: "32px"
  book-lede:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: "32px"
  book-body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "32px"
  book-gloss:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "32px"
  folio:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: "32px"
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
  rule: "32px"
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
  stamp-final:
    textColor: "{colors.register-green}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "4px 12px"
  stamp-pending:
    textColor: "{colors.pending-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "4px 12px"
---

# Design System: Academix AI

## Overview

**Creative North Star: "The School Register"**

Academix AI should feel like a school office's best-kept register: paper-clear, ordered, and written in green ink that carries authority. Each screen is a page of records. Its job is to show what stands, who entered it, and what can happen next. The interface is calm because the work is serious: attendance becomes a legal record, marks reach parents, and fees have to reconcile.

Screens are dense but well organized. Office staff and teachers work through lists of students, sections and invoices, so the system uses small, firm type, white sheets on a pale slate desk, and thin dividing lines rather than heavy panels. Green is used sparingly as the ink of authority: the main action, the current page, a confirmed state. The rest stays in slate.

One place breaks the plainness on purpose. The **register notebook** (cream ruled paper, serif title, green spine) marks a real record book. It belongs only to register-like records and is never used as decoration.

The **landing page** is the one approved place where the notebook carries a whole surface, because the landing page is the school's own bound register: one green spine, ruled cream pages on a cool desk, a printed serif, an index, and records that open in place. App screens never borrow it.

The public pages around it (sign-in and registration, password reset, invitation acceptance) and the platform console now sit in the light world on the Canvas desk. Any dark zinc-and-indigo or purple chrome that turns up is legacy drift.

**Key Characteristics:**

- Light slate canvas, white working sheets, hairline borders.
- One brand hue: register green. Amber and rose appear only as status.
- Small, bold Geist Sans; Geist Mono for identifiers and amounts.
- Flat by default; motion and lift only communicate state.
- A single tactile signature, the paper register, kept for records and for the landing page, which is the school's book.

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

- **Register Paper** (`register-paper`) with **Register Ruling** (`register-ruling`): the inside page of a register. On the app's register notebook cards the ruling runs every 28px; on the landing page it runs every 32px (the `rule` step), lifted 5px so text baselines sit on the lines. Used nowhere else in the app; the landing page is the one approved exception.
- **Register Gutter** (`register-gutter`): the warm shade where two landing pages meet the gutter, and the shadow at the edge of a turning page.
- **Register Seam** (`register-seam`): the 1px line between landing spreads and between stacked pages on phones.
- **Desk** (`desk`): the cool grey surface the landing book lies on. Landing page only; app screens use Canvas.

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
**Register Font:** the system serif stack on the app's register notebook cards; **Libre Caslon Text** (self-hosted via `next/font`, variable `--font-register`, 400 and 700 with italic) on the landing page.

**Character:** a compact, heavy-weighted sans that reads like printed office forms. The serif appears only where a page is meant to look like a hand-kept book.

### Hierarchy

- **Page Title** (`page-title`): one per page, top-left of the main column. It may scale up one step at `sm` and above.
- **Section Title** (`section-title`): card headers and modal titles.
- **Body** (`body`): navigation, prose and explanatory text.
- **Body Compact** (`body-compact`): the working size for tables, form fields, buttons and badges. It is the most-used size in the app and suits dense records.
- **Label** (`label`): uppercase, tracked. Table headers, stat-card captions, field group headings.
- **Figure** (`figure`): Geist Mono for identifiers and money. Stat values use the Page Title style at heavy weight.
- **Register Title** (`register-title`): serif, used only for the class/section name on a register notebook.

Landing page only (the book's ramp, every line on the 32px rule):

- **Book Display** (`book-display`): the title-page headline and the closing line, bold Caslon at 4.1rem on desktop down to 2.6rem on phones (the closing line steps 2.25rem to 3rem). Padded to the next whole rule so the text after it writes on the ruling again.
- **Book Title** (`book-title`): section and record titles, regular Caslon on one 32px line.
- **Index Entry** (`index-entry`): Geist bold, 18px on phones and 20px from `sm`, with a Caslon italic numeral (`book-numeral`) before it and a dotted leader to its page number.
- **Book Lede / Body / Gloss** (`book-lede` 17px, `book-body` 15px, `book-gloss` 13px): the landing's body steps. They are not app sizes.
- **Folio** (`folio`): Geist Mono for page numbers, the session, record references and ₹.

### Named Rules

**The Mono for Records Rule.** Any value a person might read aloud to check, such as an ID, receipt number or amount in ₹, is set in Geist Mono so digits line up and can be compared.

**The Serif Is a Book Rule.** Serif type appears only inside a register notebook or on the landing page's book. A serif heading anywhere else is drift.

**The Write on the Rule Rule.** On the landing page every line box is 32px or a whole multiple of it, and every vertical gap is a multiple of 32px. Anything taller than a line (a display heading, a stamp) is padded or overhangs so the lines below stay on the ruling.

## Layout

The app shell is a fixed left sidebar (256px, collapsing to 80px on desktop, off-canvas below `md`) beside a top header and a centered main column capped at `max-w-7xl` (1280px). The main column's padding steps from 16px to 24px to 32px across `sm` and `lg` and leaves 96px of bottom space; sections stack with a 24px gap.

Spacing follows a 4px grid. Controls use 8px vertical by 14–16px horizontal padding; cards use 20px; modals use 24px with a 16px header band; table cells use 12–14px vertical by 16–20px horizontal. Gaps within rows are 6–12px.

The landing page is one book, capped at 1320px and inset 12–24px on the Desk. A single 56px spine runs the full height on the left at `lg`; below `lg` it becomes a 24px band across the top. Each section is a spread of two pages (one column below `lg`), padded 24px / 40px / 56px horizontally and 32px or 64px vertically. All vertical rhythm is in 32px units. The first spread fills the viewport up to 864px.

Stat cards sit in responsive grids, one column on mobile and up to four on desktop. Tables scroll horizontally inside their card rather than breaking the page. Modals are centered, default to `max-w-2xl`, and cap their body at 85vh with internal scroll.

## Elevation & Depth

Flat by default. Depth comes from tone: the white sheet on the slate canvas, with a hairline border, does the work. Cards carry at most a barely-there resting shadow. Real elevation is reserved for things that float above the page: modals, menus and the mobile sidebar, each with a dimmed, lightly blurred slate backdrop.

### Shadow Vocabulary

- **Sheet** (`box-shadow: 0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px -1px rgba(0,0,0,0.05)`, token `--shadow-card`): resting cards.
- **Raised Sheet** (`box-shadow: 0 10px 15px -3px rgba(0,0,0,0.07), 0 4px 6px -4px rgba(0,0,0,0.05)`, token `--shadow-card-hover`): hover on a card that opens something.
- **Notebook** (`box-shadow: 0 4px 20px -2px rgba(0,0,0,0.08), 0 2px 6px -1px rgba(0,0,0,0.04)`): the register notebook at rest.
- **Overlay** (Tailwind `shadow-2xl`): modals and dialogs only.
- **Book** (`box-shadow: 0 30px 60px -24px rgba(15,23,42,0.28), 0 8px 18px -8px rgba(15,23,42,0.12)`): the landing book on its desk. Landing page only.
- **Gutter Shade** (`box-shadow: inset ∓18px 0 22px -20px rgba(70,52,20,0.22)`): the inner edge of each landing page at `lg`, where it curves into the gutter.

### Named Rules

**The Flat Desk Rule.** Surfaces rest flat. A card lifts (at most 2px) only when clicking it opens something. Colored glows such as `shadow-emerald-glow` and `hover:scale` on buttons are retired.

## Shapes

Gently rounded, consistent corners. Controls (buttons, inputs, nav items) use 12px; cards and modals use 16px; small chips and icon buttons use 8px; status and role badges are full pills. Borders are 1px hairlines in `hairline`, softened to `hairline-soft` for dividers inside a card. The only non-rectangular silhouette is the notebook's spine with its spiral rings. The landing book is a single 16px-rounded block with no cards inside it; its pages are separated only by seams.

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

### Landing Book (signature, landing page only)

The whole landing page drawn as the school's bound register.

- **Spine:** one continuous Register Green Deep spine, darkened at both edges, with pale Register Green Rule rings at a fixed 96px pitch. It runs down the left at `lg` and across the top on phones.
- **Pages:** Register Paper ruled every 32px, with the rule lifted 5px. Running heads and folios are one 32px line each: the brand and nav on the title page, the session and `p. i` at the foot.
- **Index:** entries are buttons. Each has an italic Caslon numeral, a bold Geist title, a dotted leader on the title baseline (1px slate dots at an 8px pitch), and a Geist Mono `p. N` in Register Green. A 13px gloss sits on the next line. The final entry, "Your school", is the green next entry and links to registration.
- **Records:** opening an entry turns the facing page to a demo record set on 32px rows. Its numbers use Geist Mono, and totals may roll in with NumberRoll.
- **Stamps:** office rubber stamps. 11px black uppercase type tracked 0.12em, a 2px border plus a 1px outline offset 2px in the same ink, 6px corners, rotated −6deg, multiply blend. Green (Register Green) for final, amber (Pending Ink) for pending. A stamp overhangs its ruled line rather than pushing the lines apart.
- **FAQ:** the Hairline FaqAccordion, restyled through `className` onto the ruling with no borders of its own: 16px semibold questions and 15px answers, all on 32px lines.
- **Actions:** the Primary Button at 15px (12px radius, 20px × 12px) next to an underlined text link for Sign in.
- **Motion:** the signature is a page turn. The new page is revealed by a clip-path from the gutter outward over 620ms `cubic-bezier(0.16,1,0.3,1)`, with a Register Gutter shade that fades out across its leading edge. The stamp then lands (420ms, same curve, 380ms delay), dropping from 1.35× scale with a slight blur. Both are off under `prefers-reduced-motion`, so the page simply swaps. Focus moves to the record title, or back to the entry the reader came from.

## Do's and Don'ts

### Do:

- **Do** keep the logo's blue to the logo and the "AI" of the wordmark. The infinity-ribbon mark is the brand's one blue; interface accents stay Register Green.
- **Do** keep every app screen on the Canvas desk with white Surface sheets and hairline borders.
- **Do** use Register Green for the one primary action per view and for confirmed states, and nothing else.
- **Do** map workflow states to the fixed status inks: green for final, amber for pending or draft, rose for missing, owed or undone.
- **Do** set IDs, receipt numbers and ₹ amounts in Geist Mono.
- **Do** show a loading state on every async button and a visible focus ring on every control.
- **Do** keep public pages (sign-in, registration, password reset, invitation) on the Canvas desk through the shared public shell.
- **Do** keep every line and gap on the landing page in 32px units, and snap any display heading to whole rules.

### Don't:

- **Don't** introduce indigo, purple or blue as interface accents. Indigo-on-zinc is the legacy look being retired.
- **Don't** use role colors outside role badges and avatars.
- **Don't** use the cream paper, serif type or spine outside register-like records and the landing page's book. App screens never take the landing book's paper, Caslon or desk.
- **Don't** add gradient stat cards, colored glow shadows, or `hover:scale` on buttons.
- **Don't** use Ink Faint for information a user needs to read; it is for placeholders and decoration.
- **Don't** fall back to Arial: the app font is Geist Sans, as the `body` rule in `globals.css` sets.
