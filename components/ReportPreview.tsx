"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { initialAssessment } from "@/lib/initial-state";
import { generateReport } from "@/lib/report";
import { loadAssessment } from "@/lib/storage";
import type { Assessment } from "@/types/assessment";

export function ReportPreview() {
  const [assessment, setAssessment] = useState<Assessment>(initialAssessment);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setAssessment(loadAssessment() ?? structuredClone(initialAssessment)), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const report = generateReport(assessment);
  const copy = async () => { await navigator.clipboard.writeText(report); setCopied(true); };
  return <main><header className="hero compact"><div><span className="eyebrow">Generated deliverable</span><h1>Roadmap report preview</h1><p>Markdown generated deterministically from the current structured assessment.</p></div><div className="header-actions"><Link className="secondary link-control" href="/">Back to interview</Link><button onClick={copy}>{copied ? "Copied" : "Copy Markdown"}</button></div></header>
    <article className="report-preview"><pre>{report}</pre></article></main>;
}
