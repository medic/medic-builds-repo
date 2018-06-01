const path = require('path');

const PouchDB = require('pouchdb-core')
        .plugin(require('pouchdb-adapter-http'))
        .plugin(require('pouchdb-mapreduce')),
      compile = require('couchdb-compile');

const DDOC_PATH = path.join(__dirname, '..', 'ddocs', 'builds');

const init = (url, { wipe } = {}) => {
  const DB = new PouchDB(url);

  return new Promise((resolve, reject) =>
    compile(DDOC_PATH, (err, ddoc) => {
      if (err) {
        reject(err);
      } else {
        resolve(ddoc);
      }
  }))
  .then(ddoc => {
    return DB.get(ddoc._id)
      .catch(err => {
        if (err.status !== 404) {
          throw err;
        }
      })
      .then((existing={}) => {
        ddoc._rev = existing._rev;
      })
      .then(() => DB.put(ddoc));
  });
};

module.exports = {
  init: init
};
