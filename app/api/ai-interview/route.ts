import { NextResponse } from "next/server";
import { AIInterviewResult, aiInterviewJsonSchema, applyAIUpdates } from "@/lib/ai-interview";
import { chooseNextQuestion, getMissingData } from "@/lib/interview";
import { calculateReadiness } from "@/lib/readiness";
import { getSpecificAssessmentGaps } from "@/lib/report-coverage";
import { extractCapturedFacts } from "@/lib/evidence";
import type { Assessment, QuestionModuleId } from "@/types/assessment";

export const runtime = "nodejs";
const modules: QuestionModuleId[] = ["company_profile","operating_metrics","business_functions","people_roles","workflows","workflow_detail","technology_stack","data_readiness","current_ai_use","pain_points","baseline_metrics","strategic_priorities","governance_risk","implementation_capacity","success_metrics"];

function outputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) if (item && typeof item === "object" && Array.isArray((item as {content?:unknown[]}).content)) {
    for (const content of (item as {content:unknown[]}).content) if (content && typeof content === "object" && typeof (content as {text?:unknown}).text === "string") return (content as {text:string}).text;
  }
  return "";
}

function validRequest(value: unknown): value is { assessment: Assessment; answer: string; current_module?: QuestionModuleId; current_question?: string } {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>; const assessment = body.assessment as Record<string, unknown> | undefined;
  return Boolean(assessment && typeof assessment.id === "string" && Array.isArray(assessment.answers) && typeof body.answer === "string" && body.answer.trim().length && body.answer.length <= 12000);
}

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error:"AI interview is not configured.", fallback:true }, { status:503 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error:"Invalid JSON body.", fallback:true }, { status:400 }); }
  if (!validRequest(body)) return NextResponse.json({ error:"Invalid interview request.", fallback:true }, { status:400 });
  const { assessment, answer, current_question } = body;
  const before = calculateReadiness(assessment);
  const deterministic = chooseNextQuestion(assessment);
  const missing = getMissingData(assessment);
  const instructions = `You are a professional SMB AI opportunity roadmap consultant building a target-level roadmap, not a thin summary. Ask exactly one clear practical question at a time and never repeat collected information. First inspect assessment.capturedFacts and treat clearly labeled evidence as already answered. If a provided value has an unclear label, business area, workflow, or time period, ask one immediate clarification question before moving on. If fewer than 10 significant workflows exist, or workflows lack volume, owner, systems, data/documents, time burden, failure modes, business impact, baselines, targets, dependencies, or complexity factors, ask for that operating detail before treating the assessment as report-ready. Extract the answer into proposed_state_updates using only known company_profile, ai_readiness, governance_profile fields; management_decisions; complete collections business_functions, role_groups, workflows, technology_stack, data_assets, document_assets, pain_points, operating_metrics; workflow_evidence; or captured_facts. Every numeric, monetary, percentage, range, date-bound, volume, duration, or factual metric in the answer MUST appear in a captured_facts update as a JSON-encoded array. Each fact object must include id, label, value, unit, timePeriod, businessArea, optional workflowId, confidence (exact|estimate|range|unknown_verifiable), verificationSources, relatedFields, createdFromUserAnswer, and createdAt. Never emit an orphaned number. Every update value must be a string: plain text for string fields and JSON-encoded text for numbers, booleans, arrays, and collections. Preserve known facts, never invent facts, and use integer 1–5 scores. The deterministic missing-data and report-coverage queues are guardrails.`;
  const input = JSON.stringify({ mission:"Complete discovery for a target-level AI Opportunity Roadmap Report", current_question:current_question || deterministic?.title, user_answer:answer, deterministic_next:deterministic ? {module:deterministic.module,field:deterministic.field,title:deterministic.title} : null, missing_required_fields:missing, report_coverage_gaps:getSpecificAssessmentGaps(assessment).slice(0,40), assessment });
  const sourceAwareInstructions=`${instructions} Current evidence contract: every captured fact also requires sourceType (user_confirmed|user_estimate|website|industry_benchmark|system_inferred|unknown_verifiable). Confidence must be exact|estimate|range|benchmark_assumption|inferred|unknown. Guesses and ranges are user_estimate; benchmarks are never facts.`;
  let apiResponse: Response;
  try {
    apiResponse = await fetch("https://api.openai.com/v1/responses", { method:"POST", headers:{ Authorization:`Bearer ${key}`, "Content-Type":"application/json" }, body:JSON.stringify({ model:process.env.OPENAI_INTERVIEW_MODEL || "gpt-5.6-sol", instructions:sourceAwareInstructions, input, text:{ format:{ type:"json_schema", name:"ai_interview_turn", strict:true, schema:aiInterviewJsonSchema } } }) });
  } catch { return NextResponse.json({ error:"OpenAI request failed.", fallback:true }, { status:502 }); }
  if (!apiResponse.ok) {
    const failure = await apiResponse.json().catch(() => ({})) as { error?: { code?: string; message?: string; param?: string; type?: string } };
    console.error("OpenAI interview request failed", { status:apiResponse.status, code:failure.error?.code, param:failure.error?.param, type:failure.error?.type, message:failure.error?.message });
    return NextResponse.json({ error:"OpenAI rejected the structured interview request.", fallback:true, diagnostic:{ status:apiResponse.status, code:failure.error?.code ?? "unknown", param:failure.error?.param ?? null } }, { status:502 });
  }
  let parsed: AIInterviewResult;
  try { parsed = JSON.parse(outputText(await apiResponse.json())) as AIInterviewResult; } catch { return NextResponse.json({ error:"Malformed AI response.", fallback:true }, { status:502 }); }
  if (!parsed || typeof parsed.assistant_question !== "string" || !Array.isArray(parsed.proposed_state_updates) || !modules.includes(parsed.next_recommended_module)) return NextResponse.json({ error:"Invalid AI response.", fallback:true }, { status:502 });
  const deterministicFacts=extractCapturedFacts(answer,assessment);
  if (deterministicFacts.length) parsed.proposed_state_updates.push({path:"captured_facts",value:JSON.stringify(deterministicFacts)});
  const applied = applyAIUpdates(assessment, parsed.proposed_state_updates);
  const immediateClarification=chooseNextQuestion(applied.assessment);
  if (immediateClarification?.id.startsWith("clarify_fact_")) { parsed.assistant_question=immediateClarification.title; parsed.rationale_for_question="A newly captured value needs an immediate label or context before discovery continues."; parsed.next_recommended_module=immediateClarification.module; }
  const answerModule = modules.includes(body.current_module as QuestionModuleId) ? body.current_module as QuestionModuleId : parsed.next_recommended_module;
  applied.assessment.answers.push({ question_id:`ai-${Date.now()}`, module:answerModule, field:applied.appliedFields.join(",") || "unstructured_note", answer, saved_at:new Date().toISOString() });
  const after = calculateReadiness(applied.assessment);
  const capturedFacts=applied.assessment.capturedFacts.filter((fact)=>!(assessment.capturedFacts ?? []).some((existing)=>existing.id===fact.id));
  return NextResponse.json({ ...parsed, captured_facts:capturedFacts, fields_targeted:applied.appliedFields, proposed_state_updates:parsed.proposed_state_updates.filter((update) => applied.appliedFields.includes(update.path)), readiness_impact:{ before_percent:before.percent, after_percent:after.percent, completed_sections:after.sections.filter((section) => section.complete && !before.sections.find((prior) => prior.key === section.key)?.complete).map((section) => section.label) }, updated_assessment:applied.assessment });
}
