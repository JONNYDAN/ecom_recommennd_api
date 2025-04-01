const Note = require('../models/note_model');
const asyncHandler = require('express-async-handler');

// Create a new note
const createNote = asyncHandler(async (req, res) => {
    try {
        const { title, content } = req.body;
        const userId = req.user._id; // Assuming user is available from auth middleware
        
        const newNote = await Note.create({
            title,
            content,
            user: userId
        });
        
        res.status(201).json({
            data: newNote,
            success: 1
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            success: 0
        });
    }
});

// Get all notes for the authenticated user
const getAllNotes = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Add pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        let notes = await Note.find({ user: userId })
            .sort({ createdAt: -1 })
            .lean()
            .skip(skip)
            .limit(limit);
            
        const total = await Note.countDocuments({ user: userId });
        notes = notes.map(i=>{return {...i, id:i._id}});
        res.status(200).json({
            data: notes,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            },
            success: 1
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            success: 0
        });
    }
});

// Get a single note by ID
const getNoteById = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        
        const note = await Note.findOne({ _id: id, user: userId });
        
        if (!note) {
            return res.status(404).json({ 
                error: "Note not found or you don't have permission to access it",
                success: 0
            });
        }
        
        res.status(200).json({
            data: note,
            success: 1
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            success: 0
        });
    }
});

// Update a note
const updateNote = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content } = req.body;
        const userId = req.user._id;
        
        const note = await Note.findOne({ _id: id, user: userId });
        
        if (!note) {
            return res.status(404).json({ 
                error: "Note not found or you don't have permission to update it",
                success: 0
            });
        }
        
        note.title = title || note.title;
        note.content = content || note.content;
        
        const updatedNote = await note.save();
        
        res.status(200).json({
            data: updatedNote,
            success: 1
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            success: 0
        });
    }
});

// Delete a note
const deleteNote = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        
        const note = await Note.findOne({ _id: id, user: userId });
        
        if (!note) {
            return res.status(404).json({ 
                error: "Note not found or you don't have permission to delete it",
                success: 0
            });
        }
        
        await Note.findByIdAndDelete(id);
        
        res.status(200).json({
            message: "Note deleted successfully",
            success: 1
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            success: 0
        });
    }
});

module.exports = {
    createNote,
    getAllNotes,
    getNoteById,
    updateNote,
    deleteNote
};
