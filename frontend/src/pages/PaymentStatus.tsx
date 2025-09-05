import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { strings } from '@/lang/checkout'
import Layout from '@/components/Layout'
import NoMatch from './NoMatch'
import * as BayarCashService from '@/services/BayarCashService'
import * as UserService from '@/services/UserService'
import Info from './Info'
import CheckoutStatus from '@/components/CheckoutStatus'

import '@/assets/css/checkout-session.css'

const PaymentStatus = () => {
  const { bookingId } = useParams<{ bookingId: string }>()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [noMatch, setNoMatch] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (bookingId) {
      const checkPaymentStatus = async () => {
        try {
          setLoading(true)
          
          // Extract BayarCash parameters
          const transactionId = searchParams.get('transaction_id')
          
          if (!transactionId) {
            setNoMatch(true)
            return
          }

          // Check transaction status with backend
          const statusCode = await BayarCashService.checkTransaction(bookingId, transactionId)
          
          // Clean up the URL by removing query parameters
          window.history.replaceState({}, '', `/payment-status/${bookingId}`)
          
          setNoMatch(statusCode === 204)
          setSuccess(statusCode === 200)
        } catch (err) {
          console.error('Error checking BayarCash transaction:', err)
          // Clean up URL even on error
          window.history.replaceState({}, '', `/payment-status/${bookingId}`)
          setSuccess(false)
        } finally {
          setLoading(false)
        }
      }

      checkPaymentStatus()
    } else {
      setNoMatch(true)
      setLoading(false)
    }
  }, [bookingId, searchParams])

  return (
    <Layout>
      <div className="checkout-session">
        {
          loading
            ? <Info message={strings.CHECKING} hideLink />
            : (
              noMatch
                ? <NoMatch hideHeader />
                : (
                  bookingId && (
                    <CheckoutStatus
                      bookingId={bookingId}
                      language={UserService.getLanguage()}
                      status={success ? 'success' : 'error'}
                      className="status"
                    />
                  )
                )
            )
        }
      </div>
    </Layout>
  )
}

export default PaymentStatus
