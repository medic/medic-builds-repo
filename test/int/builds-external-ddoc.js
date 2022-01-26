const { expect } = require('chai');
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
  await adminBuildsDb.destroy();
  adminBuildsDb = new PouchDB(adminBuildsUrl);
  await adminBuildsDb.info();
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

describe('"Builds External" Design document', () => {
  before(() => resetDb());
  afterEach(() => clearDb());

  describe('validate_doc_update for anonymous users', () => {
    it('should allow to push builds', async () => {
      await buildsDb.put(withBuildInfo({_id: 'medic:medic:a-branch', value: 1}));
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
      try {
        await buildsDb.put(withBuildInfo({ _id: 'not-a-valid-version-identifier' }));
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.message).to.equal('Document _id format invalid');
      }
    });

    it('should require docs to have a build_info property', async () => {
      try {
        await buildsDb.put({ _id: 'medic:validate_doc_update:1.0.0' });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.message).to.equal('build_info property is required');
      }
    });

    it('should require docs to have a valid build_info property', async () => {
      const doc = {
        _id: 'medic:validate_doc_update:3.0.0',
        build_info: { schema_version: 1, not: 'valid' }
      };
      try {
        await buildsDb.put(doc);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.message).to.match(/complete build_info property/);
      }
    });

    it('should require docs to have a valid build_info.schema property', async () => {
      const doc = {
        _id: 'medic:validate_doc_update:3.0.0',
        build_info: { schema_version: 22, not: 'valid' }
      };
      try {
        await buildsDb.put(doc);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.message).to.match(/Incompatible schema_version/);
      }
    });
  });

});
