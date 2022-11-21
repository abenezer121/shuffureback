const dispatchers = []

const addDispatcher = ({ dispatcherId, socketId }) => {
  const existingDispatcher = dispatchers.find((dispatcher) => dispatcher.dispatcherId == dispatcherId)
  if (existingDispatcher) {
    removeDispatcher({ dispatcherId })
  }

  const dispatcher = { dispatcherId, socketId }
  dispatchers.push(dispatcher)
  return dispatcher
}

const removeDispatcher = ({ dispatcherId }) => {
  const index = dispatchers.findIndex((dispatcher) => dispatcher.dispatcherId == dispatcherId)

  if (index != -1) {
    return dispatchers.splice(index, 1)[0]
  }
}

const getDispatcher = ({ dispatcherId }) => dispatchers.find((dispatcher) => dispatcher.dispatcherId == dispatcherId)

const getAllDispatchers = () => dispatchers

module.exports = { addDispatcher, removeDispatcher, getDispatcher, getAllDispatchers }

// const redis = require('redis');

// const client = redis.createClient({
//     host: 'shuufare-redis',
//     port: 6379,
// });

// const addDispatcher = ({ dispatcherId, socketId }) => {

//     // const existingDispatcher = dispatchers.find((dispatcher) => dispatcher.dispatcherId == dispatcherId);
//     // if (existingDispatcher) {
//     //     removeDispatcher({ dispatcherId });
//     // }

//     // const dispatcher = { dispatcherId, socketId };
//     // dispatchers.push(dispatcher);
//     // return dispatcher;

//     const dispatcherInfo = {
//         dispatcherId,
//         socketId,
//     }
//     client.set(`dispatcher:${dispatcherId}`, dispatcherInfo)

//     return dispatcherInfo
// }

// const removeDispatcher = ({ dispatcherId }) => {
//     client.del(`dispatcher:${dispatcherId}`)

//     // const index = dispatchers.findIndex((dispatcher) => dispatcher.dispatcherId == dispatcherId);

//     // if (index != -1) {
//     //     return dispatchers.splice(index, 1)[0];
//     // }
// }

// const getDispatcher = ({ dispatcherId }) => {
//     // return dispatchers.find((dispatcher) => dispatcher.dispatcherId == dispatcherId);
//     return client.get(`dispatcher:${dispatcherId}`)
// }

// const getAllDispatchers = () => dispatchers;

// module.exports = { addDispatcher, removeDispatcher, getDispatcher, getAllDispatchers };
