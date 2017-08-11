function(doc) {
  var version = require('views/lib/version').fn(doc._id);
  if (version) {
    emit([
      version.namespace,
      version.application,
      version.major,
      version.minor,
      version.patch,
      version.pre,
      version.preNum,
      version.branch], { build_time: doc.kanso && doc.kanso.build_time });
  } else {
    log('The document ' + doc._id + ' cannot be matched against correctly');
  }
}
