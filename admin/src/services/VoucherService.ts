import * as bookcarsTypes from ':bookcars-types'
import axiosInstance from './axiosInstance'

/**
 * Create a Voucher.
 *
 * @param {bookcarsTypes.CreateVoucherPayload} data
 * @returns {Promise<bookcarsTypes.Voucher>}
 */
export const create = (data: bookcarsTypes.CreateVoucherPayload): Promise<bookcarsTypes.Voucher> =>
  axiosInstance
    .post(
      '/api/create-voucher',
      data,
      { withCredentials: true }
    )
    .then((res) => res.data)

/**
 * Update a Voucher.
 *
 * @param {string} id
 * @param {bookcarsTypes.UpdateVoucherPayload} data
 * @returns {Promise<number>}
 */
export const update = (id: string, data: bookcarsTypes.UpdateVoucherPayload): Promise<number> =>
  axiosInstance
    .put(
      `/api/update-voucher/${encodeURIComponent(id)}`,
      data,
      { withCredentials: true }
    )
    .then((res) => res.status)

/**
 * Delete a Voucher.
 *
 * @param {string} id
 * @returns {Promise<number>}
 */
export const deleteVoucher = (id: string): Promise<number> =>
  axiosInstance
    .delete(
      `/api/delete-voucher/${encodeURIComponent(id)}`,
      { withCredentials: true }
    )
    .then((res) => res.status)

/**
 * Get a Voucher by ID.
 *
 * @param {string} id
 * @returns {Promise<bookcarsTypes.Voucher>}
 */
export const getVoucher = (id: string): Promise<bookcarsTypes.Voucher> =>
  axiosInstance
    .get(
      `/api/voucher/${encodeURIComponent(id)}`,
      { withCredentials: true }
    )
    .then((res) => res.data)

/**
 * Get Vouchers.
 *
 * @param {string} keyword
 * @param {bookcarsTypes.GetVouchersPayload} data
 * @param {number} page
 * @param {number} size
 * @returns {Promise<bookcarsTypes.Result<bookcarsTypes.Voucher>>}
 */
export const getVouchers = (
  keyword: string,
  data: bookcarsTypes.GetVouchersPayload,
  page: number,
  size: number,
): Promise<bookcarsTypes.Result<bookcarsTypes.Voucher>> => {
  const params = new URLSearchParams()
  params.append('keyword', keyword)
  params.append('page', page.toString())
  params.append('size', size.toString())
  if (data.isActive !== undefined) {
    params.append('isActive', data.isActive.toString())
  }
  if (data.suppliers && data.suppliers.length > 0) {
    params.append('supplier', data.suppliers[0])
  }
  if (data.fundingType) {
    params.append('fundingType', data.fundingType)
  }

  return axiosInstance
    .get(
      `/api/vouchers?${params.toString()}`,
      { withCredentials: true },
    )
    .then((res) => res.data)
}

/**
 * Validate a voucher code.
 *
 * @param {bookcarsTypes.ValidateVoucherPayload} data
 * @returns {Promise<bookcarsTypes.ValidateVoucherResult>}
 */
export const validateVoucher = (data: bookcarsTypes.ValidateVoucherPayload): Promise<bookcarsTypes.ValidateVoucherResult> =>
  axiosInstance
    .post(
      '/api/validate-voucher',
      data,
      { withCredentials: true }
    )
    .then((res) => res.data)

/**
 * Get voucher usage statistics.
 *
 * @param {string} id
 * @returns {Promise<bookcarsTypes.VoucherUsageResult>}
 */
export const getVoucherUsage = (id: string): Promise<bookcarsTypes.VoucherUsageResult> =>
  axiosInstance
    .get(
      `/api/voucher-usage/${encodeURIComponent(id)}`,
      { withCredentials: true }
    )
    .then((res) => res.data)