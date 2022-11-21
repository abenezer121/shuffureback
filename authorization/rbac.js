const path = require('path');
const { newEnforcer } = require('casbin');
const { MongooseAdapter } = require('casbin-mongoose-adapter');


module.exports = (async function () {
    const model = path.resolve(__dirname, './casbin-rbac.conf');
    const adapter = await MongooseAdapter.newAdapter(process.env.DB_CONNECTION);
    return await newEnforcer(model, adapter);
})()