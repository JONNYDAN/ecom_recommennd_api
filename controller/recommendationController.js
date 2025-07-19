const HybridRecommendation = require('../services/recommendationEngine/hybridModel');
const Product = require('../models/product_model');
const DataPreprocessing = require('../services/recommendationEngine/dataPreprocessing');
const RecommendationLog = require('../models/recommendation_log_model');
const mongoose = require('mongoose');

// Lấy recommendations cho người dùng hoặc sản phẩm
// GET /api/recommendations?userId=123&productId=456&limit=10
// userId: ID của người dùng (nếu có)
// productId: ID của sản phẩm (nếu có)
// limit: số lượng sản phẩm gợi ý tối đa
// Nếu không có userId và productId, trả về lỗi
// Nếu có cả userId và productId, sử dụng cả hai để gợi ý
// Nếu chỉ có userId, sử dụng gợi ý dựa trên người dùng
// Nếu chỉ có productId, sử dụng gợi ý dựa trên sản phẩm
exports.getRecommendations = async (req, res) => {
  try {
    const { userId, productId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Get recommendations with metadata
    const { recommendations: allRecommendedProductIds, metadata } = 
      await HybridRecommendation.getRecommendations(userId, productId);

    // Tính toán phân trang
    const total = allRecommendedProductIds.length;
    const pages = Math.ceil(total / limit);
    const paginatedProductIds = allRecommendedProductIds.slice(skip, skip + limit);

    // Lấy thông tin chi tiết sản phẩm cho trang hiện tại
    const recommendations = await Product.find({
      _id: { $in: paginatedProductIds }
    })
      .populate('category')
      .lean();

    // Nếu là đề xuất theo user, thêm lịch sử mua hàng
    let purchaseHistory = [];
    if (userId) {
      const userHistoryIds = await DataPreprocessing.getUserPurchaseHistory(userId);
      purchaseHistory = await Product.find({
        _id: { $in: userHistoryIds.slice(0, 5) } // Giới hạn 5 sản phẩm
      })
        .populate('category')
        .lean();
    }

    // Log recommendations only once here
    if (metadata) {
      await RecommendationLog.create({
        userId: metadata.userId,
        productId: metadata.productId,
        recommendationType: metadata.recommendationType,
        predictions: paginatedProductIds.map(id => new mongoose.Types.ObjectId(id)),
        timestamp: metadata.timestamp
      });
    }

    return res.status(200).json({
      success: true,
      data: recommendations,
      pagination: {
        total,
        page,
        limit,
        pages
      },
      ...(userId && { purchaseHistory }) // Chỉ thêm nếu có userId
    });
  } catch (error) {
    console.error('Recommendation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi lấy danh sách đề xuất'
    });
  }
};

// Home page: new + popular + random shuffle
// Home page recommendations
exports.getHomeRecommendations = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;

    const newProducts = await Product.find().sort({ createdAt: -1 }).limit(limit * 2).populate('category').lean();
    const popularProducts = await Product.find().sort({ salesCount: -1 }).limit(limit * 2).populate('category').lean();
    
    let combined = [...newProducts, ...popularProducts];
    // Remove duplicates and shuffle
    combined = Array.from(new Map(combined.map(item => [item._id.toString(), item])).values());
    combined = shuffleArray(combined).slice(0, limit);

    return res.status(200).json({ 
      success: true,
      count: combined.length,
      data: combined,
      pagination: {
        total: combined.length,
        page: 1,
        limit,
        pages: 1
      }
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// User-based: collaborative + shuffle + fallback
exports.getUserRecommendations = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 15;
    const page = parseInt(req.query.page) || 1;

    // 1. Lấy lịch sử mua hàng của user
    const userHistory = await DataPreprocessing.getUserPurchaseHistory(userId);
    
    // 2. Kết hợp recommendations từ content-based và collaborative
    const recommendations = await HybridRecommendation.getUserHybridRecommendations({
      userId,
      purchaseHistory: userHistory,
      limit,
      page
    });

    // 3. Lấy chi tiết sản phẩm
    const products = await Product.find({
      _id: { $in: recommendations.map(rec => rec._id) }
    }).populate('category');

    // 4. Sắp xếp theo score từ recommendations
    const sortedProducts = recommendations.map(rec => 
      products.find(p => p._id.toString() === rec._id.toString())
    ).filter(Boolean);

    return res.status(200).json({
      success: true,
      data: sortedProducts,
      pagination: {
        page,
        limit,
        total: recommendations.length
      }
    });
  } catch (error) {
    console.error('User recommendations error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Product-based: content-based + shuffle + fallback
exports.getProductRecommendations = async (req, res) => {
  try {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    // Get recommendations without shuffling first
    let recIds = await HybridRecommendation.getRecommendations(null, productId, limit);
    
    // Get products while preserving the ranking order
    const products = await Product.find({ _id: { $in: recIds } }).populate('category');
    
    // Maintain original order from recIds
    const recommendations = recIds.map(id => 
      products.find(p => p._id.toString() === id.toString())
    ).filter(Boolean); // Remove any undefined if products not found
    
    return res.status(200).json({ 
      success: true, 
      data: recommendations,
      meta: {
        similarCount: Math.min(4, recommendations.length),
        complementaryCount: Math.min(2, Math.max(0, recommendations.length - 4))
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Hybrid: user + product + shuffle + fallback
exports.getHybridRecommendations = async (req, res) => {
  try {
    const { userId, productId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    let recIds = await HybridRecommendation.getRecommendations(userId, productId, limit);
    recIds = shuffleArray(recIds);
    const recommendations = await Product.find({ _id: { $in: recIds } }).populate('category');
    return res.status(200).json({ success: true, data: recommendations });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Helper shuffle function
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}