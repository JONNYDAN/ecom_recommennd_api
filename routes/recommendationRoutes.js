const { 
    getItemBasedRecommendations,
    getContentBasedRecommendations 
  } = require('../services/recommendationEngine');
  
  exports.getRecommendations = async (req, res) => {
    try {
      const { userId, productId } = req.query;
      let recommendations;
      
      // 1. Item-based recommendations (sản phẩm tương tự)
      if (productId) {
        recommendations = await getItemBasedRecommendations(productId, 10);
        
        // Nếu không đủ kết quả, bổ sung bằng content-based
        if (recommendations.length < 5) {
          const contentBasedRecs = await getContentBasedRecommendations(productId, 5 - recommendations.length);
          recommendations = [...recommendations, ...contentBasedRecs];
        }
      } 
      // 2. User-based recommendations (gợi ý cá nhân hóa)
      else if (userId) {
        // Kiểm tra user có đủ lịch sử tương tác không
        const interactionCount = await UserInteraction.countDocuments({ userId });
        
        if (interactionCount >= 5) { // Đủ dữ liệu cho CF
          recommendations = await getUserBasedRecommendations(userId, 10);
          
          // Hybrid: Kết hợp với popular items
          if (recommendations.length < 10) {
            const popularItems = await getPopularItems(10 - recommendations.length);
            recommendations = [...recommendations, ...popularItems];
          }
        } else { // User mới (cold-start)
          // Phương án 1: Dùng popular items trong danh mục user quan tâm
          const userCategories = await getUserPreferredCategories(userId);
          recommendations = await getPopularItemsByCategories(userCategories, 10);
          
          // Phương án 2: Fallback về trending items
          if (recommendations.length === 0) {
            recommendations = await getTrendingItems(10);
          }
        }
      } 
      // 3. Fallback (khách vãng lai)
      else {
        // Ưu tiên trending items có rating cao
        recommendations = await getTrendingItemsWithHighRating(10);
        
        // Dự phòng nếu vẫn không có
        if (recommendations.length === 0) {
          recommendations = await Product.find()
            .sort({ createdAt: -1 })
            .limit(10);
        }
      }
  
      // Xáo trộn kết quả để tránh lặp lại
      recommendations = shuffleArray(recommendations);
      
      // Giới hạn số lượng cuối cùng
      recommendations = recommendations.slice(0, 10);
      
      // Loại bỏ sản phẩm đã hết hàng
      recommendations = recommendations.filter(p => p.stock > 0);
  
      res.json(recommendations);
    } catch (error) {
      console.error('Recommendation error:', error);
      // Fallback an toàn
      const fallback = await Product.find({ stock: { $gt: 0 } })
        .sort({ salesCount: -1 })
        .limit(10);
      res.json(fallback);
    }
  };
  
  // Các hàm hỗ trợ
  async function getUserBasedRecommendations(userId, limit) {
    // Triển khai user-based collaborative filtering
    const userInteractions = await UserInteraction.find({ userId });
    
    // Lấy các sản phẩm đã tương tác
    const interactedProductIds = userInteractions.map(i => i.productId);
    
    // Tìm user tương đồng
    const similarUsers = await findSimilarUsers(userId);
    
    // Lấy sản phẩm từ user tương đồng
    const recommendations = [];
    for (const similarUser of similarUsers) {
      const items = await UserInteraction.find({
        userId: similarUser._id,
        productId: { $nin: interactedProductIds },
        interactionType: 'purchase'
      }).limit(limit);
      
      recommendations.push(...items);
      if (recommendations.length >= limit) break;
    }
    
    return Product.find({
      _id: { $in: recommendations.map(i => i.productId) }
    }).limit(limit);
  }
  
  async function getContentBasedRecommendations(productId, limit) {
    const product = await Product.findById(productId);
    const similarProducts = await Product.find({
      $or: [
        { category: product.category },
        { tags: { $in: product.tags } },
        { brand: product.brand }
      ],
      _id: { $ne: productId }
    })
    .sort({ rating: -1, salesCount: -1 })
    .limit(limit);
    
    return similarProducts;
  }
  
  async function getPopularItems(limit) {
    return Product.aggregate([
      { $match: { stock: { $gt: 0 } } },
      { $sort: { salesCount: -1 } },
      { $limit: limit }
    ]);
  }
  
  async function getTrendingItems(limit) {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    return Product.aggregate([
      {
        $lookup: {
          from: 'userinteractions',
          localField: '_id',
          foreignField: 'productId',
          as: 'interactions'
        }
      },
      {
        $addFields: {
          recentInteractions: {
            $filter: {
              input: '$interactions',
              as: 'interaction',
              cond: { $gt: ['$$interaction.timestamp', oneWeekAgo] }
            }
          }
        }
      },
      { $sort: { 'recentInteractions': -1 } },
      { $limit: limit }
    ]);
  }
  
  // Helper function
  function shuffleArray(array) {
    return array.sort(() => Math.random() - 0.5);
  }