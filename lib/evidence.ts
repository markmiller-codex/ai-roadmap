import type { Assessment, CapturedFact, FactConfidence, FactValue } from "@/types/assessment";

const title = (value: string) => value.trim().replace(/^[-–—:\s]+|[-–—:\s]+$/g, "").replace(/\s+/g, " ").replace(/^./, (letter) => letter.toUpperCase());
const numeric = (value: string) => Number(value.replace(/,/g, ""));
const scaledMoney = (amount: string, scale?: string) => numeric(amount) * (/million|^m$/i.test(scale ?? "") ? 1_000_000 : /thousand|^k$/i.test(scale ?? "") ? 1_000 : 1);
const factId = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `fact-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
const valueKey = (value: FactValue) => typeof value === "object" ? `${value.min}:${value.max}` : String(value);

function workflowFor(answer: string, assessment?: Assessment) {
  const lower=answer.toLowerCase();
  return assessment?.workflows.find((workflow)=>lower.includes(workflow.workflow_name.toLowerCase()) || workflow.workflow_name.toLowerCase().split(/\s+/).filter((word)=>word.length>5).some((word)=>lower.includes(word)))?.workflow_name;
}
function context(answer: string, unit: string, assessment?: Assessment) {
  const lower=answer.toLowerCase(); const workflowId=workflowFor(answer,assessment);
  const businessArea=/concentric|wealth management/i.test(answer) ? "Concentric Wealth Management" : /burke\s*(cpa)?/i.test(answer) ? "Burke CPA Operations" : /revenue|profit|financial|dollar|\$/i.test(answer) ? "Finance" : /engagement letter|renewal/i.test(answer) ? "Client Engagement" : /admin|administrative/i.test(answer) ? "Administration" : workflowId ? assessment?.workflows.find((workflow)=>workflow.workflow_name===workflowId)?.function_name ?? "Operations" : "Unclear";
  let label=""; const relatedFields=["operating_metrics"];
  if (/from\s+concentric/i.test(lower)) label="Revenue from Concentric Wealth Management";
  else if (/from\s+burke/i.test(lower)) label="Revenue from Burke CPA operations";
  else if (/revenue/i.test(lower)) { label="Total revenue"; relatedFields.push("company_profile.annual_revenue"); }
  else if (/profit/i.test(lower)) label=/partner.*compensation/i.test(lower) ? "Profit after partner employee compensation" : "Profit";
  else if (/engagement letter|renewal/i.test(lower) && /correct|follow-up|follow up|repeat/i.test(lower)) { label="Engagement letters requiring correction or repeated follow-up"; relatedFields.push("workflows.error_or_rework_level","workflows.baseline_metrics"); }
  else if (/engagement letter|renewal/i.test(lower)) { label="Engagement letters or renewals"; relatedFields.push("workflows.monthly_volume","workflows.frequency"); }
  else if (/administrative|admin/i.test(lower) && /hour/i.test(unit)) { label="Additional administrative effort"; relatedFields.push("workflows.weekly_time_cost_hours","workflows.baseline_metrics"); }
  else if (/employee|staff|headcount/i.test(lower)) { label="Employee count"; relatedFields.push("company_profile.employee_count"); }
  else if (/location|office/i.test(lower)) { label="Location count"; relatedFields.push("company_profile.locations"); }
  return { label:label || `Unlabeled ${unit} value`, businessArea, workflowId, relatedFields:[...new Set(relatedFields)], needsClarification:!label };
}
function confidence(answer: string, isRange: boolean): FactConfidence { return isRange ? "range" : /about|approximately|roughly|around|estimate|estimated/i.test(answer) ? "estimate" : "exact"; }
function makeFact(answer: string, value: FactValue, unit: string, timePeriod: string, assessment?: Assessment): CapturedFact {
  const classified=context(answer,unit,assessment);
  return { id:factId(), label:classified.label, value, unit, timePeriod, businessArea:classified.businessArea, workflowId:classified.workflowId, confidence:classified.needsClarification ? "unknown_verifiable" : confidence(answer,typeof value==="object"), verificationSources:["User interview"], relatedFields:classified.relatedFields, createdFromUserAnswer:answer.trim(), createdAt:new Date().toISOString(), needsClarification:classified.needsClarification };
}

export function extractCapturedFacts(answer: string, assessment?: Assessment): CapturedFact[] {
  const facts: CapturedFact[]=[]; let activePeriod="Not specified";
  const statements=answer.split(/\n|;/).map((item)=>item.replace(/^[-*]\s*/,"").trim()).filter(Boolean);
  for (const statement of statements) {
    const year=statement.match(/\b(20\d{2}|19\d{2})\b/)?.[1]; if (year) activePeriod=year;
    const period=year ?? activePeriod; let matched=false;
    const moneyMatches=[...statement.matchAll(/\$\s*([\d,.]+)\s*(million|m|thousand|k)?/gi)];
    for (const match of moneyMatches) { facts.push(makeFact(statement,scaledMoney(match[1],match[2]),"USD",period,assessment)); matched=true; }
    if (matched) continue;
    const range=statement.match(/([\d,.]+)\s*(?:%|percent)?\s*[–—-]\s*([\d,.]+)\s*(%|percent|hours?|hrs?|engagement letters?|renewals?)?/i);
    if (range) { const unit=/%|percent/i.test(statement) ? "percent" : /hour|hr/i.test(range[3] ?? statement) ? "hours" : /engagement letter/i.test(statement) ? "engagement letters" : /renewal/i.test(statement) ? "renewals" : "count"; facts.push(makeFact(statement,{min:numeric(range[1]),max:numeric(range[2])},unit,period,assessment)); continue; }
    const percent=statement.match(/([\d,.]+)\s*(%|percent)/i); if (percent) { facts.push(makeFact(statement,numeric(percent[1]),"percent",period,assessment)); continue; }
    const hours=statement.match(/([\d,.]+)\s*(hours?|hrs?)/i); if (hours) { facts.push(makeFact(statement,numeric(hours[1]),"hours",period,assessment)); continue; }
    const count=statement.match(/([\d,.]+)\s*(engagement letters?|renewals?|employees?|staff|locations?|offices?)/i); if (count) facts.push(makeFact(statement,numeric(count[1]),count[2].toLowerCase(),period,assessment));
  }
  return facts;
}
export function mergeCapturedFacts(existing: CapturedFact[], incoming: CapturedFact[]) {
  const merged=[...existing];
  for (const fact of incoming) { const evidenceKey=`${fact.timePeriod}|${fact.businessArea}|${fact.workflowId ?? ""}|${fact.unit}|${valueKey(fact.value)}|${fact.createdFromUserAnswer}`.toLowerCase(); const index=merged.findIndex((item)=>`${item.timePeriod}|${item.businessArea}|${item.workflowId ?? ""}|${item.unit}|${valueKey(item.value)}|${item.createdFromUserAnswer}`.toLowerCase()===evidenceKey); if (index>=0) { const current=merged[index]; const preferIncoming=Boolean(current.needsClarification && !fact.needsClarification); merged[index]={...(preferIncoming ? {...current,...fact} : {...fact,...current}),id:current.id,createdAt:current.createdAt,relatedFields:[...new Set([...current.relatedFields,...fact.relatedFields])],verificationSources:[...new Set([...current.verificationSources,...fact.verificationSources])]}; } else merged.push(fact); }
  return merged;
}
export function applyFactsToStructuredState(assessment: Assessment, facts: CapturedFact[]) {
  for (const fact of facts) {
    if (fact.needsClarification) continue;
    if (fact.label === "Total revenue" && typeof fact.value === "number") { const currentYear=Number(fact.timePeriod); const existingYears=(assessment.capturedFacts ?? []).filter((item)=>item.label==="Total revenue" && typeof item.value==="number").map((item)=>Number(item.timePeriod)).filter(Number.isFinite); if (!existingYears.length || currentYear===Math.max(...existingYears)) assessment.company_profile.annual_revenue=fact.value; }
    if (fact.label === "Employee count" && typeof fact.value === "number") assessment.company_profile.employee_count=fact.value;
    if (fact.label === "Location count" && typeof fact.value === "number") assessment.company_profile.locations=fact.value;
    if (fact.relatedFields.includes("operating_metrics") && typeof fact.value === "number" && !assessment.operating_metrics.some((metric)=>metric.metric_name===fact.label && metric.period===fact.timePeriod && metric.business_context===fact.businessArea)) assessment.operating_metrics.push({metric_name:fact.label,value:fact.value,unit:fact.unit,period:fact.timePeriod,source:fact.verificationSources.join(", "),business_context:fact.businessArea});
  }
}
export const factSatisfiesField = (assessment: Assessment, field: string) => (assessment.capturedFacts ?? []).some((fact)=>!fact.needsClarification && fact.relatedFields.some((related)=>related===field || related.startsWith(field) || field.startsWith(related)));
export const factSatisfiesWorkflowField = (assessment: Assessment, workflowId: string, field: string) => (assessment.capturedFacts ?? []).some((fact)=>!fact.needsClarification && fact.workflowId?.toLowerCase()===workflowId.toLowerCase() && fact.relatedFields.some((related)=>related===field || related.endsWith(`.${field}`)));
export function clarifyCapturedFact(assessment: Assessment, factIdValue: string, clarification: string) {
  const fact=assessment.capturedFacts.find((item)=>item.id===factIdValue); if (!fact) return;
  const classified=context(clarification,fact.unit,assessment); fact.label=classified.needsClarification ? title(clarification) : classified.label; fact.businessArea=classified.businessArea === "Unclear" ? fact.businessArea : classified.businessArea; fact.workflowId=classified.workflowId ?? fact.workflowId; fact.relatedFields=[...new Set([...fact.relatedFields,...classified.relatedFields])]; fact.needsClarification=false; if (fact.confidence==="unknown_verifiable") fact.confidence=typeof fact.value==="object" ? "range" : "estimate";
}
