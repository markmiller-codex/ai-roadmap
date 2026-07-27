# Codex Build Prompt

You are building an MVP web application called AI Roadmap Discovery App.

## Goal

Build an application that conducts an adaptive discovery interview with a small or midsize business and generates an AI Opportunity Roadmap Report.

Use the documents in this repository as the product source of truth:

- docs/product_requirements.md
- docs/report_to_input_mapping.md
- docs/adaptive_interview_controller.md
- schemas/ai_roadmap_assessment.schema.json
- schemas/scoring_model.json

## Build the MVP

Implement:

1. Company assessment creation
2. Adaptive interview UI
3. Structured data capture
4. Report readiness scoring
5. Opportunity scoring
6. AI Opportunity Roadmap Report generator
7. Markdown export
8. Local persistence for MVP

## Recommended Stack

Use:

- Next.js
- TypeScript
- Tailwind CSS
- Zod for schemas
- LocalStorage for MVP persistence
- Later: Supabase/PostgreSQL

## Required Pages

1. `/` — dashboard/new assessment
2. `/assessment/[id]` — adaptive interview
3. `/assessment/[id]/data` — structured data review
4. `/assessment/[id]/report` — generated roadmap report
5. `/settings/questions` — question library editor placeholder

## Required Components

- AssessmentHeader
- ProgressReadinessBar
- QuestionCard
- AnswerInput
- CoverageChecklist
- FunctionMap
- WorkflowList
- OpportunityMatrix
- ReportPreview
- ExportMarkdownButton

## Core Logic Files

Create:

- `lib/schema.ts`
- `lib/readiness.ts`
- `lib/scoring.ts`
- `lib/interview.ts`
- `lib/reportGenerator.ts`
- `lib/industryOverlays.ts`
- `lib/storage.ts`

## Interview Behavior

The app should begin with this question:

"Give me a plain-English description of your business: what you sell, who your customers are, how many employees and locations you have, and what feels hardest to manage right now."

The app should then:

1. Parse the answer into company profile fields where possible.
2. Ask for missing profile fields.
3. Ask which business functions exist.
4. Ask for role/headcount details.
5. Drill into painful/high-volume workflows.
6. Collect current technology systems.
7. Collect AI readiness/governance information.
8. Generate and score opportunities.
9. Produce a report when readiness reaches threshold.

For MVP, the adaptive logic can be rule-based. Add OpenAI model integration later.

## Report Generation

Generate a Markdown report with sections matching the Iona sample structure:

1. Executive Summary
2. Business Profile
3. Operating Snapshot
4. Current-State AI and Technology Assessment
5. Strategic AI Goals
6. AI Opportunity Portfolio
7. Priority AI Projects
8. Phase 2 and Phase 3 Projects
9. Recommended Roadmap
10. Governance Rules
11. Tool Categories
12. 90-Day Implementation Plan
13. Pilot Scorecard
14. Management Decisions Required
15. Final Recommendation

## Acceptance Criteria

The MVP is acceptable when:

- A user can start a company assessment.
- The app asks adaptive questions.
- Answers are saved into structured fields.
- Readiness score updates.
- At least five AI opportunities can be scored.
- The opportunity matrix is ranked.
- A Markdown AI Roadmap Report is generated.
- The report avoids uncertain language when fields are known.
- Missing fields are either omitted, marked as assumptions, or requested before report generation.
