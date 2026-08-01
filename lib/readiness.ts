import type { Assessment } from "@/types/assessment";
import { getReportCoverage, getSpecificAssessmentGaps } from "./report-coverage";
import { factQuality } from "./evidence";

export const getReadinessSections = getReportCoverage;
export function calculateReadiness(a: Assessment) {
  const sections = getReportCoverage(a); const completed = sections.filter((section) => section.complete).length; const coverage=completed/sections.length; const facts=a.capturedFacts ?? [];
  const sourceQuality=facts.length ? facts.reduce((sum,fact)=>sum+factQuality(fact),0)/facts.length : 1; const assumptions=facts.filter((fact)=>fact.sourceType==="industry_benchmark"||fact.sourceType==="unknown_verifiable"||fact.needsConfirmation).length;
  let score=coverage*(facts.length ? 0.65+0.35*sourceQuality : 1); if (assumptions && score>=1) score=0.97; score=Math.min(1,score);
  return { score, percent:Math.round(score*100), sourceQualityPercent:Math.round(sourceQuality*100), assumptionCount:assumptions, sections, missingFields:getSpecificAssessmentGaps(a) };
}
