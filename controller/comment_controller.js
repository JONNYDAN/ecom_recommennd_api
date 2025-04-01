const Comment = require('../models/comment_model');
const Course = require('../models/course_model'); // Import Course model
const User = require('../models/user_model'); // Import User model
const asyncHandler = require('express-async-handler');
const { validateMongoDbId } = require("../utils/validate_mongo_db_id");

// API thêm comment
const addCommentClient = asyncHandler(async (req, res) => {
    const { content, user_id } = req.body;
    const { course_id } = req.params;

    if (!content) {
        return res.status(400).json({ message: 'Content is required' });
    }

    // Kiểm tra course_id và user_id có hợp lệ không
    if (!validateMongoDbId(course_id) || !validateMongoDbId(user_id)) {
        return res.status(400).json({ message: 'Invalid course_id or user_id format' });
    }

    // Kiểm tra course_id có tồn tại không
    const course = await Course.findById(course_id);
    if (!course) {
        return res.status(404).json({ message: 'Course not found' });
    }

    // Kiểm tra user_id có tồn tại không
    const user = await User.findById(user_id);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    try {
        const newComment = await Comment.create({
            content: content,
            course: course_id,
            user: user_id,
        });

        res.json({ code: 200, status: true, message: 'Comment created successfully', data: newComment, success: 1 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API lấy danh sách comment theo course_id
const getListCommentOfCourse = asyncHandler(async (req, res) => {
    // Kiểm tra xem course_id có hợp lệ không
    const { course_id } = req.params; // Lấy course_id từ req.params
    
    try {
        if (!validateMongoDbId(course_id)) {
            return res.json({ code: 404, status: false, message: 'Invalid course_id format' });
        }

        const allCommentCourse = await Comment.find({ course: course_id })
            .populate('user', 'name profilePic')
            .sort({ createdAt: -1 }); // Sort comments from newest to oldest

        if (allCommentCourse.length > 0) {
            res.json({
                code: 200, status: true,
                data: allCommentCourse,
                success: 1
            });
        } else {
            res.json({ code: 404, status: false, message: 'No comments found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = {
    addCommentClient, getListCommentOfCourse
};