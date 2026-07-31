import type { Assessment, ReadinessSection } from "./assessment";

export interface InterviewMessage {
  role: "assistant" | "user";
  text: string;
  timestamp: string;
}

export interface SessionSnapshot {
  format: "ai-roadmap-session";
  format_version: 1;
  app_version: string;
  saved_at: string;
  exported_at?: string;
  current_question_id: string | null;
  assessment: Assessment;
  interview_history: InterviewMessage[];
  module_answers: Assessment["answers"];
  readiness: { score: number; percent: number; missing_fields: string[] };
  report_coverage_checklist: ReadinessSection[];
  opportunity_scores: Array<{ opportunity_name: string; total_score: number; classification: string; recommended_phase: string }>;
  generated_opportunities: Assessment["opportunities"];
  report_draft: string;
}
