const Post = require('../models/post_model');
const multer = require("multer");
const path = require("path");
const asyncHandler = require('express-async-handler');
const { validateMongoDbId } = require("../utils/validate_mongo_db_id");

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

const createPost = asyncHandler(async (req, res) => {
    const { title, description, content } = req.body;
    
    if (!title || !description || !content) {
        return res.status(400).json({ error: "Title, description, and content are required." });
    }

    // Lấy URL từ request
    const baseUrl = `${req.protocol}://${req.get("host")}`; // Ví dụ: http://localhost:3000
    const thumbnailUrl = req.file ? `${baseUrl}/uploads/${req.file.filename}` : null;

    try {
        const newPost = await Post.create({
            title,
            description,
            content,
            thumbnail: thumbnailUrl, // Lưu URL đầy đủ
        });

        res.json({ code: 200, status: true, message: 'Post created successfully', post: newPost });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const getAllPosts = asyncHandler(async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;
        
        const filter = {};
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }
        
        const posts = await Post.find(filter)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip);
            
        const total = await Post.countDocuments(filter);
        
        return res.status(200).json({
            success: true,
            data: posts,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

const getSpecificPost = asyncHandler(async (req, res) => {
    const { post_id } = req.params;

    try {
        // Kiểm tra xem post_id có hợp lệ không
        if (!validateMongoDbId(post_id)) {
            return res.json({ code: 404, status: false, message: 'Invalid post_id format' });
        }

        const post = await Post.findById(post_id); // Không cần populate author
        if (post) {
            res.json({ code: 200, status: true, data: post, success: true });
        } else {
            res.json({ code: 404, status: false, message: 'Post not found' });
        }
    } catch (err) {
        throw new Error(err);
    }
});

const getPostRelated = asyncHandler(async (req, res) => {
    const { post_id } = req.params;

    try {
        // Kiểm tra post_id có hợp lệ không
        if (!validateMongoDbId(post_id)) {
            return res.status(400).json({ code: 400, success: false, message: 'Invalid post_id format' });
        }

        // Tìm bài viết hiện tại
        const post = await Post.findById(post_id);
        if (!post) {
            return res.status(404).json({ code: 404, success: false, message: 'Post not found' });
        }

        const relatedPosts = await Post.find({
            _id: { $ne: post._id }, // Không lấy chính bài viết đó
        })
        .limit(3)
        .select("title thumbnail description createdAt")
        .lean();

        res.status(200).json({
            success: true,
            data: relatedPosts,
        });
    } catch (err) {
        res.status(500).json({ code: 500, success: false, message: "Internal server error", error: err.message });
    }
});


const deleteSpecificPost = asyncHandler(async (req, res) => {
    const { post_id } = req.params;

    try {
        // Kiểm tra xem post_id có hợp lệ không
        if (!validateMongoDbId(post_id)) {
            return res.json({ code: 404, status: false, message: 'Invalid post_id format' });
        }

        const deletePost = await Post.findByIdAndDelete(post_id);
        if (deletePost) {
            res.json({
                code: 200, status: true,
                message: 'Post deleted successfully'
            });
        } else {
            res.json({ code: 404, status: false, message: 'Post not found' });
        }
    } catch (err) {
        throw new Error(err);
    }
});

const updatePost = asyncHandler(async (req, res) => {
    const { post_id } = req.params;
    const { title, description, content, isPublished } = req.body;
    // Lấy URL từ request
    const baseUrl = `${req.protocol}://${req.get("host")}`; // Ví dụ: http://localhost:3000
    // const thumbnailUrl = req.file ? `${baseUrl}/uploads/${req.file.filename}` : null;

    let thumbnailUrl = null;

    if(req.file){
        thumbnailUrl = req.file ? `${baseUrl}/uploads/${req.file.filename}` : null;
    }

    // console.log(req.file.filename);
    try {
        // Kiểm tra xem post_id có hợp lệ không
        if (!validateMongoDbId(post_id)) {
            return res.json({ code: 404, status: false, message: 'Invalid post_id format' });
        }
        
        let updateFields = {};
        if (thumbnailUrl === null){
            updateFields = {
                title: title,
                description: description, // Thêm description
                content: content,
                isPublished: isPublished,
            };
        }else{
            updateFields = {
                title: title,
                description: description, // Thêm description
                content: content,
                isPublished: isPublished,
                thumbnail: thumbnailUrl,
            };
        }

        const updatedPost = await Post.findByIdAndUpdate(
            post_id,
            updateFields,
            { new: true }
        );

        if (updatedPost) {
            res.json({ code: 200, status: true, message: 'Post updated successfully', post: updatedPost });
        } else {
            res.json({ code: 404, status: false, message: 'Post not found' });
        }
    } catch (err) {
        throw new Error(err);
    }
});

const getListPosts = asyncHandler(async (req, res) => {
    const { search, category, page = 1, limit = 10 } = req.query; // Lấy thông tin từ query params
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    try {
        let query = {};

        // Nếu có search, tìm theo tiêu đề, mô tả, nội dung
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
            ];
        }

        if (category) {
            query.type = category;
        }
        // Lấy tổng số bài viết
        const totalPosts = await Post.countDocuments(query);
        const totalPages = Math.ceil(totalPosts / limitNumber);

        // Lấy danh sách bài viết có phân trang
        const posts = await Post.find(query)
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber)
            .sort({ createdAt: -1 }); // Sắp xếp theo ngày mới nhất

        res.status(200).json({
            success: 1,
            code: 200,
            status: true,
            data: posts,
            totalPage: totalPages,
            page: pageNumber,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});


module.exports = {
    createPost, getAllPosts, getSpecificPost, deleteSpecificPost, updatePost, getListPosts, upload, getPostRelated 
};