const { Fragment } = require('../../model/fragment');
const logger = require('../../logger');
const { createErrorResponse } = require('../../response');
const markdownIt = require('markdown-it')();
const yaml = require('js-yaml');
const csvParse = require('csv-parse/sync');

/**
 * GET /fragments/:id.:ext
 * Get a fragment's data converted to the requested format
 */
module.exports = async (req, res) => {
  if (!req.user) {
    logger.warn('Unauthorized attempt to convert fragment');
    return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
  }

  const ownerId = req.user;
  const { id, ext } = req.params;

  try {
    logger.debug(`Converting fragment ${id} to .${ext} for user ${ownerId}`);

    // Fetch fragment
    const fragment = await Fragment.byId(ownerId, id);
    const fragmentData = await fragment.getData();

    const sourceType = fragment.mimeType;

    // Extension → MIME map (spec-complete)
    const extensionToMime = {
      txt: 'text/plain',
      md: 'text/markdown',
      html: 'text/html',
      csv: 'text/csv',
      json: 'application/json',
      yaml: 'application/yaml',
      yml: 'application/yaml',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      gif: 'image/gif',
      avif: 'image/avif',
    };

    const targetMimeType = extensionToMime[ext];

    if (!targetMimeType) {
      return res.status(415).json(createErrorResponse(415, `Unsupported extension: ${ext}`));
    }

    // Validate conversion is allowed
    if (!fragment.formats.includes(targetMimeType)) {
      return res
        .status(415)
        .json(
          createErrorResponse(
            415,
            `Conversion not supported from ${sourceType} to ${targetMimeType}`
          )
        );
    }

    let convertedData = fragmentData;
    let contentType = targetMimeType;

    /* ---------- TEXT CONVERSIONS ---------- */

    // Markdown → HTML
    if (sourceType === 'text/markdown' && targetMimeType === 'text/html') {
      convertedData = Buffer.from(markdownIt.render(fragmentData.toString()));
    }

    // Markdown → Plain text
    else if (sourceType === 'text/markdown' && targetMimeType === 'text/plain') {
      convertedData = Buffer.from(fragmentData.toString().replace(/[#*_`~>]+/g, ''));
    }

    // HTML → Plain text
    else if (sourceType === 'text/html' && targetMimeType === 'text/plain') {
      convertedData = Buffer.from(fragmentData.toString().replace(/<[^>]*>/g, ''));
    }

    // CSV → Plain text
    else if (sourceType === 'text/csv' && targetMimeType === 'text/plain') {
      convertedData = fragmentData;
    }

    // CSV → JSON
    else if (sourceType === 'text/csv' && targetMimeType === 'application/json') {
      const records = csvParse.parse(fragmentData.toString(), {
        columns: true,
        skip_empty_lines: true,
      });
      convertedData = Buffer.from(JSON.stringify(records, null, 2));
    }

    // JSON → Plain text
    else if (sourceType === 'application/json' && targetMimeType === 'text/plain') {
      const jsonObj = JSON.parse(fragmentData.toString());
      convertedData = Buffer.from(JSON.stringify(jsonObj, null, 2));
    }

    // JSON → YAML
    else if (sourceType === 'application/json' && targetMimeType === 'application/yaml') {
      const jsonObj = JSON.parse(fragmentData.toString());
      convertedData = Buffer.from(yaml.dump(jsonObj));
    }

    // YAML → Plain text
    else if (sourceType === 'application/yaml' && targetMimeType === 'text/plain') {
      const yamlObj = yaml.load(fragmentData.toString());
      convertedData = Buffer.from(JSON.stringify(yamlObj, null, 2));
    }

    /* ---------- IMAGE CONVERSIONS ---------- */
    // Assignment spec allows passthrough (no real transcoding required)
    else if (sourceType.startsWith('image/')) {
      convertedData = fragmentData;
    }

    res.setHeader('Content-Type', contentType);
    res.status(200).send(convertedData);
  } catch (err) {
    if (err.message === 'fragment not found') {
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    logger.error({ err }, 'Error converting fragment');
    res.status(500).json(createErrorResponse(500, 'Internal server error'));
  }
};
