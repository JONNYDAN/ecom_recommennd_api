const Category = require('../models/category_model');

// Get all categories organized hierarchically
exports.getAllCategories = async (req, res) => {
    try {
        // First, get all top-level categories (categories without parentId)
        const topLevelCategories = await Category.find({ 
            $or: [
                { parentId: null },
                { parentId: { $exists: false } }
            ]
        });
        
        // Create an array to hold our result with subcategories
        const result = [];
        
        // For each top-level category, find and attach its subcategories
        for (const category of topLevelCategories) {
            // Find all subcategories for this parent category
            const subCategories = await Category.find({ parentId: category._id })
                .select('_id name');  // Select only the fields we want
            
            // Add the category with its subcategories to our result
            result.push({
                _id: category._id,
                name: category.name,
                description: category.description,
                image: category.image,
                isActive: category.isActive,
                subCategories: subCategories,
                slug: category.slug
            });
        }
        
        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error in getAllCategories:', error);
        return res.status(500).json({
            success: false,
            message: 'Error retrieving categories',
            error: error.message
        });
    }
};

// Get a single category by ID
exports.getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.status(200).json({
            success: true,
            data: category
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create a new category
exports.createCategory = async (req, res) => {
    try {
        const newCategory = new Category({
            name: req.body.name,
            parentId: req.body.parentId
        });
        
        const savedCategory = await newCategory.save();
        res.status(201).json({
            success: true,
            data: savedCategory
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Update a category
exports.updateCategory = async (req, res) => {
    try {
        const updatedCategory = await Category.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        );
        
        if (!updatedCategory) {
            return res.status(404).json({ message: 'Category not found' });
        }
        
        res.status(200).json({
            success: true,
            data: updatedCategory
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
    try {
        const deletedCategory = await Category.findByIdAndDelete(req.params.id);
        
        if (!deletedCategory) {
            return res.status(404).json({ message: 'Category not found' });
        }
        
        // You might want to handle subcategories here - either delete them or reassign them
        
        res.status(200).json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get subcategories of a category
exports.getSubCategories = async (req, res) => {
    try {
        const subCategories = await Category.find({ parentId: req.params.id });
        res.status(200).json({
            success: true,
            count: subCategories.length,
            data: subCategories
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
