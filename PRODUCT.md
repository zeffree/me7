# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Customer IT and finance teams evaluating Microsoft 365 consolidation lead the experience. Microsoft sellers can opt into contextual presenter guidance without changing the customer's financial assumptions.

## Product Purpose

Help an organization understand current recurring spend, a proposed move to Microsoft 365 E7, and the difference between a recurring estimate and realizable cash savings. A trustworthy negative result is as useful as a positive result.

## Operating Context

Users may know only part of their licensing estate. They can enter invoices, use clearly identified estimates, review product coverage, save locally, share a confidential assessment, and export a business case. The primary experience is guided, with a persistent cost summary and optional full-catalog detail.

## Capabilities and Constraints

React, TypeScript, and Vite; client-side assessment processing and local persistence. Support the three existing baseline suites, editable customer prices, import/export, sharing, print, light/dark themes, and optional seller guidance.

Keep simple recurring estimates. Optional customer-entered transition costs and savings timing refine cash flow without invented confidence discounts. New assessments are USD-only. Existing non-USD saved inputs remain recoverable without currency conversion or relabeling.

Separate actual invoices, illustrative estimates, capability cost avoided with E7, and experimental TEI. Capability cost avoidance starts from the capabilities the customer plans to deploy: each E7 capability their current suite lacks shows what licensing it alone from Microsoft would cost, and the selected ones are priced together as the lowest-cost set of standalone Microsoft licences that provides them (list reference less the E7 discount unless entered, users per capability, purchased add-ons not counted again). Nothing is selected by default. Model v3 assumes full replacement of covered invoices with usable USD amounts. Remove retained-share inputs and amount-confirmation gates; legacy values survive for audit but do not change retirement credit. This is a scenario assumption, not source verification or proof of entitlement. Keep not-covered, unknown and duplicate/bundle allocation safeguards.

Keep detailed sources, applicability and uncertainty records on a separate administrative audit/reference page reached through the footer. It is not access-controlled. Ordinary browsing omits conditional/unverified coverage badges. Example product lists start with "e.g." and show four or five names. Illustrative prices explain their category-level basis and arithmetic rather than inventing vendor attribution.

The landing and loaded example use one computed, explicitly synthetic case with positive E7 economics, real transition effects and retained specialist services. Presenter mode provides a contextual cost bridge, capability routes and a practical evaluation plan. Neither the example nor presenter copy can turn a negative customer result into a savings claim.

Show TEI studies separately by default; combined simulations require overlap review. No live pricing API, analytics, tenant integration, backend assessment storage, accounts, or mixed-SKU optimization.

## Brand Commitments

Make the assessment feel like assembling a clearer tool stack, not completing a tax return. Within the assessment, concentrate playfulness in a reversible example illustration, domain recognition and truthful progress feedback. No sound, fake progress or changes to assessment data from a playful preview. Savings are celebrated only on the business case, only for a genuine lower recurring cost, once per scenario per session (with a replay control); increases never celebrate and instead show levers that could change the result. Capability cost avoided and TEI are never celebrated or added to cash. Respect reduced motion and keep keyboard paths direct.

An independent personal project, not an official Microsoft quote or endorsed Microsoft tool. Preserve the independent-project disclaimer and feedback contact.

A full visual redesign is authorized. No incumbent color, font, or external reference is binding; use design judgment for a distinctive, credible financial assessment.

## Evidence on Hand

`src\data` contains SKU definitions, category mappings, add-ons, seller guidance, and published TEI figures. These are audit inputs, not presumed facts. The approved redesign includes source tracing, explicit uncertainty, corrections, and reconciliation of all calculations and copy.

## Product Principles

- Financial clarity precedes persuasion.
- A licensed capability is not automatically a cancellable invoice.
- Unknown spend is not zero spend; no purchase is not planned adoption.
- Sources, customer assumptions, and modeled outcomes stay distinguishable.
- Preserve customer inputs and explain material changes to saved assessments.

## Accessibility & Inclusion

Target WCAG 2.2 AA. Support keyboard operation, reduced motion, readable financial tables and chart alternatives, responsive layouts, accessible help and errors, and legible printing.
