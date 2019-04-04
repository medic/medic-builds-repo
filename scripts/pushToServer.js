const { promisify } = require('util');
const PouchDB = require('pouchdb-core').plugin(require('pouchdb-adapter-http'));

const compile = async () => promisify(require('couchdb-compile'))('./ddocs/builds');

const DBS = [
  // Production
  'builds',

  // Testing by confirmed employees. Code in this repo gets moved to `builds`
  // when it wants to be published (e.g. it's a tag)
  'builds_testing',

  // specifically NOT pushing to this one. This server should not use the build server code as we
  // don't want the validation: here anonymous users *are* allowed to create builds. This is OK
  // as these builds are only used for their external PRs and will never directly make it into
  // production
  // 'builds_external'
];

(async function main(){
  console.log('Compiling ddoc');
  const ddoc = await compile();

  for (let dbName of DBS) {
    console.log(`:: pushing ddoc to ${dbName}`);

    const DB = PouchDB(`${process.env.BUILDS_COUCH_URL}/${dbName}`);

    console.log('..getting existing ddoc (for _rev)');
    try {
      const existing = await DB.get(ddoc._id);
      if (existing) {
        ddoc._rev = existing._rev;
      }
    } catch (err) {
      delete ddoc._rev;
      console.log('No existing doc');
    }

    console.log('..pushing generated ddoc');
    await DB.put(ddoc);
    console.log('..done');
  }
})().catch(err => {
  console.error(err);
  process.exit(-1);
})
