const { getIO } = require('../sockets/io')
const User = require('../models/User')

const agenda = require('../lib/agenda')
const { getNearbyDrivers } = require('../sockets/core')
const VehicleType = require('../models/VehicleType')
const Setting = require('../models/Setting')
const TripSearch = require('../models/TripSearch')
const TripRequest = require('../models/TripRequest')
const { emitToPassenger, getPassenger } = require('../sockets/utils/passenger')
const { emitToDriver, notifyDriver } = require('../sockets/utils/driver')
const { updateVehicle } = require('../sockets/utils/vehicle')
const { updateTripSearch, getTripSearch } = require('../sockets/utils/ride-search')
const { updateRentSearch, getRentSearch } = require('../sockets/utils/rent-search')
const { getRentRequest } = require('../sockets/utils/rent-request')
const REQUEST_STATUS = require('../constants/trip-request-statuses')
const TRIP_SEARCH_STATUS = require('../constants/trip-search-statuses')
const { getActiveRequestsByDispatcher, getTripRequest } = require('../sockets/utils/trip-request')
const { getActiveRentRequestsByDispatcher } = require('../sockets/utils/rent-request')
const { emitToDispatcher, updateDispatcher } = require('../sockets/utils/dispatcher')
const { getVehicleType } = require('../sockets/utils/vehicle-type')
const RentSearch = require('../models/RentSearch')
const RentRequest  = require('../models/RentRequest')

const NEARBY_DRIVERS_LIMIT = 20

agenda.on('ready', () => {
  // console.log('DEFINED TASK')

  agenda.define('fetchNearByDrivers', async (job) => {
    // console.log('\n\n****** TASK: nearby drivers ***\n\n')
    //   console.log('\n\n****** DRIVER:' + job.attrs.data.id + ' ***\n\n')
    const io = getIO()
    try {
      // console.log('**EXECUTING TASK**')

      const { data: { id } } = job.attrs

      const { position, socketId } = await User.findById(id)

      const setting = await Setting.findOne({}, "searchRadius")

      if (id && position) {
        const drivers = await getNearbyDrivers({ location: position, distance: setting.searchRadius ? setting.searchRadius * 1000 : 10000, limit: NEARBY_DRIVERS_LIMIT })
        io.of('/passenger-socket').to(socketId).emit('nearDrivers', JSON.parse(drivers).map(vehicle => {
          return {
            position: {
              long: vehicle.position.coordinates[0],
              lat: vehicle.position.coordinates[1],
            },
            _id: vehicle._id
          }
        }))
      }
    } catch (err) {
      console.log('ERROR')
      console.log(err)
    }
  })

  agenda.define('searchingForRides', async (job) => {
    console.log('\n\n****** TASK: RIDE SEARCHING ***\n\n')
    //   console.log('\n\n****** DRIVER:' + job.attrs.data.id + ' ***\n\n')
    try {
      console.log('**EXECUTING RIDE SEARHCING TASK**')

      const { data: { _id } } = job.attrs // ID is TripSearch id

      const tripSearch = await getTripSearch(_id)

      if (!tripSearch) {
        console.log("removing orphan ridesearch task..")
        await this.stopSearchingForRides({ _id })
      }

      const activeTripRequests = await TripRequest.find({
        status: REQUEST_STATUS.IN_REQUEST,
        tripSearchId: _id
      })

      for (const tripRequest of activeTripRequests) {
        tripRequest.status = REQUEST_STATUS.EXPIRED
        tripRequest.active = false
        await tripRequest.save()

        await updateVehicle(tripRequest.vehicle)({ online: true, 
          // tripRequestId: null
        })
        await emitToDriver(tripRequest.driver)('status', { status: true }) // this forces the app to hide the ride search request
        await emitToDriver(tripRequest.driver)('requestExpired') // this forces the app to hide the ride search request
      }

      console.log(tripSearch.requestedVehicles)
      if (!(tripSearch && tripSearch.active)) {
        console.log(`trip search is not active anymore... stopping task`)

        this.stopSearchingForRides(tripSearch)
        return
      }

      const setting = await Setting.findOne()

      const vehicleTypeSelected = await getVehicleType(tripSearch.vehicleType)

      const vehicleNearby = JSON.parse(await getNearbyDrivers({ location: tripSearch.pickUpAddress, distance: tripSearch.schedule && setting.scheduleSearchRadius ? setting.scheduleSearchRadius * 1000 : setting.searchRadius ? setting.searchRadius * 1000 : 10000, exclude: tripSearch.requestedVehicles, limit: tripSearch.type === 'bid' ?  setting.bidDriversPerRequest ? setting.bidDriversPerRequest: 3 : 1, vehicleType: vehicleTypeSelected.isAnyType ? null : tripSearch.vehicleType }))

      if (!(vehicleNearby && vehicleNearby.length)) {
        console.log("NO DRIVER IS AVAILABLE")
        emitToPassenger(tripSearch.passenger)("noAvailableDriver");
        tripSearch.status = TRIP_SEARCH_STATUS.NO_DRIVERS_FOUND
        if (tripSearch.dispatcher) {
          // await new Promise((rs, _) => setTimeout(rs, 400))
          await emitToDispatcher(tripSearch.dispatcher)('tripSearch', tripSearch)
          const activeRequestsDispatched = await getActiveRequestsByDispatcher(tripSearch.dispatcher)
          await emitToDispatcher(tripSearch.dispatcher)('requests', activeRequestsDispatched)
          // await updateDispatcher(tripSearch.dispatcher)({ tripSearchId: null })
        }
        
        await updateTripSearch(tripSearch._id)({ active: false, status: "NO_DRIVERS_FOUND" })
        await this.stopSearchingForRides(tripSearch)
        return
      }

      for (const vehicleToRequest of vehicleNearby) {

        // await new Promise((rs, rj) => setTimeout(rs, Math.random() * 200))

        if (await TripRequest.findOne({
          driver: vehicleToRequest.driver._id,
          tripSearchId: tripSearch._id,
          status: "IN_PROGRESS"
        })) {
          console.log("double execution skipped")
          return;
        }

        // await TripRequest.deleteMany({
        //   driver: vehicleToRequest.driver._id,
        //   passenger: tripSearch.passenger,
        //   tripSearchId: tripSearch._id
        // })

        const request = await TripRequest.create({
          active: true,
          driver: vehicleToRequest.driver._id,
          passenger: tripSearch.passenger,
          dispatcher: tripSearch.dispatcher,
          pickUpAddress: tripSearch.pickUpAddress,
          dropOffAddress: tripSearch.dropOffAddress,
          vehicleType: tripSearch.vehicleType,
          route: tripSearch.route,
          vehicle: vehicleToRequest,
          ticket: tripSearch.ticket, // TODO: add ticket
          note: tripSearch.note,
          corporate: tripSearch.corporate,
          schedule: tripSearch.schedule,
          type: tripSearch.type,
          bidAmount: tripSearch.bidAmount,
          status: REQUEST_STATUS.IN_REQUEST,
          createdBy: tripSearch.dispatcher ? "dispatcher" : "APP", // TODO: check about this field
          tripSearchId: tripSearch._id,
          searchRound: tripSearch.round,
          position: {
            lat: vehicleToRequest.position.coordinates[1],
            long: vehicleToRequest.position.coordinates[0],
          }
        })

        tripSearch.requestedVehicles.push(vehicleToRequest._id)
        // console.log(tripSearch.requestedVehicles)
        await tripSearch.save()

        await emitToPassenger(tripSearch.passenger)('request', request)

        request.passenger = await getPassenger(tripSearch.passenger, "profileImage rating") // requester passenger's profile pic and rating are required

        // TODO: uncomment the following line after refactoring...
        // await emitToDriver(vehicleToRequest.driver)('request', request)

        // TODO: comment out the following section after refactoring...

        if (tripSearch.dispatcher) {
          const activeRequestsDispatched = await getActiveRequestsByDispatcher(tripSearch.dispatcher)
          emitToDispatcher(tripSearch.dispatcher)('requests', activeRequestsDispatched)
        }
        const vehicleTypeOfTheDriver = await VehicleType.findById(request.vehicleType)
        console.log({
          ...request._doc,
          vehicleType: {
            pricePerKM: vehicleTypeOfTheDriver.pricePerKM,
            pricePerMin: vehicleTypeOfTheDriver.pricePerMin,
            surgePrice: vehicleTypeOfTheDriver.surgePrice,
            baseFare: vehicleTypeOfTheDriver.baseFare,
          }
        })
        await emitToDriver(vehicleToRequest.driver)('request', {
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
        await notifyDriver(vehicleToRequest.driver)({ title: 'Request', body: 'You have a new trip request' })

        await updateVehicle(vehicleToRequest._id)({ online: false, lastTripTimestamp: new Date(),
          //  tripRequestId: request._id
           })
        
      }
    } catch (error) {
      console.log(error)
    }
  })

  agenda.define('searchingForRents', async (job) => {
    console.log('\n\n****** TASK: RENT SEARCHING ***\n\n')
    //   console.log('\n\n****** DRIVER:' + job.attrs.data.id + ' ***\n\n')
    try {
      console.log('**EXECUTING RENT SEARHCING TASK**')

      const { data: { _id } } = job.attrs // ID is RentSearch id

      const rentSearch = await getRentSearch(_id)

      if (!rentSearch) {
        console.log("removing orphan rentsearch task..")
        await this.stopSearchingForRents({ _id })
      }

      const rentRequest = await RentRequest.findOne({
        status: REQUEST_STATUS.IN_REQUEST,
        rentSearchId: _id
      })

      if (rentRequest) {
        rentRequest.status = REQUEST_STATUS.EXPIRED
        rentRequest.active = false
        await rentRequest.save()

        await updateVehicle(rentRequest.vehicle)({ online: true,
          // rentRequestId: null
        })
        await emitToDriver(rentRequest.driver)('status', { status: true })
        await emitToDriver(rentRequest.driver)('requestExpired')

        if (rentSearch.dispatcher) {
          // await new Promise((rs, _) => setTimeout(rs, 400))  
          await emitToDispatcher(rentSearch.dispatcher)('rentSearch', rentSearch)
          await emitToDispatcher(rentSearch.dispatcher)('rentRequests', await RentRequest.find({
            rentSearchId: rentSearch._id
          }).populate('passenger', 'firstName lastName').populate('driver', 'firstName lastName'))
          // await updateDispatcher(tripSearch.dispatcher)({ tripSearchId: null })
        }
      }

      console.log(rentSearch.requestedVehicles)
      if (!(rentSearch && rentSearch.active)) {
        console.log(`rent search is not active anymore... stopping task`)

        this.stopSearchingForRents(rentSearch)
        return
      }

      const setting = await Setting.findOne()

      // TODO: read radius for rent
      const vehicleNearby = JSON.parse(await getNearbyDrivers({ location: rentSearch.pickUpAddress, distance: rentSearch.schedule && setting.scheduleSearchRadius ? setting.scheduleSearchRadius * 1000 : setting.searchRadius ? setting.searchRadius * 1000 : 10000, exclude: rentSearch.requestedVehicles, limit: 1, vehicleType: rentSearch.vehicleType }))

      if (!(vehicleNearby && vehicleNearby.length)) {
        console.log("NO DRIVER IS AVAILABLE")
        emitToPassenger(rentSearch.passenger)("noAvailableDriver");
        if (rentSearch.dispatcher) {
          rentSearch.status = TRIP_SEARCH_STATUS.NO_DRIVERS_FOUND // TODO: make this rent-search-status
          await emitToDispatcher(rentSearch.dispatcher)('rentSearch', rentSearch)
          const activeRequestsDispatched = await getActiveRequestsByDispatcher(rentSearch.dispatcher)
          emitToDispatcher(rentSearch.dispatcher)('requests', activeRequestsDispatched)
          // await updateDispatcher(rentSearch.dispatcher)({ rentSearchId: null })
        }
        
        updateRentSearch(rentSearch._id)({ active: false, status: "NO_DRIVERS_FOUND" })
        await this.stopSearchingForRents(rentSearch)
        return
      }

      const [vehicleToRequest] = vehicleNearby

      // await new Promise((rs, rj) => setTimeout(rs, Math.random() * 200))

      if (await RentRequest.findOne({
        driver: vehicleToRequest.driver._id,
        rentSearchId: rentSearch._id,
        status: "IN_PROGRESS"
      })) {
        console.log("double execution skipped")
        return;
      }

      // await RentRequest.deleteMany({
      //   driver: vehicleToRequest.driver._id,
      //   passenger: rentSearch.passenger,
      //   rentSearchId: rentSearch._id
      // })

      const request = await RentRequest.create({
        active: true,
        driver: vehicleToRequest.driver._id,
        passenger: rentSearch.passenger,
        dispatcher: rentSearch.dispatcher,
        pickUpAddress: rentSearch.pickUpAddress,
        vehicleType: rentSearch.vehicleType,
        route: rentSearch.route,
        vehicle: vehicleToRequest,
        duration: rentSearch.duration,
        note: rentSearch.note,
        type: rentSearch.type,
        status: REQUEST_STATUS.IN_REQUEST,
        createdBy: rentSearch.dispatcher ? "dispatcher" : "APP", // TODO: check about this field
        rentSearchId: rentSearch._id,
        position: {
          lat: vehicleToRequest.position.coordinates[1],
          long: vehicleToRequest.position.coordinates[0],
        }
      })

      rentSearch.requestedVehicles.push(vehicleToRequest._id)
      // console.log(rentSearch.requestedVehicles)
      await rentSearch.save()

      await emitToPassenger(rentSearch.passenger)('rentRequest', request)

      // request.passenger = await getPassenger(rentSearch.passenger, "profileImage rating") // requester passenger's profile pic and rating are required

      // TODO: uncomment the following line after refactoring...
      // await emitToDriver(vehicleToRequest.driver)('request', request)

      // TODO: comment out the following section after refactoring...

      if (rentSearch.dispatcher) {
        await emitToDispatcher(rentSearch.dispatcher)('rentRequests', await RentRequest.find({
          rentSearchId: rentSearch._id
        }).populate('passenger', 'firstName lastName').populate('driver', 'firstName lastName'))
      }
      const vehicleTypeOfTheDriver = await VehicleType.findById(request.vehicleType)
      await emitToDriver(vehicleToRequest.driver)('rentRequest', {
        ...request._doc,
        vehicleType: {
          rentPerHour: vehicleTypeOfTheDriver.rentPerHour,
          rentPerDay: vehicleTypeOfTheDriver.rentPerDay,
          rentDiscount: vehicleTypeOfTheDriver.rentDiscount,
        }
      })
      await notifyDriver(vehicleToRequest.driver)({ title: 'Rent request', body: 'You have a new rent request' })

      await updateVehicle(vehicleToRequest._id)({ online: false, lastTripTimestamp: new Date(),
        //  rentRequestId: request._id 
         }) // TODO: check if last trip timestamp should be updated
    } catch (error) {
      console.log(error)
    }
  })

  agenda.define('stopTripRequest', async job => {
    try {
      const { data: { _id } } = job.attrs // ID is triprequest id

      const tripRequest = await getTripRequest(_id)

      if (!tripRequest) {
        return;
      }

      if (!(tripRequest.active && tripRequest.status == REQUEST_STATUS.IN_REQUEST)) {
        return;
      }

      tripRequest.status = REQUEST_STATUS.EXPIRED
      tripRequest.active = false
      await tripRequest.save()

      await updateVehicle(tripRequest.vehicle)({ online: true, 
        // tripRequestId: null
      })

      if (tripRequest.dispatcher) {
        const activeRequestsDispatched = await getActiveRequestsByDispatcher(tripRequest.dispatcher)
        emitToDispatcher(tripRequest.dispatcher)('requests', activeRequestsDispatched)
      }
      
      await emitToDriver(tripRequest.driver)('status', { status: true }) // this forces the app to hide the ride search request
      await emitToDriver(tripRequest.driver)('requestExpired') // this forces the app to hide the ride search request

    } catch (error) {
      console.log(error)
    }  
  });

  agenda.define('stopRentRequest', async job => {
    try {
      const { data: { _id } } = job.attrs // ID is triprequest id

      const rentRequest = await getRentRequest(_id)

      if (!rentRequest) {
        return;
      }

      if (!(rentRequest.active && rentRequest.status == REQUEST_STATUS.IN_REQUEST)) {
        return;
      }

      rentRequest.status = REQUEST_STATUS.EXPIRED
      rentRequest.active = false
      await rentRequest.save()

      await updateVehicle(rentRequest.vehicle)({ online: true, 
        // tripRequestId: null
      })

      if (rentRequest.dispatcher) {
        const activeRequestsDispatched = await getActiveRentRequestsByDispatcher(rentRequest.dispatcher)
        emitToDispatcher(rentRequest.dispatcher)('rentRequests', activeRequestsDispatched)
      }
      
      await emitToDriver(rentRequest.driver)('status', { status: true }) // this forces the app to hide the ride search request
      await emitToDriver(rentRequest.driver)('requestExpired') // this forces the app to hide the ride search request

    } catch (error) {
      console.log(error)
    }  
  });
})
// NEARBY DRIVERS FETCHING
exports.fetchNearByDrivers = async (data, repeat) => {
  try {
    console.log("REGISTERNG NEARBY TASK")
    const taskName = `fetchNearByDrivers:${data.id}`

    await agenda.start()
    const task = await agenda.create('fetchNearByDrivers', {
      ...data,
      task: taskName
    }).unique({ 'data.task': taskName }).repeatEvery(repeat)
    console.log("NEARBY DRIVERS FETCHING RUNNING...")
    await task.save()
    await task.run()
    return task
  } catch (error) {
    console.log(error)
  }

}

exports.stopFetchNearByDrivers = async (data) => {
  await agenda.start()
  await agenda.cancel({
    'data.task': `fetchNearByDrivers:${data.id}`
  })
}

// RIDE SEARCHING
exports.startSearchingForRides = async (data, repeat) => {
  const taskName = `searchingForRides:${data._id}`
  await agenda.start()
  const task = await agenda.create('searchingForRides', {
    ...data._doc,
    task: taskName
  }).unique({ 'data.task': taskName }).repeatEvery(repeat)
  await task.save()
  await task.run()
  return task
}

exports.stopSearchingForRides = async (data) => {
  await agenda.start()
  await TripSearch.updateOne({
    _id: data._id,
    active: true,
  }, { $set: { active: false, status: TRIP_SEARCH_STATUS.CANCELLED } })
  // await TripRequest.deleteMany({
  //   active: true,
  //   status: "IN_REQUEST",
  //   tripSearchId: data._id
  // })
  await TripRequest.updateMany({
    tripSearchId: data._id,
    status: "IN_REQUEST",
    active: true,
  }, { $set: { active: false, status: REQUEST_STATUS.CANCELLED } })
  await agenda.cancel({
    'data.task': `searchingForRides:${data._id}`
  })
}

exports.skipSearchingForRides = async (data, repeat) => {
  await agenda.start()
  const taskName = `searchingForRides:${data._id}`
  await TripRequest.updateMany({
    tripSearchId: data._id,
    status: "IN_REQUEST",
    active: true,
  }, { $set: { active: false, status: REQUEST_STATUS.CANCELLED } })
  await agenda.cancel({
    'data.task': taskName
  })
  const task = await agenda.create('searchingForRides', {
    ...data._doc,
    task: taskName
  }).unique({ 'data.task': taskName }).repeatEvery(repeat)
  await task.save()
  await task.run()
  return task
}

exports.expireTripRequest = async (data, runAfter) => {
  try {
    const taskName = `stopTripRequest:${data._id}`

    await agenda.start()
    await agenda.schedule(`in ${runAfter}`, 'stopTripRequest', {
      ...data,
      task: taskName
    })
  } catch (error) {
    console.log(error)
  }

}

exports.expireRentRequest = async (data, runAfter) => {
  try {
    const taskName = `stopRentRequest:${data._id}`

    await agenda.start()
    await agenda.schedule(`in ${runAfter}`, 'stopRentRequest', {
      ...data,
      task: taskName
    })
  } catch (error) {
    console.log(error)
  }

}

// RENT SEARCHING

exports.startSearchingForRents = async (data, repeat) => {
  const taskName = `searchingForRents:${data._id}`
  await agenda.start()
  const task = await agenda.create('searchingForRents', {
    ...data._doc,
    task: taskName
  }).unique({ 'data.task': taskName }).repeatEvery(repeat)
  await task.save()
  await task.run()
  return task
}

exports.stopSearchingForRents = async (data) => {
  await agenda.start()
  await RentSearch.updateOne({
    _id: data._id,
    active: true,
  }, { $set: { active: false, status: TRIP_SEARCH_STATUS.CANCELLED } })
  // await RentRequest.deleteMany({
  //   active: true,
  //   status: "IN_REQUEST",
  //   rentSearchId: data._id
  // })
  await RentRequest.updateMany({
    rentSearchId: data._id,
    status: "IN_REQUEST",
    active: true,
  }, { $set: { active: false, status: REQUEST_STATUS.CANCELLED } })
  await agenda.cancel({
    'data.task': `searchingForRents:${data._id}`
  })
}

exports.skipSearchingForRents = async (data, repeat) => {
  await agenda.start()
  const taskName = `searchingForRents:${data._id}`
  await RentRequest.updateMany({
    rentSearchId: data._id,
    status: "IN_REQUEST",
    active: true,
  }, { $set: { active: false, status: REQUEST_STATUS.CANCELLED } })
  await agenda.cancel({
    'data.task': taskName
  })
  const task = await agenda.create('searchingForRents', {
    ...data._doc,
    task: taskName
  }).unique({ 'data.task': taskName }).repeatEvery(repeat)
  await task.save()
  await task.run()
  return task
}
