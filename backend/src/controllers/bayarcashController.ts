import { Request, Response } from 'express'
import i18n from '../lang/i18n'
import * as logger from '../utils/logger'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '../config/env.config'
import * as helper from '../utils/helper'
import Booking from '../models/Booking'
import User from '../models/User'
import Car from '../models/Car'
import * as bookingController from './bookingController'

/**
 * Create BayarCash payment intent.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const createBayarCashPayment = async (req: Request, res: Response) => {
  try {
    const bayarcash = await import('../payment/bayarcash.js')
    const {
      bookingId,
      amount,
      currency,
      paymentChannel,
      payerName,
      payerEmail,
      payerTelephoneNumber,
      name,
      description,
    }: bookcarsTypes.CreateBayarCashPayload = req.body

    // Generate callback and return URLs
    const callbackUrl = `${helper.trimEnd(env.BACKEND_HOST, '/')}/api/bayarcash/callback`
    const returnUrl = `${helper.trimEnd(env.FRONTEND_HOST, '/')}/payment-status/${bookingId}`

    const paymentIntent = await bayarcash.createPaymentIntent(
      bookingId,
      amount,
      currency,
      paymentChannel,
      payerName,
      payerEmail,
      name,
      description,
      payerTelephoneNumber,
      callbackUrl,
      returnUrl,
    )

    const result: bookcarsTypes.PaymentResult = {
      paymentIntentId: paymentIntent.id,
      paymentUrl: paymentIntent.url,
      clientSecret: null, // BayarCash doesn't use client secrets
    }
    res.json(result)
  } catch (err) {
    logger.error(`[bayarcash.createBayarCashPayment] ${i18n.t('ERROR')}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Handle BayarCash callback/webhook.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const handleBayarCashCallback = async (req: Request, res: Response) => {
  try {
    const bayarcash = await import('../payment/bayarcash.js')
    const callbackData = req.body

    // Extract callback data
    const {
      transaction_id: transactionId,
      order_number: bookingId,
      status,
      checksum,
    } = callbackData

    //
    // 1. Validate checksum for security (skip for pre_transaction callbacks)
    //
    const recordType = callbackData.record_type
    
    if (recordType === 'pre_transaction') {
      // Pre-transaction callbacks don't contain the full payment data for checksum validation
      // We'll validate the transaction when we get the final callback
      logger.info(`[bayarcash.handleBayarCashCallback] Pre-transaction callback received for booking ${bookingId}, skipping checksum validation`)
    } else if (checksum && !bayarcash.validateChecksum(callbackData, checksum)) {
      logger.warn(`[bayarcash.handleBayarCashCallback] Invalid checksum for booking ${bookingId}`)
      res.status(400).send('Invalid checksum')
      return
    }

    //
    // 2. Retrieve Booking (check for both temporary and already-processed bookings)
    //
    let booking = await Booking.findOne({ _id: bookingId, expireAt: { $ne: null } })
    
    if (!booking) {
      // Check if booking already exists but was processed (expireAt removed)
      booking = await Booking.findOne({ _id: bookingId })
      
      if (!booking) {
        const msg = `Booking with id ${bookingId} not found`
        logger.info(`[bayarcash.handleBayarCashCallback] ${msg}`)
        res.status(204).send(msg)
        return
      }
      
      // Booking exists but was already processed
      if (booking.bayarcashTransactionId === transactionId) {
        logger.info(`[bayarcash.handleBayarCashCallback] Booking ${bookingId} already processed with transaction ${transactionId}`)
        res.sendStatus(200) // Acknowledge duplicate callback
        return
      }
      
      logger.warn(`[bayarcash.handleBayarCashCallback] Booking ${bookingId} found but already processed with different transaction ID`)
      res.sendStatus(200) // Still acknowledge to prevent retries
      return
    }

    //
    // 3. Update Booking if the payment succeeded
    // (Set BookingStatus to Paid and remove expireAt TTL index)
    //
    if (status === bayarcash.TRANSACTION_STATUS.SUCCESS) {
      booking.bayarcashTransactionId = transactionId
      booking.expireAt = undefined
      booking.status = booking.isDeposit ? bookcarsTypes.BookingStatus.Deposit : bookcarsTypes.BookingStatus.Paid
      await booking.save()

      const car = await Car.findById(booking.car)
      if (!car) {
        throw new Error(`Car ${booking.car} not found`)
      }
      car.trips += 1
      await car.save()

      const supplier = await User.findById(booking.supplier)
      if (!supplier) {
        throw new Error(`Supplier ${booking.supplier} not found`)
      }

      // Send confirmation email to customer
      const user = await User.findById(booking.driver)
      if (!user) {
        throw new Error(`Driver ${booking.driver} not found`)
      }

      user.expireAt = undefined
      await user.save()

      if (!(await bookingController.confirm(user, supplier, booking, false))) {
        res.sendStatus(400)
        return
      }

      // Notify supplier
      i18n.locale = supplier.language
      let message = i18n.t('BOOKING_PAID_NOTIFICATION')
      await bookingController.notify(user, booking.id, supplier, message)

      // Notify admin
      const admin = !!env.ADMIN_EMAIL && (await User.findOne({ email: env.ADMIN_EMAIL, type: bookcarsTypes.UserType.Admin }))
      if (admin) {
        i18n.locale = admin.language
        message = i18n.t('BOOKING_PAID_NOTIFICATION')
        await bookingController.notify(user, booking.id, admin, message)
      }

      res.sendStatus(200) // Required for BayarCash
      return
    }

    //
    // 4. Handle non-success status
    //
    if (status === bayarcash.TRANSACTION_STATUS.FAILED || status === bayarcash.TRANSACTION_STATUS.CANCELLED) {
      // Delete booking if payment failed or was cancelled
      await booking.deleteOne()
      res.status(400).send(`Payment ${status === bayarcash.TRANSACTION_STATUS.FAILED ? 'failed' : 'cancelled'}`)
      return
    }

    // For NEW or PENDING status, keep booking as is
    res.sendStatus(200)
  } catch (err) {
    logger.error(`[bayarcash.handleBayarCashCallback] ${i18n.t('ERROR')}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Check BayarCash transaction status.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const checkBayarCashTransaction = async (req: Request, res: Response) => {
  try {
    const bayarcash = await import('../payment/bayarcash.js')
    const { bookingId, transactionId } = req.params

    //
    // 1. Retrieve Booking
    //
    const booking = await Booking.findOne({ _id: bookingId, expireAt: { $ne: null } })
    if (!booking) {
      const msg = `Booking with id ${bookingId} not found`
      logger.info(`[bayarcash.checkBayarCashTransaction] ${msg}`)
      res.status(204).send(msg)
      return
    }

    //
    // 2. Get transaction details from BayarCash
    //
    let transaction
    try {
      transaction = await bayarcash.getTransaction(transactionId)
    } catch (err) {
      logger.error(`[bayarcash.checkBayarCashTransaction] retrieve transaction error: ${transactionId}`, err)
    }

    if (!transaction) {
      const msg = `Transaction ${transactionId} not found`
      logger.info(`[bayarcash.checkBayarCashTransaction] ${msg}`)
      res.status(204).send(msg)
      return
    }

    //
    // 3. Update Booking if the payment succeeded
    //
    if (transaction.status === bayarcash.TRANSACTION_STATUS.SUCCESS) {
      booking.bayarcashTransactionId = transactionId
      booking.expireAt = undefined
      booking.status = booking.isDeposit ? bookcarsTypes.BookingStatus.Deposit : bookcarsTypes.BookingStatus.Paid
      await booking.save()

      const car = await Car.findById(booking.car)
      if (!car) {
        throw new Error(`Car ${booking.car} not found`)
      }
      car.trips += 1
      await car.save()

      const supplier = await User.findById(booking.supplier)
      if (!supplier) {
        throw new Error(`Supplier ${booking.supplier} not found`)
      }

      // Send confirmation email to customer
      const user = await User.findById(booking.driver)
      if (!user) {
        throw new Error(`Driver ${booking.driver} not found`)
      }

      user.expireAt = undefined
      await user.save()

      if (!(await bookingController.confirm(user, supplier, booking, false))) {
        res.sendStatus(400)
        return
      }

      // Notify supplier
      i18n.locale = supplier.language
      let message = i18n.t('BOOKING_PAID_NOTIFICATION')
      await bookingController.notify(user, booking.id, supplier, message)

      // Notify admin
      const admin = !!env.ADMIN_EMAIL && (await User.findOne({ email: env.ADMIN_EMAIL, type: bookcarsTypes.UserType.Admin }))
      if (admin) {
        i18n.locale = admin.language
        message = i18n.t('BOOKING_PAID_NOTIFICATION')
        await bookingController.notify(user, booking.id, admin, message)
      }

      res.sendStatus(200)
      return
    }

    //
    // 4. Delete Booking if the payment failed or was cancelled
    //
    if (transaction.status === bayarcash.TRANSACTION_STATUS.FAILED || transaction.status === bayarcash.TRANSACTION_STATUS.CANCELLED) {
      await booking.deleteOne()
      res.status(400).send(transaction.status)
      return
    }

    // For NEW or PENDING status
    res.status(202).send('Payment pending')
  } catch (err) {
    logger.error(`[bayarcash.checkBayarCashTransaction] ${i18n.t('ERROR')}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}
