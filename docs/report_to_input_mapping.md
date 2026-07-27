# Report-to-Input Mapping Matrix

This document maps every final report section to the required data the application must collect.

| Report Section | Required Output | Required Inputs | Question Family | Data Object |
|---|---|---|---|---|
| Executive Summary | Confident summary of business, current AI maturity, top opportunities, recommended first projects | Company name, industry, size, locations, revenue model, strategic pressures, AI maturity, top scored opportunities | Company orientation, priorities, scoring | CompanyProfile, AIReadiness, Opportunity |
| Business Profile | Factual business profile | Entity name, locations, industry, employee count, customer types, revenue sources, operating model, management structure | Business orientation | CompanyProfile |
| Operating Snapshot | Numerical/current-state snapshot | Revenue, employees by function, role counts, transaction/customer volumes, applicant volume, invoice volume, customer/contact volume, review volume, manager admin hours | Operating metrics | CompanyProfile, RoleGroup, Workflow |
| Current-State AI Assessment | How the company currently uses AI and technology | Existing AI tools, informal/formal AI use, current systems, data quality, policy/governance status | AI readiness, technology stack | AIReadiness, TechnologySystem |
| Technology Stack Assessment | Function-by-function systems analysis | Systems used, users, data stored, export ability, integration ability, satisfaction, limitations | Technology inventory | TechnologySystem, DataAsset |
| AI Readiness Score | 1-5 readiness score and explanation | Leadership support, data availability, data organization, process documentation, adoption capacity, governance readiness, implementation capacity | AI readiness module | AIReadiness |
| Strategic AI Goals | 3-6 practical goals | Management priorities, pain points, cost/revenue/quality goals, growth goals, operational constraints | Strategic priorities | StrategicPriority, PainPoint |
| Opportunity Matrix | Ranked list of opportunities | Workflows, pain points, frequency, volume, time cost, data readiness, risk, adoption likelihood, complexity | Workflow discovery, opportunity scoring | Workflow, PainPoint, Opportunity |
| Priority Project Profiles | Detailed use-case recommendations | Current pain, use cases, baseline metrics, target metrics, owner, complexity, time to pilot, success metrics | Workflow details and scoring | Opportunity, Workflow |
| Phase 2/3 Opportunities | Later-stage recommendations | Dependencies, data maturity, complexity, integration needs, process maturity | Opportunity sequencing | Opportunity, RoadmapPhase |
| 90-Day Plan | Action plan by period | Top projects, dependencies, users, owners, setup needs, target metrics | Roadmap generation | RoadmapPhase, Opportunity |
| 12-24 Month Roadmap | Long-term direction | Opportunity dependencies, integrations, future capabilities, scale assumptions | Roadmap generation | RoadmapPhase |
| Governance Rules | Practical AI controls | Sensitive data, approval needs, employee/customer/vendor/financial risk, compliance context | Governance module | GovernanceProfile |
| Tool Categories | Recommended categories, not necessarily vendors | Current tools, gaps, integration needs, budget appetite, workflow needs | Technology module | TechnologySystem, Opportunity |
| Pilot Scorecard | Baseline and target metrics | Baseline values, 90-day targets, 12-month targets, measurement cadence | KPI discovery | Opportunity, Workflow |
| Management Decisions | Decisions required before implementation | Sponsor, users, approved tools, data rules, pilot priorities, review cadence | Implementation planning | RoadmapPhase |
| Final Recommendation | Synthesis and immediate next steps | Highest-scored opportunities, readiness, constraints, dependencies | Report generation | All |

## Implementation Rule

Every report statement that appears factual should be grounded in a stored field, a calculated value, or an explicitly labeled industry benchmark/assumption.
