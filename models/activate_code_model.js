
const mongoose = require('mongoose');

// Declare the Schema of the Mongo model
const activateCodeSchema = new mongoose.Schema({
    code: {
        type: String,
    },
    status: {
        type: String,
        defaut: 'inactivate',
    },
    due_date: {
        type: Date,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
    },

}, { timestamps: true, versionKey: false });

//Export the model
module.exports = mongoose.model('Code', activateCodeSchema);
