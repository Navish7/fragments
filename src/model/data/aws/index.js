// src/model/data/aws/index.js
const s3Client = require('./s3Client');
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const logger = require('../../../logger');

// XXX: temporary use of memory-db until we add DynamoDB
const MemoryDB = require('../memory/memory-db');

// Create two in-memory databases: one for fragment metadata and the other for raw data
const metadata = new MemoryDB();

// Write a fragment's metadata to memory db. Returns a Promise<void>
function writeFragment(fragment) {
  const serialized = JSON.stringify(fragment);
  return metadata.put(fragment.ownerId, fragment.id, serialized);
}

// Read a fragment's metadata from memory db. Returns a Promise<Object>
async function readFragment(ownerId, id) {
  const serialized = await metadata.get(ownerId, id);
  return typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
}

// Writes a fragment's data to an S3 Object in a Bucket
async function writeFragmentData(ownerId, id, data) {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: `${ownerId}/${id}`,
    Body: data,
  };

  const command = new PutObjectCommand(params);

  try {
    await s3Client.send(command);
  } catch (err) {
    logger.error(
      { err, Bucket: params.Bucket, Key: params.Key },
      'Error uploading fragment data to S3'
    );
    throw new Error('unable to upload fragment data');
  }
}

// Convert S3 stream to Buffer
const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });

// Reads a fragment's data from S3 and returns (Promise<Buffer>)
async function readFragmentData(ownerId, id) {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: `${ownerId}/${id}`,
  };

  const command = new GetObjectCommand(params);

  try {
    const data = await s3Client.send(command);
    return streamToBuffer(data.Body);
  } catch (err) {
    logger.error(
      { err, Bucket: params.Bucket, Key: params.Key },
      'Error streaming fragment data from S3'
    );

    // REQUIRED ERROR HANDLING — matches assignment spec
    if (
      err.message.includes('missing entry') ||
      err.message.includes('fragment not found') ||
      err.message.includes('NoSuchKey')
    ) {
      throw new Error('fragment not found');
    }

    throw new Error('unable to read fragment data');
  }
}

// Delete only the raw data object from S3
async function deleteFragmentData(ownerId, id) {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: `${ownerId}/${id}`,
  };

  const command = new DeleteObjectCommand(params);

  try {
    await s3Client.send(command);
  } catch (err) {
    logger.error(
      { err, Bucket: params.Bucket, Key: params.Key },
      'Error deleting fragment data from S3'
    );
    throw new Error('unable to delete fragment data');
  }
}

// Get a list of fragments
async function listFragments(ownerId, expand = false) {
  const fragments = await metadata.query(ownerId);

  if (!fragments || fragments.length === 0) {
    return [];
  }

  if (expand) {
    return fragments.map((fragment) =>
      typeof fragment === 'string' ? JSON.parse(fragment) : fragment
    );
  }

  return fragments.map((fragment) => {
    const parsed = typeof fragment === 'string' ? JSON.parse(fragment) : fragment;
    return parsed.id;
  });
}

// Delete fragment metadata and data
async function deleteFragment(ownerId, id) {
  try {
    const metadataExists = await metadata.get(ownerId, id);
    if (!metadataExists) {
      throw new Error('fragment not found');
    }

    // Delete metadata first
    await metadata.del(ownerId, id);

    // Attempt S3 delete
    try {
      await deleteFragmentData(ownerId, id);
    } catch (err) {
      // If S3 object does not exist, still treat as deleted
      if (err.message.includes('NoSuchKey') || err.message.includes('not found')) {
        // do nothing
      } else {
        logger.warn(
          { err, ownerId, id },
          'Error deleting fragment data from S3, continuing with metadata deletion'
        );
      }
    }
  } catch (err) {
    if (err.message.includes('missing entry') || err.message.includes('fragment not found')) {
      throw new Error('fragment not found');
    }
    throw err;
  }

  logger.debug(`deleteFragment called - ownerId: ${ownerId}, id: ${id}`);
}

module.exports.listFragments = listFragments;
module.exports.writeFragment = writeFragment;
module.exports.readFragment = readFragment;
module.exports.writeFragmentData = writeFragmentData;
module.exports.readFragmentData = readFragmentData;
module.exports.deleteFragment = deleteFragment;
