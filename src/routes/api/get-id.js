//src/routes/api/get-id.js
const { Fragment } = require('../../model/fragment');
const logger = require('../../logger');
const { createSuccessResponse, createErrorResponse } = require('../../response');

module.exports = async (req, res) => {
  if (!req.user) {
    logger.warn('Unauthorized attempt to access fragment');
    return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
  }

  const ownerId = req.user;
  const { id } = req.params;

  try {
    const fragment = await Fragment.byId(ownerId, id);

    if (req.query.info === 'true') {
      return res.status(200).json(createSuccessResponse({ fragment }));
    }

    const data = await fragment.getData();

    let contentType = fragment.type; // stored in DB
    if (fragment.isText) {
      contentType += '; charset=utf-8'; // append charset only for GET
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', Buffer.byteLength(data));

    if (fragment.isText) {
      res.status(200).send(data.toString());
    } else {
      res.status(200).send(data);
    }
  } catch (err) {
    if (err.message === 'fragment not found') {
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }
    logger.error({ err }, 'Error retrieving fragment');
    res.status(500).json(createErrorResponse(500, 'Internal server error'));
  }
};
