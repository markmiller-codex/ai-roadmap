import type { Assessment } from "@/types/assessment";

const KEY = "ai-roadmap-assessment-v2";
export const loadAssessment = (): Assessment | null => {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(KEY);
  return value ? JSON.parse(value) as Assessment : null;
};
export const saveAssessment = (state: Assessment) => localStorage.setItem(KEY, JSON.stringify(state));
export const clearAssessment = () => localStorage.removeItem(KEY);
