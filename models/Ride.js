const mongoose = require('mongoose')
const Schema = mongoose.Schema
const MODELS = require('../constants/model-names');
const TRIP_TYPES = require('../constants/trip-types');
const Setting = require('./Setting');

const RideSchema = Schema({
  schedule: Date,
  notified: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: 'normal'
  },
  passenger: {
    type: Schema.Types.ObjectId,
    ref: 'Users'
  },
  driver: {
    type: Schema.Types.ObjectId,
    ref: 'Drivers'
  },
  dispatcher: {
    type: Schema.Types.ObjectId,
    ref: 'accounts'
  },
  pickupTimestamp: Date,
  cancelCost: {
    type: Number,
    default: 0
  },
  endTimestamp: Date,
  pickUpAddress: {
    type: {
      name: String,
      lat: Number,
      long: Number
    },
    required: true
  },
  dropOffAddress: {
    type: {
      name: String,
      lat: Number,
      long: Number
    },
    required: false
  },
  vehicleType: {
    type: Schema.Types.ObjectId,
    ref: 'VehicleTypes',
    required: true
  },
  vehicle: {
    type: Schema.Types.ObjectId,
    ref: 'Vehicles',
    required: true
  },
  cancelledBy: String,
  cancelledReason: String,
  totalDistance: Number,
  companyCut: {
    type: Number,
    default: 0
  },
  fare: {
    type: Number,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  path: {
    type: [[Number]],
    default: []
  },
  route: {
    coordinates: {
      type: [[Number]]
    },
    distance: Number,
    duration: Number
  },
  discount: {
    type: Number,
    default: 0
  },
  paymentMethod: String,
  paymentStatus: String,
  status: String,
  active: {
    type: Boolean,
    required: true,
    default: true
  },
  driverRate: Number,
  driverComment: String,
  passengerRate: Number,
  passengerComment: String,
  payedToDriver: {
    type: Number,
    default: 0
  },
  net: {
    type: Number,
    default: 0
  },
  corporate: {
    type: Boolean,
    default: false
  },
  ticket: {
    type: Schema.Types.ObjectId,
    ref: 'Tickets'
  },
  note: String,
  corporate: {
    type: Schema.Types.ObjectId,
    ref: 'Corporates'
  },
  transactionNumber: Number,
  bidAmount: Number,
  createdBy: String,
  dispatcherWhoEnded: {
    type: Schema.Types.ObjectId,
    ref: 'accounts',
  },
  surge: {
    type: Boolean,
    required: true,
    default: false
  }
},
  {
    timestamps: true
  })

RideSchema.pre('save', async function (done) {
  if (!this.isNew) return done();

  const setting = await Setting.findOne({})

  if (
    setting.surgeTimeFrom && setting.surgeTimeFrom.hour != null && setting.surgeTimeFrom.minute != null &&
    setting.surgeTimeUpto && setting.surgeTimeUpto.hour != null && setting.surgeTimeUpto.minute != null) {

    const currentTime = new Date()

    const from = new Date()
    from.setHours(setting.surgeTimeFrom.hour)
    from.setMinutes(setting.surgeTimeFrom.minute)

    const upto = new Date()
    upto.setHours(setting.surgeTimeUpto.hour)
    upto.setMinutes(setting.surgeTimeUpto.minute)

    if (setting.surgeTimeFrom.hour >= setting.surgeTimeUpto.hour) {
      upto.setDate(upto.getDate() + 1)
    }
    
    if (currentTime.getHours() < setting.surgeTimeFrom.hour) {
      currentTime.setDate(currentTime.getDate() + 1)
    }

    if (
      from < currentTime && currentTime < upto
    ) {
      // console.log("SURGE  TRUE")
      this.surge = true;
      done()
    } else {
      // console.log("SURGE  FALSE")
      this.surge = false;
      done()
    }
  }

});

RideSchema.index(
  { driver: 1 },
  {
    unique: true,
    partialFilterExpression: {
      active: true,
      type: "roadPickup"
    }
  }
)

RideSchema.index(
  { passenger: 1 },
  {
    unique: true,
    partialFilterExpression: {
      active: true
    }
  }
)

module.exports = mongoose.model(MODELS.RIDES, RideSchema)
