const express = require('express');
const router = express.Router();

const aiController = require('../controllers/aiController');

// AI Eligibility Check - calls trained ML model
router.post('/check-eligibility', aiController.checkEligibility);

// Get model information
router.get('/model-info', aiController.getModelInfo);

// Health check for AI service
router.get('/health', aiController.healthCheck);













module.exports = router;
