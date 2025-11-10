//src/routes/api/get-info.js

const { Fragment } = require('../../model/fragment');
const logger = require('../../logger');
const { createSuccessResponse, createErrorResponse } = require('../../response');

/**
 * GET /fragments/:id/info
 * Get a fragment's metadata by ID for the current user (without data)
 */
module.exports = async (req, res) => {
  // Check if user is authenticated
  if (!req.user) {
    logger.warn('Unauthorized attempt to access fragment info');
    return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
  }

  const ownerId = req.user;
  const { id } = req.params;

  try {
    logger.debug(`Retrieving fragment info ${id} for user ${ownerId}`);

    // Get the fragment metadata
    const fragment = await Fragment.byId(ownerId, id);

    logger.debug({ fragment }, 'Fragment info retrieved successfully');

    // Return only metadata (without the actual data)
    res.status(200).json(
      createSuccessResponse({
        fragment: fragment,
      })
    );
  } catch (err) {
    if (err.message === 'fragment not found') {
      logger.warn(`Fragment not found: ${id}`);
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    logger.error({ err }, 'Error retrieving fragment info');
    res.status(500).json(createErrorResponse(500, 'Internal server error'));
  }
};
