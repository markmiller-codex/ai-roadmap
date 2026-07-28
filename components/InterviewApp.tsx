"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { applyAnswer, chooseNextQuestion, getMissingData } from "@/lib/interview";
import { createEmptyAssessment, initialAssessment } from "@/lib/initial-state";
import { createIonaAssessment } from "@/lib/sample";
import { clearAssessment, loadAssessment, saveAssessment } from "@/lib/storage";
import type { Assessment, AssessmentQuestion } from "@/types/assessment";
import { ReadinessPanel } from "./ReadinessPanel";
import { OpportunityTable } from "./OpportunityTable";

const answerFor = (assessment: Assessment, question: AssessmentQuestion | null) => question ? assessment.answers.find((item) => item.question_id === question.id)?.answer ?? "" : "";

export function InterviewApp() {
  const [assessment, setAssessment] = useState<Assessment>(initialAssessment);
  const [question, setQuestion] = useState<AssessmentQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [skipped, setSkipped] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = loadAssessment() ?? createEmptyAssessment(); const next = chooseNextQuestion(stored);
      setAssessment(stored); setQuestion(next); setAnswer(answerFor(stored, next)); setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { if (loaded) saveAssessment(assessment); }, [assessment, loaded]);

  const selectNext = (state: Assessment, excluded = skipped) => { const next = chooseNextQuestion(state, excluded) ?? chooseNextQuestion(state); setQuestion(next); setAnswer(answerFor(state, next)); };
  const reset = () => { const empty = createEmptyAssessment(); clearAssessment(); setAssessment(empty); setSkipped([]); selectNext(empty, []); };
  const loadSeed = () => { const sample = createIonaAssessment(); setAssessment(sample); setSkipped([]); selectNext(sample, []); };
  const saveAndContinue = () => { if (!question || !answer.trim()) return; const updated = applyAnswer(assessment, question, answer); setAssessment(updated); setSkipped([]); selectNext(updated, []); };
  const skip = () => { if (!question) return; const excluded = [...skipped, question.id]; setSkipped(excluded); selectNext(assessment, excluded); };
  const missing = getMissingData(assessment);

  return <main>
    <header className="hero"><div><span className="eyebrow">Deterministic assessment engine</span><h1>Build a practical AI roadmap</h1><p>The interview selects the highest-value missing question, updates structured business data, scores opportunities, and generates an implementation-ready report.</p></div>
      <div className="header-actions"><button className="secondary" onClick={loadSeed}>Load Iona sample</button><button className="ghost" onClick={reset}>Reset assessment</button></div>
    </header>
    <div className="dashboard">
      <section className="panel interview">
        {question ? <>
          <div className="panel-title"><div><span className="step">Next best question · {question.module.replaceAll("_", " ")}</span><h2>{question.title}</h2></div><span>{missing.length} modules remaining</span></div>
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
