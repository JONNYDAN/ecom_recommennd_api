const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    code: {
      type: String,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    customerInfo: {
      email: {
        type: String,
      },
      name: {
        type: String,
      },
      phoneNumber: {
        type: String,
      },
      address: {
        type: String,
      },
      province: {
        type: String,
      },
      district: {
        type: String,
      },
      ward: {
        type: String,
      },
    },
    shippingInfo: {
      name: {
        type: String,
      },
      phoneNumber: {
        type: String,
      },
      address: {
        type: String,
      },
      province: {
        type: String,
      },
      district: {
        type: String,
      },
      ward: {
        type: String,
      },
    },
    note: {
      type: String,
    },
    amount: {
      type: Number,
    },
    voucherCode: {
      type: String,
    },
    discountType: {
      type: String,
      enum: ['percent', 'amount'],
    },
    discountValue: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
    },
    shippingType: {
      type: String,
      default: 'cod',
    },
    shippingCost: {
      type: Number,
      default: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['paypal', 'momo', 'qrcode', 'cod'],
      default: 'cod',
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Order', orderSchema);
