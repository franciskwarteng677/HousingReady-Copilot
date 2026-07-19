# Frozen 2026 MTSP rule corpus

This directory is the only rule-data source for the Phase 2B prototype. The
active context is intentionally frozen to:

- Cambridge, Massachusetts
- Boston-Cambridge-Quincy, MA-NH HUD Metro FMR Area
- Low-Income Housing Tax Credit / Multifamily Tax Subsidy Projects
- Rule year 2026

`organizer-pack.template.json` is a schema-valid example and the current safe
fallback. Every household-size threshold is intentionally `null`; it must not
be treated as official data. The template's application-policy passages explain
prototype behavior and are not HUD rule quotations.

## Loading the Hack-Nation organizer pack

1. Preserve `organizer-pack.template.json` as the example.
2. Add the verified pack as `organizer-pack.verified.json` in this directory.
3. Copy the template shape exactly and enter only values supplied in the frozen
   Hack-Nation 2026 corpus. Store money as integer cents, not decimal numbers.
4. For every populated threshold, set `citationId` to an exact passage or table
   row in `citationPassages`. Record that citation's publisher, title, link,
   section or row identifier, effective date, and verification status.
5. Record the corpus `effectiveDate` and `sourceVersion`, then set the applicable
   threshold, citation, and corpus verification statuses to `verified` only
   after source verification.
6. Update the JSON import in `index.ts` from the template file to the verified
   pack. The Zod parser will reject missing fields, unknown fields, duplicate
   household sizes, broken citation references, and incomplete verified data.

Do not copy values from memory, estimate missing limits, substitute a different
year or geography, or mark placeholder material as official. Until a verified
pack is activated, `getVerifiedThresholdComparisonData` always returns `null`
and the product must display the required missing-data message.
