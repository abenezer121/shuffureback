const requests = []

const addRequest = ({ newRequest }) => {
  const existing = requests.find((request) => request.driverId == newRequest.driverId && request.passengerId == newRequest.passengerId)
  if (existing) {
    removeRequest({ passengerId: newRequest.passengerId, driverId: newRequest.driverId })
  }
  requests.push(newRequest)
}

const removeRequest = ({ passengerId, driverId }) => {
  const index = requests.findIndex((request) => driverId ? request.driverId == driverId && request.passengerId == passengerId : request.passengerId == passengerId)

  if (index != -1) {
    requests.splice(index, 1)
  }
}

const updateRequest = ({ passengerId, driverId, status }) => {
  const request = getRequest({ passengerId, driverId })

  if (request) {
    request.updateStatus(status)
    removeRequest({ passengerId, driverId })
  }
}

const getRequest = ({ passengerId, driverId }) => requests.find((request) => driverId ? request.driverId == driverId && request.passengerId == passengerId : request.passengerId == passengerId)

const getDriverRequest = ({ driverId }) => requests.find((request) => request.driverId == driverId)

const getPassengerRequest = ({ passengerId }) => requests.find((request) => request.passengerId == passengerId)

const getAllRequests = (createdBy) => createdBy ? requests.filter((request) => request.createdBy == createdBy) : requests

module.exports = { addRequest, removeRequest, getRequest, updateRequest, getDriverRequest, getAllRequests, getPassengerRequest }
