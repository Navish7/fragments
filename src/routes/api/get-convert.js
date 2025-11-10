//src/routes/api/get-convert.js

const { Fragment } = require('../../model/fragment');
const logger = require('../../logger');
const { createErrorResponse } = require('../../response');
const markdownIt = require('markdown-it')();

/**
 * GET /fragments/:id.:ext
 * Get a fragment's data converted to the requested format
 */
module.exports = async (req, res) => {
  // Check if user is authenticated
  if (!req.user) {
    logger.warn('Unauthorized attempt to convert fragment');
    return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
  }

  const ownerId = req.user;
  const { id, ext } = req.params;

  try {
    logger.debug(`Converting fragment ${id} to .${ext} for user ${ownerId}`);

    // Get the fragment
    const fragment = await Fragment.byId(ownerId, id);
    const fragmentData = await fragment.getData();

    // Map file extensions to MIME types
    const extensionToMime = {
      txt: 'text/plain',
      md: 'text/markdown',
      html: 'text/html',
      json: 'application/json',
    };

    const targetMimeType = extensionToMime[ext];

    if (!targetMimeType) {
      logger.warn(`Unsupported extension: ${ext}`);
      return res.status(415).json(createErrorResponse(415, `Unsupported extension: ${ext}`));
    }

    // Check if conversion is supported
    if (!fragment.formats.includes(targetMimeType)) {
      logger.warn(`Conversion not supported: ${fragment.type} to ${targetMimeType}`);
      return res
        .status(415)
        .json(
          createErrorResponse(
            415,
            `Conversion not supported from ${fragment.type} to ${targetMimeType}`
          )
        );
    }

    let convertedData = fragmentData;
    let contentType = fragment.type;

    // Perform conversions
    if (fragment.type === 'text/markdown' && targetMimeType === 'text/html') {
      // Convert Markdown to HTML
      convertedData = Buffer.from(markdownIt.render(fragmentData.toString()));
      contentType = 'text/html';
      logger.debug('Converted Markdown to HTML');
    } else if (fragment.type === 'text/markdown' && targetMimeType === 'text/plain') {
      // Convert Markdown to plain text (strip markdown)
      convertedData = Buffer.from(fragmentData.toString().replace(/[#*`~_()[\]]/g, ''));
      contentType = 'text/plain';
      logger.debug('Converted Markdown to plain text');
    } else if (fragment.type === 'application/json' && targetMimeType === 'text/plain') {
      // Convert JSON to pretty-printed string
      try {
        const jsonObj = JSON.parse(fragmentData.toString());
        convertedData = Buffer.from(JSON.stringify(jsonObj, null, 2));
        contentType = 'text/plain';
        logger.debug('Converted JSON to formatted text');
      } catch (parseErr) {
        logger.warn({ parseErr }, 'Invalid JSON data for conversion');
        return res.status(415).json(createErrorResponse(415, 'Invalid JSON data'));
      }
    }
    // Add more conversion logic here as needed

    // Set appropriate Content-Type header
    res.setHeader('Content-Type', contentType);

    // Return the converted data
    res.status(200).send(convertedData);
  } catch (err) {
    if (err.message === 'fragment not found') {
      logger.warn(`Fragment not found: ${id}`);
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    logger.error({ err }, 'Error converting fragment');
    res.status(500).json(createErrorResponse(500, 'Internal server error'));
  }
};
