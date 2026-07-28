import rawSample from "@/sample-data/iona-hospitality.json";
import { createEmptyAssessment } from "./initial-state";
import { buildRoadmapPhases, opportunityFromWorkflow } from "./scoring";
import type { Assessment } from "@/types/assessment";

export function createIonaAssessment(): Assessment {
  const state = { ...createEmptyAssessment(), ...structuredClone(rawSample), id: "iona-hospitality-sample", answers: [] } as Assessment;
  state.opportunities = state.workflows.map((workflow) => opportunityFromWorkflow(workflow, state)).sort((a, b) => b.total_score - a.total_score);
  state.roadmap_phases = buildRoadmapPhases(state.opportunities);
  state.updated_at = new Date().toISOString();
  return state;
}
