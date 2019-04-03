function(newDoc, oldDoc, userCtx) {
  var version = require('views/lib/version').fn(newDoc._id);

  if (!userCtx || userCtx.roles.indexOf('builds-admin') === -1) {
    throw({ forbidden: 'Invalid user' });
  }

  if (!version) {
    throw({ forbidden: 'Document _id format invalid' });
  }

  var meta = newDoc.build_info;
  if (meta) {
    if (meta.schema_version !== 1) {
      throw({ forbidden: 'Incompatible schema_version'});
    }

    if (!(meta.application && meta.namespace && meta.version && meta.time && meta.author && meta.node_modules) ) {
      throw({ forbidden: 'You must have a complete build_info property' });
    }
  } else if (!newDoc.kanso) {
    throw({ forbidden: 'neither legacy kanso property nor build_info property exist'});
  }

  if (version.branch) {
    // You can re-write over a branch as much as you like
    return;
  }

  if (oldDoc) {
    throw({ forbidden: 'You are not allowed to overwrite existing releases or pre-releases' });
  }
}
