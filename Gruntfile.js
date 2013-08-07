module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      options: {
        separator: ';'
      },
      dist: {
        src: ['src/ant-es5-shim.js', 'src/ant.js', 'src/event.js', 'src/router.js'],
        dest: 'dist/ant.all.js'
      }
    },
    uglify: {
      all: {
        options: {
          banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd hh:MM") %> all */\n'
        },
        files: {
          'dist/ant.all.min.js': ['dist/ant.all.js']
        }
      },
      core: {
        options: {
          banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd hh:MM") %> */\n'
        },
        files: {
          'dist/ant.min.js': ['src/ant.js']
        }
      }
    },
    mocha: {
      all: {
        src: ['test/*.html'],
        options: {
          run: true
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-mocha');

  // Default task(s).
  grunt.registerTask('default', ['concat', 'uglify']);

};