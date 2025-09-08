import * as bookcarsTypes from ':bookcars-types'
import axiosInstance from './axiosInstance'

/**
 * Validate a voucher code.
 *
 * @param {bookcarsTypes.ValidateVoucherPayload} data
 * @returns {Promise<bookcarsTypes.VoucherValidationResult>}
 */
export const validateVoucher = (data: bookcarsTypes.ValidateVoucherPayload): Promise<bookcarsTypes.VoucherValidationResult> =>
  axiosInstance
    .post(
      '/api/validate-voucher',
      data,
      { withCredentials: true }
    )
    .then((res) => res.data)