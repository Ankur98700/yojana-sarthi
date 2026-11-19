export type GovernmentLevel = 'Central Government' | 'State Government';

export type VerificationStatus = 'verified' | 'unverified';

export type ApplicationMethod = 'Online' | 'Offline' | 'Online & Offline';

export type RuleOperator =
  | 'gte'
  | 'gt'
  | 'lte'
  | 'lt'
  | 'eq'
  | 'neq'
  | 'in'
  | 'not_in';

export type RuleGroupOperator = 'AND' | 'OR';

export type EligibilityOutcome =
  | 'ELIGIBLE'
  | 'POTENTIALLY_ELIGIBLE'
  | 'NOT_ELIGIBLE';

export type RuleEvalStatus =
  | 'PASSED'
  | 'FAILED'
  | 'MISSING'
  | 'VERIFICATION_REQUIRED';

export interface EligibilityRule {
  id: number;
  schemeId: number;
  field: keyof CitizenProfile | string;
  label: string;
  operator: RuleOperator;
  expectedValue: string | number | boolean | string[];
  logicalGroup: string;
  groupOperator: RuleGroupOperator;
  isMandatory: boolean;
  requiresOfficialVerification: boolean;
  ruleVerified: boolean;
  explanation: string;
  source: string;
}

export interface Scheme {
  id: number;
  slug: string;
  name: string;
  shortDescription: string;
  overview: string;
  objective: string;
  category: string;
  governmentLevel: GovernmentLevel;
  department: string;
  stateCoverage: string;
  targetBeneficiaries: string;
  mainBenefit: string;
  benefits: string[];
  documents: string[];
  applicationSteps: string[];
  applicationMethod: ApplicationMethod;
  officialApplicationUrl: string;
  officialSourceUrl: string;
  verificationStatus: VerificationStatus;
  lastVerifiedDate: string;
  ageGroupSummary: string;
  incomeLimitSummary: string;
  occupationTags: string[];
  educationTags: string[];
  beneficiaryTags: string[];
  rules: EligibilityRule[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CitizenProfile {
  name?: string;
  age?: number | null;
  dateOfBirth?: string;
  gender?: 'female' | 'male' | 'other' | '';
  state?: string;
  district?: string;
  residenceType?: 'rural' | 'urban' | '';
  maritalStatus?: 'single' | 'married' | 'widowed' | 'divorced' | '';
  annualFamilyIncome?: number | null;
  occupation?: string;
  employmentStatus?: string;
  bplStatus?: 'yes' | 'no' | 'unknown' | '';
  isIncomeTaxPayer?: 'yes' | 'no' | '';
  educationLevel?: string;
  isStudent?: boolean | null;
  institutionType?: 'government' | 'aided' | 'private' | '';
  familySize?: number | null;
  dependentsCount?: number | null;
  childrenCount?: number | null;
  hasGirlChildUnder10?: boolean | null;
  ownsPuccaHouse?: boolean | null;
  isFarmer?: boolean | null;
  ownsCultivableLand?: boolean | null;
  landholdingHectares?: number | null;
  hasDisability?: boolean | null;
  isTraditionalArtisan?: boolean | null;
  preferredCategories?: string[];
  languagePreference?: string;
}

export interface RuleEvaluationRecord {
  ruleId: number;
  field: string;
  label: string;
  requirement: string;
  userValue: string;
  status: RuleEvalStatus;
  explanation: string;
  source: string;
  logicalGroup: string;
  groupOperator: RuleGroupOperator;
  isMandatory: boolean;
  ruleVerified: boolean;
}

export interface SchemeEligibilityResult {
  schemeId: number;
  schemeSlug: string;
  schemeName: string;
  category: string;
  governmentLevel: GovernmentLevel;
  stateCoverage: string;
  department: string;
  mainBenefit: string;
  officialApplicationUrl: string;
  officialSourceUrl: string;
  verificationStatus: VerificationStatus;
  lastVerifiedDate: string;
  documents: string[];
  status: EligibilityOutcome;
  summaryExplanation: string;
  satisfiedConditions: RuleEvaluationRecord[];
  failedConditions: RuleEvaluationRecord[];
  missingConditions: RuleEvaluationRecord[];
  verificationRequiredConditions: RuleEvaluationRecord[];
  allEvaluations: RuleEvaluationRecord[];
}

export interface EligibilityCheckResponse {
  checkedAt: string;
  totalSchemesChecked: number;
  eligibleCount: number;
  potentiallyEligibleCount: number;
  notEligibleCount: number;
  results: SchemeEligibilityResult[];
}

export interface RecommendationItem {
  scheme: Scheme;
  eligibility: SchemeEligibilityResult;
  priorityTier: 1 | 2 | 3;
  tierLabel: string;
  recommendationReason: string;
}

export interface UserAccount {
  id: number;
  name: string;
  email: string;
  role: 'citizen' | 'admin';
  profile: CitizenProfile;
  createdAt: string;
}

export interface EligibilityHistoryRecord {
  id: number;
  userId: number;
  schemeId: number;
  schemeName: string;
  category: string;
  result: EligibilityOutcome;
  summaryExplanation: string;
  evaluatedAt: string;
}

export interface ChatSourceRef {
  schemeId: number;
  name: string;
  officialUrl: string;
  sourceUrl: string;
  verificationStatus: VerificationStatus;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: ChatSourceRef[];
  mode?: 'gemini_ai' | 'database_fallback';
  notice?: string;
}

export interface AdminAuditLog {
  id: number;
  adminId: number;
  adminEmail: string;
  action: string;
  entityType: string;
  entityId: number | null;
  summary: string;
  createdAt: string;
}
