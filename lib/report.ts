import { calculateReadiness } from "./readiness";
import { getSpecificAssessmentGaps } from "./report-coverage";
import { getMissingData } from "./interview";
import type { Assessment, Opportunity } from "@/types/assessment";

const list = (items: string[] | undefined) => items?.length ? items.join(", ") : "Not captured";
const money = (value: number | null) => value === null ? "Not captured" : new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(value);
const average = (values:Array<number|null>) => { const available=values.filter((value):value is number=>value!==null); return available.length ? Math.round(available.reduce((a,b)=>a+b,0)/available.length*10)/10 : 0; };
const metricRows = (a:Assessment) => a.operating_metrics.map((m)=>`| ${m.metric_name} | ${m.value.toLocaleString()} ${m.unit} | ${m.period} | ${m.source} |`).join("\n") || "| — | Not captured | — | — |";
const opportunityRows = (items:Opportunity[]) => items.map((o,i)=>`| ${i+1} | ${o.opportunity_name} | ${o.owner || "Not captured"} | ${o.total_score} | ${o.classification} | ${o.recommended_phase} | ${o.time_to_pilot} |`).join("\n") || "| — | No opportunities scored | — | — | — | — | — |";
const targetRows = (opportunity:Opportunity) => (opportunity.target_metrics ?? []).map((m)=>`| ${m.metric_name} | ${m.baseline} | ${m.target} | ${m.measurement_period} | ${m.source} |`).join("\n") || "| Metric not captured | — | — | — | — |";
const evidenceValue = (value: Assessment["capturedFacts"][number]["value"]) => typeof value === "object" ? `${value.min}–${value.max}` : String(value);

function projectProfile(o:Opportunity,index:number) {
  return `### ${index+1}. ${o.opportunity_name}

${o.description}

- Business evidence: ${list(o.business_evidence)}
- Accountable owner: ${o.owner || "Not captured"}
- Related workflow: ${o.related_workflow}
- Classification / phase: ${o.classification} / ${o.recommended_phase}
- Pilot timing: ${o.time_to_pilot}
- Tool categories: ${list(o.tool_categories)}
- Implementation dependencies: ${list(o.implementation_dependencies)}
- Success measures: ${list(o.success_metrics)}

| Metric | Baseline | Target | Measurement period | Source |
|---|---|---|---|---|
${targetRows(o)}`;
}

export function generateReport(state:Assessment) {
  const c=state.company_profile, readiness=calculateReadiness(state), top=state.opportunities.slice(0,5), aiScore=average([state.ai_readiness.leadership_support,state.ai_readiness.employee_readiness,state.ai_readiness.data_availability,state.ai_readiness.data_organization,state.ai_readiness.process_documentation,state.ai_readiness.governance_maturity,state.ai_readiness.implementation_capacity]);
  const totalHours=state.workflows.reduce((sum,w)=>sum+(w.weekly_time_cost_hours??0),0); const phase2=state.opportunities.filter((o)=>o.recommended_phase==="Phase 2"), phase3=state.opportunities.filter((o)=>o.recommended_phase==="Phase 3"); const gaps=getSpecificAssessmentGaps(state); const completedSections=readiness.sections.filter((section)=>section.complete); const nextQuestions=getMissingData(state).slice(0,8); const issues=state.discoveryIssues??[]; const materialIssues=issues.filter((issue)=>!["verified","resolved"].includes(issue.status)),includedEstimates=state.expectedWorkflowReviews.filter((item)=>item.status==="exists"||item.status==="missed_add"),allReviewed=state.expectedWorkflowReviews.length>0&&state.expectedWorkflowReviews.every((item)=>item.status!=="unreviewed"),hasBenchmarks=includedEstimates.some((item)=>item.sourceType==="industry_benchmark"||item.confidence==="benchmark_assumption")||issues.some((issue)=>issue.issueType==="benchmark_assumption"); const reportStatus=readiness.percent>=95&&!materialIssues.length&&!hasBenchmarks?"Implementation-Ready Roadmap":!allReviewed||readiness.percent<60?"Early Discovery Draft":hasBenchmarks?"Benchmark-Supported Draft":"User-Validated Draft";
  return `# AI Opportunity Roadmap Report

## ${c.company_name || "Company assessment"}

**Industry:** ${c.industry || "Not captured"}  
**Target-report readiness:** ${readiness.percent}%

**Report status:** ${reportStatus}

**AI readiness:** ${aiScore}/5
**Opportunity portfolio:** ${state.opportunities.length} scored opportunities

## 1. Executive summary

${c.company_name || "The company"} is a ${c.locations ?? "location count not captured"}-location ${c.subindustry || c.industry || "business"} with ${c.employee_count ?? "unconfirmed"} employees and ${money(c.annual_revenue)} in annual revenue. Discovery documented ${state.operating_metrics.length} operating metrics, ${state.workflows.length} significant workflows, ${Math.round(totalHours*10)/10} weekly hours of recurring process burden, and ${state.opportunities.length} AI opportunities. The recommended sequence begins with ${top.slice(0,3).map((o)=>o.opportunity_name).join(", ") || "further discovery"}, governed by human approval and measured against explicit baselines.

## 2. Business profile

| Category | Current profile |
|---|---|
| Company | ${c.company_name || "Not captured"} |
| Industry | ${c.industry || "Not captured"} — ${c.subindustry || "Not captured"} |
| Employees / locations | ${c.employee_count ?? "Not captured"} / ${c.locations ?? "Not captured"} |
| Annual revenue | ${money(c.annual_revenue)} |
| Management structure | ${c.management_structure || "Not captured"} |
| Customer segments | ${list(c.customer_types)} |
| Revenue sources | ${list(c.revenue_sources)} |
| Operating model | ${c.operating_model || "Not captured"} |

## Data Quality and Assumptions

This report is classified as **${reportStatus}**. Confirmed company evidence is used confidently; estimates and industry benchmarks are treated as provisional. Excluded variables are not treated as scoring evidence. Recommendations that materially depend on benchmark assumptions are promising but need validation.

- User estimates: ${state.capturedFacts.filter((fact)=>fact.sourceType==="user_estimate").length}
- Industry benchmark assumptions: ${state.capturedFacts.filter((fact)=>fact.sourceType==="industry_benchmark").length}
- Unknown or verification-needed items: ${issues.filter((issue)=>issue.status==="open").length}
- Excluded variables: ${issues.filter((issue)=>issue.status==="excluded").length}
- Unresolved conflicts: ${issues.filter((issue)=>issue.issueType==="conflicting_information"&&issue.status!=="resolved").length}

## Workflow Discovery Coverage

- Expected workflows reviewed: ${state.expectedWorkflowReviews.filter((item)=>item.status!=="unreviewed").length} of ${state.expectedWorkflowReviews.length}
- Confirmed or added workflows: ${state.expectedWorkflowReviews.filter((item)=>item.status==="exists"||item.status==="missed_add").length}
- Outsourced workflows: ${state.expectedWorkflowReviews.filter((item)=>item.status==="outsourced").map((item)=>item.workflowName).join(", ")||"None recorded"}
- Not material / does not exist: ${state.expectedWorkflowReviews.filter((item)=>item.status==="not_material"||item.status==="does_not_exist").map((item)=>item.workflowName).join(", ")||"None recorded"}
- Missing or needing discussion: ${state.expectedWorkflowReviews.filter((item)=>item.status==="needs_discussion"||item.status==="unreviewed").map((item)=>item.workflowName).join(", ")||"None"}

| Confirmed workflow | Owner | Volume | Time burden | Exceptions | Systems / data / documents | Materiality | Source / confidence |
|---|---|---:|---:|---:|---|---|---|
${state.workflows.map((workflow)=>`| ${workflow.workflow_name} | ${workflow.owner||"Not captured"} | ${workflow.monthly_volume??"?"}/month | ${workflow.weekly_time_cost_hours??"?"} hours/week | ${workflow.exception_rate_percent??"?"}% | ${list([...workflow.systems_used,...(workflow.data_sources??[]),...workflow.documents_used])} | ${list(workflow.materiality_reasons)} | ${workflow.sourceType??"system_inferred"} / ${workflow.confidence??"inferred"} |`).join("\n")||"| No confirmed workflows | â€” | â€” | â€” | â€” | â€” | â€” | â€” |"}

### ROI-driven workflow estimates

| Workflow | Annual volume | Annual effort | Current pain | AI opportunity | Complexity | ROI logic | Confidence / source | Verify before implementation |
|---|---:|---:|---|---|---|---|---|---|
${includedEstimates.map((item)=>`| ${item.workflowName} | ${item.estimatedAnnualVolume?`${item.estimatedAnnualVolume.min}-${item.estimatedAnnualVolume.max} ${item.estimatedAnnualVolume.unit}`:"Unknown"} | ${item.estimatedAnnualHours?`${item.estimatedAnnualHours.min}-${item.estimatedAnnualHours.max} hours`:"Unknown"} | ${list(item.commonPainPoints)} | ${list(item.aiOpportunities)} | ${list(item.complexityFactors)} | Recurring annual hours × feasible time reduction, adjusted for implementation cost and risk | ${item.confidence} / ${item.sourceType} | ${list(item.verificationSources)} |`).join("\n")||"| No workflow estimates accepted | â€” | â€” | â€” | â€” | â€” | â€” | â€” | â€” |"}

## 3. Operating snapshot

| Operating metric | Value | Period | Source |
|---|---:|---|---|
${metricRows(state)}

Employee and role breakdown: ${state.role_groups.map((role)=>`${role.role_name}: ${role.headcount ?? "?"}`).join("; ") || "Not captured"}.

### Captured evidence ledger

| Fact | Value | Unit | Period | Business area | Workflow | Confidence |
|---|---:|---|---|---|---|---|
${(state.capturedFacts ?? []).map((fact)=>`| ${fact.label} | ${evidenceValue(fact.value)} | ${fact.unit} | ${fact.timePeriod} | ${fact.businessArea} | ${fact.workflowId || "—"} | ${fact.confidence} |`).join("\n") || "| — | — | — | — | — | — | No facts captured |"}

## 4. Current-state AI and technology assessment

Current AI use: ${state.ai_readiness.current_ai_use || "Not captured"} Formal AI policy: ${state.ai_readiness.formal_ai_policy === false ? "No" : state.ai_readiness.formal_ai_policy ? "Yes" : "Not captured"}. Structured AI training: ${state.ai_readiness.structured_ai_training === false ? "No" : state.ai_readiness.structured_ai_training ? "Yes" : "Not captured"}.

| System | Function | Data | Export | Integration | Limitations |
|---|---|---|---|---|---|
${state.technology_stack.map((s)=>`| ${s.system_name} | ${s.function_served} | ${list(s.data_stored)} | ${s.export_capability} | ${s.integration_capability} | ${list(s.limitations)} |`).join("\n") || "| — | — | — | — | — | Not captured |"}

## 5. AI readiness score and interpretation

| Dimension | Score |
|---|---:|
| Leadership support | ${state.ai_readiness.leadership_support ?? "—"} |
| Employee readiness | ${state.ai_readiness.employee_readiness ?? "—"} |
| Data availability | ${state.ai_readiness.data_availability ?? "—"} |
| Data organization | ${state.ai_readiness.data_organization ?? "—"} |
| Process documentation | ${state.ai_readiness.process_documentation ?? "—"} |
| Governance maturity | ${state.ai_readiness.governance_maturity ?? "—"} |
| Implementation capacity | ${state.ai_readiness.implementation_capacity ?? "—"} |

Interpretation: leadership support and usable exports create a credible pilot path, while governance, training, data ownership, and manager capacity should be treated as explicit implementation work—not assumed away.

## 6. Strategic AI goals

${c.strategic_priorities.map((goal)=>`- ${goal}`).join("\n") || "- Not captured"}

## 7. AI opportunity portfolio

| Rank | Opportunity | Owner | Score | Classification | Phase | Pilot timing |
|---:|---|---|---:|---|---|---|
${opportunityRows(state.opportunities)}

## 8. Priority AI projects

${top.map(projectProfile).join("\n\n") || "Further discovery is required before recommending projects."}

## 9. Phase 2 projects

${phase2.map((o)=>`- ${o.opportunity_name}: ${o.description} Owner: ${o.owner || "Not captured"}. Target: ${o.target_metrics?.[0]?.target || "Not captured"}.`).join("\n") || "- No Phase 2 projects are ready."}

## 10. Phase 3 projects

${phase3.map((o)=>`- ${o.opportunity_name}: ${o.description} Dependencies: ${list(o.implementation_dependencies)}.`).join("\n") || "- No Phase 3 projects are ready."}

## 11. 24-month roadmap

${state.roadmap_phases.map((p)=>`### ${p.timeframe} — ${p.phase_name}\n\nProjects: ${list(p.opportunity_names)}\n\n${p.objectives.map((item)=>`- ${item}`).join("\n")}\n\nSuccess measures: ${list(p.success_measures)}.`).join("\n\n") || "Roadmap phases require further discovery."}

## 12. Implementation complexity guide

| Project | Complexity | Risk | Data readiness | Key dependencies |
|---|---|---:|---:|---|
${top.map((o)=>`| ${o.opportunity_name} | ${o.complexity} | ${o.risk_score}/5 | ${o.data_readiness_score}/5 | ${list(o.implementation_dependencies)} |`).join("\n") || "| — | — | — | — | Not captured |"}

## 13. Governance and control rules

- Sensitive data: ${list(state.governance_profile.sensitive_data_types)}.
- Human approval required: ${list(state.governance_profile.requires_human_approval)}.
- Regulatory constraints: ${list(state.governance_profile.regulated_constraints)}.
- Vendor/customer data rules: ${list(state.governance_profile.vendor_or_customer_data_rules)}.
- Keep humans accountable for employee, customer, financial, and public decisions; log pilot inputs, outputs, exceptions, approvals, and review results.

## 14. Tool category recommendations

${top.map((o)=>`- ${o.opportunity_name}: ${list(o.tool_categories)}.`).join("\n") || "- Tool categories require project definition."}

## 15. First 90-day implementation plan

${state.roadmap_phases.slice(0,3).map((p)=>`### ${p.timeframe} — ${p.phase_name}\n\nProjects: ${list(p.opportunity_names)}\n\n${p.objectives.map((item)=>`- ${item}`).join("\n")}`).join("\n\n") || "A 90-day plan requires named projects and owners."}

## 16. Pilot scorecard

| Project | Metric | Baseline | Target | Review period |
|---|---|---|---|---|
${top.slice(0,3).flatMap((o)=>(o.target_metrics ?? []).map((m)=>`| ${o.opportunity_name} | ${m.metric_name} | ${m.baseline} | ${m.target} | ${m.measurement_period} |`)).join("\n") || "| — | — | — | — | — |"}

## 17. Management decisions required

${state.management_decisions.map((decision)=>`- ${decision}`).join("\n") || "- Name a sponsor, owners, approved tools, governance rules, baselines, and pilot stage gates."}

## 18. Final recommendation

Begin with ${top[0]?.opportunity_name || "a tightly scoped, low-risk workflow"} under ${top[0]?.owner || "a named business owner"}, then add ${top[1]?.opportunity_name || "a second evidence-backed pilot"}. Do not authorize portfolio-scale automation until management approves governance, validates baselines, trains users, and reviews 60- and 90-day scorecards. The objective is measured operating improvement—not AI adoption for its own sake.

## 19. Appendix — opportunity prioritization summary

| Rank | Opportunity | Owner | Score | Classification | Phase | Pilot timing |
|---:|---|---|---:|---|---|---|
${opportunityRows(state.opportunities)}

## Assessment gaps

${gaps.map((gap)=>`- ${gap}`).join("\n") || "- No target-report coverage gaps remain."}

## Assumptions and Verification Needed

${state.capturedFacts.filter((fact)=>fact.sourceType==="industry_benchmark"||fact.sourceType==="user_estimate"||fact.sourceType==="unknown_verifiable"||fact.needsConfirmation).map((fact)=>`- **${fact.label}:** ${evidenceValue(fact.value)} ${fact.unit} - ${fact.sourceType.replaceAll("_"," ")}, ${fact.confidence}${fact.sourceUrl?` ([source](${fact.sourceUrl}))`:""}.`).join("\n") || "- No material assumptions or unverified values are currently recorded."}

### Opportunity validation status

${state.opportunities.map((opportunity)=>{const related=state.capturedFacts.filter((fact)=>!fact.workflowId||fact.workflowId.toLowerCase()===opportunity.related_workflow.toLowerCase());const status=related.some((fact)=>fact.sourceType==="industry_benchmark")?"Benchmark-based opportunity needing confirmation":related.some((fact)=>fact.sourceType==="user_estimate"||fact.needsConfirmation)?"Promising opportunity needing validation":related.some((fact)=>fact.sourceType==="user_confirmed")?"Implementation-ready opportunity":"Promising opportunity needing validation";return `- ${opportunity.opportunity_name}: ${status}.`;}).join("\n") || "- No opportunities scored."}

## Draft report status

**Readiness:** ${readiness.percent}% (${completedSections.length} of ${readiness.sections.length} target report sections complete)

Completed sections:

${completedSections.map((section)=>`- ${section.label}`).join("\n") || "- No target sections are complete yet; the available content remains an early draft."}

Draft recommendations available now:

${top.slice(0,3).map((opportunity)=>`- ${opportunity.opportunity_name}: ${opportunity.classification}, ${opportunity.recommended_phase}.`).join("\n") || "- Complete workflow discovery to generate recommendations."}

## Next recommended questions

${nextQuestions.map((question,index)=>`${index+1}. ${question.label}`).join("\n") || "1. No required deterministic questions remain; review specific report gaps above."}
`;
}
