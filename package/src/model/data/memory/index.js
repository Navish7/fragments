const MemoryDB = require('./memory-db');

// Create two in-memory databases: one for fragment metadata and the other for raw data
const data = new MemoryDB();
const metadata = new MemoryDB();

// Write a fragment's metadata to memory db. Returns a Promise<void>
function writeFragment(fragment) {
  // Simulate db/network serialization of the value, storing only JSON representation.
  // This is important because it's how things will work later with AWS data stores.
  const serialized = JSON.stringify(fragment);
  return metadata.put(fragment.ownerId, fragment.id, serialized);
}

// Read a fragment's metadata from memory db. Returns a Promise<Object>
async function readFragment(ownerId, id) {
  // NOTE: this data will be raw JSON, we need to turn it back into an Object.
  // You'll need to take care of converting this back into a Fragment instance
  // higher up in the callstack.
  const serialized = await metadata.get(ownerId, id);
  return typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
}

// Write a fragment's data buffer to memory db. Returns a Promise
function writeFragmentData(ownerId, id, buffer) {
  return data.put(ownerId, id, buffer);
}

// Read a fragment's data from memory db. Returns a Promise
function readFragmentData(ownerId, id) {
  return data.get(ownerId, id);
}

// Get a list of fragment ids/objects for the given user from memory db. Returns a Promise
async function listFragments(ownerId, expand = false) {
  const fragments = await metadata.query(ownerId);

  // If we don't get anything back, return empty array
  if (!fragments || fragments.length === 0) {
    return [];
  }

  // If we're supposed to give expanded fragments, parse them from JSON strings
  if (expand) {
    return fragments.map((fragment) =>
      typeof fragment === 'string' ? JSON.parse(fragment) : fragment
    );
  }

  // Otherwise, map to only send back the ids
  return fragments.map((fragment) => {
    const parsed = typeof fragment === 'string' ? JSON.parse(fragment) : fragment;
    return parsed.id;
  });
}

// Delete a fragment's metadata and data from memory db. Returns a Promise
async function deleteFragment(ownerId, id) {
  // Check if metadata exists - if not, throw error to match expected behavior
  const metadataExists = await metadata.get(ownerId, id);
  if (!metadataExists) {
    throw new Error(`missing entry for primaryKey=${ownerId} and secondaryKey=${id}`);
  }

  // Delete metadata (we know it exists)
  await metadata.del(ownerId, id);

  // Delete data if it exists (don't throw if data doesn't exist)
  const dataExists = await data.get(ownerId, id);
  if (dataExists) {
    await data.del(ownerId, id);
  }
}

module.exports.listFragments = listFragments;
module.exports.writeFragment = writeFragment;
module.exports.readFragment = readFragment;
module.exports.writeFragmentData = writeFragmentData;
module.exports.readFragmentData = readFragmentData;
module.exports.deleteFragment = deleteFragment;
