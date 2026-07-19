# HousingReady Copilot

HousingReady Copilot is a renter-side affordable-housing application-readiness
assistant. It helps a renter organize synthetic documents, confirm information,
understand published program rules, identify missing or expired documents,
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
    npm run test
    npm run build

## Routes

- / — product overview
- /profile — synthetic document upload, preview, extraction evidence, correction, and confirmation
- /understand — confirmed Profile information, deterministic income arithmetic, frozen rule-corpus retrieval, citations, and threshold-data abstention
- /prepare — checklist, missing-item review, preview, and download placeholder
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
results, and rule-review completion state. Questions and answer history are not
persisted.

## Frozen 2026 rule corpus

The prototype is limited to Cambridge, Massachusetts, the
Boston-Cambridge-Quincy, MA-NH HUD Metro FMR Area, the LIHTC/MTSP context, and
rule year 2026. Rule data lives in `src/data/rules`.

`src/data/rules/organizer-pack.template.json` contains eight intentionally null
household-size thresholds. Follow `src/data/rules/README.md` to add and activate
the verified Hack-Nation organizer pack. Until that pack is loaded, the app
performs only the transparent Profile arithmetic, abstains from threshold
questions, keeps the official comparison blocked, and does not unlock Prepare.

## Synthetic sample PDFs

Download the three sample PDFs from the Profile page or from
public/sample-documents:

- synthetic-pay-stub.pdf
- synthetic-benefits-letter.pdf
- synthetic-residency-document.pdf

The optional scripts/generate_sample_documents.py and
scripts/verify_sample_documents.py utilities use ReportLab, pypdf, and PyMuPDF
to regenerate and visually verify the documents.
