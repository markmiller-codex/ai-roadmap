import assert from "node:assert/strict";
import test from "node:test";
import { extractCapturedFacts } from "../lib/evidence.ts";

test("captures Burke and Concentric financial facts with labels and periods", () => {
  const facts=extractCapturedFacts(`2025 revenue was $6.5 million
$5.0 million from Burke CPA operations
$1.5 million from Concentric Wealth Management
2024 revenue was $6.0 million
2025 profit after partner employee compensation was $1.0 million`);
  assert.equal(facts.length,5);
  assert.deepEqual(facts.map((fact)=>[fact.label,fact.value,fact.unit,fact.timePeriod,fact.businessArea]),[
    ["Total revenue",6500000,"USD","2025","Finance"],
    ["Revenue from Burke CPA operations",5000000,"USD","2025","Burke CPA Operations"],
    ["Revenue from Concentric Wealth Management",1500000,"USD","2025","Concentric Wealth Management"],
    ["Total revenue",6000000,"USD","2024","Finance"],
    ["Profit after partner employee compensation",1000000,"USD","2025","Finance"],
  ]);
  assert.ok(facts.every((fact)=>fact.confidence==="exact" && fact.verificationSources.includes("User interview") && fact.relatedFields.includes("operating_metrics") && !fact.needsClarification));
});

test("captures engagement-letter volume, correction rate, and administrative effort as contextual ranges", () => {
  const facts=extractCapturedFacts(`400–700 engagement letters or renewals
15%–25% required correction or repeated follow-up for engagement letters
40–80 additional administrative hours for engagement-letter follow-up`);
  assert.equal(facts.length,3);
  assert.deepEqual(facts.map((fact)=>[fact.label,fact.value,fact.unit,fact.confidence]),[
    ["Engagement letters or renewals",{min:400,max:700},"engagement letters","range"],
    ["Engagement letters requiring correction or repeated follow-up",{min:15,max:25},"percent","range"],
    ["Additional administrative effort",{min:40,max:80},"hours","range"],
  ]);
  assert.ok(facts.every((fact)=>fact.businessArea!=="Unclear" && fact.relatedFields.length>1 && !fact.needsClarification));
});
