module.exports = function(grunt) {
  'use strict';

  // require('time-grunt')(grunt);
  require('load-grunt-tasks')(grunt);

  // Project configuration
  grunt.initConfig({
    'couch-compile': {
      ddocs: {
        files: {
          'ddocs.json': [ 'ddocs/*' ]
        }
      }
    }
  });

  grunt.registerTask('default', 'Build the ddoc', [
    'couch-compile',
  ]);
};
