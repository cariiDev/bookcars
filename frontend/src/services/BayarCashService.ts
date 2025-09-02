import * as bookcarsTypes from ':bookcars-types'
import axiosInstance from './axiosInstance'

/**
 * Create BayarCash payment intent.
 *
 * @param {bookcarsTypes.CreateBayarcashPaymentPayload} payload
 * @returns {Promise<{id: string, url: string, payerName: string, payerEmail: string, orderNumber: string, amount: number}>}
 */
export const createPaymentIntent = (payload: bookcarsTypes.CreateBayarcashPaymentPayload): Promise<{
  id: string
  url: string
  payerName: string
  payerEmail: string
  orderNumber: string
  amount: number
}> =>
  axiosInstance
    .post('/api/create-bayarcash-payment', payload)
    .then((res) => res.data)

/**
 * Check BayarCash payment status.
 *
 * @param {string} paymentId
 * @returns {Promise<number>}
 */
export const checkPaymentStatus = (paymentId: string): Promise<number> =>
  axiosInstance
    .post(`/api/check-bayarcash-payment/${paymentId}`)
    .then((res) => res.status)

/**
 * Get BayarCash locale for payments (always Malaysian settings).
 *
 * @returns {string}
 */
export const getLocale = (): string => 'ms-MY' // Malaysian locale

/**
 * Order name max length for BayarCash.
 *
 * @type {100}
 */
export const ORDER_NAME_MAX_LENGTH = 100

/**
 * Order description max length for BayarCash.
 *
 * @type {200}
 */
export const ORDER_DESCRIPTION_MAX_LENGTH = 200
