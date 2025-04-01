const mongoose = require('mongoose');

// Declare the Schema of the Mongo model
const commentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },

}, { timestamps: true, versionKey: false });

//Export the model
module.exports = mongoose.model('Comment', commentSchema);
