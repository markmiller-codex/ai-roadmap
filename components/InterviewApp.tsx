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
import { applyWebsiteAnalysis } from "@/lib/website-apply";
import type { WebsiteAnalysis } from "@/lib/website-analysis";
import { createBenchmarkFacts, createBenchmarkIssues, findIndustryBenchmark } from "@/lib/industry-benchmarks";
import { mergeCapturedFacts } from "@/lib/evidence";
import { issueCounts } from "@/lib/discovery-issues";
import { WebsiteFactsReview } from "./WebsiteFactsReview";
import { BusinessCalibration, WorkflowConfirmation } from "./WorkflowConfirmation";
import { calibrationComplete } from "@/lib/calibration";
import { TracePanel } from "./TracePanel";
import { clearStoredTrace, loadTrace, saveTrace, traceEntry } from "@/lib/trace";
import type { TraceEntry } from "@/types/trace";

type AIResponse = AIInterviewResult & { updated_assessment: Assessment; captured_facts?: CapturedFact[] };
type NavigationSnapshot={assessment:Assessment;questionId:string|null;answer:string;aiAnswer:string;messages:InterviewMessage[]};
const answerFor = (assessment: Assessment, question: AssessmentQuestion | null) => question ? assessment.answers.find((item) => item.question_id === question.id)?.answer ?? "" : "";
const message = (role: InterviewMessage["role"], text: string): InterviewMessage => ({role,text,timestamp:new Date().toISOString()});
const CONSULTANT_GUIDANCE="This process is interactive. I will use your website, industry norms, and your answers to estimate the workflows where AI may create the highest ROI. You do not need to complete consultant-style workflow forms. If you do not know a number, say so. I can suggest a benchmark, mark it for later verification, or exclude it from the current analysis.";
const openingMessages = (question: AssessmentQuestion | null): InterviewMessage[] => [message("assistant",CONSULTANT_GUIDANCE),message("assistant",question?.title ?? "Your assessment has enough coverage to review the roadmap.")];
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
  const [websiteStatus, setWebsiteStatus] = useState("");
  const [navigationHistory,setNavigationHistory]=useState<NavigationSnapshot[]>([]);
  const [trace,setTrace]=useState<TraceEntry[]>([]);
  const importInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedExists=hasSavedAssessment(); const stored=loadAssessment() ?? createEmptyAssessment(); const session=loadSessionSnapshot();
      const restoredQuestion=session?.current_question_id ? questions.find((item)=>item.id===session.current_question_id) ?? chooseNextQuestion(stored) : chooseNextQuestion(stored);
      setAssessment(stored); setQuestion(restoredQuestion); setAnswer(answerFor(stored,restoredQuestion)); setMessages(session?.interview_history.length ? session.interview_history : openingMessages(restoredQuestion)); setTrace(loadTrace()); setShowResumeNotice(savedExists); setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { if (loaded) saveSession(assessment,messages,question?.id ?? null); }, [assessment,messages,question,loaded]);
  useEffect(()=>{if(loaded)saveTrace(trace);},[trace,loaded]);

  const addTrace=(entry:Omit<TraceEntry,"id"|"timestamp">)=>setTrace((current)=>[...current,traceEntry(entry)].slice(-250));
  const remember=()=>setNavigationHistory((current)=>[...current,{assessment:structuredClone(assessment),questionId:question?.id??null,answer,aiAnswer,messages:structuredClone(messages)}].slice(-30));
  const goBack=()=>{const previous=navigationHistory.at(-1);if(!previous)return;const restoredQuestion=previous.questionId?questions.find((item)=>item.id===previous.questionId)??chooseNextQuestion(previous.assessment):chooseNextQuestion(previous.assessment);setAssessment(previous.assessment);setQuestion(restoredQuestion);setAnswer(previous.answer);setAiAnswer(previous.aiAnswer);setMessages(previous.messages);setNavigationHistory((current)=>current.slice(0,-1));setSkipped([]);addTrace({eventType:"back_button_used",message:"Restored the prior discovery snapshot.",affectedId:previous.questionId??"discovery_step",source:"user"});};

  const selectNext = (state: Assessment, excluded = skipped) => { const next = chooseNextQuestion(state, excluded) ?? chooseNextQuestion(state); setQuestion(next); setAnswer(answerFor(state, next)); return next; };
  const reset = () => { if (!window.confirm("Start a new assessment? Your current browser session will be cleared. Export it first if you may need it later.")) return; const empty=createEmptyAssessment(); clearAssessment(); setNavigationHistory([]); setAssessment(empty); setSkipped([]); setUpdatedFields([]); setCapturedFactsThisTurn([]); setAiAnswer(""); const next=selectNext(empty,[]); setMessages(openingMessages(next)); setShowResumeNotice(false); setSessionStatus("New assessment started."); addTrace({eventType:"assessment_reset",message:"Started a new blank assessment.",source:"user"}); };
  const loadSeed = () => { if (!window.confirm("Load the Iona sample? This replaces the current browser session. Export your current session first if needed.")) return; remember(); const sample=createIonaAssessment(); setAssessment(sample); setSkipped([]); setUpdatedFields([]); setCapturedFactsThisTurn([]); setAiAnswer(""); const next=selectNext(sample,[]); setMessages(openingMessages(next)); setShowResumeNotice(false); setSessionStatus("Iona sample loaded."); addTrace({eventType:"sample_loaded",message:"Loaded the Iona Hospitality sample.",affectedId:"iona-hospitality-sample",source:"system"}); };
  const saveCurrentSession = () => { saveSession(assessment,messages,question?.id ?? null); setSessionStatus(`Session saved at ${new Date().toLocaleTimeString()}.`); };
  const exportCurrentSession = () => { const snapshot=saveSession(assessment,messages,question?.id ?? null); exportSessionFile(snapshot); setSessionStatus("Session JSON exported."); };
  const importSession = async (file: File | undefined) => {
    if (!file) return;
    try { const snapshot=parseImportedSession(await file.text()); if (!window.confirm(`Import the saved session for ${snapshot.assessment.company_profile.company_name || "this assessment"}? This will replace the current browser session.`)) return; const restoredQuestion=snapshot.current_question_id ? questions.find((item)=>item.id===snapshot.current_question_id) ?? chooseNextQuestion(snapshot.assessment) : chooseNextQuestion(snapshot.assessment); setAssessment(snapshot.assessment); setMessages(snapshot.interview_history.length ? snapshot.interview_history : openingMessages(restoredQuestion)); setQuestion(restoredQuestion); setAnswer(answerFor(snapshot.assessment,restoredQuestion)); setSkipped([]); setUpdatedFields([]); setCapturedFactsThisTurn([]); setAiAnswer(""); saveSession(snapshot.assessment,snapshot.interview_history,restoredQuestion?.id ?? null); setShowResumeNotice(false); setSessionStatus("Session imported. Continue the interview where you left off."); }
    catch (error) { setSessionStatus(error instanceof Error ? error.message : "Unable to import that session file."); }
    finally { if (importInput.current) importInput.current.value=""; }
  };
  const ingestWebsite = async (url:string) => { remember();addTrace({eventType:"submit_clicked",message:"Website analysis submitted.",affectedId:"company_website",source:"user"});setWebsiteStatus("Analyzing the public website..."); try { const response=await fetch("/api/website-ingest",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url})}); const result=await response.json() as {analysis?:WebsiteAnalysis;error?:string}; if (!response.ok||!result.analysis) throw new Error(result.error||"Website analysis failed."); const applied=applyWebsiteAnalysis(assessment,result.analysis,url); setAssessment(applied.assessment); setCapturedFactsThisTurn(applied.facts); setUpdatedFields(["company_profile","business_functions","workflows","technology_stack"]); setSkipped([]); const next=selectNext(applied.assessment,[]); setMessages((current)=>[...current,message("user",url),message("assistant",next?.title??"Website analysis complete.")]); setWebsiteStatus(`Analyzed ${result.analysis.sourceUrls.length} public pages. Review and confirm the captured facts.`);addTrace({eventType:"state_update_applied",message:`Website analysis added ${applied.facts.length} captured facts.`,affectedId:"company_website",source:"system"}); return true; } catch(error) { setNavigationHistory((current)=>current.slice(0,-1));setWebsiteStatus(error instanceof Error?`${error.message} You can correct the URL or skip this question.`:"Website analysis failed."); return false; } };
  const saveAndContinue = async () => { if (!question || !answer.trim()) return; if (question.id==="company_website") { if (await ingestWebsite(answer.trim())) setAnswer(""); return; } remember();addTrace({eventType:"submit_clicked",message:"Deterministic answer submitted explicitly.",affectedId:question.id,source:"user"});const existingIds=new Set((assessment.capturedFacts ?? []).map((fact)=>fact.id)); const updated=applyAnswer(assessment,question,answer); setAssessment(updated); setCapturedFactsThisTurn(updated.capturedFacts.filter((fact)=>!existingIds.has(fact.id))); setSkipped([]); setUpdatedFields([question.field]); selectNext(updated,[]);addTrace({eventType:"readiness_recalculated",message:"State and readiness refreshed after answer.",affectedId:question.id,source:"deterministic"}); };
  const skip = () => { if (!question) return; remember();const excluded = [...skipped, question.id]; setSkipped(excluded); selectNext(assessment, excluded);addTrace({eventType:"step_skipped",message:"Question skipped by explicit action.",affectedId:question.id,source:"user"}); };
  const sendAIAnswer = async () => {
    const responseText = aiAnswer.trim(); if (!responseText || !question || aiStatus === "thinking") return;
    if (question.id==="company_website") { const url=aiAnswer.trim(); setAiAnswer(""); await ingestWebsite(url); return; }
    if (/^(what|why|how|which|can|could|would|do|does|is|are)\b.*\?$/i.test(responseText)) { setMessages((current)=>[...current,message("user",responseText),message("assistant",`${question.help} You may answer approximately, say you do not know, use a benchmark, or exclude the variable.`)]); setAiAnswer(""); return; }
    remember();addTrace({eventType:"submit_clicked",message:"AI interview answer submitted explicitly.",affectedId:question.id,source:"user"});
    const currentQuestion = messages.filter((message) => message.role === "assistant").at(-1)?.text ?? question.title;
    setMessages((current) => [...current, message("user",responseText)]); setAiAnswer(""); setAiStatus("thinking"); setUpdatedFields([]);
    try {
      addTrace({eventType:"ai_route_called",message:"AI interviewer route called.",affectedId:question.id,source:"AI"});const response = await fetch("/api/ai-interview", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ assessment, answer:responseText, current_module:question.module, current_question:currentQuestion }) });
      if (!response.ok) throw new Error("AI unavailable");
      const result = await response.json() as AIResponse;
      if (!result.updated_assessment || typeof result.assistant_question !== "string" || !Array.isArray(result.fields_targeted)) throw new Error("Invalid AI response");
      setAssessment(result.updated_assessment); setUpdatedFields(result.fields_targeted); setCapturedFactsThisTurn(result.captured_facts ?? result.updated_assessment.capturedFacts.filter((fact)=>!(assessment.capturedFacts ?? []).some((existing)=>existing.id===fact.id))); setSkipped([]); selectNext(result.updated_assessment, []);
      setMessages((current) => [...current, message("assistant",result.assistant_question)]); setAiStatus("idle");addTrace({eventType:"ai_route_response_received",message:`AI response updated ${result.fields_targeted.length} fields.`,affectedId:question.id,source:"AI"});
    } catch {
      const updated = applyAnswer(assessment, question, responseText); const next = chooseNextQuestion(updated);
      setAssessment(updated); setQuestion(next); setUpdatedFields([question.field]); setCapturedFactsThisTurn(updated.capturedFacts.filter((fact)=>!(assessment.capturedFacts ?? []).some((existing)=>existing.id===fact.id))); setSkipped([]);
      setMessages((current) => [...current, message("assistant",next?.title ?? "Assessment coverage is complete. You can review the roadmap.")]); setAiStatus("fallback");addTrace({eventType:"deterministic_fallback_used",message:"AI route failed; deterministic parser applied the answer.",affectedId:question.id,source:"deterministic"});
    }
  };
  const missing = getMissingData(assessment); const moduleLabel = `${missing.length} ${missing.length === 1 ? "module" : "modules"} remaining`;
  const benchmark=findIndustryBenchmark(assessment.company_profile.industry); const sourceGroups=[["Confirmed / corrected facts",assessment.capturedFacts.filter((f)=>f.sourceType==="user_confirmed"||f.sourceType==="user_corrected")],["User estimates",assessment.capturedFacts.filter((f)=>f.sourceType==="user_estimate")],["Website-derived facts",assessment.capturedFacts.filter((f)=>f.sourceType==="website")],["Industry benchmark assumptions",assessment.capturedFacts.filter((f)=>f.sourceType==="industry_benchmark")],["Unknowns needing verification",assessment.capturedFacts.filter((f)=>f.sourceType==="unknown_verifiable"||f.needsClarification||f.needsConfirmation)]] as const;
  const discoveryCounts=issueCounts(assessment); const discoveryGroups=[["Confirmed / corrected facts",discoveryCounts.confirmed,assessment.capturedFacts.filter((f)=>f.sourceType==="user_confirmed"||f.sourceType==="user_corrected").map((f)=>f.label)],["User estimates",discoveryCounts.estimates,assessment.discoveryIssues.filter((i)=>i.issueType==="user_estimate").map((i)=>i.label)],["Industry benchmark assumptions",discoveryCounts.benchmarks,assessment.discoveryIssues.filter((i)=>i.issueType==="benchmark_assumption").map((i)=>i.label)],["Missing information",discoveryCounts.missing,assessment.discoveryIssues.filter((i)=>i.issueType==="missing_information"&&i.status==="open").map((i)=>i.label)],["Excluded variables",discoveryCounts.excluded,assessment.discoveryIssues.filter((i)=>i.status==="excluded").map((i)=>i.label)],["Conflicting information",discoveryCounts.conflicts,assessment.discoveryIssues.filter((i)=>i.issueType==="conflicting_information"&&i.status!=="resolved").map((i)=>i.label)],["Items needing verification",discoveryCounts.verification,assessment.discoveryIssues.filter((i)=>["needs_verification","user_estimate","benchmark_assumption"].includes(i.issueType)).map((i)=>i.label)]] as const;
  const applyBenchmark=()=>{ if(!benchmark)return; const facts=createBenchmarkFacts(benchmark,assessment),issues=createBenchmarkIssues(facts); const next=structuredClone(assessment); next.capturedFacts=mergeCapturedFacts(next.capturedFacts,facts); next.discoveryIssues=[...next.discoveryIssues,...issues]; next.updated_at=new Date().toISOString(); setAssessment(next); setCapturedFactsThisTurn(facts); setSessionStatus(`${facts.length} ${benchmark.label} assumptions added for missing areas. Confirm or replace them during discovery.`);addTrace({eventType:"benchmark_assumption_created",message:`Added ${facts.length} benchmark facts and ${issues.length} discovery issues.`,affectedId:benchmark.id,source:"benchmark"}); };
  const websiteReviewPending=assessment.websiteDiscovery.status==="pending_review"; const calibrationPending=assessment.websiteDiscovery.status==="confirmed"&&!calibrationComplete(assessment); const workflowReviewPending=assessment.websiteDiscovery.status==="confirmed"&&calibrationComplete(assessment)&&assessment.expectedWorkflowReviews.some((item)=>item.status==="unreviewed"); const reviewGate=websiteReviewPending||calibrationPending||workflowReviewPending;
  const acceptReviewedAssessment=(next:Assessment)=>{remember();setAssessment(next);setSkipped([]);const nextQuestion=selectNext(next,[]);setMessages((current)=>[...current,message("assistant",nextQuestion?.title??"Company facts confirmed. Complete sizing calibration next.")]);addTrace({eventType:"submit_clicked",message:"Company facts confirmed and discovery advanced to calibration.",affectedId:"website_facts_review",source:"user"});};
  const saveChildState=(next:Assessment)=>{setAssessment(next);addTrace({eventType:"state_update_applied",message:"Draft changes saved without advancing.",affectedId:"discovery_step",source:"user"});};
  const advanceChildState=(next:Assessment)=>{remember();setAssessment(next);addTrace({eventType:"readiness_recalculated",message:"Explicit discovery action applied and readiness recalculated.",affectedId:"discovery_step",source:"system"});};

  return <main>
    <header className="hero"><div><span className="eyebrow">Adaptive AI assessment engine</span><h1>Build a practical AI roadmap</h1><p>A consultant-style AI interview captures natural-language answers into a guarded business data model, with deterministic questions and scoring always available.</p></div>
      <div className="header-actions"><button className="secondary" onClick={saveCurrentSession}>Save Session</button><button className="secondary" onClick={exportCurrentSession}>Export Session JSON</button><button className="secondary" onClick={()=>importInput.current?.click()}>Import Session JSON</button><input ref={importInput} className="visually-hidden" type="file" accept="application/json,.json" onChange={(event)=>void importSession(event.target.files?.[0])} /><Link className="secondary link-control" href="/discovery-report">Discovery Issues Report</Link><button className="ghost" onClick={loadSeed}>Load Iona sample</button><button className="ghost" onClick={reset}>Start new assessment</button></div>
    </header>
    {showResumeNotice && <aside className="resume-notice" role="status"><div><strong>Saved assessment found.</strong><span>Continue previous session or start new assessment.</span></div><div className="actions"><button onClick={()=>{setShowResumeNotice(false);setSessionStatus("Previous session resumed.");}}>Continue previous session</button><button className="secondary" onClick={reset}>Start new assessment</button></div></aside>}
    {sessionStatus && <p className="session-status" role="status">{sessionStatus}</p>}
    {websiteStatus && <p className="session-status" role="status">{websiteStatus}</p>}
    <aside className="resume-notice consultant-guidance"><div><strong>Interactive discovery</strong><span>{CONSULTANT_GUIDANCE}</span><small>Your assessment progress is saved in this browser. You can return later to update estimates, replace benchmark assumptions, or add missing information before generating a final roadmap.</small></div></aside>
    <nav className="discovery-navigation" aria-label="Discovery navigation"><button className="secondary" onClick={goBack} disabled={!navigationHistory.length}>Back</button><span>Discovery advances only when you click Continue, Submit, Accept, or Exclude.</span></nav>
    {websiteReviewPending&&<section className="panel review-gate"><WebsiteFactsReview assessment={assessment} onChange={setAssessment} onConfirm={acceptReviewedAssessment} onTrace={addTrace}/></section>}
    {calibrationPending&&<section className="panel review-gate"><BusinessCalibration assessment={assessment} onSave={saveChildState} onContinue={advanceChildState} onTrace={addTrace}/></section>}
    {assessment.websiteDiscovery.status==="confirmed"&&calibrationComplete(assessment)&&<section className="panel review-gate"><WorkflowConfirmation assessment={assessment} onSave={saveChildState} onAdvance={advanceChildState} onTrace={addTrace}/></section>}
    <div className={reviewGate?"dashboard gated":"dashboard"} aria-hidden={reviewGate}>
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
      <section className="panel wide"><div className="panel-title"><h2>Discovery Status</h2><Link className="secondary link-control" href="/discovery-report">Open printable report</Link></div><div className="source-grid">{discoveryGroups.map(([label,count,items])=><details key={label}><summary><strong>{label}</strong><span>{count}</span></summary>{items.length?<ul>{items.map((item,index)=><li key={`${item}-${index}`}>{item}</li>)}</ul>:<small>None recorded.</small>}</details>)}</div></section>
      <section className="panel wide"><div className="panel-title"><h2>Data Sources &amp; Confidence</h2><span>{assessment.capturedFacts.length} evidence items</span></div><div className="source-grid">{sourceGroups.map(([label,facts])=><article key={label}><strong>{label}</strong><span>{facts.length}</span>{facts.slice(0,4).map((fact)=><small key={fact.id}>{fact.label}: {factValue(fact)} ({fact.sourceType.replaceAll("_"," ")} / {fact.confidence})</small>)}</article>)}</div>{benchmark&&<div className="actions"><button className="secondary" onClick={applyBenchmark}>Add {benchmark.label} benchmark assumptions</button><span className="muted">Only missing areas are supplemented; assumptions remain unconfirmed.</span></div>}</section>
      <section className="panel wide"><div className="panel-title"><h2>Missing data queue</h2><span>{missing.length} questions</span></div>{missing.length ? <ul className="missing-list">{missing.map((item) => <li key={item.questionId}><strong>{item.module.replaceAll("_", " ")}</strong><span>{item.label}</span></li>)}</ul> : <p className="muted">No required modules are missing.</p>}</section>
      <section className="panel wide"><div className="panel-title"><h2>Structured assessment state</h2><span>LocalStorage · schema aligned</span></div><pre>{JSON.stringify(assessment, null, 2)}</pre></section>
    </div>
    <TracePanel entries={trace} onClear={()=>{setTrace([]);clearStoredTrace();}}/>
  </main>;
}
