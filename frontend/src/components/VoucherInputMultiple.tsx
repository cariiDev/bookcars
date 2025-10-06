import React, { useState } from 'react'
import {
  InputLabel,
  FormControl,
  FormHelperText,
  OutlinedInput,
  Button,
  InputAdornment,
  CircularProgress,
  Chip,
  Box,
  Typography,
} from '@mui/material'
import {
  LocalOffer as VoucherIcon,
  CheckCircle as AppliedIcon,
  Close as RemoveIcon,
  Add as AddIcon,
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import { strings } from '@/lang/checkout'
import * as VoucherService from '@/services/VoucherService'
import * as helper from '@/utils/helper'

interface VoucherInputMultipleProps {
  bookingAmount: number
  bookingStartTime?: Date
  bookingEndTime?: Date
  userId?: string
  onVouchersChange?: (vouchers: bookcarsTypes.Voucher[], codes: string[], totalDiscount: number) => void
  disabled?: boolean
}

interface AppliedVoucher {
  voucher: bookcarsTypes.Voucher
  code: string
}

const VoucherInputMultiple: React.FC<VoucherInputMultipleProps> = ({
  bookingAmount,
  bookingStartTime,
  bookingEndTime,
  userId,
  onVouchersChange,
  disabled = false,
}) => {
  const [voucherCode, setVoucherCode] = useState('')
  const [appliedVouchers, setAppliedVouchers] = useState<AppliedVoucher[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [totalDiscount, setTotalDiscount] = useState(0)

  const handleApply = async () => {
    if (!voucherCode.trim()) {
      return
    }

    setLoading(true)
    setError('')

    try {
      // Get current voucher codes
      const currentCodes = appliedVouchers.map(av => av.code)
      const newCodes = [...currentCodes, voucherCode.trim()]

      const payload: bookcarsTypes.ValidateStackableVouchersPayload = {
        voucherCodes: newCodes,
        bookingAmount,
        bookingStartTime: bookingStartTime?.toISOString(),
        bookingEndTime: bookingEndTime?.toISOString(),
        userId,
      }

      const result = await VoucherService.validateStackableVouchers(payload)

      if (result.valid) {
        // First validate the single voucher to get voucher details
        const singleVoucherPayload: bookcarsTypes.ValidateVoucherPayload = {
          code: voucherCode.trim(),
          bookingAmount,
          bookingStartTime: bookingStartTime?.toISOString(),
          bookingEndTime: bookingEndTime?.toISOString(),
          userId,
        }

        const singleResult = await VoucherService.validateVoucher(singleVoucherPayload)

        if (singleResult.valid && singleResult.voucher) {
          const newAppliedVoucher: AppliedVoucher = {
            voucher: singleResult.voucher,
            code: voucherCode.trim()
          }

          const updatedAppliedVouchers = [...appliedVouchers, newAppliedVoucher]
          setAppliedVouchers(updatedAppliedVouchers)
          setTotalDiscount(result.totalSavings || 0)
          setVoucherCode('')

          onVouchersChange?.(
            updatedAppliedVouchers.map(av => av.voucher),
            updatedAppliedVouchers.map(av => av.code),
            result.totalSavings || 0
          )

          helper.info(strings.VOUCHER_APPLIED)
        } else {
          setError(singleResult.message || strings.VOUCHER_INVALID)
        }
      } else {
        let errorMessage = result.message || strings.VOUCHER_INVALID
        if (result.message?.includes('cannot be combined')) {
          errorMessage = strings.VOUCHER_CANNOT_COMBINE || result.message
        }
        setError(errorMessage)
      }
    } catch (err: any) {
      setError(strings.VOUCHER_INVALID)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (indexToRemove: number) => {
    const updatedAppliedVouchers = appliedVouchers.filter((_, index) => index !== indexToRemove)
    setAppliedVouchers(updatedAppliedVouchers)
    setError('')

    if (updatedAppliedVouchers.length === 0) {
      setTotalDiscount(0)
      onVouchersChange?.([], [], 0)
    } else {
      // Recalculate total discount for remaining vouchers
      try {
        const payload: bookcarsTypes.ValidateStackableVouchersPayload = {
          voucherCodes: updatedAppliedVouchers.map(av => av.code),
          bookingAmount,
          bookingStartTime: bookingStartTime?.toISOString(),
          bookingEndTime: bookingEndTime?.toISOString(),
          userId,
        }

        const result = await VoucherService.validateStackableVouchers(payload)

        if (result.valid) {
          setTotalDiscount(result.totalSavings || 0)
          onVouchersChange?.(
            updatedAppliedVouchers.map(av => av.voucher),
            updatedAppliedVouchers.map(av => av.code),
            result.totalSavings || 0
          )
        }
      } catch (err) {
        setTotalDiscount(0)
        onVouchersChange?.([], [], 0)
      }
    }
  }

  const handleClearAll = () => {
    setAppliedVouchers([])
    setTotalDiscount(0)
    setError('')
    onVouchersChange?.([], [], 0)
  }

  return (
    <div className="voucher-input-container">
      <div className="checkout-info">
        <VoucherIcon />
        <span>{strings.VOUCHER_CODE}</span>
      </div>

      {/* Applied Vouchers Display */}
      {appliedVouchers.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1, color: 'green', display: 'flex', alignItems: 'center', gap: 1 }}>
            <AppliedIcon fontSize="small" />
            Applied Vouchers ({appliedVouchers.length})
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
            {appliedVouchers.map((appliedVoucher, index) => (
              <Chip
                key={index}
                label={appliedVoucher.code}
                onDelete={() => handleRemove(index)}
                color="success"
                variant="outlined"
                size="small"
                deleteIcon={<RemoveIcon />}
                disabled={disabled || loading}
              />
            ))}
          </Box>
          {totalDiscount > 0 && (
            <Typography variant="body2" sx={{ color: 'green', fontWeight: 'bold' }}>
              Total Discount: -{totalDiscount.toFixed(2)}
            </Typography>
          )}
          <Button
            size="small"
            color="secondary"
            onClick={handleClearAll}
            disabled={disabled || loading}
            sx={{ mt: 1 }}
          >
            Clear All
          </Button>
        </Box>
      )}

      {/* Voucher Input Form */}
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
            disabled={disabled || loading}
            error={!!error}
            label={strings.VOUCHER_CODE}
            endAdornment={
              <InputAdornment position="end">
                <Button
                  onClick={handleApply}
                  disabled={disabled || loading || !voucherCode.trim()}
                  size="small"
                  variant="contained"
                  color="primary"
                  startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
                >
                  {loading ? '' : strings.VOUCHER_APPLY}
                </Button>
              </InputAdornment>
            }
          />
          <FormHelperText error={!!error}>
            {error || (appliedVouchers.length > 0 && (
              <span style={{ color: 'green' }}>
                {appliedVouchers.length} voucher(s) applied successfully
              </span>
            ))}
          </FormHelperText>
        </FormControl>
      </div>
    </div>
  )
}

export default VoucherInputMultiple