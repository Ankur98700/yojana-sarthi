import { ExternalLink, Plus, Scale, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';
import type { Scheme } from '../types.ts';

export function CompareSchemesPage() {
  const { compareIds, toggleCompareScheme, removeCompareScheme, clearCompare, navigate } = useApp();
  const [comparedSchemes, setComparedSchemes] = useState<Scheme[]>([]);
  const [allSchemes, setAllSchemes] = useState<Scheme[]>([]);
  const [selectedToAdd, setSelectedToAdd] = useState('');
  const [highlightDiffs, setHighlightDiffs] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listSchemes({ limit: 50, sort: 'alphabetical' })
      .then((res) => setAllSchemes(res.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (compareIds.length === 0) {
      setComparedSchemes([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    api
      .compareSchemes(compareIds)
      .then((res) => {
        if (active) setComparedSchemes(res.schemes);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [compareIds]);

  const handleAddScheme = () => {
    const id = Number(selectedToAdd);
    if (!id) return;
    toggleCompareScheme(id);
    setSelectedToAdd('');
  };

  const availableToAdd = allSchemes.filter((s) => !compareIds.includes(s.id));

  const rows: Array<{
    key: string;
    label: string;
    getValue: (s: Scheme) => string;
    render?: (s: Scheme) => React.ReactNode;
  }> = [
    {
      key: 'department',
      label: 'Government Department',
      getValue: (s) => `${s.department} (${s.governmentLevel})`,
    },
    {
      key: 'coverage',
      label: 'Geographical Coverage',
      getValue: (s) => s.stateCoverage,
    },
    {
      key: 'beneficiaries',
      label: 'Target Beneficiaries',
      getValue: (s) => s.targetBeneficiaries,
    },
    {
      key: 'age',
      label: 'Age Restrictions',
      getValue: (s) => s.ageGroupSummary,
    },
    {
      key: 'income',
      label: 'Income Requirements',
      getValue: (s) => s.incomeLimitSummary,
    },
    {
      key: 'rules',
      label: 'Eligibility Requirements',
      getValue: (s) => s.rules.map((r) => `${r.label}: ${r.explanation}`).join('; '),
      render: (s) => (
        <ul className="space-y-1.5 text-xs text-[#334155]">
          {s.rules.map((r) => (
            <li key={r.id}>
              <strong className="text-[#172B4D]">{r.label}:</strong> {r.explanation}
            </li>
          ))}
        </ul>
      ),
    },
    {
      key: 'benefits',
      label: 'Key Benefits',
      getValue: (s) => s.benefits.join('; '),
      render: (s) => (
        <div className="space-y-2 text-xs">
          <p className="font-semibold text-[#138A55]">{s.mainBenefit}</p>
          <ul className="space-y-1 text-[#334155]">
            {s.benefits.map((b, i) => (
              <li key={i}>· {b}</li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      key: 'documents',
      label: 'Required Documents',
      getValue: (s) => s.documents.join('; '),
      render: (s) => (
        <ul className="space-y-1 text-xs text-[#334155]">
          {s.documents.map((d, i) => (
            <li key={i}>· {d}</li>
          ))}
        </ul>
      ),
    },
    {
      key: 'method',
      label: 'Application Method',
      getValue: (s) => s.applicationMethod,
    },
    {
      key: 'url',
      label: 'Official Application URL',
      getValue: (s) => s.officialApplicationUrl,
      render: (s) => (
        <a
          href={s.officialApplicationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#123B65] hover:underline break-all"
        >
          <span>{s.officialApplicationUrl}</span>
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
        </a>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-sm font-semibold text-[#138A55] mb-1.5">Side-by-Side Comparison</p>
          <h1 className="font-display text-3xl font-bold text-[#172B4D] tracking-tight">
            Compare Government Schemes
          </h1>
          <p className="text-sm text-[#667085] mt-1.5">
            Select up to three verified schemes to compare benefits, eligibility limits, required documents, and application methods.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {comparedSchemes.length > 1 && (
            <label className="inline-flex items-center gap-2 text-xs font-medium text-[#334155] cursor-pointer">
              <input
                type="checkbox"
                checked={highlightDiffs}
                onChange={(e) => setHighlightDiffs(e.target.checked)}
                className="w-4 h-4 rounded border-[#CBD5E1]"
              />
              <span>Highlight differences</span>
            </label>
          )}
          {compareIds.length > 0 && (
            <button
              type="button"
              onClick={clearCompare}
              className="text-xs font-semibold text-[#667085] hover:text-red-700"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Add Scheme Selector */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 mb-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1">
          <label htmlFor="compare-select" className="sr-only">
            Add scheme to comparison
          </label>
          <select
            id="compare-select"
            value={selectedToAdd}
            disabled={compareIds.length >= 3}
            onChange={(e) => setSelectedToAdd(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg text-[#172B4D] disabled:bg-[#F8FAFC]"
          >
            <option value="">
              {compareIds.length >= 3
                ? 'Maximum 3 schemes selected (remove one to add another)'
                : `Select a scheme to compare (${compareIds.length}/3 selected)...`}
            </option>
            {availableToAdd.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.stateCoverage})
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={!selectedToAdd || compareIds.length >= 3}
          onClick={handleAddScheme}
          className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2B4B] rounded-lg disabled:opacity-40 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Add to Comparison</span>
        </button>
      </div>

      {/* Comparison Table */}
      {loading ? (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-10 animate-pulse h-80" />
      ) : comparedSchemes.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center">
          <Scale className="w-10 h-10 text-[#123B65] mx-auto mb-3" />
          <h2 className="font-display text-lg font-bold text-[#172B4D] mb-2">
            No schemes selected for comparison yet
          </h2>
          <p className="text-sm text-[#667085] max-w-md mx-auto mb-6">
            Choose up to three schemes using the selector above or click &ldquo;Compare&rdquo; on any scheme card while browsing.
          </p>
          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#123B65] rounded-lg"
          >
            Explore Schemes
          </button>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-x-auto">
          <table className="w-full min-w-[680px] text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <th className="py-4 px-5 text-xs font-semibold text-[#667085] w-48 align-top">
                  Comparison Field
                </th>
                {comparedSchemes.map((s) => (
                  <th key={s.id} className="py-4 px-5 align-top border-l border-[#E2E8F0]">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-[#138A55] mb-1">{s.category}</p>
                        <button
                          type="button"
                          onClick={() => navigate(`/schemes/${s.slug}`)}
                          className="font-display text-sm font-bold text-[#172B4D] hover:text-[#123B65] text-left leading-snug"
                        >
                          {s.name}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCompareScheme(s.id)}
                        aria-label={`Remove ${s.name} from comparison`}
                        className="p-1.5 text-[#667085] hover:text-red-700 rounded-md hover:bg-red-50 shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {rows.map((row) => {
                const values = comparedSchemes.map((s) => row.getValue(s));
                const hasDiff = comparedSchemes.length > 1 && new Set(values).size > 1;
                const rowBg = highlightDiffs && hasDiff ? 'bg-[#F39C35]/5' : 'bg-white';

                return (
                  <tr key={row.key} className={rowBg}>
                    <th className="py-4 px-5 text-xs font-semibold text-[#172B4D] align-top">
                      <span>{row.label}</span>
                      {highlightDiffs && hasDiff && (
                        <span className="block text-[11px] font-normal text-[#B45309] mt-0.5">
                          Differs across schemes
                        </span>
                      )}
                    </th>
                    {comparedSchemes.map((s) => (
                      <td
                        key={s.id}
                        className="py-4 px-5 text-xs sm:text-sm text-[#334155] align-top border-l border-[#E2E8F0] leading-relaxed"
                      >
                        {row.render ? row.render(s) : row.getValue(s)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
