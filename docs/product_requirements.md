# Product Requirements Document
## AI Opportunity Roadmap Discovery App

## 1. Mission

Build an application that conducts an adaptive business discovery interview with a small or midsize business and collects all required inputs to generate an AI Opportunity Roadmap Report.

The app should feel conversational to the user, while internally building a structured data model of the company, its people, workflows, technology, data assets, pain points, AI readiness, and ranked AI opportunities.

## 2. Primary User

The primary user is a business owner, executive, operator, manager, or consultant conducting discovery for a small or midsize business.

## 3. Core Deliverable

The application produces an AI Opportunity Roadmap Report with these sections:

1. Executive summary
2. Business profile
3. Operating snapshot
4. Current-state AI and technology assessment
5. AI readiness score
6. Strategic AI goals
7. AI opportunity matrix
8. Priority project profiles
9. Phase 2 and Phase 3 opportunities
10. 90-day implementation plan
11. 12- to 24-month roadmap
12. Governance and risk controls
13. Tool category recommendations
14. Pilot scorecard
15. Management decisions required
16. Final recommendation

## 4. MVP Scope

The first version must support:

- One assessment per company
- Adaptive Q&A
- Structured response capture
- Manual answer entry
- Function inventory
- Workflow discovery
- Technology stack inventory
- AI readiness scoring
- Opportunity scoring
- Report generation in Markdown
- Local export/copy functionality

## 5. Out of Scope for MVP

- Payment processing
- Multi-consultant collaboration
- Complex permissions
- Direct integrations with POS, CRM, ATS, ERP, accounting, payroll, or scheduling systems
- Automated system data imports
- Custom-trained models
- Full workflow automation deployment

## 6. Required Data Objects

The app must store:

- CompanyProfile
- BusinessFunction
- RoleGroup
- Workflow
- TechnologySystem
- DataAsset
- DocumentAsset
- PainPoint
- AIReadiness
- GovernanceProfile
- Opportunity
- RoadmapPhase
- Report

## 7. Adaptive Interview Behavior

The app should:

1. Start with broad company context.
2. Build a function map.
3. Identify high-pain and high-volume workflows.
4. Drill into workflows with the greatest potential business value.
5. Capture technology and data context.
6. Score opportunities.
7. Ask additional questions until report readiness reaches threshold.
8. Generate the report.

## 8. Report Readiness Threshold

The app should generate a full-quality report when the assessment reaches at least 85% readiness.

Readiness scoring categories:

- Company profile: 10%
- Function inventory: 10%
- People and roles: 10%
- Workflow detail: 25%
- Technology stack: 15%
- Data readiness: 10%
- Pain points: 10%
- Governance/risk: 5%
- Strategic priorities: 5%

## 9. Key UX Principle

The user should experience the app as a smart interview, not as a static survey.

The system should avoid long generic forms. It should ask the next best question based on what is missing and what has emerged as highest value.
