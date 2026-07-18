# HousingReady Copilot

HousingReady Copilot is a renter-side affordable-housing application-readiness
assistant. It helps a renter organise synthetic documents, confirm information,
understand published programme rules, identify missing or expired documents,
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
    npm run build

## Routes

- / — product overview
- /profile — synthetic document upload and confirmation placeholder
- /understand — household information, programme rules, calculations, and citations
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
