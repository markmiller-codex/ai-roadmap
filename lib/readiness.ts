import type { Assessment, ReadinessSection } from "@/types/assessment";

export function getReadinessSections(a: Assessment): ReadinessSection[] {
  const profileMissing = [!a.company_profile.company_name && "company name", !a.company_profile.industry && "industry", !a.company_profile.employee_count && "employee count", !a.company_profile.locations && "locations"].filter(Boolean) as string[];
  return [
    { key: "company_profile", label: "Company profile", weight: .10, complete: profileMissing.length === 0 && a.company_profile.revenue_sources.length > 0, missing: [...profileMissing, ...(a.company_profile.revenue_sources.length ? [] : ["revenue sources"])] },
    { key: "business_functions", label: "Function inventory", weight: .10, complete: a.business_functions.length >= 3, missing: a.business_functions.length >= 3 ? [] : ["at least 3 business functions"] },
    { key: "people_roles", label: "People and roles", weight: .10, complete: a.role_groups.length >= 2, missing: a.role_groups.length >= 2 ? [] : ["at least 2 role groups"] },
    { key: "workflows", label: "Workflow detail", weight: .25, complete: a.workflows.length >= 3 && a.workflows.every((w) => w.bottlenecks.length > 0), missing: a.workflows.length >= 3 && a.workflows.every((w) => w.bottlenecks.length > 0) ? [] : a.workflows.length >= 3 ? ["workflow bottlenecks/details"] : ["at least 3 detailed workflows"] },
    { key: "technology_stack", label: "Technology stack", weight: .15, complete: a.technology_stack.length >= 3, missing: a.technology_stack.length >= 3 ? [] : ["at least 3 technology systems"] },
    { key: "data_readiness", label: "Data readiness", weight: .10, complete: a.data_assets.length >= 2, missing: a.data_assets.length >= 2 ? [] : ["at least 2 data assets"] },
    { key: "pain_points_opportunities", label: "Pain points and opportunities", weight: .10, complete: a.pain_points.length >= 2 && a.opportunities.length >= 3, missing: a.opportunities.length >= 3 ? ["pain point detail"] : ["at least 3 scored opportunities"] },
    { key: "governance_risk", label: "Governance and risk", weight: .05, complete: a.governance_profile.sensitive_data_types.length > 0 && a.governance_profile.requires_human_approval.length > 0, missing: [a.governance_profile.sensitive_data_types.length ? "" : "sensitive data", a.governance_profile.requires_human_approval.length ? "" : "human approval rules"].filter(Boolean) },
    { key: "strategic_priorities", label: "Strategic priorities", weight: .05, complete: a.company_profile.strategic_priorities.length >= 3, missing: a.company_profile.strategic_priorities.length >= 3 ? [] : ["at least 3 strategic priorities"] },
  ];
}
export function calculateReadiness(a: Assessment) { const sections = getReadinessSections(a); const score = sections.reduce((sum, section) => sum + (section.complete ? section.weight : 0), 0); return { score, percent: Math.round(score * 100), sections, missingFields: sections.flatMap((section) => section.missing.map((field) => `${section.label}: ${field}`)) }; }
