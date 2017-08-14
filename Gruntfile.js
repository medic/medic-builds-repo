module.exports = function(grunt) {
  'use strict';

  require('load-grunt-tasks')(grunt);
  grunt.loadNpmTasks('grunt-mocha-test');

  grunt.initConfig({
    mochaTest: {
      test: {
        options: {
          reporter: 'spec'
        },
        src: ['test/unit/**/*.js']
      },
      int: {
        options: {
          reporter: 'spec'
        },
        src: ['test/int/**/*.js']
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

  grunt.registerTask('default', 'Run ci', [
    'ci',
  ]);

  grunt.registerTask('unit', 'Run unit tests', [
    'jshint',
    'mochaTest:test'
  ]);

  grunt.registerTask('test', 'Run all tests', [
    'jshint',
    'mochaTest:test',
    'mochaTest:int'
  ]);

  grunt.registerTask('build', 'Build the ddoc', [
    'couch-compile'
  ]);

  grunt.registerTask('ci', 'Test and build', [
    'jshint',
    'mochaTest:test',
    'mochaTest:int',
    'couch-compile'
  ]);
};
