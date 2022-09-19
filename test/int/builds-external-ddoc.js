const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const expect = chai.expect;
const { promisify } = require('util');

const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const compile = async () => promisify(require('couchdb-compile'))('./ddocs/builds_external');

const { TEST_URL, TEST_DB } = process.env;

if (!TEST_URL || !TEST_DB) {
  expect.fail(null, null, 'You must provide a TEST_URL & TEST_DB env var. See README.md');
}

const adminBuildsUrl = `${TEST_URL}/${TEST_DB}`;

const getBuildsUrl = () => {
  const buildsUrl = new URL(adminBuildsUrl);
  buildsUrl.username = '';
  buildsUrl.password = '';
  return buildsUrl.toString();
};

const buildsUrl = getBuildsUrl();

const buildsDb = new PouchDB(buildsUrl);
let adminBuildsDb = new PouchDB(adminBuildsUrl);

const resetDb = async () => {
  await (new PouchDB(adminBuildsUrl)).destroy();

  adminBuildsDb = new PouchDB(adminBuildsUrl);
  const ddoc = await compile();
  await adminBuildsDb.put(ddoc);
};

const clearDb = async () => {
  const allDocs = await adminBuildsDb.allDocs();
  const docsToDelete = allDocs.rows
    .filter(row => !row.id.startsWith('_design'))
    .map(row => ({ _id: row.id, _rev: row.value.rev, _deleted: true }));
  await adminBuildsDb.bulkDocs(docsToDelete);
};

const withBuildInfo = (doc, specificTime, schemaVersion=1) => {
  const [ns, app, version] = doc._id.split(':');

  doc.build_info = {
    namespace: ns,
    application: app,
    schema_version: schemaVersion,
    version: version,
    time: specificTime || new Date(),
    author: 'int. test',
  };

  if (schemaVersion === 1) {
    doc.build_info.node_modules = [];
  }

  return doc;
};

describe('"Builds External" Design document', () => {
  describe('validate_doc_update for anonymous users', () => {
    before(resetDb);
    afterEach(clearDb);

    it('we should be using an anonymous user', async () => {
      const serverUrl = new URL(buildsDb.name);
      serverUrl.pathname = '';
      const session = await (await PouchDB.fetch(`${serverUrl}/_session`)).json();
      expect(session.userCtx).to.deep.equal({ name: null, roles: [] });
    });

    it('should allow to push builds', async () => {
      await buildsDb.put(withBuildInfo({_id: 'medic:medic:a-branch', value: 1}));
    });

    it('should allow v1 build_info schema', async () => {
      await buildsDb.put(withBuildInfo({ _id: 'medic:medic:v1-branch' }, 0, 1));
    });

    it('should allow v2 build_info schema', async () => {
      await buildsDb.put(withBuildInfo({ _id: 'medic:medic:v2-branch' }, 0, 2));
    });

    it('should allow pushing the same build multiple times', async () => {
      const buildId = 'medic:medic:a-branch';
      const res = await buildsDb.put(withBuildInfo({ _id: buildId, value: 1 }));
      await buildsDb.put(withBuildInfo({ _id: buildId, value: 2, _rev: res.rev }));
      const doc = await buildsDb.get(buildId);
      expect(doc.value).to.equal(2);
    });

    it('should allow pushing the same "release" multiple times', async () => {
      const buildId = 'medic:medic:2.0.0';
      const { rev } = await buildsDb.put(withBuildInfo({ _id: buildId, value: 1 }));
      await buildsDb.put(withBuildInfo({ _id: buildId, value: 2, _rev: rev }));
      const doc = await buildsDb.get(buildId);
      expect(doc.value).to.equal(2);
    });

    it('should allow pushing the same "pre-release" multiple times', async () => {
      const buildId = 'medic:medic:2.0.0-beta.1';
      const { rev } = await buildsDb.put(withBuildInfo({ _id: buildId, value: 1 }));
      await buildsDb.put(withBuildInfo({ _id: buildId, value: 2, _rev: rev }));
      const doc = await buildsDb.get(buildId);
      expect(doc.value).to.equal(2);
    });

    it('should allow deleting branches', async () => {
      const buildId = 'medic:medic:a-branch';
      const { rev } = await buildsDb.put(withBuildInfo({ _id: buildId, value: 1 }));
      await buildsDb.remove({ _id: buildId, _rev: rev });
    });

    it('should allow deleting releases', async () => {
      const buildId = 'medic:medic:2.0.0';
      const { rev } = await buildsDb.put(withBuildInfo({ _id: buildId, value: 1 }));
      await buildsDb.remove({ _id: buildId, _rev: rev });
    });

    it('should allow deleting pre-releases', async () => {
      const buildId = 'medic:medic:2.0.0-beta.1';
      const { rev } = await buildsDb.put(withBuildInfo({ _id: buildId, value: 1 }));
      await buildsDb.remove({ _id: buildId, _rev: rev });
    });

    it('should now allow creation of documents with invalid ids', async () => {
      const result = buildsDb.put(withBuildInfo({ _id: 'not-a-valid-version-identifier' }));
      await expect(result).to.be.rejectedWith('Document _id format invalid');
    });

    it('should require docs to have a build_info property', async () => {
      const result = buildsDb.put({ _id: 'medic:validate_doc_update:1.0.0' });
      await expect(result).to.be.rejectedWith('build_info property is required');
    });

    it('should require docs to have a valid build_info property', async () => {
      const doc = {
        _id: 'medic:validate_doc_update:3.0.0',
        build_info: { schema_version: 1, not: 'valid' }
      };
      await expect(buildsDb.put(doc)).to.be.rejectedWith('complete build_info property');
    });

    it('should require docs to have a valid build_info property for 4.x', async () => {
      const doc = {
        _id: 'medic:validate_doc_update:3.0.0',
        build_info: { schema_version: 2, not: 'valid' }
      };
      await expect(buildsDb.put(doc)).to.be.rejectedWith('complete build_info property');
    });

    it('should require docs to have a valid build_info.schema property', async () => {
      const doc = {
        _id: 'medic:validate_doc_update:3.0.0',
        build_info: { schema_version: 22, not: 'valid' }
      };
      await expect(buildsDb.put(doc)).to.be.rejectedWith('Incompatible schema_version');
    });
  });

  describe('releases view', () => {
    before(async () => {
      await resetDb();

      const testReleases = [
        withBuildInfo({_id: 'medic:medic:test-1'}, 1000),
        withBuildInfo({_id: 'medic:medic:test-2'}, 2000),
        withBuildInfo({_id: 'medic:medic:test-3'}, 3000),
        withBuildInfo({_id: 'medic:medic:test-older'}, 100),
        withBuildInfo({_id: 'medic:medic:test-newer'}, 10000),
        withBuildInfo({_id: 'bar:foo:not-a-medic-branch'}, 2000),
      ];
      await adminBuildsDb.bulkDocs(testReleases);
    });

    it('should filter newer builds', async () => {
      const results = await buildsDb.query('builds/releases', {
        startkey: ['branch', 'medic', 'medic', 5000],
        endkey: ['branch', 'medic', 'medic', {}],
      });

      const ids = results.rows.map(row => row.id);
      expect(ids).to.have.members(['medic:medic:test-newer']);
    });

    it('should filter older builds', async () => {
      const results = await buildsDb.query('builds/releases', {
        startkey: ['branch', 'medic', 'medic'],
        endkey: ['branch', 'medic', 'medic', 2000],
      });

      const ids = results.rows.map(row => row.id);
      expect(ids).to.have.members(['medic:medic:test-older', 'medic:medic:test-1']);
    });

    it('should filter between dates', async () => {
      const results = await buildsDb.query('builds/releases', {
        startkey: ['branch', 'medic', 'medic', 500],
        endkey: ['branch', 'medic', 'medic', 3000],
      });

      const ids = results.rows.map(row => row.id);
      expect(ids).to.have.members(['medic:medic:test-1', 'medic:medic:test-2']);
    });
  });
});
