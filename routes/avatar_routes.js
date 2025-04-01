const express = require('express');
const router = express.Router();
const { addAvatar, getAllAvatars, createAvatar } = require('../controller/avatar_controller');
const { authMiddleware, isAdmin } = require('../middlewares/auth_middleware');

router.post('/add', authMiddleware, isAdmin, addAvatar);
router.get('/all', authMiddleware, getAllAvatars);
router.get("/test", createAvatar);
//router.delete('/:avatar_id', authMiddleware, isAdmin, deleteAvatar);
//router.put('/update/:avatar_id', authMiddleware, isAdmin, updateAvatar);

module.exports = router;