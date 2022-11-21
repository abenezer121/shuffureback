const { getDriverRequest } = require('../../../containers/requestContainer')
const Pool = require('../../../models/Pool')
const Rent = require('../../../models/Rent')
const Ride = require('../../../models/Ride')
const Vehicle = require('../../../models/Vehicle')
const VehicleType = require('../../../models/VehicleType')
const { updateDriver } = require('../../utils/driver')
const { updateVehicle } = require('../../utils/vehicle')
const { sanitizeInputs } = require('../../utils/core')
const { getActiveRequestByDriver } = require('../../utils/trip-request')
const DeviceBan = require("../../../models/DeviceBan");
const POOL_STATUS = require('../../../constants/pool-statuses')

const activityLogger = require('../../../services/activity-logger')
const { getActiveRentRequestByDriver } = require('../../utils/rent-request')

const schema = {
  type: "object",
  properties: {
    fcm: { type: "string" },
    location: { type: "object" },
    deviceID: { type: "string" },
    deviceModelID: { type: "string" },
  },
  required: ["fcm", "location", "deviceID", "deviceModelID"],
  // additionalProperties: false // TODO: uncomment this after refactoring
}

module.exports = async (data, driver, vehicle, socket) => {
  try {
    await sanitizeInputs(schema, data)

    await updateDriver(driver._id)({
      fcm: data.fcm, location: data.location,
      socketId: socket.id
    })

    // await activityLogger.logActivity(activityLogger.DRIVER_HAS_CONNECTED)({ driver: driver, vehicle: vehicle })



    // const [poolResult, rentResult, tripResult, requestResult, rentRequestResult] = await Promise.all([pool, rent, trip, request, rentRequest])

    let status;

    const pool = await Pool.findOne({ driver: driver._id, status: { $in: [POOL_STATUS.CREATED, POOL_STATUS.STARTED, POOL_STATUS.COMPLETED] } }).populate('passengers', 'firstName lastName rating phoneNumber position socketId').populate('vehicle').populate('vehicleType').populate('driver').populate('trips');

    if (pool) {
      status = false;
      socket.emit('pool', pool)
    } else {
      const request = await getActiveRequestByDriver(driver._id)
      
      if (request) {

        status = false
        const vehicleTypeOfTheDriver = await VehicleType.findById(request.vehicleType)

        socket.emit('request', {
          ...request._doc,
          vehicleType: {
            pricePerKM: vehicleTypeOfTheDriver.pricePerKM,
            pricePerMin: vehicleTypeOfTheDriver.pricePerMin,
            surgePrice: vehicleTypeOfTheDriver.surgePrice,
            baseFare: vehicleTypeOfTheDriver.baseFare,
            surgePricePerKM: vehicleTypeOfTheDriver.surgePricePerKM,
            surgePricePerMin: vehicleTypeOfTheDriver.surgePricePerMin,
            surgeBaseFare: vehicleTypeOfTheDriver.surgeBaseFare,
          }
        })

      } else {
        const rentRequestResult = await getActiveRentRequestByDriver(driver._id)

        if (rentRequestResult) {
          status = false

          socket.emit('rentRequest', rentRequestResult)

        } else {

          const rentResult = await Rent.findOne({ active: true, driver: driver._id }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle')

          if (rentResult) {
            status = false

            socket.emit('rent', rentResult)
          } else {

            const trip = await Ride.findOne({ active: true, driver: driver._id }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle')

            if (trip) {

              socket.emit('trip', trip)
            } else {
              if (!data.deviceID || !data.deviceModelID) {
                socket.emit("deviceUnknown", {
                  note: setting.deviceUnknownNote
                })
                return
              } else {
                await updateDriver(driver._id)({ deviceID: data.deviceID, deviceModelID: data.deviceModelID })
              }

              const isDeviceBanned = await DeviceBan.findOne({
                deviceID: data.deviceID,
                allDevicesOfTheModel: false,
              })

              if (isDeviceBanned) {
                socket.emit("deviceIsBanned", {
                  note: isDeviceBanned.note,
                })
                return
              }

              const isModelBanned = await DeviceBan.findOne({
                deviceModelID: data.deviceModelID,
                allDevicesOfTheModel: true,
              })

              if (isModelBanned) {
                socket.emit("modelIsBanned", {
                  note: isModelBanned.note
                })
                return
              }


              if (vehicle.online) {
                status = true;
              } else if (!vehicle.statusChangedIntentionally && !vehicle.online) {
                status = true
              } else {
                status = false
              }

              await updateVehicle(vehicle._id)({ online: status, lastPingTimestamp: new Date() })

              socket.emit('status', {
                status
              })

            }

          }

        }

      }
    }




    // if (poolResult || rentResult || tripResult || requestResult || rentRequestResult) {
    //   status = false;
    // } else {
    //  
    // }


    // if (status) {
    // await activityLogger.logActivity(activityLogger.DRIVER_HAS_BECOME_ONLINE)({ driver: driver, vehicle: vehicle })
    // }


  } catch (error) {
    console.log("[ERROR]")
    console.log(error)
  }

}
