const should = require('chai').should();

const versions = require('../../../ddocs/builds/views/lib/version').fn;

describe('Version extractor', () => {
  it('extracts all information from tag releases', () => {
    versions('foo/bar@1.2.3').should.deep.equal({
      namespace: 'foo',
      application: 'bar',
      major: 1,
      minor: 2,
      patch: 3,
      ext: undefined,
      extNum: undefined,
      branch: undefined,
    });
  });

  it('extracts all information from beta releases', () => {
    versions('foo/bar@1.2.3-beta.4').should.deep.equal({
      namespace: 'foo',
      application: 'bar',
      major: 1,
      minor: 2,
      patch: 3,
      ext: 'beta',
      extNum: 4,
      branch: undefined,
    });
  });

  it('can also deal with any other type of secondary releases', () => {
    versions('foo/bar@1.2.3-rc.4').should.deep.equal({
      namespace: 'foo',
      application: 'bar',
      major: 1,
      minor: 2,
      patch: 3,
      ext: 'rc',
      extNum: 4,
      branch: undefined,
    });
  });

  it('extracts all information from branches', () => {
    versions('foo/bar@some-branch').should.deep.equal({
      namespace: 'foo',
      application: 'bar',
      major: undefined,
      minor: undefined,
      patch: undefined,
      ext: undefined,
      extNum: undefined,
      branch: 'some-branch',
    });
  });

  it('returns undefined if it cannot match correctly', () => {
    should.not.exist(versions('look-at-me-i-forgot-my-namespace'));
  });
});
