// tests/unit/app.test.js
const request = require('supertest');
const app = require('../../src/app'); // adjust path if your app entry is different

describe('404 handler', () => {
  test('unknown routes return JSON 404 with expected shape', async () => {
    const res = await request(app)
      .get('/this-route-does-not-exist-12345')
      .expect(404)
      .expect('Content-Type', /json/);

    // Make sure shape matches what your app returns
    expect(res.body).toHaveProperty('status', 'error');
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('message', 'not found');
    expect(res.body.error).toHaveProperty('code', 404);
  });
});
