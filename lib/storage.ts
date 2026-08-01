import type { Assessment, CapturedFact, FactConfidence, FactSourceType } from "@/types/assessment";
import type { InterviewMessage, SessionSnapshot } from "@/types/session";
import { createEmptyAssessment } from "./initial-state";
import { calculateReadiness } from "./readiness";
import { generateReport } from "./report";

const KEY = "ai-roadmap-assessment-v2";
const SESSION_KEY = "ai-roadmap-session-meta-v1";
export const APP_VERSION = "0.1.0";

function migrateFact(input: CapturedFact): CapturedFact {
  const raw=input as unknown as Record<string,unknown>; const oldConfidence=typeof raw.confidence==="string"?raw.confidence:undefined; const oldSourceType=typeof raw.sourceType==="string"?raw.sourceType:undefined;
  const confidence: FactConfidence = oldConfidence === "unknown_verifiable" ? "unknown" : (["exact","estimate","range","benchmark_assumption","inferred","unknown","excluded"].includes(oldConfidence ?? "") ? oldConfidence as FactConfidence : "unknown");
  const sourceType: FactSourceType = (["user_confirmed","user_estimate","website","industry_benchmark","system_inferred","unknown_verifiable","excluded_by_user"].includes(oldSourceType ?? "") ? oldSourceType as FactSourceType : oldConfidence === "exact" ? "user_confirmed" : oldConfidence === "estimate" || oldConfidence === "range" ? "user_estimate" : "unknown_verifiable");
  return {...input,sourceType,confidence,verificationSources:input.verificationSources ?? [],relatedFields:input.relatedFields ?? [],createdFromUserAnswer:input.createdFromUserAnswer ?? "Migrated session"};
}

export function hydrateAssessment(value: unknown): Assessment {
  if (!value || typeof value !== "object") throw new Error("The session does not contain a valid assessment object.");
  const parsed = value as Partial<Assessment>; const empty = createEmptyAssessment();
  return { ...empty, ...parsed, company_profile:{...empty.company_profile,...parsed.company_profile}, ai_readiness:{...empty.ai_readiness,...parsed.ai_readiness}, governance_profile:{...empty.governance_profile,...parsed.governance_profile}, capturedFacts:(parsed.capturedFacts ?? []).map((fact)=>migrateFact(fact)), discoveryIssues:parsed.discoveryIssues ?? [], operating_metrics:parsed.operating_metrics ?? [], management_decisions:parsed.management_decisions ?? [], business_functions:parsed.business_functions ?? [], role_groups:parsed.role_groups ?? [], workflows:parsed.workflows ?? [], technology_stack:parsed.technology_stack ?? [], data_assets:parsed.data_assets ?? [], document_assets:parsed.document_assets ?? [], pain_points:parsed.pain_points ?? [], opportunities:parsed.opportunities ?? [], roadmap_phases:parsed.roadmap_phases ?? [], answers:parsed.answers ?? [] };
}

export const hasSavedAssessment = () => typeof window !== "undefined" && localStorage.getItem(KEY) !== null;
export const loadAssessment = (): Assessment | null => {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(KEY); if (!value) return null;
  try { return hydrateAssessment(JSON.parse(value)); } catch { return null; }
};
export const saveAssessment = (state: Assessment) => localStorage.setItem(KEY, JSON.stringify(state));
export const clearAssessment = () => { localStorage.removeItem(KEY); localStorage.removeItem(SESSION_KEY); };

export function createSessionSnapshot(assessment: Assessment, interviewHistory: InterviewMessage[], currentQuestionId: string | null): SessionSnapshot {
  const readiness = calculateReadiness(assessment); const savedAt = new Date().toISOString();
  return { format:"ai-roadmap-session", format_version:1, app_version:APP_VERSION, saved_at:savedAt, current_question_id:currentQuestionId, assessment, interview_history:interviewHistory, module_answers:assessment.answers, readiness:{ score:readiness.score, percent:readiness.percent, missing_fields:readiness.missingFields }, report_coverage_checklist:readiness.sections, opportunity_scores:assessment.opportunities.map((opportunity)=>({ opportunity_name:opportunity.opportunity_name, total_score:opportunity.total_score, classification:opportunity.classification, recommended_phase:opportunity.recommended_phase })), generated_opportunities:assessment.opportunities, report_draft:generateReport(assessment) };
}
export function saveSession(assessment: Assessment, interviewHistory: InterviewMessage[], currentQuestionId: string | null) {
  saveAssessment(assessment); const snapshot=createSessionSnapshot(assessment,interviewHistory,currentQuestionId); localStorage.setItem(SESSION_KEY,JSON.stringify(snapshot)); return snapshot;
}
export function loadSessionSnapshot(): SessionSnapshot | null {
  if (typeof window === "undefined") return null; const raw=localStorage.getItem(SESSION_KEY); if (!raw) return null;
  try { const parsed=JSON.parse(raw) as SessionSnapshot; return parsed?.format === "ai-roadmap-session" ? parsed : null; } catch { return null; }
}
export function parseImportedSession(text: string): SessionSnapshot {
  const parsed=JSON.parse(text) as Partial<SessionSnapshot> & { assessment?: unknown };
  if (parsed.format !== "ai-roadmap-session" || parsed.format_version !== 1 || !parsed.assessment) throw new Error("This is not a supported AI Roadmap session export.");
  const assessment=hydrateAssessment(parsed.assessment); const history=Array.isArray(parsed.interview_history) ? parsed.interview_history.filter((message): message is InterviewMessage => Boolean(message && (message.role === "assistant" || message.role === "user") && typeof message.text === "string")).map((message)=>({...message,timestamp:message.timestamp || new Date().toISOString()})) : [];
  return { ...createSessionSnapshot(assessment,history,typeof parsed.current_question_id === "string" ? parsed.current_question_id : null), app_version:typeof parsed.app_version === "string" ? parsed.app_version : APP_VERSION };
}
export function exportSessionFile(snapshot: SessionSnapshot) {
  const company=snapshot.assessment.company_profile.company_name || "AI-Roadmap"; const safeCompany=company.replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,""); const date=new Date().toISOString().slice(0,10);
  const exported={...snapshot,exported_at:new Date().toISOString()}; const url=URL.createObjectURL(new Blob([JSON.stringify(exported,null,2)],{type:"application/json"})); const anchor=document.createElement("a"); anchor.href=url; anchor.download=`${safeCompany}-AI-Roadmap-Session-${date}.json`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}
