//src/routes/api/delete.js
const { Fragment } = require('../../model/fragment');
const logger = require('../../logger');
const { createSuccessResponse, createErrorResponse } = require('../../response');

/**
 * DELETE /fragments/:id
 * Delete a fragment by ID for the current user
 */
module.exports = async (req, res) => {
  if (!req.user) {
    logger.warn('Unauthorized attempt to delete fragment');
    return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
  }

  const ownerId = req.user;
  const { id } = req.params;

  try {
    logger.debug(`Deleting fragment ${id} for user ${ownerId}`);
    await Fragment.delete(ownerId, id);
    res.status(200).json(createSuccessResponse());
  } catch (err) {
    if (err.message === 'fragment not found') {
      logger.warn(`Fragment not found: ${id}`);
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }
    logger.debug(`DELETE request - ownerId: ${ownerId}, id: ${id}`);
    logger.error({ err }, 'Error deleting fragment');
    res.status(500).json(createErrorResponse(500, 'Internal server error'));
  }
};
