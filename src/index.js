const path = require('path');

const PouchDB = require('pouchdb-core')
        .plugin(require('pouchdb-adapter-http'))
        .plugin(require('pouchdb-mapreduce')),
      compile = require('couchdb-compile');

const DDOC_PATH = path.join(__dirname, '..', 'ddocs', 'builds');

const db = (url, wipe) => {
  const DB = new PouchDB(url);

  if (wipe) {
    return DB.destroy()
      .then(() => new PouchDB(url));
  } else {
    return DB;
  }
};

const init = (url, { wipe } = {}) => {
  return db(url, wipe)
    .then(() => {
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
    });
};

module.exports = {
  init: init
};
