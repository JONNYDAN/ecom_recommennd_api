const express = require('express');
const router = express.Router();
const { getProfileDetails } = require('../controller/dashboard_controller');
const { authMiddleware } = require('../middlewares/auth_middleware');

router.get('/profile', authMiddleware, getProfileDetails);

module.exports = router;