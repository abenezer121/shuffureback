const mongoose = require('mongoose')
const Schema = mongoose.Schema
const MODELS = require('../constants/model-names')

const TokenSchema = Schema({
  active: {
    type: Boolean,
    default: true
  },
  driver: {
    type: Schema.Types.ObjectId,
    ref: 'Drivers'
  },
  account: {
    type: Schema.Types.ObjectId,
    ref: 'accounts'
  },
  passenger: {
    type: Schema.Types.ObjectId,
    ref: 'Users'
  }
},
{
  timestamps: true
}
)

module.exports = mongoose.model(MODELS.TOKENS, TokenSchema)
