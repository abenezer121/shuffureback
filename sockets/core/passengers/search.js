const Setting = require('../../../models/Setting')
const VehicleType = require('../../../models/VehicleType')
// const Request = require('../../../models/Request')
const TripRequest = require('../../../models/TripRequest')
const Vehicle = require('../../../models/Vehicle')
const TripSearch = require('../../../models/TripSearch')
const passengerTasks = require('../../../jobs/passenger')

const { makeRequest } = require('../../../services/axios')

// const { addRequest, updateRequest, getRequest } = require('../../utils/request')

// const { getNearbyDrivers } = require('../../core')

const { emitToDriver, notifyDriver } = require('../../utils/driver')
const { emitToPassenger } = require('../../utils/passenger')
const { ObjectId } = require('mongoose').Types

const { sanitizeInputs } = require('../../utils/core')
const Ticket = require('../../../models/Ticket')

const schema = {
  type: "object",
  properties: {
    pickUpAddress: { type: "object" }, // TODO: make sure this includes lat and long
    dropOffAddress: { type: "object" }, // TODO: make sure this includes lat and long
    vehicleType: { type: "string" }, 
    // type: { type: "string" },
    // schedule: { type: "string" },
    // ticket: { type: "string" },
    // bidAmount: { type: "number" },
    // note: { type: "string" },
  },
  required: ['pickUpAddress', 'dropOffAddress', 'vehicleType'],
  additionalProperties: true
}

module.exports = async (data, passenger, socket) => {

  try {
    console.log("Searching...")
    console.log(data)
    await sanitizeInputs(schema, data)

    if (passenger.inActivePool) {
      socket.emit('error', {
        type: 'pool',
        message: 'action not allowed while in a pool'
      })
      return
    }
    
    const activeTripSearch = await TripSearch.findOne({
      active: true,
      passenger: ObjectId(passenger._id)
    })

    if (activeTripSearch) {
      console.log(activeTripSearch)
      socket.emit('error', {
        type: 'request',
        message: 'you already are requesting nearby drivers'
      })
      return
    }


    const setting = await Setting.findOne()
    let type = 'normal'
    if (data.type && data.type != undefined) {
      type = data.type
    }
    // const requestedDrivers = []
    // const removedDrivers = []

    // let driverFound = false
    // let canceled = false // TODO: canceled should be store in database
    let corporate = null
    let schedule = null

    let ticket = null

    if (type == 'bid' && setting.bidDriversPerRequest && setting.bidDriversPerRequest > 1) {
      requestCount = setting.bidDriversPerRequest
    }

    if (data.schedule && data.schedule != undefined) {
      schedule = new Date(data.schedule)
    }

    
    if (data.ticket) {
      ticket = await Ticket.findById(data.ticket);
      if (ticket)
        corporate = ticket.corporate
    }

    // if (data.ticket && data.ticket != undefined) corporate = true

    if (!data.pickUpAddress.name) {
      pickup = makeRequest({
        method: "get",
        url: 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + data.pickUpAddress.lat + ',' + data.pickUpAddress.long + '&key=' + setting.mapKey
      })
    } else {
      pickup = data.pickUpAddress
    }

    if (!data.dropOffAddress.name) {
      dropOff = makeRequest({
        method: "get",
        url: 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + data.dropOffAddress.lat + ',' + data.dropOffAddress.long + '&key=' + setting.mapKey
      })
    } else {
      dropOff = data.dropOffAddress
    }


    const apiKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjb21wYW55bmFtZSI6IkdlYmV0YSIsImlkIjoiZDIyOWU3YWQtMTkxYS00ODU0LWE4MmEtNmM3NWI1Zjk2MzkwIiwidXNlcm5hbWUiOiJnZWJldGF1c2VyIn0.ja4SNozrDcevV4r89YIAnEXBUTlqhcYFdLQN2eakDBI"
    const url = "https://mapapi.gebeta.app/api/v1/route/driving/direction/?la1=" + data.pickUpAddress.lat + "&lo1=" + data.pickUpAddress.long  + "&la2=" +  data.dropOffAddress.lat + "&lo2=" +  data.dropOffAddress.long + "&apiKey="+apiKey
 
    const route = makeRequest(url)

    Promise.all([pickup, dropOff, route]).then(async value => {
      if (!data.pickUpAddress.name) {
        if (value[0].status == 200 && value[0].data.status == 'OK') {
          data.pickUpAddress.name = value[0].data.results[0].formatted_address
        } else {
          data.pickUpAddress.name = '_'
        }
      }

      if (!data.dropOffAddress.name) {
        if (value[1].status == 200 && value[1].data.status == 'OK') {
          data.dropOffAddress.name = value[1].data.results[0].formatted_address
        } else {
          data.dropOffAddress.name = '_'
        }
      }

      console.log("GOT HERE")
      // if (value[2] && value[2].data && value[2].data.routes && value[2].data.routes[0] && value[2].data.routes[0].geometry && value[2].data.routes[0].geometry.coordinates) {
      //   data.route = { coordinates: value[2].data.routes[0].geometry.coordinates, distance: value[2].data.routes[0].distance, duration: value[2].data.routes[0].duration }
      // }

      if (value[2] && value[2].data.msg == "Ok") {
        data.route = { coordinates: routeObject.data.direction, distance: routeObject.data.totalDistance, duration: routeObject.data.timetaken }
        
    } 


      const tripSearch = await TripSearch.create({
        active: true,
        passenger: passenger._id,
        requestedVehicles: [],
        pickUpAddress: data.pickUpAddress,
        dropOffAddress: data.dropOffAddress,
        vehicleType: data.vehicleType,
        route: data.route,
        ticket,
        note: data.note ? data.note : '',
        corporate,
        schedule: schedule,
        bidAmount: data.bidAmount && type == "bid" ? data.bidAmount : null,
        type: type
      })

      await passengerTasks.startSearchingForRides(
        tripSearch,
        `${setting && setting.requestTimeout ? setting.requestTimeout : 30} seconds` 
      )

      // sendRequest()
      // sentRequestCount = 0
      // receivedResponse = 0
      // let vehicles = []
      // setting.scheduleSearchRadius = 10000000
      // vehicles = JSON.parse(await getNearbyDrivers({ location: data.pickUpAddress, distance: schedule && setting.scheduleSearchRadius ? setting.scheduleSearchRadius * 1000 : setting.searchRadius ? setting.searchRadius * 1000 : 1000 }))
      // const availableVehicles = []

      // vehicles.forEach((v) => {
      //   if (sentRequestCount < requestCount && !requestedDrivers.includes(v._id) && v.driver && ((vehicleTypeData && vehicleTypeData.name && vehicleTypeData.name.toLowerCase() == 'any') ? true : v.vehicleType == data.vehicleType)) {
      //     availableVehicles.push(v)
      //     requestedDrivers.push(v._id)
      //     sentRequestCount += 1
      //   }
      // })
      // console.log("AVAILABLE VEHICLES:", vehicles)


      // sentRequestCount = 0
      // receivedResponse = 0
      // let vehicles = []
      // setting.scheduleSearchRadius = 10000000
      // vehicles = JSON.parse(await getNearbyDrivers({ location: data.pickUpAddress, distance: schedule && setting.scheduleSearchRadius ? setting.scheduleSearchRadius * 1000 : setting.searchRadius ? setting.searchRadius * 1000 : 1000 }))
      // const availableVehicles = []

      // vehicles.forEach((v) => {
      //   if (sentRequestCount < requestCount && !requestedDrivers.includes(v._id) && v.driver && ((vehicleTypeData && vehicleTypeData.name && vehicleTypeData.name.toLowerCase() == 'any') ? true : v.vehicleType == data.vehicleType)) {
      //     availableVehicles.push(v)
      //     requestedDrivers.push(v._id)
      //     sentRequestCount += 1
      //   }
      // })
      // if (availableVehicles.length > 0) {
      //   const requests = []
      //   console.log(availableVehicles)
      //   for (let index = 0; index < availableVehicles.length; index++) {
      //     var request = new Request({
      //       passengerId: id,
      //       driverId: availableVehicles[index].driver && availableVehicles[index].driver._id ? availableVehicles[index].driver._id : availableVehicles[index].driver,
      //       driver: availableVehicles[index].driver,
      //       vehicleId: availableVehicles[index]._id,
      //       type,
      //       vehicle: availableVehicles[index],
      //       schedule,
      //       bidAmount: data.bidAmount && type == 'bid' ? data.bidAmount : null,
      //       pickUpAddress: {
      //         name: data.pickUpAddress.name,
      //         coordinate: {
      //           lat: data.pickUpAddress.lat,
      //           long: data.pickUpAddress.long
      //         }
      //       },
      //       route: data.route,
      //       note: data.note ? data.note : '',
      //       corporate,
      //       ticket: corporate ? data.ticket : null,
      //       vehicleType: vehicleTypeData,
      //       dropOffAddress: {
      //         name: data.dropOffAddress.name,
      //         coordinate: {
      //           lat: data.dropOffAddress.lat,
      //           long: data.dropOffAddress.long
      //         }
      //       },
      //       status: 'inRequest',
      //       timestamp: new Date().getTime(),
      //       updateCallback
      //     })
      //     requests.push(request)
      //     addRequest({ newRequest: request })
      //     socket.emit('request', request)

      //     emitToDriver(request.driverId)('request', request)
      //     notifyDriver(request.driverId)({ title: 'Request', body: 'You have a new trip request' })
      //     await Vehicle.updateOne({ _id: request.vehicleId }, { online: false, lastTripTimestamp: new Date() })
      //   }
      //   setTimeout(() => {
      //     if (!canceled) {
      //       requests.forEach((request) => {
      //         const r = getRequest({ passengerId: request.passengerId, driverId: request.driverId })
      //         if (r && r.getStatus() != 'Accepted') {
      //           updateRequest({ passengerId: request.passengerId, driverId: request.driverId, status: 'Expired' })
      //         }
      //       })
      //       if (!driverFound && !removedDrivers.includes(request.driverId)) {
      //         removedDrivers.push(request.driverId)
      //         sendRequest()
      //       }
      //     }
      //   }, setting && setting.requestTimeout ? setting.requestTimeout * 1000 : 10000)
      // } else {
      //   canceled = true
      //   socket.emit('noAvailableDriver')
      // }
    }).catch(err => console.log(err))


    // async function updateCallback(request) {
    //   if (!driverFound && !canceled) {
    //     const status = request.getStatus()
    //     if (status == 'Declined') {
    //       receivedResponse += 1
    //       emitToDriver(request.driverId)('requestCanceled')
    //       await Vehicle.updateOne({ _id: request.vehicleId }, { online: true })
    //       if (sentRequestCount <= receivedResponse && !removedDrivers.includes(request.driverId)) {
    //         removedDrivers.push(request.driverId)
    //         sendRequest()
    //       }
    //     } else if (status == 'Expired') {
    //       emitToDriver(request.driverId)('requestExpired')
    //       await Vehicle.updateOne({ _id: request.vehicleId }, { online: true })
    //     } else if (status == 'Canceled') {
    //       canceled = true
    //       emitToDriver(request.drivers)('requestCanceled')
    //       emitToPassenger(request.passengerId)('requestCanceled')
    //       await Vehicle.updateOne({ _id: request.vehicleId }, { online: true })
    //     } else if (status == 'Accepted' && (!driverFound && !canceled)) {
    //       driverFound = true
    //       let ticket
    //       if (request.corporate && request.ticket) {
    //         ticket = await Ticket.findById(request.ticket)
    //         ticket.active = false
    //         ticket.save()
    //       }
    //       try {
    //         const ride = await Ride.create({
    //           passenger: request.passengerId,
    //           driver: request.driverId,
    //           vehicle: request.vehicleId,
    //           type: request.type,
    //           corporate: ticket && ticket.corporate ? ticket.corporate : null,
    //           schedule: request.schedule,
    //           bidAmount: request.bidAmount,
    //           pickUpAddress: request.pickUpAddress,
    //           dropOffAddress: request.dropOffAddress,
    //           vehicleType: request.vehicleType._id,
    //           route: request.route,
    //           note: request.note,
    //           ticket: request.ticket,
    //           status: request.schedule ? 'Scheduled' : 'Accepted',
    //           active: !request.schedule,
    //           createdBy: 'app'
    //         })

    //         if (ride) {
    //           const createdRide = await Ride.findById(ride._id).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle')

    //           if (createdRide) {
    //             addTrip(createdRide)

    //             emitToPassenger(request.passengerId)('trip', createdRide)
    //             notifyPassenger(request.passengerId)({ title: 'Request accepted', body: createdRide.status == 'Scheduled' ? 'Scheduled' : 'Driver is on the way' })

    //             emitToDriver(request.driverId)('trip', createdRide)

    //             await Vehicle.updateMany({ _id: request.vehicleId }, { online: !!request.schedule })
    //           }
    //         }
    //       } catch (error) {
    //         console.log(error)
    //       }
    //     }
    //   } else {
    //     emitToDriver(driver.socketId).emit('requestExpired')
    //     await Vehicle.updateOne({ _id: request.vehicleId }, { online: true })
    //   }
    // }
  } catch (error) {
    console.log(error)
  }

}
