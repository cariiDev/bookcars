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
        bookcarsTypes.VoucherDiscountType.FreeHours,
        bookcarsTypes.VoucherDiscountType.MorningBookings,
        bookcarsTypes.VoucherDiscountType.Rent5Get1,
        bookcarsTypes.VoucherDiscountType.WeekdayTrips,
        bookcarsTypes.VoucherDiscountType.HourlyPriceReduction,
        bookcarsTypes.VoucherDiscountType.DurationBasedFreeHours,
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
    minimumRentalAmount: {
      type: Number,
      default: 0,
      min: [0, 'Minimum rental amount must be 0 or greater'],
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
    
    // Time restrictions
    timeRestrictionEnabled: {
      type: Boolean,
      default: false,
    },
    allowedTimeSlots: [
      {
        startHour: {
          type: Number,
          min: [0, 'Start hour must be between 0-23'],
          max: [23, 'Start hour must be between 0-23'],
        },
        endHour: {
          type: Number,
          min: [0, 'End hour must be between 0-23'],
          max: [23, 'End hour must be between 0-23'],
        },
      },
    ],
    allowedDaysOfWeek: [
      {
        type: Number,
        min: [0, 'Day of week must be between 0-6 (Sunday-Saturday)'],
        max: [6, 'Day of week must be between 0-6 (Sunday-Saturday)'],
      },
    ],
    dailyUsageLimit: {
      type: Number,
      min: [1, 'Daily usage limit must be at least 1 hour'],
    },
    dailyUsageLimitEnabled: {
      type: Boolean,
      default: false,
    },

    // Sub-feature fields
    allowedCarModels: [
      {
        type: String,
        trim: true,
      }
    ],
    maxUsesPerUser: {
      type: Number,
      min: [1, 'Maximum uses per user must be at least 1'],
    },
    freeHoursAmount: {
      type: Number,
      min: [0.5, 'Free hours amount must be at least 0.5 hours'],
    },

    // Advanced features
    isStackable: {
      type: Boolean,
      default: false,
    },
    minimumRentalHours: {
      type: Number,
      min: [0.5, 'Minimum rental hours must be at least 0.5 hours'],
    },
    freeHoursRatio: {
      rent: {
        type: Number,
        min: [1, 'Rent hours ratio must be at least 1'],
      },
      free: {
        type: Number,
        min: [1, 'Free hours ratio must be at least 1'],
      },
    },
    deductCheapestHours: {
      type: Boolean,
      default: false,
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