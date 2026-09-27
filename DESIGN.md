---
name: E7 decision folio
description: A precise financial working surface that keeps inputs, evidence and outcomes distinguishable.
colors:
  paper: "#ffffff"
  ground: "#edf1f5"
  wash: "#f5f7fa"
  ink: "#14263c"
  muted: "#516177"
  rule: "#d4dce6"
  action: "#194dc4"
  action-hover: "#113b9c"
  action-wash: "#eaf0ff"
  note: "#fbf0c5"
  note-ink: "#5a4510"
  positive: "#12604e"
  negative: "#a33337"
  ledger: "#19354a"
  ledger-ink: "#f1f6fa"
  ledger-muted: "#c0d0dd"
  dark-paper: "#182737"
  dark-ground: "#101c28"
  dark-wash: "#203142"
  dark-ink: "#eef4f9"
  dark-muted: "#b2c3d2"
  dark-rule: "#3b5064"
  dark-action: "#9cbcff"
  dark-action-wash: "#253b5a"
  dark-note: "#403a25"
  dark-note-ink: "#f5dfa0"
  dark-negative: "#ffb3b4"
  dark-ledger: "#213e53"
  celebrate: "#0d7a57"
  celebrate-wash: "#e2f7ee"
  warm: "#b3402a"
  warm-wash: "#fff0ea"
  hero-gain: "#0d6f51"
  hero-loss: "#a23a28"
  hero-even: "#24465f"
  dark-celebrate: "#6fe0b4"
  dark-warm: "#ffab94"
typography:
  display:
    fontFamily: "Public Sans, Segoe UI, sans-serif"
    fontSize: "clamp(2.9rem, 5vw, 4.8rem)"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Public Sans, Segoe UI, sans-serif"
    fontSize: "clamp(1.8rem, 3vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Public Sans, Segoe UI, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Public Sans, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Public Sans, Segoe UI, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 700
rounded:
  control: "5px"
  compact: "3px"
  tile: "8px"
  navigation: "10px"
  illustration: "12px"
  folio: "16px"
  pill: "24px"
spacing:
  tight: "8px"
  control: "12px"
  group: "20px"
  panel: "24px"
  section: "36px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "10px 17px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
    textColor: "{colors.paper}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 17px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    height: "46px"
  panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "24px"
---

# Design system: E7 decision folio

## Overview

**Creative North Star: "The decision folio"**

The visual system borrows the directness of a procurement comparison docket: a working sheet, a fixed index, a separate financial ledger and annotations that explain what needs review. It replaces the previous violet/teal card-based identity. It does not imitate a Microsoft product or imply Microsoft endorsement.

The physical scene is an IT and finance review at a desk, under normal office light; the light palette reads as a clear working sheet. The dark palette preserves the same hierarchy for lower-light use, without neon effects or different financial semantics.

**Delight thesis:** turning a tangle of paid tools into a clear plan should feel like arranging the pieces of a toolkit, not completing a tax return. Keep the working folio's colors and financial seriousness; let the example illustration and the inventory's navigation carry the playfulness.

**Key Characteristics:**
- Flat, ruled working surfaces rather than a dashboard of unrelated cards.
- Consistent sans-serif typography and aligned financial amounts.
- Cobalt controls, slate comparison regions and yellow evidence annotations.
- A reversible toolkit illustration and recognizable domain symbols add playfulness without changing financial semantics.
- Disclosure of secondary information without concealing the primary task.

## Colors

Cool neutrals carry the working area. The source of truth is the semantic custom-property block in `src\index.css`, with `.dark` overrides.

### Primary

Action cobalt identifies primary actions and interactive states. Primary filled buttons retain cobalt with white text in both themes. Dark-theme links and focus cues use the lighter action token rather than a low-contrast dark blue.

### Secondary

Ledger slate separates calculated comparison content from customer inputs. It carries its own foreground and muted-foreground tokens; ordinary gray text must not be placed on it.

### Neutral

Paper is the editable working surface. Ground frames it; wash separates nearby supporting information. Ink, muted ink and rules provide the hierarchy.

Yellow notes signal an assumption or scope qualification. Negative financial outcomes use the negative token **and explicit wording**, not color alone. Outside the business case, positive outcomes do not receive promotional visual treatment.

The business case (results page) has its own scoped accents, declared in `src\index.css` and applied under `.results-page`: `celebrate`/`warm` (with washes) carry lower/higher cost, the `hero-gain-*`/`hero-loss-*`/`hero-even` gradients colour the verdict banner, `d-*` gives each capability domain a recognisable hue, and `seg-*` colours the cost-composition segments. Colour always travels with words ("less", "more", "Retired", "Stays paid", "Amount unknown"). Print resolves these to dark ink on white.

**The Evidence Rule.** A colored badge describes review status; it never turns an assumption into a verified fact.

## Typography

**Assessment display and body:** locally hosted Public Sans, with Segoe UI and sans-serif fallbacks. The shared type family reflects a working financial document rather than a marketing/editorial pairing. No additional font download is required.

- **Display:** large, tightly set landing statement; the mobile landing uses a deliberate smaller composition.
- **Headline:** one focusable `h1` per assessment surface.
- **Title:** compact section headings with more space above than below.
- **Body:** readable supporting text, generally limited to 74 characters per line.
- **Label:** short sentence-case labels. Hints are separate, lower-weight text.
- **Money:** tabular numerals, right alignment in tables, explicit currency/unit labels. Large figures may wrap rather than overflow at extreme input sizes.

**The One Amount Rule.** The monetary value leads; the unit, period and provenance remain attached. A savings-offset comparison must not resemble an invoiced licence price.

## Layout

The main shell is bounded at 1440px, with 36px desktop gutters. Assessment pages use a flexible working sheet beside a 304px ledger rail, separated by 30px. The rail stays sticky during desktop entry. Business-case pages use a single, narrower reading area bounded at 1200px.

The five-stage index groups the existing `quick` and `catalog` IDs into one current-spend stage. Stage descriptions show actual counts or review state, not completion inferred from position.

At 1100px, gutters, rail and sheet padding compact. Below 850px, the ledger becomes an in-flow expandable summary above the working sheet; it never overlays a form or action. At 600px, the stage index compresses, form fields generally stack and inventory search remains a compact two-column row.

The two current/future totals stay alongside each other on phones. Their supporting cost decomposition moves to the detailed working below, so both alternatives and the first-year consequence remain easy to compare.

Tables preserve numeric columns and scroll horizontally when necessary. Print removes application navigation and controls, restores a white document, expands core financial disclosures and includes presenter material only after explicit opt-in.

## Elevation & Depth

Depth comes from contrasting flat regions and rules, not ambient glows. The selected segmented option uses a small downward shadow (`0 2px 3px #0000000d`); other major surfaces are flat.

State changes use restrained 150ms color/border transitions and disclosure-chevron rotation. No entrance animation delays the assessment. Reduced-motion preferences remove these transitions.

The folio's authored motion sequence is the landing example's **Current stack / With E7** switch. Grouped invoice pieces move into an E7 panel and spread back out on request. Use a 520ms natural-deceleration placement transition, with a bounded 360ms clip-path reveal of the suite panel. Animate transforms, opacity and the panel mask, not layout dimensions. There is no autoplay, looping, sound, dependency or count-up effect. Interrupting or repeating the switch must remain reversible; financial figures are always immediately readable and unchanged. Reduced motion switches directly between the same useful states.

The business case is the one place in the assessment where outcomes are celebrated. Headline figures count up once (≈900ms ease-out, ≤520ms on later changes) and the bridge, cash curve and tiles reveal once on scroll. A **genuine lower recurring cost** fires a single confetti burst per scenario per browser session (keyed to organisation, seats, net and TCO), with a **Celebrate again** control. Higher cost, break-even and unknown results never celebrate; they show a warm verdict and a "What could change this picture" panel of levers. Server rendering, tests, print and reduced motion always receive the exact final values and final states, and the confetti canvas is decorative, click-through and hidden from assistive technology and print. Compact metadata on this page (tile notes, chips, legends) uses .66–.8rem; primary figures and sentences stay at body size or larger.

## Shapes

In the decision folio, controls and large working sheets use shallow corners (5px); small status and filter elements use 3px corners. One-pixel rules separate inventory rows and financial tables. The navigation underline is a location cue, not a thick decorative edge.

The playful layer has bounded exceptions: 10px stage-symbol corners, a 12px illustration board and a 16px landing folio. Yellow marker emphasis and lightly rotated invoice pieces belong to the illustrative folio, never to financial table rows. The dotted board is an actual spatial consolidation illustration, not a page-wide decorative grid.

## Components

### Buttons

Filled cobalt is reserved for the next primary action. Secondary buttons have a paper background and ruled edge. Ghost buttons identify optional actions. Danger buttons combine explicit destructive labels with a negative foreground.

Normal targets are at least 44px tall; compact actions are at least 40px. Focus uses an offset 3px outline. Icon-only controls have accessible names.

### Fields

Text and select fields use a paper surface, a ruled border and a 46px minimum height. Currency codes sit within numeric fields without replacing their labels.

Numeric fields preserve the user's draft text. Invalid or cleared previously entered values explain that the last valid value remains unchanged; an unknown amount is not silently stored as zero. Switching annual and per-seat representation preserves annual money.

Field groups share label, control and supporting-text rows using CSS subgrid. Hints sit below controls and are linked with `aria-describedby`; wrapped labels or longer help must not shift neighboring inputs. Text, select and numeric-wrapper controls share a 46px outer height.

Check fields use native checkboxes with a complete label and optional description. They represent explicit customer choices, not implied consent.

### Inventory rows

One compact header holds the product/capability, vendor or context, amount and status. Example lists begin with "e.g." and show four or five products. Desktop amount columns have a consistent width; on phones the amount/status moves below the full-width product text. Expanding a row reveals USD entry controls and a full-replacement explanation, with no retained-share or amount-confirmation input. Illustrative amount disclosures name the actual category-proxy basis, comparable products and arithmetic. Filters do not discard answers. Entered Microsoft add-ons remain reachable even outside the suggested baseline.

Recovered invoice identifiers outside the current catalog have an explicit review-and-remove surface. They remain fully retained, appear in financial working, and do not inflate catalog completion counts.

Domain symbols connect the area filters to the corresponding invoice rows. Cobalt and yellow are recognition cues, not evidence grades. Area buttons display actual answered/total counts; their accessible names retain the full domain name. A **Next unreviewed** shortcut respects the current filters, opens and focuses the next unanswered category, and does not answer it automatically. Friendly progress copy acknowledges answers without claiming that unknown amounts are complete or that the financial case is verified.

### Evidence disclosures

Detailed native disclosures belong on the footer-linked audit/reference page, outside the normal assessment flow. They retain the reviewed claim's status, publisher, dates, conditions, units, source currency and link. Conditional/unverified coverage badges and amount-confirmation gates are omitted from customer browsing. Full replacement is a model assumption, not a source-status promotion. The reference page is not access-controlled and does not masquerade as a private admin area.

Financial table headers explicitly identify numeric columns and share right alignment with their amounts. Text and action columns remain left aligned; position alone must not decide header alignment.

### Financial ledger

The signature ledger always compares current and future recurring cost, then labels the difference as a reduction, increase or no change. The business case leads with a verdict banner (plain-language result, amount, percentage ring, today → with E7), then four metric tiles (first-year cash, cumulative TCO, payback, invoices retired), the current/future comparison with composition bars, a cost bridge that walks today's total through each retired domain and the licence change to the E7 total, a "stack, sorted" view of retired / stays-paid / unknown invoices, and a cumulative cash curve with a payback pin and year chips. Invoice-level working, formulas and year tables stay one disclosure away and expand for print. No green-only narrative is used.

### Optional material

Capability cost avoided with E7 is a USD licence counterfactual, led by capability: the customer selects what they plan to deploy (nothing by default), each capability shows its standalone licence cost, and the selected set is itemised as the lowest-cost licences that provide it. It is shown as a distinct, labelled figure outside cash totals, TCO and payback: a violet "Separate lens · not cash savings" card with its own total and buy-separately versus E7 bars, then selectable capability tiles grouped by domain (native checkboxes behind each tile). Its buy-separately versus E7 comparison appears only for USD assessments. Third-party benchmarks are secondary context and are never summed with it or with retirement credit for the same capability. TEI is off by default and presented per study; combined results require the model's overlap and currency gates.

Presenter content is a ruled briefing sheet, not a padded disclosure nested in a card. Align guide labels with a definition-list grid and keep long text within the reading measure. Paired proportional cost bars, a current-to-E7 capability route and calculated cash milestones explain the case. On phones these graphics stack; dense workshop and invoice tables scroll within their own wrapper. The briefing is truthful about cost increases and existing-baseline opportunities. Expanded presenter material prints only after opt-in.

The landing folio shares the loaded Northstar example and all its engine-calculated outcomes. It demonstrates a positive path to E7 without disguising synthetic invoices, migration costs or retained services. No separate hardcoded financial example is maintained.

The example's reversible stack illustration groups only positive-retirement invoice lines by domain, plus eligible Microsoft add-ons. Its six groups represent ten invoices in the current fixture, not ten entire vendors or all customer spend. Specialist service cost stays visible in both states. This preview has local component state only: playing with it must never alter the user's assessment or load the demo.

Existing non-USD work opens a recovery notice, not editable dollar fields. The user can download original inputs before an explicit reset to a new USD assessment.

## Do's and Don'ts

### Do

- **Do** keep the primary input task and the financial consequence visible together.
- **Do** state full-replacement assumptions once near entry and keep USD units attached to amounts.
- **Do** distinguish unknown, zero, estimated, entered and retained values.
- **Do** use both wording and color for cost increases and review warnings.
- **Do** keep source currency and customer assessment currency explicit.
- **Do** preserve non-USD legacy inputs for recovery without conversion.
- **Do** retain the independent-project disclaimer and feedback route.

### Don't

- **Don't** infer completion from the user's navigation position.
- **Don't** hide counted invoices behind baseline relevance filters.
- **Don't** equate suite inclusion with a cancellable invoice.
- **Don't** call an offset-adjusted comparison a licence price.
- **Don't** add study value or capability cost avoided to cash savings, TCO or payback.
- **Don't** celebrate, count up towards, or colour green anything other than a genuine lower recurring cost.
- **Don't** claim local saving, privacy or confidentiality that the application cannot establish.
- **Don't** turn discovery marks into certification, tenant readiness or an efficiency score.
