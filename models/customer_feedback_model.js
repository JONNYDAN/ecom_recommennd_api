const mongoose = require('mongoose');
const { Schema } = mongoose;

const customerFeedbackSchema = new Schema({
  customerName: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  image: {
    type: String
  },
  feedback: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  versionKey: false
});

const CustomerFeedback = mongoose.model('CustomerFeedback', customerFeedbackSchema);

module.exports = CustomerFeedback;
