const { promisify } = require('util');
const path = require('path');
const PouchDB = require('pouchdb-core').plugin(require('pouchdb-adapter-http'));

const compile = async (buildPath) => promisify(require('couchdb-compile'))(buildPath);

const PRODUCTION_DB = 'builds';
// Testing by confirmed employees. Code in this repo gets moved to `builds` after e2e tests are successful.
const TESTING_DB = 'builds_testing';
// Builds by external contributors. Code in this repo never gets moved to `builds`.
const EXTERNAL_DB = 'builds_external';

const pushDdoc = async (dbName, compiledDdoc) => {
  console.log(`:: pushing ddoc to ${dbName}`);

  const DB = PouchDB(`${process.env.BUILDS_COUCH_URL}/${dbName}`);

  console.log('..getting existing ddoc (for _rev)');
  try {
    const existing = await DB.get(compiledDdoc._id);
    if (existing) {
      compiledDdoc._rev = existing._rev;
    }
  } catch (err) {
    delete compiledDdoc._rev;
    console.log('No existing doc');
  }

  console.log('..pushing generated ddoc');
  await DB.put(compiledDdoc);
  console.log('..done');
};

(async function main() {
  console.log('Compiling ddocs');
  const ddoc = await compile(path.join(__dirname, '..', 'ddocs/builds'));
  const buildsExternalDdoc = await compile(path.join(__dirname, '..', 'ddocs/builds_external'));

  await pushDdoc(PRODUCTION_DB, ddoc);

  await pushDdoc(TESTING_DB, ddoc);

  await pushDdoc(EXTERNAL_DB, buildsExternalDdoc);

})().catch(err => {
  console.error(err);
  process.exit(-1);
});
