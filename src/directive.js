"use strict";

var utils = require('./utils.js');

//为 Ant 构造函数添加指令 (directive). `Ant.directive`
function directive(key, opts) {
  var dirs = this.directives = this.directives || {};
  
  dirs[key] = utils.extend({
    priority: 0
  , type: key
  , terminal: false
  , replace: false
  , update: utils.noop
  , init: utils.noop
  }, opts);
}

exports.directive = directive;
