import { companyProfileQuestions } from "./questions/company-profile";
import { businessFunctionQuestions } from "./questions/business-functions";
import { peopleRoleQuestions } from "./questions/people-roles";
import { workflowQuestions } from "./questions/workflows";
import { technologyQuestions } from "./questions/technology-stack";
import { dataQuestions } from "./questions/data-readiness";
import { currentAIQuestions } from "./questions/current-ai-use";
import { strategicQuestions } from "./questions/strategic-priorities";
import { governanceQuestions } from "./questions/governance-risk";

export const questions = [...companyProfileQuestions, ...businessFunctionQuestions, ...peopleRoleQuestions, ...workflowQuestions, ...technologyQuestions, ...dataQuestions, ...currentAIQuestions, ...strategicQuestions, ...governanceQuestions];
export type QuestionId = (typeof questions)[number]["id"];
