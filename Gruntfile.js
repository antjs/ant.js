var build = require('./build.js')
  , exec = require('child_process').exec
  , spawn = require('child_process').spawn
  ;

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      options: {
        separator: ';'
      },
      all: {
        dist: {
          src: ['src/ant-es5-shim.js', 'src/ant.js', 'src/event.js', 'src/router.js'],
          dest: 'dist/ant.all.js'
        }
      },
      core: {
        files: {
          'dist/ant.js': ['src/ant-es5-shim.js', 'src/ant.js']
        }
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
          'dist/ant.min.js': ['dist/ant.js']
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

  grunt.registerTask('build', '生成 HTML', function() {
    exec('node build.js');
  });
  
  grunt.registerTask('test', '全面测试 phantomJs / nodeJs', function() {
    console.log('phantom.js test start');
    grunt.task.run('mocha', 'testNode');
  });
  
  grunt.registerTask('testNode', 'test for nodeJs', function() {
    var done = this.async();
    var cp = exec('npm run-script mocha', function(err, stdout, stderr){
      //grunt.log.writeln(stdout);
      if(stderr){
        grunt.log.error(stderr);
      }else{
        done();
      }
    });
    cp.stdout.pipe(process.stdout);
    //cp.stderr.pipe(process.stderr);
  });
  
  // Default task(s).
  grunt.registerTask('default', ['test', 'concat', 'uglify', 'build']);

};