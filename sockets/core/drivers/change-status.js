const Driver = require('../../../models/Driver')
const { sanitizeInputs } = require('../../utils/core')
const { updateVehicle } = require('../../utils/vehicle')
const activityLogger = require('../../../services/activity-logger')

const schema = {
  type: 'object',
  properties: {
    status: { type: 'boolean' }
  },
  required: ['status'],
  additionalProperties: false
}

module.exports = async (data, driver, vehicle, socket) => {
  try {
    await sanitizeInputs(schema, data)

    if (vehicle) {
      try {
        await updateVehicle(vehicle._id)({ online: data.status, statusChangedIntentionally: true, lastPingTimestamp: new Date() })
        // await activityLogger.logActivity(data.status ? activityLogger.DRIVER_HAS_BECOME_ONLINE : activityLogger.DRIVER_HAS_BECOME_OFFLINE)({ driver: driver, vehicle: vehicle })
        socket.emit('status', { status: data.status })
      } catch (error) {
        console.log(error)
      }
    } else {
      socket.emit('error', 'you do not own a registered car')
    }
  } catch (error) {
    console.log(`[DEBUG][ERROR] ${JSON.stringify(error)}`)
    socket.emit('error', error)
  }
}
