import React, { useState } from 'react'
import { Button, CircularProgress } from '@mui/material'
import { Payment as PaymentIcon } from '@mui/icons-material'
import { strings } from '@/lang/checkout'

interface BayarCashButtonProps {
  paymentUrl: string
  onSuccess: () => void
  onError: (error: string) => void
  disabled?: boolean
}

const BayarCashButton = ({ paymentUrl, onSuccess, onError, disabled }: BayarCashButtonProps) => {
  const [loading, setLoading] = useState(false)

  const handlePayment = () => {
    try {
      setLoading(true)

      // Open BayarCash payment URL in new window
      const paymentWindow = window.open(
        paymentUrl,
        'bayarcash-payment',
        'width=800,height=600,scrollbars=yes,resizable=yes'
      )

      if (!paymentWindow) {
        throw new Error('Popup blocked. Please allow popups for this site.')
      }

      // Monitor the payment window
      const checkWindow = setInterval(() => {
        try {
          // Check if window is closed (user completed or cancelled payment)
          if (paymentWindow.closed) {
            clearInterval(checkWindow)
            setLoading(false)

            // In a real implementation, you might want to check payment status here
            // For now, we'll rely on the webhook callback to update the booking status
            onSuccess()
          }
        } catch {
          // Window might not be accessible due to cross-origin restrictions
          // This is expected behavior
        }
      }, 1000)

      // Cleanup after 30 minutes
      setTimeout(() => {
        clearInterval(checkWindow)
        if (!paymentWindow.closed) {
          paymentWindow.close()
        }
        setLoading(false)
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
