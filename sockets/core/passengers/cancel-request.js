const TripSearch = require('../../../models/TripSearch')
const TripRequest = require('../../../models/TripRequest')
const passengerTasks = require('../../../jobs/passenger')
const REQUEST_STATUS = require('../../../constants/trip-request-statuses')
const { ObjectId } = require('mongoose').Types
const { emitToDriver } = require('../../utils/driver')

module.exports = async (data, passenger, socket) => {
  try {

    const activeTripSearch = await TripSearch.findOne({
      active: true,
      passenger: ObjectId(passenger._id)
    })

    if (!activeTripSearch) {
      socket.emit('requestCanceled')
      socket.emit('error', {
        type: 'request',
        message: 'you are not actively searching for drivers'
      })
      return
    }

    activeTripSearch.active = false
    activeTripSearch.status = REQUEST_STATUS.CANCELLED
    await activeTripSearch.save()

    const tripRequests = await TripRequest.find({
      status: REQUEST_STATUS.IN_REQUEST,
      tripSearchId: activeTripSearch._id
    })

    await passengerTasks.stopSearchingForRides(activeTripSearch)

    for (let activeRequest of tripRequests) {
//      await emitToDriver(activeRequest.driver)('requestCanceled')
await TripRequest.updateOne({_id: activeRequest._id}, {$set:{active: false, status: REQUEST_STATUS.CANCELLED}})
await emitToDriver(activeRequest.driver)('requestCanceled')
    }


    return socket.emit('requestCanceled')

  } catch (error) {
    console.log(error)
  }
}
