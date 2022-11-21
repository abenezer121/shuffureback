const Pool = require('../../../models/Pool')
const { sanitizeInputs } = require('../../utils/core')
const POOL_STATUS = require('../../../constants/pool-statuses')
const activityLogger = require('../../../services/activity-logger')
const { updateVehicle } = require('../../utils/vehicle')

const schema = {
  type: 'object',
  properties: {
  },
  required: [],
  additionalProperties: false
}

module.exports = async (data, driver, vehicle, socket) => {
  try {
    // await sanitizeInputs(schema, data)

    const pool = await Pool.findOne({
      driver: driver._id,
      status: POOL_STATUS.COMPLETED
    }).populate('passengers', 'firstName lastName rating phoneNumber position socketId').populate('vehicle').populate('vehicleType').populate('driver').populate('trips')

    if (!pool) {
      socket.emit('error', {
        type: 'pool',
        message: 'you have not created a pool'
      })
      return
    }

    pool.status = POOL_STATUS.ENDED
    await pool.save()

    // await activityLogger.logActivity(activityLogger.POOL_HAS_ENDED)({ driver: driver, vehicle: vehicle, pool: pool })

    await updateVehicle(vehicle._id)({ online: true,
      // poolId: null
    })

    socket.emit('pool', pool)
  } catch (error) {
    console.log(error)
  }

}
