// src/routes/index.js
const express = require('express');
const { createSuccessResponse } = require('../response');
const { authenticate } = require('../auth');
const { version } = require('../../package.json');
const { hostname } = require('os');

const router = express.Router();

// Health check route — must be **before** authenticate middleware
router.get('/', (req, res) => {
  console.log('Health check called, hostname:', hostname()); // debug
  res.setHeader('Cache-Control', 'no-cache');
  res.status(200).json(
    createSuccessResponse({
      author: 'NAVISH',
      githubUrl: 'https://github.com/Navish7/fragments',
      version,
      hostname: hostname(),
    })
  );
});

// Now mount authenticated API routes
router.use(`/v1`, authenticate(), require('./api'));

module.exports = router;
