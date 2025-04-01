const express = require('express');
const router = express.Router();
const { createPost, getAllPosts, getSpecificPost, getPostRelated,
    deleteSpecificPost, updatePost, getListPosts, upload } = require('../controller/post_controller');
const { authMiddleware, isAdmin } = require('../middlewares/auth_middleware');

// router.get('/all-posts', authMiddleware, isAdmin, getAllPosts);

router.get('/', getListPosts);

router.get('/slugs/:post_id', getSpecificPost);

router.get('/slugs/:post_id/related', getPostRelated);

router.post('/', upload.single("thumbnail"), createPost);

router.get('/:post_id', authMiddleware, getSpecificPost);

router.delete('/:post_id', authMiddleware, isAdmin, deleteSpecificPost);

router.put('/:post_id', authMiddleware, upload.single("thumbnail"), updatePost);



module.exports = router;