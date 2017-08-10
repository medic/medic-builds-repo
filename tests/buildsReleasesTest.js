// TODO: rework this to be module based
// TODO: rework this to be a real test

const fs = require('fs');

const releasesFn = fs.readFileSync('../ddocs/builds/views/releases/map.js', 'utf8');

const releasesView = (doc, emit) => {
  return eval(`(${releasesFn})(doc)`);
};

const assert = (expected, actual, predicate) => {
  if (!predicate(expected, actual)) {
    throw Error(`Failed predicate of ${JSON.stringify(expected)} vs ${JSON.stringify(actual)}`);
  }
};

const testCases = [
  ['foo:bar:1.2.3',        ['foo', 'bar', 1, 2, 3, undefined, undefined, undefined], 'first'],
  ['foo:bar:1.2.3-beta.4', ['foo', 'bar', 1, 2, 3, 'beta',    4,         undefined], 'second']
];

testCases.forEach(([given, expected, message]) => {
  releasesView({_id: given}, actual => {
    //FIXME: introduce stuff that gives us deep-equal etc so we can actually test this properly
    assert(expected, actual, (a,b) => a === b);
  });
});
