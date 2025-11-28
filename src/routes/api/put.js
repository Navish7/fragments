const contentType = require('content-type');
const { Fragment } = require('../../model/fragment');
const logger = require('../../logger');
const { createSuccessResponse, createErrorResponse } = require('../../response');

/**
 * PUT /fragments/:id
 * Update an existing fragment's data
 */
module.exports = async (req, res) => {
  try {
    // Check authentication
    if (!req.user) {
      logger.warn('Unauthorized attempt to update fragment');
      return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
    }

    const ownerId = req.user;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json(createErrorResponse(400, 'Fragment ID is required'));
    }

    // Parse Content-Type from request header
    let parsedType;
    try {
      parsedType = contentType.parse(req.headers['content-type']).type;
    } catch (err) {
      return res.status(415).json(createErrorResponse(415, 'Invalid Content-Type'));
    }

    // Validate supported type
    if (!Fragment.isSupportedType(parsedType)) {
      return res
        .status(415)
        .json(createErrorResponse(415, `Unsupported media type: ${parsedType}`));
    }

    // Fetch the fragment for this user
    let existingFragment;
    try {
      existingFragment = await Fragment.byId(ownerId, id);
    } catch (err) {
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    // Ensure MIME type matches
    if (existingFragment.mimeType !== parsedType) {
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

    // Update fragment
    await existingFragment.setData(dataBuffer);

    // Get updated fragment metadata
    const updatedFragment = await Fragment.byId(ownerId, id);

    logger.debug(`Fragment ${id} updated successfully for user ${ownerId}`);

    res.status(200).json(
      createSuccessResponse({
        fragment: updatedFragment,
      })
    );
  } catch (err) {
    logger.error({ err }, 'Error updating fragment');
    res.status(500).json(createErrorResponse(500, 'Internal server error'));
  }
};
