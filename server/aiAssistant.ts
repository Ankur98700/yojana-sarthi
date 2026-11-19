import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type { ChatSourceRef, CitizenProfile, Scheme } from '../src/types.ts';
import { evaluateAllSchemes } from './eligibilityEngine.ts';

export interface AssistantReply {
  content: string;
  sources: ChatSourceRef[];
  mode: 'gemini_ai' | 'database_fallback';
  notice?: string;
}

const STOP_WORDS = new Set([
  'the', 'is', 'are', 'for', 'in', 'of', 'to', 'a', 'an', 'and', 'or', 'on', 'with',
  'what', 'which', 'how', 'do', 'does', 'can', 'i', 'my', 'me', 'about', 'scheme',
  'schemes', 'government', 'india', 'indian', 'yojana', 'tell', 'please', 'help', 'get',
]);

function retrieveRelevantSchemes(query: string, schemes: Scheme[], limit = 5): Scheme[] {
  const lowerQuery = query.toLowerCase();
  const tokens = lowerQuery
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));

  const synonymMap: Record<string, string[]> = {
    farmer: ['agriculture', 'kisan', 'land', 'crop', 'rural'],
    farmers: ['agriculture', 'kisan', 'land', 'rural'],
    student: ['scholarship', 'college', 'university', 'education', 'skill'],
    students: ['scholarship', 'college', 'university', 'education', 'skill'],
    college: ['scholarship', 'education', 'undergraduate', 'postgraduate'],
    women: ['woman', 'female', 'girl', 'ujjwala', 'sukanya', 'ladki', 'kanya', 'mahila'],
    woman: ['women', 'female', 'girl', 'ujjwala', 'sukanya', 'ladki', 'kanya'],
    house: ['housing', 'awas', 'pmay', 'home', 'pucca'],
    housing: ['house', 'awas', 'pmay', 'home', 'pucca'],
    health: ['hospital', 'medical', 'ayushman', 'pmjay', 'healthcare'],
    pension: ['senior', 'old', 'elderly', 'atal', 'ignoaps', 'retirement'],
    loan: ['mudra', 'business', 'entrepreneur', 'vishwakarma', 'credit'],
    entrepreneur: ['mudra', 'business', 'loan', 'vishwakarma', 'artisan'],
    entrepreneurs: ['mudra', 'business', 'loan', 'vishwakarma', 'artisan'],
    job: ['employment', 'mgnrega', 'skill', 'pmkvy', 'work'],
    up: ['uttar', 'pradesh', 'sumangala'],
    maharashtra: ['ladki', 'bahin'],
  };

  const expandedTokens = new Set<string>(tokens);
  for (const t of tokens) {
    const syns = synonymMap[t];
    if (syns) {
      for (const s of syns) expandedTokens.add(s);
    }
  }

  const scored = schemes.map((scheme) => {
    const haystack = [
      scheme.name,
      scheme.slug,
      scheme.category,
      scheme.department,
      scheme.stateCoverage,
      scheme.shortDescription,
      scheme.targetBeneficiaries,
      scheme.mainBenefit,
      scheme.benefits.join(' '),
      scheme.documents.join(' '),
      scheme.beneficiaryTags.join(' '),
      scheme.occupationTags.join(' '),
    ]
      .join(' ')
      .toLowerCase();

    let score = 0;
    if (lowerQuery.includes(scheme.name.toLowerCase()) || lowerQuery.includes(scheme.slug.replace(/-/g, ' '))) {
      score += 50;
    }
    if (scheme.stateCoverage !== 'All India' && lowerQuery.includes(scheme.stateCoverage.toLowerCase())) {
      score += 30;
    }
    for (const token of expandedTokens) {
      if (haystack.includes(token)) {
        score += tokens.includes(token) ? 8 : 4;
      }
    }
    return { scheme, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const matched = scored.filter((s) => s.score > 0).slice(0, limit).map((s) => s.scheme);

  // If query is general (e.g., "Why was I marked potentially eligible?"), return top 3 broad schemes as context
  return matched.length > 0 ? matched : schemes.slice(0, 3);
}

function buildDatabaseFallbackReply(
  query: string,
  matchedSchemes: Scheme[],
  profileContext?: CitizenProfile | null,
  reason?: string
): AssistantReply {
  const lower = query.toLowerCase();
  const sources: ChatSourceRef[] = matchedSchemes.map((s) => ({
    schemeId: s.id,
    name: s.name,
    officialUrl: s.officialApplicationUrl,
    sourceUrl: s.officialSourceUrl,
    verificationStatus: s.verificationStatus,
  }));

  if (lower.includes('potentially eligible')) {
    return {
      mode: 'database_fallback',
      notice:
        reason ||
        'Live Gemini AI service is currently unavailable. Showing verified platform guidance and database records instead.',
      sources: [],
      content:
        'A scheme is marked "Potentially Eligible" in Yojana Sarthi for one of two transparent reasons:\n\n' +
        '1. Missing information: One or more mandatory fields (such as annual family income, BPL status, landholding, or residence type) were not provided. Yojana Sarthi never assumes missing data passes a requirement.\n' +
        '2. Official verification needed: Your self-declared profile matches the basic criteria, but the implementing government department must confirm official lists (for example, SECC-2011 / Awaas+ records, Class 12 board percentile, or 3-tier artisan scrutiny).\n\n' +
        'Tip: Open the Eligibility Checker results page and expand any scheme card to see the exact satisfied, missing, and verification-required rules.',
    };
  }

  if (matchedSchemes.length === 0) {
    return {
      mode: 'database_fallback',
      notice:
        reason ||
        'Live Gemini AI service is currently unavailable. Showing verified database search results instead.',
      sources: [],
      content:
        'I could not find an exact scheme match in our verified database for that query. Try searching by category (such as Agriculture, Scholarships, Housing, Healthcare, Women, Pension, or Entrepreneurship) in the Explore Schemes directory or run the Eligibility Checker.',
    };
  }

  const lines: string[] = [
    'Here are the most relevant verified schemes found in the Yojana Sarthi database for your query:\n',
  ];

  for (const s of matchedSchemes) {
    lines.push(`• ${s.name} (${s.governmentLevel} — ${s.stateCoverage})`);
    lines.push(`  Benefit: ${s.mainBenefit}`);
    lines.push(`  Target group: ${s.targetBeneficiaries}`);
    lines.push(`  Key documents: ${s.documents.slice(0, 3).join('; ')}`);
    lines.push(`  Official website: ${s.officialApplicationUrl}\n`);
  }

  if (profileContext && Object.keys(profileContext).length > 0) {
    const evalRes = evaluateAllSchemes(matchedSchemes, profileContext);
    lines.push(
      `Quick check against your authorized profile: ${evalRes.eligibleCount} Eligible, ${evalRes.potentiallyEligibleCount} Potentially Eligible, ${evalRes.notEligibleCount} Not Eligible among the matched schemes above.`
    );
  }

  lines.push(
    'Note: Always verify final eligibility and submit applications directly on the official government portals listed below.'
  );

  return {
    mode: 'database_fallback',
    notice:
      reason ||
      'Live Gemini AI service is currently unavailable. Showing transparent verified database search results instead.',
    sources,
    content: lines.join('\n'),
  };
}

export async function askYojanaMitra(params: {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  schemes: Scheme[];
  profileContext?: CitizenProfile | null;
}): Promise<AssistantReply> {
  const { message, history, schemes, profileContext } = params;
  const verifiedSchemes = schemes.filter((s) => s.verificationStatus === 'verified');
  const matchedSchemes = retrieveRelevantSchemes(message, verifiedSchemes, 5);

  const sources: ChatSourceRef[] = matchedSchemes.map((s) => ({
    schemeId: s.id,
    name: s.name,
    officialUrl: s.officialApplicationUrl,
    sourceUrl: s.officialSourceUrl,
    verificationStatus: s.verificationStatus,
  }));

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return buildDatabaseFallbackReply(
      message,
      matchedSchemes,
      profileContext,
      'Gemini API key is not configured in server environment variables. Displaying verified database search results instead.'
    );
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const schemeContextBlock = matchedSchemes
    .map((s) => {
      const rulesText = s.rules
        .map(
          (r) =>
            `  - ${r.label} (${r.operator} ${JSON.stringify(r.expectedValue)})${
              r.requiresOfficialVerification ? ' [Requires official verification]' : ''
            }: ${r.explanation}`
        )
        .join('\n');
      return [
        `SCHEME: ${s.name}`,
        `Category: ${s.category} | Level: ${s.governmentLevel} | State Coverage: ${s.stateCoverage}`,
        `Department: ${s.department}`,
        `Target Beneficiaries: ${s.targetBeneficiaries}`,
        `Main Benefit: ${s.mainBenefit}`,
        `Benefits: ${s.benefits.join(' | ')}`,
        `Documents Required: ${s.documents.join('; ')}`,
        `Application Method: ${s.applicationMethod}`,
        `Application Steps: ${s.applicationSteps.join(' -> ')}`,
        `Official Application URL: ${s.officialApplicationUrl}`,
        `Official Source URL: ${s.officialSourceUrl}`,
        `Last Verified Date: ${s.lastVerifiedDate}`,
        `Structured Eligibility Rules:\n${rulesText}`,
      ].join('\n');
    })
    .join('\n\n---\n\n');

  let profileBlock = 'User has NOT shared personal profile data for this message.';
  if (profileContext && Object.keys(profileContext).length > 0) {
    const evalSummary = evaluateAllSchemes(verifiedSchemes, profileContext);
    const eligibleNames = evalSummary.results
      .filter((r) => r.status === 'ELIGIBLE')
      .map((r) => r.schemeName);
    const potentialNames = evalSummary.results
      .filter((r) => r.status === 'POTENTIALLY_ELIGIBLE')
      .map((r) => `${r.schemeName} (missing/verify: ${[...r.missingConditions, ...r.verificationRequiredConditions].map((c) => c.label).join(', ')})`);

    profileBlock = [
      'AUTHORIZED USER PROFILE CONTEXT (user explicitly consented to share):',
      JSON.stringify(profileContext),
      `Current Rule-Engine Summary -> Eligible (${eligibleNames.length}): ${eligibleNames.join(', ') || 'None'}`,
      `Potentially Eligible (${potentialNames.length}): ${potentialNames.slice(0, 6).join('; ') || 'None'}`,
    ].join('\n');
  }

  const systemInstruction = [
    'You are Yojana Mitra, the citizen-friendly Indian Government Welfare Scheme Guide inside the Yojana Sarthi platform.',
    'STRICT GROUNDING & SAFETY RULES:',
    '1. Base your factual answers strictly on the VERIFIED SCHEME RECORDS provided below. Never fabricate scheme names, income ceilings, age limits, benefits, deadlines, or official URLs.',
    '2. If a citizen asks about a scheme or state rule NOT present in the provided records, clearly say you do not have that verified record in Yojana Sarthi yet and direct them to myscheme.gov.in or india.gov.in to check official details.',
    '3. Explain government terms (such as DBT, BPL, SECC, EWS, LIG, NSQF, Domicile) in simple, everyday English suitable for first-time internet users.',
    '4. Always distinguish preliminary eligibility guidance from official government approval. Never claim an application has been submitted or approved.',
    '5. When eligibility depends on missing fields (like annual family income, state, age, or BPL status), politely ask 1–2 concise follow-up questions.',
    '6. Cite the official application URL for any scheme you discuss. Keep responses well-structured, concise (under 280 words unless detailed steps are requested), warm, and trustworthy.',
    '',
    '=== VERIFIED SCHEME RECORDS FROM DATABASE ===',
    schemeContextBlock,
    '',
    '=== PROFILE CONTEXT ===',
    profileBlock,
  ].join('\n');

  const recentHistory = history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Citizen' : 'Yojana Mitra'}: ${m.content}`)
    .join('\n\n');

  const promptContents = recentHistory
    ? `Recent conversation:\n${recentHistory}\n\nCitizen's latest question:\n${message}`
    : message;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: promptContents,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    const replyText = response.text?.trim();
    if (!replyText) {
      throw new Error('Empty response received from Gemini API.');
    }

    return {
      content: replyText,
      sources,
      mode: 'gemini_ai',
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown upstream AI error';
    let userFriendlyNotice =
      'Yojana Mitra AI could not reach the Gemini service right now. Showing verified database search results instead.';
    if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('PERMISSION_DENIED') || errMsg.includes('403')) {
      userFriendlyNotice =
        'Gemini API key appears invalid or lacks permission (check Settings > Secrets). Showing verified database search results instead.';
    } else if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429')) {
      userFriendlyNotice =
        'Gemini API rate limit reached. Showing verified database search results instead.';
    }

    return buildDatabaseFallbackReply(message, matchedSchemes, profileContext, userFriendlyNotice);
  }
}
