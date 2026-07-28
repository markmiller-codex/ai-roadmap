"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { applyAnswer, chooseNextQuestion, getMissingData } from "@/lib/interview";
import { createEmptyAssessment, initialAssessment } from "@/lib/initial-state";
import { createIonaAssessment } from "@/lib/sample";
import { clearAssessment, loadAssessment, saveAssessment } from "@/lib/storage";
import type { AIInterviewResult } from "@/lib/ai-interview";
import type { Assessment, AssessmentQuestion } from "@/types/assessment";
import { ReadinessPanel } from "./ReadinessPanel";
import { OpportunityTable } from "./OpportunityTable";

type ChatMessage = { role: "assistant" | "user"; text: string };
type AIResponse = AIInterviewResult & { updated_assessment: Assessment };
const answerFor = (assessment: Assessment, question: AssessmentQuestion | null) => question ? assessment.answers.find((item) => item.question_id === question.id)?.answer ?? "" : "";
const openingMessages = (question: AssessmentQuestion | null): ChatMessage[] => [{ role:"assistant", text:question?.title ?? "Your assessment has enough coverage to review the roadmap." }];

export function InterviewApp() {
  const [assessment, setAssessment] = useState<Assessment>(initialAssessment);
  const [question, setQuestion] = useState<AssessmentQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [updatedFields, setUpdatedFields] = useState<string[]>([]);
  const [interviewMode, setInterviewMode] = useState<"ai" | "deterministic">("ai");
  const [aiStatus, setAiStatus] = useState<"idle" | "thinking" | "fallback">("idle");
  const [skipped, setSkipped] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = loadAssessment() ?? createEmptyAssessment(); const next = chooseNextQuestion(stored);
      setAssessment(stored); setQuestion(next); setAnswer(answerFor(stored, next)); setMessages(openingMessages(next)); setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { if (loaded) saveAssessment(assessment); }, [assessment, loaded]);

  const selectNext = (state: Assessment, excluded = skipped) => { const next = chooseNextQuestion(state, excluded) ?? chooseNextQuestion(state); setQuestion(next); setAnswer(answerFor(state, next)); return next; };
  const reset = () => { const empty = createEmptyAssessment(); clearAssessment(); setAssessment(empty); setSkipped([]); setUpdatedFields([]); setAiAnswer(""); const next = selectNext(empty, []); setMessages(openingMessages(next)); };
  const loadSeed = () => { const sample = createIonaAssessment(); setAssessment(sample); setSkipped([]); setUpdatedFields([]); setAiAnswer(""); const next = selectNext(sample, []); setMessages(openingMessages(next)); };
  const saveAndContinue = () => { if (!question || !answer.trim()) return; const updated = applyAnswer(assessment, question, answer); setAssessment(updated); setSkipped([]); setUpdatedFields([question.field]); selectNext(updated, []); };
  const skip = () => { if (!question) return; const excluded = [...skipped, question.id]; setSkipped(excluded); selectNext(assessment, excluded); };
  const sendAIAnswer = async () => {
    const responseText = aiAnswer.trim(); if (!responseText || !question || aiStatus === "thinking") return;
    const currentQuestion = messages.filter((message) => message.role === "assistant").at(-1)?.text ?? question.title;
    setMessages((current) => [...current, { role:"user", text:responseText }]); setAiAnswer(""); setAiStatus("thinking"); setUpdatedFields([]);
    try {
      const response = await fetch("/api/ai-interview", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ assessment, answer:responseText, current_module:question.module, current_question:currentQuestion }) });
      if (!response.ok) throw new Error("AI unavailable");
      const result = await response.json() as AIResponse;
      if (!result.updated_assessment || typeof result.assistant_question !== "string" || !Array.isArray(result.fields_targeted)) throw new Error("Invalid AI response");
      setAssessment(result.updated_assessment); setUpdatedFields(result.fields_targeted); setSkipped([]); selectNext(result.updated_assessment, []);
      setMessages((current) => [...current, { role:"assistant", text:result.assistant_question }]); setAiStatus("idle");
    } catch {
      const updated = applyAnswer(assessment, question, responseText); const next = chooseNextQuestion(updated);
      setAssessment(updated); setQuestion(next); setUpdatedFields([question.field]); setSkipped([]);
      setMessages((current) => [...current, { role:"assistant", text:next?.title ?? "Assessment coverage is complete. You can review the roadmap." }]); setAiStatus("fallback");
    }
  };
  const missing = getMissingData(assessment); const moduleLabel = `${missing.length} ${missing.length === 1 ? "module" : "modules"} remaining`;

  return <main>
    <header className="hero"><div><span className="eyebrow">Adaptive AI assessment engine</span><h1>Build a practical AI roadmap</h1><p>A consultant-style AI interview captures natural-language answers into a guarded business data model, with deterministic questions and scoring always available.</p></div>
      <div className="header-actions"><button className="secondary" onClick={loadSeed}>Load Iona sample</button><button className="ghost" onClick={reset}>Reset assessment</button></div>
    </header>
    <div className="dashboard">
      <section className="panel interview">
        <div className="mode-switch" aria-label="Interview mode"><button className={interviewMode === "ai" ? "active" : "secondary"} onClick={() => setInterviewMode("ai")}>AI interview</button><button className={interviewMode === "deterministic" ? "active" : "secondary"} onClick={() => setInterviewMode("deterministic")}>Module flow</button></div>
        {interviewMode === "ai" ? <>
          <div className="panel-title"><div><span className="step">AI consultant · schema guarded</span><h2>Discovery interview</h2></div><span>{moduleLabel}</span></div>
          <div className="chat-log" aria-live="polite">{messages.map((message, index) => <div className={`chat-bubble ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === "assistant" ? "Consultant" : "You"}</span><p>{message.text}</p></div>)}</div>
          {question ? <><textarea className="chat-answer" value={aiAnswer} onChange={(event) => setAiAnswer(event.target.value)} placeholder="Answer in plain English…" onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void sendAIAnswer(); }} />
            <div className="actions"><button onClick={() => void sendAIAnswer()} disabled={!aiAnswer.trim() || aiStatus === "thinking"}>{aiStatus === "thinking" ? "Structuring answer…" : "Send answer"}</button><Link className="button-link" href="/report">Preview report</Link></div></> : <Link className="button-link" href="/report">Open report preview</Link>}
          {aiStatus === "fallback" && <p className="fallback-note">AI was unavailable for the last turn, so the deterministic parser safely handled the answer.</p>}
          {updatedFields.length > 0 && <div className="updated-fields"><strong>Updated from your answer</strong><div>{updatedFields.map((field) => <span key={field}>{field.replaceAll("_", " ")}</span>)}</div></div>}
        </> : question ? <>
          <div className="panel-title"><div><span className="step">Deterministic fallback · {question.module.replaceAll("_", " ")}</span><h2>{question.title}</h2></div><span>{moduleLabel}</span></div>
          <p className="help">{question.help}</p>
          <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Enter one item per line. Use | between fields where shown." />
          <div className="actions"><button onClick={saveAndContinue} disabled={!answer.trim()}>Save & choose next</button><button className="secondary" onClick={skip}>Skip for now</button><Link className="button-link" href="/report">Preview report</Link></div>
        </> : <><span className="step">Assessment coverage complete</span><h2>Ready to review the roadmap</h2><p className="help">All required report sections have enough structured information for this MVP.</p><Link className="button-link" href="/report">Open report preview</Link></>}
      </section>
      <ReadinessPanel assessment={assessment} />
      <OpportunityTable opportunities={assessment.opportunities} />
      <section className="panel wide"><div className="panel-title"><h2>Missing data queue</h2><span>{missing.length} questions</span></div>{missing.length ? <ul className="missing-list">{missing.map((item) => <li key={item.questionId}><strong>{item.module.replaceAll("_", " ")}</strong><span>{item.label}</span></li>)}</ul> : <p className="muted">No required modules are missing.</p>}</section>
      <section className="panel wide"><div className="panel-title"><h2>Structured assessment state</h2><span>LocalStorage · schema aligned</span></div><pre>{JSON.stringify(assessment, null, 2)}</pre></section>
    </div>
  </main>;
}
