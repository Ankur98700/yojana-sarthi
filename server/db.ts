import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { SCHEME_CATEGORIES } from '../src/constants/india.ts';
import type { EligibilityRule, Scheme } from '../src/types.ts';
import { INITIAL_SCHEMES } from './seedSchemes.ts';

let dbInstance: Database.Database | null = null;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, keyHex] = stored.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

export function getDb(customPath?: string): Database.Database {
  if (dbInstance && !customPath) return dbInstance;

  const dbPath = customPath || process.env.SQLITE_DB_PATH || path.resolve(process.cwd(), 'data', 'yojana_sarthi.db');
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initSchema(db);
  seedInitialData(db);

  if (!customPath) {
    dbInstance = db;
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'citizen' CHECK(role IN ('citizen', 'admin')),
      profile_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS schemes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      short_description TEXT NOT NULL,
      overview TEXT NOT NULL,
      objective TEXT NOT NULL,
      category TEXT NOT NULL,
      government_level TEXT NOT NULL CHECK(government_level IN ('Central Government', 'State Government')),
      department TEXT NOT NULL,
      state_coverage TEXT NOT NULL,
      target_beneficiaries TEXT NOT NULL,
      main_benefit TEXT NOT NULL,
      benefits_json TEXT NOT NULL DEFAULT '[]',
      documents_json TEXT NOT NULL DEFAULT '[]',
      application_steps_json TEXT NOT NULL DEFAULT '[]',
      application_method TEXT NOT NULL DEFAULT 'Online & Offline',
      official_application_url TEXT NOT NULL,
      official_source_url TEXT NOT NULL,
      verification_status TEXT NOT NULL DEFAULT 'verified' CHECK(verification_status IN ('verified', 'unverified')),
      last_verified_date TEXT NOT NULL,
      age_group_summary TEXT NOT NULL DEFAULT 'All ages',
      income_limit_summary TEXT NOT NULL DEFAULT 'As per scheme guidelines',
      occupation_tags_json TEXT NOT NULL DEFAULT '["all"]',
      education_tags_json TEXT NOT NULL DEFAULT '["all"]',
      beneficiary_tags_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS eligibility_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scheme_id INTEGER NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
      field TEXT NOT NULL,
      label TEXT NOT NULL,
      operator TEXT NOT NULL,
      expected_value_json TEXT NOT NULL,
      logical_group TEXT NOT NULL DEFAULT 'default',
      group_operator TEXT NOT NULL DEFAULT 'AND' CHECK(group_operator IN ('AND', 'OR')),
      is_mandatory INTEGER NOT NULL DEFAULT 1,
      requires_official_verification INTEGER NOT NULL DEFAULT 0,
      rule_verified INTEGER NOT NULL DEFAULT 1,
      explanation TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS saved_schemes (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      scheme_id INTEGER NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
      saved_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, scheme_id)
    );

    CREATE TABLE IF NOT EXISTS recently_viewed_schemes (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      scheme_id INTEGER NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
      viewed_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, scheme_id)
    );

    CREATE TABLE IF NOT EXISTS eligibility_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      scheme_id INTEGER NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
      result TEXT NOT NULL,
      summary_explanation TEXT NOT NULL,
      reasons_json TEXT NOT NULL DEFAULT '{}',
      evaluated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      session_key TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      sources_json TEXT NOT NULL DEFAULT '[]',
      mode TEXT NOT NULL DEFAULT 'gemini_ai',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      admin_email TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      summary TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_schemes_category ON schemes(category);
    CREATE INDEX IF NOT EXISTS idx_schemes_state ON schemes(state_coverage);
    CREATE INDEX IF NOT EXISTS idx_rules_scheme ON eligibility_rules(scheme_id);
    CREATE INDEX IF NOT EXISTS idx_history_user ON eligibility_history(user_id, evaluated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_history(session_key, created_at ASC);
  `);
}

function seedInitialData(db: Database.Database) {
  const insertCat = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
  for (const cat of SCHEME_CATEGORIES) {
    insertCat.run(cat);
  }

  const adminEmail = 'admin@yojanasarthi.in';
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (!existingAdmin) {
    const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'Admin@Yojana2026';
    db.prepare(
      `INSERT INTO users (name, email, password_hash, role, profile_json) VALUES (?, ?, ?, 'admin', '{}')`
    ).run('Yojana Sarthi Administrator', adminEmail, hashPassword(adminPassword));
  }

  const schemeCount = (db.prepare('SELECT COUNT(*) as count FROM schemes').get() as { count: number }).count;
  if (schemeCount === 0) {
    const insertScheme = db.prepare(`
      INSERT INTO schemes (
        slug, name, short_description, overview, objective, category, government_level,
        department, state_coverage, target_beneficiaries, main_benefit,
        benefits_json, documents_json, application_steps_json, application_method,
        official_application_url, official_source_url, verification_status, last_verified_date,
        age_group_summary, income_limit_summary, occupation_tags_json, education_tags_json, beneficiary_tags_json
      ) VALUES (
        @slug, @name, @shortDescription, @overview, @objective, @category, @governmentLevel,
        @department, @stateCoverage, @targetBeneficiaries, @mainBenefit,
        @benefitsJson, @documentsJson, @applicationStepsJson, @applicationMethod,
        @officialApplicationUrl, @officialSourceUrl, @verificationStatus, @lastVerifiedDate,
        @ageGroupSummary, @incomeLimitSummary, @occupationTagsJson, @educationTagsJson, @beneficiaryTagsJson
      )
    `);

    const insertRule = db.prepare(`
      INSERT INTO eligibility_rules (
        scheme_id, field, label, operator, expected_value_json, logical_group,
        group_operator, is_mandatory, requires_official_verification, rule_verified, explanation, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const seedTx = db.transaction(() => {
      for (const s of INITIAL_SCHEMES) {
        const res = insertScheme.run({
          slug: s.slug,
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
          benefitsJson: JSON.stringify(s.benefits),
          documentsJson: JSON.stringify(s.documents),
          applicationStepsJson: JSON.stringify(s.applicationSteps),
          applicationMethod: s.applicationMethod,
          officialApplicationUrl: s.officialApplicationUrl,
          officialSourceUrl: s.officialSourceUrl,
          verificationStatus: s.verificationStatus,
          lastVerifiedDate: s.lastVerifiedDate,
          ageGroupSummary: s.ageGroupSummary,
          incomeLimitSummary: s.incomeLimitSummary,
          occupationTagsJson: JSON.stringify(s.occupationTags),
          educationTagsJson: JSON.stringify(s.educationTags),
          beneficiaryTagsJson: JSON.stringify(s.beneficiaryTags),
        });
        const schemeId = Number(res.lastInsertRowid);
        for (const r of s.rules) {
          insertRule.run(
            schemeId,
            r.field,
            r.label,
            r.operator,
            JSON.stringify(r.expectedValue),
            r.logicalGroup || 'default',
            r.groupOperator || 'AND',
            r.isMandatory === false ? 0 : 1,
            r.requiresOfficialVerification ? 1 : 0,
            r.ruleVerified === false ? 0 : 1,
            r.explanation,
            r.source
          );
        }
      }
    });

    seedTx();
  }
}

interface SchemeRow {
  id: number;
  slug: string;
  name: string;
  short_description: string;
  overview: string;
  objective: string;
  category: string;
  government_level: 'Central Government' | 'State Government';
  department: string;
  state_coverage: string;
  target_beneficiaries: string;
  main_benefit: string;
  benefits_json: string;
  documents_json: string;
  application_steps_json: string;
  application_method: 'Online' | 'Offline' | 'Online & Offline';
  official_application_url: string;
  official_source_url: string;
  verification_status: 'verified' | 'unverified';
  last_verified_date: string;
  age_group_summary: string;
  income_limit_summary: string;
  occupation_tags_json: string;
  education_tags_json: string;
  beneficiary_tags_json: string;
  created_at: string;
  updated_at: string;
}

interface RuleRow {
  id: number;
  scheme_id: number;
  field: string;
  label: string;
  operator: EligibilityRule['operator'];
  expected_value_json: string;
  logical_group: string;
  group_operator: 'AND' | 'OR';
  is_mandatory: number;
  requires_official_verification: number;
  rule_verified: number;
  explanation: string;
  source: string;
}

function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function mapRuleRow(r: RuleRow): EligibilityRule {
  return {
    id: r.id,
    schemeId: r.scheme_id,
    field: r.field,
    label: r.label,
    operator: r.operator,
    expectedValue: safeJsonParse(r.expected_value_json, ''),
    logicalGroup: r.logical_group,
    groupOperator: r.group_operator,
    isMandatory: Boolean(r.is_mandatory),
    requiresOfficialVerification: Boolean(r.requires_official_verification),
    ruleVerified: Boolean(r.rule_verified),
    explanation: r.explanation,
    source: r.source,
  };
}

export function mapSchemeRow(row: SchemeRow, rules: EligibilityRule[]): Scheme {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description,
    overview: row.overview,
    objective: row.objective,
    category: row.category,
    governmentLevel: row.government_level,
    department: row.department,
    stateCoverage: row.state_coverage,
    targetBeneficiaries: row.target_beneficiaries,
    mainBenefit: row.main_benefit,
    benefits: safeJsonParse<string[]>(row.benefits_json, []),
    documents: safeJsonParse<string[]>(row.documents_json, []),
    applicationSteps: safeJsonParse<string[]>(row.application_steps_json, []),
    applicationMethod: row.application_method,
    officialApplicationUrl: row.official_application_url,
    officialSourceUrl: row.official_source_url,
    verificationStatus: row.verification_status,
    lastVerifiedDate: row.last_verified_date,
    ageGroupSummary: row.age_group_summary,
    incomeLimitSummary: row.income_limit_summary,
    occupationTags: safeJsonParse<string[]>(row.occupation_tags_json, ['all']),
    educationTags: safeJsonParse<string[]>(row.education_tags_json, ['all']),
    beneficiaryTags: safeJsonParse<string[]>(row.beneficiary_tags_json, []),
    rules,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getAllSchemesWithRules(db: Database.Database, includeUnverified = false): Scheme[] {
  const rows = (includeUnverified
    ? db.prepare('SELECT * FROM schemes ORDER BY name ASC').all()
    : db.prepare("SELECT * FROM schemes WHERE verification_status = 'verified' ORDER BY name ASC").all()) as SchemeRow[];

  const ruleRows = db.prepare('SELECT * FROM eligibility_rules ORDER BY id ASC').all() as RuleRow[];
  const rulesByScheme = new Map<number, EligibilityRule[]>();
  for (const rr of ruleRows) {
    const list = rulesByScheme.get(rr.scheme_id) || [];
    list.push(mapRuleRow(rr));
    rulesByScheme.set(rr.scheme_id, list);
  }

  return rows.map((row) => mapSchemeRow(row, rulesByScheme.get(row.id) || []));
}

export function getSchemeByIdOrSlug(db: Database.Database, idOrSlug: string | number): Scheme | null {
  const isNum = typeof idOrSlug === 'number' || /^\d+$/.test(String(idOrSlug));
  const row = (isNum
    ? db.prepare('SELECT * FROM schemes WHERE id = ?').get(Number(idOrSlug))
    : db.prepare('SELECT * FROM schemes WHERE slug = ?').get(String(idOrSlug))) as SchemeRow | undefined;

  if (!row) return null;
  const ruleRows = db.prepare('SELECT * FROM eligibility_rules WHERE scheme_id = ? ORDER BY id ASC').all(row.id) as RuleRow[];
  return mapSchemeRow(row, ruleRows.map(mapRuleRow));
}
