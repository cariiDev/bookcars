import * as bookcarsTypes from ':bookcars-types'
import VoucherDailyUsage from '../models/VoucherDailyUsage'
import * as env from '../config/env.config'

const getTimeZonedDate = (date: Date) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: env.TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const parts = formatter.formatToParts(date)
  const lookup: Record<string, number> = {}
  for (const part of parts) {
    if (part.type !== 'literal') {
      lookup[part.type] = Number.parseInt(part.value, 10)
    }
  }
  return new Date(Date.UTC(
    lookup.year,
    (lookup.month || 1) - 1,
    lookup.day,
    lookup.hour || 0,
    lookup.minute || 0,
    lookup.second || 0
  ))
}

/**
 * Check if a booking time falls within allowed time slots.
 *
 * @param {Date} bookingStartTime
 * @param {Date} bookingEndTime
 * @param {bookcarsTypes.TimeSlot[]} allowedTimeSlots
 * @returns {boolean}
 */
export const isBookingWithinAllowedTimeSlots = (
  bookingStartTime: Date,
  bookingEndTime: Date,
  allowedTimeSlots: bookcarsTypes.TimeSlot[]
): boolean => {
  if (!allowedTimeSlots || allowedTimeSlots.length === 0) {
    return true // No restrictions
  }

  return calculateAllowedTimeSlotOverlapHours(bookingStartTime, bookingEndTime, allowedTimeSlots) >= 1
}

/**
 * Calculate total overlap hours between a booking window and allowed time slots.
 *
 * @param {Date} bookingStartTime
 * @param {Date} bookingEndTime
 * @param {bookcarsTypes.TimeSlot[]} allowedTimeSlots
 * @returns {number}
 */
export const calculateAllowedTimeSlotOverlapHours = (
  bookingStartTime: Date,
  bookingEndTime: Date,
  allowedTimeSlots: bookcarsTypes.TimeSlot[]
): number => {
  if (!allowedTimeSlots || allowedTimeSlots.length === 0) {
    return 0
  }

  const bookingStart = getTimeZonedDate(bookingStartTime)
  const bookingEnd = getTimeZonedDate(bookingEndTime)
  bookingStart.setUTCSeconds(0, 0)
  bookingEnd.setUTCSeconds(0, 0)
  let overlapMsTotal = 0

  for (let day = new Date(bookingStart); day <= bookingEnd; day.setUTCDate(day.getUTCDate() + 1)) {
    for (const slot of allowedTimeSlots) {
      if (slot.startHour === slot.endHour) {
        continue
      }

      const slotStart = new Date(day)
      slotStart.setUTCHours(slot.startHour, 0, 0, 0)
      const slotEnd = new Date(day)
      slotEnd.setUTCHours(slot.endHour, 0, 0, 0)

      if (slot.startHour > slot.endHour) {
        slotEnd.setUTCDate(slotEnd.getUTCDate() + 1)
      }

      const overlapStart = bookingStart > slotStart ? bookingStart : slotStart
      const overlapEnd = bookingEnd < slotEnd ? bookingEnd : slotEnd
      const overlapMs = overlapEnd.getTime() - overlapStart.getTime()

      if (overlapMs > 0) {
        overlapMsTotal += overlapMs
      }
    }
  }

  return overlapMsTotal / (1000 * 60 * 60)
}

/**
 * Check if booking days are within allowed days of week.
 *
 * @param {Date} bookingStartTime
 * @param {Date} bookingEndTime
 * @param {number[]} allowedDaysOfWeek - 0-6 (Sunday-Saturday)
 * @returns {boolean}
 */
export const isBookingWithinAllowedDays = (
  bookingStartTime: Date,
  bookingEndTime: Date,
  allowedDaysOfWeek: number[]
): boolean => {
  if (!allowedDaysOfWeek || allowedDaysOfWeek.length === 0) {
    return true // No restrictions
  }

  const start = getTimeZonedDate(bookingStartTime)
  const end = getTimeZonedDate(bookingEndTime)
  const startDay = start.getUTCDay()
  const endDay = end.getUTCDay()
  
  // For single-day bookings
  if (startDay === endDay) {
    return allowedDaysOfWeek.includes(startDay)
  }
  
  // For multi-day bookings, check if all days are allowed
  const currentDate = new Date(start)
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getUTCDay()
    if (!allowedDaysOfWeek.includes(dayOfWeek)) {
      return false
    }
    currentDate.setUTCDate(currentDate.getUTCDate() + 1)
  }
  
  return true
}

/**
 * Calculate booking duration in hours.
 *
 * @param {Date} bookingStartTime
 * @param {Date} bookingEndTime
 * @returns {number}
 */
export const calculateBookingDurationHours = (
  bookingStartTime: Date,
  bookingEndTime: Date
): number => {
  const durationMs = bookingEndTime.getTime() - bookingStartTime.getTime()
  return Math.ceil(durationMs / (1000 * 60 * 60)) // Convert to hours, round up
}

/**
 * Check if user has exceeded daily usage limit for a voucher.
 *
 * @param {string} voucherId
 * @param {string} userId
 * @param {Date} bookingDate
 * @param {number} bookingDurationHours
 * @param {number} dailyUsageLimit
 * @returns {Promise<boolean>}
 */
export const checkDailyUsageLimit = async (
  voucherId: string,
  userId: string,
  bookingDate: Date,
  bookingDurationHours: number,
  dailyUsageLimit: number
): Promise<boolean> => {
  try {
    // Get date without time for daily tracking
    const dateOnly = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate())
    
    // Find existing usage for this voucher, user, and date
    const existingUsage = await VoucherDailyUsage.findOne({
      voucher: voucherId,
      user: userId,
      date: dateOnly,
    })
    
    const currentUsage = existingUsage ? existingUsage.totalHoursUsed : 0
    const totalUsageWithNewBooking = currentUsage + bookingDurationHours
    
    return totalUsageWithNewBooking <= dailyUsageLimit
  } catch (error) {
    console.error('Error checking daily usage limit:', error)
    return false // Fail safe - deny if can't check
  }
}

/**
 * Update daily usage tracking for a voucher.
 *
 * @param {string} voucherId
 * @param {string} userId
 * @param {Date} bookingDate
 * @param {number} bookingDurationHours
 * @returns {Promise<void>}
 */
export const updateDailyUsageTracking = async (
  voucherId: string,
  userId: string,
  bookingDate: Date,
  bookingDurationHours: number
): Promise<void> => {
  try {
    // Get date without time for daily tracking
    const dateOnly = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate())
    
    // Update or create daily usage record
    await VoucherDailyUsage.findOneAndUpdate(
      {
        voucher: voucherId,
        user: userId,
        date: dateOnly,
      },
      {
        $inc: { totalHoursUsed: bookingDurationHours }
      },
      {
        upsert: true,
        new: true,
      }
    )
  } catch (error) {
    console.error('Error updating daily usage tracking:', error)
    throw error
  }
}

/**
 * Decrement daily usage tracking for a voucher.
 *
 * @param {string} voucherId
 * @param {string} userId
 * @param {Date} bookingDate
 * @param {number} bookingDurationHours
 * @returns {Promise<void>}
 */
export const decrementDailyUsageTracking = async (
  voucherId: string,
  userId: string,
  bookingDate: Date,
  bookingDurationHours: number
): Promise<void> => {
  try {
    const dateOnly = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate())
    const existingUsage = await VoucherDailyUsage.findOne({
      voucher: voucherId,
      user: userId,
      date: dateOnly,
    })

    if (!existingUsage) {
      return
    }

    existingUsage.totalHoursUsed = Math.max(0, existingUsage.totalHoursUsed - bookingDurationHours)
    await existingUsage.save()
  } catch (error) {
    console.error('Error decrementing daily usage tracking:', error)
    throw error
  }
}

/**
 * Get formatted error messages for time restrictions.
 */
export const getTimeRestrictionErrorMessages = () => ({
  INVALID_TIME_SLOT: 'Voucher is not valid for this time period',
  INVALID_DAY_OF_WEEK: 'Voucher is not valid for this day of the week',
  DAILY_LIMIT_EXCEEDED: 'Daily usage limit exceeded for this voucher',
  BOOKING_TOO_LONG: 'Booking duration exceeds voucher daily limit',
})
