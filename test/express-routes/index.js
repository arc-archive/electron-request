const express = require('express');
const testsRoute = require('./tests-api.js');
const qaramsRoute = require('./qarams-api.js');
const headersRoute = require('./headers-api.js');

const router = express.Router();
module.exports = router;

router.use('/tests', testsRoute);
router.use('/qarams', qaramsRoute);
router.use('/headers', headersRoute);
