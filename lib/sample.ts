import rawSample from "@/sample-data/iona-hospitality.json";
import { createEmptyAssessment } from "./initial-state";
import { buildRoadmapPhases, opportunityFromWorkflow } from "./scoring";
import type { Assessment, Score } from "@/types/assessment";

export function createIonaAssessment(): Assessment {
  const empty=createEmptyAssessment(); const sample=structuredClone(rawSample);
  const state = { ...empty, ...sample, company_profile:{...empty.company_profile,...sample.company_profile}, id: "iona-hospitality-sample", answers: [] } as Assessment;
  state.capturedFacts = state.capturedFacts ?? [];
  state.websiteDiscovery={...state.websiteDiscovery,status:"confirmed",companyName:state.company_profile.company_name,industry:state.company_profile.industry,businessDescription:state.company_profile.operating_model,likelyBusinessFunctions:state.business_functions.map((item)=>item.function_name),likelyWorkflows:state.workflows.map((item)=>item.workflow_name),confirmedAt:new Date().toISOString()};
  state.expectedWorkflowReviews=state.workflows.map((workflow,index)=>({id:`iona-workflow-review-${index}`,workflowName:workflow.workflow_name,businessFunction:workflow.function_name,rationale:"Confirmed in the Iona sample discovery data.",sourceType:"user_confirmed",confidence:"exact",sourceUrls:[],status:"exists",materialityReasons:["Confirmed material sample workflow"],relatedWorkflowId:workflow.workflow_name,reviewedAt:new Date().toISOString()}));
  state.workflows=state.workflows.map((workflow)=>({...workflow,sourceType:"user_confirmed",confidence:"exact",materiality_status:"material",materiality_reasons:["Confirmed material sample workflow"],verification_sources:workflow.verification_sources??["Iona sample discovery data"],number_people_involved:workflow.number_people_involved??workflow.people_involved.length,seasonality:workflow.seasonality??"Captured in sample notes",exception_rate_percent:workflow.exception_rate_percent??null,cycle_time:workflow.cycle_time??"Captured in sample baseline",suggested_ai_use_cases:workflow.suggested_ai_use_cases?.length?workflow.suggested_ai_use_cases:[workflow.ai_candidate_notes],success_measures:workflow.success_measures?.length?workflow.success_measures:["Time saved","Quality improved"]}));
  state.pain_points = state.workflows.map((workflow) => ({ pain_point:workflow.bottlenecks[0], function_name:workflow.function_name, workflow_name:workflow.workflow_name, who_feels_it:workflow.people_involved, frequency:workflow.frequency, severity:Math.max(workflow.error_or_rework_level,workflow.customer_impact,workflow.financial_impact) as Score, time_cost:workflow.weekly_time_cost_hours ? `${workflow.weekly_time_cost_hours} hours/week` : "Not quantified", dollar_cost:workflow.business_impact ?? "Not quantified", customer_impact:workflow.customer_impact, employee_impact:4 as Score, current_workaround:"Manual review and spreadsheets", root_cause:workflow.bottlenecks[0] }));
  state.opportunities = state.workflows.map((workflow) => opportunityFromWorkflow(workflow, state)).sort((a, b) => b.total_score - a.total_score);
  state.roadmap_phases = buildRoadmapPhases(state.opportunities);
  state.updated_at = new Date().toISOString();
  return state;
}
