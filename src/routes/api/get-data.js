//src/routes/api/get-data.js
const { Fragment } = require('../../model/fragment');
const logger = require('../../logger');
const { createErrorResponse } = require('../../response');

/**
 * GET /fragments/:id
 * Get a fragment's data by ID for the current user
 */
module.exports = async (req, res) => {
  if (!req.user) {
    logger.warn('Unauthorized attempt to access fragment data');
    return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
  }

  const ownerId = req.user;
  const { id } = req.params;

  try {
    logger.debug(`Retrieving fragment data ${id} for user ${ownerId}`);

    const fragment = await Fragment.byId(ownerId, id);
    const data = await fragment.getData();

    res.setHeader('Content-Type', fragment.type);
    res.status(200).send(data);
  } catch (err) {
    if (err.message === 'fragment not found') {
      logger.warn(`Fragment not found: ${id}`);
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    logger.error({ err }, 'Error retrieving fragment data');
    res.status(500).json(createErrorResponse(500, 'Internal server error'));
  }
};
