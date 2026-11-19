import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  HelpCircle,
  Scale,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  EDUCATION_LEVEL_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  INDIAN_STATES_AND_UTS,
  OCCUPATION_OPTIONS,
} from '../constants/india.ts';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';
import type { CitizenProfile, EligibilityOutcome, SchemeEligibilityResult } from '../types.ts';

const STEPS = [
  { id: 1, title: 'Personal Information' },
  { id: 2, title: 'Financial Information' },
  { id: 3, title: 'Employment & Education' },
  { id: 4, title: 'Household Information' },
  { id: 5, title: 'Additional Details' },
];

export function EligibilityCheckerPage() {
  const {
    user,
    refreshUser,
    guestProfile,
    setGuestProfile,
    lastEligibility,
    setLastEligibility,
    navigate,
    savedIds,
    toggleSaveScheme,
    compareIds,
    toggleCompareScheme,
    notify,
  } = useApp();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CitizenProfile>(() => {
    const base = user?.profile && Object.keys(user.profile).length > 1 ? user.profile : guestProfile;
    return { ...base };
  });
  const [saveToAccount, setSaveToAccount] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [resultFilter, setResultFilter] = useState<'ALL' | EligibilityOutcome>('ALL');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Sync user's saved profile when user logs in and form is still empty
  useEffect(() => {
    if (user?.profile && Object.keys(form).length === 0) {
      setForm({ ...user.profile });
    }
  }, [user, form]);

  const updateField = <K extends keyof CitizenProfile>(key: K, value: CitizenProfile[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Smart synchronization for related fields without fabricating values
      if (key === 'occupation') {
        if (value === 'farmer') next.isFarmer = true;
        if (value === 'student') next.isStudent = true;
        if (value === 'artisan') next.isTraditionalArtisan = true;
      }
      setGuestProfile(next);
      return next;
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload: CitizenProfile = { ...form };
      setGuestProfile(payload);
      const res = await api.checkEligibility({
        profile: payload,
        saveToProfile: Boolean(user && saveToAccount),
      });
      setLastEligibility(res);
      setShowResults(true);
      setResultFilter('ALL');
      if (res.results[0]) setExpandedId(res.results[0].schemeId);
      if (user && saveToAccount) {
        await refreshUser();
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to evaluate eligibility right now.';
      setError(msg);
      notify(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredResults: SchemeEligibilityResult[] = lastEligibility
    ? resultFilter === 'ALL'
      ? lastEligibility.results
      : lastEligibility.results.filter((r) => r.status === resultFilter)
    : [];

  // Determine which contextual scheme-specific questions are relevant in Step 5
  const showFarmerQuestions = form.isFarmer === true || form.occupation === 'farmer';
  const showChildQuestions = (form.childrenCount ?? 0) >= 1;
  const showArtisanQuestions =
    form.occupation === 'artisan' ||
    form.occupation === 'self_employed' ||
    form.employmentStatus === 'self_employed';

  if (showResults && lastEligibility) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-sm font-semibold text-[#138A55] mb-1.5">Eligibility Assessment Complete</p>
            <h1 className="font-display text-3xl font-bold text-[#172B4D] tracking-tight">
              Your Scheme Eligibility Results
            </h1>
            <p className="text-sm text-[#667085] mt-1.5 max-w-2xl">
              Evaluated transparently against {lastEligibility.totalSchemesChecked} verified Central and State welfare schemes. Preliminary guidance does not substitute official department approval.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowResults(false)}
              className="px-4 py-2.5 text-sm font-semibold text-[#123B65] bg-white border border-[#CBD5E1] hover:border-[#123B65] rounded-lg"
            >
              Edit My Answers
            </button>
            <button
              type="button"
              onClick={() => navigate('/recommendations')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2B4B] rounded-lg"
            >
              <span>View Recommendations</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary Counters — Calculated strictly from actual backend results */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#138A55] mb-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Eligible Schemes</span>
            </div>
            <p className="font-mono tabular-nums text-3xl font-bold text-[#172B4D]">
              {lastEligibility.eligibleCount}
            </p>
            <p className="text-xs text-[#667085] mt-1">All verified mandatory rules satisfied</p>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#B45309] mb-2">
              <AlertCircle className="w-4 h-4 text-[#F39C35]" />
              <span>Potentially Eligible</span>
            </div>
            <p className="font-mono tabular-nums text-3xl font-bold text-[#172B4D]">
              {lastEligibility.potentiallyEligibleCount}
            </p>
            <p className="text-xs text-[#667085] mt-1">Missing details or official verification needed</p>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#667085] mb-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <span>Requirements Not Met</span>
            </div>
            <p className="font-mono tabular-nums text-3xl font-bold text-[#172B4D]">
              {lastEligibility.notEligibleCount}
            </p>
            <p className="text-xs text-[#667085] mt-1">At least one mandatory condition not satisfied</p>
          </div>
        </div>

        {/* Segmented Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#E2E8F0]/60 rounded-lg">
            {(
              [
                { key: 'ALL', label: `All (${lastEligibility.totalSchemesChecked})` },
                { key: 'ELIGIBLE', label: `Eligible (${lastEligibility.eligibleCount})` },
                { key: 'POTENTIALLY_ELIGIBLE', label: `Potentially Eligible (${lastEligibility.potentiallyEligibleCount})` },
                { key: 'NOT_ELIGIBLE', label: `Not Eligible (${lastEligibility.notEligibleCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setResultFilter(tab.key)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  resultFilter === tab.key
                    ? 'bg-white text-[#123B65] shadow-xs'
                    : 'text-[#475467] hover:text-[#172B4D]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Scheme Result Cards */}
        <div className="space-y-4">
          {filteredResults.length === 0 ? (
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-10 text-center text-sm text-[#667085]">
              No schemes fall under this filter for your current answers.
            </div>
          ) : (
            filteredResults.map((res) => {
              const expanded = expandedId === res.schemeId;
              const isSaved = savedIds.includes(res.schemeId);
              const isCompared = compareIds.includes(res.schemeId);

              return (
                <article
                  key={res.schemeId}
                  className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#667085]">
                          {res.status === 'ELIGIBLE' && (
                            <span className="inline-flex items-center gap-1 font-semibold text-[#138A55]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Eligible
                            </span>
                          )}
                          {res.status === 'POTENTIALLY_ELIGIBLE' && (
                            <span className="inline-flex items-center gap-1 font-semibold text-[#B45309]">
                              <AlertCircle className="w-3.5 h-3.5 text-[#F39C35]" />
                              Potentially Eligible
                            </span>
                          )}
                          {res.status === 'NOT_ELIGIBLE' && (
                            <span className="inline-flex items-center gap-1 font-semibold text-red-700">
                              <XCircle className="w-3.5 h-3.5 text-red-600" />
                              Not Eligible
                            </span>
                          )}
                          <span aria-hidden="true">·</span>
                          <span>{res.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{res.governmentLevel}</span>
                          {res.stateCoverage !== 'All India' && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-medium text-[#123B65]">{res.stateCoverage}</span>
                            </>
                          )}
                        </div>

                        <h2 className="font-display text-lg font-bold text-[#172B4D]">
                          <button
                            type="button"
                            onClick={() => navigate(`/schemes/${res.schemeSlug}`)}
                            className="text-left hover:text-[#123B65]"
                          >
                            {res.schemeName}
                          </button>
                        </h2>

                        <p className="text-sm font-medium text-[#138A55]">{res.mainBenefit}</p>
                        <p className="text-sm text-[#475467] leading-relaxed">{res.summaryExplanation}</p>

                        {/* Concise Summary Line of Rule Counts */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-[#667085] font-mono tabular-nums">
                          <span>Satisfied: {res.satisfiedConditions.length}</span>
                          {res.missingConditions.length > 0 && (
                            <span className="text-[#B45309]">Missing: {res.missingConditions.length}</span>
                          )}
                          {res.verificationRequiredConditions.length > 0 && (
                            <span className="text-[#123B65]">
                              Official check: {res.verificationRequiredConditions.length}
                            </span>
                          )}
                          {res.failedConditions.length > 0 && (
                            <span className="text-red-700">Not met: {res.failedConditions.length}</span>
                          )}
                        </div>
                      </div>

                      {/* Right Actions */}
                      <div className="flex flex-wrap lg:flex-col items-stretch gap-2 shrink-0 lg:min-w-[190px]">
                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? null : res.schemeId)}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#123B65] bg-[#F8FAFC] border border-[#CBD5E1] hover:border-[#123B65] rounded-lg"
                        >
                          <span>{expanded ? 'Hide Rule Breakdown' : 'Why This Result'}</span>
                          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <a
                          href={res.officialApplicationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#123B65] hover:bg-[#0D2B4B] rounded-lg"
                        >
                          <span>Official Portal</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleSaveScheme(res.schemeId)}
                            className={`flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border ${
                              isSaved
                                ? 'border-[#138A55] bg-[#138A55]/10 text-[#138A55]'
                                : 'border-[#E2E8F0] text-[#475467] hover:border-[#123B65]/40'
                            }`}
                          >
                            <Bookmark className="w-3.5 h-3.5" fill={isSaved ? 'currentColor' : 'none'} />
                            <span>{isSaved ? 'Saved' : 'Save'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleCompareScheme(res.schemeId)}
                            className={`flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border ${
                              isCompared
                                ? 'border-[#123B65] bg-[#123B65]/10 text-[#123B65]'
                                : 'border-[#E2E8F0] text-[#475467] hover:border-[#123B65]/40'
                            }`}
                          >
                            {isCompared ? <Check className="w-3.5 h-3.5" /> : <Scale className="w-3.5 h-3.5" />}
                            <span>{isCompared ? 'Added' : 'Compare'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Transparent Rule-by-Rule Breakdown & Documents */}
                  {expanded && (
                    <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] p-6 space-y-6">
                      <div>
                        <h3 className="font-display text-sm font-bold text-[#172B4D] mb-3">
                          Condition-by-Condition Evaluation
                        </h3>
                        <div className="overflow-x-auto bg-white border border-[#E2E8F0] rounded-lg">
                          <table className="w-full text-left border-collapse text-xs sm:text-sm">
                            <thead>
                              <tr className="border-b border-[#E2E8F0] text-[#667085] bg-[#F8FAFC]">
                                <th className="py-2.5 px-4 font-semibold">Condition</th>
                                <th className="py-2.5 px-4 font-semibold">Your Answer</th>
                                <th className="py-2.5 px-4 font-semibold">Evaluation</th>
                                <th className="py-2.5 px-4 font-semibold">Explanation</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F1F5F9]">
                              {res.allEvaluations.map((ev) => (
                                <tr key={ev.ruleId}>
                                  <td className="py-3 px-4 align-top">
                                    <p className="font-medium text-[#172B4D]">{ev.label}</p>
                                    <p className="text-xs text-[#667085] mt-0.5">{ev.requirement}</p>
                                  </td>
                                  <td className="py-3 px-4 align-top font-mono tabular-nums text-[#334155]">
                                    {ev.userValue}
                                  </td>
                                  <td className="py-3 px-4 align-top whitespace-nowrap">
                                    {ev.status === 'PASSED' && (
                                      <span className="inline-flex items-center gap-1 font-semibold text-[#138A55]">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Satisfied
                                      </span>
                                    )}
                                    {ev.status === 'FAILED' && (
                                      <span className="inline-flex items-center gap-1 font-semibold text-red-700">
                                        <XCircle className="w-3.5 h-3.5" />
                                        Not Satisfied
                                      </span>
                                    )}
                                    {ev.status === 'MISSING' && (
                                      <span className="inline-flex items-center gap-1 font-semibold text-[#B45309]">
                                        <HelpCircle className="w-3.5 h-3.5 text-[#F39C35]" />
                                        Missing Info
                                      </span>
                                    )}
                                    {ev.status === 'VERIFICATION_REQUIRED' && (
                                      <span className="inline-flex items-center gap-1 font-semibold text-[#123B65]">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        Official Verification
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 align-top text-[#475467]">
                                    <p>{ev.explanation}</p>
                                    {ev.source && (
                                      <p className="text-xs text-[#667085] mt-1">Source: {ev.source}</p>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-display text-sm font-bold text-[#172B4D] mb-2">
                            Required Documents
                          </h4>
                          <ul className="space-y-1.5 text-sm text-[#475467]">
                            {res.documents.map((doc, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-[#123B65] font-bold">·</span>
                                <span>{doc}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex flex-col justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/assistant?q=${encodeURIComponent(
                                  `Why was I marked ${res.status.replace('_', ' ')} for ${res.schemeName} and what should I do next?`
                                )}`
                              )
                            }
                            className="inline-flex items-center gap-2 text-xs font-semibold text-[#123B65] hover:underline"
                          >
                            <Bot className="w-4 h-4" />
                            <span>Ask Yojana Mitra to explain this result</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/schemes/${res.schemeSlug}`)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#138A55] hover:underline"
                          >
                            <span>Open full scheme guide &amp; application steps</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm font-semibold text-[#138A55] mb-1.5">Smart Eligibility Checker</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-[#172B4D] tracking-tight">
              Check Your Government Scheme Eligibility
            </h1>
            <p className="text-sm text-[#667085] mt-1.5">
              Answer only the questions that apply to you. Leave optional fields blank if unsure — we will transparently flag any missing information.
            </p>
          </div>
          {lastEligibility && (
            <button
              type="button"
              onClick={() => setShowResults(true)}
              className="text-xs font-semibold text-[#123B65] hover:underline whitespace-nowrap"
            >
              View previous results ({lastEligibility.eligibleCount} eligible)
            </button>
          )}
        </div>
      </div>

      {/* Progress Stepper */}
      <nav aria-label="Eligibility Steps" className="mb-8">
        <div className="flex items-center justify-between text-xs text-[#667085] mb-2">
          <span className="font-semibold text-[#123B65]">
            Step {step} of {STEPS.length}: {STEPS[step - 1].title}
          </span>
          <span className="font-mono tabular-nums">{Math.round((step / STEPS.length) * 100)}%</span>
        </div>
        <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#123B65] transition-all duration-200"
            style={{ width: `${(step / STEPS.length) * 100}%` }}
          />
        </div>
        <div className="hidden sm:grid grid-cols-5 gap-2 mt-3">
          {STEPS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              className={`text-left text-xs py-1 transition-colors ${
                step === s.id
                  ? 'font-semibold text-[#123B65]'
                  : s.id < step
                  ? 'text-[#138A55] font-medium'
                  : 'text-[#667085]'
              }`}
            >
              0{s.id}. {s.title}
            </button>
          ))}
        </div>
      </nav>

      {/* Privacy Notice */}
      <div className="mb-6 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 flex items-center gap-3 text-xs text-[#475467]">
        <ShieldCheck className="w-4 h-4 text-[#138A55] shrink-0" />
        <span>
          Privacy-first: We never ask for your Aadhaar number, bank account details, or OTP. Your answers are used only to match verified scheme eligibility rules.
        </span>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Questionnaire Form Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8">
        {/* STEP 1: Personal Information */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl font-bold text-[#172B4D]">
                Step 1 – Personal Information
              </h2>
              <p className="text-sm text-[#667085] mt-1">
                Used to check age thresholds, state-specific programmes, and rural/urban eligibility.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="q-age" className="block text-sm font-medium text-[#172B4D] mb-1.5">
                  Age (in completed years)
                </label>
                <input
                  id="q-age"
                  type="number"
                  min={0}
                  max={120}
                  value={form.age ?? ''}
                  onChange={(e) =>
                    updateField('age', e.target.value === '' ? null : Math.max(0, Number(e.target.value)))
                  }
                  placeholder="e.g., 24"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg focus:border-[#123B65] focus:outline-none font-mono tabular-nums"
                />
              </div>

              <div>
                <label htmlFor="q-gender" className="block text-sm font-medium text-[#172B4D] mb-1.5">
                  Gender <span className="text-xs font-normal text-[#667085]">(Optional)</span>
                </label>
                <select
                  id="q-gender"
                  value={form.gender || ''}
                  onChange={(e) =>
                    updateField('gender', e.target.value as CitizenProfile['gender'])
                  }
                  className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg bg-white focus:border-[#123B65] focus:outline-none"
                >
                  <option value="">Prefer not to specify / Skip</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="q-state" className="block text-sm font-medium text-[#172B4D] mb-1.5">
                  State / Union Territory
                </label>
                <select
                  id="q-state"
                  value={form.state || ''}
                  onChange={(e) => updateField('state', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg bg-white focus:border-[#123B65] focus:outline-none"
                >
                  <option value="">Select your State or UT</option>
                  {INDIAN_STATES_AND_UTS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="q-district" className="block text-sm font-medium text-[#172B4D] mb-1.5">
                  District <span className="text-xs font-normal text-[#667085]">(Optional)</span>
                </label>
                <input
                  id="q-district"
                  type="text"
                  value={form.district || ''}
                  onChange={(e) => updateField('district', e.target.value)}
                  placeholder="e.g., Lucknow, Pune, Jaipur"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg focus:border-[#123B65] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <span className="block text-sm font-medium text-[#172B4D] mb-2">
                  Area of Residence
                </span>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  {[
                    { value: 'rural', label: 'Rural (Village / Gram Panchayat)' },
                    { value: 'urban', label: 'Urban (Town / Municipality / City)' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        updateField('residenceType', opt.value as 'rural' | 'urban')
                      }
                      className={`px-4 py-3 text-left text-sm font-medium rounded-lg border transition-colors ${
                        form.residenceType === opt.value
                          ? 'border-[#123B65] bg-[#123B65]/8 text-[#123B65]'
                          : 'border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Financial Information */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl font-bold text-[#172B4D]">
                Step 2 – Financial Information
              </h2>
              <p className="text-sm text-[#667085] mt-1">
                Many scholarships, housing subsidies, and financial assistance schemes specify an annual family income ceiling or BPL priority status.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label htmlFor="q-income" className="block text-sm font-medium text-[#172B4D] mb-1.5">
                  Approximate Annual Family Income (in ₹ INR)
                </label>
                <input
                  id="q-income"
                  type="number"
                  min={0}
                  step={10000}
                  value={form.annualFamilyIncome ?? ''}
                  onChange={(e) =>
                    updateField(
                      'annualFamilyIncome',
                      e.target.value === '' ? null : Math.max(0, Number(e.target.value))
                    )
                  }
                  placeholder="e.g., 250000 for ₹2.5 Lakh"
                  className="w-full max-w-md px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg focus:border-[#123B65] focus:outline-none font-mono tabular-nums"
                />
                {typeof form.annualFamilyIncome === 'number' && (
                  <p className="text-xs text-[#138A55] font-mono tabular-nums mt-1.5">
                    Entered: ₹{form.annualFamilyIncome.toLocaleString('en-IN')} per year
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="q-bpl" className="block text-sm font-medium text-[#172B4D] mb-1.5">
                  Below Poverty Line (BPL / Antyodaya / SECC) Status{' '}
                  <span className="text-xs font-normal text-[#667085]">(If relevant)</span>
                </label>
                <select
                  id="q-bpl"
                  value={form.bplStatus || ''}
                  onChange={(e) =>
                    updateField('bplStatus', e.target.value as CitizenProfile['bplStatus'])
                  }
                  className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg bg-white focus:border-[#123B65] focus:outline-none"
                >
                  <option value="">Not specified</option>
                  <option value="yes">Yes — BPL / Antyodaya / SECC listed</option>
                  <option value="no">No — Above Poverty Line (APL)</option>
                  <option value="unknown">Unsure</option>
                </select>
              </div>

              <div>
                <label htmlFor="q-taxpayer" className="block text-sm font-medium text-[#172B4D] mb-1.5">
                  Are you (or family head) an Income-Tax Payer?{' '}
                  <span className="text-xs font-normal text-[#667085]">(Optional)</span>
                </label>
                <select
                  id="q-taxpayer"
                  value={form.isIncomeTaxPayer || ''}
                  onChange={(e) =>
                    updateField('isIncomeTaxPayer', e.target.value as CitizenProfile['isIncomeTaxPayer'])
                  }
                  className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg bg-white focus:border-[#123B65] focus:outline-none"
                >
                  <option value="">Not specified</option>
                  <option value="no">No — Do not pay income tax</option>
                  <option value="yes">Yes — Income-tax payer</option>
                </select>
                <p className="text-xs text-[#667085] mt-1">
                  Required by schemes such as PM-KISAN, Atal Pension Yojana, and Ladki Bahin Yojana.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Employment & Education */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl font-bold text-[#172B4D]">
                Step 3 – Employment and Education
              </h2>
              <p className="text-sm text-[#667085] mt-1">
                Helps identify scholarships, skill training, agricultural income support, and micro-enterprise schemes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="q-occupation" className="block text-sm font-medium text-[#172B4D] mb-1.5">
                  Primary Occupation
                </label>
                <select
                  id="q-occupation"
                  value={form.occupation || ''}
                  onChange={(e) => updateField('occupation', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg bg-white focus:border-[#123B65] focus:outline-none"
                >
                  <option value="">Select occupation</option>
                  {OCCUPATION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="q-emp" className="block text-sm font-medium text-[#172B4D] mb-1.5">
                  Employment Status
                </label>
                <select
                  id="q-emp"
                  value={form.employmentStatus || ''}
                  onChange={(e) => updateField('employmentStatus', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg bg-white focus:border-[#123B65] focus:outline-none"
                >
                  <option value="">Select status</option>
                  {EMPLOYMENT_STATUS_OPTIONS.map((e) => (
                    <option key={e.value} value={e.value}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="q-edu" className="block text-sm font-medium text-[#172B4D] mb-1.5">
                  Education Level
                </label>
                <select
                  id="q-edu"
                  value={form.educationLevel || ''}
                  onChange={(e) => updateField('educationLevel', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg bg-white focus:border-[#123B65] focus:outline-none"
                >
                  <option value="">Select education level</option>
                  {EDUCATION_LEVEL_OPTIONS.map((ed) => (
                    <option key={ed.value} value={ed.value}>
                      {ed.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="block text-sm font-medium text-[#172B4D] mb-2">
                  Currently Enrolled as a Student?
                </span>
                <div className="flex items-center gap-3">
                  {[
                    { val: true, label: 'Yes' },
                    { val: false, label: 'No' },
                  ].map((opt) => (
                    <button
                      key={String(opt.val)}
                      type="button"
                      onClick={() => updateField('isStudent', opt.val)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg border ${
                        form.isStudent === opt.val
                          ? 'border-[#123B65] bg-[#123B65]/8 text-[#123B65]'
                          : 'border-[#CBD5E1] text-[#334155]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <span className="block text-sm font-medium text-[#172B4D] mb-2">
                  Are you (or your household) engaged in Farming / Agriculture?{' '}
                  <span className="text-xs font-normal text-[#667085]">(Optional)</span>
                </span>
                <div className="flex items-center gap-3">
                  {[
                    { val: true, label: 'Yes, Farmer Household' },
                    { val: false, label: 'No' },
                  ].map((opt) => (
                    <button
                      key={String(opt.val)}
                      type="button"
                      onClick={() => updateField('isFarmer', opt.val)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg border ${
                        form.isFarmer === opt.val
                          ? 'border-[#123B65] bg-[#123B65]/8 text-[#123B65]'
                          : 'border-[#CBD5E1] text-[#334155]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Household Information */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl font-bold text-[#172B4D]">
                Step 4 – Household Information
              </h2>
              <p className="text-sm text-[#667085] mt-1">
                Used for family-based housing, healthcare, and child welfare schemes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label htmlFor="q-famsize" className="block text-sm font-medium text-[#172B4D] mb-1.5">
                  Family Size <span className="text-xs font-normal text-[#667085]">(Optional)</span>
                </label>
                <input
                  id="q-famsize"
                  type="number"
                  min={1}
                  max={30}
                  value={form.familySize ?? ''}
                  onChange={(e) =>
                    updateField('familySize', e.target.value === '' ? null : Number(e.target.value))
                  }
                  placeholder="e.g., 4"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg font-mono tabular-nums"
                />
              </div>

              <div>
                <label htmlFor="q-deps" className="block text-sm font-medium text-[#172B4D] mb-1.5">
                  Dependents <span className="text-xs font-normal text-[#667085]">(Optional)</span>
                </label>
                <input
                  id="q-deps"
                  type="number"
                  min={0}
                  max={25}
                  value={form.dependentsCount ?? ''}
                  onChange={(e) =>
                    updateField('dependentsCount', e.target.value === '' ? null : Number(e.target.value))
                  }
                  placeholder="e.g., 2"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg font-mono tabular-nums"
                />
              </div>

              <div>
                <label htmlFor="q-children" className="block text-sm font-medium text-[#172B4D] mb-1.5">
                  Number of Children <span className="text-xs font-normal text-[#667085]">(Optional)</span>
                </label>
                <input
                  id="q-children"
                  type="number"
                  min={0}
                  max={15}
                  value={form.childrenCount ?? ''}
                  onChange={(e) =>
                    updateField('childrenCount', e.target.value === '' ? null : Number(e.target.value))
                  }
                  placeholder="e.g., 1"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg font-mono tabular-nums"
                />
              </div>

              <div className="sm:col-span-3 pt-2">
                <span className="block text-sm font-medium text-[#172B4D] mb-2">
                  Does your family already own a pucca (all-weather concrete/brick) house anywhere in India?{' '}
                  <span className="text-xs font-normal text-[#667085]">(Used for PMAY-G / PMAY-U housing schemes)</span>
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  {[
                    { val: false, label: 'No — Do not own a pucca house' },
                    { val: true, label: 'Yes — Own a pucca house' },
                  ].map((opt) => (
                    <button
                      key={String(opt.val)}
                      type="button"
                      onClick={() => updateField('ownsPuccaHouse', opt.val)}
                      className={`px-4 py-2.5 text-sm font-medium rounded-lg border ${
                        form.ownsPuccaHouse === opt.val
                          ? 'border-[#123B65] bg-[#123B65]/8 text-[#123B65]'
                          : 'border-[#CBD5E1] text-[#334155]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Conditional Scheme-Specific Questions */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl font-bold text-[#172B4D]">
                Step 5 – Additional Scheme-Specific Questions
              </h2>
              <p className="text-sm text-[#667085] mt-1">
                We only show extra questions relevant to the profile details you provided in Steps 1–4.
              </p>
            </div>

            <div className="space-y-6">
              {showFarmerQuestions && (
                <div className="p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-4">
                  <h3 className="font-display text-sm font-bold text-[#172B4D]">
                    Agriculture &amp; Landholding Details (for PM-KISAN)
                  </h3>
                  <div>
                    <span className="block text-sm font-medium text-[#172B4D] mb-2">
                      Does your farmer family hold cultivable agricultural land in official land records?
                    </span>
                    <div className="flex items-center gap-3">
                      {[
                        { val: true, label: 'Yes, owns cultivable land' },
                        { val: false, label: 'No, landless / tenant farmer' },
                      ].map((opt) => (
                        <button
                          key={String(opt.val)}
                          type="button"
                          onClick={() => updateField('ownsCultivableLand', opt.val)}
                          className={`px-4 py-2 text-sm font-medium rounded-lg border ${
                            form.ownsCultivableLand === opt.val
                              ? 'border-[#123B65] bg-white text-[#123B65]'
                              : 'border-[#CBD5E1] bg-white text-[#334155]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {showChildQuestions && (
                <div className="p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-3">
                  <h3 className="font-display text-sm font-bold text-[#172B4D]">
                    Girl Child Welfare Details (for Sukanya Samriddhi Yojana)
                  </h3>
                  <span className="block text-sm font-medium text-[#172B4D]">
                    Do you have a girl child below 10 years of age?
                  </span>
                  <div className="flex items-center gap-3">
                    {[
                      { val: true, label: 'Yes' },
                      { val: false, label: 'No' },
                    ].map((opt) => (
                      <button
                        key={String(opt.val)}
                        type="button"
                        onClick={() => updateField('hasGirlChildUnder10', opt.val)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg border ${
                          form.hasGirlChildUnder10 === opt.val
                            ? 'border-[#123B65] bg-white text-[#123B65]'
                            : 'border-[#CBD5E1] bg-white text-[#334155]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showArtisanQuestions && (
                <div className="p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-3">
                  <h3 className="font-display text-sm font-bold text-[#172B4D]">
                    Traditional Artisan Trade (for PM Vishwakarma Yojana)
                  </h3>
                  <span className="block text-sm font-medium text-[#172B4D]">
                    Are you engaged in one of the 18 traditional hand-and-tool trades (e.g., carpentry, tailoring, pottery, blacksmithing, masonry, weaving)?
                  </span>
                  <div className="flex items-center gap-3">
                    {[
                      { val: true, label: 'Yes, traditional artisan trade' },
                      { val: false, label: 'No' },
                    ].map((opt) => (
                      <button
                        key={String(opt.val)}
                        type="button"
                        onClick={() => updateField('isTraditionalArtisan', opt.val)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg border ${
                          form.isTraditionalArtisan === opt.val
                            ? 'border-[#123B65] bg-white text-[#123B65]'
                            : 'border-[#CBD5E1] bg-white text-[#334155]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* General optional disability question */}
              <div className="p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-3">
                <h3 className="font-display text-sm font-bold text-[#172B4D]">
                  Disability Support <span className="font-normal text-[#667085]">(Optional)</span>
                </h3>
                <span className="block text-sm text-[#475467]">
                  Does the applicant have a benchmark disability (PwD)?
                </span>
                <div className="flex items-center gap-3">
                  {[
                    { val: true, label: 'Yes' },
                    { val: false, label: 'No' },
                  ].map((opt) => (
                    <button
                      key={String(opt.val)}
                      type="button"
                      onClick={() => updateField('hasDisability', opt.val)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg border ${
                        form.hasDisability === opt.val
                          ? 'border-[#123B65] bg-white text-[#123B65]'
                          : 'border-[#CBD5E1] bg-white text-[#334155]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {user && (
                <label className="flex items-center gap-2.5 text-sm text-[#334155] cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={saveToAccount}
                    onChange={(e) => setSaveToAccount(e.target.checked)}
                    className="w-4 h-4 rounded border-[#CBD5E1] text-[#123B65]"
                  />
                  <span>Save these details to my Yojana Sarthi profile for future checks and recommendations</span>
                </label>
              )}
            </div>
          </div>
        )}

        {/* Navigation Footer */}
        <div className="mt-8 pt-6 border-t border-[#F1F5F9] flex items-center justify-between gap-4">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-[#475467] bg-white border border-[#CBD5E1] rounded-lg hover:bg-[#F8FAFC] disabled:opacity-40"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(5, s + 1))}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2B4B] rounded-lg"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#138A55] hover:bg-[#0F7044] rounded-lg disabled:opacity-60"
            >
              <span>{submitting ? 'Evaluating Rules...' : 'Evaluate My Eligibility'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
