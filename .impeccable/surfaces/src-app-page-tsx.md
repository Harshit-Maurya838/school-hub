---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: []
---

# Landing page (`/`)

Mode: Persuade. Visitor: a principal or school owner deciding whether to adopt; existing users sign in (secondary). Action: Register your school (`/auth?tab=register`); signed-in visitors go to their dashboard. Proof: the product at work, shown as labelled demo records (synthetic data). No customers, testimonials, metrics or pricing exist; invent none. Avoid: startup/SaaS hype (gradients, AI sparkle, buzzwords) and anything childish.

Chosen structure: the register's index page. Memorable moment: an index entry opening in place to show the live record behind it.

Exception approved by the user's choice: the register notebook signature (paper, ruling, serif, green spine) carries the whole landing page, because the page is the school's book. It stays out of app screens.

## Direction contract

THESIS: The landing page is the school's own bound register opened to its index; each module is a ruled entry that opens its real record in place. It refuses the hero-over-feature-cards SaaS page.

OWN-WORLD: Register Paper ground ruled every 32px in Register Ruling, a Register Green Deep spine with pale rings, Libre Caslon Text (self-hosted via next/font) for titles and the running head, Geist for body, Geist Mono for page numbers, IDs, receipts and ₹. Green ink only for the action and confirmed states; amber and rose only as status. Dotted leaders, hairline rules, no cards on cards.

STORY: The principal sees this is a school's register, made complete: registers lock, marks are reviewed, receipts are numbered, every correction is signed. They open entries, see the record, and register their school as the book's next entry.

FIRST VIEWPORT: An open book: spine left, title page (running head with brand and nav, a foot folio with the session, serif headline, lede, Register your school + Sign in), facing index page with seven entries (six modules + "Your school" as the green next entry) on dotted leaders to page numbers. Primary action bottom-left of the title page.

FORM: Register index, position 5 of 7 on the ordered list; seed:a1feeb50174f0547. Signature interaction: clicking an index entry turns the facing page to that entry's record (synthetic demo), with a lock or status stamp; reduced motion swaps without the turn.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
