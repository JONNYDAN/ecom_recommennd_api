const express = require('express');
const router = express.Router();
const orderController = require('../controller/order_controller');
const { authenticate, isAdmin } = require('../middlewares/auth_middleware'); // Assuming auth middleware exists


router.post("/checkout", orderController.checkoutOrder);

router.post('/', orderController.createOrder);
router.get('/', orderController.getOrders);
router.get('/:id', orderController.getOrder);
router.put('/:id', orderController.updateOrder);
router.delete('/:id', orderController.deleteOrder);

module.exports = router;
