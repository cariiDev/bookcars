import * as bookcarsTypes from ':bookcars-types'
import VoucherDailyUsage from '../models/VoucherDailyUsage'

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

  const startHour = bookingStartTime.getHours()
  const endHour = bookingEndTime.getHours()
  
  // Check if booking time overlaps with any allowed time slot
  return allowedTimeSlots.some(slot => {
    // Handle same-day time slots
    if (slot.startHour <= slot.endHour) {
      return startHour >= slot.startHour && endHour <= slot.endHour
    } else {
      // Handle overnight time slots (e.g., 22:00 - 06:00)
      return (startHour >= slot.startHour || startHour <= slot.endHour) &&
             (endHour >= slot.startHour || endHour <= slot.endHour)
    }
  })
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

  const startDay = bookingStartTime.getDay()
  const endDay = bookingEndTime.getDay()
  
  // For single-day bookings
  if (startDay === endDay) {
    return allowedDaysOfWeek.includes(startDay)
  }
  
  // For multi-day bookings, check if all days are allowed
  const currentDate = new Date(bookingStartTime)
  while (currentDate <= bookingEndTime) {
    const dayOfWeek = currentDate.getDay()
    if (!allowedDaysOfWeek.includes(dayOfWeek)) {
      return false
    }
    currentDate.setDate(currentDate.getDate() + 1)
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
 * Get formatted error messages for time restrictions.
 */
export const getTimeRestrictionErrorMessages = () => ({
  INVALID_TIME_SLOT: 'Voucher is not valid for this time period',
  INVALID_DAY_OF_WEEK: 'Voucher is not valid for this day of the week',
  DAILY_LIMIT_EXCEEDED: 'Daily usage limit exceeded for this voucher',
  BOOKING_TOO_LONG: 'Booking duration exceeds voucher daily limit',
})
