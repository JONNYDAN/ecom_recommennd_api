const express = require('express');
const router = express.Router();
const recommendationController = require('../controller/recommendationController');

router.get('/', recommendationController.getHomeRecommendations);
router.get('/user/:userId', recommendationController.getUserRecommendations);
router.get('/product/:productId', recommendationController.getProductRecommendations);
router.get('/user/:userId/product/:productId', recommendationController.getHybridRecommendations);

module.exports = router;