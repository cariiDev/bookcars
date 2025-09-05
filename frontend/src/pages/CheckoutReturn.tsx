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
        const paymentId = searchParams.get('payment_id')
        const orderId = searchParams.get('order_id')

        if (!paymentId && !orderId) {
          setStatus('failed')
          setLoading(false)
          return
        }

        // Check payment status with BayarCash
        const statusResponse = await BayarCashService.checkPaymentStatus(paymentId || orderId || '')

        if (statusResponse === 200) {
          setStatus('success')
          // Redirect to success page after showing confirmation
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
            {strings.BAYARCASH_SUCCESS}
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
          {strings.BAYARCASH_ERROR}
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
