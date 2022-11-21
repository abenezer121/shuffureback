const Setting = require('../../../models/Setting')
const VehicleType = require('../../../models/VehicleType')
const { makeRequest } = require('../../../services/axios')

module.exports = async (data, dispatcher, socket) => {
  if (data && data.pickUpAddress && data.dropOffAddress && data.vehicleType) {
    const setting = await Setting.findOne()
    let pickup, dropOff
    if (data.pickUpAddress.place_id && !data.pickUpAddress.coordinate) {
      pickup = makeRequest({ method: 'get', url: 'https://maps.googleapis.com/maps/api/geocode/json?place_id=' + data.pickUpAddress.place_id + '&key=' + setting.mapKey })
    }
    if (data.dropOffAddress.place_id && !data.dropOffAddress.coordinate) {
      dropOff = makeRequest({ method: 'get', url: 'https://maps.googleapis.com/maps/api/geocode/json?place_id=' + data.dropOffAddress.place_id + '&key=' + setting.mapKey })
    }
    let vehicleType


    Promise.all([pickup, dropOff, VehicleType.findById(data.vehicleType)]).then(value => {
      const pua = {}
      const doa = {}
      
      // if (!(value[0] && value[0].status && value[1] && value[1].status)) {
      //   return
      // }
  

      if (value[0] == null && data.pickUpAddress.coordinate) {
        pua.name = data.pickUpAddress.name
        pua.lat = data.pickUpAddress.coordinate.lat
        pua.long = data.pickUpAddress.coordinate.long
      } else if (value[0].status == 200 && value[0].data.status == 'OK') {
        pua.name = data.pickUpAddress.name
        pua.lat = value[0].data.results[0].geometry.location.lat
        pua.long = value[0].data.results[0].geometry.location.lng
      } else {
        pua.name = '_'
        return
      }

      if (value[0] == null && data.dropOffAddress.coordinate) {
        doa.name = data.dropOffAddress.name
        doa.lat = data.dropOffAddress.coordinate.lat
        doa.long = data.dropOffAddress.coordinate.long
      } else if (value[1].status == 200 && value[1].data.status == 'OK') {
        doa.name = data.dropOffAddress.name
        doa.lat = value[1].data.results[0].geometry.location.lat
        doa.long = value[1].data.results[0].geometry.location.lng
      } else {
        doa.name = '_'
        return
      }

      if (value[2]) {
        vehicleType = value[2]
      } else {
        return
      }

      const apiKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjb21wYW55bmFtZSI6IkdlYmV0YSIsImlkIjoiZDIyOWU3YWQtMTkxYS00ODU0LWE4MmEtNmM3NWI1Zjk2MzkwIiwidXNlcm5hbWUiOiJnZWJldGF1c2VyIn0.ja4SNozrDcevV4r89YIAnEXBUTlqhcYFdLQN2eakDBI"
      const url = "https://mapapi.gebeta.app/api/v1/route/driving/direction/?la1=" + pua.lat + "&lo1=" +  pua.long + "&la2=" +  doa.lat + "&lo2=" +  doa.long + "&apiKey="+apiKey
   
      

      makeRequest({ method: 'get', url: url })
        .then((routeObject) => {
          if(routeObject.data.msg == "Ok" ){  
          const route = { coordinates: routeObject.data.direction, distance: routeObject.data.totalDistance, duration: routeObject.data.timetaken }
            const estimate = {
              distance: route.distance / 1000,
              duration: parseInt(route.duration)  / 60,
              route: route.coordinates,
              fare: ((parseInt(route.duration) / 1000) * vehicleType.pricePerKM) + vehicleType.baseFare /* + ((route.duration / 60) * vehicleType.pricePerMin) */
            }
            socket.emit('estimate-response', estimate)
          }
        }).catch((error) => {
          console.log({ error })
        })
    }).catch((error) => {
      console.log({ error })
    })
  }
}