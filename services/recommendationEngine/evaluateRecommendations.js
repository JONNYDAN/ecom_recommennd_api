const mongoose = require('mongoose');
const fs = require('fs');
const { Parser } = require('json2csv');
const stringSimilarity = require('string-similarity');
require('dotenv').config();

const Order = require('../../models/order');
const OrderItem = require('../../models/order_item');
const RecommendationLog = require('../../models/recommendation_log_model');
const Product = require('../../models/product_model');

const MONGODB_URI = process.env.MONGODB_URL;

if (!MONGODB_URI) {
  console.error('MongoDB connection string is not defined in environment variables');
  process.exit(1);
}

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

const db = mongoose.connection;

function precisionAtK(recommended, purchased, k = 5) {
  const topK = recommended.slice(0, k);
  const hits = topK.filter(pid => purchased.includes(pid));
  return hits.length / k;
}

function recallAtK(recommended, purchased, k = 5) {
  const topK = recommended.slice(0, k);
  const hits = topK.filter(pid => purchased.includes(pid));
  return purchased.length === 0 ? 0 : hits.length / purchased.length;
}

const normalize = str => str?.toLowerCase().trim() || '';

const isTitleSimilar = (titleA, titleB) => {
  return stringSimilarity.compareTwoStrings(normalize(titleA), normalize(titleB)) > 0.7;
};

// Thêm các hàm tính toán metrics mới
function ndcgAtK(recommended, purchased, k = 5) {
  const topK = recommended.slice(0, k);
  
  // Tính DCG
  let dcg = 0;
  for (let i = 0; i < topK.length; i++) {
    if (purchased.includes(topK[i])) {
      // Sử dụng log2(i + 2) vì i bắt đầu từ 0
      dcg += 1 / Math.log2(i + 2);
    }
  }

  // Tính IDCG
  const idealRanking = new Array(Math.min(k, purchased.length)).fill(1);
  let idcg = 0;
  for (let i = 0; i < idealRanking.length; i++) {
    idcg += 1 / Math.log2(i + 2);
  }

  return idcg === 0 ? 0 : dcg / idcg;
}

function mapAtK(recommended, purchased, k = 5) {
  const topK = recommended.slice(0, k);
  let sum = 0;
  let hits = 0;
  
  for (let i = 0; i < topK.length; i++) {
    if (purchased.includes(topK[i])) {
      hits++;
      sum += hits / (i + 1);
    }
  }
  
  return topK.length === 0 ? 0 : sum / topK.length;
}

function f1ScoreAtK(precision, recall) {
  if (precision === 'N/A' || recall === 'N/A') return 'N/A';
  const p = parseFloat(precision);
  const r = parseFloat(recall);
  return (p + r === 0) ? 0 : (2 * p * r / (p + r)).toFixed(2);
}

async function evaluate() {
  try {
    await new Promise((resolve) => {
      if (db.readyState === 1) {
        resolve();
      } else {
        db.once('open', resolve);
      }
    });

    const logs = await RecommendationLog.find({}).lean();
    const results = [];

    for (const log of logs) {
      const userId = log.userId?.toString() || 'anonymous';
      const isAnonymous = !log.userId;
      const predictions = log.predictions?.map(p => p.toString()) || [];
      const targetProductId = log.productId?.toString() || '';

      if (predictions.length === 0) continue;

      const userOrders = isAnonymous ? [] : await Order.find({ user: log.userId }).lean();
      const orderIds = userOrders.map(o => o._id);
      const purchasedItems = await OrderItem.find({ order: { $in: orderIds } }).lean();
      const purchasedProductIds = purchasedItems.map(item => item.product.toString());

      const purchasedProducts = await Product.find({ _id: { $in: purchasedProductIds } }).lean();
      const viewedProduct = targetProductId ? await Product.findById(targetProductId).lean() : null;
      const recommendedProducts = await Product.find({ _id: { $in: predictions } }).lean();

      const purchasedCategories = new Set(purchasedProducts.map(p => p.category?.toString()));
      const purchasedTitles = purchasedProducts.map(p => normalize(p.title));

      const isRelevant = (recProd) => {
        const recCategory = recProd.category?.toString();
        const recTitle = normalize(recProd.title);

        const inSameCategory = purchasedCategories.has(recCategory);
        const titleMatch = purchasedTitles.some(title => isTitleSimilar(title, recTitle));
        const viewedMatch = viewedProduct && (
          recCategory === viewedProduct.category?.toString() ||
          isTitleSimilar(viewedProduct.title, recTitle)
        );

        return inSameCategory || titleMatch || viewedMatch;
      };

      const relevantRecommendations = recommendedProducts
        .filter(p => isRelevant(p))
        .map(p => p._id.toString());

      const precision = precisionAtK(predictions, relevantRecommendations, 5).toFixed(2);
      const recall = recallAtK(predictions, relevantRecommendations, 5).toFixed(2);
      const ndcg = ndcgAtK(predictions, relevantRecommendations, 5).toFixed(2);
      const map = mapAtK(predictions, relevantRecommendations, 5).toFixed(2);
      const f1Score = f1ScoreAtK(precision, recall);


      // 🐞 Ghi log để kiểm tra
      console.log('---');
      console.log('User:', userId, isAnonymous ? '(anonymous)' : '');
      console.log('Viewed Product:', viewedProduct?.title);
      console.log('Purchased Titles:', purchasedTitles);
      console.log('Predicted Titles:', recommendedProducts.map(p => p.title));
      console.log('Matched Relevant:', relevantRecommendations.length);
      console.log('Precision@5:', precision, '| Recall@5:', recall);
      console.log('NDCG@5:', ndcg, '| MAP@5:', map, '| F1@5:', f1Score);

      results.push({
        userId,
        isAnonymous,
        productId: targetProductId,
        predictionCount: predictions.length,
        purchasedCount: purchasedProductIds.length,
        matchedRelevant: relevantRecommendations.length,
        precisionAt5: precision,
        recallAt5: recall,
        ndcgAt5: ndcg,
        mapAt5: map,
        f1ScoreAt5: f1Score,
        createdAt: log.createdAt
      });
    }

    const parser = new Parser();
    const csv = parser.parse(results);
    fs.writeFileSync('recommendation_evaluation.csv', csv);
    console.log('✅ Đã lưu file: recommendation_evaluation.csv');
  } catch (err) {
    console.error('Lỗi đánh giá:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}


evaluate().catch(console.error);
