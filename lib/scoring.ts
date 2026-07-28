import scoringModel from "@/schemas/scoring_model.json";
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
  const details = { "Quick Win": ["Low", "Phase 1", "2–4 weeks"], "Near-Term Project": ["Moderate", "Phase 2", "4–10 weeks"], "Foundation Project": ["Foundation", "Phase 0", "4–12 weeks"], "Future Opportunity": ["Higher", "Phase 3", "3–12 months"] }[kind];
  return { ...opportunity, total_score: totalScore, classification: kind, complexity: details[0], recommended_phase: details[1], time_to_pilot: details[2] };
}
const volumeScore = (volume: number | null): Score => volume && volume >= 100 ? 5 : volume && volume >= 40 ? 4 : volume && volume >= 10 ? 3 : 2;
export function opportunityFromWorkflow(w: Workflow, a?: Assessment): Opportunity {
  const strategicText = a?.company_profile.strategic_priorities.join(" ").toLowerCase() ?? "";
  const strategicFit = strategicText.split(" ").some((word) => word.length > 4 && w.ai_candidate_notes.toLowerCase().includes(word)) ? 5 : 4;
  const bottleneck = w.bottlenecks[0] || "manual effort and inconsistent handoffs";
  const systems = w.systems_used.length ? ` using data from ${w.systems_used.join(", ")}` : "";
  return scoreOpportunity({ opportunity_name: `AI Assistant for ${w.workflow_name}`, related_workflow: w.workflow_name, description: `Address ${bottleneck} in ${w.workflow_name}${systems}. Start with assisted drafting, summarization, or decision support while the named owner retains approval.`, business_value_score: Math.max(w.customer_impact, w.financial_impact, 3) as Score, frequency_score: volumeScore(w.monthly_volume), repetition_score: w.steps.length >= 3 ? 5 : 4, data_readiness_score: w.data_readiness, adoption_score: 4, strategic_fit_score: strategicFit as Score, implementation_difficulty_score: w.data_readiness >= 4 && w.process_maturity >= 3 ? 2 : 3, risk_score: w.data_sensitivity, total_score: 0, classification: "Foundation Project", complexity: "", recommended_phase: "", time_to_pilot: "", success_metrics: ["Hours saved per week", "Cycle-time reduction", "Output quality", "User adoption"] });
}
export function buildRoadmapPhases(opportunities: Opportunity[]): RoadmapPhase[] {
  const phase = (phase_name: string, timeframe: string, kinds: OpportunityClassification[], objectives: string[]): RoadmapPhase => ({ phase_name, timeframe, objectives, opportunity_names: opportunities.filter((o) => kinds.includes(o.classification)).map((o) => o.opportunity_name), dependencies: ["Named owner", "Baseline metrics", "Approved data and tools"], success_measures: ["Adoption", "Hours saved", "Quality improvement", "Business impact"] });
  return [phase("Foundation", "Days 1–30", ["Foundation Project"], ["Set governance rules", "Prepare data and process baselines"]), phase("Pilot", "Days 31–60", ["Quick Win"], ["Launch low-risk pilots", "Train users and measure adoption"]), phase("Validate and expand", "Days 61–90", ["Near-Term Project"], ["Compare results with baselines", "Expand successful workflows"]), phase("Scale", "Months 4–12", ["Future Opportunity"], ["Integrate proven capabilities", "Sequence higher-complexity investments"])];
}
