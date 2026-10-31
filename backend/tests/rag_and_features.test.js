const request = require('supertest');
const app = require('../src/server');
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Document = require('../src/models/Document');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../src/middleware/auth');

let testUser;
let testUserToken;
let otherUser;
let otherUserToken;
let testDoc;

beforeAll(async () => {
  await connectDB();

  const timestamp = Date.now();
  // Create test user 1
  testUser = await User.create({
    email: `testuser_${timestamp}@sankshep.ai`,
    fullName: 'Test Auditor',
    emailVerified: true,
    accountStatus: 'active',
    role: 'user',
  });
  testUserToken = jwt.sign({ userId: testUser._id }, JWT_SECRET, { expiresIn: '1h' });

  // Create test user 2 (for multi-tenant isolation tests)
  otherUser = await User.create({
    email: `otheruser_${timestamp}@sankshep.ai`,
    fullName: 'Other Researcher',
    emailVerified: true,
    accountStatus: 'active',
    role: 'user',
  });
  otherUserToken = jwt.sign({ userId: otherUser._id }, JWT_SECRET, { expiresIn: '1h' });

  // Create a sample document belonging to testUser
  testDoc = await Document.create({
    userId: testUser._id,
    title: 'Ministry of Finance Circular 14/2026',
    originalFilename: 'circular_14_2026.pdf',
    mimeType: 'application/pdf',
    fileSize: 4096,
    storagePath: 'remote_url',
    extractedText:
      'The Ministry of Finance has issued Circular No. 14/2026 regarding priority sector lending. ' +
      'All commercial banks must allocate 40 percent of credit to priority sectors by April 1, 2026. ' +
      'Penal interest levies will be imposed on non-compliant institutions by the Reserve Bank of India.',
    wordCount: 45,
    charCount: 290,
    status: 'ready',
    tags: ['government_circular'],
  });
}, 30000);

afterAll(async () => {
  if (testUser) await User.deleteOne({ _id: testUser._id });
  if (otherUser) await User.deleteOne({ _id: otherUser._id });
  if (testDoc) await Document.deleteOne({ _id: testDoc._id });
  await disconnectDB();
}, 20000);

describe('Domain-Restricted RAG and Document Isolation Tests', () => {
  it('Single-doc RAG: answers grounded questions using document context', async () => {
    const res = await request(app)
      .post(`/api/documents/${testDoc._id}/ask`)
      .set('Cookie', [`token=${testUserToken}`])
      .send({ question: 'What is the allocation target for priority sectors?' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.answer).toBeDefined();
    expect(res.body.citations).toBeDefined();
    expect(res.body.domain_verified).toBe(true);
  });

  it('Strict Domain Enforcement: rejects off-domain queries (e.g. cooking recipe)', async () => {
    const res = await request(app)
      .post(`/api/documents/${testDoc._id}/ask`)
      .set('Cookie', [`token=${testUserToken}`])
      .send({ question: 'Write a recipe for baking chocolate cake' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.is_domain_rejected).toBe(true);
    expect(res.body.answer).toContain('strictly specialized in government circulars');
  });

  it('Multi-tenant Document Isolation: other user cannot query or delete testUser document', async () => {
    // Attempt to query testUser's doc as otherUser
    const queryRes = await request(app)
      .post(`/api/documents/${testDoc._id}/ask`)
      .set('Cookie', [`token=${otherUserToken}`])
      .send({ question: 'What is the circular number?' });

    expect(queryRes.status).toBe(404);
    expect(queryRes.body.success).toBe(false);

    // Attempt to delete testUser's doc as otherUser
    const deleteRes = await request(app)
      .delete(`/api/documents/${testDoc._id}`)
      .set('Cookie', [`token=${otherUserToken}`]);

    expect(deleteRes.status).toBe(404);
  });

  it('Summarization Comparison: returns side-by-side comparative outputs', async () => {
    const res = await request(app)
      .post('/api/summaries/compare')
      .set('Cookie', [`token=${testUserToken}`])
      .send({
        text: testDoc.extractedText,
        methods: ['textrank'],
        length: 'balanced',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.comparisons).toBeDefined();
  });

  it('OAuth Routing: /api/auth/linkedin redirects to LinkedIn OAuth authorization URL', async () => {
    const res = await request(app).get('/api/auth/linkedin');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('linkedin.com/oauth/v2/authorization');
    expect(res.headers.location).toContain('client_id=86so1xkumg6eci');
  });
});

