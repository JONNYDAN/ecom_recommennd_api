const express = require('express');
const router = express.Router();
const { 
    createNote, 
    getAllNotes, 
    getNoteById, 
    updateNote, 
    deleteNote 
} = require('../controller/note_controller');
const { authMiddleware } = require('../middlewares/auth_middleware');

// Apply auth middleware to all note routes
router.use(authMiddleware);

// CRUD routes
router.post('/',authMiddleware, createNote);
router.get('/', authMiddleware,getAllNotes);
router.get('/:id',authMiddleware, getNoteById);
router.put('/:id',authMiddleware, updateNote);
router.delete('/:id',authMiddleware, deleteNote);

module.exports = router;
