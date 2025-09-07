import { Schema, model } from 'mongoose'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '../config/env.config'

const voucherSchema = new Schema<env.Voucher>(
  {
    code: {
      type: String,
      required: [true, "can't be blank"],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    discountType: {
      type: String,
      enum: [
        bookcarsTypes.VoucherDiscountType.Percentage,
        bookcarsTypes.VoucherDiscountType.FixedAmount,
      ],
      required: [true, "can't be blank"],
    },
    discountValue: {
      type: Number,
      required: [true, "can't be blank"],
      min: [0.01, 'Discount value must be greater than 0'],
    },
    fundingType: {
      type: String,
      enum: [
        bookcarsTypes.VoucherFundingType.Platform,
        bookcarsTypes.VoucherFundingType.Supplier,
        bookcarsTypes.VoucherFundingType.CoFunded,
      ],
      required: [true, "can't be blank"],
    },
    minimumAmount: {
      type: Number,
      default: 0,
      min: [0, 'Minimum amount must be 0 or greater'],
    },
    usageLimit: {
      type: Number,
      min: [1, 'Usage limit must be at least 1'],
    },
    usageCount: {
      type: Number,
      default: 0,
      min: [0, 'Usage count cannot be negative'],
    },
    validFrom: {
      type: Date,
      required: [true, "can't be blank"],
    },
    validTo: {
      type: Date,
      required: [true, "can't be blank"],
      validate: {
        validator: function (this: env.Voucher, validTo: Date) {
          return validTo > this.validFrom
        },
        message: 'Valid to date must be after valid from date',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    supplier: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: 'Voucher',
  },
)

// Indexes for efficient queries
voucherSchema.index({ code: 1, isActive: 1 })
voucherSchema.index({ validFrom: 1, validTo: 1 })
voucherSchema.index({ supplier: 1, isActive: 1 })
voucherSchema.index({ fundingType: 1, isActive: 1 })

// Compound index for voucher validation queries
voucherSchema.index({ 
  code: 1, 
  isActive: 1, 
  validFrom: 1, 
  validTo: 1 
})

const Voucher = model<env.Voucher>('Voucher', voucherSchema)

export default Voucher