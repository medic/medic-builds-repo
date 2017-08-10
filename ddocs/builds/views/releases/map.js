function(doc) {
  var versions = require('lib/version').fn(doc._id);
  if (versions) {
    emit([application, ddocName, major, minor, patch, ext, extNum, branch], {
      build_time: doc.kanso && doc.kanso.build_time
    });
  } else {
    log('The document ' + doc._id + ' cannot be matched against correctly');
  }
}
