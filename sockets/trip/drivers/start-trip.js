const { addTrip } = require("../../../containers/tripContainer")
const Ride = require("../../../models/Ride")
const VehicleType = require("../../../models/VehicleType")
const User = require("../../../models/User")
const { notifyPassenger, emitToPassenger } = require("../../utils/passenger")
const { emitToDriver } = require("../../utils/driver")
const { makeRequest } = require('../../../services/axios')
const Setting = require('../../../models/Setting')
const { sanitizeInputs } = require('../../utils/core')
const TRIP_STATUS = require('../../../constants/trip-statuses')
const TRIP_TYPES = require('../../../constants/trip-types')
const { updateTicket } = require("../../utils/ticket")

const schema = {
  type: 'object',
  properties: {
    tripId: {
      type: 'string'
    }
  },
  required: ["tripId"],
  additionalProperties: false
}

module.exports = async (data, driver, vehicle, socket) => {

  try {
    await sanitizeInputs(schema, data)

    Ride.findById(data.tripId, async (err, res) => {
      if (err) console.log(err)
      if (res) {
        if (res.status !== TRIP_STATUS.STARTED) {
          res.status = TRIP_STATUS.STARTED
          res.active = true
          res.pickupTimestamp = new Date()
          res.save()
          if (res.ticket) {
            await updateTicket(res.ticket)({ ride: res._id, active: false })
          }
          // addTrip(res)
          // emitToDriver(res.driver._id)('tripStatus', { status: res.status, pickupTimestamp: res.pickupTimestamp })
          emitToDriver(res.driver._id)('trip', res)
          if (res.passenger) {
            notifyPassenger(res.passenger._id)({ title: 'Started', body: 'Trip has started' })
            // emitToPassenger(res.passenger._id)('tripStatus', { status: res.status, pickupTimestamp: res.pickupTimestamp })
            emitToPassenger(res.passenger._id)('trip', res)
            // sendNotification(passenger.fcm, { title: "Started", body: "Trip has started" });
          }
        } else {
          socket.emit('trip', res)
        }
      }
    }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle')

  } catch (error) {
    console.log(error)
  }

}
