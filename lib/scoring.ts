import scoringModel from "../schemas/scoring_model.json" with { type: "json" };
import type { Assessment, Opportunity, OpportunityClassification, RoadmapPhase, Score, Workflow } from "@/types/assessment";

function classification(o: Opportunity, score: number): OpportunityClassification {
  if (o.data_readiness_score <= 2) return "Foundation Project";
  if (o.implementation_difficulty_score >= 4 || o.risk_score >= 4) return "Future Opportunity";
  if (score >= 30 && o.implementation_difficulty_score <= 2 && o.risk_score <= 3) return "Quick Win";
  if (score >= 26 && o.implementation_difficulty_score <= 3) return "Near-Term Project";
  return "Foundation Project";
}
export function scoreOpportunity(opportunity: Opportunity): Opportunity {
  const weights = scoringModel.opportunity_score_formula;
  const total = Object.entries(weights).reduce((sum, [key, weight]) => sum + Number(opportunity[key as keyof typeof weights]) * weight, 0);
  const totalScore = Math.round(total * 10) / 10; const kind = classification(opportunity, totalScore);
  const details = { "Quick Win":["Low","Phase 1","2–4 weeks"], "Near-Term Project":["Moderate","Phase 2","4–10 weeks"], "Foundation Project":["Foundation","Phase 0","4–12 weeks"], "Future Opportunity":["Higher","Phase 3","3–12 months"] }[kind];
  return { ...opportunity, total_score:totalScore, classification:kind, complexity:details[0], recommended_phase:details[1], time_to_pilot:details[2] };
}
const volumeScore = (volume: number | null): Score => volume && volume >= 100 ? 5 : volume && volume >= 40 ? 4 : volume && volume >= 10 ? 3 : 2;
const blueprints: Record<string,{name:string;phase:string;tools:string[]}> = {
  "Manager daily administration":{name:"AI Manager Operations Assistant",phase:"Phase 1",tools:["Secure enterprise AI assistant","Knowledge management"]},
  "Guest review response":{name:"Guest Review & Reputation Intelligence",phase:"Phase 1",tools:["Text analytics","Reputation management automation"]},
  "Hiring and onboarding":{name:"Hiring, Screening & Onboarding Assistant",phase:"Phase 1",tools:["Applicant workflow automation","Knowledge assistant"]},
  "Manager weekly reporting":{name:"AI Weekly Operating Intelligence Brief",phase:"Phase 1",tools:["Business intelligence","Automated narrative reporting"]},
  "Guest marketing and retention":{name:"AI Marketing & Guest Retention Assistant",phase:"Phase 2",tools:["CRM automation","Campaign content assistant"]},
  "Labor scheduling":{name:"Labor Scheduling & Demand Forecast Assistant",phase:"Phase 2",tools:["Forecasting","Workforce optimization"]},
  "Menu engineering":{name:"Menu Engineering & Profitability Analysis",phase:"Phase 2",tools:["Menu analytics","Margin intelligence"]},
  "Private event inquiries":{name:"Private Event Inquiry Assistant",phase:"Phase 2",tools:["Sales intake automation","CRM assistant"]},
  "Inventory and waste review":{name:"Inventory and Waste Pattern Analysis",phase:"Phase 3",tools:["Inventory analytics","Anomaly detection"]},
  "Vendor invoice processing":{name:"AP and Vendor Invoice Intelligence",phase:"Phase 3",tools:["Document intelligence","Accounts-payable automation"]},
};
export function opportunityFromWorkflow(w: Workflow, a?: Assessment): Opportunity {
  const strategicText = a?.company_profile.strategic_priorities.join(" ").toLowerCase() ?? "";
  const strategicFit = strategicText.split(" ").some((word) => word.length > 4 && w.ai_candidate_notes.toLowerCase().includes(word)) ? 5 : 4;
  const bottleneck = w.bottlenecks[0] || "manual effort and inconsistent handoffs"; const systems = w.systems_used.length ? ` using data from ${w.systems_used.join(", ")}` : ""; const blueprint = blueprints[w.workflow_name];
  const scored = scoreOpportunity({ opportunity_name:blueprint?.name ?? `AI Assistant for ${w.workflow_name}`, related_workflow:w.workflow_name, description:`Address ${bottleneck} in ${w.workflow_name}${systems}. Use assisted analysis or automation while ${w.owner || "the workflow owner"} retains accountability.`, business_value_score:Math.max(w.customer_impact,w.financial_impact,3) as Score, frequency_score:volumeScore(w.monthly_volume), repetition_score:w.steps.length >= 3 ? 5 : 4, data_readiness_score:w.data_readiness, adoption_score:4, strategic_fit_score:strategicFit as Score, implementation_difficulty_score:w.data_readiness >= 4 && w.process_maturity >= 3 ? 2 : 3, risk_score:w.data_sensitivity, total_score:0, classification:"Foundation Project", complexity:"", recommended_phase:"", time_to_pilot:"", success_metrics:w.success_measures ?? ["Hours saved per week","Cycle-time reduction","Output quality","User adoption"], owner:w.owner, business_evidence:[bottleneck,w.business_impact ?? "Business impact to be confirmed"], baseline_metrics:w.baseline_metrics, target_metrics:w.target_metrics, implementation_dependencies:w.implementation_dependencies, tool_categories:blueprint?.tools ?? ["Secure AI workflow assistant"] });
  return { ...scored, recommended_phase:blueprint?.phase ?? scored.recommended_phase, time_to_pilot:w.pilot_timing ?? scored.time_to_pilot };
}
export function buildRoadmapPhases(opportunities: Opportunity[]): RoadmapPhase[] {
  const phase = (phase_name:string,timeframe:string,recommendedPhase:string,objectives:string[]):RoadmapPhase => ({ phase_name,timeframe,objectives,opportunity_names:opportunities.filter((o)=>o.recommended_phase===recommendedPhase).map((o)=>o.opportunity_name),dependencies:["Named executive sponsor","Approved data and tools","Baseline metrics","Workflow owner capacity"],success_measures:["Adoption","Hours saved","Cycle-time improvement","Quality improvement","Business impact"] });
  return [phase("Foundation and first pilots","Days 1–30","Phase 1",["Approve governance rules and pilot owners","Validate baselines and configure secure tools"]),phase("Pilot and train","Days 31–60","Phase 1",["Launch priority assistants","Train managers and review exceptions"]),phase("Validate and expand","Days 61–90","Phase 2",["Compare pilot results with baselines","Approve Phase 2 expansion"]),phase("Scale portfolio","Months 4–24","Phase 3",["Integrate proven capabilities","Sequence higher-complexity forecasting and finance projects"])];
}
