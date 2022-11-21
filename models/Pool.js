const mongoose = require('mongoose')
const Schema = mongoose.Schema
const POOL_STATUS = require('../constants/pool-statuses')
const MODELS = require('../constants/model-names')

const PoolSchema = Schema({
  size: {
    type: Number,
    required: true
  },
  trips: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Rides'
    }
  ],
  passengers: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Users'
    }
  ],
  driver: {
    type: Schema.Types.ObjectId,
    ref: 'Drivers'
  },
  route: {
    coordinates: {
      type: [[Number]]
    },
    distance: Number,
    duration: Number
  },
  path: {
    type: [[Number]],
    default: []
  },
  // dispatcher: {
  //     type: Schema.Types.ObjectId,
  //     ref: "accounts"
  // },
  position: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number] // longitude comes first
    }
  },
  pickUpAddress: {
    type: {
      name: String,
      lat: Number,
      long: Number
    },
    required: true
  },
  fare: {
    type: Number,
    default: 0
  },
  totalDistance: {
    type: Number,
    default: 0
  },
  completedAt: {
    type: Date
  },
  dropOffAddress: {
    type: {
      name: String,
      lat: Number,
      long: Number
    },
    required: true
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
  status: {
    type: String,
    default: POOL_STATUS.CREATED
  }
},
{
  timestamps: true
})

PoolSchema.index({ status: 1, position: '2dsphere' })

PoolSchema.index(
  { driver: 1 },
  { unique: true, partialFilterExpression: { status: { $in: [POOL_STATUS.CREATED, POOL_STATUS.STARTED] } } }
)

module.exports = mongoose.model(MODELS.POOLS, PoolSchema)
