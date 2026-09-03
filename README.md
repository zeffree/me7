# Microsoft 365 E7 — Consolidation & Savings Assessment

A browser-based tool that helps an organisation on **Office 365 E3**, **Microsoft 365 E3** or
**Microsoft 365 E5** work out what a move to **Microsoft 365 E7** actually costs them, once you
subtract the third-party and Microsoft add-on spend that E7 absorbs.

The point is a single number:

> **E7 lists at $99/user/month — here is what it nets to for you.**

Everything runs client-side. Spend figures are never uploaded anywhere.

---

## Why this exists

E7 gets argued on sticker price. But most organisations are already paying for identity, endpoint,
security, compliance, telephony, BI and AI tooling that E7 either newly covers — or that their
*current* suite already covered and they never cancelled.

Nobody has that number to hand, so the business case gets made badly.

## The idea that makes it work

The catalog is **baseline-aware**: every one of the 54 categories knows whether your current SKU
already covers it. That splits the result into three honest buckets:

| Bucket | Meaning | Who it hits hardest |
| --- | --- | --- |
| **Already redundant today** | Your current suite covers this and you still pay a vendor — you are double-paying *right now*, before E7 enters the picture | M365 E5 customers |
| **Unlocked by E7** | The upgrade newly covers it | O365 E3 / M365 E3 customers |
| **Not covered by E7** | Sentinel, Teams calling plans, Microsoft 365 backup, password managers, e-signature, contact centre — scored at **zero** | Everyone |

That third bucket is the reason the tool is worth using. A savings model that claims E7 replaces
everything does not survive its first meeting with a CFO.

Switching baseline demonstrates this cleanly: on the built-in demo, moving from E5 to O365 E3
shifts 6 lines out of "already redundant" and into "unlocked" — while the total recoverable figure
is unchanged. The bucketing is the narrative; the maths is the maths.

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
| `npm test` | Vitest run (38 tests) |
| `npm run test:watch` | Vitest in watch mode |

`vite.config.ts` sets `base: './'`, so `dist/` can be dropped onto any static host — GitHub Pages,
Azure Static Web Apps, S3, a file share — with no configuration.

---

## How the maths works

```
currentAnnual = seats × baselineUnitPrice × 12  +  Σ microsoftAddOns  +  Σ thirdPartyLines
e7Annual      = seats × e7Price × (1 − discount) × 12
uplift        = e7Annual − (seats × baselineUnitPrice × 12)

credit(line)  = annualSpend × confidenceFactor × (1 − retainPct)
    conservative → full 100% | strong 70% | partial 35%
    best case    → full 100% | strong 100% | partial 60%

netAnnual        = absorbedAddOns + thirdPartyCredit − uplift
effectiveNetPupm = (e7Annual − totalSavings) / seats / 12      ← the headline
```

Rules that keep it defensible, all unit-tested:

- **`not-covered` categories earn zero credit** in both scenarios. Always.
- **A tier upgrade is floored to `partial` confidence**, whatever the category claims — raising a
  tier is rarely a like-for-like replacement.
- **Year-one savings are throttled** by a realisation percentage (default 60%), because contracts
  run to renewal. Microsoft add-ons are exempt: those stop the day E7 lands.
- **Migration cost is applied once**, in year one.
- The core identity `netAnnual ≡ currentAnnualTotal − futureAnnualTotal` is asserted in the tests,
  so the waterfall can never quietly stop reconciling.

Every factor above is editable in the **Assumptions** step. A model a reviewer cannot stress-test
is a model they will not sign.

---

## The simulated Forrester TEI (experimental)

A move to E7 bundles three things Forrester has separately measured: **Microsoft 365 E5**,
**Microsoft 365 Copilot** and the **Entra Suite**. The rest of this app only answers "what invoices
disappear". This optional panel answers the other half — the productivity, IT-efficiency and risk
value those studies quantify — by re-scaling them to the customer's seat count.

It is **off by default and opt-in**, badged experimental, dashed rather than solid, and kept out of
net annual impact, effective per-user price and TCO. Every exported row is prefixed
`EXPERIMENTAL — simulated TEI`.

### The studies

| Study | Date | Composite | Divisor | Benefits PV | ROI |
|---|---|---|---|---|---|
| [TEI of Microsoft 365 E5](https://www.microsoft.com/content/dam/microsoft/final/en-us/microsoft-brand/documents/Forrester-TEI-Of-Microsoft-365-E5.pdf) | Aug 2023 | 40,000 employees, 10,000 on E5, migrated from M365 E3 | 10,000 E5 seats | $68,842,937 | 190% |
| [TEI of Microsoft 365 Copilot](https://tei.forrester.com/go/microsoft/M365Copilot/) | Mar 2025 | 25,000 employees; licensed 3,000 → 6,000 → 10,000 | that year's licensed seats | $36,771,858 | 116% |
| [TEI of Microsoft Entra Suite](https://tei.forrester.com/go/Microsoft/EntraSuite/) | Jul 2025 | 85,000 users / 50,000 employees, 24,000 licensed | 85,000 users | $14,449,655 | 131% |

All three discount at 10%/yr; all values used are the risk-adjusted ones.

### How the extrapolation works

Each published line is divided by the seat population that earned it to give a **value per seat per
study year**, then multiplied back up by this customer's seats. `src/data/teiStudies.ts` stores the
**published figure and the divisor**, never a pre-divided rate — that is what lets the UI print its
own arithmetic (`$1,755,000 ÷ 10,000 seats = $175.50/seat/yr`) so a reviewer can check any number
against the study. Forrester's own year-by-year shape is preserved rather than averaged; years
beyond the third hold at the year-three rate rather than extrapolating a trend nobody measured.

`src/model/tei.test.ts` runs that division **backwards** — re-multiplying every stored line by its
own composite seat count and asserting it reproduces the published year values and PV totals. If a
figure is ever mistyped, those tests fail rather than the app quietly showing a confident wrong
number.

### What is deliberately not counted

- **Copilot "Business transformation: Go to market"** — $14.8M of the study's $36.8M — is excluded
  outright. It scales with revenue, not seats, so re-scaling it per seat would be meaningless.
- **E5 legacy software, Entra vendor consolidation and Entra VPN reduction** ship switched **off**.
  The app already credits those savings from real invoices the customer entered; adding Forrester's
  estimate of the same saving would count it twice. They can be switched on, with the reason shown.
- **E5 reduced travel** ships off as a COVID-era artifact pegged to a travel budget.
- **The E5 study is excluded entirely for customers already on M365 E5** — that value is banked, not
  gained.
- **Copilot's organisation-level implementation cost** (~10 internal FTEs) is not modelled, because
  the app already has its own migration-cost-per-seat input and stacking both would double-charge.

### Two judgement calls worth knowing about

- **Entra benefits are divided by 85,000 total users, not the 24,000 licensed.** Forrester derives
  the benefit volumes at org-wide scale (80,000 password tickets/yr, 25,000 access tasks/yr) while
  licensing only a subset. Dividing by 24,000 would inflate the per-seat rate ~3.5×. The
  conservative reading was taken.
- **The Aug 2023 E5 study contradicts itself**: the exec summary prints $68.42M, the cash-flow table
  prints $68,842,937. The table reconciles ($45,078,548 + $23,764,389) and the line items sum to it,
  so the table is used.

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

- **Quick scan** of the 9 highest-value categories, expanding to the full 54-category catalog
- Per-category explainers: what the solution class is, what replaces it, who the main vendors are,
  and a benchmark price for users who do not know their own numbers
- Conservative ↔ best-case range on every figure
- Waterfall from today's run-rate to the future run-rate, and a multi-year TCO chart
- Live sensitivity slider on the negotiated E7 discount
- **Seller mode** — per-category talk tracks and a presenter brief, off by default
- **Simulated Forrester TEI** — three published studies re-scaled to your seats, opt-in and badged
  experimental, with the full per-line derivation on the page
- Export to JSON, CSV, or a print-friendly business case (three A4 pages, no card split across a fold) — and load a saved JSON file back in from step 1 to resume an assessment
- Share links that carry the whole assessment compressed in the URL — still no server
- Light and dark themes; keyboard accessible; responsive

---

## Caveats — please read before quoting a number

- **This is an estimator, not a quote.** It is not an official Microsoft pricing source and carries
  no warranty. Confirm anything that matters with your Microsoft account team or partner.
- Seeded prices are **published list prices as of September 2026** and are date-stamped in the UI. Real
  EA/CSP agreements typically land 10–20% below list. Every price is editable.
- Benchmark prices for third-party products are *indicative*, gathered to help users who do not
  know their own spend. Enter your real numbers wherever you can.
- Coverage mappings are considered judgements, not Microsoft's official position. The most
  debatable calls carry an in-app caveat explaining the reasoning — for example, the Purview
  Unified Catalog premium tier is consumption-billed, so data cataloguing is scored as a partial
  tier upgrade rather than a replacement.
- Currency is a display setting only. There is no FX conversion — enter amounts in one currency.
- **The simulated TEI is an extrapolation, not a Forrester finding.** Forrester has not studied
  Microsoft 365 E7, has not studied your organisation, and has not reviewed or endorsed this
  arithmetic. Three composite organisations are being re-scaled onto one customer who is none of
  them. Treat it as an order-of-magnitude indication, never a forecast.

## Privacy

There is no backend, no analytics and no third-party network requests. State lives in
`localStorage` under `me7-assessment`. Share links encode the assessment into the URL itself, so
even sharing does not involve a server. **Anyone holding a share link can read the spend data
inside it** — treat those links as confidential. The deployed site sends `Referrer-Policy:
no-referrer` so a share link is not leaked in the `Referer` header of outbound clicks.

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
file, so requests never touch the disk. Brotli takes the main bundle from 527 KB to 141 KB — which
Static Web Apps did automatically but a plain App Service does not. It also serves `ETag`/`304`,
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