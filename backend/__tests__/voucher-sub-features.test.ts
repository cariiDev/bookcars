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
import Car from '../src/models/Car'

let ADMIN_TOKEN: string
let USER_TOKEN: string
let SUPPLIER_ID: string
let USER_ID: string
let LOCATION_ID: string

// Test Cars
let BEZZA_CAR_ID: string
let SAGA_CAR_ID: string
let BMW_CAR_ID: string

// Test Vouchers
let NEW_USER_VOUCHER_ID: string
let MORNING_PROMO_VOUCHER_ID: string
let RENT5_GET1_VOUCHER_ID: string
let WEEKDAY_VOUCHER_ID: string

const NEW_USER_CODE = `NEWUSER${nanoid(6).toUpperCase()}`
const MORNING_PROMO_CODE = `MORNING${nanoid(6).toUpperCase()}`
const RENT5_GET1_CODE = `RENT5GET1${nanoid(6).toUpperCase()}`
const WEEKDAY_CODE = `WEEKDAY${nanoid(6).toUpperCase()}`

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
  LOCATION_ID = await testHelper.createLocation('Sub-Feature Test Location EN', 'Sub-Feature Test Location FR')

  // Create test cars
  await createTestCars()

  // Create test vouchers
  await createTestVouchers()
})

//
// Closing and cleaning the database after running the test suite
//
afterAll(async () => {
  // Cleanup vouchers
  if (NEW_USER_VOUCHER_ID) {
    await Voucher.findByIdAndDelete(NEW_USER_VOUCHER_ID)
  }
  if (MORNING_PROMO_VOUCHER_ID) {
    await Voucher.findByIdAndDelete(MORNING_PROMO_VOUCHER_ID)
  }
  if (RENT5_GET1_VOUCHER_ID) {
    await Voucher.findByIdAndDelete(RENT5_GET1_VOUCHER_ID)
  }
  if (WEEKDAY_VOUCHER_ID) {
    await Voucher.findByIdAndDelete(WEEKDAY_VOUCHER_ID)
  }

  // Cleanup cars
  if (BEZZA_CAR_ID) {
    await Car.findByIdAndDelete(BEZZA_CAR_ID)
  }
  if (SAGA_CAR_ID) {
    await Car.findByIdAndDelete(SAGA_CAR_ID)
  }
  if (BMW_CAR_ID) {
    await Car.findByIdAndDelete(BMW_CAR_ID)
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

const createTestCars = async () => {
  // Create Bezza car
  const bezzaCar = new Car({
    name: 'Perodua Bezza',
    supplier: SUPPLIER_ID,
    minimumAge: 21,
    locations: [LOCATION_ID],
    dailyPrice: 50,
    hourlyPrice: 8, // RM8 per hour
    deposit: 200,
    available: true,
    type: bookcarsTypes.CarType.Diesel,
    gearbox: bookcarsTypes.GearboxType.Manual,
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
    range: bookcarsTypes.CarRange.Mini,
    multimedia: [bookcarsTypes.CarMultimedia.Bluetooth],
    co2: 0,
    blockOnPay: false,
    // Additional field to identify car model for voucher restrictions
    carModel: 'Bezza'
  })
  const savedBezza = await bezzaCar.save()
  BEZZA_CAR_ID = (savedBezza._id as any).toString()

  // Create Saga car
  const sagaCar = new Car({
    name: 'Proton Saga',
    supplier: SUPPLIER_ID,
    minimumAge: 21,
    locations: [LOCATION_ID],
    dailyPrice: 55,
    hourlyPrice: 9, // RM9 per hour
    deposit: 200,
    available: true,
    type: bookcarsTypes.CarType.Diesel,
    gearbox: bookcarsTypes.GearboxType.Manual,
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
    range: bookcarsTypes.CarRange.Mini,
    multimedia: [bookcarsTypes.CarMultimedia.Bluetooth],
    co2: 0,
    blockOnPay: false,
    carModel: 'Saga'
  })
  const savedSaga = await sagaCar.save()
  SAGA_CAR_ID = (savedSaga._id as any).toString()

  // Create BMW car (not eligible for New User Programme)
  const bmwCar = new Car({
    name: 'BMW X1',
    supplier: SUPPLIER_ID,
    minimumAge: 21,
    locations: [LOCATION_ID],
    dailyPrice: 150,
    hourlyPrice: 20, // RM20 per hour
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
    carModel: 'BMW X1'
  })
  const savedBMW = await bmwCar.save()
  BMW_CAR_ID = (savedBMW._id as any).toString()
}

const createTestVouchers = async () => {
  // 1. New User Programme: Free Hours + Car Restriction
  const newUserVoucher = new Voucher({
    code: NEW_USER_CODE,
    discountType: bookcarsTypes.VoucherDiscountType.FreeHours, // New enum value needed
    discountValue: 2, // 2 hours off
    fundingType: bookcarsTypes.VoucherFundingType.Platform,
    minimumRentalAmount: 0,
    usageLimit: 1000,
    usageCount: 0,
    validFrom: new Date(),
    validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
    timeRestrictionEnabled: false,

    // New fields for sub-features
    allowedCarModels: ['Bezza', 'Saga'], // Car restriction
    maxUsesPerUser: 1, // One time use only
    freeHoursAmount: 2 // 2 free hours
  })
  const savedNewUser = await newUserVoucher.save()
  NEW_USER_VOUCHER_ID = (savedNewUser._id as any).toString()

  // 2. Morning Bookings Promo: Time-based Price Reduction
  const morningPromoVoucher = new Voucher({
    code: MORNING_PROMO_CODE,
    discountType: bookcarsTypes.VoucherDiscountType.HourlyPriceReduction,
    discountValue: 3, // RM3 off per hour
    fundingType: bookcarsTypes.VoucherFundingType.CoFunded,
    minimumRentalAmount: 0,
    usageLimit: 500,
    usageCount: 0,
    validFrom: new Date(),
    validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
    timeRestrictionEnabled: true,

    // Time-based pricing (11PM - 10AM gets RM3 off per hour)
    allowedTimeSlots: [
      { startHour: 23, endHour: 23 }, // 11PM - 11:59PM
      { startHour: 0, endHour: 10 } // 12AM - 10AM
    ],
    isStackable: true, // Can be combined with other promos
  })
  const savedMorningPromo = await morningPromoVoucher.save()
  MORNING_PROMO_VOUCHER_ID = (savedMorningPromo._id as any).toString()

  // 3. Rent 5 Get 1: Duration-based Free Hours
  const rent5Get1Voucher = new Voucher({
    code: RENT5_GET1_CODE,
    discountType: bookcarsTypes.VoucherDiscountType.DurationBasedFreeHours,
    discountValue: 1, // 1 free hour for every 6 hours rented
    fundingType: bookcarsTypes.VoucherFundingType.CoFunded,
    minimumRentalAmount: 0,
    usageLimit: 300,
    usageCount: 0,
    validFrom: new Date(),
    validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
    timeRestrictionEnabled: false,

    // Duration-based logic
    minimumRentalHours: 6, // Must rent at least 6 hours
    freeHoursRatio: { rent: 5, free: 1 }, // For every 5 hours, get 1 free
    deductCheapestHours: true, // Deduct from cheapest time slots first
    isStackable: true, // Can be combined with other promos
  })
  const savedRent5Get1 = await rent5Get1Voucher.save()
  RENT5_GET1_VOUCHER_ID = (savedRent5Get1._id as any).toString()

  // 4. Weekday Trips: Day-based Percentage with Minimum
  const weekdayVoucher = new Voucher({
    code: WEEKDAY_CODE,
    discountType: bookcarsTypes.VoucherDiscountType.Percentage,
    discountValue: 30, // 30% off
    fundingType: bookcarsTypes.VoucherFundingType.Platform,
    minimumRentalAmount: 100, // Must achieve minimum rental
    usageLimit: 200,
    usageCount: 0,
    validFrom: new Date(),
    validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
    timeRestrictionEnabled: true,

    // Weekdays only (Monday-Friday)
    allowedDaysOfWeek: [1, 2, 3, 4, 5],
  })
  const savedWeekday = await weekdayVoucher.save()
  WEEKDAY_VOUCHER_ID = (savedWeekday._id as any).toString()
}

describe('Voucher Sub-Features Tests', () => {
  describe('1. New User Programme - Free Hours + Car Restriction', () => {
    it('should apply 2 free hours to Bezza booking', async () => {
      const payload: bookcarsTypes.ValidateVoucherPayload = {
        code: NEW_USER_CODE,
        bookingAmount: 80, // 10 hours * RM8 = RM80
        userId: USER_ID,
        carId: BEZZA_CAR_ID, // Eligible car
        bookingStartTime: new Date(2025, 0, 15, 10, 0, 0).toISOString(), // Wednesday 10:00 AM
        bookingEndTime: new Date(2025, 0, 15, 20, 0, 0).toISOString(), // Wednesday 8:00 PM (10 hours)
      }

      const res = await request(app)
        .post('/api/validate-voucher')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload)

      expect(res.statusCode).toBe(200)
      expect(res.body.valid).toBe(true)
      expect(res.body.freeHoursDeducted).toBe(2) // 2 hours free
      expect(res.body.newRentalDuration).toBe(8) // 10 - 2 = 8 hours
      expect(res.body.finalAmount).toBe(64) // 8 hours * RM8 = RM64
      expect(res.body.savings).toBe(16) // 2 hours * RM8 = RM16 saved
    })

    it('should apply 2 free hours to Saga booking', async () => {
      const payload: bookcarsTypes.ValidateVoucherPayload = {
        code: NEW_USER_CODE,
        bookingAmount: 90, // 10 hours * RM9 = RM90
        userId: USER_ID,
        carId: SAGA_CAR_ID, // Eligible car
        bookingStartTime: new Date(2025, 0, 15, 10, 0, 0).toISOString(),
        bookingEndTime: new Date(2025, 0, 15, 20, 0, 0).toISOString(), // 10 hours
      }

      const res = await request(app)
        .post('/api/validate-voucher')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload)

      expect(res.statusCode).toBe(200)
      expect(res.body.valid).toBe(true)
      expect(res.body.freeHoursDeducted).toBe(2)
      expect(res.body.newRentalDuration).toBe(8)
      expect(res.body.finalAmount).toBe(72) // 8 hours * RM9 = RM72
      expect(res.body.savings).toBe(18) // 2 hours * RM9 = RM18 saved
    })

    it('should reject voucher for BMW (not eligible car)', async () => {
      const payload: bookcarsTypes.ValidateVoucherPayload = {
        code: NEW_USER_CODE,
        bookingAmount: 200, // 10 hours * RM20 = RM200
        userId: USER_ID,
        carId: BMW_CAR_ID, // Not eligible
        bookingStartTime: new Date(2025, 0, 15, 10, 0, 0).toISOString(),
        bookingEndTime: new Date(2025, 0, 15, 20, 0, 0).toISOString(),
      }

      const res = await request(app)
        .post('/api/validate-voucher')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload)

      expect(res.statusCode).toBe(200)
      expect(res.body.valid).toBe(false)
      expect(res.body.message).toBe('This voucher is only valid for Bezza and Saga cars')
    })

    it('should prevent second usage by same user (one time only)', async () => {
      // First, simulate the user has already used this voucher
      const existingUsage = new VoucherUsage({
        voucher: NEW_USER_VOUCHER_ID,
        user: USER_ID,
        booking: testHelper.GetRandromObjectIdAsString(),
        discountApplied: 16,
        usedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Used yesterday
      })
      await existingUsage.save()

      const payload: bookcarsTypes.ValidateVoucherPayload = {
        code: NEW_USER_CODE,
        bookingAmount: 80,
        userId: USER_ID,
        carId: BEZZA_CAR_ID,
        bookingStartTime: new Date(2025, 0, 15, 10, 0, 0).toISOString(),
        bookingEndTime: new Date(2025, 0, 15, 20, 0, 0).toISOString(),
      }

      const res = await request(app)
        .post('/api/validate-voucher')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload)

      expect(res.statusCode).toBe(200)
      expect(res.body.valid).toBe(false)
      expect(res.body.message).toBe('This voucher is limited to one use per user')

      // Cleanup
      await VoucherUsage.findByIdAndDelete(existingUsage._id)
    })
  })

  describe('2. Morning Bookings Promo - Time-based Price Reduction', () => {
    it('should apply RM3 discount for hours within 11PM-10AM window', async () => {
      const payload: bookcarsTypes.ValidateVoucherPayload = {
        code: MORNING_PROMO_CODE,
        bookingAmount: 80, // 10 hours * RM8 = RM80
        userId: USER_ID,
        carId: BEZZA_CAR_ID,
        bookingStartTime: new Date(2025, 0, 15, 8, 0, 0).toISOString(), // 8:00 AM
        bookingEndTime: new Date(2025, 0, 15, 14, 0, 0).toISOString(), // 2:00 PM (6 hours total)
      }

      const res = await request(app)
        .post('/api/validate-voucher')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload)

      expect(res.statusCode).toBe(200)
      expect(res.body.valid).toBe(true)
      // 8AM-10AM = 2 hours eligible for RM3 discount
      // 10AM-2PM = 4 hours regular price
      expect(res.body.eligibleHours).toBe(2) // 8AM-10AM
      expect(res.body.discountAmount).toBe(6) // 2 hours * RM3 = RM6
      expect(res.body.finalAmount).toBe(74) // RM80 - RM6 = RM74
    })

    it('should apply RM3 discount for overnight booking spanning eligible hours', async () => {
      const payload: bookcarsTypes.ValidateVoucherPayload = {
        code: MORNING_PROMO_CODE,
        bookingAmount: 180, // 9 hours * RM20 = RM180 (BMW)
        userId: USER_ID,
        carId: BMW_CAR_ID,
        bookingStartTime: new Date(2025, 0, 15, 22, 0, 0).toISOString(), // 10:00 PM
        bookingEndTime: new Date(2025, 0, 16, 7, 0, 0).toISOString(), // 7:00 AM next day (9 hours)
      }

      const res = await request(app)
        .post('/api/validate-voucher')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload)

      expect(res.statusCode).toBe(200)
      expect(res.body.valid).toBe(true)
      // 10PM-11PM = 1 hour regular price
      // 11PM-7AM = 8 hours eligible for RM3 discount
      expect(res.body.eligibleHours).toBe(8)
      expect(res.body.discountAmount).toBe(24) // 8 hours * RM3 = RM24
      expect(res.body.finalAmount).toBe(156) // RM180 - RM24 = RM156
    })

    it('should not apply discount for booking outside eligible hours', async () => {
      const payload: bookcarsTypes.ValidateVoucherPayload = {
        code: MORNING_PROMO_CODE,
        bookingAmount: 80, // 4 hours * RM20 = RM80
        userId: USER_ID,
        carId: BMW_CAR_ID,
        bookingStartTime: new Date(2025, 0, 15, 14, 0, 0).toISOString(), // 2:00 PM
        bookingEndTime: new Date(2025, 0, 15, 18, 0, 0).toISOString(), // 6:00 PM (4 hours)
      }

      const res = await request(app)
        .post('/api/validate-voucher')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload)

      expect(res.statusCode).toBe(200)
      expect(res.body.valid).toBe(false)
      expect(res.body.message).toBe('No hours in this booking qualify for the morning promo discount')
    })
  })

  describe('3. Rent 5 Get 1 - Duration-based Free Hours', () => {
    it('should give 1 free hour for 6-hour booking', async () => {
      const payload: bookcarsTypes.ValidateVoucherPayload = {
        code: RENT5_GET1_CODE,
        bookingAmount: 48, // 6 hours * RM8 = RM48
        userId: USER_ID,
        carId: BEZZA_CAR_ID,
        bookingStartTime: new Date(2025, 0, 15, 10, 0, 0).toISOString(), // 10:00 AM
        bookingEndTime: new Date(2025, 0, 15, 16, 0, 0).toISOString(), // 4:00 PM (6 hours)
      }

      const res = await request(app)
        .post('/api/validate-voucher')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload)

      expect(res.statusCode).toBe(200)
      expect(res.body.valid).toBe(true)
      expect(res.body.freeHours).toBe(1) // 6 hours = 1 free hour
      expect(res.body.finalRentalHours).toBe(5) // 6 - 1 = 5 hours charged
      expect(res.body.finalAmount).toBe(40) // 5 hours * RM8 = RM40
      expect(res.body.savings).toBe(8) // 1 hour * RM8 = RM8 saved
    })

    it('should give 3 free hours for 18-hour booking and deduct cheapest hours', async () => {
      const payload: bookcarsTypes.ValidateVoucherPayload = {
        code: RENT5_GET1_CODE,
        bookingAmount: 144, // 18 hours * RM8 = RM144
        userId: USER_ID,
        carId: BEZZA_CAR_ID,
        bookingStartTime: new Date(2025, 0, 15, 9, 0, 0).toISOString(), // 9:00 AM
        bookingEndTime: new Date(2025, 0, 16, 3, 0, 0).toISOString(), // 3:00 AM next day (18 hours)
        // This should also test interaction with Morning Promo if stackable
      }

      const res = await request(app)
        .post('/api/validate-voucher')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload)

      expect(res.statusCode).toBe(200)
      expect(res.body.valid).toBe(true)
      expect(res.body.freeHours).toBe(3) // 18 hours = 3 free hours (18/6 = 3)
      expect(res.body.finalRentalHours).toBe(15) // 18 - 3 = 15 hours charged

      // Should deduct cheapest hours first (considering morning promo discounts)
      expect(res.body.deductedHours).toEqual([
        { hour: '09:00-10:00', originalRate: 8, discountedRate: 5 }, // Morning promo applied
        { hour: '23:00-00:00', originalRate: 8, discountedRate: 5 }, // Morning promo applied
        { hour: '00:00-01:00', originalRate: 8, discountedRate: 5 } // Morning promo applied
      ])
    })

    it('should not apply for booking less than 6 hours', async () => {
      const payload: bookcarsTypes.ValidateVoucherPayload = {
        code: RENT5_GET1_CODE,
        bookingAmount: 40, // 5 hours * RM8 = RM40
        userId: USER_ID,
        carId: BEZZA_CAR_ID,
        bookingStartTime: new Date(2025, 0, 15, 10, 0, 0).toISOString(),
        bookingEndTime: new Date(2025, 0, 15, 15, 0, 0).toISOString(), // 5 hours
      }

      const res = await request(app)
        .post('/api/validate-voucher')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload)

      expect(res.statusCode).toBe(200)
      expect(res.body.valid).toBe(false)
      expect(res.body.message).toBe('This promo requires a minimum booking of 6 hours')
    })
  })

  describe('4. Weekday Trips - Day-based Percentage with Minimum', () => {
    it('should apply 30% discount on weekday booking above minimum', async () => {
      const payload: bookcarsTypes.ValidateVoucherPayload = {
        code: WEEKDAY_CODE,
        bookingAmount: 160, // 8 hours * RM20 = RM160
        userId: USER_ID,
        carId: BMW_CAR_ID,
        bookingStartTime: new Date(2025, 0, 15, 10, 0, 0).toISOString(), // Wednesday
        bookingEndTime: new Date(2025, 0, 15, 18, 0, 0).toISOString(), // Wednesday (8 hours)
      }

      const res = await request(app)
        .post('/api/validate-voucher')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload)

      expect(res.statusCode).toBe(200)
      expect(res.body.valid).toBe(true)
      expect(res.body.discountPercentage).toBe(30)
      expect(res.body.discountAmount).toBe(48) // 30% of RM160 = RM48
      expect(res.body.finalAmount).toBe(112) // RM160 - RM48 = RM112
    })

    it('should reject weekday voucher for weekend booking', async () => {
      const payload: bookcarsTypes.ValidateVoucherPayload = {
        code: WEEKDAY_CODE,
        bookingAmount: 160,
        userId: USER_ID,
        carId: BMW_CAR_ID,
        bookingStartTime: new Date(2025, 0, 12, 10, 0, 0).toISOString(), // Sunday
        bookingEndTime: new Date(2025, 0, 12, 18, 0, 0).toISOString(), // Sunday
      }

      const res = await request(app)
        .post('/api/validate-voucher')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload)

      expect(res.statusCode).toBe(200)
      expect(res.body.valid).toBe(false)
      expect(res.body.message).toBe('This voucher is only valid for weekday bookings (Monday-Friday)')
    })

    it('should reject weekday voucher for booking below minimum amount', async () => {
      const payload: bookcarsTypes.ValidateVoucherPayload = {
        code: WEEKDAY_CODE,
        bookingAmount: 80, // Below RM100 minimum
        userId: USER_ID,
        carId: BEZZA_CAR_ID,
        bookingStartTime: new Date(2025, 0, 15, 10, 0, 0).toISOString(), // Wednesday
        bookingEndTime: new Date(2025, 0, 15, 20, 0, 0).toISOString(), // Wednesday
      }

      const res = await request(app)
        .post('/api/validate-voucher')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload)

      expect(res.statusCode).toBe(200)
      expect(res.body.valid).toBe(false)
      expect(res.body.message).toBe('This voucher requires a minimum booking amount of RM100')
    })
  })

  describe('5. Stackable Promo Combinations', () => {
    it('should combine Morning Promo + Rent 5 Get 1 for maximum savings', async () => {
      // 18-hour booking from 9AM to 3AM next day
      const payload: bookcarsTypes.ValidateStackableVouchersPayload = {
        voucherCodes: [MORNING_PROMO_CODE, RENT5_GET1_CODE],
        bookingAmount: 144, // 18 hours * RM8 = RM144
        userId: USER_ID,
        carId: BEZZA_CAR_ID,
        bookingStartTime: new Date(2025, 0, 15, 9, 0, 0).toISOString(), // 9:00 AM
        bookingEndTime: new Date(2025, 0, 16, 3, 0, 0).toISOString(), // 3:00 AM next day
      }

      const res = await request(app)
        .post('/api/validate-stackable-vouchers')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload)

      expect(res.statusCode).toBe(200)
      expect(res.body.valid).toBe(true)
      expect(res.body.totalSavings).toBe(30) // Correct calculation: 15 + 15 = 30

      // Should show breakdown of each promo's contribution
      expect(res.body.promoBreakdown).toHaveLength(2)
      expect(res.body.promoBreakdown[0].promoName).toBe('Morning Bookings Promo')
      expect(res.body.promoBreakdown[0].savings).toBe(15) // 5 eligible hours * RM3 = RM15

      expect(res.body.promoBreakdown[1].promoName).toBe('Rent 5 Get 1')
      expect(res.body.promoBreakdown[1].freeHours).toBe(3)
      expect(res.body.promoBreakdown[1].savings).toBe(15) // 3 cheapest discounted hours * RM5 = RM15

      expect(res.body.finalAmount).toBe(114) // RM144 - RM30 = RM114
    })

    it('should not stack non-stackable promos', async () => {
      const payload: bookcarsTypes.ValidateStackableVouchersPayload = {
        voucherCodes: [NEW_USER_CODE, WEEKDAY_CODE], // New User is not stackable
        bookingAmount: 144,
        userId: USER_ID,
        carId: BEZZA_CAR_ID,
        bookingStartTime: new Date(2025, 0, 15, 9, 0, 0).toISOString(),
        bookingEndTime: new Date(2025, 0, 16, 3, 0, 0).toISOString(),
      }

      const res = await request(app)
        .post('/api/validate-stackable-vouchers')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload)

      expect(res.statusCode).toBe(200)
      expect(res.body.valid).toBe(false)
      expect(res.body.message).toContain('cannot be combined')
      expect(res.body.conflictingVouchers).toEqual([NEW_USER_CODE])
    })

    it('should apply best single voucher when stacking not possible', async () => {
      const payload: bookcarsTypes.ValidateBestVoucherPayload = {
        availableVoucherCodes: [NEW_USER_CODE, MORNING_PROMO_CODE, RENT5_GET1_CODE, WEEKDAY_CODE],
        bookingAmount: 144,
        userId: USER_ID,
        carId: BEZZA_CAR_ID,
        bookingStartTime: new Date(2025, 0, 15, 9, 0, 0).toISOString(), // Wednesday
        bookingEndTime: new Date(2025, 0, 16, 3, 0, 0).toISOString(),
      }

      const res = await request(app)
        .post('/api/find-best-voucher-combination')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload)

      expect(res.statusCode).toBe(200)
      expect(res.body.bestCombination).toBeDefined()
      expect(res.body.bestCombination.totalSavings).toBeGreaterThan(40)
      expect(res.body.alternativeCombinations).toBeDefined()
      expect(res.body.alternativeCombinations.length).toBeGreaterThan(0)
    })
  })

  describe('6. Edge Cases and Complex Scenarios', () => {
    it('should handle fractional hours correctly in time calculations', async () => {
      const payload: bookcarsTypes.ValidateVoucherPayload = {
        code: MORNING_PROMO_CODE,
        bookingAmount: 52, // 6.5 hours * RM8 = RM52
        userId: USER_ID,
        carId: BEZZA_CAR_ID,
        bookingStartTime: new Date(2025, 0, 15, 7, 30, 0).toISOString(), // 7:30 AM
        bookingEndTime: new Date(2025, 0, 15, 14, 0, 0).toISOString(), // 2:00 PM (6.5 hours)
      }

      const res = await request(app)
        .post('/api/validate-voucher')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload)

      expect(res.statusCode).toBe(200)
      expect(res.body.valid).toBe(true)
      // 7:30AM-10AM = 2.5 hours eligible
      expect(res.body.eligibleHours).toBe(2.5)
      expect(res.body.discountAmount).toBe(7.5) // 2.5 hours * RM3 = RM7.5
    })

    it('should handle timezone and daylight saving transitions', async () => {
      // Test booking that spans midnight during time change
      const payload: bookcarsTypes.ValidateVoucherPayload = {
        code: MORNING_PROMO_CODE,
        bookingAmount: 80,
        userId: USER_ID,
        carId: BEZZA_CAR_ID,
        bookingStartTime: new Date(2025, 2, 30, 22, 0, 0).toISOString(), // Before DST change
        bookingEndTime: new Date(2025, 2, 31, 6, 0, 0).toISOString(), // After DST change
      }

      const res = await request(app)
        .post('/api/validate-voucher')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload)

      expect(res.statusCode).toBe(200)
      // Should handle time calculation correctly regardless of DST
      expect(res.body.valid).toBe(true)
      expect(res.body.eligibleHours).toBeGreaterThan(0)
    })

    it('should handle very long bookings (multi-day) correctly', async () => {
      const payload: bookcarsTypes.ValidateVoucherPayload = {
        code: RENT5_GET1_CODE,
        bookingAmount: 1440, // 72 hours * RM20 = RM1440 (3 days)
        userId: USER_ID,
        carId: BMW_CAR_ID,
        bookingStartTime: new Date(2025, 0, 15, 10, 0, 0).toISOString(),
        bookingEndTime: new Date(2025, 0, 18, 10, 0, 0).toISOString(), // 3 days later
      }

      const res = await request(app)
        .post('/api/validate-voucher')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload)

      expect(res.statusCode).toBe(200)
      expect(res.body.valid).toBe(true)
      expect(res.body.freeHours).toBe(14) // 72 hours = 14 free hours (72/6*1 = 12, but capped)
    })

    it('should allow voucher validation multiple times (validation != usage)', async () => {
      // NOTE: Voucher validation allows multiple checks since validation != actual usage
      // Abuse prevention occurs at booking creation time, not validation time
      const promises = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/validate-voucher')
          .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
          .send({
            code: NEW_USER_CODE,
            bookingAmount: 80,
            userId: USER_ID,
            carId: BEZZA_CAR_ID,
            bookingStartTime: new Date(2025, 0, 15 + i, 10, 0, 0).toISOString(),
            bookingEndTime: new Date(2025, 0, 15 + i, 20, 0, 0).toISOString(),
          })
      )

      const results = await Promise.all(promises)

      // All validations should succeed since validation != actual voucher usage
      for (let i = 0; i < results.length; i++) {
        expect(results[i].body.valid).toBe(true)
      }
    })
  })
})
