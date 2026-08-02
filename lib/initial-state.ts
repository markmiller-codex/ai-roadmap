import type { Assessment } from "@/types/assessment";

export function createEmptyAssessment(now = new Date().toISOString()): Assessment {
  return {
    id: "local-assessment", created_at: now, updated_at: now,
    company_profile: { company_name: "", website_url: "", industry: "", subindustry: "", locations: null, employee_count: null, annual_revenue: null, years_in_business: null, customer_types: [], revenue_sources: [], operating_model: "", management_structure: "", strategic_priorities: [], current_business_pressures: [] },
    websiteDiscovery:{status:"not_started",companyName:"",industry:"",businessDescription:"",services:[],customerSegments:[],locations:[],revenueModelClues:[],leadershipClues:[],hiringSignals:[],technologyMentioned:[],likelyBusinessFunctions:[],likelyWorkflows:[],complianceConstraints:[],sourceUrls:[],rejectedFactLabels:[],correctedFields:[]}, expectedWorkflowReviews:[], capturedFacts: [], discoveryIssues: [], operating_metrics: [], business_functions: [], role_groups: [], workflows: [], technology_stack: [], data_assets: [], document_assets: [], pain_points: [],
    ai_readiness: { current_ai_use: "", leadership_support: null, employee_readiness: null, data_availability: null, data_organization: null, process_documentation: null, governance_maturity: null, implementation_capacity: null, data_sensitivity_concerns: [], budget_appetite: "", timeline_expectation: "" },
    governance_profile: { sensitive_data_types: [], requires_human_approval: [], regulated_constraints: [], brand_review_needs: true, employee_decision_controls: true, vendor_or_customer_data_rules: [] },
    management_decisions: [], opportunities: [], roadmap_phases: [], answers: [],
  };
}
// Keep the server and first client render identical. The client replaces this
// placeholder with stored data (or a freshly timestamped assessment) on mount.
export const initialAssessment = createEmptyAssessment("1970-01-01T00:00:00.000Z");
