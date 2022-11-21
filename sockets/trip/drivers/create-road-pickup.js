const { addTrip } = require("../../../containers/tripContainer")
const Ride = require("../../../models/Ride")
const Setting = require("../../../models/Setting")
const VehicleType = require("../../../models/VehicleType")
const User = require("../../../models/User")
const { emitToPassenger } = require("../../utils/passenger")
const { emitToDriver } = require("../../utils/driver")
const { makeRequest } = require('../../../services/axios')
const { sanitizeInputs } = require('../../utils/core')
const TRIP_STATUS = require('../../../constants/trip-statuses')
const TRIP_TYPES = require('../../../constants/trip-types')
const { updateVehicle } = require("../../utils/vehicle")

const schema = {
    type: 'object',
    properties: {
        pickUpAddress: { type: 'object' },
        dropOffAddress: { type: 'object' },
        vehicleType: { type: 'string' },
        passengerPhone: { type: 'string' },
    },
    required: ["pickUpAddress", "dropOffAddress", "passengerPhone"],
    additionalProperties: false
}

module.exports = async (data, driver, vehicle, socket) => {

    try {
        await sanitizeInputs(schema, data)

        const prevTrip = await Ride.findOne({ status: TRIP_STATUS.STARTED, driver: driver._id }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle')

        if (prevTrip) {
            socket.emit('trip', prevTrip)
        } else {
            const setting = await Setting.findOne()
            let passengerId = ''
            const vehicleTypeData = await VehicleType.findById(data.vehicleType)
            let pickup = data.pickUpAddress.name
            let dropOff = data.dropOffAddress.name

            const passenger = await User.findOne({ phoneNumber: data.passengerPhone })
            if (passenger) {
                passengerId = passenger._id
            } else {
                const newPassenger = await User.create({ phoneNumber: data.passengerPhone, firstName: data.name ? data.name : '_', lastName: '_' })
                if (newPassenger) {
                    passengerId = newPassenger._id
                }
            }

            if (!pickup) {
                pickup = makeRequest({ method: 'get', url: 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + data.pickUpAddress.lat + ',' + data.pickUpAddress.long + '&key=' + setting.mapKey })
            }

            if (!dropOff) {
                dropOff = makeRequest({ method: 'get', url: 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + data.dropOffAddress.lat + ',' + data.dropOffAddress.long + '&key=' + setting.mapKey })
            }


            const apiKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjb21wYW55bmFtZSI6IkdlYmV0YSIsImlkIjoiZDIyOWU3YWQtMTkxYS00ODU0LWE4MmEtNmM3NWI1Zjk2MzkwIiwidXNlcm5hbWUiOiJnZWJldGF1c2VyIn0.ja4SNozrDcevV4r89YIAnEXBUTlqhcYFdLQN2eakDBI"
            const route = "https://mapapi.gebeta.app/api/v1/route/driving/direction/?la1=" + data.pickUpAddress.lat + "&lo1=" +  data.pickUpAddress.long + "&la2=" +  data.dropOffAddress.lat + "&lo2=" +  data.dropOffAddress.long  + "&apiKey="+apiKey
         
            
            Promise.all([pickup, dropOff, route]).then(async ([pickupRes, dropOffRes, routeRes]) => {
                if (typeof (pickupRes) !== typeof (' ')) {
                    if (pickupRes.status == 200 && pickupRes.data.status == 'OK') {
                        data.pickUpAddress.name = pickupRes.data.results[0].formatted_address
                    } else {
                        data.pickUpAddress.name = '_'
                    }
                }

                if (typeof (dropOffRes) !== typeof (' ')) {
                    if (dropOffRes.status == 200 && dropOffRes.data.status == 'OK') {
                        console.log('status ok pul')
                        data.dropOffAddress.name = dropOffRes.data.results[0].formatted_address
                    } else {
                        data.dropOffAddress.name = '_'
                        console.log('wrong response dol', dropOffRes)
                    }
                }

                if(routeRes.data.msg == "Ok" ){  
                    data.route = { coordinates: routeObject.data.direction, distance: routeObject.data.totalDistance, duration: routeObject.data.timetaken }
                  
                }

                try {
                    const prevTrip = await Ride.findOne({ status: TRIP_STATUS.STARTED, driver: driver._id }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle')

                    console.log('>>>', prevTrip)
                    if (prevTrip) {
                        await emitToDriver(driver._id)('trip', prevTrip)
                    } else {
                        const ride = await Ride.create({
                            passenger: passengerId,
                            driver: driver._id,
                            vehicle: vehicle._id,
                            type: TRIP_TYPES.ROAD_PICKUP,
                            pickUpAddress: {
                                name: data.pickUpAddress.name,
                                lat: data.pickUpAddress.lat,
                                long: data.pickUpAddress.long
                            },
                            dropOffAddress: {
                                name: data.dropOffAddress.name,
                                lat: data.dropOffAddress.lat,
                                long: data.dropOffAddress.long
                            },
                            vehicleType: vehicleTypeData._id,
                            route: data.route,
                            status: TRIP_STATUS.STARTED,
                            active: true,
                            pickupTimestamp: new Date(),
                            createdBy: 'app'
                        })
                        
                        const createdRide = await Ride.findById(ride._id).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle')
                        await emitToDriver(driver._id)('trip', createdRide)
                        // await emitToDriver(driver._id)('tripStatus', { status: createdRide.status })

                        await emitToPassenger(passengerId)('trip', createdRide)
                        // await emitToPassenger(passengerId)('tripStatus', { status: createdRide.status })
                        
                        await updateVehicle(vehicle._id)({ online: false,
                            // tripId: ride._id
                        })
                    }
                } catch (error) {
                    console.log(error)
                }
            }).catch(err => console.log(err))
        }

    } catch (err) {
console.log(err)
socket.emit(err)
    }
}