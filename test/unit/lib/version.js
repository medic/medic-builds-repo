const should = require('chai').should();

const versions = require('../../../ddocs/builds/views/lib/version').fn;
const versionsExternal = require('../../../ddocs/builds_external/views/lib/version').fn;

describe('Version extractor', () => {
  // NB: Empty strings being undefined and empty numbers being NaN is ugly
  //     here, but when run through CouchDB it all gets converted to null
  it('extracts all information from tag releases', () => {
    versions('foo:bar:1.2.3').should.deep.equal({
      namespace: 'foo',
      application: 'bar',
      major: 1,
      minor: 2,
      patch: 3,
      pre: undefined,
      preNum: NaN,
      branch: undefined,
    });
    versions('foo:bar:1.2.3').should.deep.equal(versionsExternal('foo:bar:1.2.3'));
  });

  it('extracts all information from beta releases', () => {
    versions('foo:bar:1.2.3-beta.4').should.deep.equal({
      namespace: 'foo',
      application: 'bar',
      major: 1,
      minor: 2,
      patch: 3,
      pre: 'beta',
      preNum: 4,
      branch: undefined,
    });
    versions('foo:bar:1.2.3-beta.4').should.deep.equal(versionsExternal('foo:bar:1.2.3-beta.4'));
  });

  it('can also deal with any other type of secondary releases', () => {
    versions('foo:bar:1.2.3-rc.4').should.deep.equal({
      namespace: 'foo',
      application: 'bar',
      major: 1,
      minor: 2,
      patch: 3,
      pre: 'rc',
      preNum: 4,
      branch: undefined,
    });
    versions('foo:bar:1.2.3-rc.4').should.deep.equal(versionsExternal('foo:bar:1.2.3-rc.4'));
  });

  it('extracts all information from branches', () => {
    versions('foo:bar:some-branch').should.deep.equal({
      namespace: 'foo',
      application: 'bar',
      major: NaN,
      minor: NaN,
      patch: NaN,
      pre: undefined,
      preNum: NaN,
      branch: 'some-branch',
    });
    versions('foo:bar:some-branch').should.deep.equal(versionsExternal('foo:bar:some-branch'));
  });

  it('Correctly converts major / minor / patch into numbers', () => {
    versions('foo:bar:1.0.0').should.deep.equal({
      namespace: 'foo',
      application: 'bar',
      major: 1,
      minor: 0,
      patch: 0,
      pre: undefined,
      preNum: NaN,
      branch: undefined,
    });
    versions('foo:bar:1.0.0').should.deep.equal(versionsExternal('foo:bar:1.0.0'));
  });

  it('returns undefined if it cannot match correctly', () => {
    should.not.exist(versions('look-at-me-i-forgot-my-namespace'));
    should.not.exist(versionsExternal('look-at-me-i-forgot-my-namespace'));
  });
});
