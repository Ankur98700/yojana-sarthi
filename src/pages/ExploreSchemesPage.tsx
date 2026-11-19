import { ArrowRight, RotateCcw, Scale, Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SchemeCard } from '../components/SchemeCard.tsx';
import {
  EDUCATION_LEVEL_OPTIONS,
  INDIAN_STATES_AND_UTS,
  OCCUPATION_OPTIONS,
  SCHEME_CATEGORIES,
} from '../constants/india.ts';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';
import type { Scheme } from '../types.ts';

export function ExploreSchemesPage() {
  const { navigate, compareIds, clearCompare } = useApp();

  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [category, setCategory] = useState('all');
  const [level, setLevel] = useState('all');
  const [state, setState] = useState('all');
  const [ageGroup, setAgeGroup] = useState('all');
  const [maxIncome, setMaxIncome] = useState('all');
  const [occupation, setOccupation] = useState('all');
  const [education, setEducation] = useState('all');
  const [beneficiary, setBeneficiary] = useState('all');
  const [sort, setSort] = useState('alphabetical');
  const [page, setPage] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .listSchemes({
        q: debouncedQ,
        category,
        level,
        state,
        ageGroup,
        maxIncome,
        occupation,
        education,
        beneficiary,
        sort,
        page,
        limit: 9,
      })
      .then((res) => {
        if (!active) return;
        setSchemes(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load schemes.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedQ, category, level, state, ageGroup, maxIncome, occupation, education, beneficiary, sort, page]);

  const resetFilters = () => {
    setQ('');
    setDebouncedQ('');
    setCategory('all');
    setLevel('all');
    setState('all');
    setAgeGroup('all');
    setMaxIncome('all');
    setOccupation('all');
    setEducation('all');
    setBeneficiary('all');
    setSort('alphabetical');
    setPage(1);
  };

  const hasActiveFilters =
    q !== '' ||
    category !== 'all' ||
    level !== 'all' ||
    state !== 'all' ||
    ageGroup !== 'all' ||
    maxIncome !== 'all' ||
    occupation !== 'all' ||
    education !== 'all' ||
    beneficiary !== 'all';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-sm font-semibold text-[#138A55] mb-1.5">Government Scheme Explorer</p>
          <h1 className="font-display text-3xl font-bold text-[#172B4D] tracking-tight">
            Explore Central &amp; State Welfare Schemes
          </h1>
          <p className="text-sm text-[#667085] mt-2 max-w-2xl">
            Search verified schemes by keyword, benefit, department, or beneficiary group. Filter by state, income threshold, occupation, or education level.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/eligibility')}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2B4B] rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <span>Check My Eligibility</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Search & Primary Filter Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 mb-6 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-5 relative">
            <label htmlFor="scheme-search" className="sr-only">
              Search schemes
            </label>
            <Search className="w-4 h-4 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="scheme-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by scheme name, benefit, department, or keyword..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg text-[#172B4D] placeholder:text-[#94A3B8] focus:border-[#123B65] focus:outline-none"
            />
          </div>

          <div className="lg:col-span-3">
            <label htmlFor="filter-category" className="sr-only">
              Category
            </label>
            <select
              id="filter-category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg text-[#172B4D] focus:border-[#123B65] focus:outline-none"
            >
              <option value="all">All Categories</option>
              {SCHEME_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label htmlFor="filter-level" className="sr-only">
              Government Level
            </label>
            <select
              id="filter-level"
              value={level}
              onChange={(e) => {
                setLevel(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg text-[#172B4D] focus:border-[#123B65] focus:outline-none"
            >
              <option value="all">Central &amp; State</option>
              <option value="Central Government">Central Government</option>
              <option value="State Government">State Government</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <button
              type="button"
              onClick={() => setShowAdvanced((p) => !p)}
              className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap ${
                showAdvanced
                  ? 'border-[#123B65] bg-[#123B65]/8 text-[#123B65]'
                  : 'border-[#CBD5E1] text-[#172B4D] hover:bg-[#F8FAFC]'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>More Filters</span>
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="pt-4 border-t border-[#F1F5F9] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="filter-state" className="block text-xs font-medium text-[#475467] mb-1.5">
                State / Union Territory
              </label>
              <select
                id="filter-state"
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-[#CBD5E1] rounded-lg text-[#172B4D]"
              >
                <option value="all">All India</option>
                {INDIAN_STATES_AND_UTS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-age" className="block text-xs font-medium text-[#475467] mb-1.5">
                Age Group
              </label>
              <select
                id="filter-age"
                value={ageGroup}
                onChange={(e) => {
                  setAgeGroup(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-[#CBD5E1] rounded-lg text-[#172B4D]"
              >
                <option value="all">All Age Groups</option>
                <option value="children">Children (Under 18)</option>
                <option value="youth">Youth (15 – 45)</option>
                <option value="adults">Adults (18 – 60)</option>
                <option value="seniors">Senior Citizens (60+)</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-income" className="block text-xs font-medium text-[#475467] mb-1.5">
                Annual Family Income Eligibility
              </label>
              <select
                id="filter-income"
                value={maxIncome}
                onChange={(e) => {
                  setMaxIncome(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-[#CBD5E1] rounded-lg text-[#172B4D]"
              >
                <option value="all">Any Income Level</option>
                <option value="150000">Up to ₹1,50,000</option>
                <option value="250000">Up to ₹2,50,000</option>
                <option value="300000">Up to ₹3,00,000</option>
                <option value="450000">Up to ₹4,50,000</option>
                <option value="900000">Up to ₹9,00,000</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-occupation" className="block text-xs font-medium text-[#475467] mb-1.5">
                Occupation
              </label>
              <select
                id="filter-occupation"
                value={occupation}
                onChange={(e) => {
                  setOccupation(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-[#CBD5E1] rounded-lg text-[#172B4D]"
              >
                <option value="all">All Occupations</option>
                {OCCUPATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-education" className="block text-xs font-medium text-[#475467] mb-1.5">
                Education Level
              </label>
              <select
                id="filter-education"
                value={education}
                onChange={(e) => {
                  setEducation(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-[#CBD5E1] rounded-lg text-[#172B4D]"
              >
                <option value="all">All Education Levels</option>
                {EDUCATION_LEVEL_OPTIONS.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-beneficiary" className="block text-xs font-medium text-[#475467] mb-1.5">
                Beneficiary Group
              </label>
              <select
                id="filter-beneficiary"
                value={beneficiary}
                onChange={(e) => {
                  setBeneficiary(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-[#CBD5E1] rounded-lg text-[#172B4D]"
              >
                <option value="all">All Beneficiaries</option>
                <option value="farmers">Farmers</option>
                <option value="students">Students</option>
                <option value="women">Women</option>
                <option value="children">Children</option>
                <option value="senior_citizens">Senior Citizens</option>
                <option value="entrepreneurs">Entrepreneurs &amp; Artisans</option>
                <option value="rural">Rural Households</option>
                <option value="urban">Urban Households</option>
                <option value="bpl">BPL / Economically Weaker</option>
                <option value="unemployed">Unemployed / Job Seekers</option>
              </select>
            </div>
          </div>
        )}

        {/* Result Count & Sort Row */}
        <div className="pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3 text-[#475467]">
            <span className="font-mono tabular-nums font-medium text-[#172B4D]">{total}</span>
            <span>verified {total === 1 ? 'scheme' : 'schemes'} found</span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#123B65] hover:underline ml-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset filters</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="sort-schemes" className="text-xs text-[#667085]">
              Sort by:
            </label>
            <select
              id="sort-schemes"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-medium bg-white border border-[#CBD5E1] rounded-lg text-[#172B4D]"
            >
              <option value="alphabetical">Alphabetical (A–Z)</option>
              <option value="recently_verified">Recently Verified</option>
              <option value="category">Category</option>
            </select>
          </div>
        </div>
      </div>

      {/* Compare Tray Banner when schemes are selected */}
      {compareIds.length > 0 && (
        <div className="mb-6 bg-[#123B65] text-white rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-sm">
            <Scale className="w-4 h-4 text-[#F39C35]" />
            <span>
              <strong className="font-mono tabular-nums">{compareIds.length}</strong> of 3 schemes selected for side-by-side comparison.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={clearCompare}
              className="text-xs font-medium text-white/80 hover:text-white"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => navigate('/compare')}
              className="px-3.5 py-1.5 text-xs font-semibold bg-white text-[#123B65] rounded-lg hover:bg-[#F5F7FA]"
            >
              Compare Now
            </button>
          </div>
        </div>
      )}

      {/* Results Grid */}
      {error ? (
        <div className="bg-white border border-red-200 rounded-xl p-8 text-center">
          <p className="text-sm font-medium text-red-700 mb-3">{error}</p>
          <button
            type="button"
            onClick={() => setPage(1)}
            className="px-4 py-2 text-xs font-semibold bg-[#123B65] text-white rounded-lg"
          >
            Try Again
          </button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="bg-white border border-[#E2E8F0] rounded-xl p-6 h-72 animate-pulse">
              <div className="h-3 bg-[#E2E8F0] rounded w-1/3 mb-4" />
              <div className="h-5 bg-[#E2E8F0] rounded w-3/4 mb-3" />
              <div className="h-4 bg-[#F1F5F9] rounded w-full mb-2" />
              <div className="h-4 bg-[#F1F5F9] rounded w-4/5" />
            </div>
          ))}
        </div>
      ) : schemes.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center">
          <h2 className="font-display text-lg font-bold text-[#172B4D] mb-2">
            No matching welfare schemes found
          </h2>
          <p className="text-sm text-[#667085] max-w-md mx-auto mb-6">
            Try widening your search keywords or clearing one or more filters to browse all verified Central and State schemes.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#123B65] rounded-lg hover:bg-[#0D2B4B]"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schemes.map((scheme) => (
              <SchemeCard key={scheme.id} scheme={scheme} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3.5 py-2 text-sm font-medium bg-white border border-[#CBD5E1] rounded-lg text-[#172B4D] disabled:opacity-40 hover:bg-[#F8FAFC]"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm font-mono tabular-nums text-[#475467]">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3.5 py-2 text-sm font-medium bg-white border border-[#CBD5E1] rounded-lg text-[#172B4D] disabled:opacity-40 hover:bg-[#F8FAFC]"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
