const should = require('chai').should(),
      PouchDB = require('pouchdb-core')
        .plugin(require('pouchdb-adapter-http'))
        .plugin(require('pouchdb-mapreduce')),
      compile = require('couchdb-compile'),
      TEST_URL = process.env.TEST_URL;

let DB = new PouchDB(TEST_URL);
const resetDb = () =>
    DB.destroy()
    .then(() => DB = new PouchDB(TEST_URL))
    .then(() =>
      new Promise((resolve, reject) =>
        compile('ddocs/builds', (err, ddoc) => {
          if (err) {
            reject(err);
          } else {
            resolve(ddoc);
          }
      })))
      .then(ddoc => DB.put(ddoc));

describe('releases view', () => {

  if (!TEST_URL) {
    should.fail(null, null, 'You must provide a TEST_URL env var. See README.md');
  }

  const newerBranchDate = new Date();
  const olderBranchDate = new Date();
  olderBranchDate.setMinutes(olderBranchDate.getMinutes() - 1);

  describe('Filtering', () => {
    const testReleases = [
      {_id: 'foo:bar:1.2.3', kanso: {build_time: new Date()}},
      {_id: 'foo:bar:1.2.4', kanso: {build_time: new Date()}},
      {_id: 'foo:bar:1.2.5', kanso: {build_time: new Date()}},
      {_id: 'foo:bar:1.3.0', kanso: {build_time: new Date()}},
      {_id: 'foo:bar:1.3.1', kanso: {build_time: new Date()}},
      {_id: 'foo:bar:1.3.2', kanso: {build_time: new Date()}},
      {_id: 'foo:bar:1.4.0', kanso: {build_time: new Date()}},
      {_id: 'foo:bar:2.1.2', kanso: {build_time: new Date()}},
      {_id: 'oof:bar:1.3.2', kanso: {build_time: new Date()}},
      {_id: 'foo:rab:1.3.2', kanso: {build_time: new Date()}},
      {_id: 'foo:bar:1.3.2-beta.1', kanso: {build_time: new Date()}},
      {_id: 'foo:bar:1.3.3-beta.1', kanso: {build_time: new Date()}},
      {_id: 'foo:bar:1.3.3-beta.2', kanso: {build_time: new Date()}},
      {_id: 'foo:bar:1.3.3-beta.3', kanso: {build_time: new Date()}},
      {_id: 'foo:bar:1.3.4-beta.1', kanso: {build_time: new Date()}},
      {_id: 'foo:bar:older-branch', kanso: {build_time: olderBranchDate}},
      {_id: 'foo:bar:newer-branch', kanso: {build_time: newerBranchDate}},
      {_id: 'bar:foo:not-a-foo-bar-branch', kanso: {build_time: new Date()}},
      {_id: 'medic:builds:1.0.0-rc.1', kanso: {build_time: new Date()}},
    ];

    before(() => resetDb().then(() => DB.bulkDocs(testReleases)));

    it('Can be filtered to return only releases after a certain release', () =>
      DB.query('builds/releases', {
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
      DB.query('builds/releases', {
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
      DB.query('builds/releases', {
        startkey: ['rc', 'medic', 'builds'],
        endkey: ['rc', 'medic', 'builds', {}]
      }).then(results => {
        results.rows.length.should.equal(1);
        results.rows[0].key.should.deep.equal(
          ['rc', 'medic', 'builds', 1, 0, 0, 1]
        );
      }));

    it('Can be filtered to return branches and sorted most recent first', () =>
      DB.query('builds/releases', {
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
