const mongoose = require('mongoose');

const userPointsRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  pointsProductId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PointsProduct'
  },
  productVoucherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductVoucher'
  },
  points: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['exchange', 'earn', 'deduct'],
    default: 'exchange'
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'completed'
  }
}, {
  timestamps: true
});

userPointsRecordSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('UserPointsRecord', userPointsRecordSchema);
