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
  # Experience E7 only; dark entries record effective lab overrides.
  cp-bg: "#f7f4ef"
  cp-bg-elevated: "#fcfbf8"
  cp-surface: "#ffffff"
  cp-surface-soft: "#f5f5f5"
  cp-border: "#dedede"
  cp-border-strong: "#919191"
  cp-text: "#242424"
  cp-text-muted: "#5c5c5c"
  cp-text-soft: "#6f6f6f"
  cp-accent: "#b11f4b"
  cp-accent-hover: "#9a1a41"
  cp-accent-soft: "rgba(177, 31, 75, 0.08)"
  cp-accent-fg: "#ffffff"
  cp-highlight: "rgba(177, 31, 75, 0.12)"
  dark-cp-bg: "#3d3b3a"
  dark-cp-bg-elevated: "#343231"
  dark-cp-surface: "#292929"
  dark-cp-surface-soft: "#2e2e2e"
  dark-cp-border: "#474747"
  dark-cp-border-strong: "#b0b0b0"
  dark-cp-text: "#dedede"
  dark-cp-text-muted: "#b0b0b0"
  dark-cp-text-soft: "#b0b0b0"
  dark-cp-accent: "#fd8ea1"
  dark-cp-accent-hover: "#fb7b91"
  dark-cp-accent-soft: "rgba(253, 142, 161, 0.14)"
  dark-cp-accent-fg: "#1a1a1a"
  dark-cp-highlight: "rgba(253, 142, 161, 0.12)"
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
  lab-headline:
    fontFamily: "Segoe UI, Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "clamp(1.75rem, 3vw, 2.65rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  lab-title:
    fontFamily: "Segoe UI, Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  lab-subtitle:
    fontFamily: "Segoe UI, Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.4
  lab-body:
    fontFamily: "Segoe UI, Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  lab-instruction:
    fontFamily: "Segoe UI, Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 400
    lineHeight: 1.6
  lab-label:
    fontFamily: "Segoe UI, Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 650
  lab-action:
    fontFamily: "Segoe UI, Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  control: "5px"
  compact: "3px"
  tile: "8px"
  navigation: "10px"
  illustration: "12px"
  folio: "16px"
  pill: "24px"
  lab-control: "0.625rem"
  lab-surface: "16px"
spacing:
  tight: "8px"
  control: "12px"
  group: "20px"
  panel: "24px"
  section: "36px"
  lab-item: "16px"
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
  lab-button-primary:
    backgroundColor: "{colors.cp-accent}"
    textColor: "{colors.cp-accent-fg}"
    typography: "{typography.lab-action}"
    rounded: "{rounded.lab-control}"
    padding: "10px 16px"
    height: "44px"
  lab-button-primary-hover:
    backgroundColor: "{colors.cp-accent-hover}"
    textColor: "{colors.cp-accent-fg}"
  lab-button-secondary:
    backgroundColor: "{colors.cp-surface}"
    textColor: "{colors.cp-text}"
    typography: "{typography.lab-action}"
    rounded: "{rounded.lab-control}"
    padding: "10px 16px"
    height: "44px"
  lab-button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.cp-text}"
    typography: "{typography.lab-action}"
    rounded: "{rounded.lab-control}"
    padding: "10px 16px"
    height: "44px"
  lab-input:
    backgroundColor: "{colors.cp-surface}"
    textColor: "{colors.cp-text}"
    rounded: "{rounded.lab-control}"
    padding: "8px 12px"
    height: "44px"
  lab-workbench:
    backgroundColor: "{colors.cp-surface}"
    textColor: "{colors.cp-text}"
    typography: "{typography.lab-body}"
    rounded: "{rounded.lab-surface}"
    padding: "24px"
---

# Design system: E7 decision folio

## Overview

**Creative North Star: "The decision folio"**

The visual system borrows the directness of a procurement comparison docket: a working sheet, a fixed index, a separate financial ledger and annotations that explain what needs review. It replaces the previous violet/teal card-based identity. It does not imitate a Microsoft product or imply Microsoft endorsement.

The physical scene is an IT and finance review at a desk, under normal office light; the light palette reads as a clear working sheet. The dark palette preserves the same hierarchy for lower-light use, without neon effects or different financial semantics.

**Delight thesis:** turning a tangle of paid tools into a clear plan should feel like arranging the pieces of a toolkit, not completing a tax return. Keep the working folio's colors and financial seriousness; let the example illustration and the inventory's navigation carry the playfulness.

The `#experience` route adds the **living workplace** alongside the decision folio. Warm paper, charcoal, rose controls and authored SVG sample artifacts support hands-on learning; they do not replace the assessment or technical map's cool-paper/slate/cobalt/yellow identity or Public Sans typography. Lab guidance below applies only to this learning surface and its activity workbenches. The approved composition and resumable-index decision remain in `.impeccable\surfaces\src-components-experience-experiencepage-tsx.md`.

**Key Characteristics:**
- Flat, ruled working surfaces rather than a dashboard of unrelated cards.
- Consistent sans-serif typography and aligned financial amounts.
- Cobalt controls, slate comparison regions and yellow evidence annotations.
- A reversible toolkit illustration and recognizable domain symbols add playfulness without changing financial semantics.
- Disclosure of secondary information without concealing the primary task.
- A scoped, tactile learning workplace with native artifact controls and a separate instructional type ramp.

## Colors

Cool neutrals carry the working area. The source of truth is the semantic custom-property block in `src\index.css`, with `.dark` overrides.

### Primary

Action cobalt identifies primary actions and interactive states. Primary filled buttons retain cobalt with white text in both themes. Dark-theme links and focus cues use the lighter action token rather than a low-contrast dark blue.

In Experience E7, rose is the single interaction accent: primary actions, selected suite/choices, focus, links and relevant SVG details share `cp-accent`. Its soft wash marks selection; `cp-highlight` strengthens selected artifact-row hover. Rose identifies attention or state, not proof of successful deployment.

### Secondary

Ledger slate separates calculated comparison content from customer inputs. It carries its own foreground and muted-foreground tokens; ordinary gray text must not be placed on it.

### Neutral

Paper is the editable working surface. Ground frames it; wash separates nearby supporting information. Ink, muted ink and rules provide the hierarchy.

Yellow notes signal an assumption or scope qualification. Negative financial outcomes use the negative token **and explicit wording**, not color alone. Positive outcomes do not receive promotional visual treatment.

The lab's warm ground and elevated paper sit behind white artifact surfaces, charcoal text and neutral rules. The namespaced `--cp-*` properties are declared in `src\components\experience\experience.css` on `:root` and `html[data-theme="dark"]`; the lab consumes them without replacing the folio's semantic palette. The `dark-cp-*` entries above record effective lab colors: inside the dark learning surface, muted text and strong control boundaries both resolve to `--cp-text-soft`, not the dimmer root defaults.

**The Evidence Rule.** A colored badge describes review status; it never turns an assumption into a verified fact.

**The Scoped Palette Rule.** Clawpilot colors belong to the learning surface and its artifacts; they must not recolor the assessment or technical map.

## Typography

**Assessment and technical map display and body:** locally hosted Public Sans, with Segoe UI and sans-serif fallbacks. The shared type family reflects a working financial document rather than a marketing/editorial pairing. No additional font download is required.

- **Display:** large, tightly set landing statement; the mobile landing uses a deliberate smaller composition.
- **Headline:** one focusable `h1` per assessment surface.
- **Title:** compact section headings with more space above than below.
- **Body:** readable supporting text, generally limited to 74 characters per line.
- **Label:** short sentence-case labels. Hints are separate, lower-weight text.
- **Money:** tabular numerals, right alignment in tables, explicit currency/unit labels. Large figures may wrap rather than overflow at extreme input sizes.

**The One Amount Rule.** The monetary value leads; the unit, period and provenance remain attached. A savings-offset comparison must not resemble an invoiced licence price.

### Experience E7

The lab uses Segoe UI, then Aptos, Calibri and system sans-serif fallbacks, without a new font download. Its `lab-*` roles are scoped alternatives, not additions to the financial ramp: a smaller fluid headline, compact task and artifact headings, the inherited body size, repeated instructional copy, semibold field legends and action labels. The main heading is bounded at 26ch; introductory copy at 66ch. Paragraphs keep generous leading even inside dense workbenches.

Scene labels, source notes and table annotations are text outside the illustration, not words baked into SVG. Their local size variations do not establish a shared micro-text scale or relax legibility requirements. Numerical sample facts and workbook columns retain tabular alignment.

**The Qualified Outcome Rule.** Lab outcomes name the capability and boundary in text: a blocked request can be correct, and a discovery is not certification or tenant readiness.

## Layout

The main shell is bounded at 1440px, with 36px desktop gutters. Assessment pages use a flexible working sheet beside a 304px ledger rail, separated by 30px. The rail stays sticky during desktop entry. Business-case pages use a single, narrower reading area bounded at 1200px.

The five-stage index groups the existing `quick` and `catalog` IDs into one current-spend stage. Stage descriptions show actual counts or review state, not completion inferred from position.

At 1100px, gutters, rail and sheet padding compact. Below 850px, the ledger becomes an in-flow expandable summary above the working sheet; it never overlays a form or action. At 600px, the stage index compresses, form fields generally stack and inventory search remains a compact two-column row.

The two current/future totals stay alongside each other on phones. Their supporting cost decomposition moves to the detailed working below, so both alternatives and the first-year consequence remain easy to compare.

Tables preserve numeric columns and scroll horizontally when necessary. Print removes application navigation and controls, restores a white document, expands core financial disclosures and includes presenter material only after explicit opt-in.

### Experience E7

The lab is bounded at 1440px with 24px vertical and 32px horizontal padding. Horizontal padding compacts to 24px at 1100px and 16px at 640px. Repeated gaps and artifact padding use the existing 8/12/20/24px rhythm plus the lab's 16px item step.

One authored workplace holds eight named spaces, not eight detached marketing cards. The entry view exposes the workplace, a recommended first task and the suite switch without compulsory onboarding. Role recommendations are an optional, initially collapsed native disclosure; every space remains available. At 640px the spatial scene becomes a readable two-column sequence, with the floor removed rather than shrinking the desktop drawing and its text.

Mission work uses a flexible artifact column beside a sticky task/outcome rail (24px from the top). At 850px it becomes one column: a sticky compact suite selector and run action remain above the workbench, while the outcome follows in normal flow. Running or comparing moves focus to the relevant result heading; scroll offsets leave it below the compact controls. Replay actions wrap on phones, and debrief columns stack at 640px.

Artifact layouts respond to their own available width: productivity workbenches use 620px and 400px container queries; access routes use a 38rem container query. These are local layout thresholds, not new global viewport breakpoints. Workbook tables scroll within their wrapper; labels, evidence and permission explanations remain readable without interpreting the SVG.

## Elevation & Depth

Depth comes from contrasting flat regions and rules, not ambient glows. The selected segmented option uses a small downward shadow (`0 2px 3px #0000000d`); other major surfaces are flat.

State changes use restrained 150ms color/border transitions and disclosure-chevron rotation. No entrance animation delays the assessment. Reduced-motion preferences remove these transitions.

The folio's authored motion sequence is the landing example's **Current stack / With E7** switch. Grouped invoice pieces move into an E7 panel and spread back out on request. Use a 520ms natural-deceleration placement transition, with a bounded 360ms clip-path reveal of the suite panel. Animate transforms, opacity and the panel mask, not layout dimensions. There is no autoplay, looping, sound, dependency or count-up effect. Interrupting or repeating the switch must remain reversible; financial figures are always immediately readable and unchanged. Reduced motion switches directly between the same useful states.

### Experience E7

The lab stays flat at the workspace level. Authored SVG planes, paper edges, device bezels, gate arms and evidence connectors supply material depth; declared but unused Clawpilot shadow/panel effects are not a new elevation standard.

Entering a mission uses a bounded 280ms mask/opacity reveal with `cubic-bezier(.16, 1, .3, 1)`. Workplace hover uses a small upward placement transition (320ms), while scene fills and evidence-state changes use 180ms. The usual controls retain the inherited 150ms color/border response. Source selection, permission changes, case outcomes and comparison text remain immediately readable. No fictional efficiency, money or security-readiness animation is introduced. Reduced motion removes transitions and hover movement while preserving the same useful states.

## Shapes

In the decision folio, controls and large working sheets use shallow corners (5px); small status and filter elements use 3px corners. One-pixel rules separate inventory rows and financial tables. The navigation underline is a location cue, not a thick decorative edge.

The playful layer has bounded exceptions: 10px stage-symbol corners, a 12px illustration board and a 16px landing folio. Yellow marker emphasis and lightly rotated invoice pieces belong to the illustrative folio, never to financial table rows. The dotted board is an actual spatial consolidation illustration, not a page-wide decorative grid.

### Experience E7

The lab's repeated control corner is `lab-control`; workplace, activity and debrief surfaces use `lab-surface`. One-pixel rules and neutral surfaces distinguish the artifacts without turning every interaction into another container. Selected suite segments use the existing 8px step; room targets and the phone shell use the existing 12px step.

Desk, device, door, evidence wall, information cabinet, agent bench, report wall and meeting table have distinct authored SVG silhouettes. Physical details such as an asymmetric monitor bezel, layered paper and dashed access paths belong to the object being explained, not a universal control-radius or border rule.

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

The signature ledger always compares current and future recurring cost, then labels the difference as a reduction, increase or no change. The business case follows with first-year cash, cumulative TCO, payback and invoice-level working. No green-only narrative is used.

### Optional material

Planned capability value is explicitly selected and stays in USD outside cash totals. TEI is off by default and presented per study; combined results require the model's overlap and currency gates.

Presenter content is a ruled briefing sheet, not a padded disclosure nested in a card. Align guide labels with a definition-list grid and keep long text within the reading measure. Paired proportional cost bars, a current-to-E7 capability route and calculated cash milestones explain the case. On phones these graphics stack; dense workshop and invoice tables scroll within their own wrapper. The briefing is truthful about cost increases and existing-baseline opportunities. Expanded presenter material prints only after opt-in.

The landing folio shares the loaded Northstar example and all its engine-calculated outcomes. It demonstrates a positive path to E7 without disguising synthetic invoices, migration costs or retained services. No separate hardcoded financial example is maintained.

The example's reversible stack illustration groups only positive-retirement invoice lines by domain, plus eligible Microsoft add-ons. Its six groups represent ten invoices in the current fixture, not ten entire vendors or all customer spend. Specialist service cost stays visible in both states. This preview has local component state only: playing with it must never alter the user's assessment or load the demo.

Existing non-USD work opens a recovery notice, not editable dollar fields. The user can download original inputs before an explicit reset to a new USD assessment.

### Experience E7 controls and workbenches

Lab primary actions use rose with its paired foreground; secondary controls use paper with a strong neutral rule, and quiet controls remove the filled surface. Shared buttons and fields are at least 44px tall; suite buttons and choice targets are at least 48px. The prominent desktop run action is 52px tall. Focus uses a 3px rose outline offset by 4px. These are minimum targets, not fixed-height text boxes.

The full suite switch uses named, pressed-state buttons and a selected checkmark. Compact run selectors use labeled native selects. Switching Office 365 E3 / Microsoft 365 E7 preserves the selected sample case and each suite's independent resumable run; it is not a decorative badge change. The separate case selector explicitly warns that changing the case restarts both suite runs. Undo, redo and the native range control expose real decision history.

Native fieldsets, checkboxes, selects and pressed-state buttons carry the artifact interactions; SVG supplies the workplace and task-specific illustrations rather than replacing controls. A source document, device workbench, access gate, evidence board, sharing table, agent request, workbook chart and calling path remain materially distinct inside a common task/replay/comparison frame. No WebGL is required, and illustration fallback leaves task names reachable.

Detailed setup notes start collapsed under **Sample setup and licence boundaries**. Collapsing detail does not remove capability qualifications: debriefs visibly separate what O365 E3 already supports, what E7 adds, what still needs setup and what remains a boundary or separate purchase. Source links stay available in their own disclosure. Prepared examples are identified as local scenarios, not live AI or Microsoft services.

Discovery marks require an interaction and an explored comparison; they acknowledge learning rather than a perfect score. The global header, theme control, independent-project disclaimer and feedback route remain available. Save/recovery messages identify the lab, and confirmed resets name exactly which lab history they clear; no lab control may reset or overwrite assessment inputs.

## Do's and Don'ts

### Do

- **Do** keep the primary input task and the financial consequence visible together.
- **Do** state full-replacement assumptions once near entry and keep USD units attached to amounts.
- **Do** distinguish unknown, zero, estimated, entered and retained values.
- **Do** use both wording and color for cost increases and review warnings.
- **Do** keep source currency and customer assessment currency explicit.
- **Do** preserve non-USD legacy inputs for recovery without conversion.
- **Do** retain the independent-project disclaimer and feedback route.
- **Do** keep lab tasks keyboard/touch operable and readable without the SVG.
- **Do** keep compact suite/run controls reachable while scrolling lab workbenches.
- **Do** keep baseline capabilities, prerequisites and separate purchases explicit in lab debriefs.

### Don't

- **Don't** infer completion from the user's navigation position.
- **Don't** hide counted invoices behind baseline relevance filters.
- **Don't** equate suite inclusion with a cancellable invoice.
- **Don't** call an offset-adjusted comparison a licence price.
- **Don't** add study or unpurchased capability value to cash savings.
- **Don't** claim local saving, privacy or confidentiality that the application cannot establish.
- **Don't** propagate the lab's palette or type ramp into the assessment or technical map.
- **Don't** turn discovery marks into certification, tenant readiness or an efficiency score.
- **Don't** let lab interactions or resets change assessment inputs.
