const pools = [
]

const addPool = (pool) => {
  // pools[pool._id = pool;
  pools.push(pool)
  return pool
}

const findPool = (id) => {
  return pools.find(p => p.id == id)
}

const fetchPools = () => {
  return pools
}

const removePool = (id) => {
  const index = pools.findIndex(p => p.id == id)
  pools.splice(index, 1)
}

const joinPool = (id, passenger, callback) => {
  try {
    console.log(pools.some(p => p.id === id))
    if (!pools.some(p => p.id === id)) {
      callback('pool not found')
    } else {
      const pool = pools.find(p => p.id == id)

      const existingPassengers = pool.passengers ? pool.passengers : []
      console.log(existingPassengers)
      if (existingPassengers.includes(passenger)) callback('you have already joined this pool')
      else {
        existingPassengers.push(passenger)
        pools.find(p => p.id == id).passengers = existingPassengers
        callback(null, pool)
      }
    }
  } catch (error) {
    callback(error.message)
  }
}

module.exports = { addPool, findPool, removePool, fetchPools, joinPool }
