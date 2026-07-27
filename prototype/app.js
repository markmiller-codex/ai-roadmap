const initialState = {
  company_profile: {
    company_name: "",
    industry: "",
    locations: null,
    employee_count: null,
    annual_revenue: null,
    customer_types: [],
    revenue_sources: [],
    operating_model: "",
    management_structure: "",
    strategic_priorities: [],
    current_business_pressures: []
  },
  business_functions: [],
  role_groups: [],
  workflows: [],
  technology_stack: [],
  data_assets: [],
  pain_points: [],
  ai_readiness: {
    current_ai_use: "",
    leadership_support: null,
    employee_readiness: null,
    data_availability: null,
    data_organization: null,
    process_documentation: null,
    governance_maturity: null,
    implementation_capacity: null,
    data_sensitivity_concerns: [],
    budget_appetite: "",
    timeline_expectation: ""
  },
  governance_profile: {
    sensitive_data_types: [],
    requires_human_approval: [],
    regulated_constraints: [],
    brand_review_needs: true,
    employee_decision_controls: true
  },
  opportunities: [],
  answers: []
};

let state = loadState() || structuredClone(initialState);
let currentQuestionId = localStorage.getItem("currentQuestionId") || "orientation";

const questions = {
  orientation: {
    title: "Start with the business in plain English",
    help: "Describe what the company sells, who it serves, how many employees and locations it has, and what feels hardest to manage right now.",
    type: "textarea",
    field: "orientation",
    next: "companyBasics"
  },
  companyBasics: {
    title: "Confirm the basic company facts",
    help: "Enter company name, industry, locations, employees, and annual revenue if known. Use one line per item.",
    type: "textarea",
    field: "company_basics",
    next: "revenueSources"
  },
  revenueSources: {
    title: "Where does revenue come from?",
    help: "List revenue sources, customer types, and the channels through which customers buy from you.",
    type: "textarea",
    field: "revenue_sources",
    next: "strategicPriorities"
  },
  strategicPriorities: {
    title: "What should AI improve first?",
    help: "List the top 3-5 business outcomes management cares about most: growth, labor efficiency, customer experience, cost reduction, reporting, quality, speed, hiring, etc.",
    type: "textarea",
    field: "strategic_priorities",
    next: "functionInventory"
  },
  functionInventory: {
    title: "Map the business functions",
    help: "List departments/functions, approximate headcount, pain level from 1-5, and systems used. Example: Sales — 4 people — pain 3 — HubSpot.",
    type: "textarea",
    field: "function_inventory",
    next: "roleGroups"
  },
  roleGroups: {
    title: "Identify the role groups",
    help: "List major role groups, headcount, hiring difficulty, turnover concerns, and where people spend too much time.",
    type: "textarea",
    field: "role_groups",
    next: "workflowDiscovery"
  },
  workflowDiscovery: {
    title: "Describe the highest-friction recurring workflows",
    help: "For each workflow: name, owner, volume/frequency, time required, systems used, bottlenecks, mistakes/rework, customer impact, and financial impact.",
    type: "textarea",
    field: "workflows",
    next: "technologyStack"
  },
  technologyStack: {
    title: "List the technology stack",
    help: "List the systems used for sales, marketing, operations, finance, HR, scheduling, payroll, inventory, customer service, project work, documents, and reporting.",
    type: "textarea",
    field: "technology_stack",
    next: "dataAssets"
  },
  dataAssets: {
    title: "What data and documents are available?",
    help: "List reports, exports, customer lists, SOPs, job descriptions, invoices, proposals, policies, tickets, reviews, emails, spreadsheets, or other data/documents used to run the business.",
    type: "textarea",
    field: "data_assets",
    next: "aiReadiness"
  },
  aiReadiness: {
    title: "Assess AI readiness",
    help: "Describe current AI use, leadership support, employee openness, data quality, process documentation, budget appetite, and implementation capacity.",
    type: "textarea",
    field: "ai_readiness",
    next: "governance"
  },
  governance: {
    title: "Identify sensitive data and decision controls",
    help: "List data AI should handle carefully: employee data, customer data, financials, medical/legal/compliance info, trade secrets, pricing, contracts, confidential client data. Also list what requires human approval.",
    type: "textarea",
    field: "governance",
    next: "opportunityReview"
  },
  opportunityReview: {
    title: "Name any AI opportunities management already suspects",
    help: "List possible AI uses already on your mind. The app will also infer opportunities from workflows and pain points.",
    type: "textarea",
    field: "suspected_opportunities",
    next: "complete"
  },
  complete: {
    title: "Discovery pass complete",
    help: "Generate the report, review the opportunity matrix, or reset the demo.",
    type: "complete",
    field: "complete",
    next: "complete"
  }
};

function saveState() {
  localStorage.setItem("aiRoadmapState", JSON.stringify(state));
  localStorage.setItem("currentQuestionId", currentQuestionId);
}

function loadState() {
  const raw = localStorage.getItem("aiRoadmapState");
  return raw ? JSON.parse(raw) : null;
}

function resetState() {
  state = structuredClone(initialState);
  currentQuestionId = "orientation";
  saveState();
  render();
}

function renderQuestion() {
  const q = questions[currentQuestionId] || questions.orientation;
  const card = document.getElementById("questionCard");
  document.getElementById("questionCounter").textContent = currentQuestionId === "complete" ? "Ready" : `Question: ${currentQuestionId}`;

  if (q.type === "complete") {
    card.innerHTML = `<h3>${q.title}</h3><p>${q.help}</p>`;
    return;
  }

  const existing = state.answers.find(a => a.question_id === currentQuestionId)?.answer || "";
  card.innerHTML = `
    <h3>${q.title}</h3>
    <p>${q.help}</p>
    <textarea id="answerInput">${escapeHtml(existing)}</textarea>
  `;
}

function processAnswer(questionId, answer) {
  state.answers = state.answers.filter(a => a.question_id !== questionId);
  state.answers.push({ question_id: questionId, field: questions[questionId].field, answer, saved_at: new Date().toISOString() });

  switch (questionId) {
    case "orientation":
      extractOrientation(answer);
      break;
    case "companyBasics":
      extractCompanyBasics(answer);
      break;
    case "revenueSources":
      state.company_profile.revenue_sources = splitLines(answer);
      state.company_profile.customer_types = extractAfterKeywords(answer, ["customer", "client", "guest", "buyer"]);
      break;
    case "strategicPriorities":
      state.company_profile.strategic_priorities = splitLines(answer);
      state.company_profile.current_business_pressures = splitLines(answer);
      break;
    case "functionInventory":
      state.business_functions = parseFunctions(answer);
      break;
    case "roleGroups":
      state.role_groups = parseRoleGroups(answer);
      break;
    case "workflowDiscovery":
      state.workflows = parseWorkflows(answer);
      state.pain_points = inferPainPoints(state.workflows);
      break;
    case "technologyStack":
      state.technology_stack = parseTech(answer);
      break;
    case "dataAssets":
      state.data_assets = parseDataAssets(answer);
      break;
    case "aiReadiness":
      state.ai_readiness.current_ai_use = answer;
      state.ai_readiness.leadership_support = inferScore(answer, ["leadership", "owner", "management", "sponsor"]);
      state.ai_readiness.employee_readiness = inferScore(answer, ["employee", "staff", "manager"]);
      state.ai_readiness.data_availability = inferScore(answer, ["data", "report", "export"]);
      state.ai_readiness.process_documentation = inferScore(answer, ["SOP", "process", "document", "manual", "checklist"]);
      state.ai_readiness.governance_maturity = answer.toLowerCase().includes("policy") ? 3 : 1;
      state.ai_readiness.implementation_capacity = inferScore(answer, ["capacity", "time", "budget", "project"]);
      break;
    case "governance":
      state.governance_profile.sensitive_data_types = splitLines(answer);
      state.governance_profile.requires_human_approval = ["employees", "customers", "vendors", "financials", "public communications"];
      break;
    case "opportunityReview":
      addSuspectedOpportunities(answer);
      break;
  }

  generateInferredOpportunities();
  scoreOpportunities();
}

function extractOrientation(answer) {
  const lower = answer.toLowerCase();
  const employeeMatch = answer.match(/(\d+)\s+(employees|staff|people|team members)/i);
  if (employeeMatch) state.company_profile.employee_count = Number(employeeMatch[1]);

  const locationMatch = answer.match(/(\d+)\s+(locations|offices|restaurants|stores|branches)/i);
  if (locationMatch) state.company_profile.locations = Number(locationMatch[1]);

  if (lower.includes("restaurant")) state.company_profile.industry = "Restaurant / Hospitality";
  else if (lower.includes("law firm")) state.company_profile.industry = "Legal Services";
  else if (lower.includes("cpa") || lower.includes("accounting")) state.company_profile.industry = "Accounting / CPA Firm";
  else if (lower.includes("staffing") || lower.includes("recruiting")) state.company_profile.industry = "Staffing / Recruiting";
  else if (lower.includes("manufactur")) state.company_profile.industry = "Manufacturing";

  state.company_profile.operating_model = answer;
}

function extractCompanyBasics(answer) {
  const lines = splitLines(answer);
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes("name") || lower.includes("company")) {
      state.company_profile.company_name = line.split(":").slice(1).join(":").trim() || line.trim();
    }
    if (lower.includes("industry")) {
      state.company_profile.industry = line.split(":").slice(1).join(":").trim() || state.company_profile.industry;
    }
    const emp = line.match(/(\d+)\s+(employees|staff|people)/i);
    if (emp) state.company_profile.employee_count = Number(emp[1]);
    const loc = line.match(/(\d+)\s+(locations|offices|restaurants|stores|branches)/i);
    if (loc) state.company_profile.locations = Number(loc[1]);
    const rev = line.match(/\$?([\d,.]+)\s*(million|m|k|thousand)?/i);
    if ((lower.includes("revenue") || lower.includes("sales")) && rev) {
      let n = Number(rev[1].replace(/,/g, ""));
      if (rev[2] && ["million", "m"].includes(rev[2].toLowerCase())) n *= 1000000;
      if (rev[2] && ["k", "thousand"].includes(rev[2].toLowerCase())) n *= 1000;
      state.company_profile.annual_revenue = n;
    }
  }
}

function splitLines(text) {
  return text.split(/\n|;/).map(s => s.trim()).filter(Boolean);
}

function extractAfterKeywords(text, keywords) {
  const lines = splitLines(text);
  return lines.filter(line => keywords.some(k => line.toLowerCase().includes(k))).slice(0, 10);
}

function parseFunctions(text) {
  return splitLines(text).map(line => {
    const headcount = line.match(/(\d+)\s+(people|employees|staff|person)/i);
    const pain = line.match(/pain\s*[:\-]?\s*(\d)/i);
    const name = line.split(/—|-|:/)[0].trim();
    return {
      function_name: name || line.slice(0, 40),
      employee_count: headcount ? Number(headcount[1]) : null,
      manager_owner: "",
      importance: 3,
      pain_level: pain ? Number(pain[1]) : inferPain(line),
      systems_used: [],
      notes: line
    };
  });
}

function parseRoleGroups(text) {
  return splitLines(text).map(line => {
    const headcount = line.match(/(\d+)\s+(people|employees|staff|person)/i);
    return {
      role_name: line.split(/—|-|:/)[0].trim(),
      function_name: "",
      headcount: headcount ? Number(headcount[1]) : null,
      responsibilities: [],
      pain_points: [line],
      turnover_level: line.toLowerCase().includes("turnover") ? "mentioned" : "",
      hiring_difficulty: inferScore(line, ["hard", "difficult", "shortage", "turnover"]),
      ai_adoption_likelihood: 3
    };
  });
}

function parseWorkflows(text) {
  return splitLines(text).map(line => {
    const volume = line.match(/(\d+)\s*(per month|monthly|\/month|per week|weekly|\/week|per day|daily|\/day)/i);
    const minutes = line.match(/(\d+)\s*(minutes|min)/i);
    const hours = line.match(/(\d+)\s*(hours|hrs)/i);
    const name = line.split(/—|-|:/)[0].trim();
    return {
      workflow_name: name || line.slice(0, 50),
      function_name: inferFunction(line),
      owner: "",
      trigger: "",
      steps: [],
      inputs: [],
      outputs: [],
      systems_used: [],
      documents_used: [],
      people_involved: [],
      frequency: volume ? volume[2] : "",
      monthly_volume: volume ? normalizeMonthlyVolume(Number(volume[1]), volume[2]) : null,
      time_per_instance_minutes: minutes ? Number(minutes[1]) : (hours ? Number(hours[1]) * 60 : null),
      weekly_time_cost_hours: null,
      error_or_rework_level: inferScore(line, ["mistake", "error", "rework", "miss", "late"]),
      bottlenecks: [line],
      decision_points: [],
      customer_impact: inferScore(line, ["customer", "guest", "client", "response", "review"]),
      financial_impact: inferScore(line, ["revenue", "cost", "labor", "invoice", "price", "margin"]),
      data_sensitivity: inferScore(line, ["payroll", "employee", "medical", "legal", "credit", "confidential"]),
      process_maturity: inferScore(line, ["documented", "SOP", "standard", "checklist"]),
      data_readiness: inferScore(line, ["system", "report", "export", "spreadsheet", "data"]),
      ai_candidate_notes: line
    };
  });
}

function normalizeMonthlyVolume(n, period) {
  const p = period.toLowerCase();
  if (p.includes("day")) return n * 22;
  if (p.includes("week")) return n * 4.3;
  return n;
}

function parseTech(text) {
  return splitLines(text).map(line => ({
    system_name: line.split(/—|-|:/)[0].trim(),
    vendor: "",
    function_served: inferFunction(line),
    users: "",
    data_stored: [],
    export_capability: line.toLowerCase().includes("api") ? "api" : (line.toLowerCase().includes("csv") || line.toLowerCase().includes("export") ? "csv" : "unknown"),
    integration_capability: line.toLowerCase().includes("integrat") ? "good" : "unknown",
    satisfaction: 3,
    limitations: line.toLowerCase().includes("problem") ? [line] : []
  }));
}

function parseDataAssets(text) {
  return splitLines(text).map(line => ({
    asset_name: line.split(/—|-|:/)[0].trim(),
    source_system: "",
    data_type: inferDataType(line),
    owner: "",
    format: line.toLowerCase().includes("spreadsheet") ? "spreadsheet" : "unknown",
    cleanliness: 3,
    accessibility: inferScore(line, ["export", "available", "spreadsheet", "report"]),
    update_frequency: "",
    sensitivity: inferScore(line, ["employee", "customer", "financial", "payroll", "legal"]),
    ai_usability: inferScore(line, ["clean", "export", "structured", "spreadsheet", "database"])
  }));
}

function inferFunction(line) {
  const l = line.toLowerCase();
  if (l.includes("sales") || l.includes("lead")) return "Sales";
  if (l.includes("marketing") || l.includes("campaign") || l.includes("social")) return "Marketing";
  if (l.includes("customer") || l.includes("guest") || l.includes("client") || l.includes("review")) return "Customer Experience";
  if (l.includes("invoice") || l.includes("account") || l.includes("finance") || l.includes("payroll")) return "Finance/Admin";
  if (l.includes("hiring") || l.includes("applicant") || l.includes("onboard") || l.includes("employee")) return "HR/Recruiting";
  if (l.includes("inventory") || l.includes("schedule") || l.includes("production") || l.includes("operations")) return "Operations";
  return "General Management";
}

function inferDataType(line) {
  const l = line.toLowerCase();
  if (l.includes("invoice")) return "invoice";
  if (l.includes("review")) return "review/feedback";
  if (l.includes("customer") || l.includes("guest") || l.includes("client")) return "customer data";
  if (l.includes("employee") || l.includes("payroll")) return "employee data";
  if (l.includes("SOP".toLowerCase()) || l.includes("policy") || l.includes("manual")) return "knowledge document";
  return "operational data";
}

function inferPain(line) {
  return inferScore(line, ["hard", "slow", "manual", "rework", "late", "inconsistent", "problem", "bottleneck"]);
}

function inferScore(text, keywords) {
  const l = text.toLowerCase();
  let score = 2;
  for (const k of keywords) if (l.includes(k.toLowerCase())) score++;
  if (l.includes("high") || l.includes("major") || l.includes("critical") || l.includes("very")) score++;
  return Math.max(1, Math.min(5, score));
}

function inferPainPoints(workflows) {
  return workflows.map(w => ({
    pain_point: w.bottlenecks[0] || w.workflow_name,
    function_name: w.function_name,
    workflow_name: w.workflow_name,
    who_feels_it: [w.owner || "Management"],
    frequency: w.frequency,
    severity: Math.max(w.error_or_rework_level, w.customer_impact, w.financial_impact),
    time_cost: w.time_per_instance_minutes ? `${w.time_per_instance_minutes} minutes per instance` : "",
    dollar_cost: "",
    customer_impact: w.customer_impact,
    employee_impact: 3,
    current_workaround: "",
    root_cause: ""
  }));
}

function addSuspectedOpportunities(text) {
  for (const line of splitLines(text)) {
    state.opportunities.push({
      opportunity_name: line.split(/—|-|:/)[0].trim(),
      related_workflow: "",
      description: line,
      business_value_score: 4,
      frequency_score: 3,
      repetition_score: 3,
      data_readiness_score: 3,
      adoption_score: 3,
      strategic_fit_score: 4,
      implementation_difficulty_score: 3,
      risk_score: 3,
      total_score: 0,
      complexity: "Moderate",
      recommended_phase: "",
      time_to_pilot: "4-8 weeks",
      success_metrics: ["Time saved", "Quality improved", "Adoption rate"]
    });
  }
}

function generateInferredOpportunities() {
  const existing = new Set(state.opportunities.map(o => o.opportunity_name.toLowerCase()));
  for (const w of state.workflows) {
    const name = suggestOpportunityName(w);
    if (!existing.has(name.toLowerCase())) {
      state.opportunities.push({
        opportunity_name: name,
        related_workflow: w.workflow_name,
        description: `Use AI to improve ${w.workflow_name} by reducing manual effort, increasing consistency, and surfacing decision-ready information.`,
        business_value_score: Math.max(w.customer_impact, w.financial_impact, 3),
        frequency_score: w.monthly_volume && w.monthly_volume > 50 ? 5 : (w.monthly_volume && w.monthly_volume > 10 ? 4 : 3),
        repetition_score: 4,
        data_readiness_score: w.data_readiness || 3,
        adoption_score: 3,
        strategic_fit_score: 4,
        implementation_difficulty_score: w.data_readiness >= 4 ? 2 : 3,
        risk_score: w.data_sensitivity || 2,
        total_score: 0,
        complexity: "",
        recommended_phase: "",
        time_to_pilot: "",
        success_metrics: ["Cycle time reduction", "Manager/admin time saved", "Output consistency"]
      });
    }
  }
}

function suggestOpportunityName(w) {
  const f = (w.function_name || "").toLowerCase();
  const n = w.workflow_name || "Workflow";
  if (f.includes("hr")) return `AI Hiring and Onboarding Assistant`;
  if (f.includes("customer")) return `AI Customer Feedback and Response Intelligence`;
  if (f.includes("marketing")) return `AI Marketing and Retention Assistant`;
  if (f.includes("finance")) return `AI Finance and Invoice Intelligence`;
  if (f.includes("operations")) return `AI Operations Workflow Assistant`;
  return `AI Assistant for ${n}`;
}

function scoreOpportunities() {
  for (const o of state.opportunities) {
    const score =
      2.0 * (o.business_value_score || 3) +
      1.0 * (o.frequency_score || 3) +
      1.0 * (o.repetition_score || 3) +
      1.25 * (o.data_readiness_score || 3) +
      1.25 * (o.adoption_score || 3) +
      1.5 * (o.strategic_fit_score || 3) -
      1.25 * (o.implementation_difficulty_score || 3) -
      1.0 * (o.risk_score || 3);

    o.total_score = Math.round(score * 10) / 10;
    if ((o.implementation_difficulty_score || 3) <= 2 && (o.risk_score || 3) <= 3) {
      o.complexity = "Low";
      o.recommended_phase = "Phase 0/1";
      o.time_to_pilot = "2-4 weeks";
    } else if ((o.implementation_difficulty_score || 3) <= 3) {
      o.complexity = "Moderate";
      o.recommended_phase = "Phase 1/2";
      o.time_to_pilot = "4-10 weeks";
    } else {
      o.complexity = "Higher";
      o.recommended_phase = "Phase 3/4";
      o.time_to_pilot = "3-12 months";
    }
  }
  state.opportunities.sort((a, b) => b.total_score - a.total_score);
}

function calculateReadiness() {
  const c = state.company_profile;
  const sections = {
    company_profile: Boolean(c.company_name && c.industry && c.employee_count && c.locations),
    function_inventory: state.business_functions.length >= 3,
    people_roles: state.role_groups.length >= 2,
    workflow_detail: state.workflows.length >= 3,
    technology_stack: state.technology_stack.length >= 3,
    data_readiness: state.data_assets.length >= 2,
    pain_points: state.pain_points.length >= 2,
    governance_risk: state.governance_profile.sensitive_data_types.length >= 1,
    strategic_priorities: c.strategic_priorities.length >= 2
  };
  const weights = {
    company_profile: 0.10,
    function_inventory: 0.10,
    people_roles: 0.10,
    workflow_detail: 0.25,
    technology_stack: 0.15,
    data_readiness: 0.10,
    pain_points: 0.10,
    governance_risk: 0.05,
    strategic_priorities: 0.05
  };
  let score = 0;
  Object.keys(sections).forEach(k => { if (sections[k]) score += weights[k]; });
  return { score, sections };
}

function renderReadiness() {
  const { score, sections } = calculateReadiness();
  const pct = Math.round(score * 100);
  document.getElementById("readinessPct").textContent = `${pct}%`;
  document.getElementById("readinessBar").style.width = `${pct}%`;

  const checklist = document.getElementById("coverageChecklist");
  checklist.innerHTML = Object.entries(sections).map(([k, ok]) => `
    <div class="check-item">
      <span>${label(k)}</span>
      <span class="badge ${ok ? "ok" : "warn"}">${ok ? "Complete" : "Missing"}</span>
    </div>
  `).join("");
}

function label(k) {
  return k.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function renderState() {
  document.getElementById("statePreview").textContent = JSON.stringify({
    company_profile: state.company_profile,
    business_functions: state.business_functions,
    role_groups: state.role_groups,
    workflows: state.workflows,
    technology_stack: state.technology_stack,
    data_assets: state.data_assets,
    ai_readiness: state.ai_readiness,
    governance_profile: state.governance_profile
  }, null, 2);
}

function renderOpportunities() {
  const el = document.getElementById("opportunityMatrix");
  if (!state.opportunities.length) {
    el.innerHTML = `<p class="muted">Opportunity matrix will populate after workflow discovery.</p>`;
    return;
  }
  el.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Rank</th><th>Opportunity</th><th>Score</th><th>Complexity</th><th>Phase</th><th>Time to Pilot</th>
        </tr>
      </thead>
      <tbody>
        ${state.opportunities.slice(0, 10).map((o, i) => `
          <tr>
            <td>${i + 1}</td>
            <td><strong>${escapeHtml(o.opportunity_name)}</strong><br>${escapeHtml(o.description || "")}</td>
            <td>${o.total_score}</td>
            <td>${o.complexity}</td>
            <td>${o.recommended_phase}</td>
            <td>${o.time_to_pilot}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function generateReport() {
  scoreOpportunities();
  const c = state.company_profile;
  const top = state.opportunities.slice(0, 5);
  const quickWins = state.opportunities.filter(o => o.complexity === "Low").slice(0, 3);
  const readiness = calculateReadiness();
  const readinessScore = Math.round(readiness.score * 100);

  return `# AI Opportunity Roadmap Report
## ${c.company_name || "[Company Name]"}

**Industry:** ${c.industry || "[Industry]"}  
**Locations:** ${c.locations ?? "[Locations]"}  
**Employees:** ${c.employee_count ?? "[Employee Count]"}  
**Annual Revenue:** ${c.annual_revenue ? "$" + c.annual_revenue.toLocaleString() : "[Annual Revenue]"}  
**Report Readiness:** ${readinessScore}%

---

# 1. Executive Summary

${c.company_name || "The company"} operates in the ${c.industry || "specified"} industry with ${c.employee_count ?? "[employee count]"} employees across ${c.locations ?? "[location count]"} location(s). The company generates revenue through ${list(c.revenue_sources)} and serves ${list(c.customer_types)}.

The strongest AI opportunities identified in this assessment are:

${top.map((o, i) => `${i + 1}. **${o.opportunity_name}** — ${o.description}`).join("\n")}

The recommended first implementation wave should focus on ${quickWins.length ? quickWins.map(o => o.opportunity_name).join(", ") : "the highest-scored low-complexity opportunities"}.

---

# 2. Business Profile

| Category | Current Profile |
|---|---|
| Company | ${c.company_name || "[Company Name]"} |
| Industry | ${c.industry || "[Industry]"} |
| Locations | ${c.locations ?? "[Locations]"} |
| Employees | ${c.employee_count ?? "[Employee Count]"} |
| Revenue Sources | ${list(c.revenue_sources)} |
| Customer Types | ${list(c.customer_types)} |
| Operating Model | ${c.operating_model || "[Operating model]"} |
| Management Structure | ${c.management_structure || "[Management structure]"} |

---

# 3. Operating Snapshot

| Area | Current State |
|---|---|
| Business Functions Identified | ${state.business_functions.length} |
| Role Groups Identified | ${state.role_groups.length} |
| Workflows Analyzed | ${state.workflows.length} |
| Technology Systems Identified | ${state.technology_stack.length} |
| Data Assets Identified | ${state.data_assets.length} |
| Pain Points Identified | ${state.pain_points.length} |
| Opportunities Scored | ${state.opportunities.length} |

---

# 4. Current-State AI and Technology Assessment

Current AI use: ${state.ai_readiness.current_ai_use || "[Current AI use not captured]"}

Technology systems identified:

${state.technology_stack.map(t => `- **${t.system_name}** — ${t.function_served}; export capability: ${t.export_capability}; integration capability: ${t.integration_capability}`).join("\n") || "- [Technology stack not captured]"}

---

# 5. Strategic AI Goals

${c.strategic_priorities.map((p, i) => `${i + 1}. ${p}`).join("\n") || "1. [Strategic priorities not captured]"}

---

# 6. AI Opportunity Matrix

| Rank | Opportunity | Score | Complexity | Phase | Time to Pilot |
|---:|---|---:|---|---|---|
${state.opportunities.slice(0, 10).map((o, i) => `| ${i + 1} | ${o.opportunity_name} | ${o.total_score} | ${o.complexity} | ${o.recommended_phase} | ${o.time_to_pilot} |`).join("\n")}

---

# 7. Priority AI Projects

${top.map((o, i) => `## Project ${i + 1}: ${o.opportunity_name}

**Description:** ${o.description}

**Related workflow:** ${o.related_workflow || "General business workflow"}

**Implementation complexity:** ${o.complexity}

**Recommended phase:** ${o.recommended_phase}

**Time to pilot:** ${o.time_to_pilot}

**Success metrics:**
${(o.success_metrics || []).map(m => `- ${m}`).join("\n")}
`).join("\n")}

---

# 8. Recommended Roadmap

## Phase 0: First 30 Days

- Approve AI project sponsor and operating lead.
- Establish AI usage policy and sensitive-data rules.
- Launch the highest-ranked low-complexity management/productivity pilots.
- Build baseline measurements.

## Phase 1: Days 31-90

- Expand quick-win pilots.
- Launch structured opportunity scorecard.
- Build weekly management reporting.
- Confirm which projects advance to operational integration.

## Phase 2: Months 3-6

- Pilot moderate-complexity operational intelligence projects.
- Improve data exports and reporting discipline.
- Expand training and SOP content.

## Phase 3: Months 6-12

- Integrate repeatable data sources.
- Scale successful pilots.
- Add workflow-specific tools or automations.

## Phase 4: Months 12-24

- Pursue predictive, integrated, or custom AI systems where business value has been proven.

---

# 9. Governance Rules

Sensitive data categories identified:

${state.governance_profile.sensitive_data_types.map(s => `- ${s}`).join("\n") || "- [Sensitive data categories not captured]"}

Recommended controls:

1. AI drafts, humans decide.
2. Approved tools only.
3. Sensitive data stays out of unapproved systems.
4. Guest/customer-facing content requires review.
5. Employee-related decisions require human approval.
6. Each pilot must have success metrics.

---

# 10. Pilot Scorecard

| Metric | Baseline | 90-Day Target |
|---|---|---|
| Active AI users | [Baseline] | [Target] |
| Hours saved | [Baseline] | [Target] |
| Cycle time reduction | [Baseline] | [Target] |
| Response speed | [Baseline] | [Target] |
| Quality/consistency improvement | [Baseline] | [Target] |
| Adoption rate | [Baseline] | [Target] |

---

# 11. Final Recommendation

The company should begin with the highest-scored, lowest-complexity opportunities and avoid major custom AI development until early pilots prove adoption, measurable value, and data readiness.

The immediate implementation priority is:

${quickWins.map((o, i) => `${i + 1}. ${o.opportunity_name}`).join("\n") || "1. [Quick wins not yet identified]"}

These projects create the operating foundation for later AI use in forecasting, automation, knowledge management, customer intelligence, and advanced workflow support.
`;
}

function list(items) {
  return items && items.length ? items.join(", ") : "[not captured]";
}

function renderReport() {
  document.getElementById("reportOutput").value = generateReport();
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[s]);
}

function render() {
  renderQuestion();
  renderReadiness();
  renderState();
  renderOpportunities();
}

document.getElementById("saveNextBtn").addEventListener("click", () => {
  const input = document.getElementById("answerInput");
  if (input) processAnswer(currentQuestionId, input.value);
  currentQuestionId = questions[currentQuestionId].next;
  saveState();
  render();
});

document.getElementById("skipBtn").addEventListener("click", () => {
  currentQuestionId = questions[currentQuestionId].next;
  saveState();
  render();
});

document.getElementById("generateBtn").addEventListener("click", () => {
  renderReport();
  saveState();
});

document.getElementById("resetBtn").addEventListener("click", resetState);

document.getElementById("copyReportBtn").addEventListener("click", async () => {
  const report = document.getElementById("reportOutput").value;
  await navigator.clipboard.writeText(report);
  alert("Report copied to clipboard.");
});

render();
