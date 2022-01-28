const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const should = chai.should();

const uuid = require('uuid');

const PouchDB = require('pouchdb-core')
        .plugin(require('pouchdb-adapter-http'))
        .plugin(require('pouchdb-mapreduce')),
      compile = require('couchdb-compile'),
      TEST_URL = process.env.TEST_URL,
      TEST_DB = process.env.TEST_DB;

if (!TEST_URL || !TEST_DB) {
  should.fail(null, null, 'You must provide a TEST_URL & TEST_DB env var. See README.md');
}

const buildsUser = {
  _id: 'org.couchdb.user:medic-builds-repo',
  type: 'user',
  name: 'medic-builds-repo',
  roles: [
  'builds-admin'
  ],
  password: uuid()
};

let buildsUrl = new URL(`${TEST_URL}/${TEST_DB}`);
buildsUrl.username = buildsUser.name;
buildsUrl.password = buildsUser.password;
buildsUrl = buildsUrl.toString();

const UsersDb = new PouchDB(`${TEST_URL}/_users`);
let BuildsDb = new PouchDB(buildsUrl);
let AdminBuildsDb = new PouchDB(`${TEST_URL}/${TEST_DB}`);

const resetDb = () =>
  AdminBuildsDb
    .destroy()
    .then(() => {
      AdminBuildsDb = new PouchDB(`${TEST_URL}/${TEST_DB}`);
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

describe('"Builds" Design document', () => {
  before(() => setupUser());
  after(() => teardownUser());

  describe('releases view', () => {

    const newerBranchDate = new Date();
    const olderBranchDate = new Date();
    olderBranchDate.setMinutes(olderBranchDate.getMinutes() - 1);

    describe('Filtering', () => {
      const testReleases = [
        withBuildInfo({_id: 'foo:bar:1.2.3'}),
        withBuildInfo({_id: 'foo:bar:1.2.4'}),
        withBuildInfo({_id: 'foo:bar:1.2.5'}),
        withBuildInfo({_id: 'foo:bar:1.3.0'}),
        withBuildInfo({_id: 'foo:bar:1.3.1'}),
        withBuildInfo({_id: 'foo:bar:1.3.2'}),
        withBuildInfo({_id: 'foo:bar:1.4.0'}),
        withBuildInfo({_id: 'foo:bar:2.1.2'}),
        withBuildInfo({_id: 'oof:bar:1.3.2'}),
        withBuildInfo({_id: 'foo:rab:1.3.2'}),
        withBuildInfo({_id: 'foo:bar:1.3.2-beta.1'}),
        withBuildInfo({_id: 'foo:bar:1.3.3-beta.1'}),
        withBuildInfo({_id: 'foo:bar:1.3.3-beta.2'}),
        withBuildInfo({_id: 'foo:bar:1.3.3-beta.3'}),
        withBuildInfo({_id: 'foo:bar:1.3.4-beta.1'}),
        withBuildInfo({_id: 'foo:bar:older-branch'}, olderBranchDate),
        withBuildInfo({_id: 'foo:bar:newer-branch'}, newerBranchDate),
        withBuildInfo({_id: 'bar:foo:not-a-foo-bar-branch'}),
        withBuildInfo({_id: 'medic:builds:1.0.0-rc.1'})
      ];

      before(() => resetDb()
        .then(() => BuildsDb.bulkDocs(testReleases))
        .then(results => {
          const badResults = results.filter(r => r.error);
          if (badResults.length) {
            throw Error(badResults);
          }
        }));

      it('Can be filtered to return only releases after a certain release', () =>
        BuildsDb.query('builds/releases', {
          startkey: ['release',  'foo', 'bar', 1, 3, 0 ],
          endkey: ['release', 'foo', 'bar', {}]
        }).then(results => {
          results.rows.length.should.equal(5);
          results.rows.map(row => row.key).should.deep.equal([
            ['release', 'foo', 'bar', 1, 3, 0 ],
            ['release', 'foo', 'bar', 1, 3, 1 ],
            ['release', 'foo', 'bar', 1, 3, 2 ],
            ['release', 'foo', 'bar', 1, 4, 0 ],
            ['release', 'foo', 'bar', 2, 1, 2 ],
          ]);
        }));

      it('Can be filtered to return only pre-releases after a certain release', () =>
        BuildsDb.query('builds/releases', {
          startkey: ['beta',  'foo', 'bar', 1, 3, 3, 1],
          endkey: ['beta', 'foo', 'bar', {}]
        }).then(results => {
          results.rows.length.should.equal(4);
          results.rows.map(row => row.key).should.deep.equal([
            ['beta', 'foo', 'bar', 1, 3, 3, 1],
            ['beta', 'foo', 'bar', 1, 3, 3, 2],
            ['beta', 'foo', 'bar', 1, 3, 3, 3],
            ['beta', 'foo', 'bar', 1, 3, 4, 1 ],
          ]);
        }));

      it('Support arbitrary pre-releases, not just beta', () =>
        BuildsDb.query('builds/releases', {
          startkey: ['rc', 'medic', 'builds'],
          endkey: ['rc', 'medic', 'builds', {}]
        }).then(results => {
          results.rows.length.should.equal(1);
          results.rows[0].key.should.deep.equal(
            ['rc', 'medic', 'builds', 1, 0, 0, 1]
          );
        }));

      it('Can be filtered to return branches and sorted most recent first', () =>
        BuildsDb.query('builds/releases', {
          startkey: ['branch',  'foo', 'bar', {}],
          endkey: ['branch', 'foo', 'bar'],
          descending: true
        }).then(results => {
          results.rows.length.should.equal(2);
          results.rows.map(row => row.key).should.deep.equal([
            ['branch', 'foo', 'bar', newerBranchDate.toJSON(), 'newer-branch'],
            ['branch', 'foo', 'bar', olderBranchDate.toJSON(), 'older-branch'],
          ]);
        }));

    });
  });

  describe('validate_doc_update', () => {
    before(resetDb);

    describe('Invalid users', () => {
      let invalidBuildsUser = {
        _id: 'org.couchdb.user:medic-builds-repo-invalid',
        type: 'user',
        name: 'medic-builds-repo-invalid',
        roles: [
        // 'builds-admin'
        ],
        password: uuid()
      };
      let invalidBuildsUrl = new URL(`${TEST_URL}/${TEST_DB}`);
      invalidBuildsUrl.username = invalidBuildsUser.name;
      invalidBuildsUrl.password = invalidBuildsUser.password;
      invalidBuildsUrl = invalidBuildsUrl.toString();
      before(() => UsersDb.put(invalidBuildsUser)
          .then(result => {
            invalidBuildsUser._rev = result.rev;
          }));
      after(() => UsersDb.remove(invalidBuildsUser));

      let InvalidBuildsDb = new PouchDB(invalidBuildsUrl);

      it('Users without the builds-admin role cannot write builds', () =>
        InvalidBuildsDb.put(withBuildInfo({_id: 'medic:medic:a-branch', value: 1})).should.eventually.be.rejected);
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
