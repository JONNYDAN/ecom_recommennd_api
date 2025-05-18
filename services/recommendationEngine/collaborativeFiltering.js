const { UserInteraction, Product } = require('../../../models');

async function getItemBasedRecommendations(productId, limit = 5) {
  const interactions = await UserInteraction.find({ productId });
  
  const userIds = [...new Set(interactions.map(i => i.userId))];
  const userInteractions = await UserInteraction.find({ 
    userId: { $in: userIds } 
  });
  
  const productCounts = {};
  userInteractions.forEach(interaction => {
    if (interaction.productId.toString() !== productId.toString()) {
      productCounts[interaction.productId] = (productCounts[interaction.productId] || 0) + 1;
    }
  });
  
  const sortedProducts = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
    
  return Product.find({ _id: { $in: sortedProducts } });
}

module.exports = { getItemBasedRecommendations };