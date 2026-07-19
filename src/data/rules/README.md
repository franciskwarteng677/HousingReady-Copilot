# Frozen verified HUD FY 2026 MTSP corpus

This directory is the only threshold-data source for the frozen HousingReady
Copilot prototype scenario:

- User scenario: Cambridge, Massachusetts
- Official threshold geography: Boston-Cambridge-Quincy, MA-NH HMFA
- Program context: Low-Income Housing Tax Credit / Multifamily Tax Subsidy
  Projects
- Rule year: 2026
- Primary comparison: standard 60% MTSP income limit

`hud-fy2026-mtsp-cambridge.ts` contains the typed, recursively immutable local
record. It was transcribed from the official HUD USER **FY 2026 Multifamily Tax
Subsidy Projects (MTSP) Income Limits** report, Massachusetts table,
Boston-Cambridge-Quincy, MA-NH HMFA row, PDF page 130 of 326. The dataset is
effective May 1, 2026.

The active corpus is validated at module load. The schema rejects duplicate or
missing household sizes, source metadata that does not match the embedded HUD
record, and a primary comparison value that differs from the verified standard
60% MTSP row. Money is stored in integer cents.

## Source boundaries

The corpus keeps three kinds of material visibly distinct:

1. `official-hud-data` — the frozen HUD table values and their official PDF
   citation; verification status `verified_official`.
2. `product-arithmetic` — HousingReady Copilot's deterministic application-
   preparation arithmetic; verification status `prototype_policy`.
3. `product-policy` — HousingReady Copilot's scope, uncertainty, and decision-
   boundary policies; verification status `prototype_policy`.

HousingReady-authored text is not an official HUD rule. The 60% value is a
reference threshold selected for this narrow prototype scenario. Different
properties, set-asides, project histories, programs, or rules may require
different limits.

The demo uses the local record and makes no live network request. If a future
rule year or geography is added, create a new versioned source module and
corpus ID rather than editing this frozen FY 2026 record in place.
