import express from 'express'
import routeNames from '../config/bayarcashRoutes.config'
import * as bayarcashController from '../controllers/bayarcashController'

const routes = express.Router()

routes.route(routeNames.createBayarCashPayment).post(bayarcashController.createBayarCashPayment)
routes.route(routeNames.handleBayarCashCallback).post(bayarcashController.handleBayarCashCallback)
routes.route(routeNames.checkBayarCashTransaction).post(bayarcashController.checkBayarCashTransaction)

export default routes