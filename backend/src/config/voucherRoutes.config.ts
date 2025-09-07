const routes = {
  create: '/api/create-voucher',
  update: '/api/update-voucher/:id',
  delete: '/api/delete-voucher/:id',
  getVoucher: '/api/voucher/:id',
  getVouchers: '/api/vouchers',
  getVoucherUsage: '/api/voucher-usage/:id',
  validateVoucher: '/api/validate-voucher',
  applyVoucher: '/api/apply-voucher',
  removeVoucher: '/api/remove-voucher/:bookingId',
}

export default routes