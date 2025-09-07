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

interface FundingTypeListProps {
  value?: string
  label?: string
  required?: boolean
  variant?: TextFieldVariants
  disabled?: boolean
  style?: CSSProperties
  onChange?: (value: bookcarsTypes.VoucherFundingType) => void
}

const FundingTypeList = ({
  value: fundingTypeListValue,
  label,
  required,
  variant,
  disabled,
  style,
  onChange
}: FundingTypeListProps) => {
  const [value, setValue] = useState('')

  useEffect(() => {
    if (fundingTypeListValue && fundingTypeListValue !== value) {
      setValue(fundingTypeListValue)
    }
  }, [fundingTypeListValue, value])

  const handleChange = (e: SelectChangeEvent<string>) => {
    setValue(e.target.value)

    if (onChange) {
      onChange(e.target.value as bookcarsTypes.VoucherFundingType)
    }
  }

  return (
    <div style={style || {}}>
      <InputLabel className={required ? 'required' : ''}>{label || strings.FUNDING_TYPE}</InputLabel>
      <Select
        label={label}
        value={value}
        onChange={handleChange}
        variant={variant || 'standard'}
        required={required}
        fullWidth
        disabled={disabled}
      >
        <MenuItem value={bookcarsTypes.VoucherFundingType.Platform}>
          {strings.PLATFORM}
        </MenuItem>
        <MenuItem value={bookcarsTypes.VoucherFundingType.Supplier}>
          {strings.SUPPLIER_FUNDED}
        </MenuItem>
        <MenuItem value={bookcarsTypes.VoucherFundingType.CoFunded}>
          {strings.CO_FUNDED}
        </MenuItem>
      </Select>
    </div>
  )
}

export default FundingTypeList
