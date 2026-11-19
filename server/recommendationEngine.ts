import type { CitizenProfile, RecommendationItem, Scheme } from '../src/types.ts';
import { evaluateSchemeEligibility } from './eligibilityEngine.ts';

function isContextuallyRelevant(scheme: Scheme, profile: CitizenProfile): boolean {
  // Exclude state schemes for a different state when user's state is known
  if (
    scheme.governmentLevel === 'State Government' &&
    profile.state &&
    scheme.stateCoverage !== 'All India' &&
    scheme.stateCoverage.toLowerCase() !== profile.state.toLowerCase()
  ) {
    return false;
  }

  // Exclude clearly irrelevant occupation-locked schemes when user's occupation doesn't match and they aren't eligible
  if (
    scheme.slug === 'pm-kisan' &&
    profile.isFarmer === false &&
    profile.occupation &&
    profile.occupation !== 'farmer'
  ) {
    return false;
  }

  return true;
}

export function generateRecommendations(
  schemes: Scheme[],
  profile: CitizenProfile,
  preferredCategories?: string[]
): RecommendationItem[] {
  const prefs = new Set(
    (preferredCategories && preferredCategories.length > 0
      ? preferredCategories
      : profile.preferredCategories || []
    ).map((c) => c.toLowerCase())
  );

  const items: Array<RecommendationItem & { _sortWeight: number }> = [];

  for (const scheme of schemes) {
    if (scheme.verificationStatus !== 'verified') continue;
    if (!isContextuallyRelevant(scheme, profile)) continue;

    const eligibility = evaluateSchemeEligibility(scheme, profile);

    // Exclude definitively ineligible schemes from the main recommendation list
    if (eligibility.status === 'NOT_ELIGIBLE') continue;

    const categoryPreferred = prefs.has(scheme.category.toLowerCase());
    const stateMatch =
      scheme.governmentLevel === 'State Government' &&
      Boolean(profile.state) &&
      scheme.stateCoverage.toLowerCase() === (profile.state || '').toLowerCase();

    const satisfiedCount = eligibility.satisfiedConditions.length;
    const missingCount = eligibility.missingConditions.length;
    const verificationCount = eligibility.verificationRequiredConditions.length;

    let priorityTier: 1 | 2 | 3;
    let tierLabel: string;
    let recommendationReason: string;

    if (eligibility.status === 'ELIGIBLE') {
      priorityTier = 1;
      tierLabel = 'Eligible based on your profile';
      const matchedLabels = eligibility.satisfiedConditions.map((c) => c.label).slice(0, 3);
      const parts: string[] = [];
      if (matchedLabels.length > 0) {
        parts.push(`Recommended because your profile satisfies all verified criteria (${matchedLabels.join(', ')}).`);
      } else {
        parts.push('Recommended because your profile satisfies all verified criteria for this scheme.');
      }
      if (stateMatch) parts.push(`Specifically available for residents of ${profile.state}.`);
      if (categoryPreferred) parts.push(`Matches your selected interest in ${scheme.category}.`);
      recommendationReason = parts.join(' ');
    } else if (missingCount === 0 && verificationCount > 0) {
      priorityTier = 2;
      tierLabel = 'Strong match — official verification needed';
      const matchedLabels = eligibility.satisfiedConditions.map((c) => c.label).slice(0, 2);
      const verifyLabels = eligibility.verificationRequiredConditions.map((c) => c.label).slice(0, 2);
      recommendationReason =
        matchedLabels.length > 0
          ? `Recommended because your ${matchedLabels.join(' and ')} align with this scheme. Official portal verification is required for ${verifyLabels.join(', ')}.`
          : `Recommended because your profile aligns with the scheme's target group, pending official portal verification for ${verifyLabels.join(', ')}.`;
    } else {
      // Skip schemes where literally nothing matched and user has provided substantial profile info
      const hasAnyProfileData = Boolean(
        profile.age || profile.state || profile.occupation || profile.annualFamilyIncome !== undefined
      );
      if (hasAnyProfileData && satisfiedCount === 0 && !categoryPreferred && !stateMatch && verificationCount === 0) {
        continue;
      }
      priorityTier = 3;
      tierLabel = 'Potentially relevant — complete missing details';
      const missingLabels = eligibility.missingConditions.map((c) => c.label).slice(0, 3);
      const matchedLabels = eligibility.satisfiedConditions.map((c) => c.label).slice(0, 2);
      if (matchedLabels.length > 0) {
        recommendationReason = `This ${scheme.category.toLowerCase()} scheme is relevant because your ${matchedLabels.join(' and ')} match its requirements. Please provide ${missingLabels.join(', ')} to confirm full eligibility.`;
      } else {
        recommendationReason = `Potentially relevant in ${scheme.category}. Please provide ${missingLabels.join(', ')} to check whether you qualify.`;
      }
    }

    // Internal tie-breaking order ONLY (never displayed as a fake score)
    const sortWeight =
      (categoryPreferred ? 100 : 0) +
      (stateMatch ? 50 : 0) +
      satisfiedCount * 10 -
      missingCount * 5;

    items.push({
      scheme,
      eligibility,
      priorityTier,
      tierLabel,
      recommendationReason,
      _sortWeight: sortWeight,
    });
  }

  items.sort((a, b) => {
    if (a.priorityTier !== b.priorityTier) return a.priorityTier - b.priorityTier;
    if (b._sortWeight !== a._sortWeight) return b._sortWeight - a._sortWeight;
    return a.scheme.name.localeCompare(b.scheme.name);
  });

  return items.map(({ _sortWeight, ...rest }) => rest);
}
