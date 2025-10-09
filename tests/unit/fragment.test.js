const { Fragment } = require('../../src/model/fragment');

// Wait a little after setting data to ensure timestamps are different
const wait = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Fragment class', () => {
  test('constructor sets properties correctly', () => {
    const ownerId = 'user1';
    const type = 'text/plain';
    const fragment = new Fragment({ ownerId, type });

    expect(fragment.ownerId).toBe(ownerId);
    expect(fragment.type).toBe(type);
    expect(fragment.size).toBe(0);
    expect(fragment.id).toBeDefined();
    expect(fragment.created).toBeDefined();
    expect(fragment.updated).toBeDefined();
  });

  test('constructor throws with missing ownerId', () => {
    expect(() => new Fragment({ type: 'text/plain' })).toThrow();
  });

  test('constructor throws with missing type', () => {
    expect(() => new Fragment({ ownerId: 'user1' })).toThrow();
  });

  test('constructor throws with unsupported type', () => {
    expect(() => new Fragment({ ownerId: 'user1', type: 'unsupported/type' })).toThrow();
  });

  test('constructor throws with negative size', () => {
    expect(() => new Fragment({ ownerId: 'user1', type: 'text/plain', size: -1 })).toThrow();
  });

  test('constructor accepts valid parameters', () => {
    const params = {
      id: 'test-id',
      ownerId: 'user1',
      created: '2023-01-01T00:00:00.000Z',
      updated: '2023-01-01T00:00:00.000Z',
      type: 'text/plain',
      size: 100,
    };

    const fragment = new Fragment(params);
    expect(fragment).toEqual(params);
  });

  test('isSupportedType returns true for supported types', () => {
    expect(Fragment.isSupportedType('text/plain')).toBe(true);
    expect(Fragment.isSupportedType('text/markdown')).toBe(true);
    expect(Fragment.isSupportedType('text/html')).toBe(true);
    expect(Fragment.isSupportedType('application/json')).toBe(true);
    expect(Fragment.isSupportedType('image/png')).toBe(true);
    expect(Fragment.isSupportedType('image/jpeg')).toBe(true);
    expect(Fragment.isSupportedType('image/webp')).toBe(true);
    expect(Fragment.isSupportedType('image/gif')).toBe(true);
  });

  test('isSupportedType returns false for unsupported types', () => {
    expect(Fragment.isSupportedType('application/xml')).toBe(false);
    expect(Fragment.isSupportedType('video/mp4')).toBe(false);
    expect(Fragment.isSupportedType('')).toBe(false);
    expect(Fragment.isSupportedType(null)).toBe(false);
  });

  test('isSupportedType handles charset parameters', () => {
    expect(Fragment.isSupportedType('text/plain; charset=utf-8')).toBe(true);
    expect(Fragment.isSupportedType('text/html; charset=utf-8')).toBe(true);
  });

  test('mimeType returns type without parameters', () => {
    const fragment = new Fragment({ ownerId: 'user1', type: 'text/plain; charset=utf-8' });
    expect(fragment.mimeType).toBe('text/plain');
  });

  test('isText returns true for text types', () => {
    const textFragment = new Fragment({ ownerId: 'user1', type: 'text/plain' });
    const htmlFragment = new Fragment({ ownerId: 'user1', type: 'text/html' });
    const markdownFragment = new Fragment({ ownerId: 'user1', type: 'text/markdown' });

    expect(textFragment.isText).toBe(true);
    expect(htmlFragment.isText).toBe(true);
    expect(markdownFragment.isText).toBe(true);
  });

  test('isText returns false for non-text types', () => {
    const jsonFragment = new Fragment({ ownerId: 'user1', type: 'application/json' });
    const imageFragment = new Fragment({ ownerId: 'user1', type: 'image/png' });

    expect(jsonFragment.isText).toBe(false);
    expect(imageFragment.isText).toBe(false);
  });

  test('formats returns correct conversion formats', () => {
    const textFragment = new Fragment({ ownerId: 'user1', type: 'text/plain' });
    const jsonFragment = new Fragment({ ownerId: 'user1', type: 'application/json' });
    const imageFragment = new Fragment({ ownerId: 'user1', type: 'image/png' });

    expect(textFragment.formats).toContain('text/plain');
    expect(textFragment.formats).toContain('text/markdown');
    expect(textFragment.formats).toContain('text/html');

    expect(jsonFragment.formats).toContain('application/json');
    expect(jsonFragment.formats).toContain('text/plain');

    expect(imageFragment.formats).toContain('image/png');
    expect(imageFragment.formats).toContain('image/jpeg');
    expect(imageFragment.formats).toContain('image/webp');
    expect(imageFragment.formats).toContain('image/gif');
  });

  describe('static methods', () => {
    const ownerId = 'test-user';

    beforeEach(async () => {
      // Clear any existing fragments for this user
      const fragments = await Fragment.byUser(ownerId, true);
      await Promise.all(fragments.map((f) => Fragment.delete(ownerId, f.id)));
    });

    test('byUser returns empty array for user with no fragments', async () => {
      const fragments = await Fragment.byUser(ownerId);
      expect(fragments).toEqual([]);
    });

    test('byUser returns fragment ids when expand=false', async () => {
      const fragment1 = new Fragment({ ownerId, type: 'text/plain' });
      await fragment1.save();

      const fragment2 = new Fragment({ ownerId, type: 'text/markdown' });
      await fragment2.save();

      const fragments = await Fragment.byUser(ownerId);
      expect(fragments).toContain(fragment1.id);
      expect(fragments).toContain(fragment2.id);
    });

    test('byUser returns Fragment instances when expand=true', async () => {
      const fragment1 = new Fragment({ ownerId, type: 'text/plain' });
      await fragment1.save();

      const fragment2 = new Fragment({ ownerId, type: 'text/markdown' });
      await fragment2.save();

      const fragments = await Fragment.byUser(ownerId, true);
      expect(fragments).toHaveLength(2);
      expect(fragments[0]).toBeInstanceOf(Fragment);
      expect(fragments[1]).toBeInstanceOf(Fragment);
    });

    test('byId returns fragment by id', async () => {
      const fragment = new Fragment({ ownerId, type: 'text/plain' });
      await fragment.save();

      const found = await Fragment.byId(ownerId, fragment.id);
      expect(found).toBeInstanceOf(Fragment);
      expect(found.id).toBe(fragment.id);
    });

    test('byId throws for non-existent fragment', async () => {
      await expect(Fragment.byId(ownerId, 'nonexistent')).rejects.toThrow();
    });

    test('delete removes fragment', async () => {
      const fragment = new Fragment({ ownerId, type: 'text/plain' });
      await fragment.save();

      await Fragment.delete(ownerId, fragment.id);
      await expect(Fragment.byId(ownerId, fragment.id)).rejects.toThrow();
    });
  });

  describe('instance methods', () => {
    const ownerId = 'test-user';
    let fragment;

    beforeEach(async () => {
      fragment = new Fragment({ ownerId, type: 'text/plain' });
      await fragment.save();
    });

    test('save updates metadata', async () => {
      const originalUpdated = fragment.updated;
      await wait();
      await fragment.save();

      expect(fragment.updated).not.toBe(originalUpdated);
    });

    test('setData updates data and size', async () => {
      const data = Buffer.from('hello world');
      await fragment.setData(data);

      const retrievedData = await fragment.getData();
      expect(retrievedData).toEqual(data);
      expect(fragment.size).toBe(data.length);
    });

    test('setData throws for non-Buffer data', async () => {
      await expect(fragment.setData('not a buffer')).rejects.toThrow();
    });

    test('getData returns fragment data', async () => {
      const data = Buffer.from('test data');
      await fragment.setData(data);

      const retrievedData = await fragment.getData();
      expect(retrievedData).toEqual(data);
    });
  });
});
