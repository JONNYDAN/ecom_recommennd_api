const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  interactionType: { type: String, enum: ['view', 'purchase', 'cart', 'rating'], required: true },
  value: { type: Number }, // Cho rating (1-5) hoặc số lượng
  sessionId: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserInteraction', interactionSchema);