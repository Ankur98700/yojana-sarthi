import {
  CheckCircle2,
  Edit3,
  History,
  Plus,
  Shield,
  Tag,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { INDIAN_STATES_AND_UTS, SCHEME_CATEGORIES } from '../constants/india.ts';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';
import type { AdminAuditLog, RuleGroupOperator, RuleOperator, Scheme } from '../types.ts';

interface RuleDraft {
  field: string;
  label: string;
  operator: RuleOperator;
  expectedValueRaw: string;
  logicalGroup: string;
  groupOperator: RuleGroupOperator;
  isMandatory: boolean;
  requiresOfficialVerification: boolean;
  ruleVerified: boolean;
  explanation: string;
  source: string;
}

interface SchemeFormDraft {
  name: string;
  shortDescription: string;
  overview: string;
  objective: string;
  category: string;
  governmentLevel: 'Central Government' | 'State Government';
  department: string;
  stateCoverage: string;
  targetBeneficiaries: string;
  mainBenefit: string;
  benefitsText: string;
  documentsText: string;
  applicationStepsText: string;
  applicationMethod: 'Online' | 'Offline' | 'Online & Offline';
  officialApplicationUrl: string;
  officialSourceUrl: string;
  verificationStatus: 'verified' | 'unverified';
  lastVerifiedDate: string;
  ageGroupSummary: string;
  incomeLimitSummary: string;
  rules: RuleDraft[];
}

const EMPTY_DRAFT = (): SchemeFormDraft => ({
  name: '',
  shortDescription: '',
  overview: '',
  objective: '',
  category: SCHEME_CATEGORIES[0],
  governmentLevel: 'Central Government',
  department: '',
  stateCoverage: 'All India',
  targetBeneficiaries: '',
  mainBenefit: '',
  benefitsText: '',
  documentsText: '',
  applicationStepsText: '',
  applicationMethod: 'Online & Offline',
  officialApplicationUrl: 'https://www.myscheme.gov.in/',
  officialSourceUrl: 'https://www.myscheme.gov.in/',
  verificationStatus: 'unverified',
  lastVerifiedDate: new Date().toISOString().slice(0, 10),
  ageGroupSummary: '18 years and above',
  incomeLimitSummary: 'As per official scheme guidelines',
  rules: [
    {
      field: 'age',
      label: 'Minimum Age',
      operator: 'gte',
      expectedValueRaw: '18',
      logicalGroup: 'default',
      groupOperator: 'AND',
      isMandatory: true,
      requiresOfficialVerification: false,
      ruleVerified: true,
      explanation: 'Applicant must be at least 18 years old.',
      source: 'Official Scheme Guidelines',
    },
  ],
});

function parseExpectedValue(raw: string, operator: RuleOperator): string | number | boolean | string[] {
  const trimmed = raw.trim();
  if (operator === 'in' || operator === 'not_in') {
    return trimmed
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed !== '' && !Number.isNaN(Number(trimmed))) return Number(trimmed);
  return trimmed;
}

export function AdminDashboardPage() {
  const { user, authLoading, navigate, notify } = useApp();
  const [tab, setTab] = useState<'schemes' | 'categories' | 'audit'>('schemes');
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [categories, setCategories] = useState<Array<{ id: number; name: string; createdAt: string }>>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState('');

  // Editor state
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [draft, setDraft] = useState<SchemeFormDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [sRes, cRes, aRes] = await Promise.all([
        api.adminGetSchemes(),
        api.adminGetCategories(),
        api.adminGetAuditLogs(),
      ]);
      setSchemes(sRes.schemes);
      setCategories(cRes.categories);
      setAuditLogs(aRes.logs);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Unable to load admin records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user?.role === 'admin') {
      loadAdminData();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, user]);

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 h-64 animate-pulse" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-10">
          <Shield className="w-10 h-10 text-[#123B65] mx-auto mb-3" />
          <h1 className="font-display text-2xl font-bold text-[#172B4D] mb-2">
            Administrator Access Required
          </h1>
          <p className="text-sm text-[#667085] mb-6">
            All scheme management endpoints are enforced by backend role authorization. Please log in with an administrator account to manage scheme records.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#123B65] rounded-lg"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const openCreate = () => {
    setFormError(null);
    setDraft(EMPTY_DRAFT());
    setEditingId('new');
  };

  const openEdit = (s: Scheme) => {
    setFormError(null);
    setDraft({
      name: s.name,
      shortDescription: s.shortDescription,
      overview: s.overview,
      objective: s.objective,
      category: s.category,
      governmentLevel: s.governmentLevel,
      department: s.department,
      stateCoverage: s.stateCoverage,
      targetBeneficiaries: s.targetBeneficiaries,
      mainBenefit: s.mainBenefit,
      benefitsText: s.benefits.join('\n'),
      documentsText: s.documents.join('\n'),
      applicationStepsText: s.applicationSteps.join('\n'),
      applicationMethod: s.applicationMethod,
      officialApplicationUrl: s.officialApplicationUrl,
      officialSourceUrl: s.officialSourceUrl,
      verificationStatus: s.verificationStatus,
      lastVerifiedDate: s.lastVerifiedDate,
      ageGroupSummary: s.ageGroupSummary,
      incomeLimitSummary: s.incomeLimitSummary,
      rules: s.rules.map((r) => ({
        field: String(r.field),
        label: r.label,
        operator: r.operator,
        expectedValueRaw: Array.isArray(r.expectedValue)
          ? r.expectedValue.join(', ')
          : String(r.expectedValue),
        logicalGroup: r.logicalGroup,
        groupOperator: r.groupOperator,
        isMandatory: r.isMandatory,
        requiresOfficialVerification: r.requiresOfficialVerification,
        ruleVerified: r.ruleVerified,
        explanation: r.explanation,
        source: r.source,
      })),
    });
    setEditingId(s.id);
  };

  const handleSaveScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    const payload = {
      name: draft.name,
      shortDescription: draft.shortDescription,
      overview: draft.overview,
      objective: draft.objective,
      category: draft.category,
      governmentLevel: draft.governmentLevel,
      department: draft.department,
      stateCoverage: draft.stateCoverage,
      targetBeneficiaries: draft.targetBeneficiaries,
      mainBenefit: draft.mainBenefit,
      benefits: draft.benefitsText.split('\n').map((l) => l.trim()).filter(Boolean),
      documents: draft.documentsText.split('\n').map((l) => l.trim()).filter(Boolean),
      applicationSteps: draft.applicationStepsText.split('\n').map((l) => l.trim()).filter(Boolean),
      applicationMethod: draft.applicationMethod,
      officialApplicationUrl: draft.officialApplicationUrl,
      officialSourceUrl: draft.officialSourceUrl,
      verificationStatus: draft.verificationStatus,
      lastVerifiedDate: draft.lastVerifiedDate,
      ageGroupSummary: draft.ageGroupSummary,
      incomeLimitSummary: draft.incomeLimitSummary,
      rules: draft.rules.map((r) => ({
        field: r.field,
        label: r.label,
        operator: r.operator,
        expectedValue: parseExpectedValue(r.expectedValueRaw, r.operator),
        logicalGroup: r.logicalGroup || 'default',
        groupOperator: r.groupOperator,
        isMandatory: r.isMandatory,
        requiresOfficialVerification: r.requiresOfficialVerification,
        ruleVerified: r.ruleVerified,
        explanation: r.explanation,
        source: r.source,
      })),
    };

    try {
      if (editingId === 'new') {
        await api.adminCreateScheme(payload);
        notify('New scheme created and logged to audit trail.', 'success');
      } else if (typeof editingId === 'number') {
        await api.adminUpdateScheme(editingId, payload);
        notify('Scheme updated successfully.', 'success');
      }
      setEditingId(null);
      await loadAdminData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Validation failed. Please check all required fields.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVerify = async (s: Scheme) => {
    const nextStatus = s.verificationStatus === 'verified' ? 'unverified' : 'verified';
    try {
      await api.adminVerifyScheme(s.id, nextStatus, new Date().toISOString().slice(0, 10));
      notify(`Marked "${s.name}" as ${nextStatus}.`, 'success');
      await loadAdminData();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Unable to update verification.', 'error');
    }
  };

  const handleDeleteScheme = async (s: Scheme) => {
    try {
      await api.adminDeleteScheme(s.id);
      notify(`Deleted "${s.name}".`, 'info');
      await loadAdminData();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Unable to delete scheme.', 'error');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    try {
      await api.adminCreateCategory(newCategory.trim());
      setNewCategory('');
      notify('Category added.', 'success');
      await loadAdminData();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Unable to add category.', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-sm font-semibold text-[#138A55] mb-1">Protected Administration Console</p>
          <h1 className="font-display text-3xl font-bold text-[#172B4D] tracking-tight">
            Scheme Database &amp; Verification Management
          </h1>
          <p className="text-sm text-[#667085] mt-1">
            Add, edit, verify, or unverify welfare schemes, manage structured eligibility rules, and review audit logs.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2B4B] rounded-lg whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Scheme</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#E2E8F0]/60 rounded-lg mb-8">
        <button
          type="button"
          onClick={() => setTab('schemes')}
          className={`px-4 py-2 text-xs font-semibold rounded-md ${
            tab === 'schemes' ? 'bg-white text-[#123B65] shadow-xs' : 'text-[#475467]'
          }`}
        >
          Schemes ({schemes.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('categories')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md ${
            tab === 'categories' ? 'bg-white text-[#123B65] shadow-xs' : 'text-[#475467]'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Categories ({categories.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('audit')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md ${
            tab === 'audit' ? 'bg-white text-[#123B65] shadow-xs' : 'text-[#475467]'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Audit Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* SCHEME EDITOR PANEL */}
      {editingId !== null && (
        <div className="mb-8 bg-white border border-[#123B65] rounded-xl p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E2E8F0]">
            <h2 className="font-display text-xl font-bold text-[#172B4D]">
              {editingId === 'new' ? 'Create New Scheme Record' : 'Edit Scheme Record & Rules'}
            </h2>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="p-2 text-[#667085] hover:text-[#172B4D]"
              aria-label="Close editor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {formError && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {formError}
            </div>
          )}

          <form onSubmit={handleSaveScheme} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#172B4D] mb-1">Scheme Name *</label>
                <input
                  type="text"
                  required
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1">Category *</label>
                <select
                  value={draft.category}
                  onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg bg-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1">Government Level *</label>
                <select
                  value={draft.governmentLevel}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      governmentLevel: e.target.value as SchemeFormDraft['governmentLevel'],
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg bg-white"
                >
                  <option value="Central Government">Central Government</option>
                  <option value="State Government">State Government</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1">Department / Ministry *</label>
                <input
                  type="text"
                  required
                  value={draft.department}
                  onChange={(e) => setDraft((d) => ({ ...d, department: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1">State Coverage *</label>
                <select
                  value={draft.stateCoverage}
                  onChange={(e) => setDraft((d) => ({ ...d, stateCoverage: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg bg-white"
                >
                  <option value="All India">All India</option>
                  {INDIAN_STATES_AND_UTS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#172B4D] mb-1">Short Description *</label>
                <input
                  type="text"
                  required
                  value={draft.shortDescription}
                  onChange={(e) => setDraft((d) => ({ ...d, shortDescription: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#172B4D] mb-1">Overview *</label>
                <textarea
                  rows={3}
                  required
                  value={draft.overview}
                  onChange={(e) => setDraft((d) => ({ ...d, overview: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1">Objective *</label>
                <input
                  type="text"
                  required
                  value={draft.objective}
                  onChange={(e) => setDraft((d) => ({ ...d, objective: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1">Target Beneficiaries *</label>
                <input
                  type="text"
                  required
                  value={draft.targetBeneficiaries}
                  onChange={(e) => setDraft((d) => ({ ...d, targetBeneficiaries: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#172B4D] mb-1">Main Benefit Summary *</label>
                <input
                  type="text"
                  required
                  value={draft.mainBenefit}
                  onChange={(e) => setDraft((d) => ({ ...d, mainBenefit: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                  Benefits (one per line) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={draft.benefitsText}
                  onChange={(e) => setDraft((d) => ({ ...d, benefitsText: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                  Required Documents (one per line) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={draft.documentsText}
                  onChange={(e) => setDraft((d) => ({ ...d, documentsText: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                  Application Steps (one per line) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={draft.applicationStepsText}
                  onChange={(e) => setDraft((d) => ({ ...d, applicationStepsText: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1">Official Application URL *</label>
                <input
                  type="url"
                  required
                  value={draft.officialApplicationUrl}
                  onChange={(e) => setDraft((d) => ({ ...d, officialApplicationUrl: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1">Official Source URL *</label>
                <input
                  type="url"
                  required
                  value={draft.officialSourceUrl}
                  onChange={(e) => setDraft((d) => ({ ...d, officialSourceUrl: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1">Verification Status *</label>
                <select
                  value={draft.verificationStatus}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      verificationStatus: e.target.value as 'verified' | 'unverified',
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg bg-white"
                >
                  <option value="verified">Verified</option>
                  <option value="unverified">Unverified (requires portal verification)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1">Last Verified Date *</label>
                <input
                  type="date"
                  required
                  value={draft.lastVerifiedDate}
                  onChange={(e) => setDraft((d) => ({ ...d, lastVerifiedDate: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg font-mono"
                />
              </div>
            </div>

            {/* Structured Eligibility Rules Builder */}
            <div className="pt-5 border-t border-[#E2E8F0]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-sm font-bold text-[#172B4D]">
                  Structured Eligibility Rules ({draft.rules.length})
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      rules: [
                        ...d.rules,
                        {
                          field: 'annualFamilyIncome',
                          label: 'Annual Family Income Limit',
                          operator: 'lte',
                          expectedValueRaw: '300000',
                          logicalGroup: 'default',
                          groupOperator: 'AND',
                          isMandatory: true,
                          requiresOfficialVerification: false,
                          ruleVerified: true,
                          explanation: 'Annual family income must be within the notified threshold.',
                          source: 'Official Scheme Notification',
                        },
                      ],
                    }))
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#123B65] hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Eligibility Rule</span>
                </button>
              </div>

              <div className="space-y-4">
                {draft.rules.map((r, idx) => (
                  <div key={idx} className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#475467] mb-1">Profile Field</label>
                        <select
                          value={r.field}
                          onChange={(e) =>
                            setDraft((d) => {
                              const next = [...d.rules];
                              next[idx] = { ...next[idx], field: e.target.value };
                              return { ...d, rules: next };
                            })
                          }
                          className="w-full px-2.5 py-1.5 text-xs border border-[#CBD5E1] rounded bg-white"
                        >
                          <option value="age">age</option>
                          <option value="annualFamilyIncome">annualFamilyIncome</option>
                          <option value="state">state</option>
                          <option value="gender">gender</option>
                          <option value="residenceType">residenceType</option>
                          <option value="bplStatus">bplStatus</option>
                          <option value="isIncomeTaxPayer">isIncomeTaxPayer</option>
                          <option value="occupation">occupation</option>
                          <option value="employmentStatus">employmentStatus</option>
                          <option value="educationLevel">educationLevel</option>
                          <option value="isStudent">isStudent</option>
                          <option value="isFarmer">isFarmer</option>
                          <option value="ownsCultivableLand">ownsCultivableLand</option>
                          <option value="ownsPuccaHouse">ownsPuccaHouse</option>
                          <option value="childrenCount">childrenCount</option>
                          <option value="hasGirlChildUnder10">hasGirlChildUnder10</option>
                          <option value="isTraditionalArtisan">isTraditionalArtisan</option>
                          <option value="hasDisability">hasDisability</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#475467] mb-1">Operator</label>
                        <select
                          value={r.operator}
                          onChange={(e) =>
                            setDraft((d) => {
                              const next = [...d.rules];
                              next[idx] = { ...next[idx], operator: e.target.value as RuleOperator };
                              return { ...d, rules: next };
                            })
                          }
                          className="w-full px-2.5 py-1.5 text-xs border border-[#CBD5E1] rounded bg-white"
                        >
                          <option value="gte">≥ (gte)</option>
                          <option value="gt">&gt; (gt)</option>
                          <option value="lte">≤ (lte)</option>
                          <option value="lt">&lt; (lt)</option>
                          <option value="eq">= (eq)</option>
                          <option value="neq">≠ (neq)</option>
                          <option value="in">in (comma list)</option>
                          <option value="not_in">not_in (comma list)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#475467] mb-1">Expected Value</label>
                        <input
                          type="text"
                          value={r.expectedValueRaw}
                          onChange={(e) =>
                            setDraft((d) => {
                              const next = [...d.rules];
                              next[idx] = { ...next[idx], expectedValueRaw: e.target.value };
                              return { ...d, rules: next };
                            })
                          }
                          className="w-full px-2.5 py-1.5 text-xs border border-[#CBD5E1] rounded bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#475467] mb-1">Label</label>
                        <input
                          type="text"
                          value={r.label}
                          onChange={(e) =>
                            setDraft((d) => {
                              const next = [...d.rules];
                              next[idx] = { ...next[idx], label: e.target.value };
                              return { ...d, rules: next };
                            })
                          }
                          className="w-full px-2.5 py-1.5 text-xs border border-[#CBD5E1] rounded bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Human-readable explanation"
                        value={r.explanation}
                        onChange={(e) =>
                          setDraft((d) => {
                            const next = [...d.rules];
                            next[idx] = { ...next[idx], explanation: e.target.value };
                            return { ...d, rules: next };
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs border border-[#CBD5E1] rounded bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Source guideline reference"
                        value={r.source}
                        onChange={(e) =>
                          setDraft((d) => {
                            const next = [...d.rules];
                            next[idx] = { ...next[idx], source: e.target.value };
                            return { ...d, rules: next };
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs border border-[#CBD5E1] rounded bg-white"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex flex-wrap items-center gap-4">
                        <label className="inline-flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={r.ruleVerified}
                            onChange={(e) =>
                              setDraft((d) => {
                                const next = [...d.rules];
                                next[idx] = { ...next[idx], ruleVerified: e.target.checked };
                                return { ...d, rules: next };
                              })
                            }
                          />
                          <span>Verified rule</span>
                        </label>
                        <label className="inline-flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={r.requiresOfficialVerification}
                            onChange={(e) =>
                              setDraft((d) => {
                                const next = [...d.rules];
                                next[idx] = { ...next[idx], requiresOfficialVerification: e.target.checked };
                                return { ...d, rules: next };
                              })
                            }
                          />
                          <span>Requires official verification</span>
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((d) => ({ ...d, rules: d.rules.filter((_, i) => i !== idx) }))
                        }
                        className="text-red-700 hover:underline font-medium"
                      >
                        Remove rule
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="px-4 py-2 text-sm font-medium text-[#475467] border border-[#CBD5E1] rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2B4B] rounded-lg disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Scheme Record'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB: SCHEMES TABLE */}
      {tab === 'schemes' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-x-auto">
          <table className="w-full min-w-[780px] text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#667085]">
                <th className="py-3.5 px-5 font-semibold">Scheme Name</th>
                <th className="py-3.5 px-4 font-semibold">Category &amp; Level</th>
                <th className="py-3.5 px-4 font-semibold">Rules</th>
                <th className="py-3.5 px-4 font-semibold">Verification</th>
                <th className="py-3.5 px-4 font-semibold">Last Verified</th>
                <th className="py-3.5 px-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {schemes.map((s) => (
                <tr key={s.id} className="hover:bg-[#F8FAFC]">
                  <td className="py-3.5 px-5">
                    <p className="font-semibold text-[#172B4D]">{s.name}</p>
                    <p className="text-xs text-[#667085]">{s.stateCoverage}</p>
                  </td>
                  <td className="py-3.5 px-4 text-[#475467]">
                    <p>{s.category}</p>
                    <p className="text-xs text-[#667085]">{s.governmentLevel}</p>
                  </td>
                  <td className="py-3.5 px-4 font-mono tabular-nums text-[#172B4D]">{s.rules.length}</td>
                  <td className="py-3.5 px-4">
                    <button
                      type="button"
                      onClick={() => handleToggleVerify(s)}
                      className={`inline-flex items-center gap-1 text-xs font-semibold ${
                        s.verificationStatus === 'verified' ? 'text-[#138A55]' : 'text-[#B45309]'
                      }`}
                    >
                      {s.verificationStatus === 'verified' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span>{s.verificationStatus === 'verified' ? 'Verified' : 'Unverified'}</span>
                    </button>
                  </td>
                  <td className="py-3.5 px-4 font-mono tabular-nums text-[#667085]">
                    {s.lastVerifiedDate}
                  </td>
                  <td className="py-3.5 px-5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openEdit(s)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#123B65] hover:underline mr-4"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteScheme(s)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:underline"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB: CATEGORIES */}
      {tab === 'categories' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 max-w-2xl space-y-6">
          <form onSubmit={handleAddCategory} className="flex items-center gap-3">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="New welfare category name..."
              className="flex-1 px-3.5 py-2 text-sm border border-[#CBD5E1] rounded-lg"
            />
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-[#123B65] rounded-lg whitespace-nowrap"
            >
              Add Category
            </button>
          </form>

          <ul className="divide-y divide-[#F1F5F9]">
            {categories.map((c) => (
              <li key={c.id} className="py-3 flex items-center justify-between text-sm">
                <span className="font-medium text-[#172B4D]">{c.name}</span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await api.adminDeleteCategory(c.id);
                      notify(`Removed category "${c.name}".`, 'info');
                      await loadAdminData();
                    } catch (err) {
                      notify(err instanceof Error ? err.message : 'Unable to delete category.', 'error');
                    }
                  }}
                  className="text-xs font-medium text-red-700 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* TAB: AUDIT LOGS */}
      {tab === 'audit' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-x-auto">
          {auditLogs.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#667085]">
              No administrative changes have been logged yet. Creating, editing, verifying, or deleting a scheme records an audit entry here.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#667085]">
                  <th className="py-3 px-5 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Admin</th>
                  <th className="py-3 px-4 font-semibold">Action</th>
                  <th className="py-3 px-5 font-semibold">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-3 px-5 font-mono tabular-nums text-[#667085] whitespace-nowrap">
                      {log.createdAt}
                    </td>
                    <td className="py-3 px-4 text-[#172B4D]">{log.adminEmail}</td>
                    <td className="py-3 px-4 font-mono text-xs text-[#123B65]">{log.action}</td>
                    <td className="py-3 px-5 text-[#475467]">{log.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
