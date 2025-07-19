const mongoose = require('mongoose');
const { CollaborativeFiltering } = require('./collaborativeFiltering');
const ContentBasedFiltering = require('./contentBased');
const Product = require('../../models/product_model');
const RecommendationLog = require('../../models/recommendation_log_model');

class HybridRecommendation {
  static async getRecommendations(userId, productId = null, limit = 10) {
    try {
      let recommendations = [];
      const existingIds = new Set();

      // 1. Content-Based Filtering (Top 4)
      if (productId) {
        const contentRecs = await ContentBasedFiltering.getContentBasedRecommendations(
          productId, Math.max(limit, 8)
        );
        const top4 = contentRecs.slice(0, 4).map(p => p.toString());
        recommendations.push(...top4);
        top4.forEach(id => existingIds.add(id));
      }

      // 2. Complementary Products
      if (productId && recommendations.length < limit) {
        const product = await Product.findById(productId);
        if (product) {
          const complementary = await Product.find({
            category: product.category,
            _id: {
              $nin: [...existingIds, product._id].map(id => new mongoose.Types.ObjectId(id))
            }
          })
            .sort({ salesCount: -1, rating: -1 })
            .limit(4);

          const compIds = complementary.map(p => p._id.toString()).slice(0, 2);
          recommendations.push(...compIds);
          compIds.forEach(id => existingIds.add(id));
        }
      }

      // 3. Collaborative Filtering
      if (userId && recommendations.length < limit) {
        const collaborativeRecs = await CollaborativeFiltering.getCollaborativeRecommendations(
          productId, userId
        );

        const filtered = collaborativeRecs
          .map(p => p.toString())
          .filter(id => !existingIds.has(id))
          .slice(0, Math.min(3, limit - recommendations.length));

        recommendations.push(...filtered);
        filtered.forEach(id => existingIds.add(id));
      }

      // 4. Trending Products
      if (recommendations.length < limit) {
        const trending = await Product.find({
          _id: { $nin: Array.from(existingIds).map(id => new mongoose.Types.ObjectId(id)) }
        })
          .sort({ salesCount: -1, rating: -1, createdAt: -1 })
          .limit(limit - recommendations.length);

        const trendIds = trending.map(p => p._id.toString());
        recommendations.push(...trendIds);
      }

      // Smart shuffle (giữ top 2 cố định)
      if (recommendations.length > 2) {
        const top = recommendations.slice(0, 2);
        const rest = this.smartShuffle(recommendations.slice(2));
        recommendations = [...top, ...rest];
      }

      const finalRecommendations = recommendations.slice(0, limit);

      //Save log to database
      await RecommendationLog.create({
        userId: userId || null,
        productId: productId || null,
        predictions: finalRecommendations
      });

      return recommendations.slice(0, limit);
    } catch (error) {
      console.error('Error in hybrid recommendations:', error);
      return [];
    }
  }

  static async getUserHybridRecommendations({ userId, purchaseHistory, limit = 15, page = 1 }) {
    try {
      const recommendationScores = {};
      const seenCategories = new Set();
      const seenTitles = new Set();

      // 1. Content-based từ lịch sử mua hàng
      for (const productId of purchaseHistory) {
        const product = await Product.findById(productId);
        if (!product) continue;

        seenCategories.add(product.category.toString());
        seenTitles.add(product.title.toLowerCase());

        const contentRecs = await ContentBasedFiltering.getContentBasedRecommendations(
          productId,
          limit * 2
        );

        contentRecs.forEach(rec => {
          const id = rec._id.toString();
          if (!purchaseHistory.includes(id)) {
            recommendationScores[id] = (recommendationScores[id] || 0) + 2;
          }
        });
      }

      // 2. Collaborative recommendations
      const collaborativeRecs = await CollaborativeFiltering.getCollaborativeRecommendations({
        userId,
        limit: limit * 2
      });

      collaborativeRecs.forEach(rec => {
        const id = rec._id.toString();
        if (!purchaseHistory.includes(id)) {
          recommendationScores[id] = (recommendationScores[id] || 0) + rec.score;
        }
      });

      // 3. Thêm sản phẩm liên quan (dynamic ranking)
      const relatedProducts = await Product.find({
        $or: [
          { category: { $in: Array.from(seenCategories) } },
          {
            title: {
              $regex: Array.from(seenTitles)
                .map(title => title.split(' ').filter(w => w.length > 3).join('|'))
                .join('|'),
              $options: 'i'
            }
          }
        ],
        _id: { 
          $nin: [...purchaseHistory, ...Object.keys(recommendationScores)]
        }
      }).limit(limit);

      relatedProducts.forEach(product => {
        const id = product._id.toString();
        // Thêm điểm ngẫu nhiên để tạo tính động
        recommendationScores[id] = (Math.random() * 0.5) + 0.5; 
      });

      // 4. Sắp xếp và phân trang
      const sortedRecs = Object.entries(recommendationScores)
        .map(([id, score]) => ({ 
          _id: id, 
          score: score * (1 + Math.random() * 0.2) // Thêm yếu tố ngẫu nhiên
        }))
        .sort((a, b) => b.score - a.score)
        .slice((page - 1) * limit, page * limit);

      // 5. Lưu log recommendations
      await RecommendationLog.create({
        userId,
        recommendationType: 'hybrid',
        predictions: sortedRecs.map(rec => rec._id),
        timestamp: new Date()
      });

      return sortedRecs;

    } catch (error) {
      console.error('Error in user hybrid recommendations:', error);
      return [];
    }
  }

  static smartShuffle(array) {
    return array
      .map(value => ({
        value,
        sort: Math.random() * (array.length - array.indexOf(value))
      }))
      .sort((a, b) => b.sort - a.sort)
      .map(({ value }) => value);
  }
}

module.exports = HybridRecommendation;
