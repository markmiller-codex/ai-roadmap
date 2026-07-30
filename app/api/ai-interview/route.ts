import { NextResponse } from "next/server";
import { AIInterviewResult, aiInterviewJsonSchema, applyAIUpdates } from "@/lib/ai-interview";
import { chooseNextQuestion, getMissingData } from "@/lib/interview";
import { calculateReadiness } from "@/lib/readiness";
import type { Assessment, QuestionModuleId } from "@/types/assessment";

export const runtime = "nodejs";
const modules: QuestionModuleId[] = ["company_profile","business_functions","people_roles","workflows","technology_stack","data_readiness","current_ai_use","strategic_priorities","governance_risk"];

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
  const instructions = `You are a professional SMB AI opportunity roadmap consultant. Collect the facts needed for a specific, evidence-based AI Opportunity Roadmap Report. Ask exactly one clear practical question at a time. Never ask for information already present. Prefer the highest-value missing field. Extract the user's latest answer into proposed_state_updates using only these paths: company_profile.<known field>, ai_readiness.<known field>, governance_profile.<known field>, or one complete collection: business_functions, role_groups, workflows, technology_stack, data_assets, document_assets, pain_points. Every proposed_state_updates value must be a string: use plain text for string fields and JSON-encoded text for numbers, booleans, arrays, and collections. For collection updates, JSON-encode complete schema-shaped record arrays and preserve facts already present by including them. Do not invent facts. Scores are integers 1-5. Recommendations must be grounded in company facts, workflows, pain points, technology, and data readiness. The deterministic next question is a guardrail, not an instruction to repeat collected information.`;
  const input = JSON.stringify({ mission:"Complete discovery for an AI Opportunity Roadmap Report", current_question:current_question || deterministic?.title, user_answer:answer, deterministic_next:deterministic ? {module:deterministic.module,field:deterministic.field,title:deterministic.title} : null, missing_required_fields:missing, assessment });
  let apiResponse: Response;
  try {
    apiResponse = await fetch("https://api.openai.com/v1/responses", { method:"POST", headers:{ Authorization:`Bearer ${key}`, "Content-Type":"application/json" }, body:JSON.stringify({ model:process.env.OPENAI_INTERVIEW_MODEL || "gpt-5.6-sol", instructions, input, text:{ format:{ type:"json_schema", name:"ai_interview_turn", strict:true, schema:aiInterviewJsonSchema } } }) });
  } catch { return NextResponse.json({ error:"OpenAI request failed.", fallback:true }, { status:502 }); }
  if (!apiResponse.ok) {
    const failure = await apiResponse.json().catch(() => ({})) as { error?: { code?: string; message?: string; param?: string; type?: string } };
    console.error("OpenAI interview request failed", { status:apiResponse.status, code:failure.error?.code, param:failure.error?.param, type:failure.error?.type, message:failure.error?.message });
    return NextResponse.json({ error:"OpenAI rejected the structured interview request.", fallback:true, diagnostic:{ status:apiResponse.status, code:failure.error?.code ?? "unknown", param:failure.error?.param ?? null } }, { status:502 });
  }
  let parsed: AIInterviewResult;
  try { parsed = JSON.parse(outputText(await apiResponse.json())) as AIInterviewResult; } catch { return NextResponse.json({ error:"Malformed AI response.", fallback:true }, { status:502 }); }
  if (!parsed || typeof parsed.assistant_question !== "string" || !Array.isArray(parsed.proposed_state_updates) || !modules.includes(parsed.next_recommended_module)) return NextResponse.json({ error:"Invalid AI response.", fallback:true }, { status:502 });
  const applied = applyAIUpdates(assessment, parsed.proposed_state_updates);
  const answerModule = modules.includes(body.current_module as QuestionModuleId) ? body.current_module as QuestionModuleId : parsed.next_recommended_module;
  applied.assessment.answers.push({ question_id:`ai-${Date.now()}`, module:answerModule, field:applied.appliedFields.join(",") || "unstructured_note", answer, saved_at:new Date().toISOString() });
  const after = calculateReadiness(applied.assessment);
  return NextResponse.json({ ...parsed, fields_targeted:applied.appliedFields, proposed_state_updates:parsed.proposed_state_updates.filter((update) => applied.appliedFields.includes(update.path)), readiness_impact:{ before_percent:before.percent, after_percent:after.percent, completed_sections:after.sections.filter((section) => section.complete && !before.sections.find((prior) => prior.key === section.key)?.complete).map((section) => section.label) }, updated_assessment:applied.assessment });
}
