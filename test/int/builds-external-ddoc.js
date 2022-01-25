const { expect } = require('chai');
const uuid = require('uuid');

const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));
const compile = require('couchdb-compile');

const { TEST_URL, TEST_DB } = process.env;

if (!TEST_URL || !TEST_DB) {
  expect.fail(null, null, 'You must provide a TEST_URL & TEST_DB env var. See README.md');
}

const buildsUrl = (new URL(`${TEST_URL}/${TEST_DB}`)).toString();

const UsersDb = new PouchDB(`${TEST_URL}/_users`);
let BuildsDb = new PouchDB(buildsUrl);
let AdminBuildsDb = new PouchDB(`${TEST_URL}/${TEST_DB}`);

const resetDb = () =>
  AdminBuildsDb
    .destroy()
    .then(() => {
      AdminBuildsDb = new PouchDB(`${TEST_URL}/${TEST_DB}`)
      return AdminBuildsDb.info(); // Trigger creation by an admin
    })
    .then(() => new Promise((resolve, reject) =>
      compile('ddocs/builds', (err, ddoc) => err ? reject(err) : resolve(ddoc))
    ))
    .then(ddoc => AdminBuildsDb.put(ddoc));

const setupUser = () => UsersDb
  .put(buildsUser)
  .then(result => {
    buildsUser._rev = result.rev;
  });

const teardownUser = () => UsersDb.remove(buildsUser);

const withBuildInfo = (doc, specificTime) => {
  const [ns, app, version] = doc._id.split(':');

  doc.build_info = {
    namespace: ns,
    application: app,
    schema_version: 1,
    version: version,
    time: specificTime || new Date(),
    author: 'int. test',
    node_modules: []
  };

  return doc;
};

describe('Design document', () => {
  before(() => setupUser());
  after(() => teardownUser());

  describe('validate_doc_update', () => {
    before(resetDb);

    it('anonymous users can write builds', async () => {
      await BuildsDb.put(withBuildInfo({_id: 'medic:medic:a-branch', value: 1}));
    });

    it('Lets us write to a branch multiple times', () =>
      BuildsDb.put(withBuildInfo({_id: 'medic:medic:a-branch', value: 1}))
        .then(result => BuildsDb.put(withBuildInfo({_id: 'medic:medic:a-branch', value: 2, _rev: result.rev})))
        .then(() => BuildsDb.get('medic:medic:a-branch'))
        .then(doc => doc.value.should.equal(2)));

    it('Blocks multiple writes to releases', () =>
      BuildsDb.put(withBuildInfo({_id: 'medic:medic:2.0.0', value: 1}))
        .then(result => BuildsDb.put(withBuildInfo({_id: 'medic:medic:2.0.0', value: 2, _rev: result.rev})))
        .should.be.rejectedWith('You are not allowed to overwrite existing releases or pre-releases'));

    it('Blocks multiple writes to pre-releases', () =>
      BuildsDb.put(withBuildInfo({_id: 'medic:medic:2.0.0-beta.1', value: 1}))
        .then(result => BuildsDb.put(withBuildInfo({_id: 'medic:medic:2.0.0-beta.1', value: 2, _rev: result.rev})))
        .should.be.rejectedWith('You are not allowed to overwrite existing releases or pre-releases'));

    it('Blocks deleting releases', () =>
      BuildsDb.put(withBuildInfo({ _id: 'medic:medic:2.1.0', value: 1 }))
        .then(result => BuildsDb.put(withBuildInfo({ _id: 'medic:medic:2.1.0', _rev: result.rev, _deleted: true })))
        .should.be.rejectedWith('You are not allowed to delete releases'));

    it('Allows deleting pre-preleases', () =>
      BuildsDb.put(withBuildInfo({_id: 'medic:medic:2.1.0-beta.1', value: 1 }))
        .then(result => BuildsDb.put(withBuildInfo({_id: 'medic:medic:2.1.0-beta.1', _rev: result.rev, _deleted: true })))
        .then(() => BuildsDb.get('medic:medic:2.1.0-beta.1'))
        .should.be.rejectedWith('deleted'));

    it('Allows deleting branches', () =>
      BuildsDb.put(withBuildInfo({_id: 'medic:medic:1111-some-branch', value: 1 }))
        .then(result => BuildsDb.put(withBuildInfo({_id: 'medic:medic:1111-some-branch', _rev: result.rev, _deleted: true })))
        .then(() => BuildsDb.get('medic:medic:1111-some-branch'))
        .should.be.rejectedWith('deleted'));

    it('Blocks incorrect document ids', () =>
      BuildsDb.put({_id: 'not-a-valid-version-identifier'})
        .should.be.rejectedWith('Document _id format invalid'));

    it('must rely on either kanso or build_info properties', () =>
      BuildsDb.put({_id: 'medic:validate_doc_update:1.0.0'})
        .should.be.rejectedWith(/neither legacy kanso .+ build_info/));

    it('kanso is valid', () =>
      BuildsDb.put({_id: 'medic:validate_doc_update:2.0.0', kanso: {build_time: new Date()}}));

    it('if build_info, it must be valid', () =>
      BuildsDb.put({_id: 'medic:validate_doc_update:3.0.0', build_info: {schema_version: 1, not: 'valid'}})
        .should.be.rejectedWith(/complete build_info property/));

    it('must be a supported version', () =>
      BuildsDb.put({_id: 'medic:validate_doc_update:3.0.0', build_info: {schema_version: 999, not: 'valid'}})
        .should.be.rejectedWith(/Incompatible schema_version/));
  });

});
