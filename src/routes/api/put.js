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

  const { id } = req.params;

  try {
    // Parse Content-Type header
    let parsedType;
    try {
      const parsed = contentType.parse(req);
      parsedType = parsed.type;
    } catch {
      return res.status(415).json(createErrorResponse(415, 'Invalid Content-Type'));
    }

    if (!Fragment.isSupportedType(parsedType)) {
      return res
        .status(415)
        .json(createErrorResponse(415, `Unsupported media type: ${parsedType}`));
    }

    // Get the existing fragment by ID only
    let existingFragment;
    try {
      existingFragment = await Fragment.byId(undefined, id); // temporarily ignore owner
    } catch (err) {
      if (err.message === 'fragment not found') {
        return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
      }
      throw err;
    }

    // Check ownership
    if (existingFragment.ownerId !== req.user) {
      return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
    }

    // Check that MIME type matches existing fragment
    const existingMimeType = existingFragment.type;
    if (parsedType !== existingMimeType) {
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

    // Update the fragment data
    await existingFragment.setData(dataBuffer);

    // Return updated fragment info
    const updatedFragment = await Fragment.byId(undefined, id);

    res.status(200).json(createSuccessResponse({ fragment: updatedFragment }));
    logger.debug(`Fragment ${id} updated successfully for user ${req.user}`);
  } catch (err) {
    logger.error({ err }, 'Error updating fragment');
    res.status(500).json(createErrorResponse(500, 'Internal server error'));
  }
};
