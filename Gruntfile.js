var build = require('./build.js')
  , exec = require('child_process').exec
  ;

module.exports = function(grunt) {
  
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json')
  });

  grunt.registerTask('build', 'Éú³É HTML', function() {
    exec('node build.js');
  });

  // Default task(s).
  grunt.registerTask('default', ['build']);

};