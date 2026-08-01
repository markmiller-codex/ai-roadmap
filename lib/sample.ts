import rawSample from "@/sample-data/iona-hospitality.json";
import { createEmptyAssessment } from "./initial-state";
import { buildRoadmapPhases, opportunityFromWorkflow } from "./scoring";
import type { Assessment, Score } from "@/types/assessment";

export function createIonaAssessment(): Assessment {
  const empty=createEmptyAssessment(); const sample=structuredClone(rawSample);
  const state = { ...empty, ...sample, company_profile:{...empty.company_profile,...sample.company_profile}, id: "iona-hospitality-sample", answers: [] } as Assessment;
  state.capturedFacts = state.capturedFacts ?? [];
  state.pain_points = state.workflows.map((workflow) => ({ pain_point:workflow.bottlenecks[0], function_name:workflow.function_name, workflow_name:workflow.workflow_name, who_feels_it:workflow.people_involved, frequency:workflow.frequency, severity:Math.max(workflow.error_or_rework_level,workflow.customer_impact,workflow.financial_impact) as Score, time_cost:workflow.weekly_time_cost_hours ? `${workflow.weekly_time_cost_hours} hours/week` : "Not quantified", dollar_cost:workflow.business_impact ?? "Not quantified", customer_impact:workflow.customer_impact, employee_impact:4 as Score, current_workaround:"Manual review and spreadsheets", root_cause:workflow.bottlenecks[0] }));
  state.opportunities = state.workflows.map((workflow) => opportunityFromWorkflow(workflow, state)).sort((a, b) => b.total_score - a.total_score);
  state.roadmap_phases = buildRoadmapPhases(state.opportunities);
  state.updated_at = new Date().toISOString();
  return state;
}
