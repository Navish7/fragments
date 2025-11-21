//src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const passport = require('passport');

const logger = require('./logger');
const pino = require('pino-http')({ logger });
const authenticate = require('./auth');
const { createErrorResponse } = require('./response');

// author and version from package.json
const { author, version } = require('../package.json');

// Create Express app instance
const app = express();

// Middleware
app.use(pino); // Pino logging
app.use(helmet()); // Security headers
app.use(cors()); // Cross-origin requests
app.use(compression()); // Gzip/deflate
const os = require('os');

// Health check route
//app.get('/', (req, res) => {
// res.setHeader('Cache-Control', 'no-cache'); // fixes test
// res.status(200).json({
//  status: 'ok',
// author,
// githubUrl: 'https://github.com/Navish7/fragments',
//version,
//hostname: os.hostname(), // ← add this
// });
//});

// Set up Passport authentication middleware
passport.use(authenticate.strategy());
app.use(passport.initialize());

// Define routes
app.use('/', require('./routes'));

// 404 middleware
app.use((req, res) => {
  res.setHeader('Cache-Control', 'no-cache'); // add this to pass the test
  res.status(404).json(createErrorResponse(404, 'not found'));
});

// Error-handling middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'unable to process request';
  if (status > 499) {
    logger.error({ err }, `Error processing request`);
  }
  res.status(status).json(createErrorResponse(status, message));
});

// Export app
module.exports = app;
