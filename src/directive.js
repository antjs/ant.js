"use strict";

var utils = require('./utils.js')
  ;

//为 Ant 构造函数添加指令 (directive). `Ant.directive`
function directive(key, opts) {
  var dirs = this.directives = this.directives || {};
  
  return dirs[key] = new Directive(key, opts);
}

exports.directive = directive;

function Directive(key, opts) {
  utils.extend(this, {
    priority: 0
  , type: key
  , terminal: false
  , replace: false
  , update: utils.noop
  , init: utils.noop
  , tearDown: utils.noop
  }, opts);
}
