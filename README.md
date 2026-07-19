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
- /understand — household information, program rules, calculations, and citations
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

Session storage contains only confirmed structured fields and document
metadata. Raw files, full document text, images, PDF bytes, and object URLs are
never persisted.

## Synthetic sample PDFs

Download the three sample PDFs from the Profile page or from
public/sample-documents:

- synthetic-pay-stub.pdf
- synthetic-benefits-letter.pdf
- synthetic-residency-document.pdf

The optional scripts/generate_sample_documents.py and
scripts/verify_sample_documents.py utilities use ReportLab, pypdf, and PyMuPDF
to regenerate and visually verify the documents.
