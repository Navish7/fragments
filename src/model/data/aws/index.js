const s3Client = require('./s3Client');
const dynamodbClient = require('./dynamodbClient');
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { PutCommand, GetCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const logger = require('../../../logger');

// Write a fragment's metadata to DynamoDB. Returns a Promise<void>
async function writeFragment(fragment) {
  const params = {
    TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
    Item: fragment,
  };

  const command = new PutCommand(params);

  try {
    await dynamodbClient.send(command);
  } catch (err) {
    logger.error(
      { err, TableName: params.TableName },
      'Error writing fragment metadata to DynamoDB'
    );
    throw new Error('unable to write fragment metadata');
  }
}

// Read a fragment's metadata from DynamoDB. Returns a Promise<Object>
async function readFragment(ownerId, id) {
  const params = {
    TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
    Key: {
      ownerId: ownerId,
      id: id,
    },
  };

  const command = new GetCommand(params);

  try {
    const result = await dynamodbClient.send(command);
    return result.Item || null;
  } catch (err) {
    logger.error(
      { err, TableName: params.TableName, ownerId, id },
      'Error reading fragment metadata from DynamoDB'
    );
    throw new Error('unable to read fragment metadata');
  }
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

// Get a list of fragments from DynamoDB
async function listFragments(ownerId, expand = false) {
  const params = {
    TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
    KeyConditionExpression: 'ownerId = :ownerId',
    ExpressionAttributeValues: {
      ':ownerId': ownerId,
    },
  };

  const command = new QueryCommand(params);

  try {
    const result = await dynamodbClient.send(command);
    const fragments = result.Items || [];

    if (fragments.length === 0) {
      return [];
    }

    if (expand) {
      return fragments;
    }

    return fragments.map((fragment) => fragment.id);
  } catch (err) {
    logger.error({ err, ownerId }, 'Error listing fragments from DynamoDB');
    throw new Error('unable to list fragments');
  }
}

// Delete fragment metadata and data
async function deleteFragment(ownerId, id) {
  try {
    // Check if metadata exists first
    const metadata = await readFragment(ownerId, id);
    if (!metadata) {
      throw new Error('fragment not found');
    }

    // Delete metadata from DynamoDB
    const params = {
      TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
      Key: {
        ownerId: ownerId,
        id: id,
      },
    };

    const command = new DeleteCommand(params);
    await dynamodbClient.send(command);

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
