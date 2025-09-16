import express from 'express'
import routeNames from '../config/voucherRoutes.config'
import authJwt from '../middlewares/authJwt'
import * as voucherController from '../controllers/voucherController'

const routes = express.Router()

//
// Admin voucher management routes
//
routes.route(routeNames.create).post(authJwt.verifyToken, voucherController.create)
routes.route(routeNames.update).put(authJwt.verifyToken, voucherController.update)
routes.route(routeNames.delete).delete(authJwt.verifyToken, voucherController.deleteVoucher)
routes.route(routeNames.getVoucher).get(authJwt.verifyToken, voucherController.getVoucher)
routes.route(routeNames.getVouchers).get(authJwt.verifyToken, voucherController.getVouchers)
routes.route(routeNames.getVoucherUsage).get(authJwt.verifyToken, voucherController.getVoucherUsage)

//
// Customer voucher operation routes
//
routes.route(routeNames.validateVoucher).post(authJwt.verifyToken, voucherController.validateVoucher)
routes.route(routeNames.applyVoucher).post(authJwt.verifyToken, voucherController.applyVoucher)
routes.route(routeNames.removeVoucher).delete(authJwt.verifyToken, voucherController.removeVoucher)
routes.route(routeNames.validateStackableVouchers).post(authJwt.verifyToken, voucherController.validateStackableVouchers)
routes.route(routeNames.findBestVoucherCombination).post(authJwt.verifyToken, voucherController.findBestVoucherCombination)

export default routes