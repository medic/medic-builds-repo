function(doc) {
  var semver = doc._id.match(/^(\d+)\.(\d+)\.(\d+)(-beta\.{\d+})?$/);
  if (doc._id.indexOf('_design/') === 0 || !semver) {
    emit(doc._id, {
      build_time: doc.kanso && doc.kanso.build_time
    });
  }
}
