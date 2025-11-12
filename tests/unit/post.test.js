const request = require('supertest');
const app = require('../../src/app');

describe('POST /v1/fragments', () => {
  test('unauthenticated requests are denied', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'text/plain')
      .send('test data');

    expect(res.statusCode).toBe(401);
    expect(res.body.status).toBe('error');
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe(401);
    expect(res.body.error.message).toBe('Unauthorized');
  });

  test('authenticated users can create a plain text fragment', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('This is text fragment data');

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('ok');
    expect(res.body.fragment).toBeDefined();

    // Check fragment properties
    const fragment = res.body.fragment;
    expect(fragment.id).toBeDefined();
    expect(fragment.ownerId).toBeDefined();
    expect(fragment.created).toBeDefined();
    expect(fragment.updated).toBeDefined();
    expect(fragment.type).toBe('text/plain');
    expect(fragment.size).toBe(Buffer.from('This is text fragment data').length);
  });

  test('response includes Location header with full URL', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('test data');

    expect(res.statusCode).toBe(201);
    expect(res.headers.location).toBeDefined();
    expect(res.headers.location).toContain('/v1/fragments/');
    expect(res.headers.location).toMatch(/^http.+\/v1\/fragments\/[a-f0-9-]+$/);
  });

  test('fragments have correct size based on data', async () => {
    const testData = 'This is some test data for size calculation';
    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send(testData);

    expect(res.statusCode).toBe(201);
    expect(res.body.fragment.size).toBe(Buffer.from(testData).length);
  });

  test('creating fragment with unsupported type returns 415', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'application/xml')
      .send('<xml>data</xml>');

    expect(res.statusCode).toBe(415);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toContain('Unsupported media type');
  });

  test('creating fragment with invalid Content-Type returns 415', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'invalid/type; charset=utf-8')
      .send('test data');

    expect(res.statusCode).toBe(415);
    expect(res.body.status).toBe('error');
  });

  test('creating fragment without Content-Type returns 415', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .send('test data');

    expect(res.statusCode).toBe(415);
    expect(res.body.status).toBe('error');
  });

  test('supports text/markdown content type', async () => {
    const markdownData = '# Heading\n\nThis is markdown content.';
    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/markdown')
      .send(markdownData);

    expect(res.statusCode).toBe(201);
    expect(res.body.fragment.type).toBe('text/markdown');
    expect(res.body.fragment.size).toBe(Buffer.from(markdownData).length);
  });

  test('supports text/html content type', async () => {
    const htmlData = '<h1>Heading</h1><p>HTML content</p>';
    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/html')
      .send(htmlData);

    expect(res.statusCode).toBe(201);
    expect(res.body.fragment.type).toBe('text/html');
    expect(res.body.fragment.size).toBe(Buffer.from(htmlData).length);
  });

  test('supports application/json content type', async () => {
    const jsonData = JSON.stringify({ key: 'value', number: 123 });
    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'application/json')
      .send(jsonData);

    expect(res.statusCode).toBe(201);
    expect(res.body.fragment.type).toBe('application/json');
    expect(res.body.fragment.size).toBe(Buffer.from(jsonData).length);
  });

  test('supports image content types', async () => {
    // For image types, we'd typically send binary data, but for testing we can use text
    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'image/png')
      .send('fake image data');

    expect(res.statusCode).toBe(201);
    expect(res.body.fragment.type).toBe('image/png');
  });

  test('handles empty body', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('');

    expect(res.statusCode).toBe(201);
    expect(res.body.fragment.size).toBe(0);
  });

  test('created fragment can be retrieved by ID', async () => {
    // Create a fragment
    const testData = 'test data for retrieval';
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send(testData);

    expect(postRes.statusCode).toBe(201);

    // Extract the path from the Location header
    const locationUrl = new URL(postRes.headers.location);
    const fragmentPath = locationUrl.pathname;

    // Retrieve the fragment using the path from Location header
    const getRes = await request(app).get(fragmentPath).auth('user1@email.com', 'password1');

    expect(getRes.statusCode).toBe(200);
    // The endpoint returns the raw data, not a JSON response with status
    expect(getRes.text).toBe(testData);
    expect(getRes.headers['content-type']).toContain('text/plain');
  });
});
