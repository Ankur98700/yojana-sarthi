import type {
  CitizenProfile,
  EligibilityCheckResponse,
  EligibilityOutcome,
  EligibilityRule,
  RuleEvaluationRecord,
  Scheme,
  SchemeEligibilityResult,
} from '../src/types.ts';

const FIELD_LABELS: Record<string, string> = {
  age: 'Age',
  gender: 'Gender',
  state: 'State / UT',
  district: 'District',
  residenceType: 'Residence Area (Rural/Urban)',
  maritalStatus: 'Marital Status',
  annualFamilyIncome: 'Annual Family Income',
  occupation: 'Occupation',
  employmentStatus: 'Employment Status',
  bplStatus: 'BPL / SECC Household Status',
  isIncomeTaxPayer: 'Income-Tax Payer Status',
  educationLevel: 'Education Level',
  isStudent: 'Current Student Status',
  institutionType: 'Institution Type',
  familySize: 'Family Size',
  dependentsCount: 'Number of Dependents',
  childrenCount: 'Number of Children',
  hasGirlChildUnder10: 'Girl Child Under 10 Years',
  ownsPuccaHouse: 'Pucca House Ownership',
  isFarmer: 'Farmer Status',
  ownsCultivableLand: 'Cultivable Landholding',
  landholdingHectares: 'Landholding Size (Hectares)',
  hasDisability: 'Disability Status',
  isTraditionalArtisan: 'Traditional Artisan / Craftsperson Trade',
};

function formatCurrency(val: number): string {
  return `₹${val.toLocaleString('en-IN')}`;
}

function formatExpectedRequirement(rule: EligibilityRule): string {
  const { field, operator, expectedValue } = rule;
  const fieldName = rule.label || FIELD_LABELS[field] || field;

  if (field === 'annualFamilyIncome' && typeof expectedValue === 'number') {
    if (operator === 'lte') return `${fieldName} must be ${formatCurrency(expectedValue)} or less`;
    if (operator === 'lt') return `${fieldName} must be strictly below ${formatCurrency(expectedValue)}`;
    if (operator === 'gte') return `${fieldName} must be ${formatCurrency(expectedValue)} or more`;
    if (operator === 'gt') return `${fieldName} must exceed ${formatCurrency(expectedValue)}`;
  }

  if (field === 'age' && typeof expectedValue === 'number') {
    if (operator === 'gte') return `Age must be ${expectedValue} years or older`;
    if (operator === 'gt') return `Age must be older than ${expectedValue} years`;
    if (operator === 'lte') return `Age must be ${expectedValue} years or younger`;
    if (operator === 'lt') return `Age must be under ${expectedValue} years`;
  }

  if (typeof expectedValue === 'boolean') {
    if (operator === 'eq') return `${fieldName}: ${expectedValue ? 'Yes' : 'No'}`;
    if (operator === 'neq') return `${fieldName}: Must not be ${expectedValue ? 'Yes' : 'No'}`;
  }

  if (Array.isArray(expectedValue)) {
    const joined = expectedValue.map((v) => String(v).replace(/_/g, ' ')).join(', ');
    return operator === 'not_in'
      ? `${fieldName} must not be one of: ${joined}`
      : `${fieldName} must be one of: ${joined}`;
  }

  switch (operator) {
    case 'gte':
      return `${fieldName} ≥ ${expectedValue}`;
    case 'gt':
      return `${fieldName} > ${expectedValue}`;
    case 'lte':
      return `${fieldName} ≤ ${expectedValue}`;
    case 'lt':
      return `${fieldName} < ${expectedValue}`;
    case 'eq':
      return `${fieldName} must be "${String(expectedValue).replace(/_/g, ' ')}"`;
    case 'neq':
      return `${fieldName} must not be "${String(expectedValue).replace(/_/g, ' ')}"`;
    default:
      return `${fieldName}: ${String(expectedValue)}`;
  }
}

function formatUserValue(field: string, rawVal: unknown): string {
  if (rawVal === undefined || rawVal === null || rawVal === '' || rawVal === 'unknown') {
    return 'Not provided';
  }
  if (field === 'annualFamilyIncome' && typeof rawVal === 'number') {
    return formatCurrency(rawVal);
  }
  if (field === 'age' && typeof rawVal === 'number') {
    return `${rawVal} years`;
  }
  if (typeof rawVal === 'boolean') {
    return rawVal ? 'Yes' : 'No';
  }
  return String(rawVal).replace(/_/g, ' ');
}

function getProfileFieldValue(profile: CitizenProfile, field: string): unknown {
  const val = (profile as Record<string, unknown>)[field];
  // Derive student status cleanly if occupation === 'student' and isStudent wasn't explicitly set
  if (field === 'isStudent' && (val === undefined || val === null)) {
    if (profile.occupation === 'student' || profile.employmentStatus === 'student') return true;
  }
  if (field === 'isFarmer' && (val === undefined || val === null)) {
    if (profile.occupation === 'farmer') return true;
  }
  if (field === 'isTraditionalArtisan' && (val === undefined || val === null)) {
    if (profile.occupation === 'artisan') return true;
  }
  return val;
}

function isMissingValue(val: unknown): boolean {
  if (val === undefined || val === null) return true;
  if (typeof val === 'string' && (val.trim() === '' || val.trim().toLowerCase() === 'unknown')) return true;
  if (typeof val === 'number' && Number.isNaN(val)) return true;
  return false;
}

function compareCondition(operator: EligibilityRule['operator'], actual: unknown, expected: unknown): boolean {
  switch (operator) {
    case 'gte':
      return Number(actual) >= Number(expected);
    case 'gt':
      return Number(actual) > Number(expected);
    case 'lte':
      return Number(actual) <= Number(expected);
    case 'lt':
      return Number(actual) < Number(expected);
    case 'eq':
      if (typeof expected === 'string' && typeof actual === 'string') {
        return actual.trim().toLowerCase() === expected.trim().toLowerCase();
      }
      return actual === expected;
    case 'neq':
      if (typeof expected === 'string' && typeof actual === 'string') {
        return actual.trim().toLowerCase() !== expected.trim().toLowerCase();
      }
      return actual !== expected;
    case 'in':
      if (!Array.isArray(expected)) return false;
      return expected.some((item) =>
        typeof item === 'string' && typeof actual === 'string'
          ? item.trim().toLowerCase() === actual.trim().toLowerCase()
          : item === actual
      );
    case 'not_in':
      if (!Array.isArray(expected)) return true;
      return !expected.some((item) =>
        typeof item === 'string' && typeof actual === 'string'
          ? item.trim().toLowerCase() === actual.trim().toLowerCase()
          : item === actual
      );
    default:
      return false;
  }
}

function evaluateSingleRule(rule: EligibilityRule, profile: CitizenProfile): RuleEvaluationRecord {
  const actual = getProfileFieldValue(profile, rule.field);
  const requirement = formatExpectedRequirement(rule);
  const userValue = formatUserValue(rule.field, actual);

  // Strict Rule: Unverified rule must NEVER produce a definitive pass or fail
  if (!rule.ruleVerified) {
    return {
      ruleId: rule.id,
      field: rule.field,
      label: rule.label,
      requirement,
      userValue,
      status: 'VERIFICATION_REQUIRED',
      explanation: `This rule is currently marked unverified and requires official portal confirmation. (${rule.explanation})`,
      source: rule.source,
      logicalGroup: rule.logicalGroup,
      groupOperator: rule.groupOperator,
      isMandatory: rule.isMandatory,
      ruleVerified: false,
    };
  }

  // Strict Rule: Missing information must NEVER be treated as a pass
  if (isMissingValue(actual)) {
    return {
      ruleId: rule.id,
      field: rule.field,
      label: rule.label,
      requirement,
      userValue: 'Not provided',
      status: 'MISSING',
      explanation: `Missing information: Please provide your ${FIELD_LABELS[rule.field] || rule.label} to evaluate this condition. (${rule.explanation})`,
      source: rule.source,
      logicalGroup: rule.logicalGroup,
      groupOperator: rule.groupOperator,
      isMandatory: rule.isMandatory,
      ruleVerified: true,
    };
  }

  const passed = compareCondition(rule.operator, actual, rule.expectedValue);

  if (!passed) {
    return {
      ruleId: rule.id,
      field: rule.field,
      label: rule.label,
      requirement,
      userValue,
      status: 'FAILED',
      explanation: `Not met: ${rule.explanation}`,
      source: rule.source,
      logicalGroup: rule.logicalGroup,
      groupOperator: rule.groupOperator,
      isMandatory: rule.isMandatory,
      ruleVerified: true,
    };
  }

  if (rule.requiresOfficialVerification) {
    return {
      ruleId: rule.id,
      field: rule.field,
      label: rule.label,
      requirement,
      userValue,
      status: 'VERIFICATION_REQUIRED',
      explanation: `Preliminary match (${userValue}), subject to official government verification. ${rule.explanation}`,
      source: rule.source,
      logicalGroup: rule.logicalGroup,
      groupOperator: rule.groupOperator,
      isMandatory: rule.isMandatory,
      ruleVerified: true,
    };
  }

  return {
    ruleId: rule.id,
    field: rule.field,
    label: rule.label,
    requirement,
    userValue,
    status: 'PASSED',
    explanation: `Satisfied: ${rule.explanation}`,
    source: rule.source,
    logicalGroup: rule.logicalGroup,
    groupOperator: rule.groupOperator,
    isMandatory: rule.isMandatory,
    ruleVerified: true,
  };
}

export function evaluateSchemeEligibility(
  scheme: Scheme,
  profile: CitizenProfile
): SchemeEligibilityResult {
  const allEvaluations = scheme.rules.map((rule) => evaluateSingleRule(rule, profile));

  // Group rules by logicalGroup to support AND & OR logic accurately
  const groups = new Map<string, RuleEvaluationRecord[]>();
  for (const ev of allEvaluations) {
    const list = groups.get(ev.logicalGroup) || [];
    list.push(ev);
    groups.set(ev.logicalGroup, list);
  }

  const satisfiedConditions: RuleEvaluationRecord[] = [];
  const failedConditions: RuleEvaluationRecord[] = [];
  const missingConditions: RuleEvaluationRecord[] = [];
  const verificationRequiredConditions: RuleEvaluationRecord[] = [];

  let anyMandatoryGroupFailed = false;
  let anyMandatoryGroupNeedsInputOrVerification = false;

  for (const [, groupEvals] of groups.entries()) {
    const mandatoryEvals = groupEvals.filter((e) => e.isMandatory);
    const isOrGroup = groupEvals.some((e) => e.groupOperator === 'OR');

    for (const ev of groupEvals) {
      if (ev.status === 'PASSED') satisfiedConditions.push(ev);
      else if (ev.status === 'FAILED') failedConditions.push(ev);
      else if (ev.status === 'MISSING') missingConditions.push(ev);
      else verificationRequiredConditions.push(ev);
    }

    if (mandatoryEvals.length === 0) continue;

    if (isOrGroup) {
      // OR group passes if ANY mandatory rule passed cleanly
      const hasDefinitivePass = mandatoryEvals.some((e) => e.status === 'PASSED');
      const hasVerificationPass = mandatoryEvals.some((e) => e.status === 'VERIFICATION_REQUIRED');
      const hasMissing = mandatoryEvals.some((e) => e.status === 'MISSING');
      const allFailed = mandatoryEvals.every((e) => e.status === 'FAILED');

      if (hasDefinitivePass) {
        // OR group fully satisfied!
      } else if (hasVerificationPass || hasMissing) {
        anyMandatoryGroupNeedsInputOrVerification = true;
      } else if (allFailed) {
        anyMandatoryGroupFailed = true;
      }
    } else {
      // AND group: any single FAILED mandatory rule causes group failure
      if (mandatoryEvals.some((e) => e.status === 'FAILED')) {
        anyMandatoryGroupFailed = true;
      } else if (
        mandatoryEvals.some((e) => e.status === 'MISSING' || e.status === 'VERIFICATION_REQUIRED')
      ) {
        anyMandatoryGroupNeedsInputOrVerification = true;
      }
    }
  }

  // Strict Data Integrity Rule:
  // If the scheme record itself is unverified or has zero structured rules, NEVER mark definitively ELIGIBLE or NOT_ELIGIBLE.
  let status: EligibilityOutcome;
  let summaryExplanation: string;

  if (scheme.verificationStatus !== 'verified' || scheme.rules.length === 0) {
    status = 'POTENTIALLY_ELIGIBLE';
    summaryExplanation =
      'This scheme record is currently unverified or lacks complete structured rules. Please confirm exact eligibility directly on the official government portal.';
  } else if (anyMandatoryGroupFailed) {
    status = 'NOT_ELIGIBLE';
    const failedLabels = failedConditions
      .filter((c) => c.isMandatory)
      .map((c) => c.label)
      .slice(0, 3)
      .join(', ');
    summaryExplanation = `Based on the information provided, you do not meet one or more mandatory eligibility criteria (${failedLabels}).`;
  } else if (anyMandatoryGroupNeedsInputOrVerification) {
    status = 'POTENTIALLY_ELIGIBLE';
    const missingNames = missingConditions.map((m) => m.label);
    const verifyNames = verificationRequiredConditions.map((v) => v.label);
    if (missingNames.length > 0 && verifyNames.length > 0) {
      summaryExplanation = `Your provided details match initial criteria, but we need ${missingNames.join(', ')} and official government verification (${verifyNames.join(', ')}) to confirm eligibility.`;
    } else if (missingNames.length > 0) {
      summaryExplanation = `Your provided information matches available criteria, but we need your ${missingNames.join(', ')} to determine whether you satisfy the remaining requirements.`;
    } else {
      summaryExplanation = `Your profile aligns with the scheme requirements, subject to official verification on the government portal (${verifyNames.join(', ')}).`;
    }
  } else {
    status = 'ELIGIBLE';
    summaryExplanation = `All ${satisfiedConditions.length} verified mandatory criteria are satisfied based on your provided details. Final approval is always subject to official document verification by the implementing department.`;
  }

  return {
    schemeId: scheme.id,
    schemeSlug: scheme.slug,
    schemeName: scheme.name,
    category: scheme.category,
    governmentLevel: scheme.governmentLevel,
    stateCoverage: scheme.stateCoverage,
    department: scheme.department,
    mainBenefit: scheme.mainBenefit,
    officialApplicationUrl: scheme.officialApplicationUrl,
    officialSourceUrl: scheme.officialSourceUrl,
    verificationStatus: scheme.verificationStatus,
    lastVerifiedDate: scheme.lastVerifiedDate,
    documents: scheme.documents,
    status,
    summaryExplanation,
    satisfiedConditions,
    failedConditions,
    missingConditions,
    verificationRequiredConditions,
    allEvaluations,
  };
}

export function evaluateAllSchemes(
  schemes: Scheme[],
  profile: CitizenProfile
): EligibilityCheckResponse {
  const results = schemes.map((scheme) => evaluateSchemeEligibility(scheme, profile));

  const statusOrder: Record<EligibilityOutcome, number> = {
    ELIGIBLE: 0,
    POTENTIALLY_ELIGIBLE: 1,
    NOT_ELIGIBLE: 2,
  };

  results.sort((a, b) => {
    const diff = statusOrder[a.status] - statusOrder[b.status];
    if (diff !== 0) return diff;
    return a.schemeName.localeCompare(b.schemeName);
  });

  const eligibleCount = results.filter((r) => r.status === 'ELIGIBLE').length;
  const potentiallyEligibleCount = results.filter((r) => r.status === 'POTENTIALLY_ELIGIBLE').length;
  const notEligibleCount = results.filter((r) => r.status === 'NOT_ELIGIBLE').length;

  return {
    checkedAt: new Date().toISOString(),
    totalSchemesChecked: results.length,
    eligibleCount,
    potentiallyEligibleCount,
    notEligibleCount,
    results,
  };
}
