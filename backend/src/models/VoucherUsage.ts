import { Schema, model } from 'mongoose'
import * as env from '../config/env.config'

const voucherUsageSchema = new Schema<env.VoucherUsage>(
  {
    voucher: {
      type: Schema.Types.ObjectId,
      required: [true, "can't be blank"],
      ref: 'Voucher',
      index: true,
    },
    booking: {
      type: Schema.Types.ObjectId,
      required: [true, "can't be blank"],
      ref: 'Booking',
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      required: [true, "can't be blank"],
      ref: 'User',
      index: true,
    },
    discountApplied: {
      type: Number,
      required: [true, "can't be blank"],
      min: [0.01, 'Discount applied must be greater than 0'],
    },
    usedAt: {
      type: Date,
      default: Date.now,
      required: [true, "can't be blank"],
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: 'VoucherUsage',
  },
)

// Indexes for efficient queries
voucherUsageSchema.index({ voucher: 1, usedAt: -1 })
voucherUsageSchema.index({ user: 1, usedAt: -1 })
voucherUsageSchema.index({ booking: 1 })
voucherUsageSchema.index({ usedAt: -1 })

// Compound indexes for analytics queries
voucherUsageSchema.index({ voucher: 1, user: 1 })
voucherUsageSchema.index({ voucher: 1, discountApplied: 1 })

// Unique constraint: one voucher per booking
voucherUsageSchema.index({ booking: 1 }, { unique: true })

const VoucherUsage = model<env.VoucherUsage>('VoucherUsage', voucherUsageSchema)

export default VoucherUsage