# Production Architecture Brief

## MVP Architecture

Browser UI:
- Adaptive interview
- Data review
- Opportunity matrix
- Report preview

Application logic:
- Rule-based question selection
- Readiness scoring
- Opportunity scoring
- Report generation

Storage:
- LocalStorage for MVP
- Supabase/Postgres for production

AI Layer:
- MVP: no model required
- Version 2: OpenAI model suggests next question and extracts structured data
- Version 3: OpenAI model generates report from structured data using strict schema

## Production Data Flow

1. User starts assessment.
2. App creates Assessment record.
3. User answers question.
4. AI extraction layer updates structured data.
5. Readiness engine recalculates completeness.
6. Interview controller selects next question.
7. Opportunity engine identifies/scored use cases.
8. Report generator produces Markdown.
9. User edits/approves report.
10. App exports PDF/DOCX.

## Recommended Database Tables

- users
- organizations
- assessments
- company_profiles
- business_functions
- role_groups
- workflows
- technology_systems
- data_assets
- document_assets
- pain_points
- ai_readiness_profiles
- governance_profiles
- opportunities
- roadmap_phases
- reports
- questions
- answers
- assumptions

## AI Integration Design

Use model calls for three tasks:

1. Extract structured data from free-form answers.
2. Choose the next best question.
3. Draft report sections from structured data.

Keep scoring deterministic.

## Why scoring should remain deterministic

Deterministic scoring allows the app to explain why an opportunity ranked highly. The model can describe and reason, but the numeric ranking should come from transparent rules.
