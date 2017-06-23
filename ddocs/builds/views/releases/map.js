function(doc) {
  var semver = doc._id.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (semver) {
    emit([parseInt(semver[1]), parseInt(semver[2]), parseInt(semver[3])], {
      build_time: doc.kanso && doc.kanso.build_time
    });
  }
}
