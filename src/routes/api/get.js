//src/routes/api/get.js
const { Fragment } = require('../../model/fragment');
const logger = require('../../logger');
const { createSuccessResponse, createErrorResponse } = require('../../response');

/**
 * Get a list of fragments for the current user
 */
module.exports = async (req, res) => {
  // Check if user is authenticated
  if (!req.user) {
    logger.warn('Unauthorized attempt to list fragments');
    return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
  }

  const ownerId = req.user;
  const expand = req.query.expand === 'true';

  try {
    logger.debug(`Listing fragments for user ${ownerId}, expand: ${expand}`);

    const fragments = await Fragment.byUser(ownerId, expand);

    res.status(200).json(
      createSuccessResponse({
        fragments: fragments,
      })
    );
  } catch (err) {
    logger.error({ err }, 'Error listing fragments');
    res.status(500).json(createErrorResponse(500, 'Internal server error'));
  }
};
