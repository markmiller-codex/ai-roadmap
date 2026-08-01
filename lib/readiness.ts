import type { Assessment } from "@/types/assessment";
import { getReportCoverage, getSpecificAssessmentGaps } from "./report-coverage";
import { factQuality } from "./evidence";

export const getReadinessSections = getReportCoverage;
export function calculateReadiness(a: Assessment) {
  const sections = getReportCoverage(a); const completed = sections.filter((section) => section.complete).length; const coverage=completed/sections.length; const facts=a.capturedFacts ?? [];
  const issues=a.discoveryIssues??[]; const sourceQuality=facts.length ? facts.reduce((sum,fact)=>sum+factQuality(fact),0)/facts.length : 1; const assumptions=facts.filter((fact)=>fact.sourceType==="industry_benchmark"||fact.sourceType==="user_estimate"||fact.sourceType==="unknown_verifiable"||fact.sourceType==="excluded_by_user"||fact.needsConfirmation).length;
  const openUnknowns=issues.filter((issue)=>issue.status==="open").length,excluded=issues.filter((issue)=>issue.status==="excluded").length,conflicts=issues.filter((issue)=>issue.issueType==="conflicting_information"&&issue.status!=="resolved").length;
  const issuePenalty=Math.min(.3,openUnknowns*.025+excluded*.015+conflicts*.05); let score=coverage*(facts.length ? 0.65+0.35*sourceQuality : 1)-issuePenalty; if (assumptions||openUnknowns||excluded||conflicts) score=Math.min(score,.97); score=Math.max(0,Math.min(1,score));
  return { score, percent:Math.round(score*100), sourceQualityPercent:Math.round(sourceQuality*100), assumptionCount:assumptions, openUnknownCount:openUnknowns, excludedCount:excluded, conflictCount:conflicts, sections, missingFields:getSpecificAssessmentGaps(a) };
}
