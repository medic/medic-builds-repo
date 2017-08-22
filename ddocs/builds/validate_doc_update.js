function(newDoc, oldDoc, userCtx, secObj) {
  var version = require('views/lib/version').fn(newDoc._id);

  if (!version) {
    throw({ forbidden: 'Document _id format invalid' });
  }

  if (version.branch) {
    // You can re-write over a branch as much as you like
    return;
  }

  if (oldDoc) {
    throw({ forbidden: 'You are not allowed to overwrite existing releases or pre-releases' });
  }
}
