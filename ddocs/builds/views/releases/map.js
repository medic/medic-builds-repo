function(doc) {
  var version = require('views/lib/version').fn(doc._id);
  if (version) {
      var meta = doc.kanso ?
        { time: doc.kanso && doc.kanso.build_time } :
        doc.build_info;

      if (version.branch) {
        // Branch, medic:medic:my-cool-branch
        //
        emit(['branch', version.namespace, version.application, meta.time, version.branch], meta);
      } else if (version.pre) {
        // Pre-releoase, medic:medic:3.0.0-beta.1
        emit([version.pre, version.namespace, version.application,
              version.major, version.minor, version.patch, version.preNum], meta);
      } else {
        // Release, medic:medic:3.0.0
        emit(['release', version.namespace, version.application,
              version.major, version.minor, version.patch], meta);
      }
  } else {
    log('The document ' + doc._id + ' cannot be matched against correctly');
  }
}
