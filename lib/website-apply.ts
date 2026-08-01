import type { Assessment, CapturedFact, FactValue } from "@/types/assessment";
import type { WebsiteAnalysis } from "./website-analysis";
import { mergeCapturedFacts } from "./evidence";

const id=()=>typeof crypto!=="undefined"&&"randomUUID" in crypto?crypto.randomUUID():`website-${Date.now()}-${Math.random().toString(36).slice(2)}`;
function fact(label:string,value:FactValue,relatedFields:string[],sourceUrl:string):CapturedFact { return {id:id(),label,value,unit:"text",timePeriod:"Current website",businessArea:"Company profile",sourceType:"website",sourceUrl,confidence:"inferred",verificationSources:[sourceUrl],relatedFields,createdFromUserAnswer:"Public website analysis",createdAt:new Date().toISOString(),needsConfirmation:true,confirmedByUser:false}; }
const userHas=(a:Assessment,field:string)=>a.capturedFacts.some((f)=>f.sourceType==="user_confirmed"&&f.relatedFields.includes(field));
export function applyWebsiteAnalysis(assessment:Assessment,analysis:WebsiteAnalysis,inputUrl:string) {
  const next=structuredClone(assessment); const source=analysis.sourceUrls[0] || inputUrl; const facts:CapturedFact[]=[
    { ...fact("Company website",inputUrl,["company_profile.website_url"],source),sourceType:"user_confirmed",confidence:"exact",needsConfirmation:false,confirmedByUser:true,createdFromUserAnswer:inputUrl },
    ...(analysis.companyName?[fact("Company name",analysis.companyName,["company_profile.company_name"],source)]:[]),
    ...(analysis.industry?[fact("Industry",analysis.industry,["company_profile.industry"],source)]:[]),
    ...(analysis.businessDescription?[fact("Business description",analysis.businessDescription,["company_profile.operating_model"],source)]:[]),
    ...analysis.services.map((v)=>fact("Service or product",v,["company_profile.revenue_sources"],source)),
    ...analysis.customerSegments.map((v)=>fact("Customer segment",v,["company_profile.customer_types"],source)),
    ...analysis.likelyBusinessFunctions.map((v)=>fact("Likely business function",v,["business_functions"],source)),
    ...analysis.likelyWorkflows.map((v)=>fact("Likely workflow",v,["workflows"],source)),
    ...analysis.technologyMentioned.map((v)=>fact("Technology mentioned",v,["technology_stack"],source)),
    ...analysis.complianceConstraints.map((v)=>fact("Compliance constraint",v,["governance_profile.regulated_constraints"],source)),
    ...analysis.revenueModelClues.map((v)=>fact("Revenue model clue",v,["company_profile.revenue_sources"],source)),
    ...analysis.hiringSignals.map((v)=>fact("Hiring signal",v,["role_groups"],source)),
    ...analysis.serviceDeliveryModel.map((v)=>fact("Service delivery model",v,["company_profile.operating_model"],source)),
    ...analysis.differentiators.map((v)=>fact("Marketing positioning or differentiator",v,["company_profile.current_business_pressures"],source)),
  ];
  next.company_profile.website_url=inputUrl;
  if (!next.company_profile.company_name&&!userHas(next,"company_profile.company_name")) next.company_profile.company_name=analysis.companyName;
  if (!next.company_profile.industry&&!userHas(next,"company_profile.industry")) next.company_profile.industry=analysis.industry;
  if (!next.company_profile.operating_model&&!userHas(next,"company_profile.operating_model")) next.company_profile.operating_model=analysis.businessDescription;
  if (!next.company_profile.customer_types.length) next.company_profile.customer_types=analysis.customerSegments;
  if (!next.company_profile.revenue_sources.length) next.company_profile.revenue_sources=[...analysis.services,...analysis.revenueModelClues];
  next.capturedFacts=mergeCapturedFacts(next.capturedFacts,facts); next.updated_at=new Date().toISOString(); return {assessment:next,facts};
}

export function confirmWebsiteFacts(assessment:Assessment,accept:boolean) { const next=structuredClone(assessment); next.capturedFacts=next.capturedFacts.map((fact)=>fact.sourceType==="website"&&fact.needsConfirmation?{...fact,needsConfirmation:false,confirmedByUser:accept,confidence:accept?"inferred":fact.confidence}:fact); next.updated_at=new Date().toISOString(); return next; }
