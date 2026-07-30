"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { initialAssessment } from "@/lib/initial-state";
import { generateReport } from "@/lib/report";
import { loadAssessment } from "@/lib/storage";
import type { Assessment } from "@/types/assessment";

const cells = (line: string) => line.split("|").slice(1, -1).map((cell) => cell.trim());
const isDivider = (line: string) => /^\|[\s:|-]+\|$/.test(line);

function renderLines(lines: string[], sectionKey: string) {
  const content: ReactNode[] = []; let index = 0;
  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) { index += 1; continue; }
    if (line.startsWith("### ")) { content.push(<h3 key={`${sectionKey}-h3-${index}`}>{line.slice(4)}</h3>); index += 1; continue; }
    if (line.startsWith("**") && line.endsWith("**")) { content.push(<p className="report-callout" key={`${sectionKey}-strong-${index}`}>{line.slice(2, -2)}</p>); index += 1; continue; }
    if (line.startsWith("| ") && index + 1 < lines.length && isDivider(lines[index + 1].trim())) {
      const headers = cells(line); const rows: string[][] = []; index += 2;
      while (index < lines.length && lines[index].trim().startsWith("| ")) { rows.push(cells(lines[index].trim())); index += 1; }
      content.push(<div className="report-table-wrap" key={`${sectionKey}-table-${index}`}><table><thead><tr>{headers.map((header, cellIndex) => <th key={cellIndex}>{header}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>);
      continue;
    }
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("- ")) { items.push(lines[index].trim().slice(2)); index += 1; }
      content.push(<ul key={`${sectionKey}-list-${index}`}>{items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul>); continue;
    }
    const paragraph: string[] = [];
    while (index < lines.length) {
      const candidate = lines[index].trim();
      if (!candidate || candidate.startsWith("### ") || candidate.startsWith("- ") || candidate.startsWith("| ")) break;
      paragraph.push(candidate); index += 1;
    }
    content.push(<p key={`${sectionKey}-p-${index}`}>{paragraph.join(" ").replaceAll("**", "")}</p>);
  }
  return content;
}

function ReportDocument({ report }: { report: string }) {
  const sections = report.split(/\n(?=## )/);
  return <div className="report-document">{sections.map((section, sectionIndex) => {
    const lines = section.split("\n"); const first = lines[0].trim();
    if (sectionIndex === 0) return <Fragment key="title">{lines.filter(Boolean).map((line, index) => line.startsWith("# ") ? <h1 key={index}>{line.slice(2)}</h1> : <p className="report-company" key={index}>{line}</p>)}</Fragment>;
    return <section key={first}><h2>{first.replace(/^## /, "")}</h2>{renderLines(lines.slice(1), `section-${sectionIndex}`)}</section>;
  })}</div>;
}

export function ReportPreview() {
  const [assessment, setAssessment] = useState<Assessment>(initialAssessment);
  const [copied, setCopied] = useState(false);
  const [printAttempted, setPrintAttempted] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setAssessment(loadAssessment() ?? structuredClone(initialAssessment)), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const report = generateReport(assessment);
  const copy = async () => { await navigator.clipboard.writeText(report); setCopied(true); };
  const print = () => { setPrintAttempted(true); window.print(); };
  return <main className="report-shell"><header className="hero compact no-print"><div><span className="eyebrow">Generated deliverable</span><h1>Roadmap report preview</h1><p>Review the generated roadmap, then print it or save it as a PDF.</p></div><div className="header-actions"><Link className="secondary link-control" href="/">Back to interview</Link><button onClick={copy}>{copied ? "Copied" : "Copy Markdown"}</button><button className="print-button" onClick={print}>Print Report</button></div></header>
    <article className="report-preview" aria-label="AI Opportunity Roadmap Report">{printAttempted && <p className="print-fallback no-print" role="status">No print dialog? The embedded Codex browser does not support system print dialogs. Open this same URL in Chrome, Edge, Firefox, or Safari and click <strong>Print Report</strong>, or press <strong>Ctrl+P</strong>.</p>}<ReportDocument report={report} /></article></main>;
}
