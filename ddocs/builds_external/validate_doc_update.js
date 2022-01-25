function(newDoc) {
  var version = require('views/lib/version').fn(newDoc._id);

  if (!version) {
    throw({ forbidden: 'Document _id format invalid' });
  }

  if (newDoc._deleted) {
    // all deletions are allowed
    return;
  }

  var meta = newDoc.build_info;
  if (!meta) {
    throw({ forbidden: 'build_info property is required'});
  }

  if (meta.schema_version !== 1) {
    throw({ forbidden: 'Incompatible schema_version'});
  }

  if (!(meta.application && meta.namespace && meta.version && meta.time && meta.author && meta.node_modules) ) {
    throw({ forbidden: 'You must have a complete build_info property' });
  }
}
