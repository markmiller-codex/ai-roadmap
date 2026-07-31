"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { applyAnswer, chooseNextQuestion, getMissingData } from "@/lib/interview";
import { createEmptyAssessment, initialAssessment } from "@/lib/initial-state";
import { createIonaAssessment } from "@/lib/sample";
import { exportSessionFile, hasSavedAssessment, loadAssessment, loadSessionSnapshot, parseImportedSession, saveSession, clearAssessment } from "@/lib/storage";
import { questions } from "@/lib/questions";
import type { AIInterviewResult } from "@/lib/ai-interview";
import type { Assessment, AssessmentQuestion, CapturedFact } from "@/types/assessment";
import type { InterviewMessage } from "@/types/session";
import { ReadinessPanel } from "./ReadinessPanel";
import { OpportunityTable } from "./OpportunityTable";

type AIResponse = AIInterviewResult & { updated_assessment: Assessment; captured_facts?: CapturedFact[] };
const answerFor = (assessment: Assessment, question: AssessmentQuestion | null) => question ? assessment.answers.find((item) => item.question_id === question.id)?.answer ?? "" : "";
const message = (role: InterviewMessage["role"], text: string): InterviewMessage => ({role,text,timestamp:new Date().toISOString()});
const openingMessages = (question: AssessmentQuestion | null): InterviewMessage[] => [message("assistant",question?.title ?? "Your assessment has enough coverage to review the roadmap.")];
const factValue = (fact: CapturedFact) => typeof fact.value === "object" ? `${fact.value.min}–${fact.value.max}` : String(fact.value);

export function InterviewApp() {
  const [assessment, setAssessment] = useState<Assessment>(initialAssessment);
  const [question, setQuestion] = useState<AssessmentQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [updatedFields, setUpdatedFields] = useState<string[]>([]);
  const [interviewMode, setInterviewMode] = useState<"ai" | "deterministic">("ai");
  const [aiStatus, setAiStatus] = useState<"idle" | "thinking" | "fallback">("idle");
  const [skipped, setSkipped] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showResumeNotice, setShowResumeNotice] = useState(false);
  const [sessionStatus, setSessionStatus] = useState("");
  const [capturedFactsThisTurn, setCapturedFactsThisTurn] = useState<CapturedFact[]>([]);
  const importInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedExists=hasSavedAssessment(); const stored=loadAssessment() ?? createEmptyAssessment(); const session=loadSessionSnapshot();
      const restoredQuestion=session?.current_question_id ? questions.find((item)=>item.id===session.current_question_id) ?? chooseNextQuestion(stored) : chooseNextQuestion(stored);
      setAssessment(stored); setQuestion(restoredQuestion); setAnswer(answerFor(stored,restoredQuestion)); setMessages(session?.interview_history.length ? session.interview_history : openingMessages(restoredQuestion)); setShowResumeNotice(savedExists); setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { if (loaded) saveSession(assessment,messages,question?.id ?? null); }, [assessment,messages,question,loaded]);

  const selectNext = (state: Assessment, excluded = skipped) => { const next = chooseNextQuestion(state, excluded) ?? chooseNextQuestion(state); setQuestion(next); setAnswer(answerFor(state, next)); return next; };
  const reset = () => { if (!window.confirm("Start a new assessment? Your current browser session will be cleared. Export it first if you may need it later.")) return; const empty=createEmptyAssessment(); clearAssessment(); setAssessment(empty); setSkipped([]); setUpdatedFields([]); setCapturedFactsThisTurn([]); setAiAnswer(""); const next=selectNext(empty,[]); setMessages(openingMessages(next)); setShowResumeNotice(false); setSessionStatus("New assessment started."); };
  const loadSeed = () => { if (!window.confirm("Load the Iona sample? This replaces the current browser session. Export your current session first if needed.")) return; const sample=createIonaAssessment(); setAssessment(sample); setSkipped([]); setUpdatedFields([]); setCapturedFactsThisTurn([]); setAiAnswer(""); const next=selectNext(sample,[]); setMessages(openingMessages(next)); setShowResumeNotice(false); setSessionStatus("Iona sample loaded."); };
  const saveCurrentSession = () => { saveSession(assessment,messages,question?.id ?? null); setSessionStatus(`Session saved at ${new Date().toLocaleTimeString()}.`); };
  const exportCurrentSession = () => { const snapshot=saveSession(assessment,messages,question?.id ?? null); exportSessionFile(snapshot); setSessionStatus("Session JSON exported."); };
  const importSession = async (file: File | undefined) => {
    if (!file) return;
    try { const snapshot=parseImportedSession(await file.text()); if (!window.confirm(`Import the saved session for ${snapshot.assessment.company_profile.company_name || "this assessment"}? This will replace the current browser session.`)) return; const restoredQuestion=snapshot.current_question_id ? questions.find((item)=>item.id===snapshot.current_question_id) ?? chooseNextQuestion(snapshot.assessment) : chooseNextQuestion(snapshot.assessment); setAssessment(snapshot.assessment); setMessages(snapshot.interview_history.length ? snapshot.interview_history : openingMessages(restoredQuestion)); setQuestion(restoredQuestion); setAnswer(answerFor(snapshot.assessment,restoredQuestion)); setSkipped([]); setUpdatedFields([]); setCapturedFactsThisTurn([]); setAiAnswer(""); saveSession(snapshot.assessment,snapshot.interview_history,restoredQuestion?.id ?? null); setShowResumeNotice(false); setSessionStatus("Session imported. Continue the interview where you left off."); }
    catch (error) { setSessionStatus(error instanceof Error ? error.message : "Unable to import that session file."); }
    finally { if (importInput.current) importInput.current.value=""; }
  };
  const saveAndContinue = () => { if (!question || !answer.trim()) return; const existingIds=new Set((assessment.capturedFacts ?? []).map((fact)=>fact.id)); const updated=applyAnswer(assessment,question,answer); setAssessment(updated); setCapturedFactsThisTurn(updated.capturedFacts.filter((fact)=>!existingIds.has(fact.id))); setSkipped([]); setUpdatedFields([question.field]); selectNext(updated,[]); };
  const skip = () => { if (!question) return; const excluded = [...skipped, question.id]; setSkipped(excluded); selectNext(assessment, excluded); };
  const sendAIAnswer = async () => {
    const responseText = aiAnswer.trim(); if (!responseText || !question || aiStatus === "thinking") return;
    const currentQuestion = messages.filter((message) => message.role === "assistant").at(-1)?.text ?? question.title;
    setMessages((current) => [...current, message("user",responseText)]); setAiAnswer(""); setAiStatus("thinking"); setUpdatedFields([]);
    try {
      const response = await fetch("/api/ai-interview", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ assessment, answer:responseText, current_module:question.module, current_question:currentQuestion }) });
      if (!response.ok) throw new Error("AI unavailable");
      const result = await response.json() as AIResponse;
      if (!result.updated_assessment || typeof result.assistant_question !== "string" || !Array.isArray(result.fields_targeted)) throw new Error("Invalid AI response");
      setAssessment(result.updated_assessment); setUpdatedFields(result.fields_targeted); setCapturedFactsThisTurn(result.captured_facts ?? result.updated_assessment.capturedFacts.filter((fact)=>!(assessment.capturedFacts ?? []).some((existing)=>existing.id===fact.id))); setSkipped([]); selectNext(result.updated_assessment, []);
      setMessages((current) => [...current, message("assistant",result.assistant_question)]); setAiStatus("idle");
    } catch {
      const updated = applyAnswer(assessment, question, responseText); const next = chooseNextQuestion(updated);
      setAssessment(updated); setQuestion(next); setUpdatedFields([question.field]); setCapturedFactsThisTurn(updated.capturedFacts.filter((fact)=>!(assessment.capturedFacts ?? []).some((existing)=>existing.id===fact.id))); setSkipped([]);
      setMessages((current) => [...current, message("assistant",next?.title ?? "Assessment coverage is complete. You can review the roadmap.")]); setAiStatus("fallback");
    }
  };
  const missing = getMissingData(assessment); const moduleLabel = `${missing.length} ${missing.length === 1 ? "module" : "modules"} remaining`;

  return <main>
    <header className="hero"><div><span className="eyebrow">Adaptive AI assessment engine</span><h1>Build a practical AI roadmap</h1><p>A consultant-style AI interview captures natural-language answers into a guarded business data model, with deterministic questions and scoring always available.</p></div>
      <div className="header-actions"><button className="secondary" onClick={saveCurrentSession}>Save Session</button><button className="secondary" onClick={exportCurrentSession}>Export Session JSON</button><button className="secondary" onClick={()=>importInput.current?.click()}>Import Session JSON</button><input ref={importInput} className="visually-hidden" type="file" accept="application/json,.json" onChange={(event)=>void importSession(event.target.files?.[0])} /><button className="ghost" onClick={loadSeed}>Load Iona sample</button><button className="ghost" onClick={reset}>Start new assessment</button></div>
    </header>
    {showResumeNotice && <aside className="resume-notice" role="status"><div><strong>Saved assessment found.</strong><span>Continue previous session or start new assessment.</span></div><div className="actions"><button onClick={()=>{setShowResumeNotice(false);setSessionStatus("Previous session resumed.");}}>Continue previous session</button><button className="secondary" onClick={reset}>Start new assessment</button></div></aside>}
    {sessionStatus && <p className="session-status" role="status">{sessionStatus}</p>}
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
        {capturedFactsThisTurn.length > 0 && <div className="captured-facts"><strong>Captured facts from your answer</strong><div>{capturedFactsThisTurn.map((fact)=><article key={fact.id}><b>{fact.label}</b><span>{factValue(fact)} {fact.unit}</span><small>{fact.timePeriod} · {fact.businessArea} · {fact.confidence}{fact.workflowId ? ` · ${fact.workflowId}` : ""}</small></article>)}</div></div>}
      </section>
      <ReadinessPanel assessment={assessment} />
      <OpportunityTable opportunities={assessment.opportunities} />
      <section className="panel wide"><div className="panel-title"><h2>Missing data queue</h2><span>{missing.length} questions</span></div>{missing.length ? <ul className="missing-list">{missing.map((item) => <li key={item.questionId}><strong>{item.module.replaceAll("_", " ")}</strong><span>{item.label}</span></li>)}</ul> : <p className="muted">No required modules are missing.</p>}</section>
      <section className="panel wide"><div className="panel-title"><h2>Structured assessment state</h2><span>LocalStorage · schema aligned</span></div><pre>{JSON.stringify(assessment, null, 2)}</pre></section>
    </div>
  </main>;
}
