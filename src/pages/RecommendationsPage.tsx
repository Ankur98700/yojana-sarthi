import { AlertCircle, ArrowRight, CheckCircle2, ExternalLink, Sliders } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SCHEME_CATEGORIES } from '../constants/india.ts';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';
import type { RecommendationItem } from '../types.ts';

export function RecommendationsPage() {
  const { user, guestProfile, navigate } = useApp();
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    () => user?.profile?.preferredCategories || []
  );
  const [items, setItems] = useState<RecommendationItem[]>([]);
  const [usedProfile, setUsedProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeProfile =
    user?.profile && Object.keys(user.profile).length > 1 ? user.profile : guestProfile;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .getRecommendations({
        profile: activeProfile,
        preferredCategories: selectedCategories,
      })
      .then((res) => {
        if (!active) return;
        setItems(res.recommendations);
        setUsedProfile(res.usedProfile);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Could not load recommendations.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeProfile, selectedCategories]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-sm font-semibold text-[#138A55] mb-1.5">Explainable Recommendation Engine</p>
          <h1 className="font-display text-3xl font-bold text-[#172B4D] tracking-tight">
            Personalized Scheme Recommendations
          </h1>
          <p className="text-sm text-[#667085] mt-1.5 max-w-2xl">
            Prioritized transparently: Eligible schemes first, followed by potentially eligible schemes aligned with your state, age, income, and household details. Ineligible schemes are excluded.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/eligibility')}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2B4B] rounded-lg whitespace-nowrap shrink-0"
        >
          <span>{usedProfile ? 'Update Eligibility Details' : 'Complete Eligibility Questionnaire'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Prompt Banner if no profile entered yet */}
      {!usedProfile && !loading && (
        <div className="mb-8 bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-bold text-[#172B4D]">
              Personalize these recommendations in 2 minutes
            </h2>
            <p className="text-sm text-[#667085] mt-1">
              You have not entered your age, state, or income yet. Complete the Eligibility Checker so we can narrow recommendations specifically to your household.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/eligibility')}
            className="px-4 py-2.5 text-sm font-semibold text-white bg-[#138A55] hover:bg-[#0F7044] rounded-lg whitespace-nowrap shrink-0"
          >
            Start Now
          </button>
        </div>
      )}

      {/* Preference Selector */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 mb-8">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#172B4D]">
            <Sliders className="w-4 h-4 text-[#123B65]" />
            <span>Prioritize Categories (Optional)</span>
          </div>
          {selectedCategories.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedCategories([])}
              className="text-xs font-medium text-[#123B65] hover:underline"
            >
              Clear preferences
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {SCHEME_CATEGORIES.map((cat) => {
            const active = selectedCategories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  active
                    ? 'border-[#123B65] bg-[#123B65] text-white'
                    : 'border-[#CBD5E1] bg-white text-[#475467] hover:border-[#123B65]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recommendations List */}
      {error ? (
        <div className="bg-white border border-red-200 rounded-xl p-8 text-center text-sm text-red-700">
          {error}
        </div>
      ) : loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-[#E2E8F0] rounded-xl p-6 h-40 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center">
          <h2 className="font-display text-lg font-bold text-[#172B4D] mb-2">
            No matching recommendations for the current profile
          </h2>
          <p className="text-sm text-[#667085] max-w-md mx-auto mb-6">
            Try updating your eligibility details or exploring the full directory of verified government schemes.
          </p>
          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#123B65] rounded-lg"
          >
            Explore All Schemes
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <article
              key={item.scheme.id}
              className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col lg:flex-row lg:items-start justify-between gap-6"
            >
              <div className="space-y-2.5 flex-1">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#667085]">
                  {item.eligibility.status === 'ELIGIBLE' ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-[#138A55]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {item.tierLabel}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-semibold text-[#B45309]">
                      <AlertCircle className="w-3.5 h-3.5 text-[#F39C35]" />
                      {item.tierLabel}
                    </span>
                  )}
                  <span aria-hidden="true">·</span>
                  <span>{item.scheme.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.scheme.stateCoverage}</span>
                </div>

                <h2 className="font-display text-lg font-bold text-[#172B4D]">
                  <button
                    type="button"
                    onClick={() => navigate(`/schemes/${item.scheme.slug}`)}
                    className="text-left hover:text-[#123B65]"
                  >
                    {item.scheme.name}
                  </button>
                </h2>

                <p className="text-sm font-medium text-[#138A55]">{item.scheme.mainBenefit}</p>

                <p className="text-sm text-[#334155] leading-relaxed bg-[#F8FAFC] border border-[#F1F5F9] rounded-lg px-4 py-3">
                  <span className="font-semibold text-[#172B4D]">Why recommended: </span>
                  {item.recommendationReason}
                </p>
              </div>

              <div className="flex flex-wrap lg:flex-col gap-2.5 shrink-0 lg:min-w-[180px]">
                <button
                  type="button"
                  onClick={() => navigate(`/schemes/${item.scheme.slug}`)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#123B65] hover:bg-[#0D2B4B] rounded-lg"
                >
                  <span>View Full Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <a
                  href={item.scheme.officialApplicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-[#123B65] bg-white border border-[#CBD5E1] hover:border-[#123B65] rounded-lg"
                >
                  <span>Official Portal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
