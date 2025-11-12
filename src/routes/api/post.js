const contentType = require('content-type');
const { Fragment } = require('../../model/fragment');
const logger = require('../../logger');
const { createSuccessResponse, createErrorResponse } = require('../../response');

module.exports = async (req, res) => {
  if (!req.user) {
    logger.warn('Unauthorized attempt to create fragment');
    return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
  }

  const ownerId = req.user;

  try {
    let parsedType;
    try {
      const parsed = contentType.parse(req);
      parsedType = parsed.type; // e.g., text/plain
    } catch (err) {
      return res.status(415).json(createErrorResponse(415, 'Invalid Content-Type'));
    }

    if (!Fragment.isSupportedType(parsedType)) {
      return res
        .status(415)
        .json(createErrorResponse(415, `Unsupported media type: ${parsedType}`));
    }

    // Normalize body to Buffer
    let dataBuffer;
    if (Buffer.isBuffer(req.body)) {
      dataBuffer = req.body;
    } else if (typeof req.body === 'string') {
      dataBuffer = Buffer.from(req.body, 'utf-8');
    } else {
      dataBuffer = Buffer.from(JSON.stringify(req.body), 'utf-8');
    }

    const size = Buffer.byteLength(dataBuffer); // Ensure byte size

    const fragment = new Fragment({ ownerId, type: parsedType, size });
    await fragment.save();
    await fragment.setData(dataBuffer);

    const apiUrl = process.env.API_URL?.startsWith('http')
      ? process.env.API_URL
      : `http://${req.headers.host}`;
    const fragmentUrl = new URL(`/v1/fragments/${fragment.id}`, apiUrl).href;

    res.setHeader('Location', fragmentUrl);

    // REMOVE the charset addition for JSON response - keep only the original type
    // The fragment should return the original type without charset in JSON
    res.status(201).json(
      createSuccessResponse({
        fragment: fragment, // This will use the original type without charset
      })
    );
  } catch (err) {
    logger.error({ err }, 'Error creating fragment');
    res.status(500).json(createErrorResponse(500, 'Internal server error'));
  }
};
