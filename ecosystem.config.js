module.exports = [
  {
    script: 'app.js',
    name: 'shuufare-api',
    // exec_mode: 'fork',
    // instances: 1
    exec_mode: 'cluster',
    instances: 0
  },
  {
    script: 'misc-server.js',
    name: 'shuufare-admin-api',
    exec_mode: 'cluster',
    instances: 0
  }
]
