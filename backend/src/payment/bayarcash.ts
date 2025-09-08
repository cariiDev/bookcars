import axios from 'axios'
import crypto from 'crypto'
import * as env from '../config/env.config'

const BAYARCASH_API = env.BAYARCASH_SANDBOX
  ? 'https://api.console.bayarcash-sandbox.com/v3' // BayarCash sandbox host (for testing)
  : 'https://api.console.bayar.cash/v3' // BayarCash production host

/**
 * BayarCash payment channels
 */
export const PAYMENT_CHANNELS = {
  FPX: 1,
  MANUAL_TRANSFER: 2,
  DIRECT_DEBIT: 3,
  FPX_CREDIT: 4,
  DUITNOW_BANKING: 5,
  DUITNOW_QR: 6,
  SHOPEE_BNPL: 7,
  BOOST_BNPL: 8,
  QRIS_BANKING_ID: 9,
  QRIS_EWALLET_ID: 10,
  NETS_SG: 11,
} as const

/**
 * BayarCash transaction status codes
 */
export const TRANSACTION_STATUS = {
  NEW: 0,
  PENDING: 1,
  FAILED: 2,
  SUCCESS: 3,
  CANCELLED: 4,
} as const

/**
 * Generate checksum for payload validation
 */
export const generateChecksum = (payload: Record<string, any>): string => {
  let checksumData: Record<string, any>
  
  // Different fields for payment intent vs transaction callback
  if (payload.record_type === 'transaction') {
    // BayarCash v3 API callbacks with additional fields
    checksumData = {
      record_type: payload.record_type,
      transaction_id: payload.transaction_id,
      exchange_reference_number: payload.exchange_reference_number,
      exchange_transaction_id: payload.exchange_transaction_id,
      order_number: payload.order_number,
      currency: payload.currency,
      amount: payload.amount,
      payer_name: payload.payer_name,
      payer_email: payload.payer_email,
      payer_bank_name: payload.payer_bank_name,
      status: payload.status,
      status_description: payload.status_description,
      datetime: payload.datetime,
    }
  } else {
    // For payment intent creation - original fields
    checksumData = {
      payment_channel: payload.payment_channel,
      order_number: payload.order_number,
      amount: payload.amount,
      payer_name: payload.payer_name,
      payer_email: payload.payer_email,
    }
  }
  
  // Sort keys and create pipe-separated string
  const sortedKeys = Object.keys(checksumData).sort()
  const values = sortedKeys.map(key => checksumData[key as keyof typeof checksumData])
  const concatenated = values.join('|')
  
  
  // Generate HMAC-SHA256 checksum
  return crypto.createHmac('sha256', env.BAYARCASH_API_SECRET).update(concatenated).digest('hex')
}

/**
 * Validate checksum from callback data
 */
export const validateChecksum = (payload: Record<string, any>, receivedChecksum: string): boolean => {
  // Skip validation for pre_transaction callbacks as they don't have checksum fields
  if (payload.record_type === 'pre_transaction') {
    return true
  }

  const calculatedChecksum = generateChecksum(payload)
  return calculatedChecksum === receivedChecksum
}

/**
 * Create payment intent with BayarCash
 */
export const createPaymentIntent = async (
  bookingId: string,
  amount: number,
  currency: string,
  paymentChannel: number,
  payerName: string,
  payerEmail: string,
  name: string,
  description: string,
  payerTelephoneNumber?: string,
  callbackUrl?: string,
  returnUrl?: string,
) => {
  const payload = {
    payment_channel: paymentChannel,
    portal_key: env.BAYARCASH_PORTAL_KEY,
    order_number: bookingId,
    amount: Math.floor(amount * 100) / 100, // Format to 2 decimal places
    payer_name: payerName,
    payer_email: payerEmail,
    ...(payerTelephoneNumber && { payer_telephone_number: payerTelephoneNumber }),
    ...(callbackUrl && { callback_url: callbackUrl }),
    ...(returnUrl && { return_url: returnUrl }),
    item_name: name,
    item_description: description,
  }

  // Generate checksum for security
  const checksum = generateChecksum(payload)
  const payloadWithChecksum = { ...payload, checksum }


  const res = await axios.post(
    `${BAYARCASH_API}/payment-intents`,
    payloadWithChecksum,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.BAYARCASH_ACCESS_TOKEN}`,
      },
    },
  )

  return {
    id: res.data.id,
    url: res.data.url,
    amount: res.data.amount,
    currency: res.data.currency,
    status: res.data.status,
  }
}

/**
 * Get transaction details by transaction ID
 */
export const getTransaction = async (transactionId: string) => {
  const res = await axios.get(
    `${BAYARCASH_API}/transactions/${transactionId}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.BAYARCASH_ACCESS_TOKEN}`,
      },
    },
  )

  return res.data
}
