function(doc) {
  var semver = doc._id.match(/^(\d+)\.(\d+)\.(\d+)-beta\.{\d+}$/);
  if (semver) {
    emit([semver[1], semver[2], semver[3], semver[4]]);
  }
}
