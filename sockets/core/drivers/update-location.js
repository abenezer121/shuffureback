const { findTrip, addTrip } = require('../../../containers/tripContainer')
const { getUsers } = require('../../../containers/usersContainer')
const Pool = require('../../../models/Pool')
const Ride = require('../../../models/Ride')
const Vehicle = require('../../../models/Vehicle')
const { ObjectId } = require('mongoose').Types
const { sanitizeInputs } = require('../../utils/core')
const { getTrip, updateTrip } = require('../../utils/trip')
const { getRent, updateRent } = require('../../utils/rent')
const { updateVehicle } = require('../../utils/vehicle')
const { emitToPassenger } = require('../../utils/passenger')
const TRIP_STATUS = require('../../../constants/trip-statuses')
const RENT_STATUS = require('../../../constants/rent-statuses')
const POOL_STATUS = require('../../../constants/pool-statuses')

const schema = {
  type: "object",
  properties: {
    lat: { type: "number" },
    long: { type: "number" },
  },
  required: ["lat", "long"],
  // additionalProperties: false
}

module.exports = async (data, driver, vehicle, socket) => {
  try {
    await sanitizeInputs(schema, data)
    try {
      if (vehicle && data.long && data.lat) {
        await updateVehicle(vehicle._id)({
          timestamp: new Date(),
          position: {
            type: 'Point',
            coordinates: [
              data.long,
              data.lat
            ]
          },
          lastPingTimestamp: new Date()
        })
      }

      // console.log(driver.firstName + ' ' + driver.lastName + ' - location updated', data)
    } catch (error) {
      console.log({ error })
    }

    if (data.tripId) {
      const trip = await getTrip(data.tripId)
      if (trip) {
        emitToPassenger(trip.passenger)('driverLocation', { lat: data.lat, long: data.long })
        if (trip.status === TRIP_STATUS.STARTED) {
          trip.path.push([ data.long, data.lat ])
          await trip.save()
          // addTrip(trip)
          try {
            await updateTrip(data.tripId)({ path: trip.path })
            // const updateRide = await Ride.updateOne({ _id: data.tripId }, { path: trip.path })
          } catch (error) {
            console.log({ error })
          }
        }
      }
    } else if (data.rentId) {
      try {
        const rent = await getRent(data.rentId)
        if (rent && rent.status === RENT_STATUS.ACCEPTED) {
          emitToPassenger(rent.passenger)('driverLocation', { lat: data.lat, long: data.long })
        }
      } catch (error) {
        console.log(error)
      }
    } else if (data.poolId) {
      const pool = await Pool.findOne({
        _id: ObjectId(data.poolId),
        status: {
          $in: [
            POOL_STATUS.STARTED,
            POOL_STATUS.CREATED,
          ]
        }
      })

      if (pool) {
        for (const passenger of pool.passengers) {
          await emitToPassenger(passenger)('driverLocation', { lat: data.lat, long: data.long })
        }
        if (pool.status === POOL_STATUS.STARTED) {
          pool.path.push([ data.long, data.lat ])
          try {
            await pool.save()
          } catch (error) {
            console.log({ error })
          }
        }
      }
    }
  } catch (error) {
    console.log({ error })
  }

}

