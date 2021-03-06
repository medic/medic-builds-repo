exports.fn = function(docId) {
  /*
   * Now we have two problems!
   *
   * This should match and extract:
   *   foo:bar:1.2.3
   *   foo:bar:1.2.3-beta.4
   *   foo:bar:some-branch-name
   *
   * Let's walk through the regex:
   *   /^<snip>$/
   * Wrapped in ^$ so it's a strict match
   *   ([^\/]+)/([^@]+)@
   * The first two capture groups are for the namespace and application name,
   * separated by a /. This consumes `foo:bar:`.
   *   (?:
   * A non-capture group, just used for grouping, not outputting
   *   (?:(<snip>)|(.+))
   * EITHER the snipped version logic or just an arbitrary chunk of text, which
   * means we treat it as a branch name.
   *   (?:(\d+)\.(\d+)\.(\d+)(?:-(.+)\.(\d+))?)
   * Version logic. We can split this capture group into the main version, and
   * the optional modifier extension.
   *   (\d+)\.(\d+)\.(\d+)
   * Gets the major, minor and patch. Required. Consumes `1.2.3`.
   *   (?:-(.+)\.(\d+))?
   * Optionally, also consume the prerelease label and number. Can consume -beta.4
   *   |(.+)
   * As noted above, if the following doesn't match presume it's a branch and
   * just capture the entire text after the db and ddoc as a label.
   */
  var matchVersion = /^([^:]+):([^:]+):(?:(?:(\d+)\.(\d+)\.(\d+)(?:-(.+)\.(\d+))?)|(.+))$/;

  var semver = docId.match(matchVersion);

  if (semver) {
    return {
      namespace: semver[1],
      application: semver[2],
      major: parseInt(semver[3]),
      minor: parseInt(semver[4]),
      patch: parseInt(semver[5]),
      pre: semver[6],
      preNum: parseInt(semver[7]),
      branch: semver[8]
    };
  }
};
