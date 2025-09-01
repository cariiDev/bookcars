
import express from 'express'
import routeNames from '../config/bayarcashRoutes.config'
import * as bayarcashController from '../controllers/bayarcashController'

const routes = express.Router()

routes.route(routeNames.createPaymentIntent).post(bayarcashController.createPaymentIntent)
routes.route(routeNames.checkPaymentStatus).post(bayarcashController.checkPaymentStatus)
routes.route(routeNames.handleCallback).post(bayarcashController.handleCallback)

export default routes
