import { Request, Response } from 'express'
import i18n from '../lang/i18n'
import * as logger from '../utils/logger'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '../config/env.config'
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
export const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    const bayarcash = await import('../payment/bayarcash.js')
    const payload: bookcarsTypes.CreateBayarcashPaymentPayload = req.body

    const result = await bayarcash.createPaymentIntent(payload)

    res.json(result)
  } catch (err) {
    logger.error(`[bayarcash.createPaymentIntent] ${i18n.t('ERROR')}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Check BayarCash payment status and update booking if the payment succeeded.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const checkPaymentStatus = async (req: Request, res: Response) => {
  try {
    const bayarcash = await import('../payment/bayarcash.js')
    const { paymentId } = req.params

    //
    // 1. Retrieve Payment Intent and Booking
    //
    let paymentIntent
    try {
      paymentIntent = await bayarcash.getPaymentIntent(paymentId)
    } catch (err) {
      logger.error(`[bayarcash.checkPaymentStatus] retrieve payment intent error: ${paymentId}`, err)
    }

    if (!paymentIntent) {
      const msg = `Payment Intent ${paymentId} not found`
      logger.info(`[bayarcash.checkPaymentStatus] ${msg}`)
      res.status(204).send(msg)
      return
    }

    const booking = await Booking.findOne({ bayarcashPaymentId: paymentId, expireAt: { $ne: null } })
    if (!booking) {
      const msg = `Booking with bayarcashPaymentId ${paymentId} not found`
      logger.info(`[bayarcash.checkPaymentStatus] ${msg}`)
      res.status(204).send(msg)
      return
    }

    //
    // 2. Update Booking if the payment succeeded
    // (Set BookingStatus to Paid and remove expireAt TTL index)
    //
    if (paymentIntent.status === 'completed' || paymentIntent.status === 'paid') {
      booking.bayarcashPaymentId = paymentId
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
    // 3. Delete Booking if the payment didn't succeed
    //
    await booking.deleteOne()
    res.status(400).send(paymentIntent.status)
  } catch (err) {
    logger.error(`[bayarcash.checkPaymentStatus] ${i18n.t('ERROR')}`, err)
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
export const handleCallback = async (req: Request, res: Response) => {
  try {
    const bayarcash = await import('../payment/bayarcash.js')
    const callbackData = req.body

    // Validate checksum for security
    if (!bayarcash.validateChecksum(callbackData)) {
      logger.error('[bayarcash.handleCallback] Invalid checksum')
      res.status(400).send('Invalid checksum')
      return
    }

    const { order_number: bookingId, transaction_id: transactionId, status } = callbackData

    if (!bookingId || !transactionId) {
      logger.error('[bayarcash.handleCallback] Missing required fields')
      res.status(400).send('Missing required fields')
      return
    }

    const booking = await Booking.findOne({ _id: bookingId, expireAt: { $ne: null } })
    if (!booking) {
      const msg = `Booking with id ${bookingId} not found`
      logger.info(`[bayarcash.handleCallback] ${msg}`)
      res.status(204).send(msg)
      return
    }

    // Status 3 = Success according to BayarCash documentation
    if (status === 3 || status === '3') {
      booking.bayarcashPaymentId = transactionId
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

    // Payment failed or cancelled - delete booking
    await booking.deleteOne()
    res.sendStatus(200) // Always return 200 to BayarCash to stop retries
  } catch (err) {
    logger.error(`[bayarcash.handleCallback] ${i18n.t('ERROR')}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}
