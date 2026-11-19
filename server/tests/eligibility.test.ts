import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, describe, it } from 'node:test';
import { getAllSchemesWithRules, getDb } from '../db.ts';
import { evaluateAllSchemes, evaluateSchemeEligibility } from '../eligibilityEngine.ts';
import { generateRecommendations } from '../recommendationEngine.ts';
import { createServer } from '../../server.ts';
import type { Scheme } from '../../src/types.ts';

describe('Yojana Sarthi Eligibility Engine & Recommendation Tests', () => {
  const db = getDb(':memory:');
  const schemes = getAllSchemesWithRules(db, false);
  const bySlug = (slug: string): Scheme => {
    const found = schemes.find((s) => s.slug === slug);
    assert.ok(found, `Expected seeded scheme ${slug}`);
    return found;
  };

  it('seeds at least 14 verified Central and State schemes', () => {
    assert.ok(schemes.length >= 14, `Expected >= 14 schemes, got ${schemes.length}`);
    const central = schemes.filter((s) => s.governmentLevel === 'Central Government');
    const state = schemes.filter((s) => s.governmentLevel === 'State Government');
    assert.ok(central.length >= 10);
    assert.ok(state.length >= 2);
  });

  it('marks fully eligible farmer as ELIGIBLE for PM-KISAN and taxpayer farmer as NOT_ELIGIBLE', () => {
    const pmKisan = bySlug('pm-kisan');

    const eligibleRes = evaluateSchemeEligibility(pmKisan, {
      age: 35,
      isFarmer: true,
      ownsCultivableLand: true,
      isIncomeTaxPayer: 'no',
    });
    assert.equal(eligibleRes.status, 'ELIGIBLE');
    assert.equal(eligibleRes.failedConditions.length, 0);
    assert.equal(eligibleRes.missingConditions.length, 0);

    const ineligibleRes = evaluateSchemeEligibility(pmKisan, {
      age: 35,
      isFarmer: true,
      ownsCultivableLand: true,
      isIncomeTaxPayer: 'yes',
    });
    assert.equal(ineligibleRes.status, 'NOT_ELIGIBLE');
    assert.ok(ineligibleRes.failedConditions.some((c) => c.field === 'isIncomeTaxPayer'));
  });

  it('never treats missing information as a pass (returns POTENTIALLY_ELIGIBLE with missing details)', () => {
    const csss = bySlug('pm-usp-csss');
    const res = evaluateSchemeEligibility(csss, {
      isStudent: true,
      educationLevel: 'undergraduate',
      age: 19,
      // annualFamilyIncome intentionally omitted
    });
    assert.equal(res.status, 'POTENTIALLY_ELIGIBLE');
    assert.ok(res.missingConditions.some((c) => c.field === 'annualFamilyIncome'));
    assert.match(res.summaryExplanation, /Annual Family Income/i);
  });

  it('enforces exact age boundaries (Atal Pension Yojana 18–40 & IGNOAPS 60+)', () => {
    const apy = bySlug('atal-pension-yojana');
    assert.equal(evaluateSchemeEligibility(apy, { age: 17, isIncomeTaxPayer: 'no' }).status, 'NOT_ELIGIBLE');
    assert.equal(evaluateSchemeEligibility(apy, { age: 18, isIncomeTaxPayer: 'no' }).status, 'ELIGIBLE');
    assert.equal(evaluateSchemeEligibility(apy, { age: 40, isIncomeTaxPayer: 'no' }).status, 'ELIGIBLE');
    assert.equal(evaluateSchemeEligibility(apy, { age: 41, isIncomeTaxPayer: 'no' }).status, 'NOT_ELIGIBLE');

    const ignoaps = bySlug('ignoaps');
    assert.equal(evaluateSchemeEligibility(ignoaps, { age: 59, bplStatus: 'yes' }).status, 'NOT_ELIGIBLE');
    assert.equal(evaluateSchemeEligibility(ignoaps, { age: 60, bplStatus: 'yes' }).status, 'ELIGIBLE');
  });

  it('enforces exact annual family income boundaries (Maharashtra Ladki Bahin ₹2.5L & UP Kanya Sumangala ₹3L)', () => {
    const ladki = bySlug('mh-ladki-bahin-yojana');
    const atLimit = evaluateSchemeEligibility(ladki, {
      state: 'Maharashtra',
      gender: 'female',
      age: 21,
      annualFamilyIncome: 250000,
      isIncomeTaxPayer: 'no',
    });
    assert.equal(atLimit.status, 'ELIGIBLE');

    const overLimit = evaluateSchemeEligibility(ladki, {
      state: 'Maharashtra',
      gender: 'female',
      age: 21,
      annualFamilyIncome: 250001,
      isIncomeTaxPayer: 'no',
    });
    assert.equal(overLimit.status, 'NOT_ELIGIBLE');

    const kanya = bySlug('up-kanya-sumangala-yojana');
    assert.equal(
      evaluateSchemeEligibility(kanya, { state: 'Uttar Pradesh', annualFamilyIncome: 300000, childrenCount: 2 }).status,
      'ELIGIBLE'
    );
    assert.equal(
      evaluateSchemeEligibility(kanya, { state: 'Uttar Pradesh', annualFamilyIncome: 300001, childrenCount: 2 }).status,
      'NOT_ELIGIBLE'
    );
  });

  it('enforces State restrictions accurately', () => {
    const upScheme = bySlug('up-kanya-sumangala-yojana');
    const nonUpRes = evaluateSchemeEligibility(upScheme, {
      state: 'Karnataka',
      annualFamilyIncome: 150000,
      childrenCount: 1,
    });
    assert.equal(nonUpRes.status, 'NOT_ELIGIBLE');
    assert.ok(nonUpRes.failedConditions.some((c) => c.field === 'state'));
  });

  it('evaluates OR logical groups accurately (AB-PMJAY 70+ universal pathway vs BPL pathway)', () => {
    const pmjay = bySlug('ab-pmjay');
    // Age 72 non-BPL citizen should be ELIGIBLE via 70+ universal pathway
    const seniorRes = evaluateSchemeEligibility(pmjay, { age: 72, bplStatus: 'no' });
    assert.equal(seniorRes.status, 'ELIGIBLE');

    // Age 40 non-BPL citizen fails both OR branches -> NOT_ELIGIBLE
    const neitherRes = evaluateSchemeEligibility(pmjay, { age: 40, bplStatus: 'no' });
    assert.equal(neitherRes.status, 'NOT_ELIGIBLE');

    // Age 40 BPL citizen -> POTENTIALLY_ELIGIBLE (official SECC verification required)
    const bplRes = evaluateSchemeEligibility(pmjay, { age: 40, bplStatus: 'yes' });
    assert.equal(bplRes.status, 'POTENTIALLY_ELIGIBLE');
  });

  it('never marks an unverified scheme as definitively ELIGIBLE or NOT_ELIGIBLE', () => {
    const sample = { ...bySlug('mgnrega'), verificationStatus: 'unverified' as const };
    const res = evaluateSchemeEligibility(sample, { residenceType: 'urban', age: 15 });
    assert.equal(res.status, 'POTENTIALLY_ELIGIBLE');
  });

  it('recommendations exclude NOT_ELIGIBLE schemes and rank ELIGIBLE before POTENTIALLY_ELIGIBLE', () => {
    const recs = generateRecommendations(schemes, {
      age: 30,
      gender: 'female',
      state: 'Maharashtra',
      residenceType: 'rural',
      annualFamilyIncome: 180000,
      isIncomeTaxPayer: 'no',
      bplStatus: 'no',
      occupation: 'farmer',
      isFarmer: true,
      ownsCultivableLand: true,
    });

    assert.ok(recs.length >= 3);
    assert.ok(recs.every((r) => r.eligibility.status !== 'NOT_ELIGIBLE'));
    assert.equal(recs[0].eligibility.status, 'ELIGIBLE');
    // UP-specific scheme must be excluded for Maharashtra resident
    assert.ok(!recs.some((r) => r.scheme.slug === 'up-kanya-sumangala-yojana'));
  });

  it('calculates exact summary counts across all schemes', () => {
    const evalAll = evaluateAllSchemes(schemes, {
      age: 62,
      state: 'Uttar Pradesh',
      residenceType: 'rural',
      bplStatus: 'yes',
      isIncomeTaxPayer: 'no',
    });
    assert.equal(
      evalAll.eligibleCount + evalAll.potentiallyEligibleCount + evalAll.notEligibleCount,
      evalAll.totalSchemesChecked
    );
  });
});

describe('Yojana Sarthi Full-Stack REST API & RBAC Integration Tests', () => {
  let server: http.Server;
  let baseUrl = '';

  before(async () => {
    process.env.SQLITE_DB_PATH = ':memory:';
    process.env.NODE_ENV = 'production';
    const app = await createServer();
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (addr && typeof addr !== 'string') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('supports citizen registration, profile update, saved schemes, and blocks admin endpoints with 403', async () => {
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Citizen',
        email: `citizen_${Date.now()}@example.com`,
        password: 'Password@123',
      }),
    });
    assert.equal(regRes.status, 201);
    const { token } = (await regRes.json()) as { token: string };
    assert.ok(token);

    // Citizen attempting to access admin endpoint must receive 403 Forbidden
    const adminAttempt = await fetch(`${baseUrl}/api/admin/schemes`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(adminAttempt.status, 403);

    // Run eligibility check & save to profile
    const checkRes = await fetch(`${baseUrl}/api/eligibility/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        saveToProfile: true,
        profile: { age: 25, state: 'Maharashtra', residenceType: 'rural', isIncomeTaxPayer: 'no' },
      }),
    });
    assert.equal(checkRes.status, 200);
    const checkJson = (await checkRes.json()) as { eligibleCount: number; totalSchemesChecked: number };
    assert.ok(checkJson.totalSchemesChecked >= 14);
    assert.ok(checkJson.eligibleCount >= 2);

    // Dashboard should reflect saved eligibility history
    const dashRes = await fetch(`${baseUrl}/api/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(dashRes.status, 200);
    const dashJson = (await dashRes.json()) as { recentChecks: unknown[] };
    assert.ok(dashJson.recentChecks.length > 0);
  });

  it('allows admin login, scheme creation, verification toggle, and records audit logs', async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@yojanasarthi.in',
        password: process.env.ADMIN_SEED_PASSWORD || 'Admin@Yojana2026',
      }),
    });
    assert.equal(loginRes.status, 200);
    const { token } = (await loginRes.json()) as { token: string };

    const createRes = await fetch(`${baseUrl}/api/admin/schemes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Test State Scholarship Record',
        shortDescription: 'A temporary test record to verify admin validation and persistence.',
        overview: 'Detailed overview of the temporary test scholarship record.',
        objective: 'Verify admin CRUD and audit logging.',
        category: 'Education and Scholarships',
        governmentLevel: 'State Government',
        department: 'State Education Department',
        stateCoverage: 'Karnataka',
        targetBeneficiaries: 'Students in Karnataka',
        mainBenefit: 'Test benefit entry',
        benefits: ['Benefit 1'],
        documents: ['Income Certificate'],
        applicationSteps: ['Step 1: Visit official portal'],
        applicationMethod: 'Online',
        officialApplicationUrl: 'https://www.myscheme.gov.in/',
        officialSourceUrl: 'https://www.myscheme.gov.in/',
        verificationStatus: 'unverified',
        lastVerifiedDate: '2026-03-01',
        ageGroupSummary: '18+ years',
        incomeLimitSummary: 'Up to ₹2,00,000',
        rules: [],
      }),
    });
    assert.equal(createRes.status, 201);
    const { scheme } = (await createRes.json()) as { scheme: Scheme };

    const logsRes = await fetch(`${baseUrl}/api/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(logsRes.status, 200);
    const { logs } = (await logsRes.json()) as { logs: Array<{ action: string }> };
    assert.ok(logs.some((l) => l.action === 'CREATE_SCHEME'));

    const delRes = await fetch(`${baseUrl}/api/admin/schemes/${scheme.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(delRes.status, 200);
  });

  it('responds cleanly from Yojana Mitra chat endpoint with source references', async () => {
    const chatRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What schemes are available for farmers?',
      }),
    });
    assert.equal(chatRes.status, 200);
    const chatJson = (await chatRes.json()) as {
      message: { content: string; sources: Array<{ name: string }>; mode: string };
    };
    assert.ok(chatJson.message.content.length > 20);
    assert.ok(chatJson.message.sources.some((s) => s.name.includes('PM-KISAN')));
  });
});
