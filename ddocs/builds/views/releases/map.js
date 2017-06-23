function(doc) {
  var semver = doc._id.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (semver) {
    emit([semver[1], semver[2], semver[3]], {
      build_time: doc.kanso && doc.kanso.build_time
    });
  }
}
