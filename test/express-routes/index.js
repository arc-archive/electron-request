const express = require('express');
const testsRoute = require('./tests-api.js');

const router = express.Router();
module.exports = router;

router.use('/tests', testsRoute);
