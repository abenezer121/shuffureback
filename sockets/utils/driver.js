const Driver = require('../../models/Driver')
const Token = require('../../models/Token')
const { sendNotification } = require('../../services/notificationService')
const { ObjectId } = require('mongoose').Types
const { getIO } = require('../io')
const redis = require("redis");
const bluebird = require('bluebird')
bluebird.promisifyAll(redis.RedisClient.prototype);
const redisClient = redis.createClient({ host: 'shuufare-redis-refactored', port: 6379 });

const io = getIO()

// refactored driver container code
const emitToDriver = (driverId) => async (event, data) => {
  const driver = await Driver.findById(driverId)
  io.of('/driver-socket').to(driver.socketId).emit(event, data)
}

const notifyDriver = (driverId) => async (data) => {
  const driver = await Driver.findById(driverId)
  sendNotification(driver.fcm, data)
}

const updateDriver = (driverId) => async (changes) => {
  try {
    await Driver.updateOne({ _id: ObjectId(driverId) }, changes)
    await redisClient.setAsync('dr-'+driverId, JSON.stringify(await Driver.findById(driverId)), 'EX', 3600);    
  } catch (error) {
    console.log(error)
  }
}

async function extractDriverFromToken(socket) {
  if (socket.handshake && socket.handshake.query && socket.handshake.query.token && socket.handshake.query.id) {
    const { token, id } = socket.handshake.query

    let value = await redisClient.getAsync('dr-' + id);
    value = value !== 'undefined' && JSON.parse(value) || null;
    if (!value) {
      // console.log("REDIS CACHE NOT FOUND")
      try {
        const persistedToken = await Token.findOne({ _id: ObjectId(token), active: true }).populate('driver')
        if (persistedToken && persistedToken.driver) {
          await Token.deleteMany({
            driver: persistedToken.driver._id,
            _id: { $ne: persistedToken._id }
          })
          value = persistedToken.driver
          await redisClient.setAsync('dr-' + id, JSON.stringify(value), 'EX', 3600);
        }
        else
          throw new Error("unauthorized")
      } catch (e) {
        throw e
      }
    }

    return value
  } else {
    throw new Error("unauthorized")
  }
}

module.exports = {
  emitToDriver,
  notifyDriver,
  updateDriver,
  extractDriverFromToken
}
