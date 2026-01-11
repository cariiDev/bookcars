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
let WEEKDAY_VOUCHER_ID: string
let STACKABLE_A_VOUCHER_ID: string
let STACKABLE_B_VOUCHER_ID: string
let HOURLY_PERCENT_VOUCHER_ID: string

const NEW_USER_CODE = `NEWUSER${nanoid(6).toUpperCase()}`
const WEEKDAY_CODE = `WEEKDAY${nanoid(6).toUpperCase()}`
const STACKABLE_A_CODE = `STACKA${nanoid(6).toUpperCase()}`
const STACKABLE_B_CODE = `STACKB${nanoid(6).toUpperCase()}`
const HOURLY_PERCENT_CODE = `HOURPCT${nanoid(6).toUpperCase()}`

beforeAll(async () => {
  testHelper.initializeLogger()
  await databaseHelper.connect(env.DB_URI, false, false)
  await testHelper.initialize()

  ADMIN_TOKEN = await testHelper.signinAsAdmin()
  USER_TOKEN = await testHelper.signinAsUser()

  const supplierName = testHelper.getSupplierName()
  SUPPLIER_ID = await testHelper.createSupplier(`${supplierName}@test.bookcars.ma`, supplierName)

  USER_ID = testHelper.getUserId()

  LOCATION_ID = await testHelper.createLocation('Sub-Feature Test Location EN', 'Sub-Feature Test Location FR')

  await createTestCars()
  await createTestVouchers()
})

afterAll(async () => {
  const voucherIds = [
    NEW_USER_VOUCHER_ID,
    WEEKDAY_VOUCHER_ID,
    STACKABLE_A_VOUCHER_ID,
    STACKABLE_B_VOUCHER_ID,
    HOURLY_PERCENT_VOUCHER_ID,
  ]

  for (const id of voucherIds) {
    if (id) {
      await Voucher.findByIdAndDelete(id)
    }
  }

  const carIds = [BEZZA_CAR_ID, SAGA_CAR_ID, BMW_CAR_ID]
  for (const id of carIds) {
    if (id) {
      await Car.findByIdAndDelete(id)
    }
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
  const bezzaCar = new Car({
    name: 'Perodua Bezza',
    supplier: SUPPLIER_ID,
    minimumAge: 21,
    locations: [LOCATION_ID],
    dailyPrice: 50,
    hourlyPrice: 8,
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
    carModel: 'Bezza'
  })
  const savedBezza = await bezzaCar.save()
  BEZZA_CAR_ID = (savedBezza._id as any).toString()

  const sagaCar = new Car({
    name: 'Proton Saga',
    supplier: SUPPLIER_ID,
    minimumAge: 21,
    locations: [LOCATION_ID],
    dailyPrice: 55,
    hourlyPrice: 9,
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

  const bmwCar = new Car({
    name: 'BMW X1',
    supplier: SUPPLIER_ID,
    minimumAge: 21,
    locations: [LOCATION_ID],
    dailyPrice: 150,
    hourlyPrice: 20,
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
  const newUserVoucher = new Voucher({
    code: NEW_USER_CODE,
    discountType: bookcarsTypes.VoucherDiscountType.FixedAmount,
    discountValue: 20,
    fundingType: bookcarsTypes.VoucherFundingType.Platform,
    minimumRentalAmount: 0,
    usageLimit: 1000,
    usageCount: 0,
    validFrom: new Date(),
    validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
    timeRestrictionEnabled: false,
    allowedCarModels: ['Bezza', 'Saga'],
    maxUsesPerUser: 1,
    isStackable: false,
  })
  const savedNewUser = await newUserVoucher.save()
  NEW_USER_VOUCHER_ID = (savedNewUser._id as any).toString()

  const weekdayVoucher = new Voucher({
    code: WEEKDAY_CODE,
    discountType: bookcarsTypes.VoucherDiscountType.Percentage,
    discountValue: 30,
    fundingType: bookcarsTypes.VoucherFundingType.Platform,
    minimumRentalAmount: 100,
    usageLimit: 200,
    usageCount: 0,
    validFrom: new Date(),
    validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
    timeRestrictionEnabled: true,
    allowedDaysOfWeek: [1, 2, 3, 4, 5],
    isStackable: true,
  })
  const savedWeekday = await weekdayVoucher.save()
  WEEKDAY_VOUCHER_ID = (savedWeekday._id as any).toString()

  const stackableA = new Voucher({
    code: STACKABLE_A_CODE,
    discountType: bookcarsTypes.VoucherDiscountType.FixedAmount,
    discountValue: 10,
    fundingType: bookcarsTypes.VoucherFundingType.Platform,
    minimumRentalAmount: 0,
    usageLimit: 500,
    usageCount: 0,
    validFrom: new Date(),
    validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
    timeRestrictionEnabled: false,
    isStackable: true,
  })
  const savedStackableA = await stackableA.save()
  STACKABLE_A_VOUCHER_ID = (savedStackableA._id as any).toString()

  const stackableB = new Voucher({
    code: STACKABLE_B_CODE,
    discountType: bookcarsTypes.VoucherDiscountType.FixedAmount,
    discountValue: 15,
    fundingType: bookcarsTypes.VoucherFundingType.Platform,
    minimumRentalAmount: 0,
    usageLimit: 500,
    usageCount: 0,
    validFrom: new Date(),
    validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
    timeRestrictionEnabled: false,
    isStackable: true,
  })
  const savedStackableB = await stackableB.save()
  STACKABLE_B_VOUCHER_ID = (savedStackableB._id as any).toString()

  const hourlyPercent = new Voucher({
    code: HOURLY_PERCENT_CODE,
    discountType: bookcarsTypes.VoucherDiscountType.Percentage,
    discountValue: 20,
    fundingType: bookcarsTypes.VoucherFundingType.Platform,
    minimumRentalAmount: 0,
    usageLimit: 100,
    usageCount: 0,
    validFrom: new Date(),
    validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
    timeRestrictionEnabled: true,
    allowedTimeSlots: [{ startHour: 6, endHour: 10 }],
    allowedDaysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    hourlyDiscountEnabled: true,
    isStackable: false,
  })
  const savedHourlyPercent = await hourlyPercent.save()
  HOURLY_PERCENT_VOUCHER_ID = (savedHourlyPercent._id as any).toString()
}

describe('Voucher Sub-Features Tests (Percentage/Fixed Only)', () => {
  describe('Car model and per-user limits', () => {
    it('should apply fixed amount voucher for eligible cars', async () => {
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
      expect(res.body.valid).toBe(true)
      expect(res.body.discountAmount).toBe(20)
      expect(res.body.finalAmount).toBe(60)
    })

    it('should reject voucher for ineligible car model', async () => {
      const payload: bookcarsTypes.ValidateVoucherPayload = {
        code: NEW_USER_CODE,
        bookingAmount: 200,
        userId: USER_ID,
        carId: BMW_CAR_ID,
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

    it('should prevent second usage by same user', async () => {
      const existingUsage = new VoucherUsage({
        voucher: NEW_USER_VOUCHER_ID,
        user: USER_ID,
        booking: testHelper.GetRandromObjectIdAsString(),
        discountApplied: 20,
        usedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      })
      await existingUsage.save()

      const payload: bookcarsTypes.ValidateVoucherPayload = {
        code: NEW_USER_CODE,
        bookingAmount: 80,
        userId: USER_ID,
        carId: SAGA_CAR_ID,
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

      await VoucherUsage.findByIdAndDelete(existingUsage._id)
    })
  })

  describe('Weekday percentage voucher', () => {
    it('should apply discount on weekday booking above minimum', async () => {
      const payload: bookcarsTypes.ValidateVoucherPayload = {
        code: WEEKDAY_CODE,
        bookingAmount: 160,
        userId: USER_ID,
        carId: BMW_CAR_ID,
        bookingStartTime: new Date(2025, 0, 15, 10, 0, 0).toISOString(),
        bookingEndTime: new Date(2025, 0, 15, 18, 0, 0).toISOString(),
      }

      const res = await request(app)
        .post('/api/validate-voucher')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload)

      expect(res.statusCode).toBe(200)
      expect(res.body.valid).toBe(true)
      expect(res.body.discountAmount).toBe(48)
      expect(res.body.finalAmount).toBe(112)
    })

    it('should reject weekday voucher for weekend booking', async () => {
      const payload: bookcarsTypes.ValidateVoucherPayload = {
        code: WEEKDAY_CODE,
        bookingAmount: 160,
        userId: USER_ID,
        carId: BMW_CAR_ID,
        bookingStartTime: new Date(2025, 0, 12, 10, 0, 0).toISOString(),
        bookingEndTime: new Date(2025, 0, 12, 18, 0, 0).toISOString(),
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
      expect(res.body.message).toBe('This voucher requires a minimum booking amount of RM100')
    })
  })

  describe('Stackable vouchers', () => {
    it('should allow stacking of two fixed amount vouchers', async () => {
      const payload: bookcarsTypes.ValidateStackableVouchersPayload = {
        voucherCodes: [STACKABLE_A_CODE, STACKABLE_B_CODE],
        bookingAmount: 200,
        userId: USER_ID,
        carId: BEZZA_CAR_ID,
        bookingStartTime: new Date(2025, 0, 15, 9, 0, 0).toISOString(),
        bookingEndTime: new Date(2025, 0, 15, 19, 0, 0).toISOString(),
      }

      const res = await request(app)
        .post('/api/validate-stackable-vouchers')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload)

      expect(res.statusCode).toBe(200)
      expect(res.body.valid).toBe(true)
      expect(res.body.totalSavings).toBe(25)
      expect(res.body.finalAmount).toBe(175)
    })

    it('should block non-stackable voucher when combined', async () => {
      const payload: bookcarsTypes.ValidateStackableVouchersPayload = {
        voucherCodes: [NEW_USER_CODE, STACKABLE_A_CODE],
        bookingAmount: 200,
        userId: USER_ID,
        carId: BEZZA_CAR_ID,
        bookingStartTime: new Date(2025, 0, 15, 9, 0, 0).toISOString(),
        bookingEndTime: new Date(2025, 0, 15, 19, 0, 0).toISOString(),
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

    it('should validate single non-stackable voucher', async () => {
      const payload: bookcarsTypes.ValidateStackableVouchersPayload = {
        voucherCodes: [NEW_USER_CODE],
        bookingAmount: 80,
        userId: USER_ID,
        carId: BEZZA_CAR_ID,
        bookingStartTime: new Date(2025, 0, 15, 9, 0, 0).toISOString(),
        bookingEndTime: new Date(2025, 0, 15, 19, 0, 0).toISOString(),
      }

      const res = await request(app)
        .post('/api/validate-stackable-vouchers')
        .send(payload)

      expect(res.statusCode).toBe(200)
      expect(res.body.valid).toBe(true)
      expect(res.body.totalSavings).toBe(20)
      expect(res.body.finalAmount).toBe(60)
    })
  })

  describe('Hourly discount overlap', () => {
    it('should apply percentage discount only to eligible hours (rounded down)', async () => {
      const payload: bookcarsTypes.ValidateVoucherPayload = {
        code: HOURLY_PERCENT_CODE,
        bookingAmount: 30, // 3 hours at RM10/hour
        userId: USER_ID,
        carId: BEZZA_CAR_ID,
        bookingStartTime: new Date(2026, 0, 12, 8, 0, 0).toISOString(),
        bookingEndTime: new Date(2026, 0, 12, 11, 0, 0).toISOString(),
      }

      const res = await request(app)
        .post('/api/validate-voucher')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload)

      expect(res.statusCode).toBe(200)
      expect(res.body.valid).toBe(true)
      expect(res.body.discountAmount).toBe(4) // 2 eligible hours * RM10 * 20%
    })

    it('should reject when overlap is less than 1 hour', async () => {
      const payload: bookcarsTypes.ValidateVoucherPayload = {
        code: HOURLY_PERCENT_CODE,
        bookingAmount: 10,
        userId: USER_ID,
        carId: BEZZA_CAR_ID,
        bookingStartTime: new Date(2026, 0, 12, 9, 30, 0).toISOString(),
        bookingEndTime: new Date(2026, 0, 12, 10, 15, 0).toISOString(),
      }

      const res = await request(app)
        .post('/api/validate-voucher')
        .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
        .send(payload)

      expect(res.statusCode).toBe(200)
      expect(res.body.valid).toBe(false)
      expect(res.body.message).toBe('Voucher is not valid for this time period')
    })
  })
})
