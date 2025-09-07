import 'dotenv/config'
import { jest } from '@jest/globals'
import request from 'supertest'
import { nanoid } from 'nanoid'
import * as bookcarsTypes from ':bookcars-types'
import app from '../src/app'
import * as databaseHelper from '../src/utils/databaseHelper'
import * as testHelper from './testHelper'
import * as env from '../src/config/env.config'
import * as bayarcash from '../src/payment/bayarcash'
import Booking from '../src/models/Booking'
import User from '../src/models/User'
import Car from '../src/models/Car'

// Set environment before any imports
process.env.BC_BAYARCASH_API_SECRET = 'test_secret_key_for_checksum_validation_in_jest'

//
// Connecting and initializing the database before running the test suite
//
beforeAll(async () => {
  testHelper.initializeLogger()
  await databaseHelper.connect(env.DB_URI, false, false)
})

//
// Closing and cleaning the database connection after running the test suite
//
afterAll(async () => {
  await databaseHelper.close()
})

describe('BayarCash Integration', () => {
  let bookingId: string
  let userId: string
  let carId: string
  let supplierId: string

  beforeAll(async () => {
    // Create test data
    const supplier = new User({
      email: `bayarcash-supplier-${nanoid()}@bookcars.ma`,
      fullName: 'Test Supplier',
      language: 'en',
      type: bookcarsTypes.UserType.Supplier,
      verified: true,
    })
    await supplier.save()
    supplierId = (supplier._id as any).toString()

    const user = new User({
      email: `bayarcash-user-${nanoid()}@bookcars.ma`,
      fullName: 'Test User',
      language: 'en',
      type: bookcarsTypes.UserType.User,
      verified: true,
    })
    await user.save()
    userId = (user._id as any).toString()

    const car = new Car({
      name: 'Test Car',
      supplier: supplierId,
      minimumAge: 21,
      locations: [supplierId], // Must have at least one location
      dailyPrice: 50,
      deposit: 200,
      available: true,
      type: bookcarsTypes.CarType.Gasoline,
      gearbox: bookcarsTypes.GearboxType.Manual,
      aircon: true,
      image: null,
      seats: 5,
      doors: 4,
      fuelPolicy: bookcarsTypes.FuelPolicy.LikeForLike,
      mileage: 1000,
      cancellation: 0,
      amendments: 0,
      theftProtection: 0,
      collisionDamageWaiver: 0,
      fullInsurance: 0,
      additionalDriver: 0,
      range: bookcarsTypes.CarRange.Mini, // Use valid enum value
      multimedia: [],
      rating: 5, // Must be >= 1
      trips: 0,
    })
    await car.save()
    carId = (car._id as any).toString()

    const booking = new Booking({
      supplier: supplierId,
      car: carId,
      driver: userId,
      pickupLocation: supplierId,
      dropOffLocation: supplierId,
      from: new Date(),
      to: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: bookcarsTypes.BookingStatus.Void,
      price: 100,
      expireAt: new Date(Date.now() + 30 * 60 * 1000),
      isDeposit: false,
    })
    await booking.save()
    bookingId = booking._id.toString()
  })

  afterAll(async () => {
    // Clean up test data
    await Booking.deleteOne({ _id: bookingId })
    await Car.deleteOne({ _id: carId })
    await User.deleteOne({ _id: userId })
    await User.deleteOne({ _id: supplierId })
  })

  describe('Checksum Generation', () => {
    it('should generate correct checksum for payment intent', () => {
      const payload = {
        payment_channel: 1,
        order_number: bookingId,
        amount: 100,
        payer_name: 'Test User',
        payer_email: 'test@example.com',
      }

      const checksum = bayarcash.generateChecksum(payload)
      
      expect(checksum).toBeDefined()
      expect(typeof checksum).toBe('string')
      expect(checksum).toMatch(/^[a-f0-9]{64}$/) // SHA256 hex string
    })

    it('should generate correct checksum for transaction callback', () => {
      const payload = {
        record_type: 'transaction',
        transaction_id: 'trx_test123',
        exchange_reference_number: '1-757-123-456-789',
        exchange_transaction_id: '12345678901',
        order_number: bookingId,
        currency: 'MYR',
        amount: '100.00',
        payer_name: 'Test User',
        payer_email: 'test@example.com',
        payer_bank_name: 'Test Bank',
        status: '3',
        status_description: 'Approved',
        datetime: '2025-01-01 12:00:00',
      }

      const checksum = bayarcash.generateChecksum(payload)
      
      expect(checksum).toBeDefined()
      expect(typeof checksum).toBe('string')
      expect(checksum).toMatch(/^[a-f0-9]{64}$/) // SHA256 hex string
    })

    it('should generate different checksums for different data', () => {
      const payload1 = {
        payment_channel: 1,
        order_number: 'order1',
        amount: 100,
        payer_name: 'User1',
        payer_email: 'user1@example.com',
      }

      const payload2 = {
        payment_channel: 1,
        order_number: 'order2',
        amount: 100,
        payer_name: 'User1',
        payer_email: 'user1@example.com',
      }

      const checksum1 = bayarcash.generateChecksum(payload1)
      const checksum2 = bayarcash.generateChecksum(payload2)
      
      expect(checksum1).not.toBe(checksum2)
    })
  })

  describe('Checksum Validation', () => {
    it('should validate correct checksum for transaction callback', () => {
      const payload = {
        record_type: 'transaction',
        transaction_id: 'trx_test123',
        exchange_reference_number: '1-757-123-456-789',
        exchange_transaction_id: '12345678901',
        order_number: bookingId,
        currency: 'MYR',
        amount: '100.00',
        payer_name: 'Test User',
        payer_email: 'test@example.com',
        payer_bank_name: 'Test Bank',
        status: '3',
        status_description: 'Approved',
        datetime: '2025-01-01 12:00:00',
      }

      const checksum = bayarcash.generateChecksum(payload)
      const isValid = bayarcash.validateChecksum(payload, checksum)
      
      expect(isValid).toBe(true)
    })

    it('should reject invalid checksum', () => {
      const payload = {
        record_type: 'transaction',
        transaction_id: 'trx_test123',
        exchange_reference_number: '1-757-123-456-789',
        exchange_transaction_id: '12345678901',
        order_number: bookingId,
        currency: 'MYR',
        amount: '100.00',
        payer_name: 'Test User',
        payer_email: 'test@example.com',
        payer_bank_name: 'Test Bank',
        status: '3',
        status_description: 'Approved',
        datetime: '2025-01-01 12:00:00',
      }

      const invalidChecksum = 'invalid_checksum'
      const isValid = bayarcash.validateChecksum(payload, invalidChecksum)
      
      expect(isValid).toBe(false)
    })

    it('should skip validation for pre_transaction callbacks', () => {
      const payload = {
        record_type: 'pre_transaction',
        transaction_id: 'trx_test123',
        order_number: bookingId,
        checksum: 'any_checksum',
      }

      const isValid = bayarcash.validateChecksum(payload, 'any_checksum')
      
      expect(isValid).toBe(true)
    })
  })

  describe('POST /api/bayarcash/create-payment', () => {
    it('should create BayarCash payment intent', async () => {
      // Mock BayarCash API response
      jest.resetModules()
      await jest.unstable_mockModule('axios', () => ({
        default: {
          post: jest.fn(() =>
            Promise.resolve({
              data: {
                id: 'bc_payment_123',
                url: 'https://checkout.bayar.cash/bc_payment_123',
                amount: 100,
                currency: 'MYR',
                status: 'pending',
              },
            })
          ),
        },
      }))

      const payload = {
        bookingId,
        amount: 100,
        currency: 'MYR',
        paymentChannel: bayarcash.PAYMENT_CHANNELS.FPX,
        payerName: 'Test User',
        payerEmail: 'test@example.com',
        name: 'Car Rental',
        description: 'Test rental payment',
      }

      const res = await request(app)
        .post('/api/create-bayarcash-payment')
        .send(payload)

      expect(res.status).toBe(200)
      expect(res.body.paymentIntentId).toBeDefined()
      expect(res.body.paymentUrl).toBeDefined()
      expect(res.body.clientSecret).toBe(null)
    })

    it('should return 400 for missing required fields', async () => {
      const payload = {
        // Missing required fields
        amount: 100,
      }

      const res = await request(app)
        .post('/api/create-bayarcash-payment')
        .send(payload)

      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/bayarcash/callback', () => {
    it('should handle successful transaction callback', async () => {
      const payload = {
        record_type: 'transaction',
        transaction_id: 'trx_success123',
        exchange_reference_number: '1-757-123-456-789',
        exchange_transaction_id: '12345678901',
        order_number: bookingId,
        currency: 'MYR',
        amount: '100.00',
        payer_name: 'Test User',
        payer_email: 'test@example.com',
        payer_bank_name: 'Test Bank',
        status: '3', // SUCCESS
        status_description: 'Approved',
        datetime: '2025-01-01 12:00:00',
      }

      // Generate valid checksum
      const checksum = bayarcash.generateChecksum(payload)
      const payloadWithChecksum = { ...payload, checksum }

      const res = await request(app)
        .post('/api/bayarcash/callback')
        .send(payloadWithChecksum)

      expect(res.status).toBe(200)

      // Verify booking was updated
      const updatedBooking = await Booking.findById(bookingId)
      expect(updatedBooking?.bayarcashTransactionId).toBe('trx_success123')
      expect(updatedBooking?.status).toBe(bookcarsTypes.BookingStatus.Paid)
      expect(updatedBooking?.expireAt).toBeUndefined()
    })

    it('should handle failed transaction callback', async () => {
      const payload = {
        record_type: 'transaction',
        transaction_id: 'trx_failed123',
        exchange_reference_number: '1-757-123-456-789',
        exchange_transaction_id: '12345678901',
        order_number: bookingId,
        currency: 'MYR',
        amount: '100.00',
        payer_name: 'Test User',
        payer_email: 'test@example.com',
        payer_bank_name: 'Test Bank',
        status: '2', // FAILED
        status_description: 'Failed',
        datetime: '2025-01-01 12:00:00',
      }

      // Generate valid checksum
      const checksum = bayarcash.generateChecksum(payload)
      const payloadWithChecksum = { ...payload, checksum }

      const res = await request(app)
        .post('/api/bayarcash/callback')
        .send(payloadWithChecksum)

      expect(res.status).toBe(400)
      expect(res.text).toContain('failed')
    })

    it('should handle pre_transaction callback', async () => {
      const payload = {
        record_type: 'pre_transaction',
        exchange_reference_number: '1-757-123-456-789',
        order_number: bookingId,
        checksum: 'any_checksum_ignored',
        transaction_id: 'trx_pre123',
      }

      const res = await request(app)
        .post('/api/bayarcash/callback')
        .send(payload)

      expect(res.status).toBe(200)
    })

    it('should reject invalid checksum', async () => {
      const payload = {
        record_type: 'transaction',
        transaction_id: 'trx_invalid123',
        exchange_reference_number: '1-757-123-456-789',
        exchange_transaction_id: '12345678901',
        order_number: bookingId,
        currency: 'MYR',
        amount: '100.00',
        payer_name: 'Test User',
        payer_email: 'test@example.com',
        payer_bank_name: 'Test Bank',
        status: '3',
        status_description: 'Approved',
        datetime: '2025-01-01 12:00:00',
        checksum: 'invalid_checksum',
      }

      const res = await request(app)
        .post('/api/bayarcash/callback')
        .send(payload)

      expect(res.status).toBe(400)
      expect(res.text).toContain('Invalid checksum')
    })

    it('should handle already processed booking', async () => {
      // Update booking to be already processed
      await Booking.findByIdAndUpdate(bookingId, {
        bayarcashTransactionId: 'trx_processed123',
        status: bookcarsTypes.BookingStatus.Paid,
        $unset: { expireAt: 1 }
      })

      const payload = {
        record_type: 'transaction',
        transaction_id: 'trx_processed123',
        exchange_reference_number: '1-757-123-456-789',
        exchange_transaction_id: '12345678901',
        order_number: bookingId,
        currency: 'MYR',
        amount: '100.00',
        payer_name: 'Test User',
        payer_email: 'test@example.com',
        payer_bank_name: 'Test Bank',
        status: '3',
        status_description: 'Approved',
        datetime: '2025-01-01 12:00:00',
      }

      const checksum = bayarcash.generateChecksum(payload)
      const payloadWithChecksum = { ...payload, checksum }

      const res = await request(app)
        .post('/api/bayarcash/callback')
        .send(payloadWithChecksum)

      expect(res.status).toBe(200) // Should acknowledge duplicate callback
    })

    it('should handle missing booking', async () => {
      const payload = {
        record_type: 'transaction',
        transaction_id: 'trx_missing123',
        exchange_reference_number: '1-757-123-456-789',
        exchange_transaction_id: '12345678901',
        order_number: 'nonexistent_booking_id',
        currency: 'MYR',
        amount: '100.00',
        payer_name: 'Test User',
        payer_email: 'test@example.com',
        payer_bank_name: 'Test Bank',
        status: '3',
        status_description: 'Approved',
        datetime: '2025-01-01 12:00:00',
      }

      const checksum = bayarcash.generateChecksum(payload)
      const payloadWithChecksum = { ...payload, checksum }

      const res = await request(app)
        .post('/api/bayarcash/callback')
        .send(payloadWithChecksum)

      expect(res.status).toBe(204) // No content
    })
  })

  describe('POST /api/bayarcash/check-transaction/:bookingId/:transactionId', () => {
    it('should check transaction status', async () => {
      // Mock BayarCash API response
      jest.resetModules()
      await jest.unstable_mockModule('axios', () => ({
        default: {
          get: jest.fn(() =>
            Promise.resolve({
              data: {
                id: 'trx_check123',
                status: bayarcash.TRANSACTION_STATUS.SUCCESS,
                amount: 100,
                currency: 'MYR',
              },
            })
          ),
        },
      }))

      const res = await request(app)
        .post(`/api/check-bayarcash-transaction/${bookingId}/trx_check123`)

      expect(res.status).toBe(200)
    })

    it('should return 204 for missing booking', async () => {
      const res = await request(app)
        .post('/api/check-bayarcash-transaction/nonexistent_id/trx_123')

      expect(res.status).toBe(204)
    })
  })

  describe('Payment Constants', () => {
    it('should export payment channels', () => {
      expect(bayarcash.PAYMENT_CHANNELS.FPX).toBe(1)
      expect(bayarcash.PAYMENT_CHANNELS.MANUAL_TRANSFER).toBe(2)
      expect(bayarcash.PAYMENT_CHANNELS.DUITNOW_QR).toBe(6)
    })

    it('should export transaction status codes', () => {
      expect(bayarcash.TRANSACTION_STATUS.NEW).toBe(0)
      expect(bayarcash.TRANSACTION_STATUS.PENDING).toBe(1)
      expect(bayarcash.TRANSACTION_STATUS.FAILED).toBe(2)
      expect(bayarcash.TRANSACTION_STATUS.SUCCESS).toBe(3)
      expect(bayarcash.TRANSACTION_STATUS.CANCELLED).toBe(4)
    })
  })
})
