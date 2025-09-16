import React, { useState, useEffect, CSSProperties } from 'react'
import {
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  TextFieldVariants
} from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import { strings } from '@/lang/vouchers'

interface DiscountTypeListProps {
  value?: string
  label?: string
  required?: boolean
  variant?: TextFieldVariants
  disabled?: boolean
  style?: CSSProperties
  onChange?: (value: bookcarsTypes.VoucherDiscountType) => void
}

const DiscountTypeList = ({
  value: discountTypeListValue,
  label,
  required,
  variant,
  disabled,
  style,
  onChange
}: DiscountTypeListProps) => {
  const [value, setValue] = useState('')

  useEffect(() => {
    if (discountTypeListValue && discountTypeListValue !== value) {
      setValue(discountTypeListValue)
    }
  }, [discountTypeListValue, value])

  const handleChange = (e: SelectChangeEvent<string>) => {
    setValue(e.target.value)

    if (onChange) {
      onChange(e.target.value as bookcarsTypes.VoucherDiscountType)
    }
  }

  return (
    <div style={style || {}}>
      <InputLabel className={required ? 'required' : ''}>{label || strings.DISCOUNT_TYPE}</InputLabel>
      <Select
        label={label}
        value={value}
        onChange={handleChange}
        variant={variant || 'standard'}
        required={required}
        fullWidth
        disabled={disabled}
      >
        <MenuItem value={bookcarsTypes.VoucherDiscountType.Percentage}>
          {strings.PERCENTAGE}
        </MenuItem>
        <MenuItem value={bookcarsTypes.VoucherDiscountType.FixedAmount}>
          {strings.FIXED_AMOUNT}
        </MenuItem>
        <MenuItem value={bookcarsTypes.VoucherDiscountType.FreeHours}>
          Free Hours
        </MenuItem>
        <MenuItem value={bookcarsTypes.VoucherDiscountType.MorningBookings}>
          Morning Discount
        </MenuItem>
        <MenuItem value={bookcarsTypes.VoucherDiscountType.Rent5Get1}>
          Rental Bonus
        </MenuItem>
        <MenuItem value={bookcarsTypes.VoucherDiscountType.WeekdayTrips}>
          Weekday Special
        </MenuItem>
        <MenuItem value={bookcarsTypes.VoucherDiscountType.HourlyPriceReduction}>
          Time-Based Discount
        </MenuItem>
        <MenuItem value={bookcarsTypes.VoucherDiscountType.DurationBasedFreeHours}>
          Duration Bonus
        </MenuItem>
      </Select>
    </div>
  )
}

export default DiscountTypeList
