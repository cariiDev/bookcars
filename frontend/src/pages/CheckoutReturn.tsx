import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Paper, Typography, CircularProgress } from '@mui/material'
import { CheckCircle as SuccessIcon, Error as ErrorIcon } from '@mui/icons-material'
import * as BayarCashService from '@/services/BayarCashService'
import Layout from '@/components/Layout'
import { strings } from '@/lang/checkout'

const CheckoutReturn = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'checking' | 'success' | 'failed'>('checking')

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        // Handle both regular parameters and BayarCash parameters
        const paymentId = searchParams.get('payment_id') || searchParams.get('transaction_id')
        const orderId = searchParams.get('order_id') || searchParams.get('order_number')
        const bayarCashStatus = searchParams.get('status')

        // If BayarCash status is provided and is successful, skip API check
        if (bayarCashStatus === '3') {
          setStatus('success')
          setLoading(false)
          setTimeout(() => {
            navigate('/checkout-success')
          }, 3000)
          return
        }

        // If BayarCash status indicates failure
        if (bayarCashStatus && bayarCashStatus !== '3') {
          setStatus('failed')
          setLoading(false)
          setTimeout(() => {
            navigate('/checkout-failed')
          }, 3000)
          return
        }

        // No payment/order ID found
        if (!paymentId && !orderId) {
          setStatus('failed')
          setLoading(false)
          return
        }

        // Check payment status via API (for other gateways or verification)
        const statusResponse = await BayarCashService.checkPaymentStatus(paymentId || orderId || '')

        if (statusResponse === 200) {
          setStatus('success')
          setTimeout(() => {
            navigate('/checkout-success')
          }, 3000)
        } else {
          setStatus('failed')
          setTimeout(() => {
            navigate('/checkout-failed')
          }, 3000)
        }
      } catch (error) {
        console.error('Payment status check failed:', error)
        setStatus('failed')
        setTimeout(() => {
          navigate('/checkout-failed')
        }, 3000)
      } finally {
        setLoading(false)
      }
    }

    checkPaymentStatus()
  }, [searchParams, navigate])

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" style={{ marginTop: '1rem' }}>
            Checking payment status...
          </Typography>
        </div>
      )
    }

    if (status === 'success') {
      return (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <SuccessIcon color="success" style={{ fontSize: '4rem' }} />
          <Typography variant="h5" color="success" style={{ margin: '1rem 0' }}>
            {strings.BAYARCASH_SUCCESS || 'Payment Successful!'}
          </Typography>
          <Typography variant="body1">
            Redirecting to confirmation page...
          </Typography>
        </div>
      )
    }

    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <ErrorIcon color="error" style={{ fontSize: '4rem' }} />
        <Typography variant="h5" color="error" style={{ margin: '1rem 0' }}>
          {strings.BAYARCASH_ERROR || 'Payment Failed'}
        </Typography>
        <Typography variant="body1">
          Redirecting to payment page...
        </Typography>
      </div>
    )
  }

  return (
    <Layout>
      <div className="container">
        <Paper elevation={3} style={{ maxWidth: '500px', margin: '2rem auto' }}>
          {renderContent()}
        </Paper>
      </div>
    </Layout>
  )
}

export default CheckoutReturn
