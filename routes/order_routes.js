const express = require('express');
const router = express.Router();
const orderController = require('../controller/order_controller');
const { authenticate, isAdmin } = require('../middlewares/auth_middleware'); // Assuming auth middleware exists

/**
 * @swagger
 * tags:
 *   - name: Orders
 *     description: Order management endpoints
 *
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the order
 *         code:
 *           type: string
 *           description: Order code/number
 *         user:
 *           type: string
 *           description: ID of the user who placed the order
 *         customerInfo:
 *           type: object
 *           properties:
 *             email:
 *               type: string
 *               description: Customer's email
 *             name:
 *               type: string
 *               description: Customer's name
 *             phoneNumber:
 *               type: string
 *               description: Customer's phone number
 *             address:
 *               type: string
 *               description: Customer's address
 *             province:
 *               type: string
 *               description: Customer's province/state
 *             district:
 *               type: string
 *               description: Customer's district/city
 *             ward:
 *               type: string
 *               description: Customer's ward/neighborhood
 *         shippingInfo:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               description: Recipient's name
 *             phoneNumber:
 *               type: string
 *               description: Recipient's phone number
 *             address:
 *               type: string
 *               description: Shipping address
 *             province:
 *               type: string
 *               description: Shipping province/state
 *             district:
 *               type: string
 *               description: Shipping district/city
 *             ward:
 *               type: string
 *               description: Shipping ward/neighborhood
 *         note:
 *           type: string
 *           description: Additional notes for the order
 *         amount:
 *           type: number
 *           description: Total amount before discounts
 *         voucherCode:
 *           type: string
 *           description: Voucher/coupon code applied
 *         discountType:
 *           type: string
 *           enum: [percent, amount]
 *           description: Type of discount (percentage or fixed amount)
 *         discountValue:
 *           type: number
 *           description: Value of the discount
 *         finalAmount:
 *           type: number
 *           description: Final amount after discounts
 *         shippingType:
 *           type: string
 *           description: Type of shipping
 *           default: cod
 *         shippingCost:
 *           type: number
 *           description: Cost of shipping
 *           default: 0
 *         paymentType:
 *           type: string
 *           enum: [paypal, momo, qrcode, cod]
 *           description: Payment method
 *           default: cod
 *         status:
 *           type: string
 *           enum: [pending, processing, shipped, delivered, cancelled]
 *           description: Status of the order
 *           default: pending
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         _id: "60d21b4667d0d8992e610c86"
 *         code: "ORD-12345"
 *         user: "60d21b4667d0d8992e610c85"
 *         customerInfo:
 *           email: "customer@example.com"
 *           name: "John Doe"
 *           phoneNumber: "0987654321"
 *           address: "123 Main St"
 *           province: "Ho Chi Minh City"
 *           district: "District 1"
 *           ward: "Ben Nghe"
 *         shippingInfo:
 *           name: "John Doe"
 *           phoneNumber: "0987654321"
 *           address: "123 Main St"
 *           province: "Ho Chi Minh City"
 *           district: "District 1"
 *           ward: "Ben Nghe"
 *         note: "Please deliver in the afternoon"
 *         amount: 300000
 *         voucherCode: "SUMMER10"
 *         discountType: "percent"
 *         discountValue: 10
 *         finalAmount: 270000
 *         shippingType: "cod"
 *         shippingCost: 20000
 *         paymentType: "cod"
 *         status: "pending"
 *         createdAt: "2023-01-15T12:34:56Z"
 *         updatedAt: "2023-01-15T12:34:56Z"
 */

// // All order routes require authentication
// router.use(authenticate);

/**
 * @swagger
 * /api/orders/checkout:
 *   post:
 *     summary: Process checkout and create a new order
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 description: Order code/number (optional)
 *               user:
 *                 type: string
 *                 description: User ID (optional if guest checkout)
 *               customerInfo:
 *                 type: object
 *                 required: true
 *                 properties:
 *                   email:
 *                     type: string
 *                     required: true
 *                   name:
 *                     type: string
 *                     required: true
 *                   phoneNumber:
 *                     type: string
 *                     required: true
 *                   address:
 *                     type: string
 *                     required: true
 *                   province:
 *                     type: string
 *                     required: true
 *                   district:
 *                     type: string
 *                     required: true
 *                   ward:
 *                     type: string
 *                     required: true
 *               shippingInfo:
 *                 type: object
 *                 required: true
 *                 properties:
 *                   name:
 *                     type: string
 *                     required: true
 *                   phoneNumber:
 *                     type: string
 *                     required: true
 *                   address:
 *                     type: string
 *                     required: true
 *                   province:
 *                     type: string
 *                     required: true
 *                   district:
 *                     type: string
 *                     required: true
 *                   ward:
 *                     type: string
 *                     required: true
 *               note:
 *                 type: string
 *                 description: Additional notes for the order
 *               amount:
 *                 type: number
 *                 required: true
 *                 description: Total amount before discounts
 *               voucherCode:
 *                 type: string
 *                 description: Voucher/coupon code to apply
 *               discountType:
 *                 type: string
 *                 enum: [percent, amount]
 *                 description: Type of discount
 *               discountValue:
 *                 type: number
 *                 description: Value of the discount
 *               finalAmount:
 *                 type: number
 *                 required: true
 *                 description: Final amount after discounts
 *               shippingType:
 *                 type: string
 *                 description: Type of shipping
 *                 default: cod
 *               shippingCost:
 *                 type: number
 *                 description: Cost of shipping
 *                 default: 0
 *               paymentType:
 *                 type: string
 *                 enum: [paypal, momo, qrcode, cod]
 *                 description: Payment method
 *                 default: cod
 *               status:
 *                 type: string
 *                 enum: [pending, processing, shipped, delivered, cancelled]
 *                 description: Status of the order
 *                 default: pending
 *             required:
 *               - customerInfo
 *               - shippingInfo
 *               - amount
 *               - finalAmount
 *     responses:
 *       200:
 *         description: Checkout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post("/checkout", orderController.checkoutOrder);

router.post('/', orderController.createOrder);
router.get('/', orderController.getOrders);
router.get('/:id', orderController.getOrder);
router.put('/:id', orderController.updateOrder);
router.delete('/:id', orderController.deleteOrder);

module.exports = router;
