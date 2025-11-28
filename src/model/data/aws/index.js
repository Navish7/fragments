const s3Client = require('./s3Client');
const ddbDocClient = require('./ddbDocClient');
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { PutCommand, GetCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const logger = require('../../../logger');

// Write a fragment's metadata to DynamoDB. Returns a Promise<void>
/*
async function writeFragment(fragment) {
  const params = {
    TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
    Item: fragment,
  };

  const command = new PutCommand(params);

  try {
    await ddbDocClient.send(command); // Updated to use ddbDocClient
  } catch (err) {
    logger.error(
      { err, TableName: params.TableName },
      'Error writing fragment metadata to DynamoDB'
    );
    throw new Error('unable to write fragment metadata');
  }
}
  */
function writeFragment(fragment) {
  // Configure our PUT params, with the name of the table and item (attributes and keys)
  const params = {
    TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
    Item: fragment,
  };

  // Create a PUT command to send to DynamoDB
  const command = new PutCommand(params);

  try {
    return ddbDocClient.send(command);
  } catch (err) {
    logger.warn({ err, params, fragment }, 'error writing fragment to DynamoDB');
    throw err;
  }
}

// Read a fragment's metadata from DynamoDB. Returns a Promise<Object>
/*
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
    const result = await ddbDocClient.send(command); // Updated to use ddbDocClient
    return result.Item || null;
  } catch (err) {
    logger.error(
      { err, TableName: params.TableName, ownerId, id },
      'Error reading fragment metadata from DynamoDB'
    );
    throw new Error('unable to read fragment metadata');
  }
}
  */
async function readFragment(ownerId, id) {
  // Configure our GET params, with the name of the table and key (partition key + sort key)
  const params = {
    TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
    Key: { ownerId, id },
  };

  // Create a GET command to send to DynamoDB
  const command = new GetCommand(params);

  try {
    // Wait for the data to come back from AWS
    const data = await ddbDocClient.send(command);
    // We may or may not get back any data (e.g., no item found for the given key).
    // If we get back an item (fragment), we'll return it.  Otherwise we'll return `undefined`.
    return data?.Item;
  } catch (err) {
    logger.warn({ err, params }, 'error reading fragment from DynamoDB');
    throw err;
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
/*
async function listFragments(ownerId, expand = false) {
  const params = {
    TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
    KeyConditionExpression: 'ownerId = :ownerId',
    ExpressionAttributeValues: {
      ':ownerId': ownerId,
    },
  };

  // Add projection expression if not expanding
  if (!expand) {
    params.ProjectionExpression = 'id';
  }

  const command = new QueryCommand(params);

  try {
    const result = await ddbDocClient.send(command); // Updated to use ddbDocClient
    const fragments = result.Items || [];

    if (fragments.length === 0) {
      return [];
    }

    if (expand) {
      return fragments;
    }

    // For non-expanded, map to just the IDs
    return fragments.map((fragment) => fragment.id);
  } catch (err) {
    logger.error({ err, ownerId }, 'Error listing fragments from DynamoDB');
    throw new Error('unable to list fragments');
  }
}
*/
// Get a list of fragments, either ids-only, or full Objects, for the given user.
// Returns a Promise<Array<Fragment>|Array<string>|undefined>
async function listFragments(ownerId, expand = false) {
  // Configure our QUERY params, with the name of the table and the query expression
  const params = {
    TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
    // Specify that we want to get all items where the ownerId is equal to the
    // `:ownerId` that we'll define below in the ExpressionAttributeValues.
    KeyConditionExpression: 'ownerId = :ownerId',
    // Use the `ownerId` value to do the query
    ExpressionAttributeValues: {
      ':ownerId': ownerId,
    },
  };

  // Limit to only `id` if we aren't supposed to expand. Without doing this
  // we'll get back every attribute.  The projection expression defines a list
  // of attributes to return, see:
  // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ProjectionExpressions.html
  if (!expand) {
    params.ProjectionExpression = 'id';
  }

  // Create a QUERY command to send to DynamoDB
  const command = new QueryCommand(params);

  try {
    // Wait for the data to come back from AWS
    const data = await ddbDocClient.send(command);

    // If we haven't expanded to include all attributes, remap this array from
    // [ {"id":"b9e7a264-630f-436d-a785-27f30233faea"}, {"id":"dad25b07-8cd6-498b-9aaf-46d358ea97fe"} ,... ] to
    // [ "b9e7a264-630f-436d-a785-27f30233faea", "dad25b07-8cd6-498b-9aaf-46d358ea97fe", ... ]
    return !expand ? data?.Items.map((item) => item.id) : data?.Items;
  } catch (err) {
    logger.error({ err, params }, 'error getting all fragments for user from DynamoDB');
    throw err;
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
    await ddbDocClient.send(command); // Updated to use ddbDocClient

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
