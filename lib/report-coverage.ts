import type { Assessment, ReadinessSection } from "@/types/assessment";
import { factSatisfiesField, factSatisfiesWorkflowField } from "./evidence";

const complete = (key: string, label: string, condition: boolean, missing: string[]): ReadinessSection => ({ key, label, weight: 1 / 19, complete: condition, missing: condition ? [] : missing });
const detailedWorkflows = (a: Assessment) => a.workflows.filter((w) => Boolean(w.owner && w.monthly_volume && w.time_per_instance_minutes && w.systems_used.length && w.data_sources?.length && w.bottlenecks.length));
const projectReady = (a: Assessment) => a.opportunities.filter((o) => Boolean(o.owner && o.baseline_metrics?.length && o.target_metrics?.length && o.implementation_dependencies?.length));

export function getReportCoverage(a: Assessment): ReadinessSection[] {
  const phase2 = a.opportunities.filter((o) => o.recommended_phase === "Phase 2");
  const phase3 = a.opportunities.filter((o) => o.recommended_phase === "Phase 3");
  return [
    complete("executive_summary", "Executive summary", Boolean(a.company_profile.company_name && a.company_profile.industry && a.opportunities.length >= 10), ["company facts and 10-opportunity portfolio"]),
    complete("business_profile", "Business profile", Boolean(a.company_profile.employee_count && (a.company_profile.annual_revenue || factSatisfiesField(a,"company_profile.annual_revenue")) && a.company_profile.management_structure && a.company_profile.customer_types.length >= 3 && a.company_profile.revenue_sources.length >= 3), ["revenue, management structure, customer segments, and revenue sources"]),
    complete("operating_snapshot", "Operating snapshot", a.operating_metrics.length + (a.capturedFacts ?? []).filter((fact)=>!fact.needsClarification && fact.relatedFields.includes("operating_metrics")).length >= 10 && a.role_groups.length >= 4, ["at least 10 labeled operating facts/metrics and 4 role groups"]),
    complete("current_state", "Current-state AI and technology assessment", a.technology_stack.length >= 5 && Boolean(a.ai_readiness.current_ai_use), ["at least 5 systems and current AI-use detail"]),
    complete("ai_readiness", "AI readiness score", [a.ai_readiness.leadership_support,a.ai_readiness.employee_readiness,a.ai_readiness.data_availability,a.ai_readiness.data_organization,a.ai_readiness.process_documentation,a.ai_readiness.governance_maturity,a.ai_readiness.implementation_capacity].every(Boolean), ["all seven AI-readiness dimensions"]),
    complete("strategic_goals", "Strategic AI goals", a.company_profile.strategic_priorities.length >= 5, ["at least 5 strategic priorities"]),
    complete("opportunity_portfolio", "AI opportunity portfolio", a.workflows.length >= 10 && a.opportunities.length >= 10, ["at least 10 significant workflows and opportunities"]),
    complete("priority_projects", "Priority AI projects", projectReady(a).length >= 5, ["owners, baselines, targets, and dependencies for the first 5 projects"]),
    complete("phase_2_projects", "Phase 2 projects", phase2.length >= 2, ["at least 2 Phase 2 projects"]),
    complete("phase_3_projects", "Phase 3 projects", phase3.length >= 2, ["at least 2 Phase 3 projects"]),
    complete("roadmap_24_month", "24-month roadmap", a.roadmap_phases.length >= 4 && a.roadmap_phases.every((p) => p.objectives.length && p.dependencies.length && p.success_measures.length), ["four populated roadmap phases"]),
    complete("complexity_guide", "Implementation complexity guide", a.opportunities.length >= 5 && a.opportunities.slice(0, 5).every((o) => o.implementation_dependencies?.length && o.complexity), ["complexity factors and dependencies for priority projects"]),
    complete("governance_rules", "Governance and control rules", a.governance_profile.sensitive_data_types.length >= 3 && a.governance_profile.requires_human_approval.length >= 3 && a.governance_profile.vendor_or_customer_data_rules.length >= 2, ["sensitive-data, approval, and tool-use rules"]),
    complete("tool_categories", "Tool category recommendations", a.opportunities.filter((o) => o.tool_categories?.length).length >= 5, ["tool categories for at least 5 projects"]),
    complete("first_90_days", "First 90-day implementation plan", a.roadmap_phases.slice(0, 3).length === 3 && a.roadmap_phases.slice(0, 3).every((p) => p.opportunity_names.length), ["named projects in each of the first three phases"]),
    complete("pilot_scorecard", "Pilot scorecard", a.opportunities.length >= 3 && a.opportunities.slice(0, 3).every((o) => o.baseline_metrics?.length && o.target_metrics?.length && o.success_metrics.length), ["baseline and target metrics for first 3 projects"]),
    complete("management_decisions", "Management decisions required", a.management_decisions.length >= 5, ["at least 5 explicit management decisions"]),
    complete("final_recommendation", "Final recommendation", Boolean(a.opportunities[0]?.owner && a.ai_readiness.timeline_expectation && a.ai_readiness.budget_appetite), ["first-project owner, timing, and budget appetite"]),
    complete("appendix_prioritization", "Appendix opportunity prioritization summary", a.opportunities.length >= 10 && a.opportunities.every((o) => o.total_score > 0), ["10 fully scored opportunities"]),
  ];
}

export function getSpecificAssessmentGaps(a: Assessment) {
  const gaps = getReportCoverage(a).flatMap((section) => section.missing.map((missing) => `${section.label}: ${missing}`));
  for (const workflow of a.workflows) {
    if (!workflow.monthly_volume && !factSatisfiesWorkflowField(a,workflow.workflow_name,"monthly_volume")) gaps.push(`Missing workflow volume for ${workflow.workflow_name}`);
    if (!workflow.owner) gaps.push(`Missing owner for ${workflow.workflow_name}`);
    if (!workflow.systems_used.length) gaps.push(`Missing systems used by ${workflow.workflow_name}`);
    if (!workflow.data_sources?.length) gaps.push(`Missing data sources for ${workflow.workflow_name}`);
    if (!workflow.baseline_metrics?.length && !factSatisfiesWorkflowField(a,workflow.workflow_name,"baseline_metrics")) gaps.push(`Missing baseline metrics for ${workflow.workflow_name}`);
    if (!workflow.target_metrics?.length) gaps.push(`Missing target metrics for ${workflow.workflow_name}`);
    if (!workflow.implementation_dependencies?.length) gaps.push(`Missing implementation dependencies for ${workflow.workflow_name}`);
  }
  for (const system of a.technology_stack) if (system.export_capability === "unknown") gaps.push(`Missing data export capability for ${system.system_name}`);
  if (!a.governance_profile.sensitive_data_types.some((item) => /employee|applicant/i.test(item))) gaps.push("Missing governance rule for employee data");
  return [...new Set(gaps)];
}

export const countDetailedWorkflows = detailedWorkflows;
