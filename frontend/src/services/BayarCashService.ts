import * as bookcarsTypes from ':bookcars-types'
import axiosInstance from './axiosInstance'

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
 * Payment channel names for display
 */
export const PAYMENT_CHANNEL_NAMES = {
  [PAYMENT_CHANNELS.FPX]: 'FPX Online Banking',
  [PAYMENT_CHANNELS.MANUAL_TRANSFER]: 'Manual Bank Transfer',
  [PAYMENT_CHANNELS.DIRECT_DEBIT]: 'Direct Debit (FPX)',
  [PAYMENT_CHANNELS.FPX_CREDIT]: 'FPX Line of Credit',
  [PAYMENT_CHANNELS.DUITNOW_BANKING]: 'DuitNow Online Banking/Wallets',
  [PAYMENT_CHANNELS.DUITNOW_QR]: 'DuitNow QR',
  [PAYMENT_CHANNELS.SHOPEE_BNPL]: 'SPayLater (Shopee BNPL)',
  [PAYMENT_CHANNELS.BOOST_BNPL]: 'Boost PayFlex (Boost BNPL)',
  [PAYMENT_CHANNELS.QRIS_BANKING_ID]: 'QRIS Indonesia Online Banking',
  [PAYMENT_CHANNELS.QRIS_EWALLET_ID]: 'QRIS Indonesia eWallet',
  [PAYMENT_CHANNELS.NETS_SG]: 'NETS Singapore',
} as const

/**
 * Order item name max length 200 characters
 * https://developer.paypal.com/docs/api/invoicing/v2/#invoices_create!ct=application/json&path=items/name&t=request
 *
 * @type {200}
 */
export const ORDER_NAME_MAX_LENGTH = 200

/**
 * Order item description max length 1000 characters
 * https://developer.paypal.com/docs/api/invoicing/v2/#invoices_create!ct=application/json&path=items/description&t=request
 *
 * @type {1000}
 */
export const ORDER_DESCRIPTION_MAX_LENGTH = 1000

/**
 * Create BayarCash payment.
 *
 * @param {bookcarsTypes.CreateBayarCashPayload} payload
 * @returns {Promise<bookcarsTypes.PaymentResult>}
 */
export const createPayment = (payload: bookcarsTypes.CreateBayarCashPayload): Promise<bookcarsTypes.PaymentResult> =>
  axiosInstance
    .post(
      '/api/create-bayarcash-payment',
      payload
    )
    .then((res) => res.data)

/**
 * Check BayarCash transaction status.
 *
 * @param {string} bookingId
 * @param {string} transactionId
 * @returns {Promise<number>}
 */
export const checkTransaction = (bookingId: string, transactionId: string): Promise<number> =>
  axiosInstance
    .post(
      `/api/check-bayarcash-transaction/${bookingId}/${transactionId}`,
      null
    )
    .then((res) => res.status)

/**
 * Get payment channel name for display.
 *
 * @param {number} channelId
 * @returns {string}
 */
export const getPaymentChannelName = (channelId: number): string => {
  return PAYMENT_CHANNEL_NAMES[channelId as keyof typeof PAYMENT_CHANNEL_NAMES] || `Channel ${channelId}`
}