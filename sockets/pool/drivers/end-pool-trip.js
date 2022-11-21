const Pool = require('../../../models/Pool')
const {ObjectId} = require('mongoose').Types
const Trip = require('../../../models/Ride')
const User = require('../../../models/User')
const Promo = require('../../../models/Promo')
const Driver = require('../../../models/Driver')
const Setting = require('../../../models/Setting')
const { updateWallet } = require('../../../controllers/DriverController')
const { customerEmail, sendEmail } = require('../../../services/emailService')
const Incentive = require('../../../models/Incentive')
const { emitToPassenger, notifyPassenger, updatePassenger } = require('../../utils/passenger')
const { sanitizeInputs } = require('../../utils/core')
const activityLogger = require('../../../services/activity-logger')
const { makeRequest } = require('../../../services/axios')
const mongoose = require('mongoose')

const POOL_STATUS = require('../../../constants/pool-statuses')
const TRIP_STATUS = require('../../../constants/trip-statuses')

const schema = {
  type: "object",
  properties: {
    tripId: { type: "string" },
    totalDistance: { type: "number" },
    dropOffAddress: { type: "object" }
  },
  required: ["tripId", "totalDistance", "dropOffAddress"],
  additionalProperties: false
}

module.exports = async (data, driver, vehicle, socket) => {
  try {
    await sanitizeInputs(schema, data)

    let pool = await Pool.findOne({ driver: ObjectId(driver._id), status: POOL_STATUS.STARTED }).populate('passengers', 'firstName lastName rating phoneNumber position socketId').populate('vehicle').populate('vehicleType').populate('driver').populate('trips').populate('trips')

    if (!pool) {
      socket.emit('error', {
        type: 'pool',
        message: 'you have not created a pool'
      })
      return
    }

    const tripToBeEnded = await Trip.findById(data.tripId).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle')

    // const tripToBeEnded = pool.trips.find((t) => {
    //     return t.passenger == trip.passengerId
    // })

    if (!tripToBeEnded) {
      socket.emit('error', {
        type: 'pool',
        message: 'no pool trip found to terminate'
      })
      return
    }

    if (tripToBeEnded.status !== TRIP_STATUS.STARTED) {
      socket.emit('error', {
        type: 'pool',
        message: 'trip is not active. unable to terminate it.'
      })
      return
    }

    const setting = await Setting.findOne()

    
    if (!data.dropOffAddress.name) {
      const dropOff = await makeRequest({
        method: "get",
        url: 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + data.dropOffAddress.lat + ',' + data.dropOffAddress.long + '&key=' + setting.mapKey
      })

      if (dropOff.status == 200 && dropOff.data.status == 'OK') {
        data.dropOffAddress.name = dropOff.data.results[0].formatted_address
      } else {
        data.dropOffAddress.name = '_'
      }
    }


    const date = new Date()
    const tsts = new Date(tripToBeEnded.pickupTimestamp)
    // const durationInMinute = ((date.getTime() - tsts.getTime()) / 1000) / 60

    var estimatedDuration = tripToBeEnded.route.duration // in seconds
    let actualDuration = (date.getTime() - tsts.getTime()) / 1000 // in seconds

    let durationIncludedInBilling = actualDuration > estimatedDuration ? (actualDuration - estimatedDuration) / 60 : 0


    const fare = (data.totalDistance * pool.vehicleType.poolPricePerKM) + pool.vehicleType.poolBaseFare + (durationIncludedInBilling * pool.vehicleType.poolPricePerMin)
    const companyCut = (fare * (setting.defaultRoadPickupCommission / 100))
    // payToDriver = discount;
    const payToDriver = fare - companyCut
    const tax = companyCut - (companyCut / ((setting.tax / 100) + 1))
    const net = ((fare * (setting.defaultRoadPickupCommission / 100))) - ((tax < 0) ? 0 : tax)
    const cutFromDriver = (-(fare * (setting.defaultRoadPickupCommission / 100)))

    const completedTripsOnPool = pool.trips.filter(t => t.status === TRIP_STATUS.COMPLETED)
    const activeTripsOnPoolCount = pool.trips.filter(t => t.status === TRIP_STATUS.STARTED).length
    console.log('CURRENTLY ACTIVE TRIPS:', activeTripsOnPoolCount)
    console.log('COMPLETED TRIPS:', completedTripsOnPool.length)
    tripToBeEnded.totalDistance = data.totalDistance
    tripToBeEnded.discount = 0
    tripToBeEnded.surge = false
    tripToBeEnded.companyCut = companyCut
    tripToBeEnded.dropOffAddress = data.dropOffAddress
    tripToBeEnded.tax = tax
    // tripToBeEnded.fare = fare / activeTripsOnPool;
    tripToBeEnded.fare = (fare - completedTripsOnPool.map(x => x.fare).reduce((p, c) => p + c, 0)) / activeTripsOnPoolCount
    tripToBeEnded.status = TRIP_STATUS.COMPLETED
    tripToBeEnded.payToDriver = payToDriver
    tripToBeEnded.net = net
    tripToBeEnded.endTimestamp = date
    tripToBeEnded.active = false

    tripToBeEnded.path = pool.path
    await tripToBeEnded.save()
    // addTrip(res);

    await updatePassenger(tripToBeEnded.passenger._id)({ inActivePool: false })

    // TODO: check if this works
    // await activityLogger.logActivity(activityLogger.POOL_TRIP_HAS_COMPLETED)({ driver: driver, vehicle: vehicle, pool: pool, trip: tripToBeEnded })

    pool = await Pool.findById(pool._id).populate('passengers', 'firstName lastName rating phoneNumber position socketId').populate('vehicle').populate('vehicleType').populate('driver').populate('trips').populate('trips')

    updateWallet({ id: driver._id, amount: -1 * net, ride: data.tripId })

    if (tripToBeEnded.passenger && tripToBeEnded.passenger.email) {
      try {
        const emailBody = await customerEmail({ trip: tripToBeEnded, setting })
        sendEmail(tripToBeEnded.passenger.email, 'Trip summary', emailBody)
      } catch (error) {
        console.log(error)
      }
    }

    if (activeTripsOnPoolCount === 1) { // on the last passenger
      pool.status = POOL_STATUS.COMPLETED
      pool.totalDistance = tripToBeEnded.totalDistance
      pool.completedAt = new Date()
      pool.fare = completedTripsOnPool.map(x => x.fare).reduce((p, c) => p + c, 0) + tripToBeEnded.fare
      await pool.save()
    }

    socket.emit('pool', pool)

    const passengerTripCount = await Trip.countDocuments({ passenger: tripToBeEnded.passenger._id, status: TRIP_STATUS.COMPLETED })
    for ({ every, rate } of setting.incentiveSettings) {
      if (passengerTripCount % every === 0) {
        const amount = tripToBeEnded.fare * (rate / 100)

        await Incentive.create({
          passenger: tripToBeEnded.passenger._id,
          ride: tripToBeEnded._id,
          rate,
          every,
          tripCount: passengerTripCount,
          passengerTripCount,
          fare: tripToBeEnded.fare,
          amount
        })
        await User.updateOne({
          _id: tripToBeEnded.passenger._id
        }, {
          $inc: {
            balance: amount
          }
        })
      }
    }


    if (tripToBeEnded.passenger) {
      await notifyPassenger(tripToBeEnded.passenger._id)({ title: 'Trip ended', body: 'You have arrived at your destination' })
      await emitToPassenger(tripToBeEnded.passenger._id)('trip', tripToBeEnded)
    } else {
      socket.emit('trip', tripToBeEnded)
    }

    const activePromo = await Promo.findOne({
      inviteePhoneNumber: tripToBeEnded.passenger.phoneNumber,
      type: "passenger",
      tripCount: { $lt: setting.promoNumberOfTripsApplicable }, // TODO: make this changable from the settings
      status: "ACTIVE"
    })

    if (activePromo) {

      const promoRate = setting.promoIncentiveRate
      const amount = res.fare * (promoRate / 100)

      await Incentive.create({
        passenger: tripToBeEnded.passengerr._id,
        ride: tripToBeEnded._id,
        rate: promoRate,
        every: 0,
        tripCount: passengerTripCount,
        passengerTripCount,
        fare: tripToBeEnded.fare,
        amount,
        reason: `promo: ${promoRate}%`
      })
      await User.updateOne({
        _id: res.passenger._id
      }, {
        $inc: {
          balance: amount
        }
      })

      activePromo.tripCount += 1

      if (activePromo.tripCount === setting.promoNumberOfTripsApplicable) {
        activePromo.status = "USED"
      }
      await activePromo.save()
    }

    const activeDriverPromo = await Promo.findOne({
      inviteePhoneNumber: driver.phoneNumber,
      type: "driver",
      tripCount: { $lt: setting.promoNumberOfTripsApplicable }, // TODO: make this changable from the settings
      status: "ACTIVE"
    })

    if (activeDriverPromo) {

      const promoRate = setting.promoIncentiveRate
      const amount = tripToBeEnded.fare * (promoRate / 100)

      // const ballance = driver.ballance + amount // BAD way

      try {

        const drvr = await Driver.findById(driver._id)

        if (drvr) {
          const session = await mongoose.startSession();

          await session.withTransaction(async () => {
            await WalletHistory.create([{
              driver: driver._id,
              reason: `promo: ${promoRate}%`,
              by: 'System',
              amount: amount,
              ride: tripToBeEnded._id,
              currentAmount: driver.ballance
            }], { session: session })
            
            drvr.ballance += amount
            await drvr.save({ session: session })
          })

          session.endSession()
          activeDriverPromo.tripCount += 1

          if (activeDriverPromo.tripCount === setting.promoNumberOfTripsApplicable) {
            activeDriverPromo.status = "USED"
          }
          await activeDriverPromo.save()  
        }

      } catch (error) {
        console.log(error)
        socket.emit("error", {
          type: 'end-pool-trip',
          message: error.message
        })
      }     
    }


  } catch (error) {
    console.log(error)
  }
}
