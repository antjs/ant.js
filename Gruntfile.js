var exec = require('child_process').exec
  , requirejs = require('requirejs')
  ;

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    build: {
      core: {
        dest: 'dist/ant.js'
      }
    },
    concat: {
      options: {
        separator: ';'
      },
      all: {
        src: ['src/ant-es5-shim.js', 'dist/ant.js', 'src/event.js', 'src/router.js'],
        dest: 'dist/ant.all.js'
      }
    },
    uglify: {
      all: {
        options: {
          banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> all */\n'
        },
        files: {
          'dist/ant.all.min.js': ['dist/ant.all.js']
        }
      },
      core: {
        options: {
          banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
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
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-mocha');

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
  
  
  var name = 'ant'
    , config = {
        baseUrl: './src'
      , name: name
      , out: './dist/ant.js'
      , optimize: 'none'
      , useStrict: true
      , wrap: {
          startFile: './src/intro.js'
        , endFile: './src/outro.js'
        }
      , onBuildWrite: function(name, path, contents) {
          if(name !== 'ant'){
            contents = contents.replace( /\s*return\s+[^\}]+(\}\);[^\w\}]*)$/, "$1" )
          }
          contents = contents
            .replace(/(?:(?:var)?\s*[\w-]+\s*)?[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\);?\n?/g, '')
            .replace(/define\([^{]*?{/, "").replace(/\}\);[^}\w]*$/, '');
          return contents;
        }
      }
    ;
      
  grunt.registerTask('build', 'concatenate source', function(){
    var done = this.async()
      , version = grunt.config('pkg.version')
      ;
      
    requirejs.optimize(config, function(res) {
      grunt.verbose.writeln(res);
      grunt.log.ok("File '" + name + "' created.")
      done();
    }, function(err) {
      done(err);
    })
  });
  
  // Default task(s).
  grunt.registerTask('default', ['build', 'test', 'concat', 'uglify', 'site']);

};