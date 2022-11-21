const Vehicle = require('../models/Vehicle')
const { extractDriverFromToken, updateDriver } = require('./utils/driver')

const redis = require("redis");
const bluebird = require('bluebird');
const Token = require('../models/Token');
bluebird.promisifyAll(redis.RedisClient.prototype);
const redisClient = redis.createClient({ host: 'shuufare-redis-refactored', port: 6379 });
const { ObjectId } = require('mongoose').Types;
const Driver = require('../models/Driver');

module.exports = async (socket) => {

  if (socket.handshake && socket.handshake.query && socket.handshake.query.token) {
    const { token } = socket.handshake.query

    try {
      const persistedToken = await Token.findOne({ _id: ObjectId(token), active: true })

      if (persistedToken && persistedToken.driver) {

        await updateDriver(persistedToken.driver)({
          socketId: socket.id
        })

        const drvr = await Driver.findOne({
          _id: persistedToken.driver
        })
  
        drvr.socketId = socket.id
        await drvr.save()

        await redisClient.setAsync(token, JSON.stringify(drvr), 'EX', 3600);

        await Token.deleteMany({
          driver: persistedToken.driver,
          _id: { $ne: persistedToken._id }
        })

      }
    } catch (e) {
      console.log(e)
    }

  }

  const registerSocketHandler = (moduleName, mustHaveRegisteredVehicle) => async data => {
    try {

      const profileData = await extractDriverFromToken(socket)

    //  console.log(moduleName)
      if (profileData) {
        const vehicle = await Vehicle.findOne({
          driver: profileData._id
        })

        if (mustHaveRegisteredVehicle && !vehicle) {
          return () => {
            socket.emit("error", {
              type: 'auth',
              message: 'you must have a registed vehicle to perform that action'
            })
          }
        } else {
          try {
            return require(moduleName)(data, profileData, vehicle, socket)
          } catch (err) {
            console.log("APP ERROR")
            console.log(err)
            socket.emit("error", {
              type: "error",
              message: (err && err.message) ? err.message : String(err)
            })
          }
        }
      } else {
        console.log("NOT REGISTERED")
        return () => {
          socket.emit("error", {
            type: 'auth',
            message: 'you are not registered'
          })
        }
      }
    } catch (error) {
      console.log(error)
      // socket.emit('unauthorized')
      // socket.emit('error', JSON.stringify({
      //   message: 'unauthorized',
      //   count: 5
      // }))
    }
  }

  // socket.on('connection', () => {
  //   console.log("\n\n[SUCCESS] driver connected")
  // })
  // core
  socket.on('init', registerSocketHandler('./core/drivers/init'))
  socket.on('updateLocation', registerSocketHandler('./core/drivers/update-location'))
  socket.on('changeStatus', registerSocketHandler('./core/drivers/change-status'))
  socket.on('reportMock', registerSocketHandler('./core/drivers/report-mock'))

  // pool
  socket.on('createPool', registerSocketHandler('./pool/drivers/create-pool', true))
  socket.on('endPool', registerSocketHandler('./pool/drivers/end-pool', true))
  socket.on('cancelPool', registerSocketHandler('./pool/drivers/cancel-pool', true))
  socket.on('startPool', registerSocketHandler('./pool/drivers/start-pool', true))
  socket.on('endPoolTrip', registerSocketHandler('./pool/drivers/end-pool-trip', true))
  socket.on('kickPassenger', registerSocketHandler('./pool/drivers/kick-passenger', true))

  // request
  socket.on('updateRequest', registerSocketHandler('./request/drivers/update-request', true))

  // rent
  socket.on('updateRent', registerSocketHandler('./rent/drivers/update-rent', true))
  socket.on('startRent', registerSocketHandler('./rent/drivers/start-rent', true))
  socket.on('endRent', registerSocketHandler('./rent/drivers/end-rent', true))
  socket.on('cancelRent', registerSocketHandler('./rent/drivers/cancel-rent', true))

  // trip
  socket.on('arrived', registerSocketHandler('./trip/drivers/arrived', true))
  socket.on('createRoadPickup', registerSocketHandler('./trip/drivers/create-road-pickup', true))
  socket.on('startTrip', registerSocketHandler('./trip/drivers/start-trip', true))
  socket.on('tripEnded', registerSocketHandler('./trip/drivers/trip-ended', true))
  socket.on('cancelTrip', registerSocketHandler('./trip/drivers/cancel-trip', true))

  socket.on('disconnect', registerSocketHandler('./core/drivers/disconnect'))
}
