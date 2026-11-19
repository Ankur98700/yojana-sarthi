import {
  AlertCircle,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  ClipboardList,
  Clock,
  ExternalLink,
  FileCheck2,
  Save,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  EDUCATION_LEVEL_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  INDIAN_STATES_AND_UTS,
  OCCUPATION_OPTIONS,
} from '../constants/india.ts';
import { useApp } from '../context/AppContext.tsx';
import { api, type DashboardResponse } from '../lib/api.ts';
import type { CitizenProfile } from '../types.ts';

const CHECKED_DOCS_KEY = 'yojana_sarthi_checked_docs';

export function UserDashboardPage() {
  const { user, authLoading, navigate, refreshUser, toggleSaveScheme, notify } = useApp();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'saved' | 'checklist' | 'history'>('overview');
  const [profileForm, setProfileForm] = useState<CitizenProfile>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(CHECKED_DOCS_KEY) || '{}');
    } catch {
      return {};
    }
  });

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.getDashboard();
      setData(res);
      setProfileForm({ name: res.user.name, ...res.user.profile });
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Unable to load dashboard.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      loadDashboard();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [authLoading, user]);

  const toggleDocChecked = (doc: string) => {
    setCheckedDocs((prev) => {
      const next = { ...prev, [doc]: !prev[doc] };
      try {
        localStorage.setItem(CHECKED_DOCS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.updateProfile(profileForm);
      await refreshUser();
      await loadDashboard();
      notify('Your citizen profile has been updated.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to update profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 h-64 animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-10">
          <User className="w-10 h-10 text-[#123B65] mx-auto mb-3" />
          <h1 className="font-display text-2xl font-bold text-[#172B4D] mb-2">
            Log in to access your Citizen Dashboard
          </h1>
          <p className="text-sm text-[#667085] mb-6">
            Save welfare schemes, track your document checklist, and review your past eligibility evaluations in one place.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#123B65] rounded-lg"
            >
              Log In / Register
            </button>
            <button
              type="button"
              onClick={() => navigate('/eligibility')}
              className="px-5 py-2.5 text-sm font-semibold text-[#123B65] border border-[#CBD5E1] rounded-lg"
            >
              Check Eligibility as Guest
            </button>
          </div>
        </div>
      </div>
    );
  }

  const eligibleSchemes = data?.eligibilitySummary?.results.filter((r) => r.status === 'ELIGIBLE') || [];
  const potentialSchemes =
    data?.eligibilitySummary?.results.filter((r) => r.status === 'POTENTIALLY_ELIGIBLE') || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-sm font-semibold text-[#138A55] mb-1">Citizen Dashboard</p>
          <h1 className="font-display text-3xl font-bold text-[#172B4D] tracking-tight">
            Welcome, {user.name}
          </h1>
          <p className="text-sm text-[#667085] mt-1">
            Manage your household profile, saved welfare schemes, document readiness, and eligibility history.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/eligibility')}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2B4B] rounded-lg whitespace-nowrap shrink-0"
        >
          <span>Run Eligibility Check</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Real Stats Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
          <p className="text-xs font-medium text-[#667085]">Profile Completion</p>
          <p className="font-mono tabular-nums text-2xl font-bold text-[#123B65] mt-1">
            {data?.profileCompletion.percentage ?? 0}%
          </p>
          <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-[#138A55]"
              style={{ width: `${data?.profileCompletion.percentage ?? 0}%` }}
            />
          </div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
          <p className="text-xs font-medium text-[#667085]">Eligible Schemes</p>
          <p className="font-mono tabular-nums text-2xl font-bold text-[#138A55] mt-1">
            {data?.eligibilitySummary ? data.eligibilitySummary.eligibleCount : '—'}
          </p>
          <p className="text-xs text-[#667085] mt-1">
            {data?.eligibilitySummary ? 'From your saved profile' : 'Complete profile to evaluate'}
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
          <p className="text-xs font-medium text-[#667085]">Potentially Eligible</p>
          <p className="font-mono tabular-nums text-2xl font-bold text-[#B45309] mt-1">
            {data?.eligibilitySummary ? data.eligibilitySummary.potentiallyEligibleCount : '—'}
          </p>
          <p className="text-xs text-[#667085] mt-1">Pending info or portal check</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
          <p className="text-xs font-medium text-[#667085]">Saved Schemes</p>
          <p className="font-mono tabular-nums text-2xl font-bold text-[#172B4D] mt-1">
            {data?.savedSchemes.length ?? 0}
          </p>
          <p className="text-xs text-[#667085] mt-1">Bookmarked for follow-up</p>
        </div>
      </div>

      {/* Dashboard Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-[#E2E8F0]/60 rounded-lg mb-8 w-fit">
        {(
          [
            { id: 'overview', label: 'Overview' },
            { id: 'profile', label: 'My Profile' },
            { id: 'saved', label: `Saved Schemes (${data?.savedSchemes.length ?? 0})` },
            { id: 'checklist', label: `Document Checklist (${data?.documentChecklist.length ?? 0})` },
            { id: 'history', label: `Eligibility History (${data?.recentChecks.length ?? 0})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeTab === tab.id ? 'bg-white text-[#123B65] shadow-xs' : 'text-[#475467] hover:text-[#172B4D]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && data && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            {/* Eligible & Potentially Eligible Schemes */}
            <section className="bg-white border border-[#E2E8F0] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-bold text-[#172B4D]">
                  Eligible &amp; Potentially Eligible Schemes
                </h2>
                <button
                  type="button"
                  onClick={() => navigate('/eligibility')}
                  className="text-xs font-semibold text-[#123B65] hover:underline"
                >
                  Full eligibility breakdown
                </button>
              </div>

              {!data.eligibilitySummary ? (
                <div className="py-6 text-center space-y-3">
                  <p className="text-sm text-[#667085]">
                    Complete your household profile or run the Eligibility Checker to view real-time eligible schemes.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/eligibility')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#123B65] rounded-lg"
                  >
                    Start Eligibility Questionnaire
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#F1F5F9]">
                  {[...eligibleSchemes, ...potentialSchemes].slice(0, 6).map((item) => (
                    <div key={item.schemeId} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-xs mb-1">
                          {item.status === 'ELIGIBLE' ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-[#138A55]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Eligible
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-semibold text-[#B45309]">
                              <AlertCircle className="w-3.5 h-3.5 text-[#F39C35]" />
                              Potentially Eligible
                            </span>
                          )}
                          <span className="text-[#667085]">· {item.category}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(`/schemes/${item.schemeSlug}`)}
                          className="font-display text-sm font-bold text-[#172B4D] hover:text-[#123B65] text-left"
                        >
                          {item.schemeName}
                        </button>
                        <p className="text-xs text-[#667085] mt-0.5">{item.mainBenefit}</p>
                      </div>
                      <a
                        href={item.officialApplicationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#123B65] hover:underline whitespace-nowrap shrink-0"
                      >
                        <span>Official Portal</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                  {eligibleSchemes.length + potentialSchemes.length === 0 && (
                    <p className="text-sm text-[#667085] py-4">
                      No schemes currently match your profile. Update your profile details or explore all schemes.
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* Recommended Schemes */}
            <section className="bg-white border border-[#E2E8F0] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-bold text-[#172B4D]">Recommended for You</h2>
                <button
                  type="button"
                  onClick={() => navigate('/recommendations')}
                  className="text-xs font-semibold text-[#123B65] hover:underline"
                >
                  See all recommendations
                </button>
              </div>
              {data.recommendations.length === 0 ? (
                <p className="text-sm text-[#667085]">
                  Fill in your profile details to generate explainable scheme recommendations.
                </p>
              ) : (
                <div className="divide-y divide-[#F1F5F9]">
                  {data.recommendations.slice(0, 4).map((rec) => (
                    <div key={rec.scheme.id} className="py-3.5 first:pt-0 last:pb-0">
                      <button
                        type="button"
                        onClick={() => navigate(`/schemes/${rec.scheme.slug}`)}
                        className="font-display text-sm font-bold text-[#172B4D] hover:text-[#123B65] text-left"
                      >
                        {rec.scheme.name}
                      </button>
                      <p className="text-xs text-[#475467] mt-1">{rec.recommendationReason}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right Sidebar Column */}
          <div className="lg:col-span-4 space-y-6">
            {data.profileCompletion.missingFields.length > 0 && (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
                <h3 className="font-display text-sm font-bold text-[#172B4D] mb-2">
                  Complete Your Profile
                </h3>
                <p className="text-xs text-[#667085] mb-3">
                  Adding these details helps convert &ldquo;Potentially Eligible&rdquo; results into clear answers:
                </p>
                <ul className="space-y-1 text-xs text-[#475467] mb-4">
                  {data.profileCompletion.missingFields.slice(0, 5).map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className="w-full py-2 text-xs font-semibold text-white bg-[#123B65] rounded-lg"
                >
                  Update Profile
                </button>
              </div>
            )}

            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-[#123B65]" />
                <h3 className="font-display text-sm font-bold text-[#172B4D]">Recently Viewed Schemes</h3>
              </div>
              {data.recentlyViewed.length === 0 ? (
                <p className="text-xs text-[#667085]">
                  Schemes you open in the directory will appear here automatically.
                </p>
              ) : (
                <ul className="space-y-3 text-xs">
                  {data.recentlyViewed.map((rv) => (
                    <li key={rv.scheme.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/schemes/${rv.scheme.slug}`)}
                        className="font-semibold text-[#172B4D] hover:text-[#123B65] text-left block"
                      >
                        {rv.scheme.name}
                      </button>
                      <span className="text-[#667085]">{rv.scheme.category}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: PROFILE EDITOR */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8 space-y-6 max-w-4xl">
          <div>
            <h2 className="font-display text-xl font-bold text-[#172B4D]">Citizen Profile</h2>
            <p className="text-xs sm:text-sm text-[#667085] mt-1">
              Only general eligibility details are stored. Never enter Aadhaar, PAN, or bank numbers here.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">Full Name</label>
              <input
                type="text"
                value={profileForm.name || ''}
                onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">Age</label>
              <input
                type="number"
                min={0}
                max={120}
                value={profileForm.age ?? ''}
                onChange={(e) =>
                  setProfileForm((p) => ({
                    ...p,
                    age: e.target.value === '' ? null : Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                Gender <span className="font-normal text-[#667085]">(Optional)</span>
              </label>
              <select
                value={profileForm.gender || ''}
                onChange={(e) =>
                  setProfileForm((p) => ({ ...p, gender: e.target.value as CitizenProfile['gender'] }))
                }
                className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg bg-white"
              >
                <option value="">Not specified</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">State / UT</label>
              <select
                value={profileForm.state || ''}
                onChange={(e) => setProfileForm((p) => ({ ...p, state: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg bg-white"
              >
                <option value="">Select state</option>
                {INDIAN_STATES_AND_UTS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                District <span className="font-normal text-[#667085]">(Optional)</span>
              </label>
              <input
                type="text"
                value={profileForm.district || ''}
                onChange={(e) => setProfileForm((p) => ({ ...p, district: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">Residence Type</label>
              <select
                value={profileForm.residenceType || ''}
                onChange={(e) =>
                  setProfileForm((p) => ({
                    ...p,
                    residenceType: e.target.value as CitizenProfile['residenceType'],
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg bg-white"
              >
                <option value="">Not specified</option>
                <option value="rural">Rural</option>
                <option value="urban">Urban</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                Annual Family Income (₹)
              </label>
              <input
                type="number"
                min={0}
                value={profileForm.annualFamilyIncome ?? ''}
                onChange={(e) =>
                  setProfileForm((p) => ({
                    ...p,
                    annualFamilyIncome: e.target.value === '' ? null : Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">BPL Status</label>
              <select
                value={profileForm.bplStatus || ''}
                onChange={(e) =>
                  setProfileForm((p) => ({ ...p, bplStatus: e.target.value as CitizenProfile['bplStatus'] }))
                }
                className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg bg-white"
              >
                <option value="">Not specified</option>
                <option value="yes">Yes (BPL / SECC)</option>
                <option value="no">No</option>
                <option value="unknown">Unsure</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">Income-Tax Payer?</label>
              <select
                value={profileForm.isIncomeTaxPayer || ''}
                onChange={(e) =>
                  setProfileForm((p) => ({
                    ...p,
                    isIncomeTaxPayer: e.target.value as CitizenProfile['isIncomeTaxPayer'],
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg bg-white"
              >
                <option value="">Not specified</option>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">Occupation</label>
              <select
                value={profileForm.occupation || ''}
                onChange={(e) => setProfileForm((p) => ({ ...p, occupation: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg bg-white"
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
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">Employment Status</label>
              <select
                value={profileForm.employmentStatus || ''}
                onChange={(e) => setProfileForm((p) => ({ ...p, employmentStatus: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg bg-white"
              >
                <option value="">Select status</option>
                {EMPLOYMENT_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">Education Level</label>
              <select
                value={profileForm.educationLevel || ''}
                onChange={(e) => setProfileForm((p) => ({ ...p, educationLevel: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg bg-white"
              >
                <option value="">Select education</option>
                {EDUCATION_LEVEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">Family Size</label>
              <input
                type="number"
                min={1}
                max={30}
                value={profileForm.familySize ?? ''}
                onChange={(e) =>
                  setProfileForm((p) => ({
                    ...p,
                    familySize: e.target.value === '' ? null : Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">Number of Children</label>
              <input
                type="number"
                min={0}
                max={15}
                value={profileForm.childrenCount ?? ''}
                onChange={(e) =>
                  setProfileForm((p) => ({
                    ...p,
                    childrenCount: e.target.value === '' ? null : Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#F1F5F9]">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2B4B] rounded-lg disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{savingProfile ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB: SAVED SCHEMES */}
      {activeTab === 'saved' && data && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
          <h2 className="font-display text-lg font-bold text-[#172B4D] mb-4">Saved Welfare Schemes</h2>
          {data.savedSchemes.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <Bookmark className="w-8 h-8 text-[#94A3B8] mx-auto" />
              <p className="text-sm text-[#667085]">You haven&apos;t saved any schemes yet.</p>
              <button
                type="button"
                onClick={() => navigate('/explore')}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#123B65] rounded-lg"
              >
                Explore Schemes
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#F1F5F9]">
              {data.savedSchemes.map(({ scheme, savedAt }) => (
                <div key={scheme.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-[#667085] mb-1">
                      <span className="text-[#138A55] font-medium">{scheme.category}</span> · Saved on{' '}
                      <span className="font-mono tabular-nums">{savedAt.slice(0, 10)}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate(`/schemes/${scheme.slug}`)}
                      className="font-display text-base font-bold text-[#172B4D] hover:text-[#123B65] text-left"
                    >
                      {scheme.name}
                    </button>
                    <p className="text-xs text-[#475467] mt-0.5">{scheme.mainBenefit}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <a
                      href={scheme.officialApplicationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#123B65] hover:underline"
                    >
                      <span>Official Portal</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={async () => {
                        await toggleSaveScheme(scheme.id);
                        loadDashboard();
                      }}
                      className="text-xs font-medium text-[#667085] hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: DOCUMENT CHECKLIST */}
      {activeTab === 'checklist' && data && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <FileCheck2 className="w-5 h-5 text-[#123B65]" />
            <h2 className="font-display text-lg font-bold text-[#172B4D]">
              Personal Document Readiness Checklist
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#667085] mb-6">
            Compiled automatically from your saved schemes and eligible schemes so you can prepare originals before visiting an official portal or CSC.
          </p>

          {data.documentChecklist.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-[#667085]">
                Save schemes or complete your eligibility check to build your personalized document checklist.
              </p>
              <button
                type="button"
                onClick={() => navigate('/eligibility')}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#123B65] rounded-lg"
              >
                Check Eligibility
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#F1F5F9]">
              {data.documentChecklist.map((item) => {
                const isChecked = Boolean(checkedDocs[item.document]);
                return (
                  <label
                    key={item.document}
                    className="py-3.5 flex items-start gap-3 cursor-pointer hover:bg-[#F8FAFC] px-2 rounded-lg"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleDocChecked(item.document)}
                      className="mt-1 w-4 h-4 rounded border-[#CBD5E1] text-[#138A55]"
                    />
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          isChecked ? 'line-through text-[#94A3B8]' : 'text-[#172B4D]'
                        }`}
                      >
                        {item.document}
                      </p>
                      <p className="text-xs text-[#667085] mt-0.5">
                        Needed for: {item.schemes.join(', ')}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: ELIGIBILITY HISTORY */}
      {activeTab === 'history' && data && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="p-6 border-b border-[#E2E8F0] flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#123B65]" />
            <h2 className="font-display text-lg font-bold text-[#172B4D]">Recent Eligibility Evaluations</h2>
          </div>

          {data.recentChecks.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#667085]">
              No eligibility checks recorded yet. Run the Eligibility Checker to save your evaluation history.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#667085]">
                    <th className="py-3 px-5 font-semibold">Date</th>
                    <th className="py-3 px-5 font-semibold">Scheme</th>
                    <th className="py-3 px-5 font-semibold">Outcome</th>
                    <th className="py-3 px-5 font-semibold">Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {data.recentChecks.map((row) => (
                    <tr key={row.id}>
                      <td className="py-3 px-5 font-mono tabular-nums text-[#667085] whitespace-nowrap">
                        {row.evaluatedAt.slice(0, 10)}
                      </td>
                      <td className="py-3 px-5 font-semibold text-[#172B4D]">{row.schemeName}</td>
                      <td className="py-3 px-5 whitespace-nowrap">
                        <span
                          className={
                            row.result === 'ELIGIBLE'
                              ? 'font-semibold text-[#138A55]'
                              : row.result === 'POTENTIALLY_ELIGIBLE'
                              ? 'font-semibold text-[#B45309]'
                              : 'font-semibold text-red-700'
                          }
                        >
                          {row.result.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-[#475467]">{row.summaryExplanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
