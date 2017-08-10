require('chai').should();

const versions = require('../../../ddocs/builds/lib/version').fn;

const testCases = [
  ['foo:bar:1.2.3',        ['foo', 'bar', 1, 2, 3, undefined, undefined, undefined], 'first'],
  ['foo:bar:1.2.3-beta.4', ['foo', 'bar', 1, 2, 3, 'beta',    4,         undefined], 'second']
];

describe('Version extractor', () => {
  it('Extracts information from branch builds', () => {
    versions('foo:bar:some-awesome-branch').should.deep.equal({
      application: 'foo',
      ddocName: 'bar',
      branch: 'some-awesome-branch'
    });
  });
});
