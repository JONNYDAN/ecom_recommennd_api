const Product = require('../../models/product_model');
const Order = require('../../models/order');
const OrderItem = require('../../models/order_item');

class DataPreprocessing {
  // Normalize product data
  static async preprocessProductData(products) {
    return products.map(product => ({
      _id: product._id,
      title: product.title,
      category: product.category,
      originalPrice: product.originalPrice,
      salePrice: product.salePrice,
      features: [
        product.category?.name,
        ...product.size || [],
      ]
    }));
  }

  // Create user-product interaction matrix
  static async createUserItemMatrix() {
    const orders = await Order.find()
      .populate('user')
      .populate('orderItems.product');
    
    const userItemMatrix = {};
    
    orders.forEach(order => {
      if (!order.user) return;
      
      if (!userItemMatrix[order.user._id]) {
        userItemMatrix[order.user._id] = {};
      }
      
      order.orderItems.forEach(item => {
        if (!item.product) return;
        
        if (!userItemMatrix[order.user._id][item.product._id]) {
          userItemMatrix[order.user._id][item.product._id] = {
            count: 0,
            rating: 0
          };
        }
        
        userItemMatrix[order.user._id][item.product._id].count += item.quantity;
        // Simple rating calculation based on purchase frequency
        userItemMatrix[order.user._id][item.product._id].rating = 
          Math.min(5, Math.ceil(userItemMatrix[order.user._id][item.product._id].count / 2));
      });
    });
    
    return userItemMatrix;
  }

  static async getUserPurchaseHistory(userId) {
    const orders = await Order.find({ user: userId });
    const orderIds = orders.map(order => order._id);
    
    const orderItems = await OrderItem.find({
      order: { $in: orderIds }
    }).populate('product');
    
    return [...new Set(orderItems.map(item => item.product._id.toString()))];
  }

  static async getProductFeatures(product) {
    return {
      id: product._id.toString(),
      title: product.title || '',
      category: product.category?.toString() || '',
      features: [
        product.category?.toString() || '',
        ...(product.size || []),
        ...(product.title || '').toLowerCase().split(' ')
      ]
    };
  }

  static async getSimilarProducts(productId, topN = 100) {
    const product = await Product.findById(productId).populate('category');
    if (!product) return [];

    const allProducts = await Product.find({ 
      _id: { $ne: productId } 
    }).populate('category');

    const targetFeatures = await this.getProductFeatures(product);
    const otherProducts = await Promise.all(
      allProducts.map(p => this.getProductFeatures(p))
    );

    const similarities = otherProducts.map(otherProduct => {
      const similarity = this.calculateTFIDFSimilarity(
        targetFeatures.features.join(' '),
        otherProduct.features.join(' ')
      );
      return {
        productId: otherProduct.id,
        score: similarity
      };
    });

    return similarities
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }

  static calculateTFIDFSimilarity(text1, text2) {
    const words1 = text1.toLowerCase().split(' ');
    const words2 = text2.toLowerCase().split(' ');
    
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    
    return intersection.length / union.length;
  }

  static async getCategoryProducts(categoryId) {
    return Product.find({ category: categoryId })
      .select('_id')
      .lean();
  }

  static async getRandomProducts(count, excludeIds = []) {
    return Product.aggregate([
      { $match: { _id: { $nin: excludeIds } } },
      { $sample: { size: count } }
    ]);
  }
}

module.exports = DataPreprocessing;