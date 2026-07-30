import type { Assessment, MetricTarget, QuestionModuleId, Score } from "@/types/assessment";
import { buildRoadmapPhases, opportunityFromWorkflow } from "./scoring";

export interface ProposedStateUpdate { path: string; value: unknown; }
export interface AIInterviewResult {
  assistant_question: string;
  rationale_for_question: string;
  fields_targeted: string[];
  proposed_state_updates: ProposedStateUpdate[];
  readiness_impact: { before_percent: number; after_percent: number; completed_sections: string[] };
  opportunity_signals: string[];
  next_recommended_module: QuestionModuleId;
}

type Kind = "string" | "number" | "nullable-number" | "boolean" | "score" | "nullable-score" | "string-array" | "metric-array";
const leafRules: Record<string, Kind> = {
  "company_profile.company_name": "string", "company_profile.industry": "string", "company_profile.subindustry": "string",
  "company_profile.locations": "nullable-number", "company_profile.employee_count": "nullable-number", "company_profile.annual_revenue": "nullable-number", "company_profile.years_in_business": "nullable-number",
  "company_profile.customer_types": "string-array", "company_profile.revenue_sources": "string-array", "company_profile.operating_model": "string", "company_profile.management_structure": "string",
  "company_profile.strategic_priorities": "string-array", "company_profile.current_business_pressures": "string-array",
  "ai_readiness.current_ai_use": "string", "ai_readiness.leadership_support": "nullable-score", "ai_readiness.employee_readiness": "nullable-score", "ai_readiness.data_availability": "nullable-score",
  "ai_readiness.data_organization": "nullable-score", "ai_readiness.process_documentation": "nullable-score", "ai_readiness.governance_maturity": "nullable-score", "ai_readiness.implementation_capacity": "nullable-score",
  "ai_readiness.data_sensitivity_concerns": "string-array", "ai_readiness.budget_appetite": "string", "ai_readiness.timeline_expectation": "string",
  "governance_profile.sensitive_data_types": "string-array", "governance_profile.requires_human_approval": "string-array", "governance_profile.regulated_constraints": "string-array",
  "governance_profile.brand_review_needs": "boolean", "governance_profile.employee_decision_controls": "boolean", "governance_profile.vendor_or_customer_data_rules": "string-array",
  "management_decisions": "string-array",
};

const recordRules: Record<string, Record<string, Kind>> = {
  business_functions: { function_name:"string", employee_count:"nullable-number", manager_owner:"string", importance:"score", pain_level:"score", systems_used:"string-array", notes:"string" },
  role_groups: { role_name:"string", function_name:"string", headcount:"nullable-number", responsibilities:"string-array", pain_points:"string-array", turnover_level:"string", hiring_difficulty:"score", ai_adoption_likelihood:"score" },
  workflows: { workflow_name:"string", function_name:"string", owner:"string", trigger:"string", steps:"string-array", inputs:"string-array", outputs:"string-array", systems_used:"string-array", documents_used:"string-array", people_involved:"string-array", frequency:"string", monthly_volume:"nullable-number", time_per_instance_minutes:"nullable-number", weekly_time_cost_hours:"nullable-number", error_or_rework_level:"score", bottlenecks:"string-array", decision_points:"string-array", customer_impact:"score", financial_impact:"score", data_sensitivity:"score", process_maturity:"score", data_readiness:"score", ai_candidate_notes:"string" },
  technology_stack: { system_name:"string", vendor:"string", function_served:"string", users:"string", data_stored:"string-array", export_capability:"string", integration_capability:"string", satisfaction:"score", limitations:"string-array" },
  data_assets: { asset_name:"string", source_system:"string", data_type:"string", owner:"string", format:"string", cleanliness:"score", accessibility:"score", update_frequency:"string", sensitivity:"score", ai_usability:"score" },
  document_assets: { document_type:"string", location:"string", owner:"string", quality:"score", update_frequency:"string", ai_use_cases:"string-array" },
  pain_points: { pain_point:"string", function_name:"string", workflow_name:"string", who_feels_it:"string-array", frequency:"string", severity:"score", time_cost:"string", dollar_cost:"string", customer_impact:"score", employee_impact:"score", current_workaround:"string", root_cause:"string" },
  operating_metrics: { metric_name:"string", value:"number", unit:"string", period:"string", source:"string", business_context:"string" },
  workflow_evidence: { workflow_name:"string", data_sources:"string-array", current_process_quality:"string", business_impact:"string", baseline_metrics:"metric-array", target_metrics:"metric-array", implementation_dependencies:"string-array", suggested_ai_use_cases:"string-array", roadmap_phase:"string", pilot_timing:"string", success_measures:"string-array", implementation_complexity_factors:"string-array" },
};

const cleanString = (value: unknown) => typeof value === "string" ? value.trim().slice(0, 2000) : undefined;
function decoded(value: unknown, kind: Kind | "records") {
  if (kind === "string" || typeof value !== "string") return value;
  try { return JSON.parse(value) as unknown; } catch { return value; }
}
function clean(value: unknown, kind: Kind): unknown {
  value = decoded(value, kind);
  if (kind === "string") return cleanString(value);
  if (kind === "boolean") return typeof value === "boolean" ? value : undefined;
  if (kind === "string-array") return Array.isArray(value) ? value.map(cleanString).filter((item): item is string => Boolean(item)).slice(0, 50) : undefined;
  if (kind === "metric-array" && Array.isArray(value)) return value.flatMap((item): MetricTarget[] => { if (!item || typeof item !== "object") return []; const metric=item as Record<string,unknown>; const metric_name=cleanString(metric.metric_name), baseline=cleanString(metric.baseline), target=cleanString(metric.target), measurement_period=cleanString(metric.measurement_period), source=cleanString(metric.source); return metric_name && baseline && target && measurement_period && source ? [{metric_name,baseline,target,measurement_period,source}] : []; }).slice(0,20);
  if (kind === "nullable-number" && value === null) return null;
  if (kind === "nullable-score" && value === null) return null;
  if (["number", "nullable-number", "score", "nullable-score"].includes(kind) && typeof value === "number" && Number.isFinite(value)) {
    return kind.includes("score") ? Math.max(1, Math.min(5, Math.round(value))) as Score : value;
  }
  return undefined;
}

function setLeaf(state: Assessment, path: string, value: unknown) {
  if (path === "management_decisions" && Array.isArray(value)) { state.management_decisions=value as string[]; return; }
  const [group, field] = path.split(".");
  if (!group || !field) return;
  const target = state[group as keyof Assessment];
  if (target && typeof target === "object" && !Array.isArray(target)) (target as unknown as Record<string, unknown>)[field] = value;
}

function cleanRecords(value: unknown, rules: Record<string, Kind>) {
  value = decoded(value, "records");
  if (!Array.isArray(value)) return undefined;
  return value.slice(0, 50).flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const result: Record<string, unknown> = {};
    for (const [field, kind] of Object.entries(rules)) {
      const cleaned = clean((item as Record<string, unknown>)[field], kind);
      if (cleaned === undefined) return [];
      result[field] = cleaned;
    }
    return [result];
  });
}

export function applyAIUpdates(current: Assessment, updates: ProposedStateUpdate[]) {
  const state = structuredClone(current); const applied: string[] = [];
  for (const update of updates.slice(0, 30)) {
    const leafKind = leafRules[update.path];
    if (leafKind) {
      const value = clean(update.value, leafKind);
      if (value !== undefined) { setLeaf(state, update.path, value); applied.push(update.path); }
      continue;
    }
    const rules = recordRules[update.path];
    if (rules) {
      const records = cleanRecords(update.value, rules);
      if (records && update.path === "workflow_evidence") { for (const record of records) { const evidence=record as Record<string,unknown>; const workflow=state.workflows.find((item)=>item.workflow_name.toLowerCase()===String(evidence.workflow_name).toLowerCase()); if (workflow) Object.assign(workflow,evidence); } applied.push(update.path); }
      else if (records) { (state as unknown as Record<string, unknown>)[update.path] = records; applied.push(update.path); }
    }
  }
  if (state.workflows.length) state.opportunities = state.workflows.map((workflow) => opportunityFromWorkflow(workflow, state)).sort((a, b) => b.total_score - a.total_score);
  state.roadmap_phases = buildRoadmapPhases(state.opportunities);
  state.updated_at = new Date().toISOString();
  return { assessment: state, appliedFields: [...new Set(applied)] };
}

export const aiInterviewJsonSchema = {
  type: "object", additionalProperties: false,
  required: ["assistant_question","rationale_for_question","fields_targeted","proposed_state_updates","readiness_impact","opportunity_signals","next_recommended_module"],
  properties: {
    assistant_question: { type:"string" }, rationale_for_question: { type:"string" }, fields_targeted: { type:"array", items:{type:"string"} },
    proposed_state_updates: { type:"array", items:{ type:"object", additionalProperties:false, required:["path","value"], properties:{ path:{type:"string"}, value:{type:"string"} } } },
    readiness_impact: { type:"object", additionalProperties:false, required:["before_percent","after_percent","completed_sections"], properties:{ before_percent:{type:"number"}, after_percent:{type:"number"}, completed_sections:{type:"array",items:{type:"string"}} } },
    opportunity_signals: { type:"array", items:{type:"string"} }, next_recommended_module: { type:"string", enum:["company_profile","operating_metrics","business_functions","people_roles","workflows","workflow_detail","technology_stack","data_readiness","current_ai_use","pain_points","baseline_metrics","strategic_priorities","governance_risk","implementation_capacity","success_metrics"] },
  },
} as const;
