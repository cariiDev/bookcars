import axios from 'axios'
import * as env from '../config/env.config'
import * as helper from '../utils/helper'
import { CreateBayarcashPaymentPayload } from ':bookcars-types'

const BAYARCASH_VERSION = 'v3'

const BAYARCASH_API = env.BAYARCASH_SANDBOX
  ? `https://api.console.bayarcash-sandbox.com/${BAYARCASH_VERSION}` // BayarCash sandbox host (for testing)
  : `https://api.console.bayar.cash/${BAYARCASH_VERSION}` // BayarCash production host (for production)

/**
 * Create BayarCash payment intent.
 *
 * @param {CreateBayarcashPaymentPayload} payload - The payload for creating the payment intent.
 * @returns {Promise<{id: string, url: string, payerName: string, payerEmail: string, orderNumber: string, amount: number}>} A promise that resolves to an object containing the payment intent details.
 */
export const createPaymentIntent = async (
  payload: CreateBayarcashPaymentPayload,
) => {
  const requestPayload = {
    payment_channel: payload.payment_channel,
    portal_key: env.BAYARCASH_PORTAL_KEY,
    order_number: payload.order_number,
    amount: Math.round(payload.amount),
    payer_name: payload.payer_name,
    payer_email: payload.payer_email,
    payer_telephone_number: payload.payer_telephone_number ?
      helper.formatMalaysianPhone(payload.payer_telephone_number) : undefined,
    return_url: payload.return_url,
    callback_url: payload.callback_url,
    metadata: payload.description,
  }

  const res = await axios.post(
    `${BAYARCASH_API}/payment-intents`,
    requestPayload,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.BAYARCASH_ACCESS_TOKEN}`,
      },
    },
  )

  return {
    id: res.data.id,
    url: res.data.url,
    payerName: res.data.payer_name,
    payerEmail: res.data.payer_email,
    orderNumber: res.data.order_number,
    amount: res.data.amount,
  }
}

/**
 * Get BayarCash payment intent by ID.
 *
 * @param {string} paymentId - BayarCash payment intent ID
 * @returns {Promise<any>}
 */
export const getPaymentIntent = async (paymentId: string) => {
  const res = await axios.get(
    `${BAYARCASH_API}/payment-intents/${paymentId}`,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.BAYARCASH_ACCESS_TOKEN}`,
      },
    },
  )

  return res.data
}

/**
 * Get transaction by ID to check payment status.
 *
 * @param {string} transactionId - BayarCash transaction ID
 * @returns {Promise<any>}
 */
export const getTransaction = async (transactionId: string) => {
  const res = await axios.get(
    `${BAYARCASH_API}/transactions/${transactionId}`,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.BAYARCASH_ACCESS_TOKEN}`,
      },
    },
  )

  return res.data
}

/**
 * Validate BayarCash callback checksum for security.
 *
 * @param {any} callbackData - Callback data from BayarCash
 * @returns {boolean}
 */
export const validateChecksum = (callbackData: any): boolean => {
  return helper.validateChecksum(callbackData, env.BAYARCASH_SECRET_KEY)
}
