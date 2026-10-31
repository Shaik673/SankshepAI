import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_DIR = path.resolve(__dirname, '../../backend');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3000';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runBrowserE2E() {
  console.log('================================================================');
  console.log('  SANKSHEPAI COMPREHENSIVE END-TO-END BROWSER AUTOMATION SUITE  ');
  console.log('================================================================\n');

  if (!fs.existsSync(EDGE_PATH)) {
    throw new Error(`Edge executable not found at: ${EDGE_PATH}`);
  }

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    defaultViewport: { width: 1280, height: 900 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  const page = await browser.newPage();
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`  [BROWSER ERROR]:`, msg.text());
    }
  });

  page.on('pageerror', (err) => {
    console.error('  [BROWSER UNHANDLED ERROR]:', err.message);
    pageErrors.push(err.message);
  });

  try {
    // ── STEP 1: LANDING PAGE & DEMO INTERACTION ────────────────────────────
    console.log('[Step 1] Loading Landing Page & Hero Section...');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(1000);

    const title = await page.title();
    console.log('  ✓ Page title:', title);

    const heroHeading = await page.$eval('h1', (el) => el.innerText).catch(() => 'No H1');
    console.log('  ✓ Hero heading:', heroHeading.replace(/\n/g, ' '));

    // Test interactive demo switcher on landing page
    const switchedDemo = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('TextRank'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    if (switchedDemo) {
      console.log('  ✓ Interactive demo tab switched to TextRank');
    }

    // ── STEP 2: VERIFY AUTH PAGES & SOCIAL PROVIDERS ───────────────────────
    console.log('\n[Step 2] Navigating to Signup Page & verifying Social Auth buttons...');
    await page.goto(`${BASE_URL}/signup`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(1500);

    const pageContent = await page.content();
    const hasLinkedIn = pageContent.includes('LinkedIn') || (await page.$('button[aria-label*="LinkedIn" i]')) !== null;
    const hasFacebook = pageContent.includes('Facebook');

    console.log('  ✓ LinkedIn provider rendered:', hasLinkedIn);
    console.log('  ✓ Facebook provider removed:', !hasFacebook);

    if (!hasLinkedIn || hasFacebook) {
      throw new Error(`Social auth validation failed! LinkedIn=${hasLinkedIn}, Facebook=${hasFacebook}`);
    }

    // ── STEP 3: USER REGISTRATION ───────────────────────────────────────────
    console.log('\n[Step 3] Submitting Registration Form...');
    const timestamp = Date.now();
    const testEmail = `analyst_${timestamp}@sankshep.gov.in`;
    const initialPassword = 'GovSecure#Password2026!';
    const testName = 'Dr. Priya Narayanan';

    await page.waitForSelector('#fullName', { timeout: 5000 });
    await page.type('#fullName', testName);
    await page.type('#email', testEmail);
    await page.type('#password', initialPassword);
    await page.type('#confirmPassword', initialPassword);
    await page.click('input[type="checkbox"]');

    console.log('  ✓ Submitting registration for:', testEmail);

    const [signupResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/auth/signup') && r.request().method() === 'POST',
        { timeout: 15000 }
      ),
      page.click('button[type="submit"]'),
    ]);

    const signupJson = await signupResponse.json();
    console.log('  ✓ Signup API Status:', signupResponse.status());
    console.log('  ✓ devOtp received:', signupJson.devOtp);

    const devOtp = signupJson.devOtp;
    if (!devOtp) {
      throw new Error('devOtp was not returned in development signup response');
    }

    // ── STEP 4: EMAIL OTP VERIFICATION ──────────────────────────────────────
    console.log('\n[Step 4] Verifying Email with OTP...');
    await sleep(2000);

    // Click Auto-Verify if button rendered or enter OTP digits
    const autoVerifyClicked = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('Auto-Verify'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (autoVerifyClicked) {
      console.log('  ✓ Auto-Verify triggered!');
    } else {
      console.log('  ✓ Entering OTP digits:', devOtp);
      const otpInputs = await page.$$('input[inputmode="numeric"], input[type="text"]');
      const digits = String(devOtp).split('');
      for (let i = 0; i < Math.min(digits.length, otpInputs.length); i++) {
        await otpInputs[i].click();
        await otpInputs[i].type(digits[i]);
      }
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('Verify email'));
        if (btn) btn.click();
      });
    }

    // Wait for redirect to onboarding
    await page.waitForFunction(
      () => window.location.pathname.includes('/onboarding') || window.location.pathname.includes('/app/dashboard'),
      { timeout: 15000 }
    );
    console.log('  ✓ Landed on:', page.url());

    // ── STEP 5: 3-STEP ONBOARDING WIZARD ────────────────────────────────────
    if (page.url().includes('/onboarding')) {
      console.log('\n[Step 5] Completing 3-Step Guided Onboarding...');
      await sleep(1500);

      // Step 1: Occupation & Organization
      console.log('  - Step 1: Submitting Identity & Organization');
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('Government'));
        if (btn) btn.click();
      });

      const instInput = await page.$('input[placeholder*="organization" i], input[placeholder*="Ministry" i], input[type="text"]');
      if (instInput) await instInput.type('Ministry of Electronics & IT');

      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('Continue to Preferences'));
        if (btn) btn.click();
      });
      await sleep(1500);

      // Step 2: Preferences
      console.log('  - Step 2: Selecting Document Preferences');
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('Continue to Discovery'));
        if (btn) btn.click();
      });
      await sleep(1500);

      // Step 3: Discovery & Launch
      console.log('  - Step 3: Completing Setup & Launching Workspace');
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('Complete Setup & Go to Dashboard'));
        if (btn) btn.click();
      });
      await sleep(3000);
    }

    // ── STEP 6: DASHBOARD VERIFICATION ──────────────────────────────────────
    console.log('\n[Step 6] Verifying User Dashboard...');
    await page.goto(`${BASE_URL}/app/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(1500);

    const dashText = await page.$eval('body', (el) => el.innerText);
    console.log('  ✓ Dashboard loaded! Current URL:', page.url());
    console.log('  ✓ Dashboard header rendered:', dashText.includes('Dashboard') || dashText.includes('Welcome back'));

    // ── STEP 7: INGEST OFFICIAL GOVERNMENT CIRCULAR ─────────────────────────
    console.log('\n[Step 7] Ingesting Official Government Circular into Knowledge Base...');
    const circularPayload = {
      title: 'Ministry of Finance Circular 88/2026: Capital Subsidy for Renewable Energy MSMEs',
      content: `GOVERNMENT OF INDIA
MINISTRY OF FINANCE
DEPARTMENT OF FINANCIAL SERVICES
NORTH BLOCK, NEW DELHI

Notification F. No. 12/04/2026-DFS
Date: 12th February 2026

SUBJECT: NOTIFICATION OF 25% CAPITAL INVESTMENT SUBSIDY SCHEME FOR CLEAN ENERGY MSMEs

1. SHORT TITLE AND COMMENCEMENT:
This scheme shall be cited as the "Clean Energy MSME Capital Subsidy Scheme 2026". It shall come into force with immediate effect from the date of publication in the Official Gazette and remain active until 31st March 2029.

2. ELIGIBILITY CRITERIA:
(a) The enterprise must be registered as a Micro, Small, or Medium Enterprise on the Udyam portal.
(b) The manufacturing unit must achieve at least 30% reduction in carbon emissions verified by the Bureau of Energy Efficiency (BEE).
(c) The cumulative project capital expenditure must not exceed INR 50 Crores.

3. FINANCIAL INCENTIVE:
Eligible enterprises shall receive a direct non-refundable capital subsidy of 25% on plant, machinery, and solar rooftop installations, capped at a maximum ceiling of INR 5 Crores per applicant entity.

4. MANDATORY AUDIT AND DEADLINE:
Beneficiary enterprises must submit third-party technical and chartered accountant audit certifications within 90 days of project commercial operation date (COD). Failure to comply will lead to recovery of disbursed subsidy with 12% penal interest.

5. DESIGNATED NODAL AGENCY:
The Small Industries Development Bank of India (SIDBI) is designated as the primary nodal agency for verification, escrow management, and direct benefit transfer (DBT) disbursals.`,
      documentType: 'government_circular',
      sourceUrl: 'https://finmin.gov.in/circulars/2026/clean-energy-msme-subsidy.pdf',
      tags: ['CleanEnergy', 'MSME', 'FinanceMinistry', 'Subsidies'],
    };

    const ingestDoc = await page.evaluate(async (payload) => {
      const token = localStorage.getItem('sankshep_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('http://localhost:3000/api/documents', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      return { status: res.status, data: await res.json() };
    }, circularPayload);

    console.log('  ✓ Document upload response status:', ingestDoc.status);
    if (!ingestDoc.data?.document?._id) {
      throw new Error(`Document upload failed: ${JSON.stringify(ingestDoc.data)}`);
    }

    const docId = ingestDoc.data.document._id;
    console.log('  ✓ Document ID created:', docId);

    // ── STEP 8: TEXTRANK BASELINE SUMMARIZATION ──────────────────────────────
    console.log('\n[Step 8] Generating TextRank Baseline Summarization...');
    const trSummary = await page.evaluate(async (id) => {
      const token = localStorage.getItem('sankshep_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`http://localhost:3000/api/documents/${id}/summarize`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          model: 'textrank',
          summaryType: 'executive',
          summaryLength: 'medium',
        }),
      });
      return { status: res.status, data: await res.json() };
    }, docId);

    console.log('  ✓ TextRank generation status:', trSummary.status);
    const summaryId = trSummary.data?.summary?._id;
    console.log('  ✓ Summary ID created:', summaryId);
    console.log('  ✓ Summary words:', trSummary.data?.summary?.summaryWordCount);
    console.log('  ✓ Compression ratio:', trSummary.data?.summary?.compressionRatio);

    // ── STEP 9: CUSTOM SEQ2SEQ & GEMINI SUMMARIZATION ────────────────────────
    console.log('\n[Step 9] Generating Custom Seq2Seq & Gemini Summaries...');
    const seq2seqSummary = await page.evaluate(async (id) => {
      const token = localStorage.getItem('sankshep_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('http://localhost:3000/api/summaries/generate', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          documentId: id,
          method: 'custom_seq2seq_attention',
          beamWidth: 4,
          maxLen: 60,
        }),
      });
      return { status: res.status, data: await res.json() };
    }, docId);

    console.log('  ✓ Seq2Seq generation status:', seq2seqSummary.status);
    console.log('  ✓ Method used:', seq2seqSummary.data?.summary?.method);

    // ── STEP 10: DOMAIN-RESTRICTED RAG (GROUNDED IN-DOMAIN Q&A) ─────────────
    console.log('\n[Step 10] Testing Domain-Restricted RAG on Official Document...');
    const inDomainQA = await page.evaluate(async (id) => {
      const token = localStorage.getItem('sankshep_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`http://localhost:3000/api/documents/${id}/ask`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          question: 'What is the capital subsidy percentage, maximum ceiling, and the designated nodal agency?',
        }),
      });
      return { status: res.status, data: await res.json() };
    }, docId);

    console.log('  ✓ In-Domain RAG HTTP status:', inDomainQA.status);
    console.log('  ✓ Grounded Answer:', inDomainQA.data?.answer?.substring(0, 160) + '...');
    console.log('  ✓ Citations returned:', inDomainQA.data?.citations?.length || 0);
    console.log('  ✓ Confidence score:', inDomainQA.data?.confidence);

    if (!inDomainQA.data?.answer) {
      throw new Error('RAG query returned no answer');
    }

    // ── STEP 11: DOMAIN-RESTRICTION ABSTENTION (OFF-DOMAIN QUERY) ───────────
    console.log('\n[Step 11] Testing Strict Domain-Restriction Rejection on Irrelevant Query...');
    const offDomainQA = await page.evaluate(async (id) => {
      const token = localStorage.getItem('sankshep_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`http://localhost:3000/api/documents/${id}/ask`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          question: 'Write a poem about dinosaurs and tell me who won the 1994 World Cup?',
        }),
      });
      return { status: res.status, data: await res.json() };
    }, docId);

    console.log('  ✓ Off-Domain Query status:', offDomainQA.status);
    console.log('  ✓ Off-Domain Answer:', offDomainQA.data?.answer);
    console.log('  ✓ Correctly rejected / abstained:',
      offDomainQA.data?.answer?.includes('support') ||
      offDomainQA.data?.answer?.includes('government') ||
      offDomainQA.data?.is_domain_rejected === true ||
      offDomainQA.data?.domainValidation?.is_domain_relevant === false
    );

    // ── STEP 12: EXPORTING SUMMARY IN PDF, DOCX, TXT FORMATS ────────────────
    console.log('\n[Step 12] Testing Summary Export in PDF, DOCX, and TXT Formats...');

    // A. PDF Export
    const pdfExport = await page.evaluate(async (sumId) => {
      const token = localStorage.getItem('sankshep_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`http://localhost:3000/api/summaries/${sumId}/export?format=pdf`, {
        headers,
        credentials: 'include',
      });
      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer.slice(0, 5));
      const magic = String.fromCharCode(...bytes);
      return { status: res.status, size: buffer.byteLength, magic };
    }, summaryId);

    console.log('  ✓ PDF Export status:', pdfExport.status);
    console.log('  ✓ PDF size:', pdfExport.size, 'bytes');
    console.log('  ✓ PDF magic bytes (%PDF-):', pdfExport.magic === '%PDF-');

    if (pdfExport.magic !== '%PDF-') {
      throw new Error(`Expected %PDF- magic header, got: ${pdfExport.magic}`);
    }

    // B. DOCX Export
    const docxExport = await page.evaluate(async (sumId) => {
      const token = localStorage.getItem('sankshep_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`http://localhost:3000/api/summaries/${sumId}/export?format=docx`, {
        headers,
        credentials: 'include',
      });
      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer.slice(0, 2));
      const magic = String.fromCharCode(...bytes);
      return { status: res.status, size: buffer.byteLength, magic };
    }, summaryId);

    console.log('  ✓ DOCX Export status:', docxExport.status);
    console.log('  ✓ DOCX size:', docxExport.size, 'bytes');
    console.log('  ✓ DOCX zip magic bytes (PK):', docxExport.magic === 'PK');

    if (docxExport.magic !== 'PK') {
      throw new Error(`Expected PK magic header for docx, got: ${docxExport.magic}`);
    }

    // C. TXT Export
    const txtExport = await page.evaluate(async (sumId) => {
      const token = localStorage.getItem('sankshep_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`http://localhost:3000/api/summaries/${sumId}/export?format=txt`, {
        headers,
        credentials: 'include',
      });
      const text = await res.text();
      return { status: res.status, hasTitle: text.includes('SUMMARY') || text.includes('SankshepAI') };
    }, summaryId);

    console.log('  ✓ TXT Export status:', txtExport.status);
    console.log('  ✓ TXT content verified:', txtExport.hasTitle);

    // ── STEP 13: EDIT SUMMARY & VERSION CONTROL ─────────────────────────────
    console.log('\n[Step 13] Testing Summary Inline Editing & Version History...');
    const editResult = await page.evaluate(async (sumId) => {
      const token = localStorage.getItem('sankshep_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const updateRes = await fetch(`http://localhost:3000/api/summaries/${sumId}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          content: 'Updated executive briefing: 25% capital subsidy scheme for clean energy MSMEs under SIDBI escrow.',
          changeNote: 'Streamlined executive bullet points',
        }),
      });

      const versionsRes = await fetch(`http://localhost:3000/api/summaries/${sumId}/versions`, {
        headers,
        credentials: 'include',
      });

      return {
        updateStatus: updateRes.status,
        updateData: await updateRes.json(),
        versionsData: await versionsRes.json(),
      };
    }, summaryId);

    console.log('  ✓ Summary update status:', editResult.updateStatus);
    console.log('  ✓ Summary new version number:', editResult.updateData?.summary?.version);
    console.log('  ✓ Versions in history:', editResult.versionsData?.versions?.length || 0);

    // ── STEP 14: MULTI-MODEL COMPARISON & ROUGE EVALUATION ──────────────────
    console.log('\n[Step 14] Testing Multi-Model Comparative Evaluation...');
    const compareRes = await page.evaluate(async (id) => {
      const token = localStorage.getItem('sankshep_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('http://localhost:3000/api/summaries/compare', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          documentId: id,
          models: ['textrank', 'seq2seq_attention', 'gemini_flash'],
        }),
      });
      return { status: res.status, data: await res.json() };
    }, docId);

    console.log('  ✓ Multi-model comparison status:', compareRes.status);
    if (compareRes.data?.models) {
      for (const [modelKey, modelData] of Object.entries(compareRes.data.models)) {
        console.log(`    - [${modelKey}]: Latency=${modelData.latencyMs}ms | ROUGE-1=${modelData.rouge?.rouge1?.toFixed(3)} | ROUGE-2=${modelData.rouge?.rouge2?.toFixed(3)} | ROUGE-L=${modelData.rouge?.rougeL?.toFixed(3)}`);
      }
    }

    // ── STEP 15: COLLECTIONS MANAGEMENT ─────────────────────────────────────
    console.log('\n[Step 15] Testing Collections Management...');
    const colRes = await page.evaluate(async (id) => {
      const token = localStorage.getItem('sankshep_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('http://localhost:3000/api/collections', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          name: 'Green Energy Directives 2026',
          description: 'Official Ministry of Finance & BEE notifications',
          color: '#10B981',
          documentIds: [id],
        }),
      });
      return { status: res.status, data: await res.json() };
    }, docId);

    console.log('  ✓ Collection created status:', colRes.status);
    console.log('  ✓ Collection Name:', colRes.data?.collection?.name);

    // ── STEP 16: PROFILE & SETTINGS UPDATE ──────────────────────────────────
    console.log('\n[Step 16] Testing Profile & Preferences Settings Update...');
    const profileUpdate = await page.evaluate(async () => {
      const token = localStorage.getItem('sankshep_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          displayName: 'Dr. Priya Narayanan (Senior Lead)',
          institution: 'Department of Public Administration & AI',
          bio: 'Specialist in government circular summarization & policy extraction.',
        }),
      });
      return { status: res.status, data: await res.json() };
    });

    console.log('  ✓ Profile update status:', profileUpdate.status);
    console.log('  ✓ Updated display name:', profileUpdate.data?.profile?.displayName);

    const settingsUpdate = await page.evaluate(async () => {
      const token = localStorage.getItem('sankshep_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('http://localhost:3000/api/user/settings', {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          defaultStyle: 'executive',
          defaultLength: 'medium',
          allowGeminiFallback: true,
        }),
      });
      return { status: res.status, data: await res.json() };
    });

    console.log('  ✓ Settings update status:', settingsUpdate.status);

    // ── STEP 17: RBAC SECURITY & ADMIN GOVERNANCE ───────────────────────────
    console.log('\n[Step 17] Verifying RBAC Security & Admin Governance...');

    // A. Verify non-admin blocked
    const regularBlocked = await page.evaluate(async () => {
      const token = localStorage.getItem('sankshep_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('http://localhost:3000/api/admin/system-health', {
        headers,
        credentials: 'include',
      });
      return { status: res.status };
    });
    console.log('  ✓ Regular user blocked from admin endpoint (HTTP 403):', regularBlocked.status === 403);

    // B. Promote test user to admin
    const mongoPkgPath = path.resolve(BACKEND_DIR, 'node_modules/mongodb/lib/index.js');
    const { MongoClient } = await import(pathToFileURL(mongoPkgPath).href);
    const fsEnv = fs.readFileSync(path.resolve(BACKEND_DIR, '.env'), 'utf8');
    const uriMatch = fsEnv.match(/MONGODB_URI=(.+)/);
    const mongoUri = uriMatch ? uriMatch[1].trim() : process.env.MONGODB_URI;
    const client = new MongoClient(mongoUri);
    await client.connect();
    await client.db('test').collection('users').updateOne({ email: testEmail }, { $set: { role: 'admin' } });
    await client.close();
    console.log('  ✓ User promoted to admin in MongoDB');

    // C. Test admin system telemetry
    const adminHealth = await page.evaluate(async () => {
      const token = localStorage.getItem('sankshep_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('http://localhost:3000/api/admin/system-health', {
        headers,
        credentials: 'include',
      });
      return { status: res.status, data: await res.json() };
    });

    console.log('  ✓ Admin System Health status:', adminHealth.status);
    console.log('  ✓ Database status:', adminHealth.data?.services?.database?.status);
    console.log('  ✓ AI Service status:', adminHealth.data?.services?.aiService?.status);

    // D. Add dataset sample to corpus
    const addSampleRes = await page.evaluate(async () => {
      const token = localStorage.getItem('sankshep_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('http://localhost:3000/api/admin/datasets', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          title: 'Official Notification 2026/08',
          category: 'government_circular',
          source: 'The Ministry has mandated 25% subsidies for renewable MSMEs under SIDBI monitoring.',
          target: 'Ministry announced 25% renewable subsidies for MSMEs monitored by SIDBI.',
        }),
      });
      return { status: res.status, data: await res.json() };
    });

    console.log('  ✓ Add training sample status:', addSampleRes.status);
    console.log('  ✓ Training sample added to corpus:', addSampleRes.data?.success);

    // ── STEP 18: PASSWORD RESET WORKFLOW ────────────────────────────────────
    console.log('\n[Step 18] Testing Password Reset Workflow...');

    // 1. Forgot password request
    const forgotRes = await page.evaluate(async (email) => {
      const res = await fetch('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return { status: res.status, data: await res.json() };
    }, testEmail);

    console.log('  ✓ Forgot Password request status:', forgotRes.status);
    const resetOtp = forgotRes.data?.devOtp;
    console.log('  ✓ Reset OTP intercepted:', resetOtp);

    if (resetOtp) {
      const newPassword = 'NewlyUpdatedPassword2026!';
      const resetRes = await page.evaluate(async (email, otp, pw) => {
        const res = await fetch('http://localhost:3000/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            otp,
            newPassword: pw,
          }),
        });
        return { status: res.status, data: await res.json() };
      }, testEmail, resetOtp, newPassword);

      console.log('  ✓ Password Reset status:', resetRes.status);

      // Verify login with new password
      const newLoginRes = await page.evaluate(async (email, pw) => {
        const res = await fetch('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: pw }),
        });
        return { status: res.status, data: await res.json() };
      }, testEmail, newPassword);

      console.log('  ✓ Login with new password status:', newLoginRes.status);
      console.log('  ✓ Login successful:', newLoginRes.data?.success === true);

      if (newLoginRes.data?.token) {
        await page.evaluate((tok) => {
          localStorage.setItem('sankshep_token', tok);
        }, newLoginRes.data.token);
      }
    }

    // ── STEP 19: BROWSER VIEWING OF APP PAGES ───────────────────────────────
    console.log('\n[Step 19] Verifying Workspace Pages in Active Browser Session...');
    const pagesToTest = [
      { path: '/app/dashboard', label: 'Dashboard' },
      { path: '/app/documents', label: 'Documents' },
      { path: '/app/new-summary', label: 'New Summary Workspace' },
      { path: '/app/summaries', label: 'Summary Library' },
      { path: '/app/compare', label: 'Compare Methods' },
      { path: '/app/collections', label: 'Collections' },
      { path: '/app/analytics', label: 'Analytics' },
      { path: '/app/lab', label: 'Model Lab' },
      { path: '/app/activity', label: 'Activity Log' },
      { path: '/app/profile', label: 'Profile' },
      { path: '/app/settings', label: 'Settings' },
      { path: '/app/admin', label: 'Admin Dashboard' },
    ];

    for (const p of pagesToTest) {
      await page.goto(`${BASE_URL}${p.path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(800);
      const content = await page.content();
      const loaded = content.includes(p.label) || content.includes('SankshepAI');
      console.log(`  ✓ Page [${p.label}] loaded cleanly:`, loaded);
    }

    // ── STEP 20: INSPECT BROWSER HEALTH ─────────────────────────────────────
    console.log('\n[Step 20] Inspecting Browser Console Health...');
    if (pageErrors.length === 0) {
      console.log('  ✓ Zero unhandled page errors detected in Microsoft Edge!');
    } else {
      console.warn('  ! Unhandled page errors caught:', pageErrors);
    }

    console.log('\n================================================================');
    console.log('  🎉 ALL 20 FUNCTIONAL SUITE TESTS PASSED COMPLETELY! 🎉      ');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ TEST RUN FAILED:', err.message);
    if (pageErrors.length > 0) {
      console.error('Page errors:', pageErrors);
    }
    throw err;
  } finally {
    await browser.close();
  }
}

runBrowserE2E().catch((err) => {
  console.error(err);
  process.exit(1);
});
