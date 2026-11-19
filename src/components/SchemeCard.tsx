import { ArrowRight, Bookmark, Check, Scale } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import type { Scheme } from '../types.ts';

interface SchemeCardProps {
  scheme: Scheme;
}

export function SchemeCard({ scheme }: SchemeCardProps) {
  const { navigate, savedIds, toggleSaveScheme, compareIds, toggleCompareScheme } = useApp();
  const isSaved = savedIds.includes(scheme.id);
  const isCompared = compareIds.includes(scheme.id);

  return (
    <article className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col justify-between transition-colors hover:border-[#123B65]/40">
      <div>
        {/* Clean unboxed inline metadata — zero pill enclosures */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#667085] mb-2.5">
          <span className="font-medium text-[#138A55]">{scheme.category}</span>
          <span aria-hidden="true">·</span>
          <span>{scheme.governmentLevel}</span>
          {scheme.stateCoverage !== 'All India' && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-[#123B65]">{scheme.stateCoverage}</span>
            </>
          )}
        </div>

        <h3 className="font-display text-lg font-bold text-[#172B4D] leading-snug mb-2">
          <button
            type="button"
            onClick={() => navigate(`/schemes/${scheme.slug}`)}
            className="text-left hover:text-[#123B65] transition-colors"
          >
            {scheme.name}
          </button>
        </h3>

        <p className="text-sm text-[#667085] leading-relaxed mb-5 line-clamp-3">
          {scheme.shortDescription}
        </p>

        <dl className="space-y-2.5 pt-4 border-t border-[#F1F5F9] text-sm">
          <div>
            <dt className="text-xs font-medium text-[#667085]">Main Benefit</dt>
            <dd className="text-[#172B4D] font-medium mt-0.5">{scheme.mainBenefit}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[#667085]">Target Beneficiaries</dt>
            <dd className="text-[#475467] mt-0.5 line-clamp-2">{scheme.targetBeneficiaries}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 pt-4 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate(`/schemes/${scheme.slug}`)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#123B65] hover:text-[#0D2B4B] transition-colors whitespace-nowrap"
        >
          <span>View Details</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => toggleCompareScheme(scheme.id)}
            aria-label={isCompared ? `Remove ${scheme.name} from comparison` : `Add ${scheme.name} to comparison`}
            title={isCompared ? 'In comparison' : 'Compare scheme'}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
              isCompared
                ? 'border-[#123B65] bg-[#123B65]/8 text-[#123B65]'
                : 'border-[#E2E8F0] text-[#475467] hover:border-[#123B65]/40 hover:text-[#123B65]'
            }`}
          >
            {isCompared ? <Check className="w-3.5 h-3.5" /> : <Scale className="w-3.5 h-3.5" />}
            <span>{isCompared ? 'Added' : 'Compare'}</span>
          </button>

          <button
            type="button"
            onClick={() => toggleSaveScheme(scheme.id)}
            aria-label={isSaved ? `Unsave ${scheme.name}` : `Save ${scheme.name}`}
            title={isSaved ? 'Saved' : 'Save scheme'}
            className={`p-2 rounded-lg border transition-colors ${
              isSaved
                ? 'border-[#138A55] bg-[#138A55]/10 text-[#138A55]'
                : 'border-[#E2E8F0] text-[#667085] hover:border-[#123B65]/40 hover:text-[#123B65]'
            }`}
          >
            <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
    </article>
  );
}
