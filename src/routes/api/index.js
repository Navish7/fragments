const express = require('express');
const contentType = require('content-type');
const { Fragment } = require('../../model/fragment');

const rawBody = () =>
  express.raw({
    inflate: true,
    limit: '5mb',
    type: (req) => {
      try {
        const { type } = contentType.parse(req);
        return Fragment.isSupportedType(type);
      } catch {
        return false;
      }
    },
  });

const router = express.Router();

// Define our routes - FIXED: use get-data for fragment data retrieval
router.get('/fragments', require('./get'));
router.get('/fragments/:id', require('./get-id')); // CHANGED to get-data
router.get('/fragments/:id/info', require('./get-info'));
router.get('/fragments/:id.:ext', require('./get-convert'));
router.post('/fragments', rawBody(), require('./post'));

module.exports = router;
