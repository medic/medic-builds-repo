// Consider converting this into an integration test with CouchDB at
// some point. It's not critical: this is testing comparible logic,
// not performance, edge cases or specific features.

const should = require('chai').should(),
      PouchDB = require('pouchdb-core')
      .plugin(require('pouchdb-adapter-memory'))
      .plugin(require('pouchdb-mapreduce')),
      compile = require('couchdb-compile');

describe('releases view', () => {
  describe('Tagged releases', () => {
    const DB = new PouchDB('test', {adapter: 'memory'});
    const testReleases = [
      {_id: 'foo/bar@1.2.3', kanso: {build_time: new Date()}},
      {_id: 'foo/bar@1.2.4', kanso: {build_time: new Date()}},
      {_id: 'foo/bar@1.2.5', kanso: {build_time: new Date()}},
      {_id: 'foo/bar@1.3.0', kanso: {build_time: new Date()}},
      {_id: 'foo/bar@1.3.1', kanso: {build_time: new Date()}},
      {_id: 'foo/bar@1.3.2', kanso: {build_time: new Date()}},
      {_id: 'oof/bar@1.3.2', kanso: {build_time: new Date()}},
      {_id: 'foo/rab@1.3.2', kanso: {build_time: new Date()}},
    ];

    before(() =>
      new Promise((resolve, reject) =>
        compile('ddocs/builds', (err, ddoc) => {
          if (err) {
            reject(err);
          }
          resolve(ddoc);
      }))
      .then(ddoc => DB.bulkDocs(testReleases.concat(ddoc))));

    // FIXME: this won't work until we move to using CouchDB
    it.skip('Can be filtered to return only releases after a certain release', () =>
      DB.query('builds/releases', {
        startkey: [ 'foo', 'bar', 1, 3, 0 ]
      }).then(results => {
        results.rows.length.should.equal(3);
      }));
  });
});
