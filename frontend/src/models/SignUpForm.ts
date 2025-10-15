import { z } from 'zod'
import validator from 'validator'
import { intervalToDuration } from 'date-fns'
import { strings as commonStrings } from '@/lang/common'
import env from '@/config/env.config'

// Malaysian IC number format validator: YYMMDD-PB-###G
const validateMalaysianIC = (value: string | undefined) => {
  if (!value) {
    return true // Optional field
  }
  const icRegex = /^\d{6}-\d{2}-\d{4}$/
  return icRegex.test(value)
}

export const schema = z.object({
  fullName: z.string(),
  email: z.string().refine((value) => !value || validator.isEmail(value), { message: commonStrings.EMAIL_NOT_VALID }),
  phone: z.string().refine((value) => !value || validator.isMobilePhone(value), { message: commonStrings.PHONE_NOT_VALID }),
  birthDate: z.date().refine((value) => {
    const sub = intervalToDuration({ start: value, end: new Date() }).years ?? 0
    return sub >= env.MINIMUM_AGE
  }, { message: commonStrings.BIRTH_DATE_NOT_VALID }),
  icNumber: z.string().optional().refine(validateMalaysianIC, { message: commonStrings.IC_NUMBER_NOT_VALID }),
  icDocument: z.string().optional(),
  driverLicenseNumber: z.string().optional(),
  license: z.string().optional(),
  licenseExpiryDate: z.date().optional().refine((value) => {
    if (!value) {
      return true // Optional field
    }
    return value > new Date()
  }, { message: commonStrings.LICENSE_EXPIRY_DATE_NOT_VALID }),
  password: z.string().min(env.PASSWORD_MIN_LENGTH, { message: commonStrings.PASSWORD_ERROR }),
  confirmPassword: z.string(),
  tos: z.boolean().refine((value) => value, { message: commonStrings.TOS_ERROR })
}).refine((data) => data.password === data.confirmPassword, {
  path: ['confirmPassword'],
  message: commonStrings.PASSWORDS_DONT_MATCH,
})

export type FormFields = z.infer<typeof schema>
