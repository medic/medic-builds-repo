// TODO: re-write this to use the loading style which allows us to easily test
//       views locally
function(doc) {
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
   *   ([^:]+):([^:]+):
   * The first two capture groups are for the db name and ddoc name, getting
   * the arbitrary two values separated by a :. This consumes `foo:bar:`.
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
   * Optionally, also consume dash, a label and a number. Can consume -beta.4
   *   |(.+)
   * As noted above, if the following doesn't match presume it's a branch and
   * just capture the entire text after the db and ddoc as a label.
   */
  var matchVersion = /^([^:]+):([^:]+):(?:(?:(\d+)\.(\d+)\.(\d+)(?:-(.+)\.(\d+))?)|(.+))$/;

  var semver = doc._id.match(matchVersion);
  if (semver) {
    var application = semver[1],
        ddocName = semver[2],
        major = parseInt(semver[3]) || undefined,
        minor = parseInt(semver[4]) || undefined,
        patch = parseInt(semver[5]) || undefined,
        ext = semver[6] || undefined,
        extNum = parseInt(semver[7]) || undefined,
        branch = parseInt(semver[8]) || undefined;

    emit([application, ddocName, major, minor, patch, ext, extNum, branch], {
      build_time: doc.kanso && doc.kanso.build_time
    });
  } else {
    // TODO: log this out using couchdb's logging mechanism
  }
}
