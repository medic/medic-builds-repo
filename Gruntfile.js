module.exports = function(grunt) {
  'use strict';

  require('load-grunt-tasks')(grunt);
  grunt.loadNpmTasks('grunt-mocha-test');

  grunt.initConfig({
    mochaTest: {
      test: {
        options: {
          reporter: 'spec',
        },
        src: ['test/unit/**/*.js']
      }
    },
    jshint: {
      options: {
        jshintrc: true
      },
      all: [
        'ddocs/**/*.js'
      ]
    },
    'couch-compile': {
      ddocs: {
        files: {
          'ddocs.json': [ 'ddocs/*' ]
        }
      }
    }
  });

  grunt.registerTask('default', 'Build the ddoc', [
    'ci',
  ]);

  grunt.registerTask('unit', 'Run unit tests', [
    'jshint',
    'mochaTest'
  ]);

  grunt.registerTask('ci', 'Test and build', [
    'jshint',
    'mochaTest',
    'couch-compile'
  ]);
};
