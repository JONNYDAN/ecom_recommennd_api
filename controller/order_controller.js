const Order = require('../models/order');
const OrderItem = require('../models/order_item');
const mongoose = require('mongoose');

// Create a new order
exports.createOrder = async (req, res) => {
  try {
    // Generate unique order code
    const orderCount = await Order.countDocuments();
    const orderCode = `ORD${Date.now()}${orderCount}`;
    
    const orderData = {
      ...req.body,
      code: orderCode,
      // user: req.user._id // Assuming authenticated user from middleware
    };
    
    const order = new Order(orderData);
    const savedOrder = await order.save();
    
    return res.status(201).json({
      success: true,
      data: savedOrder
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get all orders with optional filtering
exports.getOrders = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: 'i' } },
        { 'customerInfo.name': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Add user filter if needed (for normal users to see only their orders)
    // if (!req.user.isAdmin) {
    //   filter.user = req.user._id;
    // }
    
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .populate('user', 'name email');
      
    const total = await Order.countDocuments(filter);
    
    return res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get a single order by ID
exports.getOrder = async (req, res) => {
  try {
    const orderId = req.params.id;

    // Validate if the orderId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      });
    }

    // Use aggregation to fetch the order and join with orderItems and product
    const order = await Order.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(orderId) } // Match the order by ID
      },
      {
        $lookup: {
          from: 'orderitems', // The collection to join with
          localField: '_id', // Field from the Order collection
          foreignField: 'order', // Field from the OrderItem collection
          as: 'orderItems' // Output array field
        }
      },
      {
        $unwind: '$orderItems' // Unwind the orderItems array to perform nested lookup
      },
      {
        $lookup: {
          from: 'products', // The collection to join with
          localField: 'orderItems.product', // Field from the OrderItem collection
          foreignField: '_id', // Field from the Product collection
          as: 'orderItems.productDetails' // Output array field
        }
      },
      {
        $unwind: '$orderItems.productDetails' // Unwind the productDetails array
      },
      {
        $group: {
          _id: '$_id', // Group back by order ID
          orderItems: { $push: '$orderItems' }, // Rebuild the orderItems array
          root: { $first: '$$ROOT' } // Keep the original order fields
        }
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ['$root', { orderItems: '$orderItems' }] // Merge the original order fields with the updated orderItems
          }
        }
      }
    ]);

    // Check if the order exists
    if (!order || order.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Populate user details using Mongoose's populate
    const populatedOrder = await Order.populate(order[0], {
      path: 'user',
      select: 'name email' // Select specific fields from the User schema
    });

    // Return the order with orderItems and populated user
    return res.status(200).json({
      success: true,
      data: populatedOrder
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Update order by ID
exports.updateOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Don't allow code to be modified
    if (req.body.code) delete req.body.code;
    
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    
    return res.status(200).json({
      success: true,
      data: updatedOrder
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Delete order by ID
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Only allow admins to delete orders
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this order'
      });
    }
    
    await Order.findByIdAndDelete(req.params.id);
    
    return res.status(200).json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Checkout order with items
exports.checkoutOrder = async (req, res) => {
  try {
    // Validate required fields
    const { user, items, customerInfo, shippingInfo, paymentMethod, amount } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item'
      });
    }
    
    if (!shippingInfo) {
      return res.status(400).json({
        success: false,
        message: 'Shipping information is required'
      });
    }
    
    if (!customerInfo) {
      return res.status(400).json({
        success: false,
        message: 'Customer information is required'
      });
    }
    
    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Payment type is required'
      });
    }
    
    // Validate each item has required fields
    for (const item of items) {
      if (!item.productId || !item.price || !item.quantity) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have productId, price, and quantity'
        });
      }
    }
    
    // Calculate total from items if not provided
    const calculatedTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderTotal = amount || calculatedTotal;
    
    // Generate unique order code
    const orderCount = await Order.countDocuments();
    const orderCode = `ORD${Date.now()}${orderCount}`;
    
    // Create order object
    const orderData = {
      code: orderCode,
      user: user,
      customerInfo,
      shippingInfo,
      paymentMethod,
      amount: orderTotal,
      totalAmount: req.body.totalAmount || orderTotal,
      shippingType: req.body.shippingType || 'cod',
      shippingCost: req.body.shippingCost || 0,
      status: 'pending',
      note: req.body.note || '',
      voucherCode: req.body.voucherCode || null,
      discountType: req.body.discountType || null,
      discountValue: req.body.discountValue || 0
    };
    
    // Create and save the order
    const order = new Order(orderData);
    const savedOrder = await order.save();
    
    // Create order items linked to this order
    const orderItems = [];
    for (const item of items) {
      const orderItem = new OrderItem({
        order: savedOrder._id,
        product: item.productId,
        quantity: item.quantity,
        price: item.price
      });
      
      const savedOrderItem = await orderItem.save();
      orderItems.push(savedOrderItem);
    }
    
    // Return the order with its items
    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        ...savedOrder.toObject(),
        orderItems
      }
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
