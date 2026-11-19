import {
  AlertCircle,
  ArrowLeft,
  Bookmark,
  Bot,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileText,
  HelpCircle,
  Scale,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';
import type { Scheme, SchemeEligibilityResult } from '../types.ts';

interface SchemeDetailPageProps {
  slugOrId: string;
}

export function SchemeDetailPage({ slugOrId }: SchemeDetailPageProps) {
  const {
    navigate,
    user,
    guestProfile,
    savedIds,
    toggleSaveScheme,
    compareIds,
    toggleCompareScheme,
  } = useApp();

  const [scheme, setScheme] = useState<Scheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quickCheck, setQuickCheck] = useState<SchemeEligibilityResult | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setQuickCheck(null);
    api
      .getScheme(slugOrId)
      .then((res) => {
        if (!active) return;
        setScheme(res.scheme);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Scheme not found.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slugOrId]);

  const handleQuickEligibilityCheck = async () => {
    if (!scheme) return;
    const activeProfile = user?.profile && Object.keys(user.profile).length > 1 ? user.profile : guestProfile;
    const hasInputs = Object.keys(activeProfile).some((k) => {
      if (k === 'name') return false;
      const v = (activeProfile as Record<string, unknown>)[k];
      return v !== undefined && v !== null && v !== '';
    });

    if (!hasInputs) {
      navigate('/eligibility');
      return;
    }

    setChecking(true);
    try {
      const res = await api.checkEligibility({ profile: activeProfile, schemeId: scheme.id });
      setQuickCheck(res.results[0] || null);
    } catch {
      navigate('/eligibility');
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 animate-pulse space-y-4">
          <div className="h-4 bg-[#E2E8F0] rounded w-1/4" />
          <div className="h-8 bg-[#E2E8F0] rounded w-2/3" />
          <div className="h-4 bg-[#F1F5F9] rounded w-full" />
          <div className="h-4 bg-[#F1F5F9] rounded w-5/6" />
        </div>
      </div>
    );
  }

  if (error || !scheme) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-10">
          <h1 className="font-display text-2xl font-bold text-[#172B4D] mb-2">Scheme Not Found</h1>
          <p className="text-sm text-[#667085] mb-6">{error || 'This welfare scheme record could not be located.'}</p>
          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#123B65] rounded-lg"
          >
            Back to Explore Schemes
          </button>
        </div>
      </div>
    );
  }

  const isSaved = savedIds.includes(scheme.id);
  const isCompared = compareIds.includes(scheme.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb Back Action */}
      <button
        type="button"
        onClick={() => navigate('/explore')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#475467] hover:text-[#123B65] mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Explore Schemes</span>
      </button>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Main Content (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Header Block */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#667085] mb-3">
              <span className="font-semibold text-[#138A55]">{scheme.category}</span>
              <span aria-hidden="true">·</span>
              <span>{scheme.governmentLevel}</span>
              <span aria-hidden="true">·</span>
              <span>Coverage: {scheme.stateCoverage}</span>
              <span aria-hidden="true">·</span>
              <span
                className={
                  scheme.verificationStatus === 'verified'
                    ? 'font-medium text-[#138A55]'
                    : 'font-medium text-[#B45309]'
                }
              >
                {scheme.verificationStatus === 'verified' ? 'Verified record' : 'Unverified — confirm on official portal'}
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#172B4D] tracking-tight mb-3">
              {scheme.name}
            </h1>

            <p className="text-sm text-[#667085] mb-5">{scheme.department}</p>

            <p className="text-base text-[#334155] leading-relaxed">{scheme.overview}</p>

            {/* Quick Eligibility Result if triggered */}
            {quickCheck && (
              <div className="mt-6 pt-6 border-t border-[#E2E8F0]">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 font-display text-base font-bold">
                    {quickCheck.status === 'ELIGIBLE' && (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-[#138A55]" />
                        <span className="text-[#138A55]">Preliminary Result: Eligible</span>
                      </>
                    )}
                    {quickCheck.status === 'POTENTIALLY_ELIGIBLE' && (
                      <>
                        <AlertCircle className="w-5 h-5 text-[#D97706]" />
                        <span className="text-[#B45309]">Preliminary Result: Potentially Eligible</span>
                      </>
                    )}
                    {quickCheck.status === 'NOT_ELIGIBLE' && (
                      <>
                        <XCircle className="w-5 h-5 text-red-600" />
                        <span className="text-red-700">Preliminary Result: Not Eligible</span>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/eligibility')}
                    className="text-xs font-semibold text-[#123B65] hover:underline"
                  >
                    Update full eligibility details
                  </button>
                </div>
                <p className="text-sm text-[#475467] leading-relaxed">{quickCheck.summaryExplanation}</p>
              </div>
            )}
          </div>

          {/* Objective & Target Beneficiaries */}
          <section className="bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="font-display text-lg font-bold text-[#172B4D] mb-2">Objective</h2>
              <p className="text-sm text-[#475467] leading-relaxed">{scheme.objective}</p>
            </div>
            <div className="pt-5 border-t border-[#F1F5F9]">
              <h2 className="font-display text-lg font-bold text-[#172B4D] mb-2">Target Beneficiaries</h2>
              <p className="text-sm text-[#475467] leading-relaxed">{scheme.targetBeneficiaries}</p>
            </div>
          </section>

          {/* Benefits */}
          <section className="bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8">
            <h2 className="font-display text-lg font-bold text-[#172B4D] mb-1">Scheme Benefits</h2>
            <p className="text-sm font-medium text-[#138A55] mb-4">{scheme.mainBenefit}</p>
            <ul className="space-y-3">
              {scheme.benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-[#334155] leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-[#138A55] shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Eligibility Conditions (Structured Rules) */}
          <section className="bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className="font-display text-lg font-bold text-[#172B4D]">
                Eligibility Conditions
              </h2>
              <span className="text-xs text-[#667085] font-mono tabular-nums">
                {scheme.rules.length} structured {scheme.rules.length === 1 ? 'rule' : 'rules'}
              </span>
            </div>

            <div className="divide-y divide-[#F1F5F9]">
              {scheme.rules.map((rule) => (
                <div key={rule.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-[#172B4D]">{rule.label}</h3>
                    <span className="text-xs text-[#667085]">
                      {rule.groupOperator === 'OR' ? 'Alternative pathway (OR)' : 'Mandatory requirement'}
                      {rule.requiresOfficialVerification ? ' · Official verification required' : ''}
                    </span>
                  </div>
                  <p className="text-sm text-[#475467] leading-relaxed">{rule.explanation}</p>
                  {rule.source && (
                    <p className="text-xs text-[#667085] mt-1.5">Source: {rule.source}</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Required Documents */}
          <section className="bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8">
            <h2 className="font-display text-lg font-bold text-[#172B4D] mb-4">Required Documents</h2>
            <ul className="space-y-3">
              {scheme.documents.map((doc, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm text-[#334155]">
                  <FileText className="w-4 h-4 text-[#123B65] shrink-0 mt-0.5" />
                  <span>{doc}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Application Process */}
          <section className="bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
              <h2 className="font-display text-lg font-bold text-[#172B4D]">Application Process</h2>
              <span className="text-xs font-medium text-[#123B65]">
                Mode: {scheme.applicationMethod}
              </span>
            </div>
            <ol className="space-y-4">
              {scheme.applicationSteps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-3.5 text-sm text-[#334155] leading-relaxed">
                  <span className="font-mono tabular-nums text-xs font-semibold text-[#123B65] bg-[#F1F5F9] w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Right Sticky Action & Metadata Column (4 cols) */}
        <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-3">
            <button
              type="button"
              onClick={handleQuickEligibilityCheck}
              disabled={checking}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2B4B] rounded-lg transition-colors disabled:opacity-60"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>{checking ? 'Evaluating...' : 'Check My Eligibility'}</span>
            </button>

            <a
              href={scheme.officialApplicationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-[#138A55] bg-[#138A55]/10 hover:bg-[#138A55]/15 rounded-lg transition-colors"
            >
              <span>Visit Official Website</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => toggleSaveScheme(scheme.id)}
                className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-lg border transition-colors ${
                  isSaved
                    ? 'border-[#138A55] bg-[#138A55]/10 text-[#138A55]'
                    : 'border-[#CBD5E1] text-[#172B4D] hover:bg-[#F8FAFC]'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" fill={isSaved ? 'currentColor' : 'none'} />
                <span>{isSaved ? 'Saved' : 'Save Scheme'}</span>
              </button>

              <button
                type="button"
                onClick={() => toggleCompareScheme(scheme.id)}
                className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-lg border transition-colors ${
                  isCompared
                    ? 'border-[#123B65] bg-[#123B65]/10 text-[#123B65]'
                    : 'border-[#CBD5E1] text-[#172B4D] hover:bg-[#F8FAFC]'
                }`}
              >
                {isCompared ? <Check className="w-3.5 h-3.5" /> : <Scale className="w-3.5 h-3.5" />}
                <span>{isCompared ? 'Comparing' : 'Compare'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/assistant?q=${encodeURIComponent(`Tell me about eligibility and documents for ${scheme.name}`)}`)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-[#475467] hover:text-[#123B65] border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] transition-colors"
            >
              <Bot className="w-4 h-4 text-[#123B65]" />
              <span>Ask Yojana Mitra about this scheme</span>
            </button>
          </div>

          {/* Official Verification Metadata */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
            <h3 className="font-display text-sm font-bold text-[#172B4D] mb-4">
              Record Summary &amp; Sources
            </h3>
            <dl className="space-y-3.5 text-sm">
              <div>
                <dt className="text-xs text-[#667085]">Age Group</dt>
                <dd className="text-[#172B4D] font-medium mt-0.5">{scheme.ageGroupSummary}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#667085]">Income Eligibility</dt>
                <dd className="text-[#172B4D] font-medium mt-0.5">{scheme.incomeLimitSummary}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#667085]">Application Mode</dt>
                <dd className="text-[#172B4D] font-medium mt-0.5">{scheme.applicationMethod}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#667085]">Verification Status</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 font-medium">
                  {scheme.verificationStatus === 'verified' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#138A55]" />
                      <span className="text-[#138A55]">Verified against official source</span>
                    </>
                  ) : (
                    <>
                      <HelpCircle className="w-4 h-4 text-[#D97706]" />
                      <span className="text-[#B45309]">Unverified record</span>
                    </>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#667085]">Last Verified Date</dt>
                <dd className="font-mono tabular-nums text-[#172B4D] mt-0.5">
                  {scheme.lastVerifiedDate}
                </dd>
              </div>
              <div className="pt-3 border-t border-[#F1F5F9] space-y-2">
                <a
                  href={scheme.officialApplicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between text-xs font-medium text-[#123B65] hover:underline"
                >
                  <span>Official Application Portal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <a
                  href={scheme.officialSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between text-xs font-medium text-[#123B65] hover:underline"
                >
                  <span>Official Reference Source</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
