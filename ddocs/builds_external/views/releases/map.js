function(doc) {
  var version = require('views/lib/version').fn(doc._id);
  if (version) {
      var meta = doc.kanso ?
        { time: doc.kanso && doc.kanso.build_time } :
        doc.build_info;

    emit(['branch', version.namespace, version.application, meta.time, version.branch], meta);
  } else {
    log('The document ' + doc._id + ' cannot be matched against correctly');
  }
}
