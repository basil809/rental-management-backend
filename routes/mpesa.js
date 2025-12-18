const express = require('express');
const router = express.Router();
const mpesaController = require('../controllers/mpesaController');

router.post('/pay', mpesaController.initiateSTKPush);
router.post('/callback', mpesaController.handleCallback);
router.get('/status', mpesaController.checkMpesaStatus);

module.exports = router;
