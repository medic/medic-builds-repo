#!/usr/bin/env node

const BUILD_URL = process.env.BUILD_URL || process.argv[2];

if (!BUILD_URL) {
  console.error('You need to provide a BUILD_URL to write the builds repo to');
  console.error('Either as a BUILD_URL env var, or as an argument to this script');
  return;
}

console.log(`Pushing builds server to ${BUILD_URL}`);

require('../src')(BUILD_URL);
