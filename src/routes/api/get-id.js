const { Fragment } = require('../../model/fragment');
const logger = require('../../logger');
const { createSuccessResponse, createErrorResponse } = require('../../response');

module.exports = async (req, res) => {
  if (!req.user) {
    logger.warn('Unauthorized attempt to access fragment');
    return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
  }

  const ownerId = req.user;
  const { id } = req.params;

  try {
    const fragment = await Fragment.byId(ownerId, id);

    // Handle info query parameter
    if (req.query.info === 'true') {
      logger.debug(`Returning fragment info for ${id}`);
      return res.status(200).json(createSuccessResponse({ fragment }));
    }

    // Get fragment data
    const data = await fragment.getData();

    // Set Content-Type header with charset for text types
    let contentType = fragment.type;
    if (fragment.isText) {
      // Ensure charset is included for text types
      const parsed = require('content-type').parse(contentType);
      if (!parsed.parameters.charset) {
        parsed.parameters.charset = 'utf-8';
      }
      contentType = require('content-type').format(parsed);
    }

    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', Buffer.byteLength(data));

    // Send response
    res.status(200).send(data);
  } catch (err) {
    if (err.message === 'fragment not found') {
      logger.warn(`Fragment not found: ${id}`);
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }
    logger.error({ err, ownerId, id }, 'Error retrieving fragment');
    res.status(500).json(createErrorResponse(500, 'Internal server error'));
  }
};
