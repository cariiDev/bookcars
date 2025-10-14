import React, { useState } from 'react'
import {
  OutlinedInput,
  InputLabel,
  FormControl,
  FormHelperText,
  Button,
  Paper,
  Checkbox,
  Link
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import env from '@/config/env.config'
import * as helper from '@/utils/helper'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/sign-up'
import * as UserService from '@/services/UserService'
import { useUserContext, UserContextType } from '@/context/UserContext'
import { useRecaptchaContext, RecaptchaContextType } from '@/context/RecaptchaContext'
import Layout from '@/components/Layout'
import Error from '@/components/Error'
import Backdrop from '@/components/SimpleBackdrop'
import DatePicker from '@/components/DatePicker'
import SocialLogin from '@/components/SocialLogin'
import Footer from '@/components/Footer'
import { schema, FormFields } from '@/models/SignUpForm'
import PasswordInput from '@/components/PasswordInput'
import DriverLicense from '@/components/DriverLicense'
import ICDocument from '@/components/ICDocument'

import '@/assets/css/signup.css'

const SignUp = () => {
  const navigate = useNavigate()

  const { setUser, setUserLoaded } = useUserContext() as UserContextType
  const { reCaptchaLoaded, generateReCaptchaToken } = useRecaptchaContext() as RecaptchaContextType

  const [language, setLanguage] = useState(env.DEFAULT_LANGUAGE)
  const [recaptchaError, setRecaptchaError] = useState(false)
  const [visible, setVisible] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError, clearErrors, setValue } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onSubmit'
  })

  const onSubmit = async (data: FormFields) => {
    try {
      const emailStatus = await UserService.validateEmail({ email: data.email })
      if (emailStatus !== 200) {
        setError('email', { message: commonStrings.EMAIL_ALREADY_REGISTERED })
        return
      }

      let recaptchaToken = ''
      if (reCaptchaLoaded) {
        recaptchaToken = await generateReCaptchaToken()
        if (!(await helper.verifyReCaptcha(recaptchaToken))) {
          recaptchaToken = ''
        }
      }

      if (env.RECAPTCHA_ENABLED && !recaptchaToken) {
        setRecaptchaError(true)
        return
      }

      const payload: bookcarsTypes.SignUpPayload = {
        email: data.email,
        phone: data.phone,
        password: data.password,
        fullName: data.fullName,
        birthDate: data.birthDate,
        icNumber: data.icNumber,
        icDocument: data.icDocument,
        driverLicenseNumber: data.driverLicenseNumber,
        license: data.license,
        licenseExpiryDate: data.licenseExpiryDate,
        language: UserService.getLanguage()
      }

      const status = await UserService.signup(payload)

      if (status === 200) {
        const signInResult = await UserService.signin({
          email: data.email,
          password: data.password,
        })

        if (signInResult.status === 200) {
          const user = await UserService.getUser(signInResult.data._id)
          setUser(user)
          setUserLoaded(true)
          navigate(`/${window.location.search}`)
        }
      }
    } catch (err) {
      console.error(err)
      setError('root', { message: strings.SIGN_UP_ERROR })
    }
  }

  const onLoad = (user?: bookcarsTypes.User) => {
    if (user) {
      navigate('/')
    } else {
      setLanguage(UserService.getLanguage())
      setVisible(true)
    }
  }

  return (
    <Layout strict={false} onLoad={onLoad}>
      <div className="signup">
        <Paper className={`signup-form ${visible ? '' : 'hidden'}`} elevation={10}>
          <h1 className="signup-form-title">{strings.SIGN_UP_HEADING}</h1>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div>
              <FormControl fullWidth margin="dense" error={!!errors.fullName}>
                <InputLabel className="required">{commonStrings.FULL_NAME}</InputLabel>
                <OutlinedInput
                  type="text"
                  {...register('fullName')}
                  label={commonStrings.FULL_NAME}
                  autoComplete="off"
                  required
                />
              </FormControl>
              <FormControl fullWidth margin="dense" error={!!errors.email}>
                <InputLabel className="required">{commonStrings.EMAIL}</InputLabel>
                <OutlinedInput
                  type="text"
                  {...register('email')}
                  label={commonStrings.EMAIL}
                  autoComplete="off"
                  onChange={() => {
                    if (errors.email) {
                      clearErrors('email')
                    }
                  }}
                  required
                />
                <FormHelperText error={!!errors.email}>{errors.email?.message || ''}</FormHelperText>
              </FormControl>
              <FormControl fullWidth margin="dense" error={!!errors.phone}>
                <InputLabel className="required">{commonStrings.PHONE}</InputLabel>
                <OutlinedInput
                  type="text"
                  {...register('phone')}
                  label={commonStrings.PHONE}
                  autoComplete="off"
                  onChange={() => {
                    if (errors.phone) {
                      clearErrors('phone')
                    }
                  }}
                  required
                />
                <FormHelperText error={!!errors.phone}>{errors.phone?.message || ''}</FormHelperText>
              </FormControl>
              <FormControl fullWidth margin="dense" error={!!errors.birthDate}>
                <DatePicker
                  label={commonStrings.BIRTH_DATE}
                  variant="outlined"
                  required
                  onChange={(birthDate) => {
                    if (birthDate) {
                      if (errors.birthDate) {
                        clearErrors('birthDate')
                      }
                      setValue('birthDate', birthDate, { shouldValidate: true })
                    }
                  }}
                  language={language}
                />
                <FormHelperText error={!!errors.birthDate}>{errors.birthDate?.message || ''}</FormHelperText>
              </FormControl>
              <FormControl fullWidth margin="dense" error={!!errors.icNumber}>
                <InputLabel>{commonStrings.IC_NUMBER}</InputLabel>
                <OutlinedInput
                  type="text"
                  {...register('icNumber')}
                  label={commonStrings.IC_NUMBER}
                  autoComplete="off"
                  placeholder="YYMMDD-PB-###G"
                  onChange={() => {
                    if (errors.icNumber) {
                      clearErrors('icNumber')
                    }
                  }}
                />
                <FormHelperText error={!!errors.icNumber}>{errors.icNumber?.message || ''}</FormHelperText>
              </FormControl>
              <FormControl fullWidth margin="dense">
                <div style={{ marginTop: '8px', marginBottom: '8px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'rgba(0, 0, 0, 0.6)', marginBottom: '8px' }}>
                    {commonStrings.IC_DOCUMENT}
                  </label>
                  <ICDocument
                    variant="outlined"
                    onUpload={(filename) => {
                      setValue('icDocument', filename)
                    }}
                    onDelete={() => {
                      setValue('icDocument', undefined)
                    }}
                  />
                </div>
              </FormControl>
              <FormControl fullWidth margin="dense" error={!!errors.driverLicenseNumber}>
                <InputLabel>{commonStrings.DRIVER_LICENSE_NUMBER}</InputLabel>
                <OutlinedInput
                  type="text"
                  {...register('driverLicenseNumber')}
                  label={commonStrings.DRIVER_LICENSE_NUMBER}
                  autoComplete="off"
                  onChange={() => {
                    if (errors.driverLicenseNumber) {
                      clearErrors('driverLicenseNumber')
                    }
                  }}
                />
                <FormHelperText error={!!errors.driverLicenseNumber}>{errors.driverLicenseNumber?.message || ''}</FormHelperText>
              </FormControl>
              <FormControl fullWidth margin="dense">
                <div style={{ marginTop: '8px', marginBottom: '8px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'rgba(0, 0, 0, 0.6)', marginBottom: '8px' }}>
                    {commonStrings.DRIVER_LICENSE}
                  </label>
                  <DriverLicense
                    variant="outlined"
                    onUpload={(filename) => {
                      setValue('license', filename)
                    }}
                    onDelete={() => {
                      setValue('license', undefined)
                    }}
                  />
                </div>
              </FormControl>
              <FormControl fullWidth margin="dense" error={!!errors.licenseExpiryDate}>
                <DatePicker
                  label={commonStrings.LICENSE_EXPIRY_DATE}
                  variant="outlined"
                  onChange={(licenseExpiryDate) => {
                    if (licenseExpiryDate) {
                      if (errors.licenseExpiryDate) {
                        clearErrors('licenseExpiryDate')
                      }
                      setValue('licenseExpiryDate', licenseExpiryDate, { shouldValidate: true })
                    }
                  }}
                  language={language}
                />
                <FormHelperText error={!!errors.licenseExpiryDate}>{errors.licenseExpiryDate?.message || ''}</FormHelperText>
              </FormControl>

              <PasswordInput
                label={commonStrings.PASSWORD}
                variant="outlined"
                {...register('password')}
                error={!!errors.password}
                helperText={errors.password?.message}
                onChange={(e) => {
                  if (errors.password) {
                    clearErrors('password')
                  }
                  setValue('password', e.target.value)
                }}
                required
                inputProps={{
                  autoComplete: 'new-password',
                  form: {
                    autoComplete: 'off',
                  },
                }}
              />

              <PasswordInput
                label={commonStrings.CONFIRM_PASSWORD}
                variant="outlined"
                {...register('confirmPassword')}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
                onChange={(e) => {
                  if (errors.confirmPassword) {
                    clearErrors('confirmPassword')
                  }
                  setValue('confirmPassword', e.target.value)
                }}
                required
                inputProps={{
                  autoComplete: 'new-password',
                  form: {
                    autoComplete: 'off',
                  },
                }}
              />

              <div className="signup-tos">
                <table>
                  <tbody>
                    <tr>
                      <td aria-label="tos">
                        <Checkbox
                          {...register('tos')}
                          color="primary"
                          onChange={() => {
                            if (errors.tos) {
                              clearErrors('tos')
                            }
                          }}
                        />
                      </td>
                      <td>
                        <Link href="/tos" target="_blank" rel="noreferrer">
                          {commonStrings.TOS}
                        </Link>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2}>
                        <FormHelperText error={!!errors.tos}>{errors.tos?.message || ''}</FormHelperText>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <SocialLogin redirectToHomepage />

              <div className="buttons">
                <Button type="submit" variant="contained" className="btn-primary btn-margin-bottom" disabled={isSubmitting}>
                  {strings.SIGN_UP}
                </Button>
                <Button variant="outlined" color="primary" className="btn-margin-bottom" onClick={() => navigate('/')}>
                  {commonStrings.CANCEL}
                </Button>
              </div>
            </div>
            <div className="form-error">
              {errors.root && <Error message={errors.root.message!} />}
              {recaptchaError && <Error message={commonStrings.RECAPTCHA_ERROR} />}
            </div>
          </form>
        </Paper>
      </div>

      <Footer />

      {isSubmitting && <Backdrop text={commonStrings.PLEASE_WAIT} />}
    </Layout>
  )
}

export default SignUp
