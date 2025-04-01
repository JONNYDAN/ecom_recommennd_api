const mongoose = require('mongoose');

// Declare the Schema of the Mongo model
const postSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description:{
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['career', 'news'],
        default: 'news',
    },
    isPublished: {
        type: Boolean,
        default: false,
    },
    thumbnail: {
        type: String,
        default: 'https://res.cloudinary.com/dt6hyafmc/image/upload/v1692392344/Avatars/avatar_8609.png',
    },
}, { timestamps: true, versionKey: false });

//Export the model
module.exports = mongoose.model('Post', postSchema);