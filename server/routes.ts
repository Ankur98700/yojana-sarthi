import crypto from 'crypto';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import type { CitizenProfile, Scheme } from '../src/types.ts';
import { askYojanaMitra } from './aiAssistant.ts';
import {
  clearAuthCookie,
  mapUserRow,
  optionalAuth,
  requireAdmin,
  requireAuth,
  setAuthCookie,
  signAuthToken,
  type AuthenticatedRequest,
} from './auth.ts';
import {
  getAllSchemesWithRules,
  getDb,
  getSchemeByIdOrSlug,
  hashPassword,
  verifyPassword,
} from './db.ts';
import { evaluateAllSchemes, evaluateSchemeEligibility } from './eligibilityEngine.ts';
import { generateRecommendations } from './recommendationEngine.ts';

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

const profileSchema = z.object({
  name: z.string().max(120).optional(),
  age: z.number().int().min(0).max(120).nullable().optional(),
  dateOfBirth: z.string().max(20).optional(),
  gender: z.enum(['female', 'male', 'other', '']).optional(),
  state: z.string().max(80).optional(),
  district: z.string().max(80).optional(),
  residenceType: z.enum(['rural', 'urban', '']).optional(),
  maritalStatus: z.enum(['single', 'married', 'widowed', 'divorced', '']).optional(),
  annualFamilyIncome: z.number().min(0).max(1000000000).nullable().optional(),
  occupation: z.string().max(80).optional(),
  employmentStatus: z.string().max(80).optional(),
  bplStatus: z.enum(['yes', 'no', 'unknown', '']).optional(),
  isIncomeTaxPayer: z.enum(['yes', 'no', '']).optional(),
  educationLevel: z.string().max(80).optional(),
  isStudent: z.boolean().nullable().optional(),
  institutionType: z.enum(['government', 'aided', 'private', '']).optional(),
  familySize: z.number().int().min(1).max(50).nullable().optional(),
  dependentsCount: z.number().int().min(0).max(50).nullable().optional(),
  childrenCount: z.number().int().min(0).max(30).nullable().optional(),
  hasGirlChildUnder10: z.boolean().nullable().optional(),
  ownsPuccaHouse: z.boolean().nullable().optional(),
  isFarmer: z.boolean().nullable().optional(),
  ownsCultivableLand: z.boolean().nullable().optional(),
  landholdingHectares: z.number().min(0).max(1000).nullable().optional(),
  hasDisability: z.boolean().nullable().optional(),
  isTraditionalArtisan: z.boolean().nullable().optional(),
  preferredCategories: z.array(z.string().max(80)).optional(),
  languagePreference: z.string().max(10).optional(),
});

const adminRuleSchema = z.object({
  field: z.string().trim().min(1),
  label: z.string().trim().min(1),
  operator: z.enum(['gte', 'gt', 'lte', 'lt', 'eq', 'neq', 'in', 'not_in']),
  expectedValue: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  logicalGroup: z.string().trim().default('default'),
  groupOperator: z.enum(['AND', 'OR']).default('AND'),
  isMandatory: z.boolean().default(true),
  requiresOfficialVerification: z.boolean().default(false),
  ruleVerified: z.boolean().default(true),
  explanation: z.string().trim().min(3),
  source: z.string().trim().default(''),
});

const adminSchemeSchema = z.object({
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens').optional(),
  name: z.string().trim().min(3).max(200),
  shortDescription: z.string().trim().min(10).max(500),
  overview: z.string().trim().min(10).max(3000),
  objective: z.string().trim().min(5).max(1000),
  category: z.string().trim().min(2).max(100),
  governmentLevel: z.enum(['Central Government', 'State Government']),
  department: z.string().trim().min(2).max(200),
  stateCoverage: z.string().trim().min(2).max(100),
  targetBeneficiaries: z.string().trim().min(3).max(500),
  mainBenefit: z.string().trim().min(3).max(300),
  benefits: z.array(z.string().trim().min(1)).min(1),
  documents: z.array(z.string().trim().min(1)).min(1),
  applicationSteps: z.array(z.string().trim().min(1)).min(1),
  applicationMethod: z.enum(['Online', 'Offline', 'Online & Offline']),
  officialApplicationUrl: z.string().url('Official application URL must be a valid URL'),
  officialSourceUrl: z.string().url('Official source URL must be a valid URL'),
  verificationStatus: z.enum(['verified', 'unverified']),
  lastVerifiedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  ageGroupSummary: z.string().trim().min(2).max(200),
  incomeLimitSummary: z.string().trim().min(2).max(250),
  occupationTags: z.array(z.string()).default(['all']),
  educationTags: z.array(z.string()).default(['all']),
  beneficiaryTags: z.array(z.string()).default([]),
  rules: z.array(adminRuleSchema).default([]),
});

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function logAdminAudit(
  adminId: number,
  adminEmail: string,
  action: string,
  entityType: string,
  entityId: number | null,
  summary: string
) {
  const db = getDb();
  db.prepare(
    `INSERT INTO admin_audit_logs (admin_id, admin_email, action, entity_type, entity_id, summary) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(adminId, adminEmail, action, entityType, entityId, summary);
}

function calculateProfileCompletion(profile: CitizenProfile): { percentage: number; missingFields: string[] } {
  const checks: Array<{ key: keyof CitizenProfile; label: string }> = [
    { key: 'age', label: 'Age' },
    { key: 'state', label: 'State' },
    { key: 'residenceType', label: 'Rural or Urban residence' },
    { key: 'annualFamilyIncome', label: 'Annual family income' },
    { key: 'occupation', label: 'Occupation' },
    { key: 'employmentStatus', label: 'Employment status' },
    { key: 'educationLevel', label: 'Education level' },
    { key: 'bplStatus', label: 'BPL status' },
    { key: 'familySize', label: 'Family size' },
  ];

  const missingFields: string[] = [];
  let filled = 0;
  for (const item of checks) {
    const val = profile[item.key];
    if (val !== undefined && val !== null && val !== '') {
      filled++;
    } else {
      missingFields.push(item.label);
    }
  }
  return {
    percentage: Math.round((filled / checks.length) * 100),
    missingFields,
  };
}

function matchesAgeGroupFilter(scheme: Scheme, ageGroup: string): boolean {
  const summary = scheme.ageGroupSummary.toLowerCase();
  if (ageGroup === 'children') return summary.includes('10') || summary.includes('birth') || summary.includes('child') || summary.includes('all');
  if (ageGroup === 'youth') return summary.includes('15') || summary.includes('17') || summary.includes('18') || summary.includes('all');
  if (ageGroup === 'adults') return summary.includes('18') || summary.includes('21') || summary.includes('40') || summary.includes('all');
  if (ageGroup === 'seniors') return summary.includes('60') || summary.includes('70') || summary.includes('65') || summary.includes('all');
  return true;
}

export function createApiRouter(): Router {
  const router = Router();

  // Health check
  router.get('/health', (_req: Request, res: Response) => {
    const db = getDb();
    const schemeCount = (db.prepare('SELECT COUNT(*) as c FROM schemes').get() as { c: number }).c;
    res.json({ status: 'ok', schemesInDatabase: schemeCount });
  });

  // ===================== AUTH ROUTES =====================

  router.post('/auth/register', (req: Request, res: Response) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid registration data' });
      return;
    }

    const { name, email, password } = parsed.data;
    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
      return;
    }

    const initialProfile: CitizenProfile = { name };
    const info = db
      .prepare('INSERT INTO users (name, email, password_hash, role, profile_json) VALUES (?, ?, ?, ?, ?)')
      .run(name, email, hashPassword(password), 'citizen', JSON.stringify(initialProfile));

    const userRow = db
      .prepare('SELECT id, name, email, role, profile_json, created_at FROM users WHERE id = ?')
      .get(Number(info.lastInsertRowid)) as {
      id: number;
      name: string;
      email: string;
      role: 'citizen' | 'admin';
      profile_json: string;
      created_at: string;
    };

    const user = mapUserRow(userRow);
    const token = signAuthToken({ userId: user.id, email: user.email, role: user.role });
    setAuthCookie(res, token);
    res.status(201).json({ user, token });
  });

  router.post('/auth/login', (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid credentials' });
      return;
    }

    const { email, password } = parsed.data;
    const db = getDb();
    const row = db
      .prepare('SELECT id, name, email, password_hash, role, profile_json, created_at FROM users WHERE email = ?')
      .get(email) as
      | {
          id: number;
          name: string;
          email: string;
          password_hash: string;
          role: 'citizen' | 'admin';
          profile_json: string;
          created_at: string;
        }
      | undefined;

    if (!row || !verifyPassword(password, row.password_hash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const user = mapUserRow(row);
    const token = signAuthToken({ userId: user.id, email: user.email, role: user.role });
    setAuthCookie(res, token);
    res.json({ user, token });
  });

  router.post('/auth/logout', (_req: Request, res: Response) => {
    clearAuthCookie(res);
    res.json({ success: true });
  });

  router.get('/auth/me', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({ user: req.user || null });
  });

  router.post('/auth/forgot-password', (req: Request, res: Response) => {
    const emailParsed = z.object({ email: z.string().trim().email().toLowerCase() }).safeParse(req.body);
    if (!emailParsed.success) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }

    const db = getDb();
    const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(emailParsed.data.email) as
      | { id: number; email: string }
      | undefined;

    if (!user) {
      // Do not leak account existence in message
      res.json({
        message: 'If an account matches that email, a reset code has been generated.',
      });
      return;
    }

    const rawToken = crypto.randomBytes(16).toString('hex').slice(0, 12).toUpperCase();
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    db.prepare('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(
      user.id,
      tokenHash,
      expiresAt
    );

    res.json({
      message: 'A time-limited password reset code has been generated (valid for 30 minutes).',
      // Since SMTP is not configured in local/sandbox deployment, return code transparently so reset flow works end-to-end
      devResetCode: process.env.SMTP_HOST ? undefined : rawToken,
    });
  });

  router.post('/auth/reset-password', (req: Request, res: Response) => {
    const parsed = z
      .object({
        resetCode: z.string().trim().min(6),
        newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid reset request' });
      return;
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(parsed.data.resetCode.trim().toUpperCase())
      .digest('hex');
    const db = getDb();
    const record = db
      .prepare('SELECT id, user_id, expires_at, used FROM password_resets WHERE token_hash = ?')
      .get(tokenHash) as { id: number; user_id: number; expires_at: string; used: number } | undefined;

    if (!record || record.used || new Date(record.expires_at).getTime() < Date.now()) {
      res.status(400).json({ error: 'Reset code is invalid or has expired.' });
      return;
    }

    const tx = db.transaction(() => {
      db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(
        hashPassword(parsed.data.newPassword),
        record.user_id
      );
      db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(record.id);
    });
    tx();

    res.json({ message: 'Your password has been updated. You can now log in with your new password.' });
  });

  // ===================== USER PROFILE =====================

  router.get('/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const completion = calculateProfileCompletion(req.user!.profile);
    res.json({
      profile: req.user!.profile,
      completion,
    });
  });

  router.put('/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid profile data' });
      return;
    }

    const db = getDb();
    const merged: CitizenProfile = { ...req.user!.profile, ...parsed.data };
    const updatedName = parsed.data.name?.trim() || req.user!.name;

    db.prepare("UPDATE users SET name = ?, profile_json = ?, updated_at = datetime('now') WHERE id = ?").run(
      updatedName,
      JSON.stringify(merged),
      req.user!.id
    );

    const completion = calculateProfileCompletion(merged);
    res.json({
      profile: merged,
      name: updatedName,
      completion,
    });
  });

  // ===================== PUBLIC SCHEME EXPLORER =====================

  router.get('/schemes/meta', (_req: Request, res: Response) => {
    const db = getDb();
    const schemes = getAllSchemesWithRules(db, false);
    const categories = (db.prepare('SELECT id, name FROM categories ORDER BY name ASC').all() as Array<{
      id: number;
      name: string;
    }>).map((c) => c.name);

    const centralCount = schemes.filter((s) => s.governmentLevel === 'Central Government').length;
    const stateCount = schemes.filter((s) => s.governmentLevel === 'State Government').length;
    const statesCovered = Array.from(
      new Set(schemes.filter((s) => s.stateCoverage !== 'All India').map((s) => s.stateCoverage))
    ).sort();

    res.json({
      totalVerifiedSchemes: schemes.length,
      centralSchemesCount: centralCount,
      stateSchemesCount: stateCount,
      categories,
      statesWithDedicatedSchemes: statesCovered,
    });
  });

  router.get('/schemes', (req: Request, res: Response) => {
    const db = getDb();
    const includeUnverified = req.query.includeUnverified === 'true';
    let schemes = getAllSchemesWithRules(db, includeUnverified);

    const q = String(req.query.q || '').trim().toLowerCase();
    const category = String(req.query.category || '').trim();
    const level = String(req.query.level || '').trim();
    const state = String(req.query.state || '').trim();
    const ageGroup = String(req.query.ageGroup || '').trim();
    const maxIncomeRaw = String(req.query.maxIncome || '').trim();
    const occupation = String(req.query.occupation || '').trim();
    const education = String(req.query.education || '').trim();
    const beneficiary = String(req.query.beneficiary || '').trim();
    const sort = String(req.query.sort || 'alphabetical');
    const page = Math.max(1, Number(req.query.page || 1) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 9) || 9));

    if (q) {
      schemes = schemes.filter((s) => {
        const text = [
          s.name,
          s.shortDescription,
          s.overview,
          s.category,
          s.department,
          s.targetBeneficiaries,
          s.mainBenefit,
          s.benefits.join(' '),
          s.stateCoverage,
        ]
          .join(' ')
          .toLowerCase();
        return text.includes(q);
      });
    }

    if (category && category !== 'all') {
      schemes = schemes.filter((s) => s.category.toLowerCase() === category.toLowerCase());
    }

    if (level && level !== 'all') {
      schemes = schemes.filter((s) => s.governmentLevel === level);
    }

    if (state && state !== 'all') {
      schemes = schemes.filter(
        (s) => s.stateCoverage === 'All India' || s.stateCoverage.toLowerCase() === state.toLowerCase()
      );
    }

    if (ageGroup && ageGroup !== 'all') {
      schemes = schemes.filter((s) => matchesAgeGroupFilter(s, ageGroup));
    }

    if (maxIncomeRaw && maxIncomeRaw !== 'all') {
      const userIncome = Number(maxIncomeRaw);
      if (!Number.isNaN(userIncome)) {
        schemes = schemes.filter((s) => {
          const incomeRules = s.rules.filter(
            (r) => r.field === 'annualFamilyIncome' && (r.operator === 'lte' || r.operator === 'lt')
          );
          if (incomeRules.length === 0) return true;
          return incomeRules.every((r) => userIncome <= Number(r.expectedValue));
        });
      }
    }

    if (occupation && occupation !== 'all') {
      schemes = schemes.filter(
        (s) => s.occupationTags.includes('all') || s.occupationTags.includes(occupation)
      );
    }

    if (education && education !== 'all') {
      schemes = schemes.filter(
        (s) => s.educationTags.includes('all') || s.educationTags.includes(education)
      );
    }

    if (beneficiary && beneficiary !== 'all') {
      schemes = schemes.filter((s) => s.beneficiaryTags.includes(beneficiary));
    }

    if (sort === 'recently_verified') {
      schemes.sort((a, b) => b.lastVerifiedDate.localeCompare(a.lastVerifiedDate));
    } else if (sort === 'category') {
      schemes.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    } else {
      schemes.sort((a, b) => a.name.localeCompare(b.name));
    }

    const total = schemes.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const offset = (page - 1) * limit;
    const paginated = schemes.slice(offset, offset + limit);

    res.json({
      items: paginated,
      total,
      page,
      limit,
      totalPages,
    });
  });

  router.get('/schemes/:idOrSlug', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
    const db = getDb();
    const scheme = getSchemeByIdOrSlug(db, String(req.params.idOrSlug));
    if (!scheme) {
      res.status(404).json({ error: 'Government scheme not found.' });
      return;
    }

    if (req.user) {
      db.prepare(
        `INSERT INTO recently_viewed_schemes (user_id, scheme_id, viewed_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(user_id, scheme_id) DO UPDATE SET viewed_at = datetime('now')`
      ).run(req.user.id, scheme.id);
    }

    res.json({ scheme });
  });

  // ===================== ELIGIBILITY CHECKER =====================

  router.post('/eligibility/check', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
    const bodySchema = z.object({
      profile: profileSchema,
      schemeId: z.number().int().positive().optional(),
      saveToProfile: z.boolean().optional(),
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid eligibility questionnaire input' });
      return;
    }

    const { profile, schemeId, saveToProfile } = parsed.data;
    const db = getDb();

    if (req.user && saveToProfile) {
      const merged = { ...req.user.profile, ...profile };
      db.prepare("UPDATE users SET profile_json = ?, updated_at = datetime('now') WHERE id = ?").run(
        JSON.stringify(merged),
        req.user.id
      );
    }

    if (schemeId) {
      const scheme = getSchemeByIdOrSlug(db, schemeId);
      if (!scheme) {
        res.status(404).json({ error: 'Scheme not found.' });
        return;
      }
      const single = evaluateSchemeEligibility(scheme, profile);
      if (req.user) {
        db.prepare(
          `INSERT INTO eligibility_history (user_id, scheme_id, result, summary_explanation, reasons_json)
           VALUES (?, ?, ?, ?, ?)`
        ).run(req.user.id, scheme.id, single.status, single.summaryExplanation, JSON.stringify(single.allEvaluations));
      }
      res.json({
        checkedAt: new Date().toISOString(),
        totalSchemesChecked: 1,
        eligibleCount: single.status === 'ELIGIBLE' ? 1 : 0,
        potentiallyEligibleCount: single.status === 'POTENTIALLY_ELIGIBLE' ? 1 : 0,
        notEligibleCount: single.status === 'NOT_ELIGIBLE' ? 1 : 0,
        results: [single],
      });
      return;
    }

    const schemes = getAllSchemesWithRules(db, false);
    const evaluation = evaluateAllSchemes(schemes, profile);

    // Record history snapshot for authenticated users (top eligible & potentially eligible + summary)
    if (req.user) {
      const insertHist = db.prepare(
        `INSERT INTO eligibility_history (user_id, scheme_id, result, summary_explanation, reasons_json)
         VALUES (?, ?, ?, ?, ?)`
      );
      const saveHistTx = db.transaction(() => {
        for (const r of evaluation.results) {
          insertHist.run(
            req.user!.id,
            r.schemeId,
            r.status,
            r.summaryExplanation,
            JSON.stringify({
              satisfied: r.satisfiedConditions.map((c) => c.label),
              failed: r.failedConditions.map((c) => c.label),
              missing: r.missingConditions.map((c) => c.label),
            })
          );
        }
      });
      saveHistTx();
    }

    res.json(evaluation);
  });

  router.get('/eligibility/history', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT eh.id, eh.user_id as userId, eh.scheme_id as schemeId, s.name as schemeName,
                s.category, eh.result, eh.summary_explanation as summaryExplanation, eh.evaluated_at as evaluatedAt
         FROM eligibility_history eh
         JOIN schemes s ON s.id = eh.scheme_id
         WHERE eh.user_id = ?
         ORDER BY eh.evaluated_at DESC, eh.id DESC
         LIMIT 50`
      )
      .all(req.user!.id);

    res.json({ history: rows });
  });

  // ===================== RECOMMENDATIONS =====================

  router.post('/recommendations', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
    const bodyParsed = z
      .object({
        profile: profileSchema.optional(),
        preferredCategories: z.array(z.string()).optional(),
      })
      .safeParse(req.body || {});

    if (!bodyParsed.success) {
      res.status(400).json({ error: 'Invalid recommendation parameters.' });
      return;
    }

    const profile: CitizenProfile = bodyParsed.data.profile || req.user?.profile || {};
    const db = getDb();
    const schemes = getAllSchemesWithRules(db, false);
    const recommendations = generateRecommendations(schemes, profile, bodyParsed.data.preferredCategories);

    res.json({
      totalRecommended: recommendations.length,
      usedProfile: Object.keys(profile).length > 0,
      recommendations,
    });
  });

  // ===================== COMPARISON =====================

  router.get('/compare', (req: Request, res: Response) => {
    const idsParam = String(req.query.ids || '').trim();
    if (!idsParam) {
      res.json({ schemes: [] });
      return;
    }
    const ids = idsParam
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0)
      .slice(0, 3);

    const db = getDb();
    const schemes: Scheme[] = [];
    for (const id of ids) {
      const s = getSchemeByIdOrSlug(db, id);
      if (s) schemes.push(s);
    }

    res.json({ schemes });
  });

  // ===================== SAVED SCHEMES =====================

  router.get('/saved', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const db = getDb();
    const rows = db
      .prepare('SELECT scheme_id, saved_at FROM saved_schemes WHERE user_id = ? ORDER BY saved_at DESC')
      .all(req.user!.id) as Array<{ scheme_id: number; saved_at: string }>;

    const saved = rows
      .map((r) => {
        const scheme = getSchemeByIdOrSlug(db, r.scheme_id);
        return scheme ? { scheme, savedAt: r.saved_at } : null;
      })
      .filter(Boolean);

    res.json({ saved });
  });

  router.post('/saved/:schemeId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const schemeId = Number(req.params.schemeId);
    const db = getDb();
    const scheme = getSchemeByIdOrSlug(db, schemeId);
    if (!scheme) {
      res.status(404).json({ error: 'Scheme not found.' });
      return;
    }
    db.prepare('INSERT OR IGNORE INTO saved_schemes (user_id, scheme_id) VALUES (?, ?)').run(
      req.user!.id,
      scheme.id
    );
    res.status(201).json({ saved: true, schemeId: scheme.id });
  });

  router.delete('/saved/:schemeId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const schemeId = Number(req.params.schemeId);
    const db = getDb();
    db.prepare('DELETE FROM saved_schemes WHERE user_id = ? AND scheme_id = ?').run(req.user!.id, schemeId);
    res.json({ saved: false, schemeId });
  });

  // ===================== USER DASHBOARD =====================

  router.get('/dashboard', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const db = getDb();
    const user = req.user!;
    const allSchemes = getAllSchemesWithRules(db, false);
    const profileCompletion = calculateProfileCompletion(user.profile);

    const hasProfileData = Object.keys(user.profile).some((k) => {
      if (k === 'name' || k === 'preferredCategories' || k === 'languagePreference') return false;
      const v = (user.profile as Record<string, unknown>)[k];
      return v !== undefined && v !== null && v !== '';
    });

    const eligibilitySummary = hasProfileData ? evaluateAllSchemes(allSchemes, user.profile) : null;
    const recommendations = hasProfileData ? generateRecommendations(allSchemes, user.profile).slice(0, 6) : [];

    const savedRows = db
      .prepare('SELECT scheme_id, saved_at FROM saved_schemes WHERE user_id = ? ORDER BY saved_at DESC')
      .all(user.id) as Array<{ scheme_id: number; saved_at: string }>;
    const savedSchemes = savedRows
      .map((r) => {
        const s = getSchemeByIdOrSlug(db, r.scheme_id);
        return s ? { scheme: s, savedAt: r.saved_at } : null;
      })
      .filter((x): x is { scheme: Scheme; savedAt: string } => Boolean(x));

    const recentRows = db
      .prepare(
        'SELECT scheme_id, viewed_at FROM recently_viewed_schemes WHERE user_id = ? ORDER BY viewed_at DESC LIMIT 6'
      )
      .all(user.id) as Array<{ scheme_id: number; viewed_at: string }>;
    const recentlyViewed = recentRows
      .map((r) => {
        const s = getSchemeByIdOrSlug(db, r.scheme_id);
        return s ? { scheme: s, viewedAt: r.viewed_at } : null;
      })
      .filter((x): x is { scheme: Scheme; viewedAt: string } => Boolean(x));

    const recentChecks = db
      .prepare(
        `SELECT eh.id, eh.scheme_id as schemeId, s.name as schemeName, s.category,
                eh.result, eh.summary_explanation as summaryExplanation, eh.evaluated_at as evaluatedAt
         FROM eligibility_history eh
         JOIN schemes s ON s.id = eh.scheme_id
         WHERE eh.user_id = ?
         ORDER BY eh.evaluated_at DESC, eh.id DESC
         LIMIT 15`
      )
      .all(user.id);

    // Aggregate document checklist from Saved + Eligible schemes
    const docMap = new Map<string, string[]>();
    const checklistSchemes: Scheme[] = [...savedSchemes.map((s) => s.scheme)];
    if (eligibilitySummary) {
      const eligibleIds = new Set(
        eligibilitySummary.results.filter((r) => r.status === 'ELIGIBLE').map((r) => r.schemeId)
      );
      for (const s of allSchemes) {
        if (eligibleIds.has(s.id) && !checklistSchemes.some((c) => c.id === s.id)) {
          checklistSchemes.push(s);
        }
      }
    }
    for (const s of checklistSchemes) {
      for (const doc of s.documents) {
        const list = docMap.get(doc) || [];
        list.push(s.name);
        docMap.set(doc, list);
      }
    }
    const documentChecklist = Array.from(docMap.entries()).map(([document, schemesList]) => ({
      document,
      schemes: schemesList,
    }));

    res.json({
      user,
      profileCompletion,
      eligibilitySummary,
      recommendations,
      savedSchemes,
      recentlyViewed,
      recentChecks,
      documentChecklist,
    });
  });

  // ===================== YOJANA MITRA AI CHAT =====================

  router.get('/chat/history', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
    const db = getDb();
    const sessionKey = req.user ? `user_${req.user.id}` : String(req.query.sessionKey || '');
    if (!sessionKey) {
      res.json({ messages: [] });
      return;
    }
    const rows = db
      .prepare(
        `SELECT id, role, content, sources_json, mode, created_at
         FROM chat_history
         WHERE session_key = ?
         ORDER BY id ASC
         LIMIT 60`
      )
      .all(sessionKey) as Array<{
      id: number;
      role: 'user' | 'assistant';
      content: string;
      sources_json: string;
      mode: 'gemini_ai' | 'database_fallback';
      created_at: string;
    }>;

    const messages = rows.map((r) => ({
      id: String(r.id),
      role: r.role,
      content: r.content,
      timestamp: r.created_at,
      sources: JSON.parse(r.sources_json || '[]'),
      mode: r.mode,
    }));

    res.json({ messages });
  });

  router.delete('/chat/history', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
    const db = getDb();
    const sessionKey = req.user ? `user_${req.user.id}` : String(req.query.sessionKey || '');
    if (sessionKey) {
      db.prepare('DELETE FROM chat_history WHERE session_key = ?').run(sessionKey);
    }
    res.json({ cleared: true });
  });

  router.post('/chat', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
    const parsed = z
      .object({
        message: z.string().trim().min(1, 'Message cannot be empty').max(1500),
        sessionKey: z.string().max(100).optional(),
        includeProfileContext: z.boolean().optional(),
        guestProfile: profileSchema.optional(),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid chat input' });
      return;
    }

    const { message, includeProfileContext, guestProfile } = parsed.data;
    const db = getDb();
    const sessionKey = req.user
      ? `user_${req.user.id}`
      : parsed.data.sessionKey || `guest_${crypto.randomBytes(8).toString('hex')}`;

    const priorRows = db
      .prepare('SELECT role, content FROM chat_history WHERE session_key = ? ORDER BY id DESC LIMIT 8')
      .all(sessionKey) as Array<{ role: 'user' | 'assistant'; content: string }>;
    const history = priorRows.reverse();

    const schemes = getAllSchemesWithRules(db, false);
    const authorizedProfile = includeProfileContext ? req.user?.profile || guestProfile || null : null;

    db.prepare(
      'INSERT INTO chat_history (user_id, session_key, role, content, sources_json, mode) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.user?.id || null, sessionKey, 'user', message, '[]', 'gemini_ai');

    const reply = await askYojanaMitra({
      message,
      history,
      schemes,
      profileContext: authorizedProfile,
    });

    const insertInfo = db
      .prepare(
        'INSERT INTO chat_history (user_id, session_key, role, content, sources_json, mode) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(
        req.user?.id || null,
        sessionKey,
        'assistant',
        reply.content,
        JSON.stringify(reply.sources),
        reply.mode
      );

    res.json({
      sessionKey,
      message: {
        id: String(insertInfo.lastInsertRowid),
        role: 'assistant',
        content: reply.content,
        timestamp: new Date().toISOString(),
        sources: reply.sources,
        mode: reply.mode,
        notice: reply.notice,
      },
    });
  });

  // ===================== CONTACT FORM =====================

  router.post('/contact', (req: Request, res: Response) => {
    const parsed = z
      .object({
        name: z.string().trim().min(2).max(120),
        email: z.string().trim().email(),
        subject: z.string().trim().min(3).max(200),
        message: z.string().trim().min(10).max(2000),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Please complete all fields.' });
      return;
    }

    const db = getDb();
    db.prepare('INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)').run(
      parsed.data.name,
      parsed.data.email,
      parsed.data.subject,
      parsed.data.message
    );

    res.status(201).json({
      message: 'Thank you for writing to Yojana Sarthi. Your feedback has been recorded for review.',
    });
  });

  // ===================== ADMIN PANEL ROUTES (PROTECTED) =====================

  router.get('/admin/schemes', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
    const db = getDb();
    const schemes = getAllSchemesWithRules(db, true);
    res.json({ schemes });
  });

  router.post('/admin/schemes', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const parsed = adminSchemeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid scheme record', issues: parsed.error.issues });
      return;
    }

    const s = parsed.data;
    const slug = s.slug || `${slugify(s.name)}-${Date.now().toString(36).slice(-4)}`;
    const db = getDb();

    const duplicate = db.prepare('SELECT id FROM schemes WHERE slug = ?').get(slug);
    if (duplicate) {
      res.status(409).json({ error: 'A scheme with this URL slug already exists.' });
      return;
    }

    let createdId = 0;
    const tx = db.transaction(() => {
      db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)').run(s.category);
      const info = db
        .prepare(
          `INSERT INTO schemes (
            slug, name, short_description, overview, objective, category, government_level,
            department, state_coverage, target_beneficiaries, main_benefit,
            benefits_json, documents_json, application_steps_json, application_method,
            official_application_url, official_source_url, verification_status, last_verified_date,
            age_group_summary, income_limit_summary, occupation_tags_json, education_tags_json, beneficiary_tags_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          slug,
          s.name,
          s.shortDescription,
          s.overview,
          s.objective,
          s.category,
          s.governmentLevel,
          s.department,
          s.stateCoverage,
          s.targetBeneficiaries,
          s.mainBenefit,
          JSON.stringify(s.benefits),
          JSON.stringify(s.documents),
          JSON.stringify(s.applicationSteps),
          s.applicationMethod,
          s.officialApplicationUrl,
          s.officialSourceUrl,
          s.verificationStatus,
          s.lastVerifiedDate,
          s.ageGroupSummary,
          s.incomeLimitSummary,
          JSON.stringify(s.occupationTags),
          JSON.stringify(s.educationTags),
          JSON.stringify(s.beneficiaryTags)
        );
      createdId = Number(info.lastInsertRowid);

      const insertRule = db.prepare(
        `INSERT INTO eligibility_rules (
          scheme_id, field, label, operator, expected_value_json, logical_group,
          group_operator, is_mandatory, requires_official_verification, rule_verified, explanation, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const r of s.rules) {
        insertRule.run(
          createdId,
          r.field,
          r.label,
          r.operator,
          JSON.stringify(r.expectedValue),
          r.logicalGroup,
          r.groupOperator,
          r.isMandatory ? 1 : 0,
          r.requiresOfficialVerification ? 1 : 0,
          r.ruleVerified ? 1 : 0,
          r.explanation,
          r.source
        );
      }
    });

    tx();
    logAdminAudit(req.user!.id, req.user!.email, 'CREATE_SCHEME', 'scheme', createdId, `Added scheme "${s.name}" (${s.verificationStatus})`);

    res.status(201).json({ scheme: getSchemeByIdOrSlug(db, createdId) });
  });

  router.put('/admin/schemes/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const schemeId = Number(req.params.id);
    const db = getDb();
    const existing = getSchemeByIdOrSlug(db, schemeId);
    if (!existing) {
      res.status(404).json({ error: 'Scheme not found.' });
      return;
    }

    const parsed = adminSchemeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid scheme update', issues: parsed.error.issues });
      return;
    }

    const s = parsed.data;
    const tx = db.transaction(() => {
      db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)').run(s.category);
      db.prepare(
        `UPDATE schemes SET
          name = ?, short_description = ?, overview = ?, objective = ?, category = ?,
          government_level = ?, department = ?, state_coverage = ?, target_beneficiaries = ?,
          main_benefit = ?, benefits_json = ?, documents_json = ?, application_steps_json = ?,
          application_method = ?, official_application_url = ?, official_source_url = ?,
          verification_status = ?, last_verified_date = ?, age_group_summary = ?,
          income_limit_summary = ?, occupation_tags_json = ?, education_tags_json = ?,
          beneficiary_tags_json = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).run(
        s.name,
        s.shortDescription,
        s.overview,
        s.objective,
        s.category,
        s.governmentLevel,
        s.department,
        s.stateCoverage,
        s.targetBeneficiaries,
        s.mainBenefit,
        JSON.stringify(s.benefits),
        JSON.stringify(s.documents),
        JSON.stringify(s.applicationSteps),
        s.applicationMethod,
        s.officialApplicationUrl,
        s.officialSourceUrl,
        s.verificationStatus,
        s.lastVerifiedDate,
        s.ageGroupSummary,
        s.incomeLimitSummary,
        JSON.stringify(s.occupationTags),
        JSON.stringify(s.educationTags),
        JSON.stringify(s.beneficiaryTags),
        schemeId
      );

      db.prepare('DELETE FROM eligibility_rules WHERE scheme_id = ?').run(schemeId);
      const insertRule = db.prepare(
        `INSERT INTO eligibility_rules (
          scheme_id, field, label, operator, expected_value_json, logical_group,
          group_operator, is_mandatory, requires_official_verification, rule_verified, explanation, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const r of s.rules) {
        insertRule.run(
          schemeId,
          r.field,
          r.label,
          r.operator,
          JSON.stringify(r.expectedValue),
          r.logicalGroup,
          r.groupOperator,
          r.isMandatory ? 1 : 0,
          r.requiresOfficialVerification ? 1 : 0,
          r.ruleVerified ? 1 : 0,
          r.explanation,
          r.source
        );
      }
    });

    tx();
    logAdminAudit(
      req.user!.id,
      req.user!.email,
      'UPDATE_SCHEME',
      'scheme',
      schemeId,
      `Updated scheme "${s.name}" (${s.rules.length} rules, status: ${s.verificationStatus})`
    );

    res.json({ scheme: getSchemeByIdOrSlug(db, schemeId) });
  });

  router.patch('/admin/schemes/:id/verify', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const schemeId = Number(req.params.id);
    const parsed = z
      .object({
        verificationStatus: z.enum(['verified', 'unverified']),
        lastVerifiedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid verification update.' });
      return;
    }

    const db = getDb();
    const existing = getSchemeByIdOrSlug(db, schemeId);
    if (!existing) {
      res.status(404).json({ error: 'Scheme not found.' });
      return;
    }

    const verifiedDate = parsed.data.lastVerifiedDate || new Date().toISOString().slice(0, 10);
    db.prepare(
      "UPDATE schemes SET verification_status = ?, last_verified_date = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(parsed.data.verificationStatus, verifiedDate, schemeId);

    logAdminAudit(
      req.user!.id,
      req.user!.email,
      'VERIFY_SCHEME',
      'scheme',
      schemeId,
      `Marked "${existing.name}" as ${parsed.data.verificationStatus} (date: ${verifiedDate})`
    );

    res.json({ scheme: getSchemeByIdOrSlug(db, schemeId) });
  });

  router.delete('/admin/schemes/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const schemeId = Number(req.params.id);
    const db = getDb();
    const existing = getSchemeByIdOrSlug(db, schemeId);
    if (!existing) {
      res.status(404).json({ error: 'Scheme not found.' });
      return;
    }

    db.prepare('DELETE FROM schemes WHERE id = ?').run(schemeId);
    logAdminAudit(
      req.user!.id,
      req.user!.email,
      'DELETE_SCHEME',
      'scheme',
      schemeId,
      `Deleted scheme "${existing.name}"`
    );
    res.json({ deleted: true, id: schemeId });
  });

  router.get('/admin/categories', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
    const db = getDb();
    const categories = db.prepare('SELECT id, name, created_at as createdAt FROM categories ORDER BY name ASC').all();
    res.json({ categories });
  });

  router.post('/admin/categories', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const parsed = z.object({ name: z.string().trim().min(2).max(100) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Category name must be at least 2 characters.' });
      return;
    }
    const db = getDb();
    try {
      const info = db.prepare('INSERT INTO categories (name) VALUES (?)').run(parsed.data.name);
      logAdminAudit(
        req.user!.id,
        req.user!.email,
        'CREATE_CATEGORY',
        'category',
        Number(info.lastInsertRowid),
        `Added category "${parsed.data.name}"`
      );
      res.status(201).json({ id: Number(info.lastInsertRowid), name: parsed.data.name });
    } catch {
      res.status(409).json({ error: 'This category already exists.' });
    }
  });

  router.delete('/admin/categories/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const catId = Number(req.params.id);
    const db = getDb();
    const row = db.prepare('SELECT id, name FROM categories WHERE id = ?').get(catId) as
      | { id: number; name: string }
      | undefined;
    if (!row) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }
    db.prepare('DELETE FROM categories WHERE id = ?').run(catId);
    logAdminAudit(req.user!.id, req.user!.email, 'DELETE_CATEGORY', 'category', catId, `Removed category "${row.name}"`);
    res.json({ deleted: true });
  });

  router.get('/admin/audit-logs', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
    const db = getDb();
    const logs = db
      .prepare(
        `SELECT id, admin_id as adminId, admin_email as adminEmail, action, entity_type as entityType,
                entity_id as entityId, summary, created_at as createdAt
         FROM admin_audit_logs
         ORDER BY id DESC
         LIMIT 100`
      )
      .all();
    res.json({ logs });
  });

  return router;
}
