const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Declare the Schema of the Mongo model
var userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    phone: {
        type: String,
        // required: true,
        // unique: true,
    },
    birthday: {
        type: Date,
        required: true,
    },
    gender: {
        type: String,
        required: true,
    },
    country: { 
        type: String,
        required: true,
    },
    level: {
        type: String,
        default: "N5",
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        default: "user",
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    profilePic: {
        type: String,
        default: 'https://res.cloudinary.com/dt6hyafmc/image/upload/v1692392344/Avatars/avatar_8609.png',
    },
    coverPhoto:{
        type: String,
        default: 'https://graphicsfamily.com/wp-content/uploads/edd/2021/01/Web-banner-template-with-sports-concept-scaled.jpg',
    }
}, { timestamps: true, versionKey: false });

userSchema.pre('save', async function () {
    const salt = await bcrypt.genSaltSync(10);
    this.password = await bcrypt.hashSync(this.password, salt);
})

userSchema.methods.isPasswordMatched = async function (enteredPassword) {
    return await bcrypt.compareSync(enteredPassword, this.password);
}

//Export the model
module.exports = mongoose.model('User', userSchema);