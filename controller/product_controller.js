const Product = require('../models/product_model');
const Category = require('../models/category_model'); // Import the Category model
const ProductFeedback = require('../models/product_feedback_model');
const multer = require('multer');
const path = require('path');

// Cấu hình lưu file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/"); // Lưu ảnh vào thư mục public/uploads
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Tạo tên file duy nhất
  },
});

// Khởi tạo Multer với cấu hình
exports.upload = multer({ storage: storage });

// Get all products
exports.getProducts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10,
      category,
      // Add other possible filters
      sort = '-createdAt' 
    } = req.query;
    
    // Convert page and limit to numbers
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Build filter object
    const filter = {};
    
    // Handle category filtering with child categories
    if (category) {
      // First find the parent category by slug
      const parentCategory = await Category.findOne({ slug: category });
      
      if (parentCategory) {
        // Get all categories (for finding children)
        const allCategories = await Category.find();
        
        // Start with the parent category ID
        const categoryIds = [parentCategory._id];
        
        // Find all child categories
        const findChildCategories = (parentId) => {
          allCategories.forEach(cat => {
            // Check if this category has the current parent as a parent
            if (cat.parent && cat.parent.toString() === parentId.toString()) {
              categoryIds.push(cat._id);
              // Recursively find children of this child
              findChildCategories(cat._id);
            }
          });
        };
        
        // Find all children of the parent category
        findChildCategories(parentCategory._id);
        
        // Filter products by the collected category IDs
        filter.category = { $in: categoryIds };
      }
    }
    
    // Get filtered products with pagination
    const products = await Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum);
    
    // Get total count for pagination
    const total = await Product.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get single product by ID or slug
exports.getProduct = async (req, res) => {
  try {
    const query = {};
    if (req.params.idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
      query._id = req.params.idOrSlug;
    } else {
      query.slug = req.params.idOrSlug;
    }

    const product = await Product.findOne(query);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Create new product
exports.createProduct = async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const images = req.files ? req.files.map(file => `${baseUrl}/uploads/${file.filename}`) : [];

  try {
    const productData = {
      ...req.body,
      images
    };

    // Ensure size is an array
    if (typeof productData.size === 'string') {
      productData.size = JSON.parse(productData.size);
    }

    const product = new Product(productData);
    await product.save();

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Product with this code or slug already exists'
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const images = req.files ? req.files.map(file => `${baseUrl}/uploads/${file.filename}`) : [];

  try {
    const existingImages = req.body.existingImages ? JSON.parse(req.body.existingImages) : [];
    const productData = {
      ...req.body,
      images: [...existingImages, ...images]
    };

    // Ensure size is an array
    if (typeof productData.size === 'string') {
      productData.size = JSON.parse(productData.size);
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      productData,
      {
        new: true,
        runValidators: true
      }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get all feedback for a specific product
exports.getProductFeedback = async (req, res) => {
  try {
    console.log(1)
    const { id } = req.params;
    
    // Check if product exists
    const productExists = await Product.exists({ _id: id });
    
    if (!productExists) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    const feedback = await ProductFeedback.find({ product: id }).sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: feedback.length,
      data: feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Add feedback for a specific product
exports.addProductFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerName, email, rating, feedback } = req.body;
    
    // Check if product exists
    const productExists = await Product.exists({ _id: id });
    
    if (!productExists) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    // Validate required fields
    if (!customerName || !email || !rating || !feedback) {
      return res.status(400).json({
        success: false,
        error: 'Please provide customerName, email, rating and feedback'
      });
    }
    
    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5'
      });
    }
    
    // Create feedback
    const newFeedback = await ProductFeedback.create({
      product: id,
      customerName,
      email,
      rating,
      feedback
    });
    
    res.status(201).json({
      success: true,
      data: newFeedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};