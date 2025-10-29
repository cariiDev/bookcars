import { z } from 'zod'
import * as bookcarsTypes from ':bookcars-types'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/vouchers'

export const schema = z.object({
  code: z.string().min(1, { message: strings.VOUCHER_CODE_REQUIRED }),
  discountType: z.enum([
    bookcarsTypes.VoucherDiscountType.Percentage,
    bookcarsTypes.VoucherDiscountType.FixedAmount,
    bookcarsTypes.VoucherDiscountType.FreeHours,
    bookcarsTypes.VoucherDiscountType.MorningBookings,
    bookcarsTypes.VoucherDiscountType.Rent5Get1,
    bookcarsTypes.VoucherDiscountType.WeekdayTrips,
    bookcarsTypes.VoucherDiscountType.HourlyPriceReduction,
    bookcarsTypes.VoucherDiscountType.DurationBasedFreeHours
  ]),
  discountValue: z.string().refine((val) => {
    const num = parseFloat(val)
    return !isNaN(num) && num > 0
  }, { message: strings.INVALID_DISCOUNT_VALUE }),
  fundingType: z.enum([bookcarsTypes.VoucherFundingType.Platform, bookcarsTypes.VoucherFundingType.Supplier, bookcarsTypes.VoucherFundingType.CoFunded]),
  minimumRentalAmount: z.string().refine((val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), { message: commonStrings.FIELD_NOT_VALID }).optional(),
  maximumRentalAmount: z.string().refine((val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), { message: commonStrings.FIELD_NOT_VALID }).optional(),
  usageLimit: z.string().refine((val) => !val || (!isNaN(parseInt(val, 10)) && parseInt(val, 10) > 0), { message: commonStrings.FIELD_NOT_VALID }).optional(),
  validFrom: z.date({ message: strings.VALID_FROM_REQUIRED }),
  validTo: z.date({ message: strings.VALID_TO_REQUIRED }),
  supplier: z.string().optional(),
  isActive: z.boolean().optional(),
  
  // Time restrictions
  timeRestrictionEnabled: z.boolean().optional(),
  allowedTimeSlots: z.array(z.object({
    startHour: z.number().min(0).max(23),
    endHour: z.number().min(0).max(23)
  })).optional(),
  allowedDaysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  dailyUsageLimit: z.string().refine((val) => !val || (!isNaN(parseInt(val, 10)) && parseInt(val, 10) > 0), { message: commonStrings.FIELD_NOT_VALID }).optional(),
  dailyUsageLimitEnabled: z.boolean().optional()
}).refine((data) => {
  // Check if percentage discount doesn't exceed 100%
  if (data.discountType === bookcarsTypes.VoucherDiscountType.Percentage) {
    const discountValue = parseFloat(data.discountValue)
    return discountValue <= 100
  }
  return true
}, {
  message: strings.PERCENTAGE_MAX_100,
  path: ['discountValue']
}).refine((data) => {
  // Check if validTo is after validFrom
  return data.validTo > data.validFrom
}, {
  message: strings.VALID_TO_AFTER_FROM,
  path: ['validTo']
}).refine((data) => {
  // Validate time slots if time restrictions are enabled
  if (data.timeRestrictionEnabled && data.allowedTimeSlots) {
    return data.allowedTimeSlots.every(slot => slot.startHour !== slot.endHour)
  }
  return true
}, {
  message: strings.INVALID_TIME_RANGE,
  path: ['allowedTimeSlots']
}).refine((data) => {
  // Check if maximumRentalAmount is greater than or equal to minimumRentalAmount
  if (data.maximumRentalAmount && data.minimumRentalAmount) {
    const maxAmount = parseFloat(data.maximumRentalAmount)
    const minAmount = parseFloat(data.minimumRentalAmount)
    return maxAmount >= minAmount
  }
  return true
}, {
  message: strings.MAXIMUM_AMOUNT_VALIDATION,
  path: ['maximumRentalAmount']
})

export type FormFields = z.infer<typeof schema>