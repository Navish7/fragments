// src/auth/custom-auth.js
const passport = require('passport');
const logger = require('../logger');
const { createErrorResponse } = require('../response');

/**
 * Custom authentication middleware that wraps Passport strategies
 * and ensures consistent error response format
 */
function createCustomAuth(strategyName) {
  return (req, res, next) => {
    passport.authenticate(strategyName, { session: false }, (err, user) => {
      if (err) {
        logger.error({ err }, 'Authentication error');
        return res.status(500).json(createErrorResponse(500, 'Internal server error'));
      }

      if (!user) {
        logger.warn('Unauthorized access attempt');
        return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
      }

      req.user = user;
      next();
    })(req, res, next);
  };
}

module.exports = createCustomAuth;
