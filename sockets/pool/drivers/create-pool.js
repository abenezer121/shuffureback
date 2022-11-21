const Pool = require('../../../models/Pool')
const Vehicle = require('../../../models/Vehicle')
// const { default: Axios } = require('axios')
const Setting = require('../../../models/Setting')
const { sanitizeInputs } = require('../../utils/core')
const { makeRequest } = require('../../../services/axios')
const activityLogger = require('../../../services/activity-logger')
const POOL_STATUS = require('../../../constants/pool-statuses')
const { updateVehicle } = require('../../utils/vehicle')

const schema = {
  type: "object",
  properties: {
    pickUpAddress: { type: "object" },
    dropOffAddress: { type: "object" },
  },
  required: ["pickUpAddress", "dropOffAddress"],
  additionalProperties: false
}

module.exports = async (data, driver, vehicle, socket) => {
  try {
    console.log('[DEBUG] creating a pool by driver')
    await sanitizeInputs(schema, data)


    const setting = await Setting.findOne()


    const existingPool = await Pool.findOne({ driver: driver._id, status: { $nin: [POOL_STATUS.CANCELLED, POOL_STATUS.ENDED] } })

    if (existingPool) {
      socket.emit('error', {
        type: 'pool',
        message: 'you already are in an active pool'
      })
      return
    }

    const pickup = !data.pickUpAddress.name ? makeRequest({method: 'get', url: 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + data.pickUpAddress.lat + ',' + data.pickUpAddress.long + '&key=' + setting.mapKey }) : data.pickUpAddress
    const dropOff = !data.dropOffAddress.name ? makeRequest({method: 'get', url: 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + data.dropOffAddress.lat + ',' + data.dropOffAddress.long + '&key=' + setting.mapKey }) : data.dropOffAddress


    const apiKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjb21wYW55bmFtZSI6IkdlYmV0YSIsImlkIjoiZDIyOWU3YWQtMTkxYS00ODU0LWE4MmEtNmM3NWI1Zjk2MzkwIiwidXNlcm5hbWUiOiJnZWJldGF1c2VyIn0.ja4SNozrDcevV4r89YIAnEXBUTlqhcYFdLQN2eakDBI"
    const url = "https://mapapi.gebeta.app/api/v1/route/driving/direction/?la1=" + data.pickUpAddress.lat + "&lo1=" +  data.pickUpAddress.long + "&la2=" +  data.dropOffAddress.lat + "&lo2=" +  data.dropOffAddress.long + "&apiKey="+apiKey
 
    const route = makeRequest({ method: 'get', url: url })

    try {
      const [pickupRes, dropOffRes, routeRes] = await Promise.all([pickup, dropOff, route])

      if (!data.pickUpAddress.name) {
        if (pickupRes.status == 200 && pickupRes.data.status == 'OK') {
          data.pickUpAddress.name = pickupRes.data.results[0].formatted_address
        } else {
          data.pickUpAddress.name = '_'
        }
      }

      if (!data.dropOffAddress.name) {
        if (dropOffRes.status == 200 && dropOffRes.data.status == 'OK') {
          data.dropOffAddress.name = dropOffRes.data.results[0].formatted_address
        } else {
          data.dropOffAddress.name = '_'
        }
      }

      if (routeRes && routeRes.data.msg == "Ok") {
        data.route = { coordinates: routeObject.data.direction, distance: routeObject.data.totalDistance, duration: routeObject.data.timetaken }
        
      } 

      
    } catch (error) {
      console.log(error)
    }

    try {
      const vehicle = await Vehicle.findOne({ driver: driver._id }).populate('vehicleType')

      if (!vehicle) {
        socket.emit('error', {
          type: 'pool',
          message: 'Driver doesn\'t have any vehicle registered'
        })
        return
      }

      if (data.size > vehicle.vehicleType.numberOfSeats) {
        socket.emit('error', {
          type: 'pool',
          message: `specified pool size (${data.size}) exceeds vehicle type's total number of seats`
        })
        return
      }

      const pool = await Pool.create({
        pickUpAddress: data.pickUpAddress,
        dropOffAddress: data.dropOffAddress,
        vehicle: vehicle._id,
        vehicleType: vehicle.vehicleType._id,
        route: data.route,
        driver: driver._id,
        size: data.size ? data.size : vehicle.vehicleType.numberOfSeats,
        position: {
          type: 'Point',
          coordinates: [data.pickUpAddress.long, data.pickUpAddress.lat]
        }
      })

      // await activityLogger.logActivity(activityLogger.POOL_HAS_BEEN_CREATED)({ driver: driver, vehicle: vehicle, pool: pool })

      await updateVehicle(vehicle._id)({ online: false,
        // poolId: pool._id
      })

      const newlyCreatedPool = await Pool.findById(pool._id).populate('passengers', 'firstName lastName rating phoneNumber position socketId').populate('vehicle').populate('vehicleType').populate('driver').populate('trips')
      socket.emit('pool', newlyCreatedPool)
    } catch (error) {
      console.log(error)
      socket.emit('error', {
        type: 'pool',
        message: 'error while creating your pool'
      })
    }
  } catch (error) {
    console.log(error)
  }
}
