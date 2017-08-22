const DB = require('pouchdb-core')
      .plugin(require('pouchdb-adapter-http'))(process.env.BUILDS_COUCH_URL);

const generatedDDocs = require('../ddocs.json');

if (!generatedDDocs) {
  throw Error('Ddocs have not been generated');
}

console.log('Getting existing ddocs (for _rev)');
const ids = generatedDDocs.docs.map(ddoc => ddoc._id);
DB.allDocs({keys: ids})
.then(oldDdocs => {
  console.log(JSON.stringify(oldDdocs));
  oldDdocs.rows.map(row => {
    const ddoc = generatedDDocs.docs.find(ddoc => ddoc.id === row._id);

    ddoc._rev = row.value.rev;
  });

  console.log('Pushing generated ddocs');
  return DB.bulkDocs(generatedDDocs)
  .then(results => {
    if (results.find(result => !result.ok)) {
      console.error('Problems pushing generated ddocs', results);
      process.exit(-1);
    }
    console.log('Complete');
  });
})
.catch(err => {
  console.error('Unknown problem', err);
  process.exit(-1);
});
