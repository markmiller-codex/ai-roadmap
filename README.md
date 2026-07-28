# AI Roadmap Discovery App — Starter Build Package

This repository contains a working Next.js and TypeScript MVP for an adaptive SMB AI Opportunity Roadmap application, plus the original static prototype and planning assets.

## Run locally

Requirements: Node.js 20.9 or newer and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Load Iona sample** for a populated assessment, complete the interview, and open **Preview report** to see the generated Markdown report.

Before sharing changes, verify the production build:

```bash
npm run lint
npm run build
```

## Application structure

- `app/` — Next.js App Router pages and global styles
- `components/` — interview, readiness, opportunity, and report UI
- `lib/` — typed interview, scoring, readiness, report, and local-storage logic
- `types/` — assessment domain types based on the JSON schema
- `sample-data/` — loadable Iona Hospitality seed data
- `prototype/` — preserved original static HTML/CSS/JavaScript prototype
- `schemas/`, `docs/`, and `prompts/` — source requirements and build references

## Current app status

The repository is a functional, browser-only MVP. It can run an assessment from an empty state or load the complete Iona Hospitality example, adaptively select the next question, generate schema-aligned data, calculate weighted report readiness, score opportunities, and render a Markdown roadmap report. State is stored in browser `localStorage`; no server or account is required.

## Core assessment engine

- A single TypeScript `Assessment` object covers company profile, functions, roles, workflows, technology, data and documents, pain points, AI readiness, governance, scored opportunities, and roadmap phases.
- Nine question modules cover company profile, business functions, people and roles, workflows, technology, data readiness, current AI use, strategic priorities, and governance/risk.
- The deterministic interview controller checks coverage and chooses the highest-priority incomplete question instead of following a fixed survey.
- Readiness uses the documented 10/10/10/25/15/10/10/5/5 weighting model.
- Opportunity scores use business value, frequency, repetition, data readiness, adoption, strategic fit, implementation difficulty, and risk. Results are classified as Quick Win, Near-Term Project, Foundation Project, or Future Opportunity.
- The report preview includes an executive summary, company and operating profiles, AI readiness, opportunity matrix, three recommended projects, 30/60/90-day plan, 12-month roadmap, governance recommendations, and pilot scorecard.

## Future phases

The MVP intentionally does not include authentication, a database, collaboration, billing, deployment configuration, or OpenAI API calls. Likely next phases are stronger field-level editing and validation, server persistence and accounts, model-assisted answer extraction and question selection, Markdown/DOCX/PDF export, and industry overlays.

## What this starter includes

1. A working Next.js/TypeScript application and the original static prototype in `/prototype`
2. A universal SMB discovery data schema in `/schemas`
3. A first-pass scoring model in `/schemas`
4. A report-to-input mapping matrix in `/docs`
5. Adaptive interview controller rules in `/docs`
6. A Codex-ready build prompt in `/prompts`
7. A production architecture brief in `/docs`

## Recommended first MVP

The MVP should do five things:

1. Conduct an adaptive discovery interview.
2. Convert answers into structured business data.
3. Score AI opportunities.
4. Generate a practical AI Opportunity Roadmap Report.
5. Export the report as Markdown, DOCX, or PDF.

## Prototype

The original no-build prototype remains available at:

`prototype/index.html`

The prototype runs locally in a browser with no backend. It demonstrates the data model, adaptive question flow, scoring logic, and report generation.

## Production Stack Recommendation

For the first production version:

- Front end: Next.js + TypeScript
- Backend/API: Next.js API routes or FastAPI
- Database: PostgreSQL via Supabase
- Auth: Supabase Auth or Clerk
- AI model layer: OpenAI API
- Exports: Markdown first, then DOCX/PDF
- Hosting: Vercel for web app, Supabase for data

## Development Sequence

1. Implement data model.
2. Implement adaptive interview controller.
3. Implement report readiness scoring.
4. Implement opportunity scoring.
5. Implement report generator.
6. Add user accounts and saved assessments.
7. Add industry overlays.
8. Add document export.
9. Add admin editor for question library.
10. Add OpenAI-based next-question generation.
