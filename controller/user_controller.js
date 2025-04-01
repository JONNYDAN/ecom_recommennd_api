const User = require('../models/user_model');
const Otp = require('../models/otp_model');
const Avatar = require('../models/avatar_model');
const asyncHandler = require('express-async-handler');
const generateToken = require('../config/jwt_token');
const { validateMongoDbId } = require("../utils/validate_mongo_db_id");
const { sendSMS } = require("../utils/send_sms");
const { sendWelcomeMail } = require("../utils/send_mail");
const bcrypt = require('bcrypt');
const otpGenerator = require('otp-generator');
const lodash = require('lodash');
const crypto = require('crypto');
const multer = require("multer");
const path = require("path");

// Cấu hình lưu file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/uploads/"); // Lưu ảnh vào thư mục public/uploads
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Tạo tên file duy nhất
    },
});

const upload = multer({ storage: storage });

function generateSeedFromEmail(email) {
    return crypto.createHash('md5').update(email).digest('hex');
  }

const createUser = asyncHandler(async (req, res) => {
    const { email, name, phone = "", birthday = new Date(), gender = "male", country = "VN", password } = req.body;

    if (!email || !name  || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Please fill all the fields' 
        });
    }

    try {
        
        // Kiểm tra nếu email đã tồn tại
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email address already exists' 
            });
        }

        // Kiểm tra nếu phone đã tồn tại
        // const existingPhoneUser = await User.findOne({ phone });
        // if (existingPhoneUser) {
        //     return res.status(400).json({ 
        //         success: false, 
        //         message: 'Phone address already exists' 
        //     });
        // }

        // Tạo ảnh profile ngẫu nhiên từ email
        const seed = generateSeedFromEmail(email);
        const randomProfilePic = `https://api.dicebear.com/9.x/personas/svg?seed=${seed}`;
        const tempPhoto = "https://graphicsfamily.com/wp-content/uploads/edd/2021/01/Web-banner-template-with-sports-concept-scaled.jpg";
        
        // Tạo user mới
        const newUser = await User.create({
            name,
            email,
            phone,
            birthday,
            gender,
            country,
            password,
            profilePic: randomProfilePic,
            coverPhoto: tempPhoto,
        });

        return res.status(200).json({ 
            success: true, 
            message: 'User created successfully', 
            result: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                phone: newUser.phone,
                birthday: newUser.birthday,
                gender: newUser.gender,
                country: newUser.country,
                level: newUser.level,
                profile_pic: newUser.profilePic,
                coverPhoto: newUser.coverPhoto,
                createdAt: newUser.createdAt,
                updatedAt: newUser.updatedAt,
            } 
        });
    } 
    catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: 'Internal Server Error', 
            error: error.message 
        });
    }
});

const verifyMobileOtp = asyncHandler(async (req, res) => {
    const { mobile, otp } = req.body;

    try {
        // Validate mobile number format (you may need to adjust this based on your mobile number format).
        const mobileRegex = /^\d{10}$/;
        if (!mobile.match(mobileRegex)) {
            return res.json({ code: 404, status: false, message: 'Invalid mobile number format' });
        }

        // Find the user with the given mobile number
        const user = await User.findOne({ mobile: mobile });

        if (!user) {
            return res.json({ code: 404, status: false, message: 'User not found' });
        }

        // Check if the mobile number is already verified
        if (user.isMobileNumberVerified) {
            return res.json({ code: 200, status: true, message: 'Mobile number is already verified' });
        }

        // Find the OTP document for the given mobile number
        const otpDocument = await Otp.findOne({ mobile: mobile });

        if (!otpDocument) {
            return res.json({ code: 404, status: false, message: 'OTP not found' });
        }

        // Check if the provided OTP matches the one in the database
        if (otp === otpDocument.otp) {
            // Check if the OTP is expired
            const currentTime = new Date();
            const createdAtTime = otpDocument.createdAt;
            const otpExpirationTime = 5 * 60 * 1000; // 5 minutes in milliseconds

            if (currentTime - createdAtTime > otpExpirationTime) {
                // OTP is expired
                return res.json({ code: 404, status: false, message: 'OTP has expired' });
            }

            // If the OTP is not expired, mark the mobile number as verified in the user document
            await User.findByIdAndUpdate(
                user._id,
                {
                    isMobileNumberVerified: true
                },
                {
                    new: true,
                }
            );

            // Delete the OTP document after successful verification
            await otpDocument.deleteOne();

            return res.json({ code: 200, status: true, message: 'Mobile number verified successfully. Please login' });
        } else {
            return res.json({ code: 404, status: false, message: 'Invalid OTP' });
        }
    } catch (err) {
        throw new Error(err);
    }
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    try {

        const user = await User.findOne({ email: email });
        if (user) {

            if (await user.isPasswordMatched(password)) {

                if (user.isBlocked) {
                    return res.status(403).json({ 
                        success: false, 
                        message: "You can't login because you are blocked by the admin" 
                    });
                }

                const result = {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    profile_pic: user.profilePic,
                };

                return res.status(200).json({
                    success: true, 
                    message: 'Login successfully', 
                    result: result, 
                    token: generateToken(user._id),
                });
            } else {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Email or password incorrect' 
                });
            }
        } else {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid Credentials' 
            });
        }
    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: 'Internal Server Error', 
            error: error.message 
        });
    }
});

const adminLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    try {

        const user = await User.findOne({ email: email });
        if (user) {
            if (user.role === 'admin') {

                if (await user.isPasswordMatched(password)) {
                    const result = {
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        profile_pic: user.profilePic,
                        token: generateToken(user._id),
                    };
                    res.json({
                        code: 200, status: true, message: 'Login successfully', result: result
                    });
                } else {
                    res.json({ code: 404, status: false, message: 'Invalid Credentials' });
                }
            } else {
                res.json({ code: 404, status: false, message: 'Login as Amdin' });
            }
        } else {
            res.json({ code: 404, status: false, message: 'User not found' });
        }

    } catch (err) {
        throw new Error(err);
    }
});

const getAllUsers = asyncHandler(async (req, res) => {
    const isAdmin = req.query.isAdmin === 'true' || false;
    const search = req.query.search;

    try {
        let query = { role: isAdmin ? 'admin' : 'user' };

        if (search) {
            query.$or = [
                { firstname: { $regex: search, $options: 'i' } },  // Case-insensitive firstname search
                { email: { $regex: search, $options: 'i' } },      // Case-insensitive email search
                { mobile: { $regex: search, $options: 'i' } },     // Case-insensitive mobile search
            ];
        }

        const allUsers = await User.find(query);
        const userCount = allUsers.length;
        if (allUsers.length > 0) {
            res.json({
                code: 200, status: true,
                count: userCount,
                users: allUsers,
            });
        } else {
            res.json({ code: 404, status: false, message: 'No users found' });
        }
    }
    catch (err) {
        throw new Error(err);
    }
});

const getSpecificUser = asyncHandler(async (req, res) => {
    const { user_id } = req.params;
    try {

        // Check if the provided user_id is a valid ObjectId
        if (!validateMongoDbId(user_id)) {
            return res.json({ code: 404, status: false, message: 'Invalid user_id format' });
        }

        const user = await User.findById(user_id);
        if (user) {
            res.json({ code: 200, status: true, user: user });
        } else {
            res.json({ code: 404, status: false, message: 'User not found' });
        }
    } catch (err) {
        throw new Error(err);
    }
});

const deleteSpecificUser = asyncHandler(async (req, res) => {
    const { user_id } = req.params;
    try {

        // Check if the provided user_id is a valid ObjectId
        if (!validateMongoDbId(user_id)) {
            return res.json({ code: 404, status: false, message: 'Invalid user_id format' });
        }

        const deleteUser = await User.findByIdAndDelete(user_id);
        if (deleteUser) {
            res.json({
                code: 200, status: true,
                message: 'User deleted successfully'
            });
        } else {
            res.json({ code: 404, status: false, message: 'User not found' });
        }
    } catch (err) {
        throw new Error(err);
    }
});

const updateUser = asyncHandler(async (req, res) => {
    const { user_id } = req.params;
    const { _id, role } = req.user;
    try {

        // Check if the provided user_id is a valid ObjectId
        if (!validateMongoDbId(user_id)) {
            return res.json({ code: 404, status: false, message: 'Invalid user_id format' });
        }

        // If the requester is not an admin and is trying to update another user's details, return a 403 Forbidden response.
        if (role !== 'admin' && user_id !== _id.toString()) {
            return res.json({ code: 403, status: false, message: 'You do not have permission to update this user' });
        }
        const updateFields = {
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            about: req.body.about,
            profilePic: req.body.profile_pic,
        };

        // If the requester is an admin, allow them to update additional fields
        if (role === 'admin') {
            if (req.body.email) {
                updateFields.email = req.body.email;
            }
            if (req.body.mobile) {
                updateFields.mobile = req.body.mobile;
            }
            updateFields.isMobileNumberVerified = req.body.isMobileNumberVerified;
            updateFields.isEmailVerified = req.body.isEmailVerified;
            updateFields.isBlocked = req.body.isBlocked;
        }

        const updatedUser = await User.findByIdAndUpdate(
            user_id,
            updateFields,
            {
                new: true,
            }
        ).select('-password');
        if (updateUser) {
            res.json({ code: 200, status: true, message: 'Profile details has been updated succefully', updatedUser: updatedUser });
        } else {
            res.json({ code: 404, status: false, message: 'User not found' });
        }
    } catch (err) {
        throw new Error(err);
    }
});

const updateUserBlockStatus = asyncHandler(async (req, res) => {
    const { user_id } = req.params;
    const { isBlocked } = req.body;

    try {

        // Check if the provided user_id is a valid ObjectId
        if (!validateMongoDbId(user_id)) {
            return res.json({ code: 404, status: false, message: 'Invalid user_id format' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            user_id,
            {
                isBlocked: isBlocked,
            },
            {
                new: true,
            }
        );

        if (updatedUser) {
            const message = isBlocked ? 'User blocked successfully' : 'User unblocked successfully';
            res.json({ code: 200, status: true, message });
        } else {
            res.json({ code: 404, status: false, message: 'User not found' });
        }
    } catch (err) {
        throw new Error(err);
    }
});


const logout = asyncHandler(async (req, res) => {
    const { _id } = req.user;
    try {

        const user = await User.findById(_id);
        if (user) {
            res.json({
                code: 200, status: true, message: 'User logged out successfully'
            });
        } else {
            res.json({ code: 404, status: false, message: 'User not found' });
        }
    } catch (err) {
        throw new Error(err);
    }
});

const forgotPassword = asyncHandler(async (req, res) => {
    const { mobile } = req.body;
    try {
        // Validate mobile number format (you may need to adjust this based on your mobile number format).
        const mobileRegex = /^\d{10}$/;
        if (!mobile.match(mobileRegex)) {
            return res.json({ code: 404, status: false, message: 'Invalid mobile number format' });
        }

        const user = await User.findOne({ mobile: mobile }).select('-password');
        if (user) {

            // Generate OTP and save it to the Otp collection
            const generatedOtp = otpGenerator.generate(6, { lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false, digits: true });
            await Otp.findOneAndUpdate({ mobile: user.mobile }, { otp: generatedOtp, createdAt: new Date() }, { upsert: true });

            // Send the OTP to the user's mobile number using sms service
            sendSMS(`+91${user.mobile}`, `Your Quizze Thunder OTP code is: ${generatedOtp}`)
                .then(message => console.log('OTP sent:', message.sid))
                .catch(error => console.error('Error sending OTP:', error));

            res.json({ code: 200, status: true, message: 'Verification code has been sent to your given mobile number' });
        }
        else {
            res.json({ code: 404, status: false, message: 'User not found' });
        }
    } catch (err) {
        throw new Error(err);
    }
});

const createNewPassword = asyncHandler(async (req, res) => {
    const { mobile, otp, new_password } = req.body;

    try {
        // Validate mobile number format (you may need to adjust this based on your mobile number format).
        const mobileRegex = /^\d{10}$/;
        if (!mobile.match(mobileRegex)) {
            return res.json({ code: 404, status: false, message: 'Invalid mobile number format' });
        }

        // Find the user with the given mobile number
        const user = await User.findOne({ mobile: mobile });

        if (!user) {
            return res.json({ code: 404, status: false, message: 'User not found' });
        }

        // Find the OTP document for the given mobile number
        const otpDocument = await Otp.findOne({ mobile: mobile });

        if (!otpDocument) {
            return res.json({ code: 404, status: false, message: 'OTP not found' });
        }

        // Check if the provided OTP matches the one in the database
        if (otp === otpDocument.otp) {
            // Check if the OTP is expired
            const currentTime = new Date();
            const createdAtTime = otpDocument.createdAt;
            const otpExpirationTime = 5 * 60 * 1000; // 5 minutes in milliseconds

            console.log('currentTime = ' + currentTime + ' createdAtTime = ' + createdAtTime);

            if (currentTime - createdAtTime > otpExpirationTime) {
                // OTP is expired
                return res.json({ code: 404, status: false, message: 'OTP has expired' });
            }

            // Hash the new password before updating.
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(new_password, salt);

            // If the OTP is not expired, update the new password in the user document        
            await User.findByIdAndUpdate(
                user._id,
                {
                    password: hashedPassword,
                },
                {
                    new: true,
                }
            );

            // Delete the OTP document after successful verification
            await otpDocument.deleteOne();

            return res.json({ code: 200, status: true, message: 'New password created successfully. Please login' });
        } else {
            return res.json({ code: 404, status: false, message: 'Invalid OTP' });
        }

    } catch (err) {
        throw new Error(err);
    }
});

const updatePassword = asyncHandler(async (req, res, next) => {
    const { _id } = req.user;
    const { current_password, new_password } = req.body;

    try {
        // Tìm người dùng bằng ID
        const user = await User.findById(_id);
        if (!user) {
            return res.status(400).json({ code: 404, status: false, message: 'User not found' });
        }

        // Kiểm tra mật khẩu cũ có đúng không
        const isMatch = await bcrypt.compare(current_password, user.password);
        if (!isMatch) {
            return res.status(400).json({ code: 400, status: false, message: 'Current password is incorrect' });
        }

        // Hash mật khẩu mới trước khi cập nhật
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_password, salt);

        // Cập nhật mật khẩu mới
        const updatedUser = await User.findByIdAndUpdate(
            user._id,
            { password: hashedPassword },
            { new: true }
        );

        if (updatedUser) {
            return res.json({ code: 200, success: true, data: updatedUser});
        } else {
            return res.json({ code: 500, status: false, message: 'Failed to update password' });
        }
    } catch (err) {
        next(err); // Truyền lỗi đến middleware xử lý lỗi
    }
});


const getMe = asyncHandler(async (req, res) => {
    const { _id } = req.user;
    try {
        const user
            = await User.findById(_id).select('-password');
        if (user) {
            res.json({ code: 200, success: 1, data: user });
        }
        else {
            res.json({ code: 404, status: 0, message: 'User not found' });
        }
    } catch (err) {
        throw new Error(err);
    }
}
);

const updateUserInfo = asyncHandler(async (req, res) => {
    const { _id } = req.user;
    const { name, email, phone, birthday, gender, country, level } = req.body;

    const baseUrl = `${req.protocol}://${req.get("host")}`; // Example: http://localhost:3000

    let profilePic = null;
    let coverPhoto = null;

    if (req.files) {
        if (req.files.profilePic) {
            profilePic = `${baseUrl}/uploads/${req.files.profilePic[0].filename}`;
        }
        if (req.files.coverPhoto) {
            coverPhoto = `${baseUrl}/uploads/${req.files.coverPhoto[0].filename}`;
        }
    }

    try {
        if (phone){
            const existingUser = await User.findOne({ phone });
            if (existingUser && existingUser._id.toString() !== _id.toString()) {
                return res.status(400).json({ code: 400, status: false, message: 'Phone number already exists' });
            }
        }

        const updateFields = { name, email, phone, birthday, gender, country, level };
        if (profilePic) updateFields.profilePic = profilePic;
        if (coverPhoto) updateFields.coverPhoto = coverPhoto;

        const user = await User.findByIdAndUpdate(
            _id,
            updateFields,
            { new: true }
        );

        if (user) {
            res.json({ code: 200, success: 1, data: user });
        } else {
            res.status(400).json({ message: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = {
    getMe, createUser, loginUser, verifyMobileOtp, adminLogin, getAllUsers, getSpecificUser, deleteSpecificUser,
    updateUser, updateUserBlockStatus, logout, forgotPassword, createNewPassword, updatePassword, updateUserInfo, upload
};