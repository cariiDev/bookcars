import 'dotenv/config'
import request from 'supertest'
import { nanoid } from 'nanoid'
import { jest } from '@jest/globals'
import * as bookcarsTypes from ':bookcars-types'
import app from '../src/app'
import * as databaseHelper from '../src/utils/databaseHelper'
import * as testHelper from './testHelper'
import * as env from '../src/config/env.config'
import * as pricingHelper from '../src/utils/pricingHelper'
import User from '../src/models/User'
import Car from '../src/models/Car'
import Booking from '../src/models/Booking'

let SUPPLIER_ID: string
let DRIVER_ID: string
let LOCATION_ID: string
let CAR_ID: string
let BOOKING_ID: string

beforeAll(async () => {
  testHelper.initializeLogger()
  await databaseHelper.connect(env.DB_URI, false, false)
  await testHelper.initialize()

  const supplierName = testHelper.getSupplierName()
  SUPPLIER_ID = await testHelper.createSupplier(`${supplierName}@test.bookcars.ma`, supplierName)
  const supplier = await User.findById(SUPPLIER_ID)
  supplier!.licenseRequired = false
  supplier!.studentIdRequired = false
  supplier!.priceChangeRate = 0
  await supplier!.save()

  const driver = new User({
    fullName: 'BayarCash Driver',
    email: `${nanoid(6)}@test.bookcars.ma`,
    language: testHelper.LANGUAGE,
    type: bookcarsTypes.UserType.User,
  })
  await driver.save()
  DRIVER_ID = driver.id

  LOCATION_ID = await testHelper.createLocation('BC Fee Location EN', 'BC Fee Location FR')

  const carPayload: bookcarsTypes.CreateCarPayload = {
    loggedUser: testHelper.GetRandromObjectIdAsString(),
    name: 'Fee Test Car',
    supplier: SUPPLIER_ID,
    minimumAge: 21,
    locations: [LOCATION_ID],
    dailyPrice: 100,
    discountedDailyPrice: null,
    hourlyPrice: null,
    discountedHourlyPrice: null,
    biWeeklyPrice: null,
    discountedBiWeeklyPrice: null,
    weeklyPrice: null,
    discountedWeeklyPrice: null,
    monthlyPrice: null,
    discountedMonthlyPrice: null,
    deposit: 300,
    available: true,
    type: bookcarsTypes.CarType.Gasoline,
    gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true,
    seats: 5,
    doors: 4,
    fuelPolicy: bookcarsTypes.FuelPolicy.FreeTank,
    mileage: -1,
    cancellation: 0,
    amendments: 0,
    theftProtection: 0,
    collisionDamageWaiver: 0,
    fullInsurance: 0,
    additionalDriver: 0,
    range: bookcarsTypes.CarRange.Midi,
    image: '',
    isDateBasedPrice: false,
    dateBasedPrices: [],
    multimedia: [],
  }

  const car = new Car(carPayload)
  await car.save()
  CAR_ID = car.id

  const booking = new Booking({
    supplier: SUPPLIER_ID,
    car: CAR_ID,
    driver: DRIVER_ID,
    pickupLocation: LOCATION_ID,
    dropOffLocation: LOCATION_ID,
    from: new Date(2026, 0, 10, 2, 0, 0),
    to: new Date(2026, 0, 12, 2, 0, 0),
    status: bookcarsTypes.BookingStatus.Pending,
    cancellation: false,
    amendments: false,
    theftProtection: false,
    collisionDamageWaiver: false,
    fullInsurance: false,
    additionalDriver: false,
    isDeposit: false,
    expireAt: new Date(Date.now() + 60 * 60 * 1000),
    price: 0,
  })

  await booking.save()
  BOOKING_ID = booking.id

  const pricingContext = await pricingHelper.loadPricingContext(booking.id)
  if (!pricingContext) {
    throw new Error('Pricing context not found for BayarCash fee test booking')
  }
  booking.price = pricingHelper.calculateBookingPrice(pricingContext.car, pricingContext.supplier, booking)
  await booking.save()
})

afterAll(async () => {
  await Booking.deleteMany({ _id: BOOKING_ID })
  await Car.deleteMany({ _id: CAR_ID })
  await testHelper.deleteLocation(LOCATION_ID)
  await testHelper.deleteSupplier(SUPPLIER_ID)
  await User.deleteMany({ _id: DRIVER_ID })
  await testHelper.close()
  await databaseHelper.close()
})

describe('POST /api/create-bayarcash-payment (fees)', () => {
  it('should not add RM1 fee for FPX channel', async () => {
    jest.resetModules()

    const createPaymentIntentMock = jest.fn(async () => ({ id: 'pi-fpx', url: 'https://example.com/fpx' }))
    await jest.unstable_mockModule('../src/payment/bayarcash.js', () => ({
      PAYMENT_CHANNELS: { FPX: 1, DUITNOW_BANKING: 5 },
      createPaymentIntent: createPaymentIntentMock,
      validateChecksum: jest.fn(() => true),
      generateChecksum: jest.fn(() => 'checksum'),
    }))

    const payload: bookcarsTypes.CreateBayarCashPayload = {
      bookingId: BOOKING_ID,
      amount: 1, // Intentionally wrong; server should override
      currency: env.BASE_CURRENCY,
      paymentChannel: 1,
      payerName: 'FPX Tester',
      payerEmail: 'fpx@test.bookcars.ma',
      name: 'FPX Payment',
      description: 'FPX fee test',
    }

    const res = await request(app)
      .post('/api/create-bayarcash-payment')
      .send(payload)

    expect(res.statusCode).toBe(200)

    const pricingContext = await pricingHelper.loadPricingContext(BOOKING_ID)
    expect(pricingContext).not.toBeNull()
    const expectedAmount = pricingHelper.calculateExpectedPaymentAmount(
      pricingContext!.booking,
      pricingContext!.car,
      pricingContext!.supplier,
      1,
    )

    expect(createPaymentIntentMock).toHaveBeenCalledWith(
      BOOKING_ID,
      expectedAmount,
      env.BASE_CURRENCY,
      1,
      payload.payerName,
      payload.payerEmail,
      payload.name,
      payload.description,
      undefined,
      expect.any(String),
      expect.any(String),
    )
  })

  it('should add RM1 fee for DuitNow Online Banking channel', async () => {
    jest.resetModules()

    const createPaymentIntentMock = jest.fn(async () => ({ id: 'pi-duitnow', url: 'https://example.com/duitnow' }))
    await jest.unstable_mockModule('../src/payment/bayarcash.js', () => ({
      PAYMENT_CHANNELS: { FPX: 1, DUITNOW_BANKING: 5 },
      createPaymentIntent: createPaymentIntentMock,
      validateChecksum: jest.fn(() => true),
      generateChecksum: jest.fn(() => 'checksum'),
    }))

    const payload: bookcarsTypes.CreateBayarCashPayload = {
      bookingId: BOOKING_ID,
      amount: 1, // Intentionally wrong; server should override
      currency: env.BASE_CURRENCY,
      paymentChannel: 5,
      payerName: 'DuitNow Tester',
      payerEmail: 'duitnow@test.bookcars.ma',
      name: 'DuitNow Payment',
      description: 'DuitNow fee test',
    }

    const res = await request(app)
      .post('/api/create-bayarcash-payment')
      .send(payload)

    expect(res.statusCode).toBe(200)

    const pricingContext = await pricingHelper.loadPricingContext(BOOKING_ID)
    expect(pricingContext).not.toBeNull()
    const expectedAmount = pricingHelper.calculateExpectedPaymentAmount(
      pricingContext!.booking,
      pricingContext!.car,
      pricingContext!.supplier,
      5,
    )

    expect(createPaymentIntentMock).toHaveBeenCalledWith(
      BOOKING_ID,
      expectedAmount,
      env.BASE_CURRENCY,
      5,
      payload.payerName,
      payload.payerEmail,
      payload.name,
      payload.description,
      undefined,
      expect.any(String),
      expect.any(String),
    )
  })
})
