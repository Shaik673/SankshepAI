const request = require('supertest');
const app = require('../src/server');
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/db');

beforeAll(async () => {
  await connectDB();
}, 120000);

afterAll(async () => {
  await disconnectDB();
}, 20000);

describe('Backend API Core & Auth Tests', () => {
  it('GET /health should return 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toContain('SankshepAI Express API');
  });

  it('GET / should return 200 with endpoints list', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.endpoints).toBeDefined();
    expect(res.body.endpoints.auth).toBe('/api/auth');
  });

  it('POST /api/auth/signup should reject missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'test@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/signup should reject short passwords', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'test@example.com',
        fullName: 'Test User',
        password: '123',
        confirmPassword: '123',
        acceptTerms: true,
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('at least 8 characters');
  });

  it('POST /api/auth/login should reject non-existent user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@example.com', password: 'Password123!' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
