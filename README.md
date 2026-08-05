# AI Roadmap Discovery App — Starter Build Package

This repository contains a working Next.js and TypeScript MVP for an adaptive SMB AI Opportunity Roadmap application, plus the original static prototype and planning assets.

## Run locally

Requirements: Node.js 20.9 or newer, npm, and an OpenAI API key for AI-assisted interview turns.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `OPENAI_API_KEY` in `.env.local`. The optional `OPENAI_INTERVIEW_MODEL` variable controls the server-side model and otherwise uses the documented default in `.env.example`. Never prefix the key with `NEXT_PUBLIC_`; the browser must not receive it.

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

Discovery now follows a guarded website-first sequence: website analysis, editable fact review, Business Size & Complexity Calibration, calibrated industry workflow cards, opportunity scoring, and report preview. Calibration uses a compact industry-specific set of exact, estimated, ranged, benchmark, unknown/verifiable, or excluded inputs. Workflow volume, time-per-item, and exception edits immediately recalculate annual effort and downstream opportunity priorities.

The repository is a functional adaptive assessment MVP. It can run an assessment from an empty state or load the complete Iona Hospitality example, select the next question, generate schema-aligned data, calculate weighted report readiness, score opportunities, and render a Markdown roadmap report. Assessment state is stored in browser `localStorage`; AI interview turns use a server-only API route.

## AI interview layer

The default **AI interview** mode sends the current assessment, the latest plain-English answer, and the deterministic missing-data queue to `POST /api/ai-interview`. The server calls the OpenAI Responses API and requests a strict structured result containing the next question, rationale, targeted fields, proposed state updates, readiness impact, opportunity signals, and recommended module.

Model output is treated as untrusted. The server accepts only allowlisted assessment paths, strips unknown object fields, validates primitive and collection value types, clamps 1–5 scores, and then recalculates opportunities and roadmap phases with the deterministic scoring engine. The API key remains server-side.

## Deterministic fallback

The original adaptive question library and `applyAnswer` parsers remain intact. Users can select **Module flow** at any time. If the API key is absent, the OpenAI request fails, or the model response is malformed, the chat UI applies the answer through the current deterministic question and clearly marks that turn as a fallback. Readiness, scoring, storage, and report generation remain deterministic in both modes.

## Test the AI interview

1. Copy `.env.example` to `.env.local`, add a valid `OPENAI_API_KEY`, and restart `npm run dev`.
2. Open `http://localhost:3000`, keep **AI interview** selected, and answer the consultant question in plain English.
3. Confirm a single follow-up question appears, **Updated from your answer** lists accepted schema paths, and report readiness changes as sections become complete.
4. Switch to **Module flow** and confirm the deterministic interview continues from the same stored assessment.
5. Temporarily remove the key, restart, answer another AI turn, and confirm the fallback notice appears without losing the answer.
6. Load the Iona sample, open the report, and confirm each recommended project cites its workflow pain, owner, technology, data readiness, and documented effort.

## Print or save the report as PDF

Load the **Iona sample**, open **Report preview**, and click **Print Report**. In the browser print dialog, select a printer or choose **Save as PDF**. The print layout includes only the report content and formats headings, tables, margins, and page breaks for a clean deliverable.

## Core assessment engine

- A single TypeScript `Assessment` object covers company profile, functions, roles, workflows, technology, data and documents, pain points, AI readiness, governance, scored opportunities, and roadmap phases.
- Nine question modules cover company profile, business functions, people and roles, workflows, technology, data readiness, current AI use, strategic priorities, and governance/risk.
- The deterministic interview controller checks coverage and chooses the highest-priority incomplete question instead of following a fixed survey.
- Readiness uses the documented 10/10/10/25/15/10/10/5/5 weighting model.
- Opportunity scores use business value, frequency, repetition, data readiness, adoption, strategic fit, implementation difficulty, and risk. Results are classified as Quick Win, Near-Term Project, Foundation Project, or Future Opportunity.
- The report preview includes an executive summary, detailed company and operating profiles, AI readiness, a 10-opportunity portfolio, five priority-project profiles, a 30/60/90-day plan, a 24-month roadmap, governance recommendations, and a pilot scorecard.
- Target-report readiness now evaluates 19 final-report sections. Full readiness requires a rich operating snapshot, 8–10 significant workflows, role and technology depth, data/document assets, governance, baselines, targets, dependencies, tool categories, phase coverage, and explicit management decisions.
- The rich Iona fixture includes 13 operating metrics, four workforce groups, ten detailed workflows, six core systems, ten scored opportunities, project baselines and targets, and a 24-month roadmap.
- Reports now include five detailed priority-project profiles, Phase 2 and Phase 3 portfolios, implementation complexity, tool categories, management decisions, a final recommendation, and specific assessment gaps.
- A structured `capturedFacts` evidence ledger preserves each numeric or factual value with its label, unit, period, business area, workflow link, confidence, verification sources, related fields, originating answer, and timestamp.
- Deterministic and AI-assisted interview turns both write labeled evidence; ambiguous values trigger an immediate clarification question, while labeled evidence prevents already-answered questions from returning to the missing-data queue.
- The interview UI displays **Captured facts from your answer**, and the report includes the same evidence ledger for auditability.

## Session persistence and portability

The assessment is saved automatically in browser `localStorage` under the existing `ai-roadmap-assessment-v2` key, so refreshing the page resumes the current state. Timestamped interview history and the generated report snapshot are stored under a companion metadata key.

- **Save Session** explicitly saves the structured assessment, interview history, module answers, readiness, coverage checklist, opportunity scores, and report draft.
- **Export Session JSON** downloads a dated, company-named portable session snapshot.
- **Import Session JSON** validates and restores a previous export so the assessment can continue.
- **Start new assessment** and **Load Iona sample** require confirmation before replacing the current browser session.
- Report preview is available throughout discovery and shows current recommendations, completed sections, specific gaps, readiness, and next recommended questions.

## Future phases

The MVP intentionally does not include authentication, a database, collaboration, billing, or deployment configuration. Likely next phases are stronger field-level editing, server persistence and accounts, Markdown/DOCX/PDF export, and industry overlays.

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
