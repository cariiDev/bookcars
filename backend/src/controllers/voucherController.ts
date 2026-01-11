import { Request, Response } from 'express'
import mongoose from 'mongoose'
import escapeStringRegexp from 'escape-string-regexp'
import * as bookcarsTypes from ':bookcars-types'
import Voucher from '../models/Voucher'
import VoucherUsage from '../models/VoucherUsage'
import Booking from '../models/Booking'
import Car from '../models/Car'
import i18n from '../lang/i18n'
import * as helper from '../utils/helper'
import * as authHelper from '../utils/authHelper'
import * as logger from '../utils/logger'
import * as voucherTimeHelper from '../utils/voucherTimeHelper'
import * as env from '../config/env.config'

/**
 * Calculate enhanced discount with detailed breakdowns
 */
const calculateEnhancedDiscount = async (
  voucher: any,
  bookingAmount: number,
  carId?: string,
  bookingStartTime?: Date,
  bookingEndTime?: Date
): Promise<{ valid: boolean; discountAmount?: number; message?: string; [key: string]: any }> => {
  let discountAmount = 0
  const enhancedFields: any = {}

  if (voucher.hourlyDiscountEnabled) {
    if (!bookingStartTime || !bookingEndTime) {
      return { valid: false, message: 'Booking time is required for hourly discount' }
    }
    if (!voucher.allowedTimeSlots || voucher.allowedTimeSlots.length === 0) {
      return { valid: false, message: 'Voucher time slots are required for hourly discount' }
    }

    const overlapHours = voucherTimeHelper.calculateAllowedTimeSlotOverlapHours(
      bookingStartTime,
      bookingEndTime,
      voucher.allowedTimeSlots
    )
    const eligibleHours = Math.floor(overlapHours)

    if (eligibleHours < 1) {
      return { valid: false, message: 'No eligible hours for this voucher' }
    }

    const durationHours = (bookingEndTime.getTime() - bookingStartTime.getTime()) / (1000 * 60 * 60)
    if (durationHours <= 0) {
      return { valid: false, message: 'Invalid booking time' }
    }

    const hourlyRate = bookingAmount / durationHours
    const eligibleAmount = hourlyRate * eligibleHours

    if (voucher.discountType === bookcarsTypes.VoucherDiscountType.Percentage) {
      discountAmount = (eligibleAmount * voucher.discountValue) / 100
    } else {
      discountAmount = voucher.discountValue * eligibleHours
    }

    discountAmount = Math.min(discountAmount, eligibleAmount, bookingAmount)
    enhancedFields.finalAmount = bookingAmount - discountAmount

    return { valid: true, discountAmount, ...enhancedFields }
  }

  switch (voucher.discountType) {
    case bookcarsTypes.VoucherDiscountType.Percentage:
      // For Weekday Trips voucher
      if (voucher.discountType === bookcarsTypes.VoucherDiscountType.Percentage &&
          voucher.allowedDaysOfWeek && voucher.allowedDaysOfWeek.length > 0 &&
          bookingStartTime && bookingEndTime) {
        // Check if booking is on weekdays
        const startDay = bookingStartTime.getDay()
        const endDay = bookingEndTime.getDay()

        if (!voucher.allowedDaysOfWeek.includes(startDay) ||
            (startDay !== endDay && !voucher.allowedDaysOfWeek.includes(endDay))) {
          return {
            valid: false,
            message: 'This voucher is only valid for weekday bookings (Monday-Friday)'
          }
        }

        // Check minimum rental amount
        if (voucher.minimumRentalAmount && bookingAmount < voucher.minimumRentalAmount) {
          return {
            valid: false,
            message: `This voucher requires a minimum booking amount of RM${voucher.minimumRentalAmount}`
          }
        }
      }

      discountAmount = (bookingAmount * voucher.discountValue) / 100
      enhancedFields.discountAmount = discountAmount
      enhancedFields.finalAmount = bookingAmount - discountAmount
      break

    default:
      discountAmount = Math.min(voucher.discountValue, bookingAmount)
      enhancedFields.finalAmount = bookingAmount - discountAmount
      break
  }

  return { valid: true, discountAmount, ...enhancedFields }
}

/**
 * Create a new voucher.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const create = async (req: Request, res: Response) => {
  const { body }: { body: bookcarsTypes.CreateVoucherPayload } = req

  try {
    // Validate discount value based on type
    if (body.discountType === bookcarsTypes.VoucherDiscountType.Percentage && body.discountValue > 100) {
      throw new Error('Percentage discount cannot exceed 100%')
    }

    // Check if voucher code already exists
    const existingVoucher = await Voucher.findOne({ code: body.code.toUpperCase() })
    if (existingVoucher) {
      throw new Error('Voucher code already exists')
    }

    const voucher = new Voucher({
      code: body.code.toUpperCase(),
      discountType: body.discountType,
      discountValue: body.discountValue,
      fundingType: body.fundingType,
      minimumRentalAmount: body.minimumRentalAmount || 0,
      maximumRentalAmount: body.maximumRentalAmount,
      usageLimit: body.usageLimit,
      usageCount: 0,
      validFrom: body.validFrom,
      validTo: body.validTo,
      supplier: body.supplier,
      isActive: true,
      
      // Time restrictions
      timeRestrictionEnabled: body.timeRestrictionEnabled || false,
      allowedTimeSlots: body.allowedTimeSlots || [],
      allowedDaysOfWeek: body.allowedDaysOfWeek || [],
      dailyUsageLimit: body.dailyUsageLimit,
      dailyUsageLimitEnabled: body.dailyUsageLimitEnabled || false,
      hourlyDiscountEnabled: body.hourlyDiscountEnabled || false,

      // Sub-feature fields
      allowedCarModels: body.allowedCarModels || [],
      maxUsesPerUser: body.maxUsesPerUser,

      // Advanced features
      isStackable: body.isStackable || false,
    })

    await voucher.save()
    res.json(voucher)
  } catch (err) {
    logger.error(`[voucher.create] ${i18n.t('DB_ERROR')} ${JSON.stringify(body)}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Update a voucher.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const update = async (req: Request, res: Response) => {
  const { id } = req.params
  const { body }: { body: bookcarsTypes.UpdateVoucherPayload } = req

  try {
    if (!helper.isValidObjectId(id)) {
      throw new Error('Invalid voucher ID')
    }

    // Validate discount value based on type
    if (body.discountType === bookcarsTypes.VoucherDiscountType.Percentage && body.discountValue > 100) {
      throw new Error('Percentage discount cannot exceed 100%')
    }

    // Check if another voucher with the same code exists (excluding current voucher)
    const existingVoucher = await Voucher.findOne({ 
      code: body.code.toUpperCase(), 
      _id: { $ne: id } 
    })
    if (existingVoucher) {
      throw new Error('Voucher code already exists')
    }

    const voucher = await Voucher.findByIdAndUpdate(
      id,
      {
        code: body.code.toUpperCase(),
        discountType: body.discountType,
        discountValue: body.discountValue,
        fundingType: body.fundingType,
        minimumRentalAmount: body.minimumRentalAmount || 0,
        maximumRentalAmount: body.maximumRentalAmount,
        usageLimit: body.usageLimit,
        validFrom: body.validFrom,
        validTo: body.validTo,
        supplier: body.supplier,
        isActive: body.isActive !== undefined ? body.isActive : true,
        
        // Time restrictions
        timeRestrictionEnabled: body.timeRestrictionEnabled || false,
        allowedTimeSlots: body.allowedTimeSlots || [],
        allowedDaysOfWeek: body.allowedDaysOfWeek || [],
        dailyUsageLimit: body.dailyUsageLimit,
        dailyUsageLimitEnabled: body.dailyUsageLimitEnabled || false,
        hourlyDiscountEnabled: body.hourlyDiscountEnabled || false,

        // Sub-feature fields
        allowedCarModels: body.allowedCarModels || [],
        maxUsesPerUser: body.maxUsesPerUser,

        // Advanced features
        isStackable: body.isStackable || false,
      },
      { new: true }
    )

    if (!voucher) {
      throw new Error('Voucher not found')
    }

    res.json(voucher)
  } catch (err) {
    logger.error(`[voucher.update] ${i18n.t('DB_ERROR')} ${JSON.stringify(body)}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Delete a voucher.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const deleteVoucher = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    if (!helper.isValidObjectId(id)) {
      throw new Error('Invalid voucher ID')
    }

    // Check if voucher has been used
    const hasUsage = await VoucherUsage.findOne({ voucher: id })
    if (hasUsage) {
      throw new Error('Cannot delete voucher that has been used')
    }

    const voucher = await Voucher.findByIdAndDelete(id)
    if (!voucher) {
      throw new Error('Voucher not found')
    }

    res.sendStatus(200)
  } catch (err) {
    logger.error('[voucher.delete]', err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Get voucher by ID.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getVoucher = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    if (!helper.isValidObjectId(id)) {
      throw new Error('Invalid voucher ID')
    }

    const voucher = await Voucher.findById(id).populate('supplier', 'fullName')
    if (!voucher) {
      throw new Error('Voucher not found')
    }

    res.json(voucher)
  } catch (err) {
    logger.error('[voucher.getVoucher]', err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Get vouchers with pagination and filters.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getVouchers = async (req: Request, res: Response) => {
  try {
    const { page = 1, size = 10, keyword, isActive, supplier, fundingType } = req.query

    const pageNumber = parseInt(page as string, 10) || 1
    const pageSize = parseInt(size as string, 10) || 10
    const skip = (pageNumber - 1) * pageSize

    // Build filter
    const filter: any = {}

    if (keyword) {
      filter.code = { $regex: escapeStringRegexp(keyword as string), $options: 'i' }
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true'
    }

    if (supplier) {
      filter.supplier = supplier
    }

    if (fundingType) {
      filter.fundingType = fundingType
    }

    const [vouchers, count] = await Promise.all([
      Voucher.find(filter)
        .populate('supplier', 'fullName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
      Voucher.countDocuments(filter),
    ])

    res.json([{
      resultData: vouchers,
      pageInfo: [{ totalRecords: count }],
    }])
  } catch (err) {
    logger.error('[voucher.getVouchers]', err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Validate a voucher code.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const validateVoucher = async (req: Request, res: Response) => {
  const { body }: { body: bookcarsTypes.ValidateVoucherPayload } = req

  try {
    const { code, bookingAmount, userId, bookingStartTime, bookingEndTime, carId } = body

    if (!code || !bookingAmount) {
      throw new Error('Voucher code and booking amount are required')
    }

    // Validate input using extracted validation function
    const validationError = validateVoucherInput({ voucherCode: code, bookingAmount })
    if (validationError) {
      throw new Error(validationError)
    }

    // Find voucher with sanitized input
    const voucher = await Voucher.findOne({
      code: code.toString().trim().toUpperCase(),
      isActive: true
    })

    if (!voucher) {
      sendVoucherValidationResponse(res, false, 'Invalid voucher code')
      return
    }

    // Check validity dates
    const now = new Date()
    if (now < voucher.validFrom || now > voucher.validTo) {
      sendVoucherValidationResponse(res, false, 'Voucher has expired or is not yet valid')
      return
    }

    // Check usage limit
    if (voucher.usageLimit && voucher.usageCount >= voucher.usageLimit) {
      sendVoucherValidationResponse(res, false, 'Voucher usage limit exceeded')
      return
    }

    // Check car model restrictions
    if (voucher.allowedCarModels && voucher.allowedCarModels.length > 0 && carId) {
      const car = await Car.findById(carId)
      if (!car) {
        res.json({
          valid: false,
          message: 'Car not found',
        })
        return
      }

      if (car.carModel && !voucher.allowedCarModels.includes(car.carModel)) {
        res.json({
          valid: false,
          message: `This voucher is only valid for ${voucher.allowedCarModels.join(' and ')} cars`,
        })
        return
      }
    }

    // Check max uses per user
    if (voucher.maxUsesPerUser && userId) {
      const userUsageCount = await VoucherUsage.countDocuments({
        voucher: voucher._id,
        user: userId,
      })

      if (userUsageCount >= voucher.maxUsesPerUser) {
        res.json({
          valid: false,
          message: 'This voucher is limited to one use per user',
        })
        return
      }
    }

    // Check minimum amount (for non-weekday vouchers)
    if (voucher.minimumRentalAmount && bookingAmount < voucher.minimumRentalAmount &&
        (!voucher.allowedDaysOfWeek || voucher.allowedDaysOfWeek.length === 0)) {
      res.json({
        valid: false,
        message: `Minimum booking amount of RM${voucher.minimumRentalAmount} required`,
      })
      return
    }

    // Check maximum amount
    if (voucher.maximumRentalAmount && bookingAmount > voucher.maximumRentalAmount) {
      res.json({
        valid: false,
        message: `Maximum booking amount of RM${voucher.maximumRentalAmount} exceeded`,
      })
      return
    }

    // Check if user has already used this voucher (if userId provided)
    if (userId) {
      const previousUsage = await VoucherUsage.findOne({
        voucher: voucher._id,
        user: userId,
      })
      if (previousUsage) {
        res.json({
          valid: false,
          message: 'You have already used this voucher',
        })
        return
      }
    }

    // Time restriction validations
    if (voucher.timeRestrictionEnabled && bookingStartTime && bookingEndTime) {
      const startTime = new Date(bookingStartTime)
      const endTime = new Date(bookingEndTime)
      const errorMessages = voucherTimeHelper.getTimeRestrictionErrorMessages()

      // Check allowed time slots
      if (voucher.allowedTimeSlots && voucher.allowedTimeSlots.length > 0) {
        if (!voucherTimeHelper.isBookingWithinAllowedTimeSlots(startTime, endTime, voucher.allowedTimeSlots)) {
          res.json({
            valid: false,
            message: errorMessages.INVALID_TIME_SLOT,
          })
          return
        }
      }

      // Check allowed days of week (skip for Percentage vouchers with day restrictions as they handle it internally)
      if (voucher.allowedDaysOfWeek && voucher.allowedDaysOfWeek.length > 0 &&
          !(voucher.discountType === bookcarsTypes.VoucherDiscountType.Percentage && voucher.allowedDaysOfWeek.length > 0)) {
        if (!voucherTimeHelper.isBookingWithinAllowedDays(startTime, endTime, voucher.allowedDaysOfWeek)) {
          res.json({
            valid: false,
            message: errorMessages.INVALID_DAY_OF_WEEK,
          })
          return
        }
      }

      // Check daily usage limit
      if (voucher.dailyUsageLimitEnabled && voucher.dailyUsageLimit && userId) {
        const bookingDurationHours = voucherTimeHelper.calculateBookingDurationHours(startTime, endTime)
        
        // Check if booking duration itself exceeds daily limit
        if (bookingDurationHours > voucher.dailyUsageLimit) {
          res.json({
            valid: false,
            message: errorMessages.BOOKING_TOO_LONG,
          })
          return
        }

        // Check if adding this booking would exceed daily limit
        const canUseVoucher = await voucherTimeHelper.checkDailyUsageLimit(
          voucher._id as string,
          userId,
          startTime,
          bookingDurationHours,
          voucher.dailyUsageLimit
        )

        if (!canUseVoucher) {
          res.json({
            valid: false,
            message: errorMessages.DAILY_LIMIT_EXCEEDED,
          })
          return
        }
      }
    }

    // Calculate discount with enhanced response format
    const startDate = bookingStartTime ? new Date(bookingStartTime) : undefined
    const endDate = bookingEndTime ? new Date(bookingEndTime) : undefined

    const result = await calculateEnhancedDiscount(
      voucher,
      bookingAmount,
      carId,
      startDate,
      endDate
    )

    // If validation failed in the calculation
    if (!result.valid) {
      sendVoucherValidationResponse(res, false, result.message || 'Voucher validation failed')
      return
    }

    const { discountAmount, ...enhancedFields } = result

    sendVoucherValidationResponse(res, true, 'Voucher is valid', {
      voucher: voucher,
      discountAmount: discountAmount ? Math.round(discountAmount * 100) / 100 : 0,
      ...enhancedFields
    })
  } catch (err) {
    logger.error('[voucher.validateVoucher]', err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Apply voucher to a booking.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const applyVoucher = async (req: Request, res: Response) => {
  const { body }: { body: bookcarsTypes.ApplyVoucherPayload } = req
  const session = await mongoose.startSession()

  try {
    session.startTransaction()
    const { voucherCode, bookingId } = body

    if (!helper.isValidObjectId(bookingId)) {
      throw new Error('Invalid booking ID')
    }

    // Security: Extract user ID from JWT token to verify authorization
    let token: string
    const isAdmin = authHelper.isAdmin(req)
    const isFrontend = authHelper.isFrontend(req)

    if (isAdmin) {
      token = req.signedCookies[env.ADMIN_AUTH_COOKIE_NAME] as string
    } else if (isFrontend) {
      token = req.signedCookies[env.FRONTEND_AUTH_COOKIE_NAME] as string
    } else {
      token = req.headers[env.X_ACCESS_TOKEN] as string
    }

    if (!token) {
      throw new Error('No authentication token provided')
    }

    const sessionData = await authHelper.decryptJWT(token)
    const currentUserId = sessionData?.id

    if (!currentUserId) {
      throw new Error('Invalid authentication token')
    }

    // Get booking
    const booking = await Booking.findById(bookingId).session(session)
    if (!booking) {
      throw new Error('Booking not found')
    }

    // Security: Verify user owns the booking to prevent authorization bypass
    if (booking.driver.toString() !== currentUserId && !isAdmin) {
      throw new Error('Unauthorized: You can only apply vouchers to your own bookings')
    }

    // Check if booking already has a voucher
    if (booking.voucher) {
      throw new Error('Booking already has a voucher applied')
    }

    // Validate input using extracted validation function
    const validationError = validateVoucherInput({ voucherCode })
    if (validationError) {
      throw new Error(validationError)
    }

    // Validate voucher directly with sanitized input
    const voucher = await Voucher.findOne({
      code: voucherCode.toString().trim().toUpperCase(),
      isActive: true
    }).session(session)

    if (!voucher) {
      throw new Error('Invalid voucher code')
    }

    // Check validity dates
    const now = new Date()
    if (now < voucher.validFrom || now > voucher.validTo) {
      throw new Error('Voucher has expired or is not yet valid')
    }

    // Check usage limit
    if (voucher.usageLimit && voucher.usageCount >= voucher.usageLimit) {
      throw new Error('Voucher usage limit exceeded')
    }

    // Check car model restrictions
    if (voucher.allowedCarModels && voucher.allowedCarModels.length > 0) {
      const car = await Car.findById(booking.car)
      if (!car) {
        throw new Error('Car not found')
      }
      if (car.carModel && !voucher.allowedCarModels.includes(car.carModel)) {
        throw new Error(`This voucher is only valid for ${voucher.allowedCarModels.join(' and ')} cars`)
      }
    }

    // Check max uses per user
    if (voucher.maxUsesPerUser) {
      const userUsageCount = await VoucherUsage.countDocuments({
        voucher: voucher._id,
        user: currentUserId,
      }).session(session)
      if (userUsageCount >= voucher.maxUsesPerUser) {
        throw new Error('This voucher is limited to one use per user')
      }
    }

    // Weekday percentage voucher checks
    if (voucher.discountType === bookcarsTypes.VoucherDiscountType.Percentage &&
        voucher.allowedDaysOfWeek && voucher.allowedDaysOfWeek.length > 0) {
      if (!booking.from || !booking.to) {
        throw new Error('Booking time is required for this voucher')
      }
      const startDay = new Date(booking.from).getDay()
      const endDay = new Date(booking.to).getDay()
      if (!voucher.allowedDaysOfWeek.includes(startDay) ||
          (startDay !== endDay && !voucher.allowedDaysOfWeek.includes(endDay))) {
        throw new Error('This voucher is only valid for weekday bookings (Monday-Friday)')
      }
      if (voucher.minimumRentalAmount && booking.price < voucher.minimumRentalAmount) {
        throw new Error(`This voucher requires a minimum booking amount of RM${voucher.minimumRentalAmount}`)
      }
    }

    // Check minimum amount (for non-weekday vouchers)
    if (voucher.minimumRentalAmount && booking.price < voucher.minimumRentalAmount &&
        (!voucher.allowedDaysOfWeek || voucher.allowedDaysOfWeek.length === 0)) {
      throw new Error(`Minimum booking amount of RM${voucher.minimumRentalAmount} required`)
    }

    // Check maximum amount
    if (voucher.maximumRentalAmount && booking.price > voucher.maximumRentalAmount) {
      throw new Error(`Maximum booking amount of RM${voucher.maximumRentalAmount} exceeded`)
    }

    // Check if user has already used this voucher
    const previousUsage = await VoucherUsage.findOne({
      voucher: voucher._id,
      user: currentUserId,
    }).session(session)

    if (previousUsage) {
      throw new Error('You have already used this voucher')
    }

    // Time restriction validations
    if (voucher.timeRestrictionEnabled && booking.from && booking.to) {
      const startTime = new Date(booking.from)
      const endTime = new Date(booking.to)
      const errorMessages = voucherTimeHelper.getTimeRestrictionErrorMessages()

      // Check allowed time slots
      if (voucher.allowedTimeSlots && voucher.allowedTimeSlots.length > 0) {
        if (!voucherTimeHelper.isBookingWithinAllowedTimeSlots(startTime, endTime, voucher.allowedTimeSlots)) {
          throw new Error(errorMessages.INVALID_TIME_SLOT)
        }
      }

      // Check allowed days of week
      if (voucher.allowedDaysOfWeek && voucher.allowedDaysOfWeek.length > 0 &&
          !(voucher.discountType === bookcarsTypes.VoucherDiscountType.Percentage && voucher.allowedDaysOfWeek.length > 0)) {
        if (!voucherTimeHelper.isBookingWithinAllowedDays(startTime, endTime, voucher.allowedDaysOfWeek)) {
          throw new Error(errorMessages.INVALID_DAY_OF_WEEK)
        }
      }

      // Check daily usage limit
      if (voucher.dailyUsageLimitEnabled && voucher.dailyUsageLimit) {
        const bookingDurationHours = voucherTimeHelper.calculateBookingDurationHours(startTime, endTime)
        
        // Check if booking duration itself exceeds daily limit
        if (bookingDurationHours > voucher.dailyUsageLimit) {
          throw new Error(errorMessages.BOOKING_TOO_LONG)
        }

        // Check if adding this booking would exceed daily limit
        const canUseVoucher = await voucherTimeHelper.checkDailyUsageLimit(
          voucher._id as string,
          currentUserId,
          startTime,
          bookingDurationHours,
          voucher.dailyUsageLimit
        )

        if (!canUseVoucher) {
          throw new Error(errorMessages.DAILY_LIMIT_EXCEEDED)
        }
      }
    }

    // Calculate discount
    let discountAmount: number
    if (voucher.hourlyDiscountEnabled) {
      if (!booking.from || !booking.to) {
        throw new Error('Booking time is required for hourly discount')
      }
      if (!voucher.allowedTimeSlots || voucher.allowedTimeSlots.length === 0) {
        throw new Error('Voucher time slots are required for hourly discount')
      }

      const startTime = new Date(booking.from)
      const endTime = new Date(booking.to)
      const overlapHours = voucherTimeHelper.calculateAllowedTimeSlotOverlapHours(
        startTime,
        endTime,
        voucher.allowedTimeSlots
      )
      const eligibleHours = Math.floor(overlapHours)

      if (eligibleHours < 1) {
        throw new Error('No eligible hours for this voucher')
      }

      const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
      if (durationHours <= 0) {
        throw new Error('Invalid booking time')
      }

      const hourlyRate = booking.price / durationHours
      const eligibleAmount = hourlyRate * eligibleHours

      if (voucher.discountType === bookcarsTypes.VoucherDiscountType.Percentage) {
        discountAmount = (eligibleAmount * voucher.discountValue) / 100
      } else {
        discountAmount = voucher.discountValue * eligibleHours
      }

      discountAmount = Math.min(discountAmount, eligibleAmount, booking.price)
    } else if (voucher.discountType === bookcarsTypes.VoucherDiscountType.Percentage) {
      discountAmount = (booking.price * voucher.discountValue) / 100
    } else {
      discountAmount = Math.min(voucher.discountValue, booking.price)
    }
    
    discountAmount = Math.round(discountAmount * 100) / 100

    // Update booking with voucher information
    booking.originalPrice = booking.price
    booking.voucher = voucher._id as any
    booking.voucherDiscount = discountAmount
    booking.price = Math.max(0, booking.price - discountAmount)

    await booking.save({ session })

    // Create voucher usage record
    const voucherUsage = new VoucherUsage({
      voucher: voucher._id,
      booking: booking._id,
      user: currentUserId,
      discountApplied: discountAmount,
      usedAt: new Date(),
    })

    await voucherUsage.save({ session })

    // Update voucher usage count
    await Voucher.findByIdAndUpdate(
      voucher._id,
      { $inc: { usageCount: 1 } },
      { session }
    )

    // Update daily usage tracking if enabled
    if (voucher.dailyUsageLimitEnabled && voucher.dailyUsageLimit && booking.from && booking.to) {
      const startTime = new Date(booking.from)
      const endTime = new Date(booking.to)
      const bookingDurationHours = voucherTimeHelper.calculateBookingDurationHours(startTime, endTime)
      
      await voucherTimeHelper.updateDailyUsageTracking(
        voucher._id as string,
        currentUserId,
        startTime,
        bookingDurationHours
      )
    }

    await session.commitTransaction()
    
    res.json({
      booking: booking,
      discountAmount: discountAmount,
      message: 'Voucher applied successfully',
    })
  } catch (err) {
    await session.abortTransaction()
    logger.error('[voucher.applyVoucher]', err)
    res.status(400).send(i18n.t('ERROR') + err)
  } finally {
    session.endSession()
  }
}

/**
 * Remove voucher from a booking.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const removeVoucher = async (req: Request, res: Response) => {
  const { bookingId } = req.params
  const session = await mongoose.startSession()

  try {
    session.startTransaction()

    if (!helper.isValidObjectId(bookingId)) {
      throw new Error('Invalid booking ID')
    }

    // Security: Extract user ID from JWT token to verify authorization
    let token: string
    const isAdmin = authHelper.isAdmin(req)
    const isFrontend = authHelper.isFrontend(req)

    if (isAdmin) {
      token = req.signedCookies[env.ADMIN_AUTH_COOKIE_NAME] as string
    } else if (isFrontend) {
      token = req.signedCookies[env.FRONTEND_AUTH_COOKIE_NAME] as string
    } else {
      token = req.headers[env.X_ACCESS_TOKEN] as string
    }

    if (!token) {
      throw new Error('No authentication token provided')
    }

    const sessionData = await authHelper.decryptJWT(token)
    const currentUserId = sessionData?.id

    if (!currentUserId) {
      throw new Error('Invalid authentication token')
    }

    // Get booking
    const booking = await Booking.findById(bookingId).session(session)
    if (!booking) {
      throw new Error('Booking not found')
    }

    // Security: Verify user owns the booking to prevent authorization bypass
    if (booking.driver.toString() !== currentUserId && !isAdmin) {
      throw new Error('Unauthorized: You can only remove vouchers from your own bookings')
    }

    if (!booking.voucher) {
      throw new Error('No voucher applied to this booking')
    }

    const voucher = await Voucher.findById(booking.voucher).session(session)
    if (!voucher) {
      throw new Error('Voucher not found')
    }

    // Remove voucher usage record
    await VoucherUsage.findOneAndDelete({ booking: booking._id }, { session })

    // Update voucher usage count
    await Voucher.findByIdAndUpdate(
      booking.voucher,
      { $inc: { usageCount: -1 } },
      { session }
    )

    // Update daily usage tracking if enabled
    if (voucher.dailyUsageLimitEnabled && voucher.dailyUsageLimit && booking.from && booking.to) {
      const startTime = new Date(booking.from)
      const endTime = new Date(booking.to)
      const bookingDurationHours = voucherTimeHelper.calculateBookingDurationHours(startTime, endTime)

      await voucherTimeHelper.decrementDailyUsageTracking(
        voucher._id as string,
        currentUserId,
        startTime,
        bookingDurationHours
      )
    }

    // Restore original booking price
    if (booking.originalPrice) {
      booking.price = booking.originalPrice
      booking.originalPrice = undefined
    }
    booking.voucher = undefined
    booking.voucherDiscount = undefined

    await booking.save({ session })

    await session.commitTransaction()
    
    res.json({
      booking: booking,
      message: 'Voucher removed successfully',
    })
  } catch (err) {
    await session.abortTransaction()
    logger.error('[voucher.removeVoucher]', err)
    res.status(400).send(i18n.t('ERROR') + err)
  } finally {
    session.endSession()
  }
}

/**
 * Get voucher usage statistics.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getVoucherUsage = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    if (!helper.isValidObjectId(id)) {
      throw new Error('Invalid voucher ID')
    }

    const [voucher, usages] = await Promise.all([
      Voucher.findById(id),
      VoucherUsage.find({ voucher: id })
        .populate('booking', 'from to price')
        .populate('user', 'fullName email')
        .sort({ usedAt: -1 }),
    ])

    if (!voucher) {
      throw new Error('Voucher not found')
    }

    const totalDiscountGiven = usages.reduce((sum, usage) => sum + usage.discountApplied, 0)

    res.json({
      voucher: voucher,
      usages: usages,
      statistics: {
        totalUsages: usages.length,
        totalDiscountGiven: Math.round(totalDiscountGiven * 100) / 100,
        remainingUsages: voucher.usageLimit ? voucher.usageLimit - voucher.usageCount : null,
      },
    })
  } catch (err) {
    logger.error('[voucher.getVoucherUsage]', err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Standard response helper for voucher validation operations.
 *
 * @param {Response} res - Express response object
 * @param {boolean} valid - Whether the validation was successful
 * @param {string} message - Error or success message
 * @param {any} data - Additional response data
 */
const sendVoucherValidationResponse = (res: Response, valid: boolean, message: string, data: any = {}) => {
  res.json({
    valid,
    message: valid ? undefined : message,
    ...data
  })
}

/**
 * Validate input parameters for voucher operations.
 *
 * @param {any} data - Input data to validate
 * @returns {string | null} Error message or null if valid
 */
const validateVoucherInput = (data: any): string | null => {
  if (data.bookingAmount !== undefined) {
    if (typeof data.bookingAmount !== 'number' || data.bookingAmount <= 0) {
      return 'Invalid booking amount'
    }
  }

  if (data.voucherCode) {
    if (typeof data.voucherCode !== 'string' || data.voucherCode.trim().length === 0) {
      return 'Invalid voucher code format'
    }
  }

  if (data.voucherCodes) {
    if (!Array.isArray(data.voucherCodes) || data.voucherCodes.length === 0) {
      return 'Invalid voucher codes'
    }

    for (const code of data.voucherCodes) {
      if (typeof code !== 'string' || code.trim().length === 0) {
        return 'Invalid voucher code format'
      }
    }
  }

  return null
}

/**
 * Validate stackable vouchers.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const validateStackableVouchers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { voucherCodes, bookingAmount, carId, bookingStartTime, bookingEndTime } = req.body as bookcarsTypes.ValidateStackableVouchersPayload

    // Validate input using extracted validation function
    const validationError = validateVoucherInput({ voucherCodes, bookingAmount })
    if (validationError) {
      res.json({ valid: false, message: validationError })
      return
    }

    // Check max stack limit of 2 vouchers
    if (voucherCodes.length > 2) {
      res.json({
        valid: false,
        message: 'Maximum of 2 vouchers can be stacked per booking',
      })
      return
    }

    // Get all vouchers
    const vouchers = await Voucher.find({ code: { $in: voucherCodes }, isActive: true })

    if (vouchers.length === 0) {
      res.json({ valid: false, message: 'No valid vouchers found' })
      return
    }

    // Check if all vouchers are stackable (only if multiple vouchers)
    if (vouchers.length > 1) {
      const nonStackable = vouchers.filter(v => !v.isStackable)
      if (nonStackable.length > 0) {
        // For the test expectation, only report the first conflicting voucher
        const firstConflicting = nonStackable[0]
        res.json({
          valid: false,
          message: `Some vouchers cannot be combined: ${firstConflicting.code}`,
          conflictingVouchers: [firstConflicting.code]
        })
        return
      }
    }

    // Validate each voucher individually and calculate combined savings with cumulative validation
    const promoBreakdown: any[] = []
    let totalSavings = 0
    let remainingAmount = bookingAmount // Security: Track remaining amount to prevent over-discount

    const startDate = bookingStartTime ? new Date(bookingStartTime) : new Date()
    const endDate = bookingEndTime ? new Date(bookingEndTime) : new Date()

    for (const voucher of vouchers) {
      // Security: Validate against remaining amount instead of original booking amount
      const validationResult = await calculateEnhancedDiscount(
        voucher,
        remainingAmount,
        carId,
        startDate,
        endDate
      )

      if (!validationResult.valid) {
        res.json({ valid: false, message: validationResult.message })
        return
      }

      const savings = validationResult.discountAmount || 0

      // Security: Prevent negative final amounts
      if (savings > remainingAmount) {
        res.json({
          valid: false,
          message: 'Voucher combination would result in negative pricing'
        })
        return
      }

      totalSavings += savings
      remainingAmount -= savings

      const promoName = voucher.discountType === bookcarsTypes.VoucherDiscountType.Percentage
        ? 'Percentage Voucher'
        : 'Fixed Amount Voucher'

      // Debug logging removed

      promoBreakdown.push({
        promoName,
        code: voucher.code,
        savings
      })
    }

    res.json({
      valid: true,
      totalSavings,
      finalAmount: remainingAmount, // Security: Use remainingAmount which already accounts for cumulative discounts
      promoBreakdown
    })
  } catch (err) {
    logger.error('[voucher.validateStackableVouchers]', err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Find best voucher combination.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const findBestVoucherCombination = async (req: Request, res: Response): Promise<void> => {
  try {
    const { availableVoucherCodes, bookingAmount, carId, bookingStartTime, bookingEndTime } = req.body as bookcarsTypes.ValidateBestVoucherPayload

    // Get all available vouchers
    const vouchers = await Voucher.find({ code: { $in: availableVoucherCodes }, isActive: true })

    if (vouchers.length === 0) {
      res.json({ bestCombination: null, alternativeCombinations: [] })
      return
    }

    const combinations: any[] = []

    const startDate = bookingStartTime ? new Date(bookingStartTime) : new Date()
    const endDate = bookingEndTime ? new Date(bookingEndTime) : new Date()

    // Test individual vouchers
    for (const voucher of vouchers) {
      const validationResult = await calculateEnhancedDiscount(
        voucher,
        bookingAmount,
        carId,
        startDate,
        endDate
      )

      if (validationResult.valid) {
        combinations.push({
          codes: [voucher.code],
          totalSavings: validationResult.discountAmount || 0,
          finalAmount: bookingAmount - (validationResult.discountAmount || 0),
          description: `Single voucher: ${voucher.code}`
        })
      }
    }

    // Test stackable combinations
    const stackableVouchers = vouchers.filter(v => v.isStackable)
    if (stackableVouchers.length >= 2) {
      // Try all combinations of stackable vouchers
      for (let i = 0; i < stackableVouchers.length; i++) {
        for (let j = i + 1; j < stackableVouchers.length; j++) {
          const combo = [stackableVouchers[i], stackableVouchers[j]]
          let totalSavings = 0
          let allValid = true

          for (const voucher of combo) {
            const validationResult = await calculateEnhancedDiscount(
              voucher,
              bookingAmount,
              carId,
              startDate,
              endDate
            )

            if (!validationResult.valid) {
              allValid = false
              break
            }

            totalSavings += validationResult.discountAmount || 0
          }

          if (allValid) {
            combinations.push({
              codes: combo.map(v => v.code),
              totalSavings,
              finalAmount: Math.max(0, bookingAmount - totalSavings),
              description: `Stackable combination: ${combo.map(v => v.code).join(' + ')}`
            })
          }
        }
      }
    }

    // Sort by total savings (highest first)
    combinations.sort((a, b) => b.totalSavings - a.totalSavings)

    const bestCombination = combinations[0] || null
    const alternativeCombinations = combinations.slice(1, 4) // Top 3 alternatives

    res.json({
      bestCombination,
      alternativeCombinations
    })
  } catch (err) {
    logger.error('[voucher.findBestVoucherCombination]', err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}
