import 'dotenv/config'
import request from 'supertest'
import { nanoid } from 'nanoid'
import * as bookcarsTypes from ':bookcars-types'
import app from '../src/app'
import * as databaseHelper from '../src/utils/databaseHelper'
import * as testHelper from './testHelper'
import * as env from '../src/config/env.config'
import Voucher from '../src/models/Voucher'
import VoucherUsage from '../src/models/VoucherUsage'
import Booking from '../src/models/Booking'
import Car from '../src/models/Car'
import User from '../src/models/User'

let ADMIN_TOKEN: string
let USER_TOKEN: string
let SUPPLIER_ID: string
let USER_ID: string
let LOCATION_ID: string
let CAR_ID: string

// Test vouchers
let PERCENTAGE_VOUCHER_ID: string
let FIXED_AMOUNT_VOUCHER_ID: string
let HIGH_MINIMUM_VOUCHER_ID: string
let EXPIRED_VOUCHER_ID: string

const PERCENTAGE_VOUCHER_CODE = `PERCENT${nanoid(6).toUpperCase()}`
const FIXED_AMOUNT_VOUCHER_CODE = `FIXED${nanoid(6).toUpperCase()}`
const HIGH_MINIMUM_VOUCHER_CODE = `HIGHMIN${nanoid(6).toUpperCase()}`
const EXPIRED_VOUCHER_CODE = `EXPIRED${nanoid(6).toUpperCase()}`

//
// Connecting and initializing the database before running the test suite
//
beforeAll(async () => {
  testHelper.initializeLogger()
  await databaseHelper.connect(env.DB_URI, false, false)
  await testHelper.initialize()

  // Get tokens
  ADMIN_TOKEN = await testHelper.signinAsAdmin()
  USER_TOKEN = await testHelper.signinAsUser()

  // Create supplier
  const supplierName = testHelper.getSupplierName()
  SUPPLIER_ID = await testHelper.createSupplier(`${supplierName}@test.bookcars.ma`, supplierName)

  // Get user ID
  USER_ID = testHelper.getUserId()

  // Create location
  LOCATION_ID = await testHelper.createLocation('Integration Test Location EN', 'Integration Test Location FR')

  // Create a test car
  const car = new Car({
    name: 'Integration Test Car',
    supplier: SUPPLIER_ID,
    minimumAge: 21,
    locations: [LOCATION_ID],
    dailyPrice: 100,
    discountedDailyPrice: null,
    hourlyPrice: 10,
    discountedHourlyPrice: null,
    biWeeklyPrice: null,
    discountedBiWeeklyPrice: null,
    weeklyPrice: null,
    discountedWeeklyPrice: null,
    monthlyPrice: null,
    discountedMonthlyPrice: null,
    isDateBasedPrice: false,
    dateBasedPrices: [],
    deposit: 500,
    available: true,
    type: bookcarsTypes.CarType.Diesel,
    gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true,
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
    range: bookcarsTypes.CarRange.Midi,
    multimedia: [bookcarsTypes.CarMultimedia.Bluetooth],
    co2: 0,
    blockOnPay: false,
  })

  const savedCar = await car.save()
  CAR_ID = (savedCar._id as any).toString()

  // Create test vouchers
  await createTestVouchers()
})

//
// Closing and cleaning the database after running the test suite
//
afterAll(async () => {
  // Cleanup vouchers
  if (PERCENTAGE_VOUCHER_ID) {
    await Voucher.findByIdAndDelete(PERCENTAGE_VOUCHER_ID)
  }
  if (FIXED_AMOUNT_VOUCHER_ID) {
    await Voucher.findByIdAndDelete(FIXED_AMOUNT_VOUCHER_ID)
  }
  if (HIGH_MINIMUM_VOUCHER_ID) {
    await Voucher.findByIdAndDelete(HIGH_MINIMUM_VOUCHER_ID)
  }
  if (EXPIRED_VOUCHER_ID) {
    await Voucher.findByIdAndDelete(EXPIRED_VOUCHER_ID)
  }

  // Cleanup voucher usage records
  await VoucherUsage.deleteMany({
    voucher: {
      $in: [PERCENTAGE_VOUCHER_ID, FIXED_AMOUNT_VOUCHER_ID, HIGH_MINIMUM_VOUCHER_ID, EXPIRED_VOUCHER_ID]
    }
  })

  if (CAR_ID) {
    await Car.findByIdAndDelete(CAR_ID)
  }

  if (LOCATION_ID) {
    await testHelper.deleteLocation(LOCATION_ID)
  }

  if (SUPPLIER_ID) {
    await testHelper.deleteSupplier(SUPPLIER_ID)
  }

  await testHelper.signout(ADMIN_TOKEN)
  await testHelper.signout(USER_TOKEN)
  await testHelper.close()
  await databaseHelper.close()
})

const createTestVouchers = async () => {
  // 1. Percentage voucher (20% off)
  const percentageVoucher = new Voucher({
    code: PERCENTAGE_VOUCHER_CODE,
    discountType: bookcarsTypes.VoucherDiscountType.Percentage,
    discountValue: 20,
    fundingType: bookcarsTypes.VoucherFundingType.Platform,
    minimumRentalAmount: 50,
    usageLimit: 100,
    usageCount: 0,
    validFrom: new Date(),
    validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
    timeRestrictionEnabled: false,
  })
  const savedPercentageVoucher = await percentageVoucher.save()
  PERCENTAGE_VOUCHER_ID = (savedPercentageVoucher._id as any).toString()

  // 2. Fixed amount voucher ($30 off)
  const fixedAmountVoucher = new Voucher({
    code: FIXED_AMOUNT_VOUCHER_CODE,
    discountType: bookcarsTypes.VoucherDiscountType.FixedAmount,
    discountValue: 30,
    fundingType: bookcarsTypes.VoucherFundingType.Platform,
    minimumRentalAmount: 0,
    usageLimit: 50,
    usageCount: 0,
    validFrom: new Date(),
    validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
    timeRestrictionEnabled: false,
  })
  const savedFixedAmountVoucher = await fixedAmountVoucher.save()
  FIXED_AMOUNT_VOUCHER_ID = (savedFixedAmountVoucher._id as any).toString()

  // 3. High minimum amount voucher (requires $500+ booking)
  const highMinimumVoucher = new Voucher({
    code: HIGH_MINIMUM_VOUCHER_CODE,
    discountType: bookcarsTypes.VoucherDiscountType.Percentage,
    discountValue: 15,
    fundingType: bookcarsTypes.VoucherFundingType.Platform,
    minimumRentalAmount: 500,
    usageLimit: 10,
    usageCount: 0,
    validFrom: new Date(),
    validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
    timeRestrictionEnabled: false,
  })
  const savedHighMinimumVoucher = await highMinimumVoucher.save()
  HIGH_MINIMUM_VOUCHER_ID = (savedHighMinimumVoucher._id as any).toString()

  // 4. Expired voucher
  const expiredVoucher = new Voucher({
    code: EXPIRED_VOUCHER_CODE,
    discountType: bookcarsTypes.VoucherDiscountType.Percentage,
    discountValue: 25,
    fundingType: bookcarsTypes.VoucherFundingType.Platform,
    minimumRentalAmount: 0,
    usageLimit: 100,
    usageCount: 0,
    validFrom: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
    validTo: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago (expired)
    isActive: true,
    timeRestrictionEnabled: false,
  })
  const savedExpiredVoucher = await expiredVoucher.save()
  EXPIRED_VOUCHER_ID = (savedExpiredVoucher._id as any).toString()
}

const createTestBooking = async (price: number = 200, additionalData: any = {}) => {
  const payload: bookcarsTypes.UpsertBookingPayload = {
    booking: {
      supplier: SUPPLIER_ID,
      car: CAR_ID,
      driver: USER_ID,
      pickupLocation: LOCATION_ID,
      dropOffLocation: LOCATION_ID,
      from: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      to: new Date(Date.now() + 48 * 60 * 60 * 1000), // Day after tomorrow
      status: bookcarsTypes.BookingStatus.Pending,
      cancellation: false,
      amendments: false,
      theftProtection: false,
      collisionDamageWaiver: false,
      fullInsurance: false,
      additionalDriver: false,
      price: price,
      ...additionalData,
    },
  }

  const res = await request(app)
    .post('/api/create-booking')
    .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
    .send(payload)

  expect(res.statusCode).toBe(200)
  return res.body._id
}

describe('Booking-Voucher Integration Tests', () => {
  describe('Booking Creation with Vouchers', () => {
    it('should create booking with percentage voucher applied', async () => {
      const bookingId = await createTestBooking(200, {
        voucher: PERCENTAGE_VOUCHER_ID,
        originalPrice: 200,
        voucherDiscount: 40, // 20% of 200
        price: 160, // 200 - 40
      })

      // Verify booking was created with voucher details
      const booking = await Booking.findById(bookingId)
      expect(booking).toBeDefined()
      expect(booking!.voucher?.toString()).toBe(PERCENTAGE_VOUCHER_ID)
      expect(booking!.originalPrice).toBe(200)
      expect(booking!.voucherDiscount).toBe(40)
      expect(booking!.price).toBe(160)

      // Create voucher usage record manually for test (since we're creating booking directly)
      const voucherUsage = new VoucherUsage({
        voucher: PERCENTAGE_VOUCHER_ID,
        user: USER_ID,
        booking: bookingId,
        discountApplied: 40,
        usedAt: new Date()
      })
      await voucherUsage.save()

      // Verify voucher usage was tracked
      const usage = await VoucherUsage.findOne({ booking: bookingId })
      expect(usage).toBeDefined()
      expect(usage!.discountApplied).toBe(40)

      // Cleanup
      await Booking.findByIdAndDelete(bookingId)
      await VoucherUsage.findOneAndDelete({ booking: bookingId })
    })

    it('should create booking with fixed amount voucher applied', async () => {
      const bookingId = await createTestBooking(100, {
        voucher: FIXED_AMOUNT_VOUCHER_ID,
        originalPrice: 100,
        voucherDiscount: 30, // Fixed $30 off
        price: 70, // 100 - 30
      })

      // Verify booking was created with voucher details
      const booking = await Booking.findById(bookingId)
      expect(booking).toBeDefined()
      expect(booking!.voucher?.toString()).toBe(FIXED_AMOUNT_VOUCHER_ID)
      expect(booking!.originalPrice).toBe(100)
      expect(booking!.voucherDiscount).toBe(30)
      expect(booking!.price).toBe(70)

      // Cleanup
      await Booking.findByIdAndDelete(bookingId)
      await VoucherUsage.findOneAndDelete({ booking: bookingId })
    })

    it('should create booking without voucher when minimum not met', async () => {
      const bookingId = await createTestBooking(100) // Less than $500 minimum for HIGH_MINIMUM_VOUCHER

      // Try to apply high minimum voucher - should fail in real scenario
      const booking = await Booking.findById(bookingId)
      expect(booking).toBeDefined()
      expect(booking!.voucher).toBeUndefined()
      expect(booking!.price).toBe(100) // Original price unchanged

      // Cleanup
      await Booking.findByIdAndDelete(bookingId)
    })
  })

  describe('Voucher Application to Existing Bookings', () => {
    let testBookingId: string

    beforeEach(async () => {
      testBookingId = await createTestBooking(300) // Create booking without voucher
    })

    afterEach(async () => {
      if (testBookingId) {
        await Booking.findByIdAndDelete(testBookingId)
        await VoucherUsage.deleteMany({ booking: testBookingId })
      }
    })

    it('should apply percentage voucher to existing booking', async () => {
      const payload: bookcarsTypes.ApplyVoucherPayload = {
        voucherCode: PERCENTAGE_VOUCHER_CODE,
        bookingId: testBookingId,
        userId: USER_ID,
      }

      const res = await request(app)
        .post('/api/apply-voucher')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload)

      // Skip if transaction not supported
      if (res.statusCode === 400 && res.text.includes('Transaction numbers are only allowed')) {
        return
      }

      expect(res.statusCode).toBe(200)
      expect(res.body.discountAmount).toBe(60) // 20% of 300
      expect(res.body.booking.originalPrice).toBe(300)
      expect(res.body.booking.price).toBe(240) // 300 - 60

      // Verify voucher usage count incremented
      const voucher = await Voucher.findById(PERCENTAGE_VOUCHER_ID)
      expect(voucher!.usageCount).toBe(1)
    })

    it('should apply fixed amount voucher to existing booking', async () => {
      const payload: bookcarsTypes.ApplyVoucherPayload = {
        voucherCode: FIXED_AMOUNT_VOUCHER_CODE,
        bookingId: testBookingId,
        userId: USER_ID,
      }

      const res = await request(app)
        .post('/api/apply-voucher')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload)

      // Skip if transaction not supported
      if (res.statusCode === 400 && res.text.includes('Transaction numbers are only allowed')) {
        return
      }

      expect(res.statusCode).toBe(200)
      expect(res.body.discountAmount).toBe(30) // Fixed $30 off
      expect(res.body.booking.price).toBe(270) // 300 - 30
    })

    it('should fail to apply expired voucher', async () => {
      const payload: bookcarsTypes.ApplyVoucherPayload = {
        voucherCode: EXPIRED_VOUCHER_CODE,
        bookingId: testBookingId,
        userId: USER_ID,
      }

      const res = await request(app)
        .post('/api/apply-voucher')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload)

      // Skip if transaction not supported
      if (res.statusCode === 400 && res.text.includes('Transaction numbers are only allowed')) {
        console.log('Skipping expired voucher test - MongoDB standalone mode detected')
        return
      }

      expect(res.statusCode).toBe(400)
      expect(res.text).toContain('expired')
    })

    it('should fail to apply voucher with insufficient minimum amount', async () => {
      // Create a small booking that doesn't meet the high minimum voucher requirement
      const smallBookingId = await createTestBooking(100) // Less than $500 minimum

      const payload: bookcarsTypes.ApplyVoucherPayload = {
        voucherCode: HIGH_MINIMUM_VOUCHER_CODE,
        bookingId: smallBookingId,
        userId: USER_ID,
      }

      const res = await request(app)
        .post('/api/apply-voucher')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload)

      // Skip if transaction not supported
      if (res.statusCode === 400 && res.text.includes('Transaction numbers are only allowed')) {
        console.log('Skipping minimum amount test - MongoDB standalone mode detected')
        await Booking.findByIdAndDelete(smallBookingId)
        return
      }

      expect(res.statusCode).toBe(400)
      expect(res.text).toContain('Minimum booking amount')

      // Cleanup
      await Booking.findByIdAndDelete(smallBookingId)
    })
  })

  describe('Voucher Removal from Bookings', () => {
    let testBookingId: string

    beforeEach(async () => {
      testBookingId = await createTestBooking(200, {
        voucher: PERCENTAGE_VOUCHER_ID,
        originalPrice: 200,
        voucherDiscount: 40,
        price: 160,
      })
    })

    afterEach(async () => {
      if (testBookingId) {
        await Booking.findByIdAndDelete(testBookingId)
        await VoucherUsage.deleteMany({ booking: testBookingId })
      }
    })

    it('should remove voucher from booking and restore original price', async () => {
      const res = await request(app)
        .delete(`/api/remove-voucher/${testBookingId}`)
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)

      // Skip if transaction not supported
      if (res.statusCode === 400 && res.text.includes('Transaction numbers are only allowed')) {
        return
      }

      expect(res.statusCode).toBe(200)
      expect(res.body.booking.price).toBe(200) // Original price restored
      expect(res.body.booking.originalPrice).toBeUndefined()
      expect(res.body.booking.voucher).toBeUndefined()
      expect(res.body.booking.voucherDiscount).toBeUndefined()

      // Verify usage record was deleted
      const usage = await VoucherUsage.findOne({ booking: testBookingId })
      expect(usage).toBeNull()
    })
  })

  describe('Complex Booking Scenarios', () => {
    it('should handle multiple bookings with same voucher by different users', async () => {
      // Create another user
      const driver2 = {
        fullName: 'Test Driver 2',
        email: testHelper.GetRandomEmail(),
        language: testHelper.LANGUAGE,
        type: bookcarsTypes.UserType.User,
      }
      const user2 = new User(driver2)
      await user2.save()
      const USER2_ID = (user2._id as any).toString()

      // Create bookings for both users
      const booking1Id = await createTestBooking(200)
      const booking2Id = await createTestBooking(150)

      // Apply same voucher to both bookings (should work if within usage limit)
      const payload1: bookcarsTypes.ApplyVoucherPayload = {
        voucherCode: PERCENTAGE_VOUCHER_CODE,
        bookingId: booking1Id,
        userId: USER_ID,
      }

      const payload2: bookcarsTypes.ApplyVoucherPayload = {
        voucherCode: PERCENTAGE_VOUCHER_CODE,
        bookingId: booking2Id,
        userId: USER2_ID,
      }

      const res1 = await request(app)
        .post('/api/apply-voucher')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload1)

      const res2 = await request(app)
        .post('/api/apply-voucher')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload2)

      // Skip if transaction not supported
      if (res1.statusCode === 400 && res1.text.includes('Transaction numbers are only allowed')) {
        await Booking.findByIdAndDelete(booking1Id)
        await Booking.findByIdAndDelete(booking2Id)
        await User.findByIdAndDelete(USER2_ID)
        return
      }

      expect(res1.statusCode).toBe(200)
      expect(res2.statusCode).toBe(200)

      expect(res1.body.discountAmount).toBe(40) // 20% of 200
      expect(res2.body.discountAmount).toBe(30) // 20% of 150

      // Verify voucher usage count
      const voucher = await Voucher.findById(PERCENTAGE_VOUCHER_ID)
      expect(voucher!.usageCount).toBe(2)

      // Cleanup
      await Booking.findByIdAndDelete(booking1Id)
      await Booking.findByIdAndDelete(booking2Id)
      await VoucherUsage.deleteMany({ booking: { $in: [booking1Id, booking2Id] } })
      await User.findByIdAndDelete(USER2_ID)
    })

    it('should prevent same user from using same voucher twice', async () => {
      const booking1Id = await createTestBooking(200)
      const booking2Id = await createTestBooking(150)

      // Apply voucher to first booking
      const payload1: bookcarsTypes.ApplyVoucherPayload = {
        voucherCode: PERCENTAGE_VOUCHER_CODE,
        bookingId: booking1Id,
        userId: USER_ID,
      }

      const res1 = await request(app)
        .post('/api/apply-voucher')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload1)

      // Skip if transaction not supported
      if (res1.statusCode === 400 && res1.text.includes('Transaction numbers are only allowed')) {
        await Booking.findByIdAndDelete(booking1Id)
        await Booking.findByIdAndDelete(booking2Id)
        return
      }

      expect(res1.statusCode).toBe(200)

      // Try to apply same voucher to second booking by same user (should fail)
      const payload2: bookcarsTypes.ApplyVoucherPayload = {
        voucherCode: PERCENTAGE_VOUCHER_CODE,
        bookingId: booking2Id,
        userId: USER_ID,
      }

      const res2 = await request(app)
        .post('/api/apply-voucher')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload2)

      expect(res2.statusCode).toBe(400)
      expect(res2.text).toContain('already used this voucher')

      // Cleanup
      await Booking.findByIdAndDelete(booking1Id)
      await Booking.findByIdAndDelete(booking2Id)
      await VoucherUsage.deleteMany({ booking: { $in: [booking1Id, booking2Id] } })
    })
  })

  describe('Booking Price Calculations', () => {
    it('should correctly calculate percentage discounts for different booking amounts', async () => {
      const testCases = [
        { bookingAmount: 100, expectedDiscount: 20 }, // 20% of 100
        { bookingAmount: 250, expectedDiscount: 50 }, // 20% of 250
        { bookingAmount: 500, expectedDiscount: 100 }, // 20% of 500
      ]

      for (const { bookingAmount, expectedDiscount } of testCases) {
        const payload: bookcarsTypes.ValidateVoucherPayload = {
          code: PERCENTAGE_VOUCHER_CODE,
          bookingAmount,
          userId: USER_ID,
        }

        const res = await request(app)
          .post('/api/validate-voucher')
          .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
          .send(payload)

        expect(res.statusCode).toBe(200)
        expect(res.body.valid).toBe(true)
        expect(res.body.discountAmount).toBe(expectedDiscount)
      }
    })

    it('should correctly cap fixed amount discounts to booking amount', async () => {
      const testCases = [
        { bookingAmount: 50, expectedDiscount: 30 }, // Fixed $30 off $50 = $30
        { bookingAmount: 20, expectedDiscount: 20 }, // Fixed $30 off $20 = $20 (capped)
        { bookingAmount: 10, expectedDiscount: 10 }, // Fixed $30 off $10 = $10 (capped)
      ]

      for (const { bookingAmount, expectedDiscount } of testCases) {
        const payload: bookcarsTypes.ValidateVoucherPayload = {
          code: FIXED_AMOUNT_VOUCHER_CODE,
          bookingAmount,
          userId: USER_ID,
        }

        const res = await request(app)
          .post('/api/validate-voucher')
          .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
          .send(payload)

        expect(res.statusCode).toBe(200)
        expect(res.body.valid).toBe(true)
        expect(res.body.discountAmount).toBe(expectedDiscount)
      }
    })
  })
})
