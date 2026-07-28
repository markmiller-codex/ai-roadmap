import { calculateReadiness } from "./readiness";
import type { Assessment, Opportunity } from "@/types/assessment";

const list = (items: string[]) => items.length ? items.join(", ") : "Not captured";
const money = (value: number | null) => value === null ? "Not captured" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const rows = (items: Opportunity[]) => items.length ? items.map((o, i) => `| ${i + 1} | ${o.opportunity_name} | ${o.total_score} | ${o.classification} | ${o.time_to_pilot} |`).join("\n") : "| — | No opportunities scored | — | — | — |";
const average = (values: Array<number | null>) => { const available = values.filter((value): value is number => value !== null); return available.length ? Math.round(available.reduce((a, b) => a + b, 0) / available.length * 10) / 10 : 0; };

export function generateReport(state: Assessment) {
  const c = state.company_profile; const readiness = calculateReadiness(state); const top = state.opportunities.slice(0, 3);
  const aiScore = average([state.ai_readiness.leadership_support, state.ai_readiness.employee_readiness, state.ai_readiness.data_availability, state.ai_readiness.data_organization, state.ai_readiness.process_documentation, state.ai_readiness.governance_maturity, state.ai_readiness.implementation_capacity]);
  const totalHours = state.workflows.reduce((sum, workflow) => sum + (workflow.weekly_time_cost_hours ?? 0), 0);
  const phase = (name: string) => state.roadmap_phases.find((item) => item.phase_name === name);
  const project = (o: Opportunity, i: number) => {
    const workflow = state.workflows.find((item) => item.workflow_name === o.related_workflow);
    const systems = workflow?.systems_used.length ? workflow.systems_used.join(", ") : "No source system confirmed";
    const pain = workflow?.bottlenecks[0] || state.pain_points.find((item) => item.workflow_name === o.related_workflow)?.pain_point || "Pain point requires confirmation";
    return `### ${i + 1}. ${o.opportunity_name}\n\n${o.description}\n\n- Business evidence: ${pain}\n- Workflow owner: ${workflow?.owner || "Owner not captured"}\n- Current technology: ${systems}\n- Data readiness: ${workflow?.data_readiness ?? "Not scored"}/5\n- Documented effort: ${workflow?.weekly_time_cost_hours ?? "Not quantified"} hours/week\n- Classification: ${o.classification}\n- Pilot timing: ${o.time_to_pilot}\n- Measures: ${list(o.success_metrics)}`;
  };
  return `# AI Opportunity Roadmap Report

## ${c.company_name || "Company assessment"}

**Industry:** ${c.industry || "Not captured"}  
**Assessment readiness:** ${readiness.percent}%  
**AI readiness:** ${aiScore}/5

## 1. Executive summary

${c.company_name || "The company"} operates ${c.locations ?? "an unconfirmed number of"} location(s) with ${c.employee_count ?? "an unconfirmed number of"} employees. The assessment identified ${state.workflows.length} priority workflows, approximately ${totalHours} documented hours of weekly process effort, and ${state.opportunities.length} scored AI opportunities. The recommended first projects are ${top.length ? top.map((o) => o.opportunity_name).join(", ") : "pending further discovery"}.

## 2. Business profile

| Category | Current profile |
|---|---|
| Company | ${c.company_name || "Not captured"} |
| Industry | ${c.industry || "Not captured"}${c.subindustry ? ` — ${c.subindustry}` : ""} |
| Employees / locations | ${c.employee_count ?? "Not captured"} / ${c.locations ?? "Not captured"} |
| Annual revenue | ${money(c.annual_revenue)} |
| Customer types | ${list(c.customer_types)} |
| Revenue sources | ${list(c.revenue_sources)} |
| Operating model | ${c.operating_model || "Not captured"} |

## 3. Operating snapshot

| Measure | Identified |
|---|---:|
| Business functions | ${state.business_functions.length} |
| Role groups | ${state.role_groups.length} |
| Workflows | ${state.workflows.length} |
| Technology systems | ${state.technology_stack.length} |
| Data and document assets | ${state.data_assets.length + state.document_assets.length} |
| Pain points | ${state.pain_points.length} |

Highest-pain functions: ${state.business_functions.filter((f) => f.pain_level >= 4).map((f) => f.function_name).join(", ") || "Not captured"}.

## 4. AI readiness score

**Overall AI readiness: ${aiScore}/5**

| Dimension | Score |
|---|---:|
| Leadership support | ${state.ai_readiness.leadership_support ?? "—"} |
| Employee readiness | ${state.ai_readiness.employee_readiness ?? "—"} |
| Data availability | ${state.ai_readiness.data_availability ?? "—"} |
| Data organization | ${state.ai_readiness.data_organization ?? "—"} |
| Process documentation | ${state.ai_readiness.process_documentation ?? "—"} |
| Governance maturity | ${state.ai_readiness.governance_maturity ?? "—"} |
| Implementation capacity | ${state.ai_readiness.implementation_capacity ?? "—"} |

Current AI use: ${state.ai_readiness.current_ai_use || "Not captured"}

## 5. Opportunity matrix

| Rank | Opportunity | Score | Classification | Time to pilot |
|---:|---|---:|---|---|
${rows(state.opportunities)}

## 6. Recommended first three projects

${top.map(project).join("\n\n") || "Further discovery is required before recommending projects."}

## 7. 30/60/90-day plan

### Days 1–30 — Foundation
${(phase("Foundation")?.objectives ?? ["Confirm owners, baselines, and governance rules"]).map((item) => `- ${item}`).join("\n")}

### Days 31–60 — Pilot
${(phase("Pilot")?.objectives ?? ["Launch the first low-risk pilot"]).map((item) => `- ${item}`).join("\n")}

### Days 61–90 — Validate and expand
${(phase("Validate and expand")?.objectives ?? ["Measure results and expand proven workflows"]).map((item) => `- ${item}`).join("\n")}

## 8. 12-month roadmap

- **Months 1–3:** Complete governance, baselines, quick-win pilots, and adoption review.
- **Months 4–6:** Expand successful near-term projects and improve data access.
- **Months 7–9:** Standardize reusable prompts, operating procedures, and measurement.
- **Months 10–12:** Evaluate higher-complexity integrations only where pilots proved value.

Future opportunities: ${state.opportunities.filter((o) => o.classification === "Future Opportunity").map((o) => o.opportunity_name).join(", ") || "None currently classified"}.

## 9. Governance recommendations

- Sensitive data: ${list(state.governance_profile.sensitive_data_types)}.
- Human approval required for: ${list(state.governance_profile.requires_human_approval)}.
- Regulatory constraints: ${list(state.governance_profile.regulated_constraints)}.
- Use approved tools and minimum-necessary data.
- Keep humans accountable for employee, customer, financial, and public decisions.
- Log pilot owners, inputs, outputs, exceptions, and review results.

## 10. Pilot scorecard

| Metric | Baseline | 30-day | 60-day | 90-day |
|---|---|---|---|---|
| Weekly hours spent | Measure before pilot | Track | Reduce 15% | Reduce 25% |
| Cycle time | Measure before pilot | Track | Reduce 15% | Reduce 25% |
| Output quality / rework | Measure before pilot | Track | Improve 10% | Improve 20% |
| Active-user adoption | 0% | 50% | 70% | 80%+ |
| Exceptions requiring escalation | Measure before pilot | Track | Review pattern | Establish control target |

## Assessment gaps

${readiness.missingFields.map((item) => `- ${item}`).join("\n") || "- No required MVP coverage gaps remain."}
`;
}
