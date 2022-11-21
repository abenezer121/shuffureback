const mongoose = require('mongoose')
const Schema = mongoose.Schema

const MODELS = require('../constants/model-names')

const TRIP_SEARCH_STATUSES = require('../constants/trip-search-statuses')

const TripSearch = Schema({
    active: {
        type: Boolean,
        default: true
    },
    requestedVehicles: [{
        type: Schema.Types.ObjectId,
        ref: 'Vehicles'
    }],
    passenger: {
        type: Schema.Types.ObjectId,
        ref: 'Users'
    },
    dispatcher: {
        type: Schema.Types.ObjectId,
        ref: 'accounts'
    },
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
    route: {
        coordinates: {
            type: [[Number]]
        },
        distance: Number,
        duration: Number
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
    status: {
        type: String,
        default: TRIP_SEARCH_STATUSES.IN_PROGRESS
    },
    schedule: Date,
    type: {
        type: String,
        default: 'normal'
    },
    bidAmount: Number,
    createdBy: String,
    dispatcherWhoCancelled: {
        type: Schema.Types.ObjectId,
        ref: 'accounts',
    },
    cancelledBy: String,
    cancelledReason: String,
    searchRound: {
        type: Number,
        default: 1
    }
},

    {
        timestamps: true
    }
)

TripSearch.index(
    { passenger: 1 },
    {
        unique: true,
        partialFilterExpression: {
            active: true
        }
    }
)

module.exports = mongoose.model(MODELS.TRIP_SEARCHES, TripSearch)

    // updateStatus(status) {
    //     this.status = status;
    //     this.updateCallback(this);
    // }

    // getStatus() {
    //     return this.status;
    // }