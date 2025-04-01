
const CustomerFeedback = require('../models/customer_feedback_model');

// Get all customer feedbacks
exports.getFeedbacks = async (req, res) => {
  try {
    const feedbacks = await CustomerFeedback.find();
    res.status(200).json({
      success: true,
      count: feedbacks.length,
      data: feedbacks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get single customer feedback by ID
exports.getFeedback = async (req, res) => {
  try {
    const feedback = await CustomerFeedback.findById(req.params.id);
    
    if (!feedback) {
      return res.status(404).json({
        success: false,
        error: 'Feedback not found'
      });
    }

    res.status(200).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Create new customer feedback
exports.createFeedback = async (req, res) => {
  try {
    const feedback = await CustomerFeedback.create(req.body);
    res.status(201).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update customer feedback
exports.updateFeedback = async (req, res) => {
  try {
    const feedback = await CustomerFeedback.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!feedback) {
      return res.status(404).json({
        success: false,
        error: 'Feedback not found'
      });
    }

    res.status(200).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete customer feedback
exports.deleteFeedback = async (req, res) => {
  try {
    const feedback = await CustomerFeedback.findByIdAndDelete(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        error: 'Feedback not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};