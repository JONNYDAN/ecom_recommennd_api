const Order = require('../../models/order');
const OrderItem = require('../../models/order_item');
const Product = require('../../models/product_model');
const mongoose = require('mongoose');

class CollaborativeFiltering {
  static async getCollaborativeRecommendations(params = {}) {
    try {
      const { userId, productId, limit = 15 } = params;
      const relatedProductScoreMap = {};

      // 1. Lấy lịch sử mua hàng của user
      const userOrders = await Order.find({ user: userId }).distinct('_id');
      const userItems = await OrderItem.find({ order: { $in: userOrders } })
        .populate('product');

      const userProducts = new Map();
      const userCategories = new Set();

      userItems.forEach(item => {
        if (item.product) {
          userProducts.set(item.product._id.toString(), {
            category: item.product.category,
            title: item.product.title.toLowerCase()
          });
          userCategories.add(item.product.category.toString());
        }
      });

      // 2. Tìm similar users dựa trên category và title
      const similarUsers = await Order.aggregate([
        {
          $match: {
            user: { $ne: new mongoose.Types.ObjectId(userId) } // Fixed: Added 'new' keyword
          }
        },
        {
          $lookup: {
            from: 'orderitems',
            localField: '_id',
            foreignField: 'order',
            as: 'items'
          }
        },
        {
          $unwind: '$items'
        },
        {
          $lookup: {
            from: 'products',
            localField: 'items.product',
            foreignField: '_id',
            as: 'productInfo'
          }
        },
        {
          $unwind: '$productInfo'
        },
        {
          $match: {
            'productInfo.category': { 
              $in: Array.from(userCategories).map(cat => new mongoose.Types.ObjectId(cat)) // Fixed: Added 'new' keyword
            }
          }
        },
        {
          $group: {
            _id: '$user',
            commonCategories: { $sum: 1 },
            products: { $addToSet: '$productInfo._id' } // Added: Collect product IDs
          }
        },
        {
          $sort: { commonCategories: -1 }
        },
        {
          $limit: 20
        }
      ]);

      // 3. Lấy sản phẩm từ similar users
      if (similarUsers.length > 0) {
        const similarUsersOrders = await Order.find({
          user: { 
            $in: similarUsers.map(u => u._id)
          }
        }).distinct('_id');

        const similarUsersItems = await OrderItem.find({
          order: { $in: similarUsersOrders }
        }).populate('product');

        // 4. Tính điểm cho các sản phẩm
        similarUsersItems.forEach(item => {
          if (!item.product) return;
          
          const id = item.product._id.toString();
          if (userProducts.has(id)) return;

          let score = 0;
          // Tính điểm category match
          if (userCategories.has(item.product.category.toString())) {
            score += 1.5;
          }

          // Tính điểm title similarity
          for (const [, userProduct] of userProducts) {
            const titleSimilarity = CollaborativeFiltering.calculateTitleSimilarity(
              item.product.title.toLowerCase(),
              userProduct.title
            );
            score += titleSimilarity;
          }

          // Thêm yếu tố ngẫu nhiên nhỏ để tạo đa dạng
          score *= (1 + Math.random() * 0.2);

          relatedProductScoreMap[id] = (relatedProductScoreMap[id] || 0) + score;
        });
      }

      // 5. Nếu không có đề xuất, thêm sản phẩm ngẫu nhiên cùng category
      if (Object.keys(relatedProductScoreMap).length === 0) {
        const randomProducts = await Product.find({
          category: { $in: Array.from(userCategories) },
          _id: { $nin: Array.from(userProducts.keys()) }
        })
          .limit(limit)
          .lean();

        randomProducts.forEach(product => {
          relatedProductScoreMap[product._id.toString()] = Math.random();
        });
      }

      return Object.entries(relatedProductScoreMap)
        .map(([id, score]) => ({ _id: id, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    } catch (error) {
      console.error('Collaborative Filtering Error:', error);
      return [];
    }
  }

  // Helper function để tính similarity giữa các title
  static calculateTitleSimilarity(title1, title2) {
    const words1 = new Set(title1.split(' '));
    const words2 = new Set(title2.split(' '));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size;
  }
}

module.exports = { CollaborativeFiltering };
