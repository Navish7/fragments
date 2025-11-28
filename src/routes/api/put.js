const contentType = require('content-type');
const { Fragment } = require('../../model/fragment');
const logger = require('../../logger');
const { createSuccessResponse, createErrorResponse } = require('../../response');

/**
 * PUT /fragments/:id
 * Update an existing fragment's data
 */
module.exports = async (req, res) => {
  if (!req.user) {
    logger.warn('Unauthorized attempt to update fragment');
    return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
  }

  const ownerId = req.user;
  const { id } = req.params;

  try {
    // Parse the Content-Type
    let parsedType;
    try {
      const parsed = contentType.parse(req);
      parsedType = parsed.type;
    } catch {
      return res.status(415).json(createErrorResponse(415, 'Invalid Content-Type'));
    }

    // Get the existing fragment
    const existingFragment = await Fragment.byId(ownerId, id);

    // Check if the Content-Type matches the existing fragment type
    if (parsedType !== existingFragment.type) {
      return res
        .status(400)
        .json(createErrorResponse(400, 'Content-Type must match the existing fragment type'));
    }

    // Convert body to Buffer
    let dataBuffer;
    if (Buffer.isBuffer(req.body)) {
      dataBuffer = req.body;
    } else if (typeof req.body === 'string') {
      dataBuffer = Buffer.from(req.body, 'utf-8');
    } else {
      dataBuffer = Buffer.from(JSON.stringify(req.body), 'utf-8');
    }

    const newSize = Buffer.byteLength(dataBuffer);

    // Update the fragment data
    await existingFragment.setData(dataBuffer);

    // Get the updated fragment to return current metadata
    const updatedFragment = await Fragment.byId(ownerId, id);

    logger.debug(`Fragment ${id} updated successfully for user ${ownerId}`);

    res.status(200).json(
      createSuccessResponse({
        fragment: updatedFragment,
      })
    );
  } catch (err) {
    if (err.message === 'fragment not found') {
      logger.warn(`Fragment not found: ${id}`);
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    logger.error({ err }, 'Error updating fragment');
    res.status(500).json(createErrorResponse(500, 'Internal server error'));
  }
  const contentType = require('content-type');
  const { Fragment } = require('../../model/fragment');
  const logger = require('../../logger');
  const { createSuccessResponse, createErrorResponse } = require('../../response');

  /**
   * PUT /fragments/:id
   * Update an existing fragment's data
   */
  module.exports = async (req, res) => {
    if (!req.user) {
      logger.warn('Unauthorized attempt to update fragment');
      return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
    }

    const ownerId = req.user;
    const { id } = req.params;

    try {
      // Parse the Content-Type
      let parsedType;
      try {
        const parsed = contentType.parse(req);
        parsedType = parsed.type;
      } catch {
        return res.status(415).json(createErrorResponse(415, 'Invalid Content-Type'));
      }

      // Get the existing fragment
      const existingFragment = await Fragment.byId(ownerId, id);

      // Check if the Content-Type matches the existing fragment type
      if (parsedType !== existingFragment.type) {
        return res
          .status(400)
          .json(createErrorResponse(400, 'Content-Type must match the existing fragment type'));
      }

      // Convert body to Buffer
      let dataBuffer;
      if (Buffer.isBuffer(req.body)) {
        dataBuffer = req.body;
      } else if (typeof req.body === 'string') {
        dataBuffer = Buffer.from(req.body, 'utf-8');
      } else {
        dataBuffer = Buffer.from(JSON.stringify(req.body), 'utf-8');
      }

      // Update the fragment data using your existing setData method
      await existingFragment.setData(dataBuffer);

      // Get the updated fragment to return current metadata
      const updatedFragment = await Fragment.byId(ownerId, id);

      logger.debug(`Fragment ${id} updated successfully for user ${ownerId}`);

      res.status(200).json(
        createSuccessResponse({
          fragment: updatedFragment,
        })
      );
    } catch (err) {
      if (err.message === 'fragment not found') {
        logger.warn(`Fragment not found: ${id}`);
        return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
      }

      logger.error({ err }, 'Error updating fragment');
      res.status(500).json(createErrorResponse(500, 'Internal server error'));
    }
  };
};
