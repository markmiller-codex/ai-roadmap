import assert from "node:assert/strict";
import test from "node:test";
import { analyzeWebsite } from "../lib/website-analysis.ts";
import { findIndustryBenchmark } from "../lib/industry-benchmarks.ts";

test("website analysis infers accounting services without inventing operating metrics",()=>{
  const analysis=analyzeWebsite([{url:"https://example-cpa.com/",title:"Example CPA | Accounting and Advisory",text:"Example CPA provides tax, audit, bookkeeping and wealth management services for individuals and small businesses. Meet our managing partner. We use QuickBooks and Microsoft 365."}]);
  assert.equal(analysis.industry,"CPA/accounting firms");
  assert.ok(analysis.services.includes("tax"));
  assert.ok(analysis.customerSegments.includes("small businesses"));
  assert.ok(analysis.technologyMentioned.includes("QuickBooks"));
});

test("all requested benchmark industries are available",()=>{
  for (const industry of ["restaurant","CPA firm","law firm","staffing","professional services","manufacturing","construction contractor"]) {
    const benchmark=findIndustryBenchmark(industry); assert.ok(benchmark,industry); assert.ok(benchmark.commonWorkflows.length); assert.ok(benchmark.aiOpportunityCandidates.length);
  }
});
