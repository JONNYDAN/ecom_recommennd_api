const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category', // Self-reference to the same model
        default: null    // For top-level categories with no parent
    },
    slug: {
        type: String,
        required: true,
        unique: true
    },
}, {
    timestamps: true // This automatically adds createdAt and updatedAt fields
});

module.exports = mongoose.model('Category', categorySchema);
