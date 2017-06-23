function(doc) {
  var semver = doc._id.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!semver) {
    emit(doc._id, {
      build_time: doc.kanso && doc.kanso.build_time
    });
  }
}
