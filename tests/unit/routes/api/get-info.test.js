// tests/unit/routes/api/get-info.test.js

const request = require('supertest');
const express = require('express');

const getInfo = require('../../../../src/routes/api/get-info');
const { Fragment } = require('../../../../src/model/fragment');
jest.mock('../../../../src/model/fragment');
const app = express();
app.use(express.json());

// Middleware to mock authentication
app.use((req, res, next) => {
  req.user = req.headers['authorization'] ? 'user-123' : null;
  next();
});

app.get('/fragments/:id/info', getInfo);

describe('GET /fragments/:id/info', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('returns 401 if no user', async () => {
    const res = await request(app).get('/fragments/123/info');
    expect(res.statusCode).toBe(401);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Unauthorized');
  });

  test('returns 404 if fragment not found', async () => {
    Fragment.byId.mockImplementation(async () => {
      const err = new Error('fragment not found');
      throw err;
    });

    const res = await request(app)
      .get('/fragments/unknown/info')
      .set('Authorization', 'Bearer token');

    expect(res.statusCode).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Fragment not found');
  });

  test('returns 500 for other errors', async () => {
    Fragment.byId.mockImplementation(async () => {
      throw new Error('some db error');
    });

    const res = await request(app).get('/fragments/123/info').set('Authorization', 'Bearer token');

    expect(res.statusCode).toBe(500);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Internal server error');
  });
});
