
const express = require('express');
const router = express.Router();
const customerFeedbackController = require('../controller/customer_feedback_controller');

// GET all feedbacks
router.get('/', customerFeedbackController.getFeedbacks);

// POST new feedback
router.post('/', customerFeedbackController.createFeedback);

// GET single feedback
router.get('/:id', customerFeedbackController.getFeedback);

// PUT update feedback
router.put('/:id', customerFeedbackController.updateFeedback);

// DELETE feedback
router.delete('/:id', customerFeedbackController.deleteFeedback);

module.exports = router;