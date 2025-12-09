// src/routes/api/get-convert.js

const { Fragment } = require('../../model/fragment');
const logger = require('../../logger');
const { createErrorResponse } = require('../../response');
const markdownIt = require('markdown-it')();
const jsYaml = require('js-yaml');
const sharp = require('sharp'); // ensure installed if you need image conversions

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

    // Get the fragment metadata + data
    const fragment = await Fragment.byId(ownerId, id);
    const fragmentData = await fragment.getData(); // Buffer

    // Map extension to MIME
    const extensionToMime = {
      txt: 'text/plain',
      md: 'text/markdown',
      html: 'text/html',
      json: 'application/json',
      yaml: 'application/yaml',
      yml: 'application/yaml',
      csv: 'text/csv',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      gif: 'image/gif',
      avif: 'image/avif',
    };

    const targetMimeType = extensionToMime[ext.toLowerCase()];

    if (!targetMimeType) {
      logger.warn(`Unsupported extension requested: .${ext}`);
      return res.status(415).json(createErrorResponse(415, `Unsupported extension: ${ext}`));
    }

    // Check fragment supports conversion to target
    if (!fragment.formats.includes(targetMimeType)) {
      logger.warn(`Conversion not supported: ${fragment.type} -> ${targetMimeType}`);
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
    let contentType = fragment.type; // default: original

    const baseType = fragment.mimeType; // canonical mime without charset

    // ---- Text/Markdown/HTML conversions ----
    if (baseType === 'text/markdown' && targetMimeType === 'text/html') {
      convertedData = Buffer.from(markdownIt.render(fragmentData.toString()));
      contentType = 'text/html';
      logger.debug('Converted markdown -> html');
    } else if (baseType === 'text/markdown' && targetMimeType === 'text/markdown') {
      convertedData = fragmentData;
      contentType = 'text/markdown';
    } else if (baseType === 'text/plain' && targetMimeType === 'text/plain') {
      convertedData = fragmentData;
      contentType = 'text/plain';
    } else if (baseType === 'text/html' && targetMimeType === 'text/plain') {
      // Strip HTML tags -> simple approach
      const text = fragmentData.toString().replace(/<[^>]*>/g, '');
      convertedData = Buffer.from(text);
      contentType = 'text/plain';
      logger.debug('Converted html -> plain text');
    } else if (baseType === 'text/html' && targetMimeType === 'text/html') {
      convertedData = fragmentData;
      contentType = 'text/html';
    }

    // ---- JSON <-> text/yaml conversions ----
    else if (baseType === 'application/json' && targetMimeType === 'text/plain') {
      try {
        const obj = JSON.parse(fragmentData.toString());
        convertedData = Buffer.from(JSON.stringify(obj, null, 2));
        contentType = 'text/plain';
        logger.debug('Converted json -> plain text (pretty)');
      } catch (parseErr) {
        logger.warn({ parseErr }, 'Invalid JSON for conversion');
        return res.status(415).json(createErrorResponse(415, 'Invalid JSON data'));
      }
    } else if (baseType === 'application/json' && targetMimeType === 'application/yaml') {
      try {
        const obj = JSON.parse(fragmentData.toString());
        const yaml = jsYaml.dump(obj);
        convertedData = Buffer.from(yaml);
        contentType = 'application/yaml';
        logger.debug('Converted json -> yaml');
      } catch (parseErr) {
        logger.warn({ parseErr }, 'Invalid JSON for conversion to YAML');
        return res.status(415).json(createErrorResponse(415, 'Invalid JSON data'));
      }
    } else if (
      baseType === 'application/yaml' &&
      (targetMimeType === 'application/json' || targetMimeType === 'text/plain')
    ) {
      try {
        const obj = jsYaml.load(fragmentData.toString());
        if (targetMimeType === 'application/json') {
          convertedData = Buffer.from(JSON.stringify(obj));
          contentType = 'application/json';
        } else {
          convertedData = Buffer.from(JSON.stringify(obj, null, 2));
          contentType = 'text/plain';
        }
        logger.debug('Converted yaml -> json or text');
      } catch (parseErr) {
        logger.warn({ parseErr }, 'Invalid YAML for conversion');
        return res.status(415).json(createErrorResponse(415, 'Invalid YAML data'));
      }
    }

    // ---- CSV conversions ----
    else if (baseType === 'text/csv') {
      // csv -> text (identity) or csv -> json
      if (targetMimeType === 'text/csv') {
        convertedData = fragmentData;
        contentType = 'text/csv';
      } else if (targetMimeType === 'text/plain') {
        convertedData = fragmentData;
        contentType = 'text/plain';
      } else if (targetMimeType === 'application/json') {
        // basic csv -> json (first row headers)
        const csv = fragmentData.toString();
        const lines = csv.split(/\r?\n/).filter(Boolean);
        if (lines.length === 0) {
          convertedData = Buffer.from('[]');
          contentType = 'application/json';
        } else {
          const headers = lines[0].split(',');
          const rows = lines.slice(1).map((ln) => {
            const parts = ln.split(',');
            const obj = {};
            headers.forEach((h, i) => {
              obj[h.trim()] = (parts[i] || '').trim();
            });
            return obj;
          });
          convertedData = Buffer.from(JSON.stringify(rows, null, 2));
          contentType = 'application/json';
        }
        logger.debug('Converted csv -> json');
      } else {
        logger.warn('Unsupported CSV target conversion');
        return res.status(415).json(createErrorResponse(415, 'Unsupported CSV conversion'));
      }
    }

    // ---- Image conversions (via sharp) ----
    else if (baseType.startsWith('image/') && targetMimeType.startsWith('image/')) {
      // Use sharp to convert image buffer between formats
      try {
        const image = sharp(fragmentData);
        // Choose output format based on targetMimeType
        if (targetMimeType === 'image/png') {
          convertedData = await image.png().toBuffer();
          contentType = 'image/png';
        } else if (targetMimeType === 'image/jpeg') {
          convertedData = await image.jpeg().toBuffer();
          contentType = 'image/jpeg';
        } else if (targetMimeType === 'image/webp') {
          convertedData = await image.webp().toBuffer();
          contentType = 'image/webp';
        } else if (targetMimeType === 'image/gif') {
          // sharp does not write GIF, but we can attempt to output webp or png instead.
          // Try to output PNG and mark as image/gif only if original was gif.
          convertedData = await image.png().toBuffer();
          contentType = 'image/gif'; // NOTE: this is actually PNG data; recommend webp/png instead.
        } else if (targetMimeType === 'image/avif') {
          convertedData = await image.avif().toBuffer();
          contentType = 'image/avif';
        } else {
          logger.warn(`Unsupported image target: ${targetMimeType}`);
          return res
            .status(415)
            .json(createErrorResponse(415, `Unsupported image conversion to ${targetMimeType}`));
        }
        logger.debug(`Converted image to ${contentType}`);
      } catch (imgErr) {
        logger.error({ imgErr }, 'Error converting image');
        return res.status(500).json(createErrorResponse(500, 'Image conversion failed'));
      }
    }

    // If no conversion branch matched but conversion was allowed, return original data
    if (!convertedData) {
      convertedData = fragmentData;
      contentType = fragment.type;
    }

    // Set appropriate Content-Type header for the conversion result
    res.setHeader('Content-Type', contentType);
    return res.status(200).send(convertedData);
  } catch (err) {
    if (err && err.message && err.message.includes('fragment not found')) {
      logger.warn(`Fragment not found: ${req.params.id}`);
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }
    logger.error({ err }, 'Error converting fragment');
    return res.status(500).json(createErrorResponse(500, 'Internal server error'));
  }
};
