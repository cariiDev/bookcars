import React, { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

const BayarCashPopupReturn = () => {
  const [searchParams] = useSearchParams()

  useEffect(() => {
    try {
      // Extract BayarCash parameters
      const transactionId = searchParams.get('transaction_id')
      const orderNumber = searchParams.get('order_number')
      const status = searchParams.get('status')
      const statusDescription = searchParams.get('status_description')
      const amount = searchParams.get('amount')

      // Check if this is opened in a popup
      const isPopup = window.opener && window.opener !== window

      if (isPopup) {
        // Send result to parent window
        window.opener.postMessage({
          type: 'BAYARCASH_PAYMENT_RESULT',
          success: status === '3', // Status 3 = Approved in BayarCash
          transactionId,
          orderNumber,
          status,
          statusDescription,
          amount,
        }, window.opener.origin)

        // Close popup after sending message
        setTimeout(() => {
          window.close()
        }, 1000)
      } else {
        // If not in popup, redirect to regular checkout return
        const params = new URLSearchParams()
        if (transactionId) {
          params.set('transaction_id', transactionId)
        }
        if (orderNumber) {
          params.set('order_number', orderNumber)
        }
        if (status) {
          params.set('status', status)
        }

        window.location.href = `/checkout-return?${params.toString()}`
      }
    } catch (error) {
      console.error('BayarCash popup return error:', error)

      // Send error to parent if in popup
      if (window.opener) {
        window.opener.postMessage({
          type: 'BAYARCASH_PAYMENT_RESULT',
          success: false,
          error: 'Payment processing failed'
        }, window.opener.origin)

        setTimeout(() => window.close(), 1000)
      }
    }
  }, [searchParams])

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      flexDirection: 'column',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div>Processing payment result...</div>
      <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
        This window will close automatically.
      </div>
    </div>
  )
}

export default BayarCashPopupReturn
