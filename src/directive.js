"use strict";

var utils = require('./utils.js')
  ;

/**
 * 为 Ant 构造函数添加指令 (directive). `Ant.directive`
 * @param {String} key 指令名称
 * @param {Object} opts 指令参数
 * 
 */
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
  }, opts);
}

Directive.prototype = {
  init: utils.noop
, update: utils.noop
, tearDown: utils.noop
};
