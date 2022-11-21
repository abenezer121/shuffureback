const Token = require('../models/Token')
const ROLES = require('../utils/roles')

module.exports = (roles) => {
  return (req, res, next) => {
    let enabledRoles = []; let accessToken

    if (roles && typeof (roles) === typeof ([]) && roles.length) {
      enabledRoles = roles
    }

    if (req.query.token) { // token from queryString (for backward compatability)
      accessToken = req.query.token
    } else { // token from Authorization Header
      const authHeader = req.headers.authorization

      if (authHeader) {
        const [scheme, token] = authHeader.split(' ')

        if (scheme === 'Bearer' && token) {
          accessToken = token
        }
      }
    }

    if (accessToken) {
      Token.findById(accessToken).populate('account').then((token) => {
        if (token && token.active) {
          if (enabledRoles) {
            if (
              // enabledRoles.includes(token.role) || 
              (token.account && token.account.roles.some(value => enabledRoles.includes(value) && token.account.active) ||
                (enabledRoles.includes(ROLES.DRIVER) && token.driver) ||
                (enabledRoles.includes(ROLES.PASSENGER) && token.passenger))
            ) {
              res.locals.user = token.account
              next()
            } else {
              res.status(403).send('Insufficient Permission')
            }
          } else {
            next()
          }
        } else {
          res.status(401).send('UNAUTHORIZED')
        }
      }).catch(err => {
        console.log(err)
        res.status(500).send('Internal Error while trying to authenticate via token')
      })
    } else {
      res.status(401).send('UNAUTHORIZED')
    }
  }
}
