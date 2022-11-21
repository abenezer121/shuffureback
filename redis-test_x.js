const redis = require('redis')

const client = redis.createClient({
  host: 'shuufare-redis',
  port: 6379
})

const addDispatcher = ({ dispatcherId, socketId }) => {
  // const existingDispatcher = dispatchers.find((dispatcher) => dispatcher.dispatcherId == dispatcherId);
  // if (existingDispatcher) {
  //     removeDispatcher({ dispatcherId });
  // }

  // const dispatcher = { dispatcherId, socketId };
  // dispatchers.push(dispatcher);
  // return dispatcher;

  const dispatcherInfo = {
    dispatcherId,
    socketId
  }
  client.setex(`dispatcher:${dispatcherId}`, 3600, dispatcherInfo)

  return dispatcherInfo
}

const removeDispatcher = ({ dispatcherId }) => {
  client.del(`dispatcher:${dispatcherId}`)

  // const index = dispatchers.findIndex((dispatcher) => dispatcher.dispatcherId == dispatcherId);

  // if (index != -1) {
  //     return dispatchers.splice(index, 1)[0];
  // }
}

const getDispatcher = ({ dispatcherId }) => {
  // return dispatchers.find((dispatcher) => dispatcher.dispatcherId == dispatcherId);
  return client.get(`dispatcher:${dispatcherId}`)
}

const getAllDispatchers = () => {
  return client.scan()
}
const getAllDispatchers2 = () => {
  return client.keys('')
}
const getAllDispatchers3 = () => {
  return client.keys('dispatcher:.+')
}

// module.exports = { addDispatcher, removeDispatcher, getDispatcher, getAllDispatchers };

console.log(getAllDispatchers())
console.log(getAllDispatchers2())
console.log(getAllDispatchers3())
addDispatcher({
  dispatcherId: 1,
  socketId: 2
})
addDispatcher({
  dispatcherId: 2,
  socketId: 3
})
console.log(getAllDispatchers())
console.log(getAllDispatchers2())
console.log(getAllDispatchers3())
removeDispatcher({
  dispatcherId: 2
})
console.log(getAllDispatchers())
console.log(getAllDispatchers2())
console.log(getAllDispatchers3())
