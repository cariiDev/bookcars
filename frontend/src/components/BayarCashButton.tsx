import React, { useState } from 'react'
import { Button, CircularProgress } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import * as BayarCashService from '@/services/BayarCashService'
import * as BookingService from '@/services/BookingService'
import * as PaymentService from '@/services/PaymentService'
import * as UserService from '@/services/UserService'
import env from '@/config/env.config'
import * as helper from '@/utils/helper'

interface BayarCashButtonProps {
  car: bookcarsTypes.Car
  user?: bookcarsTypes.User
  pickupLocation: bookcarsTypes.Location
  dropOffLocation: bookcarsTypes.Location
  from: Date
  to: Date
  authenticated: boolean
  price: number
  depositPrice: number
  payDeposit: boolean
  daysLabel: string
  license?: string | null
  additionalDriver?: boolean
  formData: {
    email?: string
    phone?: string
    fullName?: string
    birthDate?: Date
    cancellation?: boolean
    amendments?: boolean
    theftProtection?: boolean
    collisionDamageWaiver?: boolean
    fullInsurance?: boolean
    additionalDriverFullName?: string
    additionalDriverEmail?: string
    additionalDriverPhone?: string
    additionalDriverBirthDate?: Date
  }
  additionalDriverRequired?: boolean
  isFormValid: boolean
  onSuccess?: () => void
  onError?: (error: any) => void
}

const BayarCashButton: React.FC<BayarCashButtonProps> = ({
  car,
  user,
  pickupLocation,
  dropOffLocation,
  from,
  to,
  authenticated,
  price,
  depositPrice,
  payDeposit,
  daysLabel,
  license,
  additionalDriver,
  formData,
  additionalDriverRequired,
  isFormValid,
  onError,
}) => {
  const [processing, setProcessing] = useState(false)

  const handlePayment = async () => {
    if (!isFormValid) {
      return
    }

    try {
      setProcessing(true)
      
      // Build driver and booking objects
      let driver: bookcarsTypes.User | undefined
      let _additionalDriver: bookcarsTypes.AdditionalDriver | undefined

      if (!authenticated) {
        driver = {
          email: formData.email,
          phone: formData.phone,
          fullName: formData.fullName!,
          birthDate: formData.birthDate,
          language: UserService.getLanguage(),
          license: license || undefined,
        }
      }

      const basePrice = await bookcarsHelper.convertPrice(price, PaymentService.getCurrency(), env.BASE_CURRENCY)

      const booking: bookcarsTypes.Booking = {
        supplier: car.supplier._id as string,
        car: car._id,
        driver: authenticated ? user?._id : undefined,
        pickupLocation: pickupLocation._id,
        dropOffLocation: dropOffLocation._id,
        from,
        to,
        status: bookcarsTypes.BookingStatus.Pending,
        cancellation: formData.cancellation,
        amendments: formData.amendments,
        theftProtection: formData.theftProtection,
        collisionDamageWaiver: formData.collisionDamageWaiver,
        fullInsurance: formData.fullInsurance,
        additionalDriver,
        price: basePrice,
      }

      if (additionalDriverRequired && additionalDriver && formData.additionalDriverBirthDate) {
        _additionalDriver = {
          fullName: formData.additionalDriverFullName!,
          email: formData.additionalDriverEmail!,
          phone: formData.additionalDriverPhone!,
          birthDate: formData.additionalDriverBirthDate,
        }
      }

      booking.isDeposit = payDeposit

      const payload: bookcarsTypes.CheckoutPayload = {
        driver,
        booking,
        additionalDriver: _additionalDriver,
        payLater: false,
        bayarCash: true,
      }

      const { status, bookingId } = await BookingService.checkout(payload)

      if (status === 200 && bookingId) {
        // Now create BayarCash payment with the booking ID
        const name = bookcarsHelper.truncateString(car.name, BayarCashService.ORDER_NAME_MAX_LENGTH)
        const _description = `${car.name} - ${daysLabel} - ${pickupLocation._id === dropOffLocation._id ? pickupLocation.name : `${pickupLocation.name} - ${dropOffLocation.name}`}`
        const description = bookcarsHelper.truncateString(_description, BayarCashService.ORDER_DESCRIPTION_MAX_LENGTH)
        const amount = payDeposit ? depositPrice : price
        
        const bayarCashPayload: bookcarsTypes.CreateBayarCashPayload = {
          bookingId,
          amount,
          currency: PaymentService.getCurrency(),
          paymentChannel: env.BAYARCASH_PAYMENT_CHANNEL,
          payerName: authenticated ? (user?.fullName || '') : (formData.fullName || ''),
          payerEmail: authenticated ? (user?.email || '') : (formData.email || ''),
          payerTelephoneNumber: authenticated ? (user?.phone || '') : (formData.phone || ''),
          name,
          description,
        }
        
        const paymentResult = await BayarCashService.createPayment(bayarCashPayload)
        
        // Redirect to BayarCash payment page
        if (paymentResult.paymentUrl) {
          window.location.href = paymentResult.paymentUrl
        }
      } else {
        if (onError) {
          onError(new Error('Failed to create booking'))
        } else {
          helper.error()
        }
        setProcessing(false)
        return
      }
    } catch (err) {
      if (onError) {
        onError(err)
      } else {
        helper.error(err)
      }
      setProcessing(false)
    }
  }

  return (
    <div className="payment-options-container">
      <div className="bayarcash-payment-info">
        <p>You will be redirected to {BayarCashService.getPaymentChannelName(env.BAYARCASH_PAYMENT_CHANNEL)} to complete your payment.</p>
      </div>
      <Button
        variant="contained"
        color="primary"
        fullWidth
        size="large"
        disabled={processing}
        onClick={handlePayment}
      >
        {processing ? (
          <>
            <CircularProgress size={20} sx={{ marginRight: 1 }} />
            Processing...
          </>
        ) : (
          `Pay with ${BayarCashService.getPaymentChannelName(env.BAYARCASH_PAYMENT_CHANNEL)}`
        )}
      </Button>
    </div>
  )
}

export default BayarCashButton