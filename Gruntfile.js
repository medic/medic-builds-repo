module.exports = function(grunt) {
  'use strict';

  // require('time-grunt')(grunt);
  require('load-grunt-tasks')(grunt);

  // Project configuration
  grunt.initConfig({
    'couch-compile': {
      ddocs: {
        files: {
          'builds.json': [ 'builds' ]
        }
      }
    }
  });

  grunt.registerTask('build', 'Build the ddoc', [
    'couch-compile',
  ]);
};
