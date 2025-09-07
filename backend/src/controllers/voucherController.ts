import { Request, Response } from 'express'
import mongoose from 'mongoose'
import escapeStringRegexp from 'escape-string-regexp'
import * as bookcarsTypes from ':bookcars-types'
import Voucher from '../models/Voucher'
import VoucherUsage from '../models/VoucherUsage'
import Booking from '../models/Booking'
import i18n from '../lang/i18n'
import * as helper from '../utils/helper'
import * as logger from '../utils/logger'

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
      minimumAmount: body.minimumAmount || 0,
      usageLimit: body.usageLimit,
      usageCount: 0,
      validFrom: body.validFrom,
      validTo: body.validTo,
      supplier: body.supplier,
      isActive: true,
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
        minimumAmount: body.minimumAmount || 0,
        usageLimit: body.usageLimit,
        validFrom: body.validFrom,
        validTo: body.validTo,
        supplier: body.supplier,
        isActive: body.isActive !== undefined ? body.isActive : true,
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
    const { code, bookingAmount, userId } = body

    if (!code || !bookingAmount) {
      throw new Error('Voucher code and booking amount are required')
    }

    // Find voucher
    const voucher = await Voucher.findOne({ 
      code: code.toUpperCase(), 
      isActive: true 
    })

    if (!voucher) {
      res.json({
        valid: false,
        message: 'Invalid voucher code',
      })
      return
    }

    // Check validity dates
    const now = new Date()
    if (now < voucher.validFrom || now > voucher.validTo) {
      res.json({
        valid: false,
        message: 'Voucher has expired or is not yet valid',
      })
      return
    }

    // Check usage limit
    if (voucher.usageLimit && voucher.usageCount >= voucher.usageLimit) {
      res.json({
        valid: false,
        message: 'Voucher usage limit exceeded',
      })
      return
    }

    // Check minimum amount
    if (voucher.minimumAmount && bookingAmount < voucher.minimumAmount) {
      res.json({
        valid: false,
        message: `Minimum booking amount of $${voucher.minimumAmount} required`,
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

    // Calculate discount
    let discountAmount: number
    if (voucher.discountType === bookcarsTypes.VoucherDiscountType.Percentage) {
      discountAmount = (bookingAmount * voucher.discountValue) / 100
    } else {
      discountAmount = Math.min(voucher.discountValue, bookingAmount)
    }

    res.json({
      valid: true,
      voucher: voucher,
      discountAmount: Math.round(discountAmount * 100) / 100, // Round to 2 decimal places
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
    const { voucherCode, bookingId, userId } = body

    if (!helper.isValidObjectId(bookingId) || !helper.isValidObjectId(userId)) {
      throw new Error('Invalid booking or user ID')
    }

    // Get booking
    const booking = await Booking.findById(bookingId).session(session)
    if (!booking) {
      throw new Error('Booking not found')
    }

    // Check if booking already has a voucher
    if (booking.voucher) {
      throw new Error('Booking already has a voucher applied')
    }

    // Validate voucher directly
    const voucher = await Voucher.findOne({ 
      code: voucherCode.toUpperCase(), 
      isActive: true 
    })

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

    // Check minimum amount
    if (voucher.minimumAmount && booking.price < voucher.minimumAmount) {
      throw new Error(`Minimum booking amount of $${voucher.minimumAmount} required`)
    }

    // Check if user has already used this voucher
    const previousUsage = await VoucherUsage.findOne({
      voucher: voucher._id,
      user: userId,
    }).session(session)

    if (previousUsage) {
      throw new Error('You have already used this voucher')
    }

    // Calculate discount
    let discountAmount: number
    if (voucher.discountType === bookcarsTypes.VoucherDiscountType.Percentage) {
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
      user: userId,
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

    // Get booking
    const booking = await Booking.findById(bookingId).session(session)
    if (!booking) {
      throw new Error('Booking not found')
    }

    if (!booking.voucher) {
      throw new Error('No voucher applied to this booking')
    }

    // Remove voucher usage record
    await VoucherUsage.findOneAndDelete({ booking: booking._id }, { session })

    // Update voucher usage count
    await Voucher.findByIdAndUpdate(
      booking.voucher,
      { $inc: { usageCount: -1 } },
      { session }
    )

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