import type { Assessment } from "@/types/assessment";
import { getReportCoverage, getSpecificAssessmentGaps } from "./report-coverage";

export const getReadinessSections = getReportCoverage;
export function calculateReadiness(a: Assessment) {
  const sections = getReportCoverage(a); const completed = sections.filter((section) => section.complete).length;
  return { score:completed / sections.length, percent:Math.round(completed / sections.length * 100), sections, missingFields:getSpecificAssessmentGaps(a) };
}
