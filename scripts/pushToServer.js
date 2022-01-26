const { promisify } = require('util');
const path = require('path');
const PouchDB = require('pouchdb-core').plugin(require('pouchdb-adapter-http'));

const compile = async (buildPath) => promisify(require('couchdb-compile'))(buildPath);

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

(async function main(){
  console.log('Compiling ddocs');
  const ddoc = await compile(path.join(__dirname, '..', 'ddocs/builds'));
  const buildsExternalDdoc = await compile(path.join(__dirname, '..', 'ddocs/builds_external'));

  for (const dbName of DBS) {
    await pushDdoc(dbName, ddoc);
  }

  await pushDdoc('builds_external', buildsExternalDdoc);
})().catch(err => {
  console.error(err);
  process.exit(-1);
});
