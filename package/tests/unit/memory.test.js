const {
  writeFragment,
  readFragment,
  writeFragmentData,
  readFragmentData,
  listFragments,
  deleteFragment,
} = require('../../src/model/data/memory/index');

describe('Memory Fragment Data Operations', () => {
  const testOwner = 'testUser';
  const testId = 'testId1';
  const testFragment = {
    ownerId: testOwner,
    id: testId,
    type: 'text/plain',
    size: 123,
  };
  const testData = Buffer.from('test data');

  beforeEach(async () => {
    // Clear any existing data before each test
    // Since we're using in-memory storage, we'll create new instances
    // The MemoryDB constructor creates fresh instances automatically
  });

  test('writeFragment() and readFragment() work correctly', async () => {
    // Write fragment metadata
    await writeFragment(testFragment);

    // Read it back
    const result = await readFragment(testOwner, testId);

    expect(result).toEqual(testFragment);
  });

  test('readFragment() returns undefined for non-existent fragment', async () => {
    const result = await readFragment('nonexistent', 'nonexistent');
    expect(result).toBeUndefined();
  });

  test('writeFragmentData() and readFragmentData() work correctly', async () => {
    // Write fragment data
    await writeFragmentData(testOwner, testId, testData);

    // Read it back
    const result = await readFragmentData(testOwner, testId);

    expect(result).toEqual(testData);
  });

  test('readFragmentData() returns undefined for non-existent fragment data', async () => {
    const result = await readFragmentData('nonexistent', 'nonexistent');
    expect(result).toBeUndefined();
  });

  test('listFragments() returns empty array for user with no fragments', async () => {
    const result = await listFragments('emptyUser');
    expect(result).toEqual([]);
  });

  test('listFragments() returns fragment ids when expand=false', async () => {
    // Write multiple fragments
    await writeFragment(testFragment);
    await writeFragment({ ...testFragment, id: 'testId2' });

    const result = await listFragments(testOwner);

    expect(result).toContain('testId1');
    expect(result).toContain('testId2');
    expect(result).toHaveLength(2);
  });

  test('listFragments() returns full fragments when expand=true', async () => {
    // Write multiple fragments
    await writeFragment(testFragment);
    await writeFragment({ ...testFragment, id: 'testId2' });

    const result = await listFragments(testOwner, true);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(testFragment);
    expect(result[1]).toEqual({ ...testFragment, id: 'testId2' });
  });

  test('deleteFragment() removes both metadata and data', async () => {
    // Write both metadata and data
    await writeFragment(testFragment);
    await writeFragmentData(testOwner, testId, testData);

    // Verify they exist
    expect(await readFragment(testOwner, testId)).toEqual(testFragment);
    expect(await readFragmentData(testOwner, testId)).toEqual(testData);

    // Delete the fragment
    await deleteFragment(testOwner, testId);

    // Verify they're gone
    expect(await readFragment(testOwner, testId)).toBeUndefined();
    expect(await readFragmentData(testOwner, testId)).toBeUndefined();
  });

  test('deleteFragment() throws error for non-existent fragment', async () => {
    await expect(deleteFragment('nonexistent', 'nonexistent')).rejects.toThrow();
  });

  test('writeFragment() handles JSON serialization correctly', async () => {
    const complexFragment = {
      ownerId: testOwner,
      id: 'complexId',
      type: 'application/json',
      size: 456,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    await writeFragment(complexFragment);
    const result = await readFragment(testOwner, 'complexId');

    expect(result).toEqual(complexFragment);
  });

  test('writeFragmentData() handles Buffer data correctly', async () => {
    const bufferData = Buffer.from('Hello, World!', 'utf8');
    await writeFragmentData(testOwner, 'bufferTest', bufferData);
    const result = await readFragmentData(testOwner, 'bufferTest');

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.toString('utf8')).toBe('Hello, World!');
  });

  test('multiple operations work together correctly', async () => {
    // Write metadata and data
    await writeFragment(testFragment);
    await writeFragmentData(testOwner, testId, testData);

    // Read them back
    const metadataResult = await readFragment(testOwner, testId);
    const dataResult = await readFragmentData(testOwner, testId);

    expect(metadataResult).toEqual(testFragment);
    expect(dataResult).toEqual(testData);

    // List fragments
    const listResult = await listFragments(testOwner);
    expect(listResult).toContain(testId);

    // Delete and verify
    await deleteFragment(testOwner, testId);
    expect(await readFragment(testOwner, testId)).toBeUndefined();
    expect(await readFragmentData(testOwner, testId)).toBeUndefined();
  });
});
