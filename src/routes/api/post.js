// src/routes/api/post.js
const contentType = require('content-type');
const { Fragment } = require('../../model/fragment'); // Fixed path
const logger = require('../../logger'); // Fixed path
const { createSuccessResponse, createErrorResponse } = require('../../response'); // Fixed path

/**
 * POST /fragments
 * Create a new fragment for the current user
 */
module.exports = async (req, res) => {
  // Check if user is authenticated
  if (!req.user) {
    logger.warn('Unauthorized attempt to create fragment');
    return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
  }

  const ownerId = req.user; // From authentication middleware

  try {
    // Parse and validate Content-Type
    let type;
    try {
      const parsed = contentType.parse(req);
      type = parsed.type;
    } catch (err) {
      logger.warn({ err }, 'Invalid Content-Type header');
      return res.status(415).json(createErrorResponse(415, 'Invalid Content-Type'));
    }

    // Check if the type is supported
    if (!Fragment.isSupportedType(type)) {
      logger.warn(`Unsupported media type: ${type}`);
      return res.status(415).json(createErrorResponse(415, `Unsupported media type: ${type}`));
    }

    // Check if body was parsed correctly as Buffer
    if (!Buffer.isBuffer(req.body)) {
      logger.warn('Request body is not a Buffer');
      return res.status(415).json(createErrorResponse(415, 'Unsupported media type'));
    }

    // Create new fragment
    const fragment = new Fragment({
      ownerId,
      type,
      size: req.body.length,
    });

    logger.debug({ fragment }, 'Creating new fragment');

    // 🔍 Add detailed debug logs for fragment saving
    console.log('About to save fragment data...');
    console.log('Fragment ID:', fragment.id);
    console.log('Data length:', req.body.length);
    console.log('Data type:', typeof req.body);
    console.log('Is Buffer:', Buffer.isBuffer(req.body));

    // Save fragment metadata and data
    await fragment.save();
    console.log('Fragment metadata saved');

    await fragment.setData(req.body);
    console.log('Fragment data saved successfully');

    logger.info(`Fragment created with id: ${fragment.id}`);

    // ✅ Build the URL for the Location header safely
    const apiUrl = process.env.API_URL?.startsWith('http')
      ? process.env.API_URL
      : `http://${req.headers.host}`;
    const fragmentUrl = new URL(`/v1/fragments/${fragment.id}`, apiUrl).href;

    // Set Location header and return success response
    res.setHeader('Location', fragmentUrl);
    res.status(201).json(
      createSuccessResponse({
        fragment: fragment,
      })
    );
  } catch (err) {
    logger.error({ err }, 'Error creating fragment');
    res.status(500).json(createErrorResponse(500, 'Internal server error'));
  }
};
