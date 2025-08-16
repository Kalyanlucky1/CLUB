const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

// Get states for a country
router.get('/states', locationController.getStates);

module.exports = router;