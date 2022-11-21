const mongoose = require('mongoose')
const Schema = mongoose.Schema
const MODELS = require('../constants/model-names')

const AccountSchema = Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  email: {
    type: String,
    unique: true,
    required: true
  },
  roles: {
    type: [
      {
        type: Number,
        min: 1,
        max: 7
      }
    ],
    required: true,
    default: []
  },
  profileImage: {
    type: String,
    required: false
  },
  active: {
    type: Boolean,
    default: true
  },
  corporate: {
    type: Schema.Types.ObjectId,
    ref: 'Corporates',
    required: false
  },
  socketId: String,
  tripSearchId: String,
  rentSearchId: String,
},
{
  timestamps: true
})

module.exports = mongoose.model(MODELS.ACCOUNTS, AccountSchema)
