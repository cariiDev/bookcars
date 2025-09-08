import { Schema, model } from 'mongoose'
import * as env from '../config/env.config'

const voucherDailyUsageSchema = new Schema<env.VoucherDailyUsage>(
  {
    voucher: {
      type: Schema.Types.ObjectId,
      ref: 'Voucher',
      required: [true, "can't be blank"],
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "can't be blank"],
      index: true,
    },
    date: {
      type: Date,
      required: [true, "can't be blank"],
    },
    totalHoursUsed: {
      type: Number,
      required: [true, "can't be blank"],
      min: [0, 'Total hours used cannot be negative'],
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: 'VoucherDailyUsage',
  },
)

// Compound indexes for efficient queries
voucherDailyUsageSchema.index({ voucher: 1, user: 1, date: 1 }, { unique: true })
voucherDailyUsageSchema.index({ date: 1 })
voucherDailyUsageSchema.index({ voucher: 1, date: 1 })

const VoucherDailyUsage = model<env.VoucherDailyUsage>('VoucherDailyUsage', voucherDailyUsageSchema)

export default VoucherDailyUsage