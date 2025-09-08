import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Input,
  InputLabel,
  FormControl,
  FormHelperText,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  Button,
  Paper,
  Typography
} from '@mui/material'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/vouchers'
import * as VoucherService from '@/services/VoucherService'
import Error from '@/components/Error'
import Backdrop from '@/components/SimpleBackdrop'
import * as helper from '@/utils/helper'
import { UserContextType, useUserContext } from '@/context/UserContext'
import { schema, FormFields } from '@/models/VoucherForm'
import DateTimePicker from '@/components/DateTimePicker'
import DiscountTypeList from '@/components/DiscountTypeList'
import FundingTypeList from '@/components/FundingTypeList'
import TimeSlotPicker from '@/components/TimeSlotPicker'
import DayOfWeekSelector from '@/components/DayOfWeekSelector'
import { useSuppliers } from '@/hooks/useSuppliers'

import '@/assets/css/create-voucher.css'

const CreateVoucher = () => {
  const navigate = useNavigate()
  const { user } = useUserContext() as UserContextType

  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const { suppliers, loading: suppliersLoading } = useSuppliers(user)

  const {
    control,
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      code: '',
      discountType: undefined,
      discountValue: '',
      fundingType: undefined,
      minimumAmount: '',
      usageLimit: '',
      validFrom: new Date(),
      validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      supplier: '',
      isActive: true,
      
      // Time restrictions
      timeRestrictionEnabled: false,
      allowedTimeSlots: [],
      allowedDaysOfWeek: [],
      dailyUsageLimit: '',
      dailyUsageLimitEnabled: false
    }
  })

  const discountType = useWatch({ control, name: 'discountType' })
  const fundingType = useWatch({ control, name: 'fundingType' })
  const validFrom = useWatch({ control, name: 'validFrom' })
  const validTo = useWatch({ control, name: 'validTo' })
  const isActive = useWatch({ control, name: 'isActive' })
  const supplier = useWatch({ control, name: 'supplier' })
  
  // Time restrictions
  const timeRestrictionEnabled = useWatch({ control, name: 'timeRestrictionEnabled' })
  const allowedTimeSlots = useWatch({ control, name: 'allowedTimeSlots' })
  const allowedDaysOfWeek = useWatch({ control, name: 'allowedDaysOfWeek' })
  const dailyUsageLimitEnabled = useWatch({ control, name: 'dailyUsageLimitEnabled' })
  const dailyUsageLimit = useWatch({ control, name: 'dailyUsageLimit' })

  const onLoad = (_user?: bookcarsTypes.User) => {
    if (_user && _user.verified) {
      setVisible(true)
    }
  }

  const handleSubmitForm = async (data: FormFields) => {
    try {
      setSubmitError(false)
      setLoading(true)

      const payload: bookcarsTypes.CreateVoucherPayload = {
        code: data.code.toUpperCase(),
        discountType: data.discountType,
        discountValue: parseFloat(data.discountValue),
        fundingType: data.fundingType,
        minimumAmount: data.minimumAmount ? parseFloat(data.minimumAmount) : undefined,
        usageLimit: data.usageLimit ? parseInt(data.usageLimit, 10) : undefined,
        validFrom: data.validFrom,
        validTo: data.validTo,
        supplier: data.supplier || undefined,
        
        // Time restrictions
        timeRestrictionEnabled: data.timeRestrictionEnabled || false,
        allowedTimeSlots: data.allowedTimeSlots || [],
        allowedDaysOfWeek: data.allowedDaysOfWeek || [],
        dailyUsageLimit: data.dailyUsageLimit ? parseInt(data.dailyUsageLimit, 10) : undefined,
        dailyUsageLimitEnabled: data.dailyUsageLimitEnabled || false
      }

      const voucher = await VoucherService.create(payload)
      
      if (voucher) {
        helper.info(strings.VOUCHER_CREATED)
        navigate('/vouchers')
      } else {
        helper.error()
        setSubmitError(true)
      }
    } catch (err) {
      helper.error(err)
      setSubmitError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout onLoad={onLoad} strict>
      {visible && (
        <div className="create-voucher">
          <Paper className="voucher-form voucher-form-wrapper" elevation={10}>
            <Typography variant="h4" className="voucher-form-title">
              {strings.NEW_VOUCHER}
            </Typography>
            
            <form onSubmit={handleSubmit(handleSubmitForm)}>
              <div className="voucher-form-fields">
                <FormControl fullWidth margin="dense">
                  <InputLabel className="required">{strings.VOUCHER_CODE}</InputLabel>
                  <Input
                    type="text"
                    {...register('code')}
                    error={!!errors.code}
                    autoComplete="off"
                    inputProps={{ style: { textTransform: 'uppercase' } }}
                  />
                  <FormHelperText error={!!errors.code}>
                    {errors.code?.message}
                  </FormHelperText>
                </FormControl>

                <FormControl fullWidth margin="dense">
                  <DiscountTypeList
                    label={strings.DISCOUNT_TYPE}
                    value={discountType}
                    onChange={(value: bookcarsTypes.VoucherDiscountType) => {
                      const currentValue = getValues('discountType')
                      if (currentValue !== value) {
                        setValue('discountType', value)
                      }
                    }}
                    required
                  />
                  {errors.discountType && (
                    <FormHelperText error>{errors.discountType?.message}</FormHelperText>
                  )}
                </FormControl>

                <FormControl fullWidth margin="dense">
                  <InputLabel className="required">
                    {discountType === bookcarsTypes.VoucherDiscountType.Percentage 
                      ? `${strings.DISCOUNT_VALUE} (%)`
                      : `${strings.DISCOUNT_VALUE} ($)`}
                  </InputLabel>
                  <Input
                    type="number"
                    {...register('discountValue')}
                    error={!!errors.discountValue}
                    autoComplete="off"
                    inputProps={{ 
                      step: discountType === bookcarsTypes.VoucherDiscountType.Percentage ? '1' : '0.01',
                      min: '0',
                      max: discountType === bookcarsTypes.VoucherDiscountType.Percentage ? '100' : undefined
                    }}
                  />
                  <FormHelperText error={!!errors.discountValue}>
                    {errors.discountValue?.message}
                  </FormHelperText>
                </FormControl>

                <FormControl fullWidth margin="dense">
                  <FundingTypeList
                    label={strings.FUNDING_TYPE}
                    value={fundingType}
                    onChange={(value: bookcarsTypes.VoucherFundingType) => {
                      const currentValue = getValues('fundingType')
                      if (currentValue !== value) {
                        setValue('fundingType', value)
                      }
                    }}
                    required
                  />
                  {errors.fundingType && (
                    <FormHelperText error>{errors.fundingType?.message}</FormHelperText>
                  )}
                </FormControl>

                {(fundingType === bookcarsTypes.VoucherFundingType.Supplier || 
                  fundingType === bookcarsTypes.VoucherFundingType.CoFunded) && (
                  <FormControl fullWidth margin="dense">
                    <InputLabel className="required">{strings.SUPPLIER}</InputLabel>
                    <Select
                      {...register('supplier')}
                      error={!!errors.supplier}
                      value={supplier || ''}
                      onChange={(e) => setValue('supplier', e.target.value)}
                      disabled={suppliersLoading}
                      variant="standard"
                    >
                      <MenuItem value="">
                        <em>{suppliersLoading ? 'Loading suppliers...' : commonStrings.SELECT}</em>
                      </MenuItem>
                      {!suppliersLoading && suppliers.map((sup) => (
                        <MenuItem key={sup._id} value={sup._id}>
                          {sup.fullName}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText error={!!errors.supplier}>
                      {errors.supplier?.message}
                    </FormHelperText>
                  </FormControl>
                )}

                <FormControl fullWidth margin="dense">
                  <InputLabel>{strings.MINIMUM_AMOUNT}</InputLabel>
                  <Input
                    type="number"
                    {...register('minimumAmount')}
                    error={!!errors.minimumAmount}
                    autoComplete="off"
                    inputProps={{ step: '0.01', min: '0' }}
                  />
                  <FormHelperText error={!!errors.minimumAmount}>
                    {errors.minimumAmount?.message}
                  </FormHelperText>
                </FormControl>

                <FormControl fullWidth margin="dense">
                  <InputLabel>{strings.USAGE_LIMIT}</InputLabel>
                  <Input
                    type="number"
                    {...register('usageLimit')}
                    error={!!errors.usageLimit}
                    autoComplete="off"
                    inputProps={{ step: '1', min: '1' }}
                  />
                  <FormHelperText error={!!errors.usageLimit}>
                    {errors.usageLimit?.message}
                  </FormHelperText>
                </FormControl>

                <FormControl fullWidth margin="dense">
                  <DateTimePicker
                    label={strings.VALID_FROM}
                    value={validFrom}
                    onChange={(date: Date | null) => setValue('validFrom', date || new Date())}
                    language={user?.language}
                    required
                    variant="standard"
                  />
                  <FormHelperText error={!!errors.validFrom}>
                    {errors.validFrom?.message}
                  </FormHelperText>
                </FormControl>

                <FormControl fullWidth margin="dense">
                  <DateTimePicker
                    label={strings.VALID_TO}
                    value={validTo}
                    onChange={(date: Date | null) => setValue('validTo', date || new Date())}
                    language={user?.language}
                    required
                    variant="standard"
                  />
                  <FormHelperText error={!!errors.validTo}>
                    {errors.validTo?.message}
                  </FormHelperText>
                </FormControl>

                {/* Time Restrictions Section */}
                <FormControl fullWidth margin="dense">
                  <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                    {strings.TIME_RESTRICTIONS}
                  </Typography>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={timeRestrictionEnabled || false}
                        onChange={(e) => setValue('timeRestrictionEnabled', e.target.checked)}
                      />
                    }
                    label={strings.TIME_RESTRICTION_ENABLED}
                    className="voucher-switch"
                  />
                </FormControl>

                {timeRestrictionEnabled && (
                  <>
                    <FormControl fullWidth margin="dense">
                      <TimeSlotPicker
                        timeSlots={allowedTimeSlots || []}
                        onChange={(slots) => setValue('allowedTimeSlots', slots)}
                        error={errors.allowedTimeSlots?.message}
                      />
                    </FormControl>

                    <FormControl fullWidth margin="dense">
                      <DayOfWeekSelector
                        selectedDays={allowedDaysOfWeek || []}
                        onChange={(days) => setValue('allowedDaysOfWeek', days)}
                      />
                    </FormControl>

                    <FormControl fullWidth margin="dense">
                      <FormControlLabel
                        control={
                          <Switch
                            checked={dailyUsageLimitEnabled || false}
                            onChange={(e) => setValue('dailyUsageLimitEnabled', e.target.checked)}
                          />
                        }
                        label={strings.DAILY_USAGE_LIMIT_ENABLED}
                        className="voucher-switch"
                      />
                    </FormControl>

                    {dailyUsageLimitEnabled && (
                      <FormControl fullWidth margin="dense">
                        <InputLabel>{strings.DAILY_USAGE_LIMIT}</InputLabel>
                        <Input
                          type="number"
                          {...register('dailyUsageLimit')}
                          error={!!errors.dailyUsageLimit}
                          autoComplete="off"
                          inputProps={{ step: '1', min: '1' }}
                        />
                        <FormHelperText error={!!errors.dailyUsageLimit}>
                          {errors.dailyUsageLimit?.message}
                        </FormHelperText>
                      </FormControl>
                    )}
                  </>
                )}

                <FormControl fullWidth margin="dense">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={isActive || false}
                        onChange={(e) => setValue('isActive', e.target.checked)}
                      />
                    }
                    label={strings.ACTIVE}
                    className="voucher-switch"
                  />
                </FormControl>
              </div>

              <div className="buttons">
                <Button
                  type="submit"
                  variant="contained"
                  className="btn-primary btn-margin-bottom"
                  size="small"
                  disabled={isSubmitting}
                >
                  {strings.CREATE}
                </Button>
                <Button
                  variant="contained"
                  className="btn-secondary btn-margin-bottom"
                  size="small"
                  onClick={() => navigate('/vouchers')}
                >
                  {commonStrings.CANCEL}
                </Button>
              </div>
            </form>

            {submitError && <Error message={commonStrings.GENERIC_ERROR} />}
          </Paper>
        </div>
      )}

      {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
    </Layout>
  )
}

export default CreateVoucher
