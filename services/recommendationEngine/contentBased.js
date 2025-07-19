const DataPreprocessing = require('./dataPreprocessing');
const Product = require('../../models/product_model');

class ContentBasedFiltering {
  static calculateSimilarity(product1, product2) {
    // 1. Category similarity (50% weight)
    const categoryMatch = product1.category.equals(product2.category) ? 1 : 0;
    
    // 2. Title similarity using Jaccard (30% weight)
    const titleWords1 = new Set(product1.title.toLowerCase().split(/[\s\-]+/));
    const titleWords2 = new Set(product2.title.toLowerCase().split(/[\s\-]+/));
    const intersection = new Set([...titleWords1].filter(x => titleWords2.has(x)));
    const union = new Set([...titleWords1, ...titleWords2]);
    const titleSimilarity = intersection.size / union.size;
    
    // 3. Feature similarity (20% weight)
    const features1 = new Set(product1.features || []);
    const features2 = new Set(product2.features || []);
    const featureSimilarity = features1.size > 0 && features2.size > 0 
      ? intersection.size / union.size 
      : 0;
    
    return (0.5 * categoryMatch) + (0.3 * titleSimilarity) + (0.2 * featureSimilarity);
  }

  static async getContentBasedRecommendations(productId, limit = 10) {
    const product = await Product.findById(productId).populate('category');
    if (!product) return [];

    const allProducts = await Product.find({ _id: { $ne: productId } })
      .populate('category');
    
    const processedProducts = await DataPreprocessing.preprocessProductData([
      product,
      ...allProducts
    ]);
    
    const targetProduct = processedProducts[0];
    const otherProducts = processedProducts.slice(1);
    
    const similarities = otherProducts.map(otherProduct => ({
      product: otherProduct._id,
      similarity: this.calculateSimilarity(targetProduct, otherProduct)
    }));
    
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => item.product);
  }
}

module.exports = ContentBasedFiltering;