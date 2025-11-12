// src/auth/index.js
const logger = require('../logger');

function selectAuthStrategy() {
  const hasCognito = process.env.AWS_COGNITO_POOL_ID && process.env.AWS_COGNITO_CLIENT_ID;
  const hasBasicAuth = process.env.HTPASSWD_FILE;

  // Detection logic for local development environment
  const isLocalEnvironment = () => {
    // Check if we're using local AWS services (Docker Compose)
    return (
      process.env.AWS_S3_ENDPOINT_URL &&
      process.env.AWS_S3_ENDPOINT_URL.includes('localstack') &&
      process.env.AWS_DYNAMODB_ENDPOINT_URL &&
      process.env.AWS_DYNAMODB_ENDPOINT_URL.includes('dynamodb-local')
    );
  };

  // Priority 1: If we're in local Docker environment, prefer Basic Auth
  if (isLocalEnvironment() && hasBasicAuth) {
    logger.info('Local development environment detected. Using HTTP Basic Auth');
    return require('./basic-auth');
  }

  // Priority 2: Explicit AUTH_TYPE environment variable (if you ever need it)
  if (process.env.AUTH_TYPE) {
    const authType = process.env.AUTH_TYPE.toLowerCase();
    logger.info(`Using explicitly configured authentication: ${authType}`);

    if (authType === 'cognito' && hasCognito) {
      return require('./cognito');
    } else if (authType === 'cognito' && !hasCognito) {
      throw new Error(
        'AUTH_TYPE set to cognito but missing AWS_COGNITO_POOL_ID or AWS_COGNITO_CLIENT_ID'
      );
    }

    if (authType === 'basic' && hasBasicAuth) {
      return require('./basic-auth');
    } else if (authType === 'basic' && !hasBasicAuth) {
      throw new Error('AUTH_TYPE set to basic but missing HTPASSWD_FILE');
    }
  }

  // Priority 3: Auto-detection for non-local environments
  if (hasCognito) {
    logger.info('Auto-detected: Using AWS Cognito authentication');
    return require('./cognito');
  } else if (hasBasicAuth) {
    logger.info('Auto-detected: Using HTTP Basic Auth');
    return require('./basic-auth');
  }

  // No configuration found
  throw new Error(
    'No authentication configuration found. ' +
      'Please set either AWS Cognito variables (AWS_COGNITO_POOL_ID, AWS_COGNITO_CLIENT_ID) ' +
      'or Basic Auth variable (HTPASSWD_FILE)'
  );
}

// Export the selected authentication strategy
module.exports = selectAuthStrategy();
