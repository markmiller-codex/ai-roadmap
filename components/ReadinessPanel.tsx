import { calculateReadiness } from "@/lib/readiness";
import type { Assessment } from "@/types/assessment";

export function ReadinessPanel({ assessment }: { assessment: Assessment }) {
  const readiness = calculateReadiness(assessment);
  return <section className="panel">
    <div className="panel-title"><h2>Report readiness</h2><strong>{readiness.percent}%</strong></div>
    <div className="progress"><span style={{ width: `${readiness.percent}%` }} /></div>
    <p className="muted">Calibration: {readiness.calibrationComplete ? "complete" : "needed"} · Methodology coverage: {readiness.methodologyPercent}% · Expected workflows reviewed: {readiness.reviewedWorkflowCount}/{readiness.expectedWorkflowCount} · Material workflows scoped: {readiness.scopedMaterialWorkflowCount}/{readiness.materialWorkflowCount}</p>
    <div className="checklist">{readiness.sections.map((section) => <div className="check" key={section.key}><span>{section.label} ({Math.round(section.weight * 100)}%)</span><span className={section.complete ? "done" : "missing"}>{section.complete ? "Complete" : "Missing"}</span></div>)}</div>
  </section>;
}
