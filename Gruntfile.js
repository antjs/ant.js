var exec = require('child_process').exec
  ;

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      options: {
        separator: ';',
        banner: '',
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
          banner: '/*! <%= pkg.name %> - v<%= pkg.version %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
        },
        files: {
          'dist/ant.min.js': ['dist/ant.js']
        }
      }
    },
    mocha: {
      all: {
        src: ['test/*.html'],
        mocha: {
          ignoreLeaks: false
        },
        options: {
          run: true
        }
      }
    },
    watch: {
      test: {
        files: ['src/*.js'],
        tasks: ['browserify', 'test']
      }
    , build: {
        files: ['src/*.js'],
        tasks: ['browserify']
      }
    },
    browserify: {
      ant: {
        src: ['src/ant.js'],
        dest: 'dist/ant.js',
        options: {
          exclude: ['jsdom'],
          bundleOptions: {
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
  grunt.loadNpmTasks('grunt-mocha');
  grunt.loadNpmTasks('grunt-browserify');

  grunt.registerTask('site', '生成 HTML', function() {
    var done = this.async();
    require('./docs/build.js')(done)
  });
  
  grunt.registerTask('test', '全面测试 phantomJs / nodeJs', function() {
    console.log('phantom.js test start');
    grunt.task.run('mocha', 'testNode');
  });
  
  grunt.registerTask('testNode', 'test for nodeJs', function() {
    var done = this.async();
    var cp = exec('npm run-script mocha', function(err, stdout, stderr){
      done(err);
    });
    cp.stdout.pipe(process.stdout);
    //cp.stderr.pipe(process.stderr);
  });
  
  
  var version = grunt.config('pkg.version');
  
  
  // Default task(s).
  grunt.registerTask('default', ['browserify', 'test', 'concat', 'uglify', 'site']);

};