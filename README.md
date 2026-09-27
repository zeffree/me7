# Microsoft 365 E7 — Cost & Consolidation Assessment

A browser-based tool that helps an organisation on **Office 365 E3**, **Microsoft 365 E3** or
**Microsoft 365 E5** work out what a move to **Microsoft 365 E7** actually costs them, once you
subtract the third-party and Microsoft add-on spend that E7 absorbs.

The primary comparison is:

> **What do you spend today, what would you spend after the move, and when could savings begin?**

Calculations run client-side. New share links carry the assessment in the URL fragment rather than
an HTTP query string. They are confidential links, not encrypted or access-controlled storage.

---

## Why this exists

Sticker price alone is not a cost comparison. An organisation may already pay for identity,
endpoint, security, compliance, telephony, BI and AI tooling that overlaps its current or proposed
Microsoft suite. An overlapping entitlement is an opportunity to investigate, not proof that a
vendor can be cancelled.

Nobody has that number to hand, so the business case gets made badly.

## The idea that makes it work

The catalog is **baseline-aware**: every one of the 54 categories knows whether your current SKU
already covers it. That splits the result into three honest buckets:

| Bucket | Meaning | Who it hits hardest |
| --- | --- | --- |
| **Existing-suite overlap** | Your current suite includes an overlapping capability; customer requirements and cancellable spend still need confirmation | M365 E5 customers |
| **Unlocked by E7** | The upgrade adds an entitlement; technical suitability and contract timing still matter | O365 E3 / M365 E3 customers |
| **Not covered by E7** | Sentinel, Teams calling plans, Microsoft 365 backup, password managers, e-signature, contact centre — scored at **zero** | Everyone |

That third bucket is the reason the tool is worth using. A savings model that claims E7 replaces
everything does not survive its first meeting with a CFO.

Switching baseline changes both the licence comparison and the attribution of potential savings.
The comparison is with the estate as entered, not with an independently optimized version of the
current suite. Savings already achievable on today's suite are not an incremental E7 benefit.

---

## Running it

Requires Node 20+ (developed on Node 24).

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Typecheck (`tsc -b`) then production build to `dist/` |
| `npm run preview` | Serve the built output locally |
| `npm run typecheck` | Types only, no emit |
| `npm test` | Vitest run |
| `npm run test:watch` | Vitest in watch mode |

`vite.config.ts` sets `base: './'`, so `dist/` can be dropped onto any static host — GitHub Pages,
Azure Static Web Apps, S3, a file share — with no configuration.

---

## How the maths works

```
currentAnnual = seats × baselineUnitPrice × 12  +  Σ microsoftAddOns  +  Σ thirdPartyLines
e7Annual      = seats × e7Price × (1 − discount) × 12
uplift        = e7Annual − (seats × baselineUnitPrice × 12)

credit(line)  = full annual spend, if the invoice is eligible; otherwise 0

netAnnual        = absorbedAddOns + thirdPartyCredit − uplift
futureAnnual     = currentAnnual − netAnnual
effectiveNetPupm = (e7Annual − totalSavings) / seats / 12      ← an offset comparison, not an invoice
```

Rules that keep it defensible, all unit-tested:

- **`not-covered` categories earn zero credit** in both scenarios. Always.
- **Model v3 assumes full replacement of eligible covered invoices.** No retained-spend percentage,
  amount-confirmation checkbox or arbitrary confidence discount changes the credit. This is a
  scenario assumption, not verified technical equivalence or an instruction to cancel contracts.
- **Unknown amounts, unmapped invoices and unresolved duplicate/bundle allocations earn no
  retirement credit.** Entered costs remain in the model until the allocation is resolved.
- **Simple mode is a steady-state estimate.** Optional transition modeling uses customer-entered
  costs and per-line savings delays, including Microsoft add-ons. A licence entitlement does not
  automatically permit early contract cancellation.
- **Transition cost is applied once**, at the start of the move and included in year-one TCO.
- **Monthly cash flow drives timed results**, so first-year impact, TCO and payback use the same
  realization schedule. Failure to reach payback within the selected horizon does not mean never.
- The core identity `netAnnual ≡ currentAnnualTotal − futureAnnualTotal` is asserted in the tests,
  so the waterfall can never quietly stop reconciling.

Prices and optional timing/cost assumptions can be edited. Legacy `retainPct`, `assumptionConfirmed`
and `pricesConfirmed` inputs remain available in JSON/audit records but are not applied.
`conservative`/`bestCase` aliases describe the same cash scenario. The financial model version is
3; the editable input/export schema remains `me7-assessment/2`.

### Currency and source evidence

New assessments, imports and shared assessments must use **USD**. There is no currency selector
or FX conversion. A previously saved non-USD assessment is preserved behind a recovery screen:
download its original inputs or explicitly start a new USD assessment. Its figures are never
silently relabeled or displayed as a new USD projection.

Category benchmarks are app-set planning proxies, **not prices attributed to an example vendor**.
Every illustrative amount explains that no single product supplied the price, names comparable
products, and shows the USD unit amount, modeled user count and annual arithmetic. Replace it
with an invoice or quote when available.

The source registry distinguishes published facts, conditional entitlements and unverified
estimates. It records review dates and limitations rather than using one global date as proof that
every vendor-equivalence claim is established.

Detailed sources, applicability, review statuses and current-assessment audit records live on the
**Audit & review reference** page (`#audit`), linked from the footer rather than the assessment
steps. It is an administrative reference, **not an authenticated or private area**. Customer-facing
pages show full-replacement scenario labels without conditional/unverified coverage badges or
amount-confirmation controls. The audit page preserves source status, amount provenance, ignored
legacy fields and the exact current model policy; removal of a checkbox does not verify a source.

### One worked example, from preview to assessment

The landing and **Explore an example** use `src\data\demo.ts`, a single synthetic 1,000-seat
Microsoft 365 E3 scenario. All displayed outcomes are calculated, not separately typed marketing
numbers. At the default USD references and no E7 discount, it models $1,797,600 current recurring
cost, $1,344,000 future recurring cost and a $453,600 annual reduction. It includes a $90,000
transition budget and two months before retirement savings: year-one net benefit is $168,000,
three-year net benefit is $1,075,200 and payback is month 8. SIEM, backup and e-signature remain
paid. Product names illustrate the scenario; these synthetic amounts are not vendor quotes.

Presenter mode connects the cost bridge, E7 capability map, largest invoice opportunities and
cash-flow milestones to an owner-based evaluation plan. It explicitly distinguishes current-suite
cleanup from an E7-only benefit and switches to an investment discussion when the case costs more.

---

## The simulated Forrester TEI (experimental)

A move to E7 bundles three things Forrester has separately measured: **Microsoft 365 E5**,
**Microsoft 365 Copilot** and the **Entra Suite**. The rest of this app only answers "what invoices
disappear". This optional panel answers the other half — the productivity, IT-efficiency and risk
value those studies quantify — by re-scaling them to the customer's seat count.

It is **off by default and opt-in**, labeled experimental, and kept out of net annual impact,
effective per-user price and TCO. Study benefits are shown independently by default. A combined
simulation requires explicit overlap review and compatible currencies; overlapping benefits,
common cash savings and common costs must not be counted twice. Exported study rows retain their
experimental label.

### The studies

| Study | Edition | Important qualification |
|---|---|---|
| [TEI of Microsoft 365 E5](https://www.microsoft.com/content/dam/microsoft/final/en-us/microsoft-brand/documents/Forrester-TEI-Of-Microsoft-365-E5.pdf) | Aug 2023 | Check the registry for table-level verification and normalization limitations. |
| [TEI of Microsoft 365 Copilot](https://tei.forrester.com/go/microsoft/M365Copilot/) | Mar 2025 | The study licenses 3,000, 6,000, then 10,000 of 25,000 employees; its role mix and adoption pattern are not universal. |
| [TEI of Microsoft Entra Suite](https://tei.forrester.com/go/Microsoft/EntraSuite/) | Jul 2025 | It distinguishes 85,000 users, 50,000 employees and 24,000 Suite licenses; a universal per-seat divisor is an app assumption. |

The simulation uses a 10% annual discount convention and stores the source benefit rows intended
to be risk-adjusted. The August 2023 E5 figures are explicitly unverified and its benefit lines
default off until the user deliberately selects an exploratory scenario.

### How the extrapolation works

Each published line is divided by a stated reference population to give a **modeled value per seat
per study year**, then multiplied by this customer's seats. `src/data/teiStudies.ts` stores the
**published figure and the divisor**, never a pre-divided rate — that is what lets the UI print its
own arithmetic (`$1,755,000 ÷ 10,000 seats = $175.50/seat/yr`) so a reviewer can check any number
against the study. Forrester's own year-by-year shape is preserved rather than averaged; years
beyond the third hold at the year-three rate rather than extrapolating a trend nobody measured.

The TEI tests reconcile stored annual figures and financial identities. A division followed by
multiplication verifies internal consistency, not the suitability of the divisor or the truth of
the original input. Source review and explicitly labeled extrapolation assumptions are separate.

### What is deliberately not counted

- **Copilot "Business transformation: Go to market"** — $14.8M of the study's $36.8M — is excluded
  outright. It scales with revenue, not seats, so re-scaling it per seat would be meaningless.
- **E5 legacy software, Entra vendor consolidation and Entra VPN reduction** ship switched **off**.
  The app already credits those savings from real invoices the customer entered; adding Forrester's
  estimate of the same saving would count it twice. They can be switched on, with the reason shown.
- **E5 reduced travel** ships off as a COVID-era artifact pegged to a travel budget.
- **The E5 study is excluded for customers already on M365 E5** rather than crediting an existing
  entitlement as a new benefit. Existing Copilot/Entra purchases also require applicability review.
- **Training is not the full implementation cost.** Any excluded study implementation or management
  cost needs an explicit rationale. Merely having an optional transition-cost field does not
  establish that the same cost was already entered.

### Two judgement calls worth knowing about

- **The app normalizes Entra benefits over 85,000 total users, not the 24,000 licensed.** Forrester derives
  the benefit volumes at org-wide scale (80,000 password tickets/yr, 25,000 access tasks/yr) while
  licensing only a subset. Dividing by 24,000 would inflate the per-seat rate ~3.5×. The
  normalization is still an application choice, not a Forrester-prescribed customer forecast.
- **Combining studies can overlap benefits**, including help-desk, security administration, and
  productivity effects. Reviewing invoice duplication alone does not resolve cross-study overlap.

One more caution for anyone maintaining this: the widely-cited **"240% ROI Entra study" is not the
Entra Suite**. It is a 2023 study of Azure AD + Permissions Management + Verified ID with a
10,000-employee composite, and it predates the Entra Suite SKU entirely. Secondary sources conflate
the two. Likewise the "457% ROI" Copilot figure belongs to the April 2024 *projected* study's high
scenario, not the March 2025 retrospective used here.

---

## Structure

```
src/
├─ data/
│  ├─ skus.ts        baseline + E7 SKU definitions and list prices
│  ├─ sources.ts     source documents, dates, price units and review status
│  ├─ evidence.ts    per-claim conditions and customer-confirmation requirements
│  ├─ msAddOns.ts    ~30 Microsoft add-ons, flagged absorbed / not absorbed
│  ├─ teiStudies.ts  the three Forrester TEI studies, line by line, with divisors
│  └─ categories.ts  54 categories × 7 domains — explanations, E7 mapping,
│                    example products, benchmark prices, per-baseline coverage
├─ model/            types + the pure savings/TCO engine and TEI simulation (+ tests)
├─ store/            zustand state, localStorage persistence, share-link codec (+ tests)
├─ components/       ui primitives, layout, steps, catalog cards, results
└─ lib/              formatting, coverage metadata, export helpers
```

`src/data/categories.ts` is the substance of the app. Adding a category means adding one entry
with its plain-English description, which E7 capability covers it, a few mainstream product names,
a benchmark price and its coverage against each of the three baselines.

## Features

- **Experience E7**: an independent, playable workplace comparing O365 E3 with E7 across eight
  hands-on missions, with role paths, rewind, source-linked debriefs and the complete capability index
- **Guided assessment** with quick capture and optional full-catalog exploration
- Per-category explainers: what the solution class is, what replaces it, who the main vendors are,
  and a benchmark price for users who do not know their own numbers
- Explicit entered, estimated, unreviewed and excluded assumptions
- Current/future recurring comparison, invoice-level reconciliation, and optional timed multi-year cash flow
- Live sensitivity slider on the negotiated E7 discount
- **Seller mode** — per-category talk tracks and a presenter brief, off by default
- **Simulated Forrester TEI** — three published studies re-scaled to your seats, opt-in and badged
  experimental, with the full per-line derivation on the page
- Export to versioned JSON, CSV, or a print-friendly business case; restore saved assessments
- Share links that carry the assessment compressed in the URL fragment; legacy query links remain readable
- Light and dark themes; keyboard accessible; responsive

---

## Experience E7: try the difference

Open **Experience E7** in the navigation or go directly to `#experience`. No assessment, account,
tenant connection or live AI is needed. The fictional Northstar workplace contains a project-brief
desk, device bench, access gate, incident room, information room, agent workshop, insights wall and
meeting space. These are interactive illustrations, not replicas of Microsoft product interfaces.

Choose a role or enter any space. Manipulate the sample artifacts, try the setup, switch between
**Office 365 E3** and **Microsoft 365 E7**, and rewind your decisions. Each suite keeps its own run;
changing the common sample case restarts both runs explicitly. Debriefs explain what E3 already
offers, the specific E7 addition, configuration prerequisites and things that remain separate.
Some manual E3 workflows succeed, and missing setup or permissions can still stop an E7 workflow.

The capability index derives from the same catalog as the assessment, including not-covered
categories. It is complete relative to this app, not an exhaustive Microsoft licensing document.
Prepared Copilot outputs and all workplace data are synthetic. There are no claimed time savings,
risk scores or financial credits from playing a mission. Astra is a development tool here, not a
visitor-facing service or a claimed E7 entitlement.

Lab state is separately versioned and stored through `src\store\experienceProgress.ts`.
Corrupt, incompatible or unavailable storage produces an explicit recovery message; unreadable
saved progress is not overwritten without a lab-only reset. No lab action loads the financial
example, changes an invoice, changes the assessment baseline or starts an assessment.

The route and activity components are lazy-loaded. The workplace uses semantic HTML with
supporting SVG/CSS illustration rather than loading the technical map's Three.js renderer.
Keyboard, touch and reduced-motion operation remain available. Optional external source links
are for reference; playing the activities does not make a model, tenant or telemetry request.

Implementation lives in `src\components\experience`, `src\data\experience` and the
`experience*` engine/evaluation modules under `src\lib`. Exact `#experience` and
`#experience-main-content` anchors are distinct from assessment share fragments.

---

## Caveats — please read before quoting a number

- **This is an estimator, not a quote.** It is not an official Microsoft pricing source and carries
  no warranty. Confirm anything that matters with your Microsoft account team or partner.
- Published prices carry their source date and purchasing conditions. Real EA/CSP prices depend on
  the customer's agreement; no standard discount is promised. Enter actual contracted prices.
- Benchmark prices are *illustrative category planning assumptions*, not independently retained
  vendor-price evidence. Enter your real numbers wherever you can.
- Coverage mappings are considered judgements, not Microsoft's official position. The most
  debatable calls carry an in-app caveat explaining the reasoning — for example, the Purview
  Unified Catalog premium tier is consumption-billed and is not treated as an included retirement
  entitlement. Detailed scope limitations are retained in the audit reference.
- There is no automatic FX conversion. New assessments use USD only; legacy currencies are
  preserved for recovery, not reinterpreted.
- **The simulated TEI is an extrapolation, not a Forrester finding.** Forrester has not studied
  Microsoft 365 E7, has not studied your organisation, and has not reviewed or endorsed this
  arithmetic. Three composite organisations are being re-scaled onto one customer who is none of
  them. Treat it as an order-of-magnitude indication, never a forecast.

## Privacy

There is no assessment backend or analytics. State lives in `localStorage` under `me7-assessment`.
The capability lab has its own browser-storage key and stores only validated synthetic choices
and discovery progress; resetting it does not clear the assessment.
The static site is served by an HTTP host, but new shared payloads use `#d=...`, which browsers do
not send in HTTP requests. **Anyone holding a share link can read the spend data inside it**:
compression is not encryption, and the link has no access control or revocation.

Older `?d=...` links remain readable, but their payload is sent to the host and may exist in
hosting logs or browser history. Clearing the address after import does not erase those earlier
copies. New links generated by the app remove the old query payload. Local exports and links
should be handled as confidential financial documents.

## Deployment

Hosted on Azure App Service (Linux, Basic B1).

| | |
|---|---|
| Resource group | `rg-me7` (southeastasia) |
| Host | App Service `e7calc` on plan `asp-e7calc-linux` (Linux B1) — https://e7calc.azurewebsites.net |

The app was originally on an Azure Static Web App. A Static Web App's `*.azurestaticapps.net`
hostname is randomly generated and cannot be renamed, which is why the host moved to App Service —
its default hostname is ours to choose. The Static Web App was kept as a fallback for a while and
has since been deleted, because a second host serving a stale build is a liability rather than
insurance.

### Why Linux

Windows and Linux App Service plans are priced very differently, because the Windows plan includes
a Windows Server licence. In southeastasia:

| Plan | Cost |
|---|---|
| Basic B1, Windows | ~$54.75/mo |
| **Basic B1, Linux** | **~$13.14/mo** |

Same specs. Linux is therefore the plan to use, which means no IIS and no `web.config`.

### Hosting config — two files, one behaviour

Each host applies the same rules a different way. **Both must be kept in sync**: SPA fallback,
cache policy (immutable for hashed assets, `no-cache` for `index.html`), MIME types, and the
security headers including a Content-Security-Policy.

| File | Used by |
|---|---|
| `server/server.mjs` | App Service (Linux) — **the live one** |
| `public/web.config` | App Service (Windows/IIS) — kept for reference |

`server/server.mjs` is a zero-dependency Node server, so there is no install step on cold start. It
reads the build into memory once at startup and precomputes gzip and Brotli for every compressible
file, so requests never touch the disk. This provides compressed transfers on App Service without
relying on the platform to compress responses. It also serves `ETag`/`304`,
rejects non-GET/HEAD methods, and refuses to serve the hosting config files themselves.

HTTPS redirection is handled by the App Service `httpsOnly` setting rather than a rewrite rule,
because `{HTTPS}` reads `off` behind the App Service front end and a rewrite would loop.

### Redeploying

```bash
npm run deploy
```

That builds, stages `dist/` plus `server/server.mjs` into one package, and zip-deploys it. It
requires an active `az login`.

### Gotcha: the runtime string

`az` on Windows runs through `cmd.exe`, which eats the pipe in `NODE|24-lts` even when quoted. Use
the colon form instead:

```bash
az webapp create -g rg-me7 -p asp-e7calc-linux -n e7calc --runtime "NODE:24-lts"
```

### Custom domain

For a real domain such as `e7calc.com`, register it with an external registrar — Visual Studio
subscriptions cannot buy App Service Domains — then map it to either host. Both support free
managed TLS certificates, and B1 supports custom domains.

## Not in scope

Multi-tenant accounts, server-side persistence, a live Microsoft pricing API, and real Microsoft
365 tenant integration are all deliberately out of scope.