const { promisify } = require('util');

const compile = async () => promisify(require('couchdb-compile'))('./ddocs/builds');

(async function main(){
  console.log('pushToServer :: pushing ddoc to production');
  console.log(`Connecting to ${process.env.BUILDS_COUCH_URL}`);

  const DB = require('pouchdb-core')
        .plugin(require('pouchdb-adapter-http'))(process.env.BUILDS_COUCH_URL);

  console.log('Compiling ddoc');
  const ddoc = await compile();

  console.log('Getting existing ddoc (for _rev)');
  const existing = await DB.get(ddoc._id);
  if (existing) {
    ddoc._rev = existing._rev;
  }

  console.log('Pushing generated ddoc');
  await DB.put(ddoc);
})().catch(err => {
  console.error(err);
  process.exit(-1);
})
