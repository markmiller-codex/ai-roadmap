# AI Roadmap Discovery App — Starter Build Package

This package contains the minimum build assets for an adaptive SMB AI Opportunity Roadmap application.

## What this starter includes

1. A working static prototype in `/prototype`
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

Open:

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
