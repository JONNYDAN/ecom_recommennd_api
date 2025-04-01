const express = require('express');
const router = express.Router();
const productController = require('../controller/product_controller');

router.get('/', productController.getProducts);

router.post('/', productController.upload.array("images", 10), productController.createProduct);

router.get('/:idOrSlug', productController.getProduct);

router.put('/:id', productController.upload.array("images", 10), productController.updateProduct);

router.delete('/:id', productController.deleteProduct);

router.get('/:id/feedback', productController.getProductFeedback);

router.post('/:id/feedback', productController.addProductFeedback);

module.exports = router;