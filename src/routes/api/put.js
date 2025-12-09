// src/routes/api/put.js
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

    // Parse the Content-Type header from request
    let parsedType;
    try {
      // Accept either req.headers['content-type'] or entire req
      const header =
        req.headers && req.headers['content-type'] ? req.headers['content-type'] : undefined;
      if (!header) {
        // if not provided, reject
        return res.status(415).json(createErrorResponse(415, 'Content-Type header is required'));
      }
      parsedType = contentType.parse(header).type;
    } catch (err) {
      logger.warn({ err }, 'Invalid Content-Type on update request');
      return res.status(415).json(createErrorResponse(415, 'Invalid Content-Type'));
    }

    // Validate MIME type
    if (!Fragment.isSupportedType(parsedType)) {
      return res
        .status(415)
        .json(createErrorResponse(415, `Unsupported media type: ${parsedType}`));
    }

    // Fetch the fragment metadata (and ensure it exists)
    let fragment;
    try {
      fragment = await Fragment.byId(ownerId, id);
    } catch (err) {
      // If Fragment.byId throws 'fragment not found', return 404
      if (err.message && err.message.includes('fragment not found')) {
        logger.warn(`Fragment not found for update - owner: ${ownerId}, id: ${id}`);
        return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
      }
      logger.error({ err }, 'Error fetching fragment for update');
      return res.status(500).json(createErrorResponse(500, 'Internal server error'));
    }

    // Check MIME type matches the existing fragment (compare canonical mime types)
    if (fragment.mimeType !== parsedType) {
      logger.warn(
        { existing: fragment.mimeType, incoming: parsedType },
        'MIME type mismatch on update'
      );
      return res
        .status(400)
        .json(createErrorResponse(400, 'Content-Type must match existing fragment type'));
    }

    // Convert body to Buffer. The rawBody middleware should give us a Buffer already.
    let dataBuffer;
    if (Buffer.isBuffer(req.body)) {
      dataBuffer = req.body;
    } else if (typeof req.body === 'string') {
      dataBuffer = Buffer.from(req.body, 'utf-8');
    } else {
      // fallback: JSON-serialize non-buffer bodies
      dataBuffer = Buffer.from(JSON.stringify(req.body), 'utf-8');
    }

    // Replace fragment data
    try {
      await fragment.setData(dataBuffer);
    } catch (err) {
      logger.error({ err }, 'Error saving updated fragment data');
      return res.status(500).json(createErrorResponse(500, 'Internal server error'));
    }

    // Fetch updated fragment metadata and return it
    try {
      const updatedFragment = await Fragment.byId(ownerId, id);
      return res.status(200).json(
        createSuccessResponse({
          fragment: updatedFragment,
        })
      );
    } catch (err) {
      logger.error({ err }, 'Error retrieving updated fragment metadata');
      return res.status(500).json(createErrorResponse(500, 'Internal server error'));
    }
  } catch (err) {
    logger.error({ err }, 'Unhandled error updating fragment');
    res.status(500).json(createErrorResponse(500, 'Internal server error'));
  }
};
