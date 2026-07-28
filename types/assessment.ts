export type Score = 1 | 2 | 3 | 4 | 5;
export type ExportCapability = "none" | "manual" | "csv" | "api" | "unknown";
export type IntegrationCapability = "none" | "limited" | "good" | "strong" | "unknown";
export type OpportunityClassification = "Quick Win" | "Near-Term Project" | "Foundation Project" | "Future Opportunity";

export interface CompanyProfile {
  company_name: string; industry: string; subindustry: string; locations: number | null;
  employee_count: number | null; annual_revenue: number | null; years_in_business: number | null;
  customer_types: string[]; revenue_sources: string[]; operating_model: string;
  management_structure: string; strategic_priorities: string[]; current_business_pressures: string[];
}
export interface BusinessFunction { function_name: string; employee_count: number | null; manager_owner: string; importance: Score; pain_level: Score; systems_used: string[]; notes: string; }
export interface RoleGroup { role_name: string; function_name: string; headcount: number | null; responsibilities: string[]; pain_points: string[]; turnover_level: string; hiring_difficulty: Score; ai_adoption_likelihood: Score; }
export interface Workflow { workflow_name: string; function_name: string; owner: string; trigger: string; steps: string[]; inputs: string[]; outputs: string[]; systems_used: string[]; documents_used: string[]; people_involved: string[]; frequency: string; monthly_volume: number | null; time_per_instance_minutes: number | null; weekly_time_cost_hours: number | null; error_or_rework_level: Score; bottlenecks: string[]; decision_points: string[]; customer_impact: Score; financial_impact: Score; data_sensitivity: Score; process_maturity: Score; data_readiness: Score; ai_candidate_notes: string; }
export interface TechnologySystem { system_name: string; vendor: string; function_served: string; users: string; data_stored: string[]; export_capability: ExportCapability; integration_capability: IntegrationCapability; satisfaction: Score; limitations: string[]; }
export interface DataAsset { asset_name: string; source_system: string; data_type: string; owner: string; format: string; cleanliness: Score; accessibility: Score; update_frequency: string; sensitivity: Score; ai_usability: Score; }
export interface DocumentAsset { document_type: string; location: string; owner: string; quality: Score; update_frequency: string; ai_use_cases: string[]; }
export interface PainPoint { pain_point: string; function_name: string; workflow_name: string; who_feels_it: string[]; frequency: string; severity: Score; time_cost: string; dollar_cost: string; customer_impact: Score; employee_impact: Score; current_workaround: string; root_cause: string; }
export interface AIReadiness { current_ai_use: string; leadership_support: Score | null; employee_readiness: Score | null; data_availability: Score | null; data_organization: Score | null; process_documentation: Score | null; governance_maturity: Score | null; implementation_capacity: Score | null; data_sensitivity_concerns: string[]; budget_appetite: string; timeline_expectation: string; }
export interface GovernanceProfile { sensitive_data_types: string[]; requires_human_approval: string[]; regulated_constraints: string[]; brand_review_needs: boolean; employee_decision_controls: boolean; vendor_or_customer_data_rules: string[]; }
export interface Opportunity { opportunity_name: string; related_workflow: string; description: string; business_value_score: Score; frequency_score: Score; repetition_score: Score; data_readiness_score: Score; adoption_score: Score; strategic_fit_score: Score; implementation_difficulty_score: Score; risk_score: Score; total_score: number; complexity: string; classification: OpportunityClassification; recommended_phase: string; time_to_pilot: string; success_metrics: string[]; }
export interface RoadmapPhase { phase_name: string; timeframe: string; objectives: string[]; opportunity_names: string[]; dependencies: string[]; success_measures: string[]; }
export interface Answer { question_id: string; module: QuestionModuleId; field: string; answer: string; saved_at: string; }
export type QuestionModuleId = "company_profile" | "business_functions" | "people_roles" | "workflows" | "technology_stack" | "data_readiness" | "current_ai_use" | "strategic_priorities" | "governance_risk";
export interface Assessment { id: string; created_at: string; updated_at: string; company_profile: CompanyProfile; business_functions: BusinessFunction[]; role_groups: RoleGroup[]; workflows: Workflow[]; technology_stack: TechnologySystem[]; data_assets: DataAsset[]; document_assets: DocumentAsset[]; pain_points: PainPoint[]; ai_readiness: AIReadiness; governance_profile: GovernanceProfile; opportunities: Opportunity[]; roadmap_phases: RoadmapPhase[]; answers: Answer[]; }
export interface AssessmentQuestion { id: string; module: QuestionModuleId; field: string; title: string; help: string; priority: number; isComplete: (assessment: Assessment) => boolean; }
export interface ReadinessSection { key: QuestionModuleId | "pain_points_opportunities"; label: string; weight: number; complete: boolean; missing: string[]; }
