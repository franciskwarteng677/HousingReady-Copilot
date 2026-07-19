# HousingReady Copilot

HousingReady Copilot is a renter-side affordable-housing application-readiness
assistant. It helps a renter organize synthetic documents, confirm information,
understand published program rules, identify present or missing document categories,
and prepare an application packet.

It does not approve, deny, rank, score, or determine housing eligibility.

## Local development

Requirements:

- Node.js 20.9 or newer
- npm

Install dependencies:

    npm install

Start the development server:

    npm run dev

Open http://localhost:3000.

Quality checks:

    npm run lint
    npm run typecheck
    npm run test
    npm run build
    npm audit

## Routes

- / — product overview
- /profile — synthetic document upload, preview, extraction evidence, correction, and confirmation
- /understand — confirmed Profile information, deterministic income arithmetic, verified frozen HUD threshold comparison, citations, and review acknowledgement
- /prepare — deterministic document-readiness results, explicit renter review, packet preview, and renter-controlled PDF download
- /privacy — prototype privacy and safety boundaries
- /about — product purpose and non-goals

## Technology

- Next.js App Router
- TypeScript
- Tailwind CSS
- ESLint
- lucide-react
- zod
- jsPDF
- PDF.js

## Prototype data policy

Use synthetic documents only. The prototype is designed around temporary
session processing and must not be used with real applicant data.

The Profile demo recognizes only the exact committed synthetic PDFs by
SHA-256 fingerprint. Unknown documents receive a no-call; the prototype does
not guess values for arbitrary files.

Session storage contains only confirmed structured fields, integer-cent money
values, document metadata, and a minimal revision/correction history. Restored
values can be corrected without re-uploading a file. Raw files, full document
text, source excerpts, images, PDF bytes, and object URLs are never persisted.

If a sample is re-uploaded after a renter correction, its fresh demo extraction
is reconciled against the saved Profile. A difference never overwrites the
confirmed value automatically; the renter must explicitly retain the correction
or restore the extracted sample value.

The Understand stage additionally stores only renter-confirmed household size,
the frozen program/corpus identifiers, deterministic calculation inputs and
results, and review acknowledgement metadata bound to the Profile revision,
household size, calculation inputs, and HUD source version. Questions and
answer history are not persisted.

The Prepare stage uses the versioned `housingready:prepare:v2` key. It stores
only its schema version, a binding to the current Profile revision and
acknowledged Understand review, three document-category review flags, the
document-readiness acknowledgement timestamp, and created/updated timestamps.
The binding records the Profile fingerprint and revision, readiness-checklist
version, Understand acknowledgement time, household size, calculation-input
fingerprint, and threshold source ID/version. Readiness results are recalculated
from the current confirmed metadata; they are not copied into storage. Prepare
does not store Profile values, document content, the packet preview, PDF bytes,
source text, source URLs, or object URLs.

A confirmed Profile correction immediately invalidates the saved Understand
review and any Prepare review. A changed household size, calculation input,
Understand acknowledgement, or threshold source version also invalidates the
saved Prepare review. Refreshing the page restores review flags only while
that complete workflow binding remains unchanged.

## Prepare packet workflow

Prepare opens only after the current Profile is complete and the current
Understand comparison and official source have been explicitly reviewed. Its
four renter actions begin unchecked:

1. Review identity documentation.
2. Review income documentation.
3. Review residency documentation.
4. Review and acknowledge the calculated document-readiness results.

The packet preview is reconstructed in the browser from the validated current
Profile, acknowledged Understand state, frozen HUD corpus, and these explicit
review flags. It is not a stored copy of the packet. The Download control stays
disabled until all four actions are complete; an income amount being below,
equal to, or above the displayed reference threshold never changes that gate.

The reconstructed packet contains these application-preparation sections:

- a cover with generation time, Profile revision, and safety disclaimer;
- confirmed name, address, employer, gross pay, pay frequency, net pay, benefit
  type, and monthly benefit when those fields are present, together with their
  confirmation provenance and retained source document/page references;
- confirmed source-document names, synthetic categories, Profile review
  status, and retained source-page numbers;
- renter-confirmed household size;
- the deterministic annualised-income inputs, formula, and integer-cent result;
- the neutral numerical comparison with the standard 60% MTSP reference
  threshold;
- the verified HUD source title, publisher, geography, rule year, effective
  date, cited table row, and source link; and
- the three deterministic prototype document-readiness results, checklist
  version, review timestamp, acknowledgement status, and disclaimer;
- the explicit Prepare review state and prominent decision-boundary notices.

## Deterministic document-readiness checklist

`src/lib/readiness/checklist.ts` contains the typed, immutable
`housingready-prototype-readiness-v1` definition. It is HousingReady Copilot
product guidance, not an official HUD, property, landlord, or housing-provider
checklist. The same pure evaluation is used by the Prepare page, packet preview,
and downloaded PDF.

The current rules are intentionally narrow:

- Identity document is Present only when retained, reviewed metadata matches an
  explicitly allowlisted identity-document type. None of the three provided
  samples does, so the expected status is Missing.
- Income documentation is Present when reviewed metadata matches an allowlisted
  pay-stub or benefits-letter type or one of those exact provided synthetic
  samples.
- Residency documentation is Present when reviewed metadata matches an
  allowlisted residency type or the provided synthetic residency sample.

A confirmed normalized document type takes precedence. Structured sample kind
is considered only when that type is absent; filename fallback is limited to
the exact committed synthetic filenames. Unknown metadata cannot satisfy a
category. An allowlisted match whose Profile state is not reviewed is marked
Needs review. No item is called expired because this checklist has neither an
explicit expiration rule nor a confirmed expiration date. The calculation does
not read income, HUD threshold results, protected characteristics, or inferred
household relationships.

It deliberately excludes:

- raw PDFs, images, rendered PDF pages, file bytes, thumbnails, preview state,
  base64/data URLs, and file/blob/object URLs;
- full extracted document text, evidence snippets, and unconfirmed or excluded
  candidates;
- rules-assistant questions or answer history;
- protected characteristics or inferred applicant facts; and
- any approval, denial, ranking, score, qualification, or eligibility
  conclusion.

PDF generation dynamically imports jsPDF entirely in the browser. No PDF is
generated during server rendering, page load, or preview reconstruction. The
renderer is invoked only after the renter activates Download and returns a
Blob, the page count, and the filename
`housingready-readiness-packet-revision-{revision}.pdf`. The Prepare UI creates
one short-lived object URL for the browser download, then promptly revokes it;
generated bytes and URLs are never written to session storage or a backend.
Deletion and unmount cleanup also revoke any still-active packet URL. A packet
already downloaded to the device is outside the temporary browser session and
must be deleted from that device by the renter.

## Decision boundary

Every comparison and packet statement is descriptive application-preparation
information. HousingReady Copilot does not approve, deny, rank, score, predict
acceptance, determine countable income, or determine housing eligibility.
The selected 60% MTSP value is a reference threshold for this frozen demo, not
a complete property-specific eligibility rule. A qualified housing
professional applies the complete property and program rules and makes every
final decision.

## Frozen 2026 rule corpus

The prototype is limited to Cambridge, Massachusetts, the
Boston-Cambridge-Quincy, MA-NH HMFA, the LIHTC/MTSP context, and
rule year 2026. The primary comparison is the standard 60% MTSP income limit.
Rule data lives in `src/data/rules`.

`src/data/rules/hud-fy2026-mtsp-cambridge.ts` contains the typed, immutable
local record transcribed from the official HUD USER FY 2026 MTSP report,
Massachusetts table, Boston-Cambridge-Quincy, MA-NH HMFA row, PDF page 130 of
326, effective May 1, 2026. The demo uses this frozen record without a live
network request. HousingReady-authored arithmetic and safety policies are
identified separately and are never presented as official HUD rules.

## Synthetic sample PDFs

Download the three sample PDFs from the Profile page or from
public/sample-documents:

- synthetic-pay-stub.pdf
- synthetic-benefits-letter.pdf
- synthetic-residency-document.pdf

The optional scripts/generate_sample_documents.py and
scripts/verify_sample_documents.py utilities use ReportLab, pypdf, and PyMuPDF
to regenerate and visually verify the documents.

## Manual end-to-end test

1. Open http://localhost:3000 and choose **Delete Session**. Confirm deletion,
   then verify the home page announces that the temporary session was deleted.
2. Open **Profile**, download the three committed synthetic PDFs, and upload all
   three together. Confirm that each PDF previews, each extracted field shows
   source evidence, and no arbitrary-document extraction is claimed.
3. Correct one non-conflicting value, explicitly confirm every retained field,
   resolve or exclude every remaining candidate, and verify **Continue to
   Understand** becomes enabled. Refresh Profile and confirm only structured
   values and document metadata are restored, not the document previews.
4. In **Understand**, select and confirm household size 2. Review the
   deterministic calculation, the neutral standard 60% MTSP comparison, the
   official HUD citation on PDF page 130, and the May 1, 2026 effective date.
   Acknowledge the review and continue to Prepare.
5. In **Prepare**, verify the calculated cards read **Identity document —
   Missing**, **Income documentation — Present**, and **Residency documentation
   — Present**. Inspect their supporting metadata, checklist source and version,
   and prototype-rule warning. Confirm all four review controls begin unchecked.
   Check the three document-category controls; verify Download remains disabled.
   Check **I reviewed the document-readiness results** and verify the
   reconstructed preview and Download become available.
6. Refresh `/prepare`. Verify the four reviews remain checked and the preview
   is rebuilt from current structured state. Inspect session storage: the
   Prepare value may contain only its versioned binding, three category-review
   booleans, readiness acknowledgement timestamp, and created/updated
   timestamps. It must not contain calculated readiness results, PDF bytes,
   `sourceText`, `blob:`/object URLs, or a copied packet model.
7. Activate Download once. Open the PDF and verify its headings, confirmed
   values, document metadata, the three document-readiness results and
   disclaimer, arithmetic, neutral comparison, official source and effective
   date, explicit review state, page breaks, and non-eligibility notice. Confirm
   that no raw source document or full extraction text appears.
8. Return to Profile and correct a confirmed value. Verify Prepare relocks and
   its prior review flags are discarded. Revisit Understand, review and
   acknowledge the updated calculation, then confirm Prepare starts a fresh
   four-action review.
9. Repeat the Understand/Prepare flow with values below, equal to, and above the
   reference threshold. Each reviewed case must be able to reach Prepare; none
   may display an eligibility or approval conclusion. For the exact-equality
   case, confirmed biweekly gross pay of `$2,866.14` and monthly benefit of
   `$650.03` produce `$82,320.00`.
10. From Prepare, test **Delete Session** twice: cancel first and confirm that
    state remains; then confirm deletion and verify Profile, Understand, and
    Prepare keys are cleared while an unrelated session-storage key remains.
    Confirm any active packet preview URL is revoked. Delete any packet already
    downloaded using the device's file controls.
11. Complete the workflow using only the keyboard. Verify visible focus,
    checkbox labels, status text/icons, live announcements, disabled-state
    explanations, PDF-error focus, and PDF download. Repeat at narrow mobile
    width and confirm no content or controls are clipped.
