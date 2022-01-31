const { expect } = require('chai');
const { promisify } = require('util');
const path = require('path');
const { fork } = require('child_process');

const { TEST_URL } = process.env;

const compile = async (path) => promisify(require('couchdb-compile'))(path);

const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));

let buildsDb;
let buildsTestingDb;
let buildExternalDb;
let buildsDdoc;
let buildsExternalDdoc;

const resetDbs = async () => {
  console.log(TEST_URL);
  buildsDb = new PouchDB(`${TEST_URL}/builds`);
  await buildsDb.destroy();
  buildsDb = new PouchDB(`${TEST_URL}/builds`);
  await buildsDb.info();

  buildsTestingDb = new PouchDB(`${TEST_URL}/builds_testing`);
  await buildsTestingDb.destroy();
  buildsTestingDb = new PouchDB(`${TEST_URL}/builds_testing`);
  await buildsTestingDb.info();

  buildExternalDb = new PouchDB(`${TEST_URL}/builds_external`);
  await buildExternalDb.destroy();
  buildExternalDb = new PouchDB(`${TEST_URL}/builds_external`);
  await buildExternalDb.info();
};

const runScript = () => new Promise((resolve, reject) => {
  const child = fork(path.join(__dirname, '..', '..', 'scripts', 'pushToServer.js'), { env: { BUILDS_COUCH_URL: TEST_URL } });
  child.on('close', (code) => code ? reject() : resolve());
});

const expectIdenticalDdocs = async (revIteration) => {
  const buildsUploadedDdoc = await buildsDb.get('_design/builds');
  expect(buildsUploadedDdoc._rev).to.match(new RegExp(`^${revIteration}-`));
  delete buildsUploadedDdoc._rev;
  expect(buildsUploadedDdoc).to.deep.equal(buildsDdoc);

  const buildsTestingUploadedDdoc = await buildsTestingDb.get('_design/builds');
  expect(buildsTestingUploadedDdoc._rev).to.match(new RegExp(`^${revIteration}-`));
  delete buildsTestingUploadedDdoc._rev;
  expect(buildsTestingUploadedDdoc).to.deep.equal(buildsDdoc);

  const buildsExternalUploadedDdoc = await buildExternalDb.get('_design/builds');
  expect(buildsExternalUploadedDdoc._rev).to.match(new RegExp(`^${revIteration}-`));
  delete buildsExternalUploadedDdoc._rev;
  expect(buildsExternalUploadedDdoc).to.deep.equal(buildsExternalDdoc);
};

describe('pushToServer', () => {
  before(async () => {
    await resetDbs();
    buildsDdoc = await compile(path.join(__dirname, '..', '..', 'ddocs', 'builds'));
    buildsExternalDdoc = await compile(path.join(__dirname, '..', '..', 'ddocs', 'builds_external'));
  });

  it('should upload ddocs to fresh databases', async () => {
    await runScript();
    await expectIdenticalDdocs(1);
  });

  it('should overwrite existent docs', async () => {
    await runScript();
    await expectIdenticalDdocs(2);
  });
});
