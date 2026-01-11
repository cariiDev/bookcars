import React, { useState } from 'react'
import {
  InputLabel,
  FormControl,
  FormHelperText,
  OutlinedInput,
  Button,
  InputAdornment,
  CircularProgress,
} from '@mui/material'
import {
  LocalOffer as VoucherIcon,
  CheckCircle as AppliedIcon,
  Close as RemoveIcon,
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import { strings } from '@/lang/checkout'
import * as VoucherService from '@/services/VoucherService'
import * as helper from '@/utils/helper'

interface VoucherInputProps {
  value?: string
  bookingAmount: number
  bookingStartTime?: Date
  bookingEndTime?: Date
  userId?: string
  onVoucherChange?: (voucher: bookcarsTypes.Voucher | null, code: string, discountAmount?: number) => void
  disabled?: boolean
}

const VoucherInput: React.FC<VoucherInputProps> = ({
  value = '',
  bookingAmount,
  bookingStartTime,
  bookingEndTime,
  userId,
  onVoucherChange,
  disabled = false,
}) => {
  const [voucherCode, setVoucherCode] = useState(value)
  const [appliedVoucher, setAppliedVoucher] = useState<bookcarsTypes.Voucher | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleApply = async () => {
    if (!voucherCode.trim()) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const payload: bookcarsTypes.ValidateVoucherPayload = {
        code: voucherCode.trim(),
        bookingAmount,
        bookingStartTime: bookingStartTime?.toISOString(),
        bookingEndTime: bookingEndTime?.toISOString(),
        userId,
      }

      const result = await VoucherService.validateVoucher(payload)
      
      if (result.valid && result.voucher) {
        setAppliedVoucher(result.voucher)
        onVoucherChange?.(result.voucher, voucherCode.trim(), result.discountAmount)
        helper.info(strings.VOUCHER_APPLIED)
      } else {
        let errorMessage = result.message || strings.VOUCHER_INVALID
        if (result.message?.includes('expired')) {
          errorMessage = strings.VOUCHER_EXPIRED
        } else if (result.message?.includes('already used')) {
          errorMessage = strings.VOUCHER_USED
        } else if (result.message?.includes('not valid for this time period')) {
          errorMessage = strings.VOUCHER_INVALID_TIME_SLOT
        } else if (result.message?.includes('not valid for this day of the week')) {
          errorMessage = strings.VOUCHER_INVALID_DAY_OF_WEEK
        } else if (result.message?.includes('Daily usage limit exceeded')) {
          errorMessage = strings.VOUCHER_DAILY_LIMIT_EXCEEDED
        } else if (result.message?.includes('duration exceeds voucher daily limit')) {
          errorMessage = strings.VOUCHER_BOOKING_TOO_LONG
        }
        
        setError(errorMessage)
        setAppliedVoucher(null)
        onVoucherChange?.(null, '', undefined)
      }
    } catch (err: any) {
      setError(strings.VOUCHER_INVALID)
      setAppliedVoucher(null)
      onVoucherChange?.(null, '', undefined)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = () => {
    setVoucherCode('')
    setAppliedVoucher(null)
    setError('')
    onVoucherChange?.(null, '', undefined)
  }

  return (
    <div className="voucher-input-container">
      <div className="checkout-info">
        <VoucherIcon />
        <span>{strings.VOUCHER_CODE}</span>
      </div>
      <div className="voucher-input-form">
        <FormControl fullWidth margin="dense">
          <InputLabel>{strings.VOUCHER_CODE}</InputLabel>
          <OutlinedInput
            value={voucherCode}
            onChange={(e) => {
              setVoucherCode(e.target.value)
              if (error) {
                setError('')
              }
            }}
            placeholder={strings.VOUCHER_CODE_PLACEHOLDER}
            disabled={disabled || loading || !!appliedVoucher}
            error={!!error}
            label={strings.VOUCHER_CODE}
            endAdornment={
              <InputAdornment position="end">
                {appliedVoucher ? (
                  <Button
                    onClick={handleRemove}
                    disabled={disabled || loading}
                    size="small"
                    startIcon={<RemoveIcon />}
                    color="secondary"
                  >
                    {strings.VOUCHER_REMOVE}
                  </Button>
                ) : (
                  <Button
                    onClick={handleApply}
                    disabled={disabled || loading || !voucherCode.trim()}
                    size="small"
                    variant="contained"
                    color="primary"
                  >
                    {loading ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      strings.VOUCHER_APPLY
                    )}
                  </Button>
                )}
              </InputAdornment>
            }
          />
          <FormHelperText error={!!error}>
            {error || (appliedVoucher && (
              <span style={{ color: 'green', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AppliedIcon fontSize="small" />
                {strings.VOUCHER_APPLIED}
              </span>
            ))}
          </FormHelperText>
        </FormControl>
      </div>
    </div>
  )
}

export default VoucherInput
