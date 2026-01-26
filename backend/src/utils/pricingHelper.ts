import * as bookcarsTypes from ':bookcars-types'
import Booking from '../models/Booking'
import Car from '../models/Car'
import User from '../models/User'
import * as env from '../config/env.config'

const DUITNOW_BANKING_CHANNEL = 5

export interface PricingContext {
  booking: env.Booking
  car: env.Car
  supplier: env.User
}

const days = (from?: Date, to?: Date) =>
  (from && to && Math.ceil((to.getTime() - from.getTime()) / (1000 * 3600 * 24))) || 0

const hours = (from?: Date, to?: Date): number => {
  if (!from || !to) {
    return 0
  }
  const ms = to.getTime() - from.getTime()
  const hrs = ms / (1000 * 60 * 60)
  return Math.ceil(hrs)
}

const buildOptions = (booking: env.Booking): bookcarsTypes.CarOptions => ({
  cancellation: booking.cancellation,
  amendments: booking.amendments,
  theftProtection: booking.theftProtection,
  collisionDamageWaiver: booking.collisionDamageWaiver,
  fullInsurance: booking.fullInsurance,
  additionalDriver: booking.additionalDriver,
})

const calculateTotalPrice = (
  car: env.Car,
  from: Date,
  to: Date,
  priceChangeRate: number,
  options?: bookcarsTypes.CarOptions,
  taxRate = 0,
) => {
  let totalPrice = 0
  let totalDays = days(from, to)

  if (car.isDateBasedPrice) {
    let currentDate = new Date(from)
    currentDate.setHours(0, 0, 0, 0)
    const dateBasedPrices = car.dateBasedPrices as unknown as env.DateBasedPrice[]

    let currentDay = 1
    while (currentDay <= totalDays) {
      let applicableRate = (car.discountedDailyPrice || car.dailyPrice)

      for (const dateBasedPrice of dateBasedPrices) {
        const startDate = new Date(dateBasedPrice.startDate!)
        startDate.setHours(0, 0, 0, 0)
        const endDate = new Date(dateBasedPrice.endDate!)
        endDate.setHours(0, 0, 0, 0)

        if (currentDate.getTime() >= startDate.getTime() && currentDate.getTime() <= endDate.getTime()) {
          applicableRate = Number(dateBasedPrice.dailyPrice)
          break
        }
      }

      totalPrice += applicableRate
      currentDate.setDate(currentDate.getDate() + 1)
      currentDate.setHours(0, 0, 0, 0)
      currentDay += 1
    }
  } else {
    const totalHours = hours(from, to)
    totalDays = Math.floor(totalHours / 24)
    const remainingHours = totalHours % 24

    let remainingDays = totalDays

    if (remainingDays >= 30 && (car.discountedMonthlyPrice || car.monthlyPrice)) {
      totalPrice += (car.discountedMonthlyPrice || car.monthlyPrice)! * Math.floor(remainingDays / 30)
      remainingDays %= 30
    }

    if (remainingDays >= 7 && (car.discountedWeeklyPrice || car.weeklyPrice)) {
      totalPrice += (car.discountedWeeklyPrice || car.weeklyPrice)! * Math.floor(remainingDays / 7)
      remainingDays %= 7
    }

    if (remainingDays >= 3 && (car.discountedBiWeeklyPrice || car.biWeeklyPrice)) {
      totalPrice += (car.discountedBiWeeklyPrice || car.biWeeklyPrice)! * Math.floor(remainingDays / 3)
      remainingDays %= 3
    }

    if (remainingDays > 0) {
      totalPrice += (car.discountedDailyPrice || car.dailyPrice) * remainingDays
    }

    if (totalDays === 0 || remainingHours > 0) {
      const hourlyRate = car.discountedHourlyPrice || car.hourlyPrice
      if (hourlyRate) {
        totalPrice += hourlyRate * remainingHours
      } else if (car.dailyPrice || car.discountedDailyPrice) {
        totalPrice += (car.discountedDailyPrice || car.dailyPrice)
      }
    }
  }

  if (options) {
    if (options.cancellation && car.cancellation > 0) {
      totalPrice += car.cancellation
    }
    if (options.amendments && car.amendments > 0) {
      totalPrice += car.amendments
    }
    if (options.theftProtection && car.theftProtection > 0) {
      totalPrice += car.theftProtection * totalDays
    }
    if (options.collisionDamageWaiver && car.collisionDamageWaiver > 0) {
      totalPrice += car.collisionDamageWaiver * totalDays
    }
    if (options.fullInsurance && car.fullInsurance > 0) {
      totalPrice += car.fullInsurance * totalDays
    }
    if (options.additionalDriver && car.additionalDriver > 0) {
      totalPrice += car.additionalDriver * totalDays
    }
  }

  totalPrice += totalPrice * (priceChangeRate / 100)

  if (taxRate > 0) {
    totalPrice += totalPrice * taxRate
  }

  return totalPrice
}

export const loadPricingContext = async (bookingId: string): Promise<PricingContext | null> => {
  const booking = await Booking.findById(bookingId)
  if (!booking) {
    return null
  }

  const car = await Car.findById(booking.car).populate('dateBasedPrices')
  if (!car) {
    throw new Error(`Car ${booking.car} not found`)
  }

  const supplier = await User.findById(booking.supplier)
  if (!supplier) {
    throw new Error(`Supplier ${booking.supplier} not found`)
  }

  if (car.supplier.toString() !== supplier.id) {
    throw new Error(`Car ${car.id} does not belong to supplier ${supplier.id}`)
  }

  return { booking, car, supplier }
}

export const calculateBookingPrice = (car: env.Car, supplier: env.User, booking: env.Booking) => {
  const from = new Date(booking.from)
  const to = new Date(booking.to)
  const priceChangeRate = supplier.priceChangeRate || 0
  const options = buildOptions(booking)

  return calculateTotalPrice(
    car,
    from,
    to,
    priceChangeRate,
    options,
    env.SST_TAX_RATE,
  )
}

export const calculateDepositAmount = (car: env.Car, supplier: env.User) => {
  let deposit = car.deposit || 0
  const priceChangeRate = supplier.priceChangeRate || 0
  deposit += deposit * (priceChangeRate / 100)
  return deposit
}

export const calculateExpectedPaymentAmount = (
  booking: env.Booking,
  car: env.Car,
  supplier: env.User,
  paymentChannel?: number,
) => {
  const baseAmount = booking.isDeposit ? calculateDepositAmount(car, supplier) : booking.price
  const bankingFee = paymentChannel === DUITNOW_BANKING_CHANNEL ? env.BAYARCASH_ONLINE_BANKING_FEE : 0
  return baseAmount + bankingFee
}
