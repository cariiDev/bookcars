import React, { useState, useEffect } from 'react'
import { Button, CircularProgress } from '@mui/material'
import { Payment as PaymentIcon } from '@mui/icons-material'
import { strings } from '@/lang/checkout'

interface BayarCashButtonProps {
  paymentUrl: string
  onSuccess: (result: any) => void
  onError: (error: string) => void
  disabled?: boolean
}

const BayarCashButton = ({ paymentUrl, onSuccess, onError, disabled }: BayarCashButtonProps) => {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Listen for messages from popup
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'BAYARCASH_PAYMENT_RESULT') {
        setLoading(false)

        if (event.data.success) {
          onSuccess(event.data)
        } else {
          onError(event.data.error || 'Payment failed')
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onSuccess, onError])

  const handlePayment = () => {
    try {
      setLoading(true)

      // Open BayarCash payment URL in popup
      const paymentWindow = window.open(
        paymentUrl,
        'bayarcash-payment',
        'width=800,height=600,scrollbars=yes,resizable=yes'
      )

      if (!paymentWindow) {
        throw new Error('Popup blocked. Please allow popups for this site.')
      }

      // Monitor if popup is closed manually (without payment)
      const checkClosed = setInterval(() => {
        if (paymentWindow.closed) {
          clearInterval(checkClosed)
          setLoading(false)
          // Don't call onError here as user might have just canceled
        }
      }, 1000)

      // Cleanup after 30 minutes
      setTimeout(() => {
        clearInterval(checkClosed)
        if (!paymentWindow.closed) {
          paymentWindow.close()
        }
        setLoading(false)
        onError('Payment timeout. Please try again.')
      }, 30 * 60 * 1000)
    } catch (error) {
      setLoading(false)
      onError(error instanceof Error ? error.message : 'Payment failed')
    }
  }

  return (
    <Button
      variant="contained"
      onClick={handlePayment}
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PaymentIcon />}
      className="btn-checkout bayarcash-payment-button"
      size="large"
      fullWidth
    >
      {loading ? strings.BAYARCASH_REDIRECTING : strings.BAYARCASH_PAYMENT}
    </Button>
  )
}

export default BayarCashButton
