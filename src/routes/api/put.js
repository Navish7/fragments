const contentType = require('content-type');
const { Fragment } = require('../../model/fragment');
const logger = require('../../logger');
const { createSuccessResponse, createErrorResponse } = require('../../response');

/**
 * PUT /fragments/:id
 * Replace an existing fragment's data
 */
module.exports = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      logger.warn('Unauthorized attempt to update fragment');
      return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
    }

    const ownerId = req.user;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json(createErrorResponse(400, 'Fragment ID is required'));
    }

    // Parse the Content-Type header
    let parsedType;
    try {
      parsedType = contentType.parse(req).type;
    } catch {
      return res.status(415).json(createErrorResponse(415, 'Invalid Content-Type'));
    }

    // Validate MIME type
    if (!Fragment.isSupportedType(parsedType)) {
      return res
        .status(415)
        .json(createErrorResponse(415, `Unsupported media type: ${parsedType}`));
    }

    // Fetch the fragment
    let fragment;
    try {
      fragment = await Fragment.byId(ownerId, id);
    } catch (err) {
      if (err.message === 'fragment not found') {
        logger.warn(`Fragment not found during update: ${id}`);
        return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
      }
      throw err; // let outer catch handle real errors
    }

    // Check MIME type matches the existing fragment - FIXED: use mimeType for comparison
    if (fragment.mimeType !== parsedType) {
      return res
        .status(400)
        .json(createErrorResponse(400, 'Content-Type must match existing fragment type'));
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

    // Validate size - prevent empty updates
    if (dataBuffer.length === 0) {
      return res.status(400).json(createErrorResponse(400, 'Fragment data cannot be empty'));
    }

    // Replace fragment data
    await fragment.setData(dataBuffer);

    // Fetch updated fragment metadata
    const updatedFragment = await Fragment.byId(ownerId, id);

    logger.debug(`Fragment ${id} updated successfully for user ${ownerId}`);

    res.status(200).json(
      createSuccessResponse({
        fragment: updatedFragment,
      })
    );
  } catch (err) {
    logger.error({ err, ownerId: req.user, id: req.params.id }, 'Error updating fragment');
    res.status(500).json(createErrorResponse(500, 'Internal server error'));
  }
};
