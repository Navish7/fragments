//src/routes/index.js
const express = require('express');
const { createSuccessResponse } = require('../response');
const { authenticate } = require('../auth');
const { version, author } = require('../../package.json');
const os = require('os'); // <-- import os module

const router = express.Router();

const githubUrl = 'https://github.com/Navish7/fragments';

// Health check route
router.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.status(200).json(
    createSuccessResponse({
      author,
      githubUrl,
      version,
      hostname: os.hostname(), // <-- dynamically pick system hostname
    })
  );
});

// Mount API routes (with authentication)
router.use(`/v1`, authenticate(), require('./api'));

module.exports = router;
