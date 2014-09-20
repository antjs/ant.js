var exec = require('child_process').exec
  //, exorcist = require('exorcist')
  , path = require('path')
  ;

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      options: {
        //separator: ';',
        banner: grunt.file.read('src/intro.js', {encoding: 'utf8'})
      },
      all: {
        src: ['dist/ant.js', 'extensions/*.js'],
        dest: 'dist/ant.all.js'
      }
    },
    uglify: {
      all: {
        options: {
          banner: '/*! <%= pkg.name %> all - v<%= pkg.version %> <%= grunt.template.today("yyyy-mm-dd") %> all */\n'
        },
        files: {
          'dist/ant.all.min.js': ['dist/ant.all.js']
        }
      },
      core: {
        options: {
          sourceMap: true,
          banner: '/*! <%= pkg.name %> - v<%= pkg.version %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
        },
        files: {
          'dist/ant.min.js': ['dist/ant.js']
        }
      }
    },
    watch: {
      test: {
        files: ['src/*.js', 'src/*/*.js'],
        tasks: ['browserify', 'test']
      }
    // , build: {
        // files: ['src/*.js', 'src/*/*.js'],
        // tasks: ['browserify']
      // }
    },
    browserify: {
      ant: {
        src: ['src/ant.js'],
        dest: 'dist/ant.js',
        options: {
          exclude: ['jsdom'],
          //transform: [exorcist(path.join(__dirname, 'ant.js.map'))],
          bundleOptions: {
            debug: true,
            standalone: 'Ant'
          },
          postBundleCB: function(err, src, next) {
            next(err, src.replace(/%VERSION/g, version));
          }
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-browserify');

  grunt.registerTask('site', '生成 HTML', function() {
    var done = this.async();
    require('./docs/build.js')(done)
  });
  
  grunt.registerTask('testling', '全面测试 phantomJs / nodeJs', function() {
    console.log('phantom.js test start');
    grunt.task.run('test', 'test:node');
  });
  
  grunt.registerTask('test', 'test for nodeJs', function() {
    var done = this.async();
    var cp = exec('npm test', function(err, stdout, stderr){
      done(err);
    });
    cp.stdout.pipe(process.stdout);
    //cp.stderr.pipe(process.stderr);
  });
  
  
  var version = grunt.config('pkg.version');
  
  
  // Default task(s).
  grunt.registerTask('default', ['browserify', 'test', 'concat', 'uglify', 'site']);

};