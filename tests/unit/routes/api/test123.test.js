const { Fragment } = require('../../../../src/model/fragment');

describe('Local Fragment Creation & Update', () => {
  test('can create and update a fragment locally', async () => {
    const ownerId = 'user1@example.com';

    // 1️⃣ Create a new fragment
    const fragment = new Fragment({
      ownerId,
      type: 'text/plain',
      size: 0,
    });

    // Set initial data
    await fragment.setData(Buffer.from('Initial Data'));
    console.log('Created fragment:', fragment);

    // Check initial data
    expect((await fragment.getData()).toString()).toBe('Initial Data');
    expect(fragment.size).toBe('Initial Data'.length);

    // 2️⃣ Update the fragment data
    await fragment.setData(Buffer.from('Updated Data!'));
    console.log('Updated fragment:', fragment);

    // 3️⃣ Assertions
    // Make sure the data was updated
    expect((await fragment.getData()).toString()).toBe('Updated Data!');

    // Ensure size is correct
    expect(fragment.size).toBe('Updated Data!'.length);
  });
});
