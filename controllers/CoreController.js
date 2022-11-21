const Setting = require('../models/Setting')
const VehicleType = require('../models/VehicleType')
const Driver = require('../models/Driver')
const User = require('../models/User')
const Vehicle = require('../models/Vehicle')
const Ride = require('../models/Ride')
const { default: Axios } = require('axios')
const Rent = require('../models/Rent')
const logger = require('../services/logger')

const TRIP_STATUS = require('../constants/trip-statuses')

const { generateAndSendReport } = require('../utils/reports')
const { filterByTimeRange } = require('../utils/date-filter')

const getSettingsAndVehicleModels = async (req, res) => {
    Promise.all([
      Setting.findOne({}, "androidPassengerVersion iosPassengerVersion leastAndroidPassengerVersion surgeTimeFrom surgeTimeUpto leastIosPassengerVersion passengerPlaystoreLink passengerAppstoreLink discount contactNumber promoAmount promoRate promoTripCount mapKey"),
      VehicleType.find({ active: true }).sort({ order: 'asc' })
    ]).then(value => {
      res.json({
        setting: value[0],
        vehicleTypes: value[1]
      })
    }).catch((error) => {
      logger.error('Core => ' + error.toString())
      res.status(500).send(error)
    })
  }
  

const getPassengerSettings = async (req, res) => {
  Setting.findOne({}, "androidPassengerVersion iosPassengerVersion leastAndroidPassengerVersion surgeTimeFrom surgeTimeUpto leastIosPassengerVersion passengerPlaystoreLink passengerAppstoreLink discount contactNumber promoAmount promoRate promoTripCount mapKey")
    .then(value => {
      res.json(value)
    }).catch((error) => {
      logger.error('Core => ' + error.toString())
      res.status(500).send(error)
    })
}

const getPassengerVehicleModels = async (req, res) => {
  let city = req.query.city
  
  let filter = { active: true }

  if (city) {
    filter.city = {$regex: city, $options: 'i'}
  }
  
  VehicleType.find(filter).sort({ order: 'asc' })
    .then(value => {
      res.json(value)
    }).catch((error) => {
      logger.error('Core => ' + error.toString())
      res.status(500).send(error)
    })
}

const dashboard = async (req, res) => {
  Promise.all([
    Driver.countDocuments(),
    User.countDocuments(),
    VehicleType.countDocuments(),
    Vehicle.countDocuments({ online: true }),
    Ride.countDocuments(),
    Driver.countDocuments({ approved: true }),
    Ride.countDocuments({ status: TRIP_STATUS.CANCELLED }),
    Ride.countDocuments({ status: TRIP_STATUS.COMPLETED }),
    Ride.countDocuments({ status: TRIP_STATUS.ACCEPTED }),
    Ride.countDocuments({ status: TRIP_STATUS.ARRIVED }),
    Ride.countDocuments({ status: TRIP_STATUS.STARTED }),
    Vehicle.countDocuments({ active: true }),
    Vehicle.countDocuments({ online: false, active: true })
  ]).then(value => {
    res.json({
      totalDrivers: value[0],
      totalUsers: value[1],
      totalVehicleTypes: value[2],
      totalActiveFleets: value[3],
      totalTrips: value[4],
      numberOfApprovedDriver: value[5],
      totalCanceledTrips: value[6],
      totalCompletedTrips: value[7],
      totalRunningTrips: value[8] + value[9] + value[10],
      activeVehicles: value[11],
      activeButOfflineVehicles: value[12]
    })
  }).catch((error) => {
    logger.error('Core => ' + error.toString())
    res.status(500).send(error)
  })
}

const route = (req, res) => {
  try {
    if (req && req.body && req.body.dropOffAddress && req.body.pickUpAddress) {


      const apiKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjb21wYW55bmFtZSI6IkdlYmV0YSIsImlkIjoiZDIyOWU3YWQtMTkxYS00ODU0LWE4MmEtNmM3NWI1Zjk2MzkwIiwidXNlcm5hbWUiOiJnZWJldGF1c2VyIn0.ja4SNozrDcevV4r89YIAnEXBUTlqhcYFdLQN2eakDBI"
      const url = "https://mapapi.gebeta.app/api/v1/route/driving/direction/?la1=" + req.body.pickUpAddress.lat + "&lo1=" +req.body.pickUpAddress.long  + "&la2=" + req.body.dropOffAddress.lat + "&lo2=" +  req.body.dropOffAddress.long + "&apiKey="+apiKey
 
      Axios.get(url).then((route) => {
     
        if (route.data.msg == "Ok") {
          res.send({ coordinates: routeObject.data.direction, distance: routeObject.data.totalDistance, duration: routeObject.data.timetaken });
        } else {
          res.sendStatus(500)
        }
      }).catch(error => {
        logger.error('Core => ' + error.toString())
        res.status(500).send(error)
      })
     

      // Axios.get('https://api.mapbox.com/directions/v5/mapbox/driving/' + + ',' +  + ';' + req.body.dropOffAddress.long + ',' + req.body.dropOffAddress.lat + '?radiuses=unlimited;&geometries=geojson&access_token=pk.eyJ1IjoidGluc2FlLXliIiwiYSI6ImNrYnFpdnNhajJuNTcydHBqaTA0NmMyazAifQ.25xYVe5Wb3-jiXpPD_8oug').then((route) => {
      //   if (route && route.data && route.data.routes && route.data.routes[0] && route.data.routes[0].geometry && route.data.routes[0].geometry.coordinates) {
      //     res.send({ coordinates: route.data.routes[0].geometry.coordinates, distance: route.data.routes[0].distance, duration: route.data.routes[0].duration })
      //   } else {
      //     res.sendStatus(500)
      //   }
      // }).catch(error => {
      //   logger.error('Core => ' + error.toString())
      //   res.status(500).send(error)
      // })



    } else {
      res.status(500).send('invalid data')
    }
  } catch (error) {
    logger.error('Core => ' + error.toString())
    res.status(500).send(error)
  }
}

const godview = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({}, 'online modelName color position').populate('driver', '_id fullName approved rating')
    res.send(vehicles)
  } catch (error) {
    res.status(500).send(error)
    logger.error('Core => ' + error.toString())
  }
}

const finance = (req, res) => {
  try {
    const filter = {}

    let normalTripsFare = 0
    let corporateTripsFare = 0
    let normalTripsNet = 0
    let corporateTripsNet = 0
    let normalTripsTax = 0
    let corporateTripsTax = 0

    let rentFare = 0
    let rentNet = 0
    let rentTax = 0

    filter.pickupTimestamp = filterByTimeRange(req.query.from, req.query.to)

    if (req.query.driver != null && req.query.driver != 'all') {
      filter.driver = req.query.driver
    }

    Promise.all([
      Ride.find(filter),
      Rent.find(filter)
    ]).then((value) => {
      if (value[0]) {
        value[0].forEach((ride) => {
          if (ride.type == 'corporate') {
            corporateTripsFare += ride.fare
            corporateTripsNet += ride.net
            corporateTripsTax += ride.tax
          } else {
            normalTripsFare += ride.fare
            normalTripsNet += ride.net
            normalTripsTax += ride.tax
          }
        })
      }

      if (value[1]) {
        value[1].forEach((rent) => {
          rentFare += rent.fare
          rentNet += rent.net
          rentTax += rent.tax
        })
      }

      res.send({
        normalTripsFare,
        normalTripsNet,
        normalTripsTax,
        corporateTripsFare,
        corporateTripsNet,
        corporateTripsTax,
        rentFare,
        rentNet,
        rentTax
      })
    }).catch((error) => {
      res.status(500).send(error)
      logger.error('Core => ' + error.toString())
    })
  } catch (error) {
    res.status(500).send(error)
    logger.error('Core => ' + error.toString())
  }
}

const exportFinancialReport = (req, res) => {
  try {
    const filter = {}

    let normalTripsFare = 0
    let corporateTripsFare = 0
    let normalTripsNet = 0
    let corporateTripsNet = 0
    let normalTripsTax = 0
    let corporateTripsTax = 0

    let rentFare = 0
    let rentNet = 0
    let rentTax = 0

    filter.pickupTimestamp = filterByTimeRange(req.query.from, req.query.to)

    if (req.query.driver != null && req.query.driver != 'all') {
      filter.driver = req.query.driver
    }

    Promise.all([
      Ride.find(filter),
      Rent.find(filter)
    ]).then((value) => {
      if (value[0]) {
        value[0].forEach((ride) => {
          if (ride.type == 'corporate') {
            corporateTripsFare += ride.fare
            corporateTripsNet += ride.net
            corporateTripsTax += ride.tax
          } else {
            normalTripsFare += ride.fare
            normalTripsNet += ride.net
            normalTripsTax += ride.tax
          }
        })
      }

      if (value[1]) {
        value[1].forEach((rent) => {
          rentFare += rent.fare
          rentNet += rent.net
          rentTax += rent.tax
        })
      }

      const reportData = [
        [
          'Normal Trips Fare',
          'Normal Trips Net',
          'Normal Trips Tax',
          'Corporate Trips Fare',
          'Corporate Trips Net',
          'Corporate Trips Tax',
          'Rent Fare',
          'Rent Net',
          'Rent Tax',
          'Total Fare',
          'Total Net',
          'Total Tax'
        ].join('\t'),
        [
          normalTripsFare,
          normalTripsNet,
          normalTripsTax,
          corporateTripsFare,
          corporateTripsNet,
          corporateTripsTax,
          rentFare,
          rentNet,
          rentTax,
          (normalTripsFare + corporateTripsFare + rentFare).toFixed(2),
          (normalTripsNet + corporateTripsNet + rentNet).toFixed(2),
          (normalTripsTax + corporateTripsTax + rentTax).toFixed(2)
        ].join('\t')
      ].join('\n')

      generateAndSendReport({
        req,
        res,
        fileName: 'generated-report-financial.xls',
        fileData: reportData
      })
    }).catch((error) => {
      res.status(500).send(error)
      logger.error('Core Financial Report => ' + error.toString())
    })
  } catch (error) {
    res.status(500).send(error)
    logger.error('Core Financial Report => ' + error.toString())
  }
}

const date = (req, res) => {
  res.send(new Date())
}

module.exports = { getSettingsAndVehicleModels, getPassengerSettings, getPassengerVehicleModels, dashboard, route, godview, finance, date, exportFinancialReport }
