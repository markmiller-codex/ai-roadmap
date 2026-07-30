import type { Assessment } from "@/types/assessment";
import { createEmptyAssessment } from "./initial-state";

const KEY = "ai-roadmap-assessment-v2";
export const loadAssessment = (): Assessment | null => {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(KEY);
  if (!value) return null;
  const parsed=JSON.parse(value) as Partial<Assessment>; const empty=createEmptyAssessment();
  return { ...empty, ...parsed, company_profile:{...empty.company_profile,...parsed.company_profile}, ai_readiness:{...empty.ai_readiness,...parsed.ai_readiness}, governance_profile:{...empty.governance_profile,...parsed.governance_profile}, operating_metrics:parsed.operating_metrics ?? [], management_decisions:parsed.management_decisions ?? [], business_functions:parsed.business_functions ?? [], role_groups:parsed.role_groups ?? [], workflows:parsed.workflows ?? [], technology_stack:parsed.technology_stack ?? [], data_assets:parsed.data_assets ?? [], document_assets:parsed.document_assets ?? [], pain_points:parsed.pain_points ?? [], opportunities:parsed.opportunities ?? [], roadmap_phases:parsed.roadmap_phases ?? [], answers:parsed.answers ?? [] };
};
export const saveAssessment = (state: Assessment) => localStorage.setItem(KEY, JSON.stringify(state));
export const clearAssessment = () => localStorage.removeItem(KEY);
