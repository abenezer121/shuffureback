const Account = require('../models/Account')
const bcrypt = require('bcryptjs')
const Token = require('../models/Token')
const logger = require('../services/logger')
const Roles = require('../utils/roles')
const mongoose = require('mongoose')
require('dotenv/config')
const activityLogger = require('../services/activity-logger')

const index = async (req, res) => {
  try {
    let page = 1
    let skip = 0
    let limit = 10
    let nextPage
    let prevPage
    const filter = {
      $or: [
        {
          fullName: {
            $regex: req.query.q ? req.query.q : '', $options: 'i'
          }
        }, {
          email: {
            $regex: req.query.q ? req.query.q : '', $options: 'i'
          }
        }
      ]
    }

    if (req.query.corporate) {
      filter.corporate = mongoose.Types.ObjectId(req.query.corporate)
    }

    if (req.query.page && parseInt(req.query.page) != 0) {
      page = parseInt(req.query.page)
    }
    if (req.query.limit) {
      limit = parseInt(req.query.limit)
    }

    if (page > 1) {
      prevPage = page - 1
    }

    skip = (page - 1) * limit

    const [results, ..._] = await Account
      .aggregate([
        {
          $addFields: {
            fullName: { $concat: ['$firstName', ' ', '$lastName'] }
          }
        },
        {
          $match: filter
        },
        {
          $sort: {
            createdAt: -1
          }
        },
        // https://docs.mongodb.com/manual/reference/operator/aggregation/facet/
        {
          $facet: {
            count: [
              {
                $count: 'value'
              }
            ],
            data: [
              {
                $skip: skip
              },
              {
                $limit: limit
              }
              // ...(JSON.parse(req.query.populate || '[]').flatMap(model => ([
              //     {
              //         $lookup: {
              //             from: `${model.toLowerCase()}s`,
              //             localField: model,
              //             foreignField: '_id',
              //             as: model,
              //         }
              //     },
              //     { $unwind: { path: `$${model}` } },
              // ])))
            ]
          }
        },
        { $project: { count: { $arrayElemAt: ['$count.value', 0] }, data: '$data' } }
      ])

    res.send({ ...(results.data.length ? results : { count: 0, data: [] }), nextPage, prevPage })
  } catch (error) {
    logger.error('Account => ' + error.toString())
    res.status(500).send(error)
  };
}

const show = (req, res) => {
  try {
    Account.findById(req.params.id, (error, account) => {
      if (error) logger.error('Account => ' + error.toString())
      if (account) {
        res.send(account)
      } else {
        res.status(404).send('Unknown account')
      }
    })
  } catch (error) {
    logger.error('Account => ' + error.toString())
    res.status(500).send(error)
  };
}

const search = (req, res) => {
  try {
    Account.find({
      // role: req.query.role ? parseInt(req.query.role) : Roles.DISPATCHER,
      $or: [
        {
          firstName: {
            $regex: req.query.q ? req.query.q : '', $options: 'i'
          }
        }, {
          lastName: {
            $regex: req.query.q ? req.query.q : '', $options: 'i'
          }
        }, {
          email: {
            $regex: req.query.q ? req.query.q : '', $options: 'i'
          }
        }
      ]
    }, (error, accounts) => {
      if (error) {
        logger.error('Account => ' + error.toString())
        res.status(500).send(error)
      } else if (accounts) {
        res.send(accounts)
      }
    }).limit(5)
  } catch (error) {
    logger.error('Account => ' + error.toString())
    res.status(500).send(error)
  }
}

const store = async (req, res) => {
  try {
    if (req.body) {
      const data = req.body
      if (data.password) {
        data.password = await bcrypt.hash(data.password, 5)
      }
      const savedAccount = await Account.create(data)
      res.send(savedAccount)
    }
  } catch (error) {
    if (error.name == "MongoError" && error.code == 11000) {
      if (error.keyValue.email) {
        res.status(422).send("email already exists");
      } else {
        res.status(422).send("duplicate entry");
      }
    } else {
      logger.error('Account => ' + error.toString())
      res.status(500).send(error)
    }
  }
}

const resetPassword = async (req, res) => {
  if (req.body) {
    const data = req.body
    if (data.newPassword) {
      newPassword = await bcrypt.hash(data.newPassword, 5)
      await Account.updateOne({ _id: req.params.id }, {
        password: newPassword
      })
      // await activityLogger.logActivity(activityLogger.ADMIN_HAS_RESETED_PASSWORD)({ account:  })
      res.status(200).send({
        success: true
      })
    } else {
      res.status(422).send('please provide the new password')
    }
  }
}

const auth = (req, res) => {
  const data = req.body
  if (data && data.email && data.password) {
    Account.findOne({ email: data.email }).select('+password').populate('corporate').exec(async (error, account) => {
      if (error) res.status(500).send(error)
      if (account) {
        if (await bcrypt.compare(data.password, account.password)) {
          const accountObject = account.toObject()
          if (!accountObject.active || (accountObject.corporate && !accountObject.corporate.active)) {
            res.status(401).send({ error: 'INACTIVE' })
          } else {
            delete accountObject.password
            await Token.updateMany({ account: accountObject._id }, { active: false }) // TODO: check if this needed
            const token = await Token.create({ active: true, account: accountObject._id })
            await activityLogger.ADMIN_HAS_LOGGED_IN({ account: accountObject })
            res.send({ account: accountObject, role: data.role, token: token._id })
          }
        } else {
          res.status(401).send({ error: 'UNAUTHORIZED' })
        }
      } else {
        res.status(401).send({ error: 'UNAUTHORIZED' })
      }
    })
  } else {
    res.status(500).send({ error: 'Invalid data' })
  }
}

const check = async (req, res) => {
  try {
    const token = await Token.findById(req.params.token)
    if (token && token.active == true && token.account) {
      const accountObject = await Account.findById(token.account).populate('corporate')
      if (accountObject) {
        if (!accountObject.active || (accountObject.corporate && !accountObject.corporate.active)) {
          res.status(403).send({ error: 'INACTIVE' })
        } else {
          res.send({ account: accountObject, token: token._id })
        }
      } else {
        res.status(401).send({ error: 'UNAUTHORIZED' })
      }
    } else {
      res.status(401).send({ error: 'UNAUTHORIZED' })
    }
  } catch (error) {
    logger.error('Account => ' + error.toString())
    res.status(500).send(error)
  }
}

const update = async (req, res) => {
  try {
    await Account.updateOne({ _id: req.params.id }, req.body)
    const account = await Account.findById(req.params.id)
    res.send(account)
  } catch (error) {
    logger.error('Account => ' + error.toString())
    res.status(500).send(error)
  }
}

module.exports = { index, show, store, auth, check, search, update, resetPassword }
