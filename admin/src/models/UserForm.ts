import { z } from 'zod'
import validator from 'validator'
import { intervalToDuration } from 'date-fns'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '@/lang/common'
import env from '@/config/env.config'

const validateMalaysianIC = (value: string | undefined) => {
  if (!value) {
    return true
  }
  const icRegex = /^\d{6}-\d{2}-\d{4}$/
  return icRegex.test(value)
}

export const schema = z.object({
  fullName: z.string(),
  email: z.string().email({ message: commonStrings.EMAIL_NOT_VALID }),
  phone: z.string().refine((val) => !val || validator.isMobilePhone(val), { message: commonStrings.PHONE_NOT_VALID }).optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
  type: z.enum([...bookcarsHelper.getAllUserTypes()] as [string, ...string[]]),
  birthDate: z.date().refine((value) => {
    if (value) {
      const sub = intervalToDuration({ start: value, end: new Date() }).years ?? 0
      return sub >= env.MINIMUM_AGE
    }
    return true
  }, { message: commonStrings.BIRTH_DATE_NOT_VALID }).optional(),
  icNumber: z.string().optional().refine(validateMalaysianIC, { message: commonStrings.IC_NUMBER_NOT_VALID }),
  driverLicenseNumber: z.string().optional(),
  licenseExpiryDate: z.date().optional().refine((value) => {
    if (!value) {
      return true
    }
    return value > new Date()
  }, { message: commonStrings.LICENSE_EXPIRY_DATE_NOT_VALID }),
  blacklisted: z.boolean().optional(),
  payLater: z.boolean().optional(),
  licenseRequired: z.boolean().optional(),
  minimumRentalDays: z.string().refine((val) => !val || /^\d+$/.test(val), { message: commonStrings.FIELD_NOT_VALID }).optional(),
  priceChangeRate: z.string().refine((val) => !val || /^-?\d+(\.\d+)?$/.test(val), { message: commonStrings.FIELD_NOT_VALID }).optional(),
  supplierCarLimit: z.string().refine((val) => !val || /^\d+$/.test(val), { message: commonStrings.FIELD_NOT_VALID }).optional(),
  notifyAdminOnNewCar: z.boolean().optional()
})

export type FormFields = z.infer<typeof schema>
