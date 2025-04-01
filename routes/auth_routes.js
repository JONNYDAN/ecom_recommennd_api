const express = require('express');
const router = express.Router();
const { getMe, createUser, loginUser, adminLogin, getAllUsers, getSpecificUser,
    deleteSpecificUser, updateUser, updateUserBlockStatus, logout,
    forgotPassword, createNewPassword, updatePassword, verifyMobileOtp, updateUserInfo, upload } = require('../controller/user_controller');
const { authMiddleware, isAdmin } = require('../middlewares/auth_middleware');

/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: User authentication endpoints
 *   - name: User Management
 *     description: User profile and account management
 *   - name: Admin
 *     description: Admin-only operations
 * 
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         mobile:
 *           type: string
 *         role:
 *           type: string
 *         isBlocked:
 *           type: boolean
 */

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authMiddleware, getMe);

/**
 * @swagger
 * /api/auth/updateme:
 *   patch:
 *     summary: Update current user profile
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: profilePic
 *         type: file
 *         description: Profile picture
 *       - in: formData
 *         name: coverPhoto
 *         type: file
 *         description: Cover photo
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 */
router.patch('/updateme', authMiddleware, upload.fields([{ name: 'profilePic', maxCount: 1 }, { name: 'coverPhoto', maxCount: 1 }]), updateUserInfo);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               mobile:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input data or user already exists
 */
router.post('/register', createUser);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', loginUser);

/**
 * @swagger
 * /api/auth/admin-login:
 *   post:
 *     summary: Admin login
 *     tags: [Admin, Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Admin login successful
 *       401:
 *         description: Unauthorized or not an admin
 */
router.post('/admin-login', adminLogin);

/**
 * @swagger
 * /api/auth/all-users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Admin, User Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not an admin
 */
router.get('/all-users', authMiddleware, isAdmin, getAllUsers);

/**
 * @swagger
 * /api/auth/{user_id}:
 *   get:
 *     summary: Get specific user details
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *       404:
 *         description: User not found
 */
router.get('/:user_id', authMiddleware, getSpecificUser);

/**
 * @swagger
 * /api/auth/{user_id}:
 *   delete:
 *     summary: Delete a user (admin only)
 *     tags: [Admin, User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to delete
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       403:
 *         description: Forbidden - Not an admin
 *       404:
 *         description: User not found
 */
router.delete('/:user_id', authMiddleware, isAdmin, deleteSpecificUser);

/**
 * @swagger
 * /api/auth/update/{user_id}:
 *   put:
 *     summary: Update user details
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               mobile:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         description: User not found
 */
router.put('/update/:user_id', authMiddleware, updateUser);

/**
 * @swagger
 * /api/auth/{user_id}/block-status:
 *   put:
 *     summary: Block or unblock a user (admin only)
 *     tags: [Admin, User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isBlocked:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User block status updated successfully
 *       403:
 *         description: Forbidden - Not an admin
 *       404:
 *         description: User not found
 */
router.put('/:user_id/block-status', authMiddleware, isAdmin, updateUserBlockStatus);

/**
 * @swagger
 * /api/auth/logout:
 *   get:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.get('/logout', authMiddleware, logout);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Send password reset instructions
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset instructions sent
 *       404:
 *         description: User not found
 */
router.post('/forgot-password', forgotPassword);

/**
 * @swagger
 * /api/auth/create-new-password:
 *   put:
 *     summary: Create new password after reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Invalid or expired token
 */
router.put('/create-new-password', createNewPassword);

/**
 * @swagger
 * /api/auth/update-password:
 *   put:
 *     summary: Update password
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Old password is incorrect
 *       401:
 *         description: Unauthorized
 */
router.put('/update-password', authMiddleware, updatePassword);

module.exports = router;