!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Ant=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
"use strict";

var doc = _dereq_('./document.js')
  , parse = _dereq_('./parse.js').parse
  , evaluate = _dereq_('./eval.js')
  , utils = _dereq_('./utils.js')
  , Event = _dereq_('./event.js')
  , Class = _dereq_('./class.js')
  , Dir = _dereq_('./directive.js')
  , dirs = _dereq_('./directives')
  , token = _dereq_('./token.js')
  ;


var isObject = utils.isObject
  , isUndefined = utils.isUndefined
  , isFunction = utils.isFunction
  , isArray = utils.isArray
  , isPlainObject = utils.isPlainObject
  , afterFn = utils.afterFn
  , parseKeyPath = utils.parseKeyPath
  , deepSet = utils.deepSet
  , deepGet = utils.deepGet
  , extend = utils.extend
  , ie = utils.ie
  , tplParse = utils.tplParse
  , create = utils.create
  ;


function setPrefix(newPrefix) {
  if(newPrefix){
    this.prefix = newPrefix;
  }
}


/**
 * # Ant
 * 基于 dom 的模板引擎. 支持数据绑定
 * @param {String | Element} [tpl] 模板应该是合法而且标准的 HTML 标签字符串或者直接是现有 DOM 树中的一个 element 对象.
 * @param {Object} [opts]
 * @param {String | Element} opts.tpl
 * @param {Object} opts.data 渲染模板的数据. 该项如果为空, 稍后可以用 `tpl.render(model)` 来渲染生成 html.
 * @param {Boolean} opts.lazy 是否对 'input' 及 'textarea' 监听 `change` 事件, 而不是 `input` 事件
 * @param {Object} opts.events 
 * @param {Object} opts.partials
 * @param {String | HTMLELement} opts.el
 * @constructor
 */
function Ant(tpl, opts) {
  if(isPlainObject(tpl)) {
    tpl = opts.tpl;
  }
  opts = opts || {};
  var el
    , defaults = this.defaults || {}
    ;

  opts = extend(true, {}, defaults, opts);

  var data = opts.data || {}
    , events = opts.events || {}
    , filters = opts.filters || {}
    ;
  
  el = tplParse(tpl, opts.el);
  tpl = el.tpl;
  el = el.el;
  
  //属性
  //----
  
  this.options = opts;
  /**
   * ### ant.tpl
   * 模板字符串
   * @type {String}
   */
  this.tpl = tpl;
  
  /**
   * ### ant.el
   * 模板 DOM 对象.
   * @type {HTMLElementObject}
   */
  this.el = el;
  
  /**
   * ### ant.data
   * 绑定模板的数据.
   * @type {Object} 数据对象, 不应该是数组.
   */
  this.data = {};
  /**
   * ### ant.isRendered
   * 该模板是否已经绑定数据
   * @type {Boolean} 在调用 `render` 方法后, 该属性将为 `true`
   */
  this.isRendered = false;
  
  this.partials = {};
  this.filters = {};
  
  for(var event in events) {
    this.on(event, events[event]);
  }

  for(var filterName in filters){
    this.setFilter(filterName, filters[filterName]);
  }
  
  buildViewModel.call(this);
  
  //这里需要合并可能存在的 this.data
  //表单控件可能会有默认值, `buildViewModel` 后会默认值会并入 `this.data` 中
  data = extend(this.data, data);
  
  if(opts.data){
    this.render(data);
  }
}

//静态方法及属性
//---
extend(Ant, Class, Dir, {
  setPrefix: setPrefix
, doc: doc
, directives: {}
, utils: utils
});

Ant.setPrefix('a-');

//内置 directive
for(var dir in dirs) {
  Ant.directive(dir, dirs[dir]);
}
  
//实例方法
//----
extend(Ant.prototype, Event, {
  /**
   * ### ant.render
   * 渲染模板
   */
  render: function(data) {
    data = data || this.data;
    this.set(data, {isExtend: false});
    this.isRendered = true;
    this.trigger('render');
    return this;
  }
  /**
   * ### ant.clone
   * 复制模板
   * @param {Object} [opts]
   * @return {TemplateObject} 一个新 `Ant` 实例
   */
, clone: function(opts) {
    var options = extend(true, {}, this.options);
    if(opts && opts.data){ options.data = null; }
    return new this.constructor(this.tpl, extend(true, options, opts));
  }
  
, get: function(key) {
    return deepGet(key, this.data);
  }
  
  /**
   * ### ant.set
   * 更新 `ant.data` 中的数据
   * @param {String} [key] 数据路径. 
   * @param {AnyType|Object} val 数据内容. 如果数据路径被省略, 第一个参数是一个对象. 那么 val 将替换 ant.data 或者并入其中
   * @param {Object} [opt] 参数项
   * @param {Boolean} opt.silence 是否静静的更新数据而不触发 `update` 事件及更新 DOM.
   * @param {Boolean} opt.isExtend 数据设置类型. 是否将数据并入原数据. 
            第一个参数是数据路径是该值默认为 false, 而第一个数据是数据对象的时候则默认为 true
   */
, set: function(key, val, opt) {
    var changed, isExtend, parent, keys, path;
    
    if(isUndefined(key)){ return this; }
    
    if(isObject(key)){
      changed = true;
      opt = val;
      opt = opt || {};
      if(opt.isExtend !== false){
        isExtend = true;
        //modelExtend(this.data, key, this._vm);
        extend(true, this.data, key);
      }else{
        isExtend = false;
        //this.data = modelExtend({}, key, this._vm);
        this.data = extend(true, {}, key);
      }
    }else{
      opt = opt || {};
      
      if(deepGet(key, this.data) !== val) {
        changed = true;
      }
      if(changed){
        if(opt.isExtend !== true){
          keys = parseKeyPath(key);
          if(keys.length > 1){
            path = keys.pop();
            parent = deepGet(keys.join('.'), this.data);
            if(isUndefined(parent)){
              deepSet(keys.join('.'), parent = {}, this.data);
            }else if(!isObject(parent)){
              var oldParent = parent;
              deepSet(keys.join('.'), parent = {toString: function() { return oldParent; }}, this.data);
            }
          }else{
            if(key){
              parent = this.data;
              path = key;
            }else{
              parent = this;
              path = 'data';
            }
          }
          parent[path] = isObject(val) ? extend(true, isArray(val) ? [] : {}, val) : val;
          //parent[path] = val;
          isExtend = false;
        }else{
          //modelExtend(this.data, deepSet(key, val, {}), this._vm);
          extend(true, this.data, deepSet(key, val, {}));
          isExtend = true;
        }
      }
    }
    changed && (!opt.silence) && (isObject(key) ? update.call(this, key, isExtend, opt.isBubble) : update.call(this, key, val, isExtend, opt.isBubble));
    return this;
  }
  /**
   * ### ant.setPartial
   * 添加子模板
   * @param {Object} info 子模板信息
   * @param {String|HTMLElement} info.content 子模板内容
   * @param {String} [info.name] 子模板标示符
   * @param {HTMLElement|function} [info.target] 子模板的目标节点
   * @param {Boolean} [info.escape] 是否转义字符串子模板
   * @param {String} [info.path] 指定子模板中变量在数据中的作用域
   */
, setPartial: function(partialInfo) {
    if(!partialInfo){ return; }
    
    partialInfo = extend({}, this.partials[partialInfo.name], partialInfo);
    
    var els, _els, vm
      , name = partialInfo.name
      , target = partialInfo.target
      , partial = partialInfo.content
      , path = partialInfo.path || ''
      ;
    if(name){
      this.partials[name] = partialInfo;
    }
    if(partial) {
      vm = this._vm.$getVM(path);
      
      if(typeof partial === 'string'){
        if(partialInfo.escape){
          els = [doc.createTextNode(partial)];
        }else{
          _els = tplParse(partial, 'div').el.childNodes;
          els = [];
          for(var i = 0, l = _els.length; i < l; i++){
            els.push(_els[i]);
          }
        }
      }else{
        els = [(partial instanceof Ant) ? partial.el : partial];
      }
      
      if(target){
        for(var i = 0, l = els.length; i < l; i++){
          isFunction(target) ? 
            target.call(this, els[i]) :
            target.appendChild(els[i]);
        }
      }
      
      vm.$build(els, partialInfo.context && partialInfo.context.assignment)
    }
    return this;
  }

, watch: function(keyPath, callback) {
    if(keyPath && callback){
      addWatcher(this._vm, {path: keyPath, update: callback});
    }
    return this;
  }
, unwatch: function(keyPath, callback) {
    var vm = this._vm.$getVM(keyPath, {strict: true});
    if(vm){
      for(var i = vm.$watchers.length - 1; i >= 0; i--){
        if(vm.$watchers[i].callback === callback){
          vm.$watchers.splice(i, 1);
        }
      }
    }
    return this;
  }
  
  
, setFilter: function(name, filter) {
    this.filters[name] = filter.bind(this);
  }
, getFilter: function(name) {
    return this.filters[name]
  }
, removeFilter: function(name) {
    delete this.filters[name];
  }
});

/**
 * 更新模板. 
 * @param {Object} data 要更新的数据. 增量数据或全新的数据.
 * @param {String} [keyPath] 需要更新的数据路径.
 * @param {AnyType|Object} [data] 需要更新的数据. 省略的话将使用现有的数据.
 * @param {Boolean} [isExtend] 界面更新类型.
          为 true 时, 是扩展式更新, 原有的数据不变
          为 false 时, 为替换更新, 不在 data 中的变量, 将在 DOM 中被清空.
 */
function update (keyPath, data, isExtend, isBubble) {
  var attrs, vm = this._vm;
  if(isObject(keyPath)){
    isBubble = isExtend;
    isExtend = data;
    attrs = data = keyPath;
  }else if(typeof keyPath === 'string'){
    keyPath = parseKeyPath(keyPath).join('.');
    if(isUndefined(data)){
      data = this.get(keyPath);
    }
    attrs = deepSet(keyPath, data, {});
    vm = vm.$getVM(keyPath);
  }else{
    data = this.data;
  }
  
  if(isUndefined(isExtend)){ isExtend = isObject(keyPath); }
  vm.$update(data, isExtend, isBubble !== false);
  return this;
}

function buildViewModel() {
  var vm = new ViewModel({
    $ant: this
  });
  
  this._vm = vm;
  vm.$build(this.el);
}

var NODETYPE = {
  ATTR: 2
, TEXT: 3
, COMMENT: 8
};

//遍历元素及其子元素的所有属性节点及文本节点
function travelEl(el, vm, assignment) {
  assignment = create(assignment || {});
  
  if(el.length && isUndefined(el.nodeType)){
    //node list
    for(var i = 0, l = el.length; i < l; i++) {
      travelEl(el[i], vm, assignment);
    }
    return;
  }
  
  if(el.nodeType === NODETYPE.COMMENT){
    //注释节点
    return;
  }else if(el.nodeType === NODETYPE.TEXT){
    //文本节点
    checkText(el, vm, assignment);
    return;
  }
  
  //遇到 terminal 为 true 的 directive 属性不再遍历
  if(checkAttr(el, vm, assignment)){
    return;
  }
  
  for(var child = el.firstChild, next; child; ){
    next = child.nextSibling;
    travelEl(child, vm, assignment);
    child = next;
  }
}

//遍历属性
function checkAttr(el, vm, assignment) {
  var prefix = Ant.prefix
    , dirs = getDir(el, Ant.directives, prefix)
    , dir
    , terminalPriority, terminal
    ;
  
  for (var i = 0, l = dirs.length; i < l; i++) {
    dir = dirs[i];
    dir.assignment = assignment;
   
    //对于 terminal 为 true 的 directive, 在解析完其相同权重的 directive 后中断遍历该元素
    if(terminalPriority > dir.priority) {
      break;
    }
    
    setBinding(vm, dir);
   
    el.removeAttribute(dir.node.nodeName);
    
    if(dir.terminal) {
      terminal = true;
      terminalPriority = dir.priority;
    }
  }
  
  if(terminal) {
    return true;
  }
}

var partialReg = /^>\s*(?=.+)/;
//处理文本节点中的绑定占位符({{...}})
function checkText(node, vm, assignment) {
  if(token.hasToken(node.nodeValue)) {
    var tokens = token.parseToken(node.nodeValue)
      , textMap = tokens.textMap
      , el = node.parentNode
      
      , t, dir
      ;
    
    //将{{key}}分割成单独的文本节点
    if(textMap.length > 1) {
      textMap.forEach(function(text) {
        var tn = doc.createTextNode(text);
        el.insertBefore(tn, node);
        checkText(tn, vm, assignment);
      });
      el.removeChild(node);
    }else{
      t = tokens[0];
      //内置各占位符处理. 
      //定义新的参数, 将其放到 directive 中处理?
      if(partialReg.test(t.path)) {
        t.path = t.path.replace(partialReg, '');
        dir = create(Ant.directives.partial);
      }else{
        dir = create(t.escape ? Ant.directives.text : Ant.directives.html);
      }
      setBinding(vm, extend(dir, t, {
        el: node
      , assignment: assignment
      }));
    }
  }
}

//获取一个元素上所有用 HTML 属性定义的指令
function getDir(el, directives, prefix) {
  prefix = prefix || '';
  directives = directives || {};
  
  var attr, attrName, dirName
    , dirs = [], dir, anchors = {}
    , parent = el.parentNode
    ;
    
  for(var i = el.attributes.length - 1; i >= 0; i--){
    attr = el.attributes[i];
    attrName = attr.nodeName;
    dirName = attrName.slice(prefix.length);
    if(attrName.indexOf(prefix) === 0 && (dirName in directives)) {
      dir = create(directives[dirName]);
      dir.dirName = dirName
    }else if(token.hasToken(attr.value)) {
      dir = create(directives['attr']);
      dir.dirs = token.parseToken(attr.value);
      dir.dirName = attrName.indexOf(prefix) === 0 ? dirName : attrName ;
    }else{
      dir = false;
    }
    
    if(dir) {
      if(dir.anchor && !anchors.start) {
        //同一个元素上的 directive 共享同一对锚点
        anchors.start = doc.createTextNode('');
        parent.insertBefore(anchors.start, el);
        
        anchors.end = doc.createTextNode('');
        if(el.nextSibling) {
          parent.insertBefore(anchors.end, el.nextSibling);
        }else{
          parent.appendChild(anchors.end);
        }
      }
      dirs.push(extend(dir, {el: el, node: attr, nodeName: attrName, path: attr.value, anchors: dir.anchor ? anchors : null}));
    }
  }
  dirs.sort(function(d0, d1) {
    return d1.priority - d0.priority;
  });
  return dirs;
}

function setBinding(vm, dir) {
  if(dir.replace) {
    var el = dir.el;
    if(isFunction(dir.replace)) {
      dir.node = dir.replace();
    }else if(dir.replace){
      //dir.node = doc.createComment(dir.type + ' = ' + dir.path);
      dir.node = doc.createTextNode('');
    }
    
    dir.el = dir.el.parentNode;
    dir.el.replaceChild(dir.node, el);
  }
  
  dir.link(vm);
  
  if(dir.dirs) {
    dir.dirs.forEach(function(d) {
      addWatcher(vm, extend(create(dir), d));
    });
  }else{
    addWatcher(vm, dir);
  }
}

function addWatcher(vm, dir) {
  if(dir.path) {
    return new Watcher(vm, dir);
  }
}

var exParse = function(path) {
  var that = this;
  var ast = parse(path, this.token.type);
  var summary = evaluate.summary(ast);
    
  extend(this.token, summary);
  extend(this, summary);
  this._ast = ast;
};

function Watcher(relativeVm, token) {
  this.token = token;
  this.relativeVm = relativeVm;
  this.ant = relativeVm.$root.$ant;
  
  this.val = NaN;
  
  exParse.call(this, token.path);
  
  for(var i = 0, l = this.paths.length; i < l; i++){
    relativeVm.$getVM(this.paths[i], {assignment: token.assignment}).$watchers.push(this);
  }
  
  var run;
  for(var i = 0, l = this.locals.length; i < l; i++) {
    run = run || (this.locals[i] in token.assignment) && token.assignment[this.locals[i]] !== relativeVm;
  }
  
  this.state = Watcher.STATE_READY
  
  //立即计算的情况:
  //1. 渲染过后新加入的模板
  //2. 没有变量的表达式
  //3. 子作用域引用父级作用域
  if(this.ant.isRendered || !this.locals.length || run) {
    this.fn();
  }
}

extend(Watcher, {
  STATE_READY: 0
, STATE_CALLED: 1
}, Class);

extend(Watcher.prototype, {
  fn: function(vals) {
    var key
      , dir = this.token
      , newVal
      ;
      
    vals = vals || {}
    
    for(var i = 0, l = this.locals.length; i < l; i++){
      key = this.locals[i];
      vals[key] = this.relativeVm.$getVM(key, {assignment: dir.assignment}).$getData();
    }
    
    newVal = this.getValue(vals);
      
    if(newVal !== this.val){
      try{
        this.token.update(newVal, this.val);
        this.val = newVal;
      }catch(e){
        console.error(e);
      }
    }
    this.state = Watcher.STATE_CALLED;
  }
, getValue: function(vals) {
    var filters = this.filters
      , val
      , ant = this.ant
      ;
    
    // for(var i = 0, l = filters.length; i < l; i++){
      // if(!ant.filters[filters[i]]){
        // console.error('Filter: ' + filters[i] + ' not found!');
      // }
    // }
    
    try{
      val = evaluate.eval(this._ast, {locals: vals, filters: ant.filters});
    }catch(e){
      val = '';
    }
    return val;
  }
});

function ViewModel(opts) {
  extend(this, {
    $key: ''
  , $root: this
  , $watchers: []
  }, opts);
}

ViewModel.prototype = {
  $root: null
, $parent: null

, $ant: null
, $key: null

, $watchers: null

, $index: null
, $value: NaN
  
//获取 vm 不存在的话将新建一个.
//opts.strict  不自动新建 vm
//opts.scope
, $getVM: function(path, opts) {
    path = path + '';
    opts = opts || {};
    
    var key
      , cur = opts.scope || this.$root
      , assignment = opts.assignment || {}
      , keyChain = utils.parseKeyPath(path)
      ;
      
    if(keyChain[0] in assignment) {
      cur = assignment[keyChain[0]];
      keyChain.shift();
    }
    if(path){
      for(var i = 0, l = keyChain.length; i < l; i++){
        key = keyChain[i];
        
        if(!cur[key]){
          if(opts.strict){ return null; }
          cur[key] = new ViewModel({
            $parent: cur
          , $root: cur.$root
          , $key: key
          });
        }
        
        cur = cur[key];
      }
    }
    return cur;
  }
  
, $getKeyPath: function() {
    var keyPath = this.$key
      , cur = this
      ;
    while(cur = cur.$parent){
      if(cur.$key){
        keyPath = cur.$key + '.' + keyPath;
      }else{
        break;
      }
    }
    return keyPath;
  }

, $getData: function(key) {
    var curVal = deepGet(key, this.$root.$ant.get(this.$getKeyPath()));
    return curVal;
  }


, $update: function (data, isExtend, isBubble) {
    var map = isExtend ? data : this
      , parent = this
      ;
    
    for(var i = 0, l = this.$watchers.length; i < l; i++){
      if((this.$value !== data) || this.$watchers[i].state === Watcher.STATE_READY){
        this.$watchers[i].fn();
      }
    }
    this.$value = data;
    
    if(isObject(map)){
      for(var path in map) {
        //传入的数据键值不能和 vm 中的自带属性名相同.
        //所以不推荐使用 '$' 作为 JSON 数据键值的开头.
        if(this.hasOwnProperty(path) && (!(path in ViewModel.prototype))){
          this[path].$update(data ? data[path] : void(0), isExtend);
        }
      }
    }

    if(isBubble){
      while(parent = parent.$parent){
        for(var i = 0, l = parent.$watchers.length; i < l; i++){
          parent.$watchers[i].fn();
        }
      }
    }
  }
, $build: function(el, assignment) {
    travelEl(el, this, assignment);
  }
};

Ant._parse = parse;
Ant._eval = evaluate.eval;
Ant._summary = evaluate.summary;
Ant.version = '0.3.0-alpha';

module.exports = Ant;

window.Ant = Ant;
},{"./class.js":2,"./directive.js":3,"./directives":5,"./document.js":8,"./eval.js":9,"./event.js":10,"./parse.js":11,"./token.js":12,"./utils.js":13}],2:[function(_dereq_,module,exports){
var extend = _dereq_('./utils.js').extend;

var Class = {
  /** 
   * 构造函数继承. 
   * 如: `var Car = Ant.extend({drive: function(){}}); new Car();`
   * @param {Object} [protoProps] 子构造函数的扩展原型对象
   * @param {Object} [staticProps] 子构造函数的扩展静态属性
   * @return {Function} 子构造函数
   */
  extend: function (protoProps, staticProps) {
    protoProps = protoProps || {};
    var constructor = protoProps.hasOwnProperty('constructor') ? protoProps.constructor : function(){ return sup.apply(this, arguments); }
    var sup = this;
    var Fn = function() { this.constructor = constructor; };
    
    Fn.prototype = sup.prototype;
    constructor.prototype = new Fn();
    extend(constructor.prototype, protoProps);
    extend(constructor, sup, staticProps, {__super__: sup.prototype});
    
    return constructor;
  }
};

module.exports = Class;
},{"./utils.js":13}],3:[function(_dereq_,module,exports){
"use strict";

var utils = _dereq_('./utils.js')
  ;

/**
 * 为 Ant 构造函数添加指令 (directive). `Ant.directive`
 * @param {String} key directive 名称
 * @param {Object} [opts] directive 参数
 * @param {Number} opts.priority=0 directive 优先级. 同一个元素上的指令按照优先级顺序执行. 
 * @param {Boolean} opts.terminal=false 执行该 directive 后, 是否终止后续 directive 执行.
 *   terminal 为真时, 与该 directive 优先级相同的 directive 仍会继续执行, 较低优先级的才会被忽略.
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
  link: utils.noop
, update: utils.noop
, tearDown: utils.noop
};

},{"./utils.js":13}],4:[function(_dereq_,module,exports){
"use strict";

var attrPostReg = /\?$/;

module.exports = {
  link: function() {
    if(this.dirName === this.type) {//attr binding
      this.attrs = {};
    }else {
      if(attrPostReg.test(this.dirName)) {// someAttr? condition binding
        this.dirName = this.dirName.replace(attrPostReg, '');
        this.conditionalAttr = true;
      }
    }
  }
, update: function(val) {
    var el = this.el;
    if(this.dirName === this.type) {
      for(var attr in val) {
        setAttr(el, attr, val[attr]);
        //if(val[attr]) {
          delete this.attrs[attr];
        //}
      }
      
      for(var attr in this.attrs) {
        el.removeAttribute(attr);
      }
      this.attrs = val;
    }else{
      if(this.conditionalAttr) {
        val ? setAttr(el, this.dirName, val) : el.removeAttribute(this.dirName);
      }else{
        this.textMap[this.position] = val && (val + '');
        setAttr(el, this.dirName, this.textMap.join(''));
      }
    }
  }
};


//IE 浏览器很多属性通过 `setAttribute` 设置后无效. 
//这些通过 `el[attr] = value` 设置的属性却能够通过 `removeAttribute` 清除.
function setAttr(el, attr, val){
  try{
    if(((attr in el) || attr === 'class')){
      if(attr === 'style' && el.style.setAttribute){
        el.style.setAttribute('cssText', val);
      }else if(attr === 'class'){
        el.className = val;
      }else{
        el[attr] = typeof el[attr] === 'boolean' ? true : val;
      }
    }
  }catch(e){}
  try{
    //chrome setattribute with `{{}}` will throw an error
    el.setAttribute(attr, val);
  }catch(e){ console.warn(e) }
}
},{}],5:[function(_dereq_,module,exports){
"use strict";

var doc = _dereq_('../document.js')
  , utils = _dereq_('../utils.js')
  ;

var dirs = {};


dirs.text = {
  terminal: true
, replace: function() { return doc.createTextNode('') }
, update: function(val) {
    this.node.nodeValue = utils.isUndefined(val) ? '' : val;
  }
};


dirs.html = {
  terminal: true
, replace: true
, link: function() {
    this.nodes = [];
  }
, update: function(val) {
    var el = document.createElement('div');
    el.innerHTML = utils.isUndefined(val) ? '' : val;
    
    var node;
    while(node = this.nodes.pop()) {
      node.parentNode && node.parentNode.removeChild(node);
    }
    
    var nodes = el.childNodes;
    for(var i = 0, l = nodes.length; i < l; i ++) {
      this.nodes.push(nodes[i])
      this.el.insertBefore(this.nodes[i], this.node);
    }
  }
};

  
dirs['if'] = {
  anchor: true
, link: function() {
    var parent = this.el.parentNode;
    parent.removeChild(this.el);
  }
, update: function(val) {
    var parent = this.anchors.end.parentNode;
    if(val) {
      if(!this.state) { parent.insertBefore(this.el, this.anchors.end); }
    }else{
      if(this.state) { parent.removeChild(this.el); }
    }
    this.state = val;
  }
};


dirs.partial = {
  terminal: true
, replace: true
, link: function(vm) {
    var that = this;
    var pName, ant, opts;
    pName = this.path;
    ant = vm.$root.$ant;
    opts = ant.options;
    
    this.path = '';
    
    ant.setPartial({
      name: pName
    , content: opts && opts.partials && opts.partials[pName]
    , target: function(el) { that.el.insertBefore(el, that.node) }
    , escape: this.escape
    , path: vm.$getKeyPath()
    , context: this
    });
  }
};

dirs.template = {
  priority: 10000
, link: function() {
    
  }
};
  
dirs.repeat = _dereq_('./repeat.js');
dirs.attr = _dereq_('./attr.js');
dirs.model = _dereq_('./model.js');

module.exports = dirs;
},{"../document.js":8,"../utils.js":13,"./attr.js":4,"./model.js":6,"./repeat.js":7}],6:[function(_dereq_,module,exports){
"use strict";

var utils = _dereq_('../utils.js')
  , hasToken = _dereq_('../token.js').hasToken
  ;

module.exports = {
  teminal: true
, priority: 1
, link: function(vm) {
    var keyPath = this.path;
    
    if(!keyPath) { return false; }
    
    var el = this.el
      , ev = 'change'
      , attr, value = attr = 'value'
      , ant = vm.$root.$ant
      , cur = vm.$getVM(keyPath, {assignment: this.assignment})
      , isSetDefaut = utils.isUndefined(ant.get(cur.$getKeyPath()))//界面的初始值不会覆盖 model 的初始值
      , crlf = /\r\n/g//IE 8 下 textarea 会自动将 \n 换行符换成 \r\n. 需要将其替换回来
      , callback = function(val) {
          //执行这里的时候, 很可能 render 还未执行. vm.$getData(keyPath) 未定义, 不能返回新设置的值
          var newVal = (val || vm.$getData(keyPath) || '') + ''
            , val = el[attr]
            ;
          val && val.replace && (val = val.replace(crlf, '\n'));
          if(newVal !== val){ el[attr] = newVal; }
        }
      , handler = function(isInit) {
          var val = el[value];
          
          val.replace && (val = val.replace(crlf, '\n'));
          ant.set(cur.$getKeyPath(), val, {isBubble: isInit !== true});
        }
      , callHandler = function(e) {
          if(e && e.propertyName && e.propertyName !== attr) {
            return;
          }
          handler.apply(this, arguments)
        }
      , ie = utils.ie
      ;
    
    switch(el.tagName) {
      default:
        value = attr = 'innerHTML';
        //ev += ' blur';
      case 'INPUT':
      case 'TEXTAREA':
        switch(el.type) {
          case 'checkbox':
            value = attr = 'checked';
            //IE6, IE7 下监听 propertychange 会挂?
            if(ie) { ev += ' click'; }
          break;
          case 'radio':
            attr = 'checked';
            if(ie) { ev += ' click'; }
            callback = function() {
              el.checked = el.value === vm.$getData(keyPath) + '';
            };
            isSetDefaut = el.checked;
          break;
          default:
            if(!ant.options.lazy){
              if('oninput' in el){
                ev += ' input';
              }
              //IE 下的 input 事件替代
              if(ie) {
                ev += ' keyup propertychange cut';
              }
            }
          break;
        }
      break;
      case 'SELECT':
        if(el.multiple){
          handler = function(isInit) {
            var vals = [];
            for(var i = 0, l = el.options.length; i < l; i++){
              if(el.options[i].selected){ vals.push(el.options[i].value) }
            }
            ant.set(cur.$getKeyPath(), vals, {isBubble: isInit !== true});
          };
          callback = function(){
            var vals = vm.$getData(keyPath);
            if(vals && vals.length){
              for(var i = 0, l = el.options.length; i < l; i++){
                el.options[i].selected = vals.indexOf(el.options[i].value) !== -1;
              }
            }
          };
        }
        isSetDefaut = isSetDefaut && !hasToken(el[value]);
      break;
    }
    
    this.update = callback;
    
    ev.split(/\s+/g).forEach(function(e){
      removeEvent(el, e, callHandler);
      addEvent(el, e, callHandler);
    });
    
    //根据表单元素的初始化默认值设置对应 model 的值
    if(el[value] && isSetDefaut){
       handler(true); 
    }
      
  }
};

function addEvent(el, event, handler) {
  if(el.addEventListener) {
    el.addEventListener(event, handler, false);
  }else{
    el.attachEvent('on' + event, handler);
  }
}

function removeEvent(el, event, handler) {
  if(el.removeEventListener) {
    el.removeEventListener(event, handler);
  }else{
    el.detachEvent('on' + event, handler);
  }
}
},{"../token.js":12,"../utils.js":13}],7:[function(_dereq_,module,exports){
"use strict";

var doc = _dereq_('../document.js')
  , utils = _dereq_('../utils.js')
  , afterFn = utils.afterFn
  ;
 
module.exports = {
  priority: 1000
, anchor: true
, terminal: true
, link: function(vm) {
    this.els = [];
    this.relativeVm = vm;
    
    this.el.parentNode.removeChild(this.el);
    
    //TODO: cache vm
  }
, update: function(val) {
    if(!this.vm) {
      this.vm = this.relativeVm.$getVM(this.paths[0], {assignment: this.assignment});
    }
    if(val) {
      if(utils.isArray(val)) {
        if(val.splice !== arrayMethods.splice) {
          utils.extend(val, arrayMethods);
          val.__vm__ = this.vm;
        }
        this.splice([0, this.els.length].concat(val), val);
      }else{
        console.warn('需要一个数组');
      }
    }
  }
  //精确控制 DOM 列表
  //args: [index, n/*, items...*/]
  //arr: 数组数据
  //fixVm: 是否维护 viewmodel 索引
, splice: function(args, arr, fixVm) {
    var els = this.els
      , items = args.slice(2)
      , index = args[0] * 1
      , n = args[1] * 1
      , m = items.length
      , newEls = []
      , frag = doc.createDocumentFragment()
      , pn = this.anchors.start.parentNode
      , el, vm
      ;
    
    if(utils.isUndefined(n)){
      args[1] = n = els.length - index;
    }
    
    for(var i = index, l = els.length; i < l; i++){
      if(i < index + n){
        //删除
        //对于拥有 if 属性并且不显示的节点, 其并不存在于 DOM 树中
        try{ pn.removeChild(els[i]); }catch(e){}
        fixVm && delete this.vm[i];
      }else{
        if(n || m){
          //维护索引
          var newI = i - (n - m)
            , oldI = i
            ;
          
          if(newI > oldI) {
            newI = l - (i - index);
            oldI = newI + (n - m);
          }
          
          els[oldI]['$index'] = newI;
          if(fixVm){
            vm = this.vm[newI] = this.vm[oldI];
            vm.$key = newI + '';
            vm['$index'] && vm['$index'].$update(vm.$key);
          }
        }else{
          break;
        }
      }
    }
    
    //新增
    var assignment;
    for(var j = 0; j < m; j++){
      el = this.el.cloneNode(true);
      fixVm && delete this.vm[index + j];
      vm = this.vm.$getVM(index + j, {scope: this.vm, assignment: this.assignment});
      
      assignment = utils.create(this.assignment);
      for(var a = 0; a < this.assignments.length; a++) {
        assignment[this.assignments[a]] = vm;
      }
      
      el['$index'] = index + j;
      frag.appendChild(el);
      vm.$build(el, assignment);
      
      fixVm && vm['$index'] && vm['$index'].$update(vm.$key);
      
      newEls.push(el);
    }
    if(newEls.length){
      pn.insertBefore(frag, els[index + n] || this.anchors.end);
    }
    
    //需要清除缩短后多出的部分
    if(fixVm){
      for(var k = l - n + m; k < l; k++){
        delete this.vm[k];
      }
    }
    
    if(arr.__vm__ !== this.vm) {
      arr.__vm__ = this.vm;
    }
    
    args = args.slice(0, 2).concat(newEls);
    els.splice.apply(els, args);
  }
, reverse: function(args, arr, fixVm) {
    var vms = this.vm, vm
      , anchor = this.anchors.end
      , frag = doc.createDocumentFragment()
      ;
    for(var i = 0, l = this.els.length; i < l; i++){
      if(fixVm && i < 1/2){
        vm = vms[i];
        vms[i] = vms[l - i - 1];
        vms[i].$key = i + '';
        vm.$key = l - i - 1 + '';
        vms[l - i - 1] = vm;
      }
      
      fixVm && vm['$index'] && vm['$index'].$update(vm.$key);
      
      this.els[i]['$index'] = l - i - 1;
      
      frag.appendChild(this.els[l - i - 1]);
    }
    anchor.parentNode.insertBefore(frag, anchor);
    this.els.reverse();
  }
, sort: function(fn){
    //TODO 进行精确高还原的排序?
    this.update(this.vm.$value);
  }
};

//---
function callRepeater(vmArray, method, args){
  var watchers = vmArray.__vm__.$watchers;
  var fixVm = true;
  for(var i = 0, l = watchers.length; i < l; i++){
    if(watchers[i].token.type === 'repeat'){
      watchers[i].token[method](args, vmArray, fixVm);
      fixVm = false;
    }
  }
  vmArray.__vm__.length && vmArray.__vm__.length.$update(vmArray.length, false, true);
}
var arrayMethods = {
  splice: afterFn([].splice, function() {
    callRepeater(this, 'splice', [].slice.call(arguments));
  })
, push: afterFn([].push, function(/*item1, item2, ...*/) {
    var arr = [].slice.call(arguments);
    arr.unshift(this.length - arr.length, 0);
    
    callRepeater(this, 'splice', arr);
  })
, pop: afterFn([].pop, function() {
    callRepeater(this, 'splice', [this.length, 1]);
  })
, shift: afterFn([].shift, function() {
    callRepeater(this, 'splice', [0, 1]);
  })
, unshift: afterFn([].unshift, function() {
    var arr = [].slice.call(arguments);
    arr.unshift(0, 0);
    
    callRepeater(this, 'splice', arr);
  })
, sort: afterFn([].sort, function(fn) {
    callRepeater(this, 'sort');
  })
, reverse: afterFn([].reverse, function(){
    callRepeater(this, 'reverse');
  })
};
  
},{"../document.js":8,"../utils.js":13}],8:[function(_dereq_,module,exports){
(function(root){
  "use strict";

  module.exports = root.document || _dereq_('jsdom').jsdom();

})((function() {return this})());
},{}],9:[function(_dereq_,module,exports){
"use strict";

var operators = {
  'unary': {
    '+': function(v) { return +v; }
  , '-': function(v) { return -v; }
  , '!': function(v) { return !v; }
    
  , '[': function(v){ return v; }
  , '{': function(v){
      var r = {};
      for(var i = 0, l = v.length; i < l; i++) {
        r[v[i][0]] = v[i][1];
      }
      return r;
    }
  , 'typeof': function(v){ return typeof v; }
  , 'new': function(v){ return new v }
  }
  
, 'binary': {
    '+': function(l, r) { return l + r; }
  , '-': function(l, r) { return l - r; }
  , '*': function(l, r) { return l * r; }
  , '/': function(l, r) { return l / r; }
  , '%': function(l, r) { return l % r; }
  , '<': function(l, r) { return l < r; }
  , '>': function(l, r) { return l > r; }
  , '<=': function(l, r) { return l <= r; }
  , '>=': function(l, r) { return l >= r; }
  , '==': function(l, r) { return l == r; }
  , '!=': function(l, r) { return l != r; }
  , '===': function(l, r) { return l === r; }
  , '!==': function(l, r) { return l !== r; }
  , '&&': function(l, r) { return l && r; }
  , '||': function(l, r) { return l || r; }
    
  , '.': function(l, r) {
      if(r){
        path = path + '.' + r;
      }
      return l[r];
    }
  , '[': function(l, r) {
      if(r){
        path = path + '.' + r;
      }
      return l[r];
    }
  , '(': function(l, r){ return l.apply(null, r) }
    
  , '|': function(l, r){ return r.call(null, l) }//filter. name|filter
  , 'in': function(l, r){
      if(this.assignment) {
        //repeat
        return r;
      }else{
        return l in r;
      }
    }
  }
  
, 'ternary': {
    '?': function(f, s, t) { return f ? s : t; }
  , '(': function(f, s, t) { return f[s].apply(f, t) }
  
  //filter. name | filter : arg2 : arg3
  , '|': function(f, s, t){ return s.apply(null, [f].concat(t)); }
  }
};

var argName = ['first', 'second', 'third']
  , context, summary
  , path
  ;

//遍历 ast
var evaluate = function(tree) {
  var arity = tree.arity
    , value = tree.value
    , args = []
    , n = 0
    , arg
    , res
    ;
  
  //操作符最多只有三元
  for(; n < 3; n++){
    arg = tree[argName[n]];
    if(arg){
      if(Array.isArray(arg)){
        args[n] = [];
        for(var i = 0, l = arg.length; i < l; i++){
          args[n].push(typeof arg[i].key === 'undefined' ? 
            evaluate(arg[i]) : [arg[i].key, evaluate(arg[i])]);
        }
      }else{
        args[n] = evaluate(arg);
      }
    }
  }
  
  if(arity !== 'literal') {
    if(path && value !== '.' && value !== '[') {
      summary.paths[path] = true;
    }
    if(arity === 'name') {
      path = value;
    }
  }
  
  switch(arity){
    case 'unary': 
    case 'binary':
    case 'ternary':
      try{
        res = getOperator(arity, value).apply(tree, args);
      }catch(e){
        //console.debug(e);
      }
    break;
    case 'literal':
      res = value;
    break;
    case 'assignment':
      summary.assignments[value] = true;
    break;
    case 'name':
      summary.locals[value] = true;
      res = context.locals[value];
    break;
    case 'filter':
      summary.filters[value] = true;
      res = context.filters[value];
    break;
    case 'this':
      res = context.locals;
    break;
  }
  return res;
};

function getOperator(arity, value){
  return operators[arity][value] || function() { return; }
}

function reset(_context) {
  if(_context) {
    context = {locals: _context.locals || {}, filters: _context.filters || {}};
  }else{
    context = {filters: {}, locals: {}};
  }
  
  summary = {filters: {}, locals: {}, paths: {}, assignments: {}};
  path = '';
}

//表达式求值
//tree: parser 生成的 ast
//context: 表达式执行的环境
//context.locals: 变量
//context.filters: 过滤器函数
exports.eval = function(tree, _context) {
  reset(_context || {});
  
  return evaluate(tree);
};

//表达式摘要
exports.summary = function(tree) {
  reset();
  
  evaluate(tree);
  
  if(path) {
    summary.paths[path] = true;
  }
  for(var key in summary) {
    summary[key] = Object.keys(summary[key]);
  }
  return summary;
};
},{}],10:[function(_dereq_,module,exports){
var utils = _dereq_('./utils.js');

var Event = {
  //监听自定义事件.
  on: function(name, handler, context) {
    var ctx = context || this
      ;
      
    ctx._handlers = ctx._handlers || {};
    ctx._handlers[name] = ctx._handlers[name] || [];
    
    ctx._handlers[name].push({handler: handler, context: context, ctx: ctx});
    return this;
  },
  //移除监听事件.
  off: function(name, handler, context) {
    var ctx = context || this
      , handlers = ctx._handlers
      ;
      
    if(name && handlers[name]){
      if(utils.isFunction(handler)){
        for(var i = handlers[name].length - 1; i >=0; i--) {
          if(handlers[name][i].handler === handler){
            handlers[name].splice(i, 1);
          }
        }
      }else{
        handlers[name] = [];
      }
    }
    return this;
  },
  //触发自定义事件. 
  //该方法没有提供静态化的 context 参数. 如要静态化使用, 应该: `Event.trigger.call(context, name, data)`
  trigger: function(name, data) {
    var that = this
      , args = [].slice.call(arguments, 1)
      , handlers = that._handlers
      ;
      
    if(handlers && handlers[name]){
      handlers[name].forEach(function(e) {
        e.handler.apply(that, args)
      });
    }
    return this;
  }
};

module.exports = Event;
},{"./utils.js":13}],11:[function(_dereq_,module,exports){
"use strict";
//Javascript expression parser modified form Crockford's TDOP parser
var create = Object.create || function (o) {
  function F() {}
  F.prototype = o;
  return new F();
};

var error = function (message, t) {
    t = t || this;
    t.name = "SyntaxError";
    t.message = message;
    throw t;
};

var noop = function() {};

var tokenize = function (code, prefix, suffix) {
    var c;                      // The current character.
    var from;                   // The index of the start of the token.
    var i = 0;                  // The index of the current character.
    var length = code.length;
    var n;                      // The number value.
    var q;                      // The quote character.
    var str;                    // The string value.

    var result = [];            // An array to hold the results.

    // Make a token object.
    var make = function (type, value) {
        return {
            type: type,
            value: value,
            from: from,
            to: i
        };
    };

// Begin tokenization. If the source string is empty, return nothing.

    if (!code) {
        return;
    }

// If prefix and suffix strings are not provided, supply defaults.

    if (typeof prefix !== 'string') {
        prefix = '<>+-&';
    }
    if (typeof suffix !== 'string') {
        suffix = '=>&:';
    }


// Loop through code text, one character at a time.

    c = code.charAt(i);
    while (c) {
        from = i;
        
        if (c <= ' ') {// Ignore whitespace.
            i += 1;
            c = code.charAt(i);
        } else if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '$' || c === '_') {// name.
            str = c;
            i += 1;
            for (;;) {
                c = code.charAt(i);
                if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
                        (c >= '0' && c <= '9') || c === '_') {
                    str += c;
                    i += 1;
                } else {
                    break;
                }
            }
            result.push(make('name', str));
        } else if (c >= '0' && c <= '9') {
        // number.

        // A number cannot start with a decimal point. It must start with a digit,
        // possibly '0'.
            str = c;
            i += 1;

// Look for more digits.

            for (;;) {
                c = code.charAt(i);
                if (c < '0' || c > '9') {
                    break;
                }
                i += 1;
                str += c;
            }

// Look for a decimal fraction part.

            if (c === '.') {
                i += 1;
                str += c;
                for (;;) {
                    c = code.charAt(i);
                    if (c < '0' || c > '9') {
                        break;
                    }
                    i += 1;
                    str += c;
                }
            }

// Look for an exponent part.

            if (c === 'e' || c === 'E') {
                i += 1;
                str += c;
                c = code.charAt(i);
                if (c === '-' || c === '+') {
                    i += 1;
                    str += c;
                    c = code.charAt(i);
                }
                if (c < '0' || c > '9') {
                    error("Bad exponent", make('number', str));
                }
                do {
                    i += 1;
                    str += c;
                    c = code.charAt(i);
                } while (c >= '0' && c <= '9');
            }

// Make sure the next character is not a letter.

            if (c >= 'a' && c <= 'z') {
                str += c;
                i += 1;
                error("Bad number", make('number', str));
            }

// Convert the string value to a number. If it is finite, then it is a good
// token.

            n = +str;
            if (isFinite(n)) {
                result.push(make('number', n));
            } else {
                error("Bad number", make('number', str));
            }

// string

        } else if (c === '\'' || c === '"') {
            str = '';
            q = c;
            i += 1;
            for (;;) {
                c = code.charAt(i);
                if (c < ' ') {
                    make('string', str);
                    error(c === '\n' || c === '\r' || c === '' ?
                        "Unterminated string." :
                        "Control character in string.", make('', str));
                }

// Look for the closing quote.

                if (c === q) {
                    break;
                }

// Look for escapement.

                if (c === '\\') {
                    i += 1;
                    if (i >= length) {
                      error("Unterminated string", make('string', str));
                    }
                    c = code.charAt(i);
                    switch (c) {
                    case 'b':
                        c = '\b';
                        break;
                    case 'f':
                        c = '\f';
                        break;
                    case 'n':
                        c = '\n';
                        break;
                    case 'r':
                        c = '\r';
                        break;
                    case 't':
                        c = '\t';
                        break;
                    case 'u':
                        if (i >= length) {
                           error("Unterminated string", make('string', str));
                        }
                        c = parseInt(code.substr(i + 1, 4), 16);
                        if (!isFinite(c) || c < 0) {
                           error("Unterminated string", make('string', str));
                        }
                        c = String.fromCharCode(c);
                        i += 4;
                        break;
                    }
                }
                str += c;
                i += 1;
            }
            i += 1;
            result.push(make('string', str));
            c = code.charAt(i);

// comment.

        } else if (c === '/' && code.charAt(i + 1) === '/') {
            i += 1;
            for (;;) {
                c = code.charAt(i);
                if (c === '\n' || c === '\r' || c === '') {
                    break;
                }
                i += 1;
            }

// combining

        } else if (prefix.indexOf(c) >= 0) {
            str = c;
            i += 1;
            while (true) {
                c = code.charAt(i);
                if (i >= length || suffix.indexOf(c) < 0) {
                    break;
                }
                str += c;
                i += 1;
            }
            result.push(make('operator', str));

// single-character operator

        } else {
            i += 1;
            result.push(make('operator', c));
            c = code.charAt(i);
        }
    }
    return result;
};


var make_parse = function () {
    var symbol_table = {};
    var token;
    var tokens;
    var token_nr;
    var context;
    
    var itself = function () {
        return this;
    };

    var find = function (n) {
      n.nud      = itself;
      n.led      = null;
      n.std      = null;
      n.lbp      = 0;
      return n;
    };

    var advance = function (id) {
        var a, o, t, v;
        if (id && token.id !== id) {
            error("Expected '" + id + "'.", token);
        }
        if (token_nr >= tokens.length) {
            token = symbol_table["(end)"];
            return;
        }
        t = tokens[token_nr];
        token_nr += 1;
        v = t.value;
        a = t.type;
        if ((a === "operator" || a !== 'string') && v in symbol_table) {
            //true, false 等直接量也会进入此分支
            o = symbol_table[v];
            if (!o) {
                error("Unknown operator.", t);
            }
        } else if (a === "name") {
            o = find(t);
        } else if (a === "string" || a ===  "number") {
            o = symbol_table["(literal)"];
            a = "literal";
        } else {
            error("Unexpected token.", t);
        }
        token = create(o);
        token.from  = t.from;
        token.to    = t.to;
        token.value = v;
        token.arity = a;
        return token;
    };

    var expression = function (rbp) {
        var left;
        var t = token;
        advance();
        left = t.nud();
        while (rbp < token.lbp) {
            t = token;
            advance();
            left = t.led(left);
        }
        return left;
    };

    var original_symbol = {
        nud: function () {
            error("Undefined.", this);
        },
        led: function (left) {
            error("Missing operator.", this);
        }
    };

    var symbol = function (id, bp) {
        var s = symbol_table[id];
        bp = bp || 0;
        if (s) {
            if (bp >= s.lbp) {
                s.lbp = bp;
            }
        } else {
            s = create(original_symbol);
            s.id = s.value = id;
            s.lbp = bp;
            symbol_table[id] = s;
        }
        return s;
    };

    var constant = function (s, v, a) {
        var x = symbol(s);
        x.nud = function () {
            this.value = symbol_table[this.id].value;
            this.arity = "literal";
            return this;
        };
        x.value = v;
        return x;
    };
    
    var infix = function (id, bp, led) {
        var s = symbol(id, bp);
        s.led = led || function (left) {
            this.first = left;
            this.second = expression(bp);
            this.arity = "binary";
            return this;
        };
        return s;
    };

    var infixr = function (id, bp, led) {
        var s = symbol(id, bp);
        s.led = led || function (left) {
            this.first = left;
            this.second = expression(bp - 1);
            this.arity = "binary";
            return this;
        };
        return s;
    };

    var prefix = function (id, nud) {
        var s = symbol(id);
        s.nud = nud || function () {
            this.first = expression(70);
            this.arity = "unary";
            return this;
        };
        return s;
    };

    symbol("(end)");
    symbol("(name)");
    symbol(":");
    symbol(")");
    symbol("]");
    symbol("}");
    symbol(",");

    constant("true", true);
    constant("false", false);
    constant("null", null);
    
    constant("Math", Math);
    constant("Date", Date);

    symbol("(literal)").nud = itself;

    // symbol("this").nud = function () {
        // this.arity = "this";
        // return this;
    // };

    //Operator Precedence:
    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence

    infix("?", 20, function (left) {
        this.first = left;
        this.second = expression(0);
        advance(":");
        this.third = expression(0);
        this.arity = "ternary";
        return this;
    });
    
    infixr("&&", 31);
    infixr("||", 30);

    infixr("===", 40);
    infixr("!==", 40);

    infixr("==", 40);
    infixr("!=", 40);

    infixr("<", 40);
    infixr("<=", 40);
    infixr(">", 40);
    infixr(">=", 40);
    
    infix("in", 45, function (left) {
        this.first = left;
        this.second = expression(0);
        this.arity = "binary";
        if(context === 'repeat'){
          // `in` at repeat block
          left.arity = 'assignment';
          this.assignment = true;
        }
        return this;
    });

    infix("+", 50);
    infix("-", 50);

    infix("*", 60);
    infix("/", 60);
    infix("%", 60);

    infix(".", 80, function (left) {
        this.first = left;
        if (token.arity !== "name") {
            error("Expected a property name.", token);
        }
        token.arity = "literal";
        this.second = token;
        this.arity = "binary";
        advance();
        return this;
    });

    infix("[", 80, function (left) {
        this.first = left;
        this.second = expression(0);
        this.arity = "binary";
        advance("]");
        return this;
    });

    infix("(", 80, function (left) {
        var a = [];
        if (left.id === "." || left.id === "[") {
            this.arity = "ternary";
            this.first = left.first;
            this.second = left.second;
            this.third = a;
        } else {
            this.arity = "binary";
            this.first = left;
            this.second = a;
            if ((left.arity !== "unary" || left.id !== "function") &&
                    left.arity !== "name" && left.arity !== "literal" && left.id !== "(" &&
                    left.id !== "&&" && left.id !== "||" && left.id !== "?") {
                error("Expected a variable name.", left);
            }
        }
        if (token.id !== ")") {
            while (true) {
                a.push(expression(0));
                if (token.id !== ",") {
                    break;
                }
                advance(",");
            }
        }
        advance(")");
        return this;
    });

    //filter
    infix("|", 10, function(left) {
      var a;
      this.first = left;
      token.arity = 'filter';
      this.second = expression(10);
      this.arity = 'binary';
      if(token.id === ':'){
        this.arity = 'ternary';
        this.third = a = [];
        while(true){
          advance(':');
          a.push(expression(0));
          if(token.id !== ":"){
            break;
          }
        }
      }
      return this;
    });
    

    prefix("!");
    prefix("-");
    prefix("typeof");

    prefix("(", function () {
        var e = expression(0);
        advance(")");
        return e;
    });

    prefix("[", function () {
        var a = [];
        if (token.id !== "]") {
            while (true) {
                a.push(expression(0));
                if (token.id !== ",") {
                    break;
                }
                advance(",");
            }
        }
        advance("]");
        this.first = a;
        this.arity = "unary";
        return this;
    });

    prefix("{", function () {
        var a = [], n, v;
        if (token.id !== "}") {
            while (true) {
                n = token;
                if (n.arity !== "name" && n.arity !== "literal") {
                    error("Bad property name.", token);
                }
                advance();
                advance(":");
                v = expression(0);
                v.key = n.value;
                a.push(v);
                if (token.id !== ",") {
                    break;
                }
                advance(",");
            }
        }
        advance("}");
        this.first = a;
        this.arity = "unary";
        return this;
    });

    //_source: 表达式代码字符串
    //_context: 表达式的语句环境
    return function (_source, _context) {
        tokens = tokenize(_source, '=<>!+-*&|/%^', '=<>&|');
        token_nr = 0;
        context = _context;
        advance();
        var s = expression(0);
        advance("(end)");
        return s;
    };
};

exports.parse = make_parse();
},{}],12:[function(_dereq_,module,exports){
var tokenReg = /{{({([^}\n]+)}|[^}\n]+)}}/g;

//字符串中是否包含模板占位符标记
function hasToken(str) {
  tokenReg.lastIndex = 0;
  return str && tokenReg.test(str);
}

function parseToken(value) {
  var tokens = []
    , textMap = []
    , start = 0
    , val, token
    ;
  
  tokenReg.lastIndex = 0;
  
  while((val = tokenReg.exec(value))){
    if(tokenReg.lastIndex - start > val[0].length){
      textMap.push(value.slice(start, tokenReg.lastIndex - val[0].length));
    }
    
    token = {
      escape: !val[2]
    , path: (val[2] || val[1]).trim()
    , position: textMap.length
    , textMap: textMap
    };
    
    tokens.push(token);
    
    //一个引用类型(数组)作为节点对象的文本图, 这样当某一个引用改变了一个值后, 其他引用取得的值都会同时更新
    textMap.push(val[0]);
    
    start = tokenReg.lastIndex;
  }
  
  if(value.length > start){
    textMap.push(value.slice(start, value.length));
  }
  
  tokens.textMap = textMap;
  
  return tokens;
}

exports.hasToken = hasToken;

exports.parseToken = parseToken;
},{}],13:[function(_dereq_,module,exports){
"use strict";

//utils
//---

var doc = _dereq_('./document.js');

var keyPathReg = /(?:\.|\[)/g
  , bra = /\]/g
  ;

//path.key, path[key] --> ['path', 'key']
function parseKeyPath(keyPath){
  return keyPath.replace(bra, '').split(keyPathReg);
}

/**
 * 合并对象
 * @static
 * @param {Boolean} [deep=false] 是否深度合并
 * @param {Object} target 目标对象
 * @param {Object} [object...] 来源对象
 * @param {Function} [callback] 用于自定义合并的回调
 * @return {Function} 合并后的 target 对象
 */
function extend(/* deep, target, object..., calllback */) {
  var options
    , name, src, copy, copyIsArray, clone
    , target = arguments[0] || {}
    , i = 1
    , length = arguments.length
    , deep = false
    , callback
    ;

  // Handle a deep copy situation
  if (typeof target === "boolean") {
    deep = target;

    // skip the boolean and the target
    target = arguments[ i ] || {};
    i++;
  }
  
  if(utils.isFunction(arguments[length - 1])) {
    callback = arguments[length - 1];
    length--;
  }

  // Handle case when target is a string or something (possible in deep copy)
  if (typeof target !== "object" && !utils.isFunction(target)) {
    target = {};
  }

  for ( ; i < length; i++ ) {
    // Only deal with non-null/undefined values
    if ( (options = arguments[ i ]) != null ) {
      // Extend the base object
      for ( name in options ) {
        //android 2.3 browser can enum the prototype of constructor...
        if(options.hasOwnProperty(name) && name !== 'prototype'){
          src = target[ name ];
          copy = options[ name ];
          

          // Recurse if we're merging plain objects or arrays
          if ( deep && copy && ( utils.isPlainObject(copy) || (copyIsArray = utils.isArray(copy)) ) ) {
          
            // Prevent never-ending loop
            if ( target === copy ) {
              continue;
            }
            if ( copyIsArray ) {
              copyIsArray = false;
              clone = src && utils.isArray(src) ? src : [];

            } else {
              clone = src && utils.isPlainObject(src) ? src : {};
            }

            if(callback) {
              copy = callback(clone, copy, name);
            }

            // Never move original objects, clone them
            target[ name ] = extend( deep, clone, copy, callback);

            // Don't bring in undefined values
          } else if ( !utils.isUndefined(copy) ) {

            if(callback) {
              copy = callback(src, copy, name);
            }
            target[ name ] = copy;
          }
        }
      }
    }
  }

  // Return the modified object
  return target;
}

var create = Object.create || function (o) {
  function F() {}
  F.prototype = o;
  return new F();
};

function tplParse(tpl, target) {
  var el;
  if(utils.isObject(tpl)){
    if(target){
      el = target = utils.isObject(target) ? target : doc.createElement(target);
      el.innerHTML = '';//清空目标对象
      target.appendChild(tpl);
    }else{
      el = tpl;
    }
    tpl = el.outerHTML;
  }else{
    el = utils.isObject(target) ? target : doc.createElement(target || 'div');
    el.innerHTML = tpl;
  }
  return {el: el, tpl: tpl};
}

 
var utils = {
  noop: function (){}
, ie: !!doc.attachEvent

, isObject: function (val) {
    return typeof val === 'object' && val !== null;
  }

, isUndefined: function (val) {
    return typeof val === 'undefined';
  }

, isFunction: function (val){
    return typeof val === 'function';
  }

, isArray: function (val) {
    if(utils.ie){
      //IE 9 及以下 IE 跨窗口检测数组
      return val && val.constructor + '' === Array + '';
    }else{
      return Array.isArray(val);
    }
  }

  //简单对象的简易判断
, isPlainObject: function (o){
    if (!o || ({}).toString.call(o) !== '[object Object]' || o.nodeType || o === o.window) {
      return false;
    }else{
      return true;
    }
  }

  //函数切面. oriFn 原始函数, fn 切面补充函数
  //前面的函数返回值传入 breakCheck 判断, breakCheck 返回值为真时不执行切面补充的函数
, beforeFn: function (oriFn, fn, breakCheck) {
    return function() {
      var ret = fn.apply(this, arguments);
      if(breakCheck && breakCheck.call(this, ret)){
        return ret;
      }
      return oriFn.apply(this, arguments);
    };
  }

, afterFn: function (oriFn, fn, breakCheck) {
    return function() {
      var ret = oriFn.apply(this, arguments);
      if(breakCheck && breakCheck.call(this, ret)){
        return ret;
      }
      fn.apply(this, arguments);
      return ret;
    }
  }
  
, parseKeyPath: parseKeyPath

, deepSet: function (keyStr, value, obj) {
    if(keyStr){
      var chain = parseKeyPath(keyStr)
        , cur = obj
        ;
      chain.forEach(function(key, i) {
        if(i === chain.length - 1){
          cur[key] = value;
        }else{
          if(cur && cur.hasOwnProperty(key)){
            cur = cur[key];
          }else{
            cur[key] = {};
            cur = cur[key];
          }
        }
      });
    }else{
      extend(obj, value);
    }
    return obj;
  }
, deepGet: function (keyStr, obj) {
    var chain, cur = obj, key;
    if(keyStr){
      chain = parseKeyPath(keyStr);
      for(var i = 0, l = chain.length; i < l; i++) {
        key = chain[i];
        if(cur && cur.hasOwnProperty(key)){
          cur = cur[key];
        }else{
          return;
        }
      }
    }
    return cur;
  }
, extend: extend
, create: create
, tplParse: tplParse
};

module.exports = utils;
},{"./document.js":8}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJFOlxcemh1emhhblxcRHJvcGJveFxcY29kZVxcYW50LmpzXFxub2RlX21vZHVsZXNcXGJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3Nlci1wYWNrXFxfcHJlbHVkZS5qcyIsIkU6L3podXpoYW4vRHJvcGJveC9jb2RlL2FudC5qcy9zcmMvYW50LmpzIiwiRTovemh1emhhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy9jbGFzcy5qcyIsIkU6L3podXpoYW4vRHJvcGJveC9jb2RlL2FudC5qcy9zcmMvZGlyZWN0aXZlLmpzIiwiRTovemh1emhhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy9kaXJlY3RpdmVzL2F0dHIuanMiLCJFOi96aHV6aGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL2RpcmVjdGl2ZXMvaW5kZXguanMiLCJFOi96aHV6aGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL2RpcmVjdGl2ZXMvbW9kZWwuanMiLCJFOi96aHV6aGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL2RpcmVjdGl2ZXMvcmVwZWF0LmpzIiwiRTovemh1emhhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy9kb2N1bWVudC5qcyIsIkU6L3podXpoYW4vRHJvcGJveC9jb2RlL2FudC5qcy9zcmMvZXZhbC5qcyIsIkU6L3podXpoYW4vRHJvcGJveC9jb2RlL2FudC5qcy9zcmMvZXZlbnQuanMiLCJFOi96aHV6aGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL3BhcnNlLmpzIiwiRTovemh1emhhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy90b2tlbi5qcyIsIkU6L3podXpoYW4vRHJvcGJveC9jb2RlL2FudC5qcy9zcmMvdXRpbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDak1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgZG9jID0gcmVxdWlyZSgnLi9kb2N1bWVudC5qcycpXG4gICwgcGFyc2UgPSByZXF1aXJlKCcuL3BhcnNlLmpzJykucGFyc2VcbiAgLCBldmFsdWF0ZSA9IHJlcXVpcmUoJy4vZXZhbC5qcycpXG4gICwgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJylcbiAgLCBFdmVudCA9IHJlcXVpcmUoJy4vZXZlbnQuanMnKVxuICAsIENsYXNzID0gcmVxdWlyZSgnLi9jbGFzcy5qcycpXG4gICwgRGlyID0gcmVxdWlyZSgnLi9kaXJlY3RpdmUuanMnKVxuICAsIGRpcnMgPSByZXF1aXJlKCcuL2RpcmVjdGl2ZXMnKVxuICAsIHRva2VuID0gcmVxdWlyZSgnLi90b2tlbi5qcycpXG4gIDtcblxuXG52YXIgaXNPYmplY3QgPSB1dGlscy5pc09iamVjdFxuICAsIGlzVW5kZWZpbmVkID0gdXRpbHMuaXNVbmRlZmluZWRcbiAgLCBpc0Z1bmN0aW9uID0gdXRpbHMuaXNGdW5jdGlvblxuICAsIGlzQXJyYXkgPSB1dGlscy5pc0FycmF5XG4gICwgaXNQbGFpbk9iamVjdCA9IHV0aWxzLmlzUGxhaW5PYmplY3RcbiAgLCBhZnRlckZuID0gdXRpbHMuYWZ0ZXJGblxuICAsIHBhcnNlS2V5UGF0aCA9IHV0aWxzLnBhcnNlS2V5UGF0aFxuICAsIGRlZXBTZXQgPSB1dGlscy5kZWVwU2V0XG4gICwgZGVlcEdldCA9IHV0aWxzLmRlZXBHZXRcbiAgLCBleHRlbmQgPSB1dGlscy5leHRlbmRcbiAgLCBpZSA9IHV0aWxzLmllXG4gICwgdHBsUGFyc2UgPSB1dGlscy50cGxQYXJzZVxuICAsIGNyZWF0ZSA9IHV0aWxzLmNyZWF0ZVxuICA7XG5cblxuZnVuY3Rpb24gc2V0UHJlZml4KG5ld1ByZWZpeCkge1xuICBpZihuZXdQcmVmaXgpe1xuICAgIHRoaXMucHJlZml4ID0gbmV3UHJlZml4O1xuICB9XG59XG5cblxuLyoqXG4gKiAjIEFudFxuICog5Z+65LqOIGRvbSDnmoTmqKHmnb/lvJXmk44uIOaUr+aMgeaVsOaNrue7keWumlxuICogQHBhcmFtIHtTdHJpbmcgfCBFbGVtZW50fSBbdHBsXSDmqKHmnb/lupTor6XmmK/lkIjms5XogIzkuJTmoIflh4bnmoQgSFRNTCDmoIfnrb7lrZfnrKbkuLLmiJbogIXnm7TmjqXmmK/njrDmnIkgRE9NIOagkeS4reeahOS4gOS4qiBlbGVtZW50IOWvueixoS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0c11cbiAqIEBwYXJhbSB7U3RyaW5nIHwgRWxlbWVudH0gb3B0cy50cGxcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzLmRhdGEg5riy5p+T5qih5p2/55qE5pWw5o2uLiDor6XpobnlpoLmnpzkuLrnqbosIOeojeWQjuWPr+S7peeUqCBgdHBsLnJlbmRlcihtb2RlbClgIOadpea4suafk+eUn+aIkCBodG1sLlxuICogQHBhcmFtIHtCb29sZWFufSBvcHRzLmxhenkg5piv5ZCm5a+5ICdpbnB1dCcg5Y+KICd0ZXh0YXJlYScg55uR5ZCsIGBjaGFuZ2VgIOS6i+S7tiwg6ICM5LiN5pivIGBpbnB1dGAg5LqL5Lu2XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cy5ldmVudHMgXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cy5wYXJ0aWFsc1xuICogQHBhcmFtIHtTdHJpbmcgfCBIVE1MRUxlbWVudH0gb3B0cy5lbFxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIEFudCh0cGwsIG9wdHMpIHtcbiAgaWYoaXNQbGFpbk9iamVjdCh0cGwpKSB7XG4gICAgdHBsID0gb3B0cy50cGw7XG4gIH1cbiAgb3B0cyA9IG9wdHMgfHwge307XG4gIHZhciBlbFxuICAgICwgZGVmYXVsdHMgPSB0aGlzLmRlZmF1bHRzIHx8IHt9XG4gICAgO1xuXG4gIG9wdHMgPSBleHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBvcHRzKTtcblxuICB2YXIgZGF0YSA9IG9wdHMuZGF0YSB8fCB7fVxuICAgICwgZXZlbnRzID0gb3B0cy5ldmVudHMgfHwge31cbiAgICAsIGZpbHRlcnMgPSBvcHRzLmZpbHRlcnMgfHwge31cbiAgICA7XG4gIFxuICBlbCA9IHRwbFBhcnNlKHRwbCwgb3B0cy5lbCk7XG4gIHRwbCA9IGVsLnRwbDtcbiAgZWwgPSBlbC5lbDtcbiAgXG4gIC8v5bGe5oCnXG4gIC8vLS0tLVxuICBcbiAgdGhpcy5vcHRpb25zID0gb3B0cztcbiAgLyoqXG4gICAqICMjIyBhbnQudHBsXG4gICAqIOaooeadv+Wtl+espuS4slxuICAgKiBAdHlwZSB7U3RyaW5nfVxuICAgKi9cbiAgdGhpcy50cGwgPSB0cGw7XG4gIFxuICAvKipcbiAgICogIyMjIGFudC5lbFxuICAgKiDmqKHmnb8gRE9NIOWvueixoS5cbiAgICogQHR5cGUge0hUTUxFbGVtZW50T2JqZWN0fVxuICAgKi9cbiAgdGhpcy5lbCA9IGVsO1xuICBcbiAgLyoqXG4gICAqICMjIyBhbnQuZGF0YVxuICAgKiDnu5HlrprmqKHmnb/nmoTmlbDmja4uXG4gICAqIEB0eXBlIHtPYmplY3R9IOaVsOaNruWvueixoSwg5LiN5bqU6K+l5piv5pWw57uELlxuICAgKi9cbiAgdGhpcy5kYXRhID0ge307XG4gIC8qKlxuICAgKiAjIyMgYW50LmlzUmVuZGVyZWRcbiAgICog6K+l5qih5p2/5piv5ZCm5bey57uP57uR5a6a5pWw5o2uXG4gICAqIEB0eXBlIHtCb29sZWFufSDlnKjosIPnlKggYHJlbmRlcmAg5pa55rOV5ZCOLCDor6XlsZ7mgKflsIbkuLogYHRydWVgXG4gICAqL1xuICB0aGlzLmlzUmVuZGVyZWQgPSBmYWxzZTtcbiAgXG4gIHRoaXMucGFydGlhbHMgPSB7fTtcbiAgdGhpcy5maWx0ZXJzID0ge307XG4gIFxuICBmb3IodmFyIGV2ZW50IGluIGV2ZW50cykge1xuICAgIHRoaXMub24oZXZlbnQsIGV2ZW50c1tldmVudF0pO1xuICB9XG5cbiAgZm9yKHZhciBmaWx0ZXJOYW1lIGluIGZpbHRlcnMpe1xuICAgIHRoaXMuc2V0RmlsdGVyKGZpbHRlck5hbWUsIGZpbHRlcnNbZmlsdGVyTmFtZV0pO1xuICB9XG4gIFxuICBidWlsZFZpZXdNb2RlbC5jYWxsKHRoaXMpO1xuICBcbiAgLy/ov5nph4zpnIDopoHlkIjlubblj6/og73lrZjlnKjnmoQgdGhpcy5kYXRhXG4gIC8v6KGo5Y2V5o6n5Lu25Y+v6IO95Lya5pyJ6buY6K6k5YC8LCBgYnVpbGRWaWV3TW9kZWxgIOWQjuS8mum7mOiupOWAvOS8muW5tuWFpSBgdGhpcy5kYXRhYCDkuK1cbiAgZGF0YSA9IGV4dGVuZCh0aGlzLmRhdGEsIGRhdGEpO1xuICBcbiAgaWYob3B0cy5kYXRhKXtcbiAgICB0aGlzLnJlbmRlcihkYXRhKTtcbiAgfVxufVxuXG4vL+mdmeaAgeaWueazleWPiuWxnuaAp1xuLy8tLS1cbmV4dGVuZChBbnQsIENsYXNzLCBEaXIsIHtcbiAgc2V0UHJlZml4OiBzZXRQcmVmaXhcbiwgZG9jOiBkb2NcbiwgZGlyZWN0aXZlczoge31cbiwgdXRpbHM6IHV0aWxzXG59KTtcblxuQW50LnNldFByZWZpeCgnYS0nKTtcblxuLy/lhoXnva4gZGlyZWN0aXZlXG5mb3IodmFyIGRpciBpbiBkaXJzKSB7XG4gIEFudC5kaXJlY3RpdmUoZGlyLCBkaXJzW2Rpcl0pO1xufVxuICBcbi8v5a6e5L6L5pa55rOVXG4vLy0tLS1cbmV4dGVuZChBbnQucHJvdG90eXBlLCBFdmVudCwge1xuICAvKipcbiAgICogIyMjIGFudC5yZW5kZXJcbiAgICog5riy5p+T5qih5p2/XG4gICAqL1xuICByZW5kZXI6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICBkYXRhID0gZGF0YSB8fCB0aGlzLmRhdGE7XG4gICAgdGhpcy5zZXQoZGF0YSwge2lzRXh0ZW5kOiBmYWxzZX0pO1xuICAgIHRoaXMuaXNSZW5kZXJlZCA9IHRydWU7XG4gICAgdGhpcy50cmlnZ2VyKCdyZW5kZXInKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICAvKipcbiAgICogIyMjIGFudC5jbG9uZVxuICAgKiDlpI3liLbmqKHmnb9cbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRzXVxuICAgKiBAcmV0dXJuIHtUZW1wbGF0ZU9iamVjdH0g5LiA5Liq5pawIGBBbnRgIOWunuS+i1xuICAgKi9cbiwgY2xvbmU6IGZ1bmN0aW9uKG9wdHMpIHtcbiAgICB2YXIgb3B0aW9ucyA9IGV4dGVuZCh0cnVlLCB7fSwgdGhpcy5vcHRpb25zKTtcbiAgICBpZihvcHRzICYmIG9wdHMuZGF0YSl7IG9wdGlvbnMuZGF0YSA9IG51bGw7IH1cbiAgICByZXR1cm4gbmV3IHRoaXMuY29uc3RydWN0b3IodGhpcy50cGwsIGV4dGVuZCh0cnVlLCBvcHRpb25zLCBvcHRzKSk7XG4gIH1cbiAgXG4sIGdldDogZnVuY3Rpb24oa2V5KSB7XG4gICAgcmV0dXJuIGRlZXBHZXQoa2V5LCB0aGlzLmRhdGEpO1xuICB9XG4gIFxuICAvKipcbiAgICogIyMjIGFudC5zZXRcbiAgICog5pu05pawIGBhbnQuZGF0YWAg5Lit55qE5pWw5o2uXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBba2V5XSDmlbDmja7ot6/lvoQuIFxuICAgKiBAcGFyYW0ge0FueVR5cGV8T2JqZWN0fSB2YWwg5pWw5o2u5YaF5a65LiDlpoLmnpzmlbDmja7ot6/lvoTooqvnnIHnlaUsIOesrOS4gOS4quWPguaVsOaYr+S4gOS4quWvueixoS4g6YKj5LmIIHZhbCDlsIbmm7/mjaIgYW50LmRhdGEg5oiW6ICF5bm25YWl5YW25LitXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0XSDlj4LmlbDpoblcbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHQuc2lsZW5jZSDmmK/lkKbpnZnpnZnnmoTmm7TmlrDmlbDmja7ogIzkuI3op6blj5EgYHVwZGF0ZWAg5LqL5Lu25Y+K5pu05pawIERPTS5cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHQuaXNFeHRlbmQg5pWw5o2u6K6+572u57G75Z6LLiDmmK/lkKblsIbmlbDmja7lubblhaXljp/mlbDmja4uIFxuICAgICAgICAgICAg56ys5LiA5Liq5Y+C5pWw5piv5pWw5o2u6Lev5b6E5piv6K+l5YC86buY6K6k5Li6IGZhbHNlLCDogIznrKzkuIDkuKrmlbDmja7mmK/mlbDmja7lr7nosaHnmoTml7blgJnliJnpu5jorqTkuLogdHJ1ZVxuICAgKi9cbiwgc2V0OiBmdW5jdGlvbihrZXksIHZhbCwgb3B0KSB7XG4gICAgdmFyIGNoYW5nZWQsIGlzRXh0ZW5kLCBwYXJlbnQsIGtleXMsIHBhdGg7XG4gICAgXG4gICAgaWYoaXNVbmRlZmluZWQoa2V5KSl7IHJldHVybiB0aGlzOyB9XG4gICAgXG4gICAgaWYoaXNPYmplY3Qoa2V5KSl7XG4gICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgIG9wdCA9IHZhbDtcbiAgICAgIG9wdCA9IG9wdCB8fCB7fTtcbiAgICAgIGlmKG9wdC5pc0V4dGVuZCAhPT0gZmFsc2Upe1xuICAgICAgICBpc0V4dGVuZCA9IHRydWU7XG4gICAgICAgIC8vbW9kZWxFeHRlbmQodGhpcy5kYXRhLCBrZXksIHRoaXMuX3ZtKTtcbiAgICAgICAgZXh0ZW5kKHRydWUsIHRoaXMuZGF0YSwga2V5KTtcbiAgICAgIH1lbHNle1xuICAgICAgICBpc0V4dGVuZCA9IGZhbHNlO1xuICAgICAgICAvL3RoaXMuZGF0YSA9IG1vZGVsRXh0ZW5kKHt9LCBrZXksIHRoaXMuX3ZtKTtcbiAgICAgICAgdGhpcy5kYXRhID0gZXh0ZW5kKHRydWUsIHt9LCBrZXkpO1xuICAgICAgfVxuICAgIH1lbHNle1xuICAgICAgb3B0ID0gb3B0IHx8IHt9O1xuICAgICAgXG4gICAgICBpZihkZWVwR2V0KGtleSwgdGhpcy5kYXRhKSAhPT0gdmFsKSB7XG4gICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgfVxuICAgICAgaWYoY2hhbmdlZCl7XG4gICAgICAgIGlmKG9wdC5pc0V4dGVuZCAhPT0gdHJ1ZSl7XG4gICAgICAgICAga2V5cyA9IHBhcnNlS2V5UGF0aChrZXkpO1xuICAgICAgICAgIGlmKGtleXMubGVuZ3RoID4gMSl7XG4gICAgICAgICAgICBwYXRoID0ga2V5cy5wb3AoKTtcbiAgICAgICAgICAgIHBhcmVudCA9IGRlZXBHZXQoa2V5cy5qb2luKCcuJyksIHRoaXMuZGF0YSk7XG4gICAgICAgICAgICBpZihpc1VuZGVmaW5lZChwYXJlbnQpKXtcbiAgICAgICAgICAgICAgZGVlcFNldChrZXlzLmpvaW4oJy4nKSwgcGFyZW50ID0ge30sIHRoaXMuZGF0YSk7XG4gICAgICAgICAgICB9ZWxzZSBpZighaXNPYmplY3QocGFyZW50KSl7XG4gICAgICAgICAgICAgIHZhciBvbGRQYXJlbnQgPSBwYXJlbnQ7XG4gICAgICAgICAgICAgIGRlZXBTZXQoa2V5cy5qb2luKCcuJyksIHBhcmVudCA9IHt0b1N0cmluZzogZnVuY3Rpb24oKSB7IHJldHVybiBvbGRQYXJlbnQ7IH19LCB0aGlzLmRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgaWYoa2V5KXtcbiAgICAgICAgICAgICAgcGFyZW50ID0gdGhpcy5kYXRhO1xuICAgICAgICAgICAgICBwYXRoID0ga2V5O1xuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgIHBhcmVudCA9IHRoaXM7XG4gICAgICAgICAgICAgIHBhdGggPSAnZGF0YSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHBhcmVudFtwYXRoXSA9IGlzT2JqZWN0KHZhbCkgPyBleHRlbmQodHJ1ZSwgaXNBcnJheSh2YWwpID8gW10gOiB7fSwgdmFsKSA6IHZhbDtcbiAgICAgICAgICAvL3BhcmVudFtwYXRoXSA9IHZhbDtcbiAgICAgICAgICBpc0V4dGVuZCA9IGZhbHNlO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAvL21vZGVsRXh0ZW5kKHRoaXMuZGF0YSwgZGVlcFNldChrZXksIHZhbCwge30pLCB0aGlzLl92bSk7XG4gICAgICAgICAgZXh0ZW5kKHRydWUsIHRoaXMuZGF0YSwgZGVlcFNldChrZXksIHZhbCwge30pKTtcbiAgICAgICAgICBpc0V4dGVuZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgY2hhbmdlZCAmJiAoIW9wdC5zaWxlbmNlKSAmJiAoaXNPYmplY3Qoa2V5KSA/IHVwZGF0ZS5jYWxsKHRoaXMsIGtleSwgaXNFeHRlbmQsIG9wdC5pc0J1YmJsZSkgOiB1cGRhdGUuY2FsbCh0aGlzLCBrZXksIHZhbCwgaXNFeHRlbmQsIG9wdC5pc0J1YmJsZSkpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIC8qKlxuICAgKiAjIyMgYW50LnNldFBhcnRpYWxcbiAgICog5re75Yqg5a2Q5qih5p2/XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBpbmZvIOWtkOaooeadv+S/oeaBr1xuICAgKiBAcGFyYW0ge1N0cmluZ3xIVE1MRWxlbWVudH0gaW5mby5jb250ZW50IOWtkOaooeadv+WGheWuuVxuICAgKiBAcGFyYW0ge1N0cmluZ30gW2luZm8ubmFtZV0g5a2Q5qih5p2/5qCH56S656ymXG4gICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR8ZnVuY3Rpb259IFtpbmZvLnRhcmdldF0g5a2Q5qih5p2/55qE55uu5qCH6IqC54K5XG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gW2luZm8uZXNjYXBlXSDmmK/lkKbovazkuYnlrZfnrKbkuLLlrZDmqKHmnb9cbiAgICogQHBhcmFtIHtTdHJpbmd9IFtpbmZvLnBhdGhdIOaMh+WumuWtkOaooeadv+S4reWPmOmHj+WcqOaVsOaNruS4reeahOS9nOeUqOWfn1xuICAgKi9cbiwgc2V0UGFydGlhbDogZnVuY3Rpb24ocGFydGlhbEluZm8pIHtcbiAgICBpZighcGFydGlhbEluZm8peyByZXR1cm47IH1cbiAgICBcbiAgICBwYXJ0aWFsSW5mbyA9IGV4dGVuZCh7fSwgdGhpcy5wYXJ0aWFsc1twYXJ0aWFsSW5mby5uYW1lXSwgcGFydGlhbEluZm8pO1xuICAgIFxuICAgIHZhciBlbHMsIF9lbHMsIHZtXG4gICAgICAsIG5hbWUgPSBwYXJ0aWFsSW5mby5uYW1lXG4gICAgICAsIHRhcmdldCA9IHBhcnRpYWxJbmZvLnRhcmdldFxuICAgICAgLCBwYXJ0aWFsID0gcGFydGlhbEluZm8uY29udGVudFxuICAgICAgLCBwYXRoID0gcGFydGlhbEluZm8ucGF0aCB8fCAnJ1xuICAgICAgO1xuICAgIGlmKG5hbWUpe1xuICAgICAgdGhpcy5wYXJ0aWFsc1tuYW1lXSA9IHBhcnRpYWxJbmZvO1xuICAgIH1cbiAgICBpZihwYXJ0aWFsKSB7XG4gICAgICB2bSA9IHRoaXMuX3ZtLiRnZXRWTShwYXRoKTtcbiAgICAgIFxuICAgICAgaWYodHlwZW9mIHBhcnRpYWwgPT09ICdzdHJpbmcnKXtcbiAgICAgICAgaWYocGFydGlhbEluZm8uZXNjYXBlKXtcbiAgICAgICAgICBlbHMgPSBbZG9jLmNyZWF0ZVRleHROb2RlKHBhcnRpYWwpXTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgX2VscyA9IHRwbFBhcnNlKHBhcnRpYWwsICdkaXYnKS5lbC5jaGlsZE5vZGVzO1xuICAgICAgICAgIGVscyA9IFtdO1xuICAgICAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSBfZWxzLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICAgICAgICBlbHMucHVzaChfZWxzW2ldKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1lbHNle1xuICAgICAgICBlbHMgPSBbKHBhcnRpYWwgaW5zdGFuY2VvZiBBbnQpID8gcGFydGlhbC5lbCA6IHBhcnRpYWxdO1xuICAgICAgfVxuICAgICAgXG4gICAgICBpZih0YXJnZXQpe1xuICAgICAgICBmb3IodmFyIGkgPSAwLCBsID0gZWxzLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICAgICAgaXNGdW5jdGlvbih0YXJnZXQpID8gXG4gICAgICAgICAgICB0YXJnZXQuY2FsbCh0aGlzLCBlbHNbaV0pIDpcbiAgICAgICAgICAgIHRhcmdldC5hcHBlbmRDaGlsZChlbHNbaV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBcbiAgICAgIHZtLiRidWlsZChlbHMsIHBhcnRpYWxJbmZvLmNvbnRleHQgJiYgcGFydGlhbEluZm8uY29udGV4dC5hc3NpZ25tZW50KVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4sIHdhdGNoOiBmdW5jdGlvbihrZXlQYXRoLCBjYWxsYmFjaykge1xuICAgIGlmKGtleVBhdGggJiYgY2FsbGJhY2spe1xuICAgICAgYWRkV2F0Y2hlcih0aGlzLl92bSwge3BhdGg6IGtleVBhdGgsIHVwZGF0ZTogY2FsbGJhY2t9KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiwgdW53YXRjaDogZnVuY3Rpb24oa2V5UGF0aCwgY2FsbGJhY2spIHtcbiAgICB2YXIgdm0gPSB0aGlzLl92bS4kZ2V0Vk0oa2V5UGF0aCwge3N0cmljdDogdHJ1ZX0pO1xuICAgIGlmKHZtKXtcbiAgICAgIGZvcih2YXIgaSA9IHZtLiR3YXRjaGVycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSl7XG4gICAgICAgIGlmKHZtLiR3YXRjaGVyc1tpXS5jYWxsYmFjayA9PT0gY2FsbGJhY2spe1xuICAgICAgICAgIHZtLiR3YXRjaGVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgXG4gIFxuLCBzZXRGaWx0ZXI6IGZ1bmN0aW9uKG5hbWUsIGZpbHRlcikge1xuICAgIHRoaXMuZmlsdGVyc1tuYW1lXSA9IGZpbHRlci5iaW5kKHRoaXMpO1xuICB9XG4sIGdldEZpbHRlcjogZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLmZpbHRlcnNbbmFtZV1cbiAgfVxuLCByZW1vdmVGaWx0ZXI6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBkZWxldGUgdGhpcy5maWx0ZXJzW25hbWVdO1xuICB9XG59KTtcblxuLyoqXG4gKiDmm7TmlrDmqKHmnb8uIFxuICogQHBhcmFtIHtPYmplY3R9IGRhdGEg6KaB5pu05paw55qE5pWw5o2uLiDlop7ph4/mlbDmja7miJblhajmlrDnmoTmlbDmja4uXG4gKiBAcGFyYW0ge1N0cmluZ30gW2tleVBhdGhdIOmcgOimgeabtOaWsOeahOaVsOaNrui3r+W+hC5cbiAqIEBwYXJhbSB7QW55VHlwZXxPYmplY3R9IFtkYXRhXSDpnIDopoHmm7TmlrDnmoTmlbDmja4uIOecgeeVpeeahOivneWwhuS9v+eUqOeOsOacieeahOaVsOaNri5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW2lzRXh0ZW5kXSDnlYzpnaLmm7TmlrDnsbvlnosuXG4gICAgICAgICAg5Li6IHRydWUg5pe2LCDmmK/mianlsZXlvI/mm7TmlrAsIOWOn+acieeahOaVsOaNruS4jeWPmFxuICAgICAgICAgIOS4uiBmYWxzZSDml7YsIOS4uuabv+aNouabtOaWsCwg5LiN5ZyoIGRhdGEg5Lit55qE5Y+Y6YePLCDlsIblnKggRE9NIOS4reiiq+a4heepui5cbiAqL1xuZnVuY3Rpb24gdXBkYXRlIChrZXlQYXRoLCBkYXRhLCBpc0V4dGVuZCwgaXNCdWJibGUpIHtcbiAgdmFyIGF0dHJzLCB2bSA9IHRoaXMuX3ZtO1xuICBpZihpc09iamVjdChrZXlQYXRoKSl7XG4gICAgaXNCdWJibGUgPSBpc0V4dGVuZDtcbiAgICBpc0V4dGVuZCA9IGRhdGE7XG4gICAgYXR0cnMgPSBkYXRhID0ga2V5UGF0aDtcbiAgfWVsc2UgaWYodHlwZW9mIGtleVBhdGggPT09ICdzdHJpbmcnKXtcbiAgICBrZXlQYXRoID0gcGFyc2VLZXlQYXRoKGtleVBhdGgpLmpvaW4oJy4nKTtcbiAgICBpZihpc1VuZGVmaW5lZChkYXRhKSl7XG4gICAgICBkYXRhID0gdGhpcy5nZXQoa2V5UGF0aCk7XG4gICAgfVxuICAgIGF0dHJzID0gZGVlcFNldChrZXlQYXRoLCBkYXRhLCB7fSk7XG4gICAgdm0gPSB2bS4kZ2V0Vk0oa2V5UGF0aCk7XG4gIH1lbHNle1xuICAgIGRhdGEgPSB0aGlzLmRhdGE7XG4gIH1cbiAgXG4gIGlmKGlzVW5kZWZpbmVkKGlzRXh0ZW5kKSl7IGlzRXh0ZW5kID0gaXNPYmplY3Qoa2V5UGF0aCk7IH1cbiAgdm0uJHVwZGF0ZShkYXRhLCBpc0V4dGVuZCwgaXNCdWJibGUgIT09IGZhbHNlKTtcbiAgcmV0dXJuIHRoaXM7XG59XG5cbmZ1bmN0aW9uIGJ1aWxkVmlld01vZGVsKCkge1xuICB2YXIgdm0gPSBuZXcgVmlld01vZGVsKHtcbiAgICAkYW50OiB0aGlzXG4gIH0pO1xuICBcbiAgdGhpcy5fdm0gPSB2bTtcbiAgdm0uJGJ1aWxkKHRoaXMuZWwpO1xufVxuXG52YXIgTk9ERVRZUEUgPSB7XG4gIEFUVFI6IDJcbiwgVEVYVDogM1xuLCBDT01NRU5UOiA4XG59O1xuXG4vL+mBjeWOhuWFg+e0oOWPiuWFtuWtkOWFg+e0oOeahOaJgOacieWxnuaAp+iKgueCueWPiuaWh+acrOiKgueCuVxuZnVuY3Rpb24gdHJhdmVsRWwoZWwsIHZtLCBhc3NpZ25tZW50KSB7XG4gIGFzc2lnbm1lbnQgPSBjcmVhdGUoYXNzaWdubWVudCB8fCB7fSk7XG4gIFxuICBpZihlbC5sZW5ndGggJiYgaXNVbmRlZmluZWQoZWwubm9kZVR5cGUpKXtcbiAgICAvL25vZGUgbGlzdFxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBlbC5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIHRyYXZlbEVsKGVsW2ldLCB2bSwgYXNzaWdubWVudCk7XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuICBcbiAgaWYoZWwubm9kZVR5cGUgPT09IE5PREVUWVBFLkNPTU1FTlQpe1xuICAgIC8v5rOo6YeK6IqC54K5XG4gICAgcmV0dXJuO1xuICB9ZWxzZSBpZihlbC5ub2RlVHlwZSA9PT0gTk9ERVRZUEUuVEVYVCl7XG4gICAgLy/mlofmnKzoioLngrlcbiAgICBjaGVja1RleHQoZWwsIHZtLCBhc3NpZ25tZW50KTtcbiAgICByZXR1cm47XG4gIH1cbiAgXG4gIC8v6YGH5YiwIHRlcm1pbmFsIOS4uiB0cnVlIOeahCBkaXJlY3RpdmUg5bGe5oCn5LiN5YaN6YGN5Y6GXG4gIGlmKGNoZWNrQXR0cihlbCwgdm0sIGFzc2lnbm1lbnQpKXtcbiAgICByZXR1cm47XG4gIH1cbiAgXG4gIGZvcih2YXIgY2hpbGQgPSBlbC5maXJzdENoaWxkLCBuZXh0OyBjaGlsZDsgKXtcbiAgICBuZXh0ID0gY2hpbGQubmV4dFNpYmxpbmc7XG4gICAgdHJhdmVsRWwoY2hpbGQsIHZtLCBhc3NpZ25tZW50KTtcbiAgICBjaGlsZCA9IG5leHQ7XG4gIH1cbn1cblxuLy/pgY3ljoblsZ7mgKdcbmZ1bmN0aW9uIGNoZWNrQXR0cihlbCwgdm0sIGFzc2lnbm1lbnQpIHtcbiAgdmFyIHByZWZpeCA9IEFudC5wcmVmaXhcbiAgICAsIGRpcnMgPSBnZXREaXIoZWwsIEFudC5kaXJlY3RpdmVzLCBwcmVmaXgpXG4gICAgLCBkaXJcbiAgICAsIHRlcm1pbmFsUHJpb3JpdHksIHRlcm1pbmFsXG4gICAgO1xuICBcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBkaXJzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGRpciA9IGRpcnNbaV07XG4gICAgZGlyLmFzc2lnbm1lbnQgPSBhc3NpZ25tZW50O1xuICAgXG4gICAgLy/lr7nkuo4gdGVybWluYWwg5Li6IHRydWUg55qEIGRpcmVjdGl2ZSwg5Zyo6Kej5p6Q5a6M5YW255u45ZCM5p2D6YeN55qEIGRpcmVjdGl2ZSDlkI7kuK3mlq3pgY3ljobor6XlhYPntKBcbiAgICBpZih0ZXJtaW5hbFByaW9yaXR5ID4gZGlyLnByaW9yaXR5KSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgXG4gICAgc2V0QmluZGluZyh2bSwgZGlyKTtcbiAgIFxuICAgIGVsLnJlbW92ZUF0dHJpYnV0ZShkaXIubm9kZS5ub2RlTmFtZSk7XG4gICAgXG4gICAgaWYoZGlyLnRlcm1pbmFsKSB7XG4gICAgICB0ZXJtaW5hbCA9IHRydWU7XG4gICAgICB0ZXJtaW5hbFByaW9yaXR5ID0gZGlyLnByaW9yaXR5O1xuICAgIH1cbiAgfVxuICBcbiAgaWYodGVybWluYWwpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufVxuXG52YXIgcGFydGlhbFJlZyA9IC9ePlxccyooPz0uKykvO1xuLy/lpITnkIbmlofmnKzoioLngrnkuK3nmoTnu5HlrprljaDkvY3nrKYoe3suLi59fSlcbmZ1bmN0aW9uIGNoZWNrVGV4dChub2RlLCB2bSwgYXNzaWdubWVudCkge1xuICBpZih0b2tlbi5oYXNUb2tlbihub2RlLm5vZGVWYWx1ZSkpIHtcbiAgICB2YXIgdG9rZW5zID0gdG9rZW4ucGFyc2VUb2tlbihub2RlLm5vZGVWYWx1ZSlcbiAgICAgICwgdGV4dE1hcCA9IHRva2Vucy50ZXh0TWFwXG4gICAgICAsIGVsID0gbm9kZS5wYXJlbnROb2RlXG4gICAgICBcbiAgICAgICwgdCwgZGlyXG4gICAgICA7XG4gICAgXG4gICAgLy/lsIZ7e2tleX195YiG5Ymy5oiQ5Y2V54us55qE5paH5pys6IqC54K5XG4gICAgaWYodGV4dE1hcC5sZW5ndGggPiAxKSB7XG4gICAgICB0ZXh0TWFwLmZvckVhY2goZnVuY3Rpb24odGV4dCkge1xuICAgICAgICB2YXIgdG4gPSBkb2MuY3JlYXRlVGV4dE5vZGUodGV4dCk7XG4gICAgICAgIGVsLmluc2VydEJlZm9yZSh0biwgbm9kZSk7XG4gICAgICAgIGNoZWNrVGV4dCh0biwgdm0sIGFzc2lnbm1lbnQpO1xuICAgICAgfSk7XG4gICAgICBlbC5yZW1vdmVDaGlsZChub2RlKTtcbiAgICB9ZWxzZXtcbiAgICAgIHQgPSB0b2tlbnNbMF07XG4gICAgICAvL+WGhee9ruWQhOWNoOS9jeespuWkhOeQhi4gXG4gICAgICAvL+WumuS5ieaWsOeahOWPguaVsCwg5bCG5YW25pS+5YiwIGRpcmVjdGl2ZSDkuK3lpITnkIY/XG4gICAgICBpZihwYXJ0aWFsUmVnLnRlc3QodC5wYXRoKSkge1xuICAgICAgICB0LnBhdGggPSB0LnBhdGgucmVwbGFjZShwYXJ0aWFsUmVnLCAnJyk7XG4gICAgICAgIGRpciA9IGNyZWF0ZShBbnQuZGlyZWN0aXZlcy5wYXJ0aWFsKTtcbiAgICAgIH1lbHNle1xuICAgICAgICBkaXIgPSBjcmVhdGUodC5lc2NhcGUgPyBBbnQuZGlyZWN0aXZlcy50ZXh0IDogQW50LmRpcmVjdGl2ZXMuaHRtbCk7XG4gICAgICB9XG4gICAgICBzZXRCaW5kaW5nKHZtLCBleHRlbmQoZGlyLCB0LCB7XG4gICAgICAgIGVsOiBub2RlXG4gICAgICAsIGFzc2lnbm1lbnQ6IGFzc2lnbm1lbnRcbiAgICAgIH0pKTtcbiAgICB9XG4gIH1cbn1cblxuLy/ojrflj5bkuIDkuKrlhYPntKDkuIrmiYDmnInnlKggSFRNTCDlsZ7mgKflrprkuYnnmoTmjIfku6RcbmZ1bmN0aW9uIGdldERpcihlbCwgZGlyZWN0aXZlcywgcHJlZml4KSB7XG4gIHByZWZpeCA9IHByZWZpeCB8fCAnJztcbiAgZGlyZWN0aXZlcyA9IGRpcmVjdGl2ZXMgfHwge307XG4gIFxuICB2YXIgYXR0ciwgYXR0ck5hbWUsIGRpck5hbWVcbiAgICAsIGRpcnMgPSBbXSwgZGlyLCBhbmNob3JzID0ge31cbiAgICAsIHBhcmVudCA9IGVsLnBhcmVudE5vZGVcbiAgICA7XG4gICAgXG4gIGZvcih2YXIgaSA9IGVsLmF0dHJpYnV0ZXMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pe1xuICAgIGF0dHIgPSBlbC5hdHRyaWJ1dGVzW2ldO1xuICAgIGF0dHJOYW1lID0gYXR0ci5ub2RlTmFtZTtcbiAgICBkaXJOYW1lID0gYXR0ck5hbWUuc2xpY2UocHJlZml4Lmxlbmd0aCk7XG4gICAgaWYoYXR0ck5hbWUuaW5kZXhPZihwcmVmaXgpID09PSAwICYmIChkaXJOYW1lIGluIGRpcmVjdGl2ZXMpKSB7XG4gICAgICBkaXIgPSBjcmVhdGUoZGlyZWN0aXZlc1tkaXJOYW1lXSk7XG4gICAgICBkaXIuZGlyTmFtZSA9IGRpck5hbWVcbiAgICB9ZWxzZSBpZih0b2tlbi5oYXNUb2tlbihhdHRyLnZhbHVlKSkge1xuICAgICAgZGlyID0gY3JlYXRlKGRpcmVjdGl2ZXNbJ2F0dHInXSk7XG4gICAgICBkaXIuZGlycyA9IHRva2VuLnBhcnNlVG9rZW4oYXR0ci52YWx1ZSk7XG4gICAgICBkaXIuZGlyTmFtZSA9IGF0dHJOYW1lLmluZGV4T2YocHJlZml4KSA9PT0gMCA/IGRpck5hbWUgOiBhdHRyTmFtZSA7XG4gICAgfWVsc2V7XG4gICAgICBkaXIgPSBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgaWYoZGlyKSB7XG4gICAgICBpZihkaXIuYW5jaG9yICYmICFhbmNob3JzLnN0YXJ0KSB7XG4gICAgICAgIC8v5ZCM5LiA5Liq5YWD57Sg5LiK55qEIGRpcmVjdGl2ZSDlhbHkuqvlkIzkuIDlr7nplJrngrlcbiAgICAgICAgYW5jaG9ycy5zdGFydCA9IGRvYy5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICAgIHBhcmVudC5pbnNlcnRCZWZvcmUoYW5jaG9ycy5zdGFydCwgZWwpO1xuICAgICAgICBcbiAgICAgICAgYW5jaG9ycy5lbmQgPSBkb2MuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgICAgICBpZihlbC5uZXh0U2libGluZykge1xuICAgICAgICAgIHBhcmVudC5pbnNlcnRCZWZvcmUoYW5jaG9ycy5lbmQsIGVsLm5leHRTaWJsaW5nKTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgcGFyZW50LmFwcGVuZENoaWxkKGFuY2hvcnMuZW5kKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZGlycy5wdXNoKGV4dGVuZChkaXIsIHtlbDogZWwsIG5vZGU6IGF0dHIsIG5vZGVOYW1lOiBhdHRyTmFtZSwgcGF0aDogYXR0ci52YWx1ZSwgYW5jaG9yczogZGlyLmFuY2hvciA/IGFuY2hvcnMgOiBudWxsfSkpO1xuICAgIH1cbiAgfVxuICBkaXJzLnNvcnQoZnVuY3Rpb24oZDAsIGQxKSB7XG4gICAgcmV0dXJuIGQxLnByaW9yaXR5IC0gZDAucHJpb3JpdHk7XG4gIH0pO1xuICByZXR1cm4gZGlycztcbn1cblxuZnVuY3Rpb24gc2V0QmluZGluZyh2bSwgZGlyKSB7XG4gIGlmKGRpci5yZXBsYWNlKSB7XG4gICAgdmFyIGVsID0gZGlyLmVsO1xuICAgIGlmKGlzRnVuY3Rpb24oZGlyLnJlcGxhY2UpKSB7XG4gICAgICBkaXIubm9kZSA9IGRpci5yZXBsYWNlKCk7XG4gICAgfWVsc2UgaWYoZGlyLnJlcGxhY2Upe1xuICAgICAgLy9kaXIubm9kZSA9IGRvYy5jcmVhdGVDb21tZW50KGRpci50eXBlICsgJyA9ICcgKyBkaXIucGF0aCk7XG4gICAgICBkaXIubm9kZSA9IGRvYy5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgfVxuICAgIFxuICAgIGRpci5lbCA9IGRpci5lbC5wYXJlbnROb2RlO1xuICAgIGRpci5lbC5yZXBsYWNlQ2hpbGQoZGlyLm5vZGUsIGVsKTtcbiAgfVxuICBcbiAgZGlyLmxpbmsodm0pO1xuICBcbiAgaWYoZGlyLmRpcnMpIHtcbiAgICBkaXIuZGlycy5mb3JFYWNoKGZ1bmN0aW9uKGQpIHtcbiAgICAgIGFkZFdhdGNoZXIodm0sIGV4dGVuZChjcmVhdGUoZGlyKSwgZCkpO1xuICAgIH0pO1xuICB9ZWxzZXtcbiAgICBhZGRXYXRjaGVyKHZtLCBkaXIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGFkZFdhdGNoZXIodm0sIGRpcikge1xuICBpZihkaXIucGF0aCkge1xuICAgIHJldHVybiBuZXcgV2F0Y2hlcih2bSwgZGlyKTtcbiAgfVxufVxuXG52YXIgZXhQYXJzZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIHRoYXQgPSB0aGlzO1xuICB2YXIgYXN0ID0gcGFyc2UocGF0aCwgdGhpcy50b2tlbi50eXBlKTtcbiAgdmFyIHN1bW1hcnkgPSBldmFsdWF0ZS5zdW1tYXJ5KGFzdCk7XG4gICAgXG4gIGV4dGVuZCh0aGlzLnRva2VuLCBzdW1tYXJ5KTtcbiAgZXh0ZW5kKHRoaXMsIHN1bW1hcnkpO1xuICB0aGlzLl9hc3QgPSBhc3Q7XG59O1xuXG5mdW5jdGlvbiBXYXRjaGVyKHJlbGF0aXZlVm0sIHRva2VuKSB7XG4gIHRoaXMudG9rZW4gPSB0b2tlbjtcbiAgdGhpcy5yZWxhdGl2ZVZtID0gcmVsYXRpdmVWbTtcbiAgdGhpcy5hbnQgPSByZWxhdGl2ZVZtLiRyb290LiRhbnQ7XG4gIFxuICB0aGlzLnZhbCA9IE5hTjtcbiAgXG4gIGV4UGFyc2UuY2FsbCh0aGlzLCB0b2tlbi5wYXRoKTtcbiAgXG4gIGZvcih2YXIgaSA9IDAsIGwgPSB0aGlzLnBhdGhzLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgcmVsYXRpdmVWbS4kZ2V0Vk0odGhpcy5wYXRoc1tpXSwge2Fzc2lnbm1lbnQ6IHRva2VuLmFzc2lnbm1lbnR9KS4kd2F0Y2hlcnMucHVzaCh0aGlzKTtcbiAgfVxuICBcbiAgdmFyIHJ1bjtcbiAgZm9yKHZhciBpID0gMCwgbCA9IHRoaXMubG9jYWxzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHJ1biA9IHJ1biB8fCAodGhpcy5sb2NhbHNbaV0gaW4gdG9rZW4uYXNzaWdubWVudCkgJiYgdG9rZW4uYXNzaWdubWVudFt0aGlzLmxvY2Fsc1tpXV0gIT09IHJlbGF0aXZlVm07XG4gIH1cbiAgXG4gIHRoaXMuc3RhdGUgPSBXYXRjaGVyLlNUQVRFX1JFQURZXG4gIFxuICAvL+eri+WNs+iuoeeul+eahOaDheWGtTpcbiAgLy8xLiDmuLLmn5Pov4flkI7mlrDliqDlhaXnmoTmqKHmnb9cbiAgLy8yLiDmsqHmnInlj5jph4/nmoTooajovr7lvI9cbiAgLy8zLiDlrZDkvZznlKjln5/lvJXnlKjniLbnuqfkvZznlKjln59cbiAgaWYodGhpcy5hbnQuaXNSZW5kZXJlZCB8fCAhdGhpcy5sb2NhbHMubGVuZ3RoIHx8IHJ1bikge1xuICAgIHRoaXMuZm4oKTtcbiAgfVxufVxuXG5leHRlbmQoV2F0Y2hlciwge1xuICBTVEFURV9SRUFEWTogMFxuLCBTVEFURV9DQUxMRUQ6IDFcbn0sIENsYXNzKTtcblxuZXh0ZW5kKFdhdGNoZXIucHJvdG90eXBlLCB7XG4gIGZuOiBmdW5jdGlvbih2YWxzKSB7XG4gICAgdmFyIGtleVxuICAgICAgLCBkaXIgPSB0aGlzLnRva2VuXG4gICAgICAsIG5ld1ZhbFxuICAgICAgO1xuICAgICAgXG4gICAgdmFscyA9IHZhbHMgfHwge31cbiAgICBcbiAgICBmb3IodmFyIGkgPSAwLCBsID0gdGhpcy5sb2NhbHMubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgIGtleSA9IHRoaXMubG9jYWxzW2ldO1xuICAgICAgdmFsc1trZXldID0gdGhpcy5yZWxhdGl2ZVZtLiRnZXRWTShrZXksIHthc3NpZ25tZW50OiBkaXIuYXNzaWdubWVudH0pLiRnZXREYXRhKCk7XG4gICAgfVxuICAgIFxuICAgIG5ld1ZhbCA9IHRoaXMuZ2V0VmFsdWUodmFscyk7XG4gICAgICBcbiAgICBpZihuZXdWYWwgIT09IHRoaXMudmFsKXtcbiAgICAgIHRyeXtcbiAgICAgICAgdGhpcy50b2tlbi51cGRhdGUobmV3VmFsLCB0aGlzLnZhbCk7XG4gICAgICAgIHRoaXMudmFsID0gbmV3VmFsO1xuICAgICAgfWNhdGNoKGUpe1xuICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnN0YXRlID0gV2F0Y2hlci5TVEFURV9DQUxMRUQ7XG4gIH1cbiwgZ2V0VmFsdWU6IGZ1bmN0aW9uKHZhbHMpIHtcbiAgICB2YXIgZmlsdGVycyA9IHRoaXMuZmlsdGVyc1xuICAgICAgLCB2YWxcbiAgICAgICwgYW50ID0gdGhpcy5hbnRcbiAgICAgIDtcbiAgICBcbiAgICAvLyBmb3IodmFyIGkgPSAwLCBsID0gZmlsdGVycy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgLy8gaWYoIWFudC5maWx0ZXJzW2ZpbHRlcnNbaV1dKXtcbiAgICAgICAgLy8gY29uc29sZS5lcnJvcignRmlsdGVyOiAnICsgZmlsdGVyc1tpXSArICcgbm90IGZvdW5kIScpO1xuICAgICAgLy8gfVxuICAgIC8vIH1cbiAgICBcbiAgICB0cnl7XG4gICAgICB2YWwgPSBldmFsdWF0ZS5ldmFsKHRoaXMuX2FzdCwge2xvY2FsczogdmFscywgZmlsdGVyczogYW50LmZpbHRlcnN9KTtcbiAgICB9Y2F0Y2goZSl7XG4gICAgICB2YWwgPSAnJztcbiAgICB9XG4gICAgcmV0dXJuIHZhbDtcbiAgfVxufSk7XG5cbmZ1bmN0aW9uIFZpZXdNb2RlbChvcHRzKSB7XG4gIGV4dGVuZCh0aGlzLCB7XG4gICAgJGtleTogJydcbiAgLCAkcm9vdDogdGhpc1xuICAsICR3YXRjaGVyczogW11cbiAgfSwgb3B0cyk7XG59XG5cblZpZXdNb2RlbC5wcm90b3R5cGUgPSB7XG4gICRyb290OiBudWxsXG4sICRwYXJlbnQ6IG51bGxcblxuLCAkYW50OiBudWxsXG4sICRrZXk6IG51bGxcblxuLCAkd2F0Y2hlcnM6IG51bGxcblxuLCAkaW5kZXg6IG51bGxcbiwgJHZhbHVlOiBOYU5cbiAgXG4vL+iOt+WPliB2bSDkuI3lrZjlnKjnmoTor53lsIbmlrDlu7rkuIDkuKouXG4vL29wdHMuc3RyaWN0ICDkuI3oh6rliqjmlrDlu7ogdm1cbi8vb3B0cy5zY29wZVxuLCAkZ2V0Vk06IGZ1bmN0aW9uKHBhdGgsIG9wdHMpIHtcbiAgICBwYXRoID0gcGF0aCArICcnO1xuICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgIFxuICAgIHZhciBrZXlcbiAgICAgICwgY3VyID0gb3B0cy5zY29wZSB8fCB0aGlzLiRyb290XG4gICAgICAsIGFzc2lnbm1lbnQgPSBvcHRzLmFzc2lnbm1lbnQgfHwge31cbiAgICAgICwga2V5Q2hhaW4gPSB1dGlscy5wYXJzZUtleVBhdGgocGF0aClcbiAgICAgIDtcbiAgICAgIFxuICAgIGlmKGtleUNoYWluWzBdIGluIGFzc2lnbm1lbnQpIHtcbiAgICAgIGN1ciA9IGFzc2lnbm1lbnRba2V5Q2hhaW5bMF1dO1xuICAgICAga2V5Q2hhaW4uc2hpZnQoKTtcbiAgICB9XG4gICAgaWYocGF0aCl7XG4gICAgICBmb3IodmFyIGkgPSAwLCBsID0ga2V5Q2hhaW4ubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgICAga2V5ID0ga2V5Q2hhaW5baV07XG4gICAgICAgIFxuICAgICAgICBpZighY3VyW2tleV0pe1xuICAgICAgICAgIGlmKG9wdHMuc3RyaWN0KXsgcmV0dXJuIG51bGw7IH1cbiAgICAgICAgICBjdXJba2V5XSA9IG5ldyBWaWV3TW9kZWwoe1xuICAgICAgICAgICAgJHBhcmVudDogY3VyXG4gICAgICAgICAgLCAkcm9vdDogY3VyLiRyb290XG4gICAgICAgICAgLCAka2V5OiBrZXlcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY3VyID0gY3VyW2tleV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjdXI7XG4gIH1cbiAgXG4sICRnZXRLZXlQYXRoOiBmdW5jdGlvbigpIHtcbiAgICB2YXIga2V5UGF0aCA9IHRoaXMuJGtleVxuICAgICAgLCBjdXIgPSB0aGlzXG4gICAgICA7XG4gICAgd2hpbGUoY3VyID0gY3VyLiRwYXJlbnQpe1xuICAgICAgaWYoY3VyLiRrZXkpe1xuICAgICAgICBrZXlQYXRoID0gY3VyLiRrZXkgKyAnLicgKyBrZXlQYXRoO1xuICAgICAgfWVsc2V7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4ga2V5UGF0aDtcbiAgfVxuXG4sICRnZXREYXRhOiBmdW5jdGlvbihrZXkpIHtcbiAgICB2YXIgY3VyVmFsID0gZGVlcEdldChrZXksIHRoaXMuJHJvb3QuJGFudC5nZXQodGhpcy4kZ2V0S2V5UGF0aCgpKSk7XG4gICAgcmV0dXJuIGN1clZhbDtcbiAgfVxuXG5cbiwgJHVwZGF0ZTogZnVuY3Rpb24gKGRhdGEsIGlzRXh0ZW5kLCBpc0J1YmJsZSkge1xuICAgIHZhciBtYXAgPSBpc0V4dGVuZCA/IGRhdGEgOiB0aGlzXG4gICAgICAsIHBhcmVudCA9IHRoaXNcbiAgICAgIDtcbiAgICBcbiAgICBmb3IodmFyIGkgPSAwLCBsID0gdGhpcy4kd2F0Y2hlcnMubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgIGlmKCh0aGlzLiR2YWx1ZSAhPT0gZGF0YSkgfHwgdGhpcy4kd2F0Y2hlcnNbaV0uc3RhdGUgPT09IFdhdGNoZXIuU1RBVEVfUkVBRFkpe1xuICAgICAgICB0aGlzLiR3YXRjaGVyc1tpXS5mbigpO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLiR2YWx1ZSA9IGRhdGE7XG4gICAgXG4gICAgaWYoaXNPYmplY3QobWFwKSl7XG4gICAgICBmb3IodmFyIHBhdGggaW4gbWFwKSB7XG4gICAgICAgIC8v5Lyg5YWl55qE5pWw5o2u6ZSu5YC85LiN6IO95ZKMIHZtIOS4reeahOiHquW4puWxnuaAp+WQjeebuOWQjC5cbiAgICAgICAgLy/miYDku6XkuI3mjqjojZDkvb/nlKggJyQnIOS9nOS4uiBKU09OIOaVsOaNrumUruWAvOeahOW8gOWktC5cbiAgICAgICAgaWYodGhpcy5oYXNPd25Qcm9wZXJ0eShwYXRoKSAmJiAoIShwYXRoIGluIFZpZXdNb2RlbC5wcm90b3R5cGUpKSl7XG4gICAgICAgICAgdGhpc1twYXRoXS4kdXBkYXRlKGRhdGEgPyBkYXRhW3BhdGhdIDogdm9pZCgwKSwgaXNFeHRlbmQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYoaXNCdWJibGUpe1xuICAgICAgd2hpbGUocGFyZW50ID0gcGFyZW50LiRwYXJlbnQpe1xuICAgICAgICBmb3IodmFyIGkgPSAwLCBsID0gcGFyZW50LiR3YXRjaGVycy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgICAgIHBhcmVudC4kd2F0Y2hlcnNbaV0uZm4oKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuLCAkYnVpbGQ6IGZ1bmN0aW9uKGVsLCBhc3NpZ25tZW50KSB7XG4gICAgdHJhdmVsRWwoZWwsIHRoaXMsIGFzc2lnbm1lbnQpO1xuICB9XG59O1xuXG5BbnQuX3BhcnNlID0gcGFyc2U7XG5BbnQuX2V2YWwgPSBldmFsdWF0ZS5ldmFsO1xuQW50Ll9zdW1tYXJ5ID0gZXZhbHVhdGUuc3VtbWFyeTtcbkFudC52ZXJzaW9uID0gJyVWRVJTSU9OJztcblxubW9kdWxlLmV4cG9ydHMgPSBBbnQ7XG5cbndpbmRvdy5BbnQgPSBBbnQ7IiwidmFyIGV4dGVuZCA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKS5leHRlbmQ7XG5cbnZhciBDbGFzcyA9IHtcbiAgLyoqIFxuICAgKiDmnoTpgKDlh73mlbDnu6fmib8uIFxuICAgKiDlpoI6IGB2YXIgQ2FyID0gQW50LmV4dGVuZCh7ZHJpdmU6IGZ1bmN0aW9uKCl7fX0pOyBuZXcgQ2FyKCk7YFxuICAgKiBAcGFyYW0ge09iamVjdH0gW3Byb3RvUHJvcHNdIOWtkOaehOmAoOWHveaVsOeahOaJqeWxleWOn+Wei+WvueixoVxuICAgKiBAcGFyYW0ge09iamVjdH0gW3N0YXRpY1Byb3BzXSDlrZDmnoTpgKDlh73mlbDnmoTmianlsZXpnZnmgIHlsZ7mgKdcbiAgICogQHJldHVybiB7RnVuY3Rpb259IOWtkOaehOmAoOWHveaVsFxuICAgKi9cbiAgZXh0ZW5kOiBmdW5jdGlvbiAocHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHtcbiAgICBwcm90b1Byb3BzID0gcHJvdG9Qcm9wcyB8fCB7fTtcbiAgICB2YXIgY29uc3RydWN0b3IgPSBwcm90b1Byb3BzLmhhc093blByb3BlcnR5KCdjb25zdHJ1Y3RvcicpID8gcHJvdG9Qcm9wcy5jb25zdHJ1Y3RvciA6IGZ1bmN0aW9uKCl7IHJldHVybiBzdXAuYXBwbHkodGhpcywgYXJndW1lbnRzKTsgfVxuICAgIHZhciBzdXAgPSB0aGlzO1xuICAgIHZhciBGbiA9IGZ1bmN0aW9uKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gY29uc3RydWN0b3I7IH07XG4gICAgXG4gICAgRm4ucHJvdG90eXBlID0gc3VwLnByb3RvdHlwZTtcbiAgICBjb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBuZXcgRm4oKTtcbiAgICBleHRlbmQoY29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTtcbiAgICBleHRlbmQoY29uc3RydWN0b3IsIHN1cCwgc3RhdGljUHJvcHMsIHtfX3N1cGVyX186IHN1cC5wcm90b3R5cGV9KTtcbiAgICBcbiAgICByZXR1cm4gY29uc3RydWN0b3I7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2xhc3M7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKVxuICA7XG5cbi8qKlxuICog5Li6IEFudCDmnoTpgKDlh73mlbDmt7vliqDmjIfku6QgKGRpcmVjdGl2ZSkuIGBBbnQuZGlyZWN0aXZlYFxuICogQHBhcmFtIHtTdHJpbmd9IGtleSBkaXJlY3RpdmUg5ZCN56ewXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdHNdIGRpcmVjdGl2ZSDlj4LmlbBcbiAqIEBwYXJhbSB7TnVtYmVyfSBvcHRzLnByaW9yaXR5PTAgZGlyZWN0aXZlIOS8mOWFiOe6py4g5ZCM5LiA5Liq5YWD57Sg5LiK55qE5oyH5Luk5oyJ54Wn5LyY5YWI57qn6aG65bqP5omn6KGMLiBcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0cy50ZXJtaW5hbD1mYWxzZSDmiafooYzor6UgZGlyZWN0aXZlIOWQjiwg5piv5ZCm57uI5q2i5ZCO57utIGRpcmVjdGl2ZSDmiafooYwuXG4gKiAgIHRlcm1pbmFsIOS4uuecn+aXtiwg5LiO6K+lIGRpcmVjdGl2ZSDkvJjlhYjnuqfnm7jlkIznmoQgZGlyZWN0aXZlIOS7jeS8mue7p+e7reaJp+ihjCwg6L6D5L2O5LyY5YWI57qn55qE5omN5Lya6KKr5b+955WlLlxuICovXG5mdW5jdGlvbiBkaXJlY3RpdmUoa2V5LCBvcHRzKSB7XG4gIHZhciBkaXJzID0gdGhpcy5kaXJlY3RpdmVzID0gdGhpcy5kaXJlY3RpdmVzIHx8IHt9O1xuICBcbiAgcmV0dXJuIGRpcnNba2V5XSA9IG5ldyBEaXJlY3RpdmUoa2V5LCBvcHRzKTtcbn1cblxuZXhwb3J0cy5kaXJlY3RpdmUgPSBkaXJlY3RpdmU7XG5cbmZ1bmN0aW9uIERpcmVjdGl2ZShrZXksIG9wdHMpIHtcbiAgdXRpbHMuZXh0ZW5kKHRoaXMsIHtcbiAgICBwcmlvcml0eTogMFxuICAsIHR5cGU6IGtleVxuICAsIHRlcm1pbmFsOiBmYWxzZVxuICAsIHJlcGxhY2U6IGZhbHNlXG4gIH0sIG9wdHMpO1xufVxuXG5EaXJlY3RpdmUucHJvdG90eXBlID0ge1xuICBsaW5rOiB1dGlscy5ub29wXG4sIHVwZGF0ZTogdXRpbHMubm9vcFxuLCB0ZWFyRG93bjogdXRpbHMubm9vcFxufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgYXR0clBvc3RSZWcgPSAvXFw/JC87XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBsaW5rOiBmdW5jdGlvbigpIHtcbiAgICBpZih0aGlzLmRpck5hbWUgPT09IHRoaXMudHlwZSkgey8vYXR0ciBiaW5kaW5nXG4gICAgICB0aGlzLmF0dHJzID0ge307XG4gICAgfWVsc2Uge1xuICAgICAgaWYoYXR0clBvc3RSZWcudGVzdCh0aGlzLmRpck5hbWUpKSB7Ly8gc29tZUF0dHI/IGNvbmRpdGlvbiBiaW5kaW5nXG4gICAgICAgIHRoaXMuZGlyTmFtZSA9IHRoaXMuZGlyTmFtZS5yZXBsYWNlKGF0dHJQb3N0UmVnLCAnJyk7XG4gICAgICAgIHRoaXMuY29uZGl0aW9uYWxBdHRyID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiwgdXBkYXRlOiBmdW5jdGlvbih2YWwpIHtcbiAgICB2YXIgZWwgPSB0aGlzLmVsO1xuICAgIGlmKHRoaXMuZGlyTmFtZSA9PT0gdGhpcy50eXBlKSB7XG4gICAgICBmb3IodmFyIGF0dHIgaW4gdmFsKSB7XG4gICAgICAgIHNldEF0dHIoZWwsIGF0dHIsIHZhbFthdHRyXSk7XG4gICAgICAgIC8vaWYodmFsW2F0dHJdKSB7XG4gICAgICAgICAgZGVsZXRlIHRoaXMuYXR0cnNbYXR0cl07XG4gICAgICAgIC8vfVxuICAgICAgfVxuICAgICAgXG4gICAgICBmb3IodmFyIGF0dHIgaW4gdGhpcy5hdHRycykge1xuICAgICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoYXR0cik7XG4gICAgICB9XG4gICAgICB0aGlzLmF0dHJzID0gdmFsO1xuICAgIH1lbHNle1xuICAgICAgaWYodGhpcy5jb25kaXRpb25hbEF0dHIpIHtcbiAgICAgICAgdmFsID8gc2V0QXR0cihlbCwgdGhpcy5kaXJOYW1lLCB2YWwpIDogZWwucmVtb3ZlQXR0cmlidXRlKHRoaXMuZGlyTmFtZSk7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgdGhpcy50ZXh0TWFwW3RoaXMucG9zaXRpb25dID0gdmFsICYmICh2YWwgKyAnJyk7XG4gICAgICAgIHNldEF0dHIoZWwsIHRoaXMuZGlyTmFtZSwgdGhpcy50ZXh0TWFwLmpvaW4oJycpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cblxuLy9JRSDmtY/op4jlmajlvojlpJrlsZ7mgKfpgJrov4cgYHNldEF0dHJpYnV0ZWAg6K6+572u5ZCO5peg5pWILiBcbi8v6L+Z5Lqb6YCa6L+HIGBlbFthdHRyXSA9IHZhbHVlYCDorr7nva7nmoTlsZ7mgKfljbTog73lpJ/pgJrov4cgYHJlbW92ZUF0dHJpYnV0ZWAg5riF6ZmkLlxuZnVuY3Rpb24gc2V0QXR0cihlbCwgYXR0ciwgdmFsKXtcbiAgdHJ5e1xuICAgIGlmKCgoYXR0ciBpbiBlbCkgfHwgYXR0ciA9PT0gJ2NsYXNzJykpe1xuICAgICAgaWYoYXR0ciA9PT0gJ3N0eWxlJyAmJiBlbC5zdHlsZS5zZXRBdHRyaWJ1dGUpe1xuICAgICAgICBlbC5zdHlsZS5zZXRBdHRyaWJ1dGUoJ2Nzc1RleHQnLCB2YWwpO1xuICAgICAgfWVsc2UgaWYoYXR0ciA9PT0gJ2NsYXNzJyl7XG4gICAgICAgIGVsLmNsYXNzTmFtZSA9IHZhbDtcbiAgICAgIH1lbHNle1xuICAgICAgICBlbFthdHRyXSA9IHR5cGVvZiBlbFthdHRyXSA9PT0gJ2Jvb2xlYW4nID8gdHJ1ZSA6IHZhbDtcbiAgICAgIH1cbiAgICB9XG4gIH1jYXRjaChlKXt9XG4gIHRyeXtcbiAgICAvL2Nocm9tZSBzZXRhdHRyaWJ1dGUgd2l0aCBge3t9fWAgd2lsbCB0aHJvdyBhbiBlcnJvclxuICAgIGVsLnNldEF0dHJpYnV0ZShhdHRyLCB2YWwpO1xuICB9Y2F0Y2goZSl7IGNvbnNvbGUud2FybihlKSB9XG59IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBkb2MgPSByZXF1aXJlKCcuLi9kb2N1bWVudC5qcycpXG4gICwgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpXG4gIDtcblxudmFyIGRpcnMgPSB7fTtcblxuXG5kaXJzLnRleHQgPSB7XG4gIHRlcm1pbmFsOiB0cnVlXG4sIHJlcGxhY2U6IGZ1bmN0aW9uKCkgeyByZXR1cm4gZG9jLmNyZWF0ZVRleHROb2RlKCcnKSB9XG4sIHVwZGF0ZTogZnVuY3Rpb24odmFsKSB7XG4gICAgdGhpcy5ub2RlLm5vZGVWYWx1ZSA9IHV0aWxzLmlzVW5kZWZpbmVkKHZhbCkgPyAnJyA6IHZhbDtcbiAgfVxufTtcblxuXG5kaXJzLmh0bWwgPSB7XG4gIHRlcm1pbmFsOiB0cnVlXG4sIHJlcGxhY2U6IHRydWVcbiwgbGluazogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5ub2RlcyA9IFtdO1xuICB9XG4sIHVwZGF0ZTogZnVuY3Rpb24odmFsKSB7XG4gICAgdmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZWwuaW5uZXJIVE1MID0gdXRpbHMuaXNVbmRlZmluZWQodmFsKSA/ICcnIDogdmFsO1xuICAgIFxuICAgIHZhciBub2RlO1xuICAgIHdoaWxlKG5vZGUgPSB0aGlzLm5vZGVzLnBvcCgpKSB7XG4gICAgICBub2RlLnBhcmVudE5vZGUgJiYgbm9kZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKG5vZGUpO1xuICAgIH1cbiAgICBcbiAgICB2YXIgbm9kZXMgPSBlbC5jaGlsZE5vZGVzO1xuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBub2Rlcy5sZW5ndGg7IGkgPCBsOyBpICsrKSB7XG4gICAgICB0aGlzLm5vZGVzLnB1c2gobm9kZXNbaV0pXG4gICAgICB0aGlzLmVsLmluc2VydEJlZm9yZSh0aGlzLm5vZGVzW2ldLCB0aGlzLm5vZGUpO1xuICAgIH1cbiAgfVxufTtcblxuICBcbmRpcnNbJ2lmJ10gPSB7XG4gIGFuY2hvcjogdHJ1ZVxuLCBsaW5rOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgcGFyZW50ID0gdGhpcy5lbC5wYXJlbnROb2RlO1xuICAgIHBhcmVudC5yZW1vdmVDaGlsZCh0aGlzLmVsKTtcbiAgfVxuLCB1cGRhdGU6IGZ1bmN0aW9uKHZhbCkge1xuICAgIHZhciBwYXJlbnQgPSB0aGlzLmFuY2hvcnMuZW5kLnBhcmVudE5vZGU7XG4gICAgaWYodmFsKSB7XG4gICAgICBpZighdGhpcy5zdGF0ZSkgeyBwYXJlbnQuaW5zZXJ0QmVmb3JlKHRoaXMuZWwsIHRoaXMuYW5jaG9ycy5lbmQpOyB9XG4gICAgfWVsc2V7XG4gICAgICBpZih0aGlzLnN0YXRlKSB7IHBhcmVudC5yZW1vdmVDaGlsZCh0aGlzLmVsKTsgfVxuICAgIH1cbiAgICB0aGlzLnN0YXRlID0gdmFsO1xuICB9XG59O1xuXG5cbmRpcnMucGFydGlhbCA9IHtcbiAgdGVybWluYWw6IHRydWVcbiwgcmVwbGFjZTogdHJ1ZVxuLCBsaW5rOiBmdW5jdGlvbih2bSkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB2YXIgcE5hbWUsIGFudCwgb3B0cztcbiAgICBwTmFtZSA9IHRoaXMucGF0aDtcbiAgICBhbnQgPSB2bS4kcm9vdC4kYW50O1xuICAgIG9wdHMgPSBhbnQub3B0aW9ucztcbiAgICBcbiAgICB0aGlzLnBhdGggPSAnJztcbiAgICBcbiAgICBhbnQuc2V0UGFydGlhbCh7XG4gICAgICBuYW1lOiBwTmFtZVxuICAgICwgY29udGVudDogb3B0cyAmJiBvcHRzLnBhcnRpYWxzICYmIG9wdHMucGFydGlhbHNbcE5hbWVdXG4gICAgLCB0YXJnZXQ6IGZ1bmN0aW9uKGVsKSB7IHRoYXQuZWwuaW5zZXJ0QmVmb3JlKGVsLCB0aGF0Lm5vZGUpIH1cbiAgICAsIGVzY2FwZTogdGhpcy5lc2NhcGVcbiAgICAsIHBhdGg6IHZtLiRnZXRLZXlQYXRoKClcbiAgICAsIGNvbnRleHQ6IHRoaXNcbiAgICB9KTtcbiAgfVxufTtcblxuZGlycy50ZW1wbGF0ZSA9IHtcbiAgcHJpb3JpdHk6IDEwMDAwXG4sIGxpbms6IGZ1bmN0aW9uKCkge1xuICAgIFxuICB9XG59O1xuICBcbmRpcnMucmVwZWF0ID0gcmVxdWlyZSgnLi9yZXBlYXQuanMnKTtcbmRpcnMuYXR0ciA9IHJlcXVpcmUoJy4vYXR0ci5qcycpO1xuZGlycy5tb2RlbCA9IHJlcXVpcmUoJy4vbW9kZWwuanMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBkaXJzOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpXG4gICwgaGFzVG9rZW4gPSByZXF1aXJlKCcuLi90b2tlbi5qcycpLmhhc1Rva2VuXG4gIDtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHRlbWluYWw6IHRydWVcbiwgcHJpb3JpdHk6IDFcbiwgbGluazogZnVuY3Rpb24odm0pIHtcbiAgICB2YXIga2V5UGF0aCA9IHRoaXMucGF0aDtcbiAgICBcbiAgICBpZigha2V5UGF0aCkgeyByZXR1cm4gZmFsc2U7IH1cbiAgICBcbiAgICB2YXIgZWwgPSB0aGlzLmVsXG4gICAgICAsIGV2ID0gJ2NoYW5nZSdcbiAgICAgICwgYXR0ciwgdmFsdWUgPSBhdHRyID0gJ3ZhbHVlJ1xuICAgICAgLCBhbnQgPSB2bS4kcm9vdC4kYW50XG4gICAgICAsIGN1ciA9IHZtLiRnZXRWTShrZXlQYXRoLCB7YXNzaWdubWVudDogdGhpcy5hc3NpZ25tZW50fSlcbiAgICAgICwgaXNTZXREZWZhdXQgPSB1dGlscy5pc1VuZGVmaW5lZChhbnQuZ2V0KGN1ci4kZ2V0S2V5UGF0aCgpKSkvL+eVjOmdoueahOWIneWni+WAvOS4jeS8muimhuebliBtb2RlbCDnmoTliJ3lp4vlgLxcbiAgICAgICwgY3JsZiA9IC9cXHJcXG4vZy8vSUUgOCDkuIsgdGV4dGFyZWEg5Lya6Ieq5Yqo5bCGIFxcbiDmjaLooYznrKbmjaLmiJAgXFxyXFxuLiDpnIDopoHlsIblhbbmm7/mjaLlm57mnaVcbiAgICAgICwgY2FsbGJhY2sgPSBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgICAvL+aJp+ihjOi/memHjOeahOaXtuWAmSwg5b6I5Y+v6IO9IHJlbmRlciDov5jmnKrmiafooYwuIHZtLiRnZXREYXRhKGtleVBhdGgpIOacquWumuS5iSwg5LiN6IO96L+U5Zue5paw6K6+572u55qE5YC8XG4gICAgICAgICAgdmFyIG5ld1ZhbCA9ICh2YWwgfHwgdm0uJGdldERhdGEoa2V5UGF0aCkgfHwgJycpICsgJydcbiAgICAgICAgICAgICwgdmFsID0gZWxbYXR0cl1cbiAgICAgICAgICAgIDtcbiAgICAgICAgICB2YWwgJiYgdmFsLnJlcGxhY2UgJiYgKHZhbCA9IHZhbC5yZXBsYWNlKGNybGYsICdcXG4nKSk7XG4gICAgICAgICAgaWYobmV3VmFsICE9PSB2YWwpeyBlbFthdHRyXSA9IG5ld1ZhbDsgfVxuICAgICAgICB9XG4gICAgICAsIGhhbmRsZXIgPSBmdW5jdGlvbihpc0luaXQpIHtcbiAgICAgICAgICB2YXIgdmFsID0gZWxbdmFsdWVdO1xuICAgICAgICAgIFxuICAgICAgICAgIHZhbC5yZXBsYWNlICYmICh2YWwgPSB2YWwucmVwbGFjZShjcmxmLCAnXFxuJykpO1xuICAgICAgICAgIGFudC5zZXQoY3VyLiRnZXRLZXlQYXRoKCksIHZhbCwge2lzQnViYmxlOiBpc0luaXQgIT09IHRydWV9KTtcbiAgICAgICAgfVxuICAgICAgLCBjYWxsSGFuZGxlciA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICBpZihlICYmIGUucHJvcGVydHlOYW1lICYmIGUucHJvcGVydHlOYW1lICE9PSBhdHRyKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICAgICAgICB9XG4gICAgICAsIGllID0gdXRpbHMuaWVcbiAgICAgIDtcbiAgICBcbiAgICBzd2l0Y2goZWwudGFnTmFtZSkge1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdmFsdWUgPSBhdHRyID0gJ2lubmVySFRNTCc7XG4gICAgICAgIC8vZXYgKz0gJyBibHVyJztcbiAgICAgIGNhc2UgJ0lOUFVUJzpcbiAgICAgIGNhc2UgJ1RFWFRBUkVBJzpcbiAgICAgICAgc3dpdGNoKGVsLnR5cGUpIHtcbiAgICAgICAgICBjYXNlICdjaGVja2JveCc6XG4gICAgICAgICAgICB2YWx1ZSA9IGF0dHIgPSAnY2hlY2tlZCc7XG4gICAgICAgICAgICAvL0lFNiwgSUU3IOS4i+ebkeWQrCBwcm9wZXJ0eWNoYW5nZSDkvJrmjII/XG4gICAgICAgICAgICBpZihpZSkgeyBldiArPSAnIGNsaWNrJzsgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3JhZGlvJzpcbiAgICAgICAgICAgIGF0dHIgPSAnY2hlY2tlZCc7XG4gICAgICAgICAgICBpZihpZSkgeyBldiArPSAnIGNsaWNrJzsgfVxuICAgICAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgZWwuY2hlY2tlZCA9IGVsLnZhbHVlID09PSB2bS4kZ2V0RGF0YShrZXlQYXRoKSArICcnO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlzU2V0RGVmYXV0ID0gZWwuY2hlY2tlZDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgaWYoIWFudC5vcHRpb25zLmxhenkpe1xuICAgICAgICAgICAgICBpZignb25pbnB1dCcgaW4gZWwpe1xuICAgICAgICAgICAgICAgIGV2ICs9ICcgaW5wdXQnO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vSUUg5LiL55qEIGlucHV0IOS6i+S7tuabv+S7o1xuICAgICAgICAgICAgICBpZihpZSkge1xuICAgICAgICAgICAgICAgIGV2ICs9ICcga2V5dXAgcHJvcGVydHljaGFuZ2UgY3V0JztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICBicmVhaztcbiAgICAgIGNhc2UgJ1NFTEVDVCc6XG4gICAgICAgIGlmKGVsLm11bHRpcGxlKXtcbiAgICAgICAgICBoYW5kbGVyID0gZnVuY3Rpb24oaXNJbml0KSB7XG4gICAgICAgICAgICB2YXIgdmFscyA9IFtdO1xuICAgICAgICAgICAgZm9yKHZhciBpID0gMCwgbCA9IGVsLm9wdGlvbnMubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgICAgICAgICAgaWYoZWwub3B0aW9uc1tpXS5zZWxlY3RlZCl7IHZhbHMucHVzaChlbC5vcHRpb25zW2ldLnZhbHVlKSB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhbnQuc2V0KGN1ci4kZ2V0S2V5UGF0aCgpLCB2YWxzLCB7aXNCdWJibGU6IGlzSW5pdCAhPT0gdHJ1ZX0pO1xuICAgICAgICAgIH07XG4gICAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIHZhbHMgPSB2bS4kZ2V0RGF0YShrZXlQYXRoKTtcbiAgICAgICAgICAgIGlmKHZhbHMgJiYgdmFscy5sZW5ndGgpe1xuICAgICAgICAgICAgICBmb3IodmFyIGkgPSAwLCBsID0gZWwub3B0aW9ucy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgICAgICAgICAgIGVsLm9wdGlvbnNbaV0uc2VsZWN0ZWQgPSB2YWxzLmluZGV4T2YoZWwub3B0aW9uc1tpXS52YWx1ZSkgIT09IC0xO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBpc1NldERlZmF1dCA9IGlzU2V0RGVmYXV0ICYmICFoYXNUb2tlbihlbFt2YWx1ZV0pO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIFxuICAgIHRoaXMudXBkYXRlID0gY2FsbGJhY2s7XG4gICAgXG4gICAgZXYuc3BsaXQoL1xccysvZykuZm9yRWFjaChmdW5jdGlvbihlKXtcbiAgICAgIHJlbW92ZUV2ZW50KGVsLCBlLCBjYWxsSGFuZGxlcik7XG4gICAgICBhZGRFdmVudChlbCwgZSwgY2FsbEhhbmRsZXIpO1xuICAgIH0pO1xuICAgIFxuICAgIC8v5qC55o2u6KGo5Y2V5YWD57Sg55qE5Yid5aeL5YyW6buY6K6k5YC86K6+572u5a+55bqUIG1vZGVsIOeahOWAvFxuICAgIGlmKGVsW3ZhbHVlXSAmJiBpc1NldERlZmF1dCl7XG4gICAgICAgaGFuZGxlcih0cnVlKTsgXG4gICAgfVxuICAgICAgXG4gIH1cbn07XG5cbmZ1bmN0aW9uIGFkZEV2ZW50KGVsLCBldmVudCwgaGFuZGxlcikge1xuICBpZihlbC5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgZWwuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgaGFuZGxlciwgZmFsc2UpO1xuICB9ZWxzZXtcbiAgICBlbC5hdHRhY2hFdmVudCgnb24nICsgZXZlbnQsIGhhbmRsZXIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUV2ZW50KGVsLCBldmVudCwgaGFuZGxlcikge1xuICBpZihlbC5yZW1vdmVFdmVudExpc3RlbmVyKSB7XG4gICAgZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudCwgaGFuZGxlcik7XG4gIH1lbHNle1xuICAgIGVsLmRldGFjaEV2ZW50KCdvbicgKyBldmVudCwgaGFuZGxlcik7XG4gIH1cbn0iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGRvYyA9IHJlcXVpcmUoJy4uL2RvY3VtZW50LmpzJylcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJylcbiAgLCBhZnRlckZuID0gdXRpbHMuYWZ0ZXJGblxuICA7XG4gXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgcHJpb3JpdHk6IDEwMDBcbiwgYW5jaG9yOiB0cnVlXG4sIHRlcm1pbmFsOiB0cnVlXG4sIGxpbms6IGZ1bmN0aW9uKHZtKSB7XG4gICAgdGhpcy5lbHMgPSBbXTtcbiAgICB0aGlzLnJlbGF0aXZlVm0gPSB2bTtcbiAgICBcbiAgICB0aGlzLmVsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5lbCk7XG4gICAgXG4gICAgLy9UT0RPOiBjYWNoZSB2bVxuICB9XG4sIHVwZGF0ZTogZnVuY3Rpb24odmFsKSB7XG4gICAgaWYoIXRoaXMudm0pIHtcbiAgICAgIHRoaXMudm0gPSB0aGlzLnJlbGF0aXZlVm0uJGdldFZNKHRoaXMucGF0aHNbMF0sIHthc3NpZ25tZW50OiB0aGlzLmFzc2lnbm1lbnR9KTtcbiAgICB9XG4gICAgaWYodmFsKSB7XG4gICAgICBpZih1dGlscy5pc0FycmF5KHZhbCkpIHtcbiAgICAgICAgaWYodmFsLnNwbGljZSAhPT0gYXJyYXlNZXRob2RzLnNwbGljZSkge1xuICAgICAgICAgIHV0aWxzLmV4dGVuZCh2YWwsIGFycmF5TWV0aG9kcyk7XG4gICAgICAgICAgdmFsLl9fdm1fXyA9IHRoaXMudm07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zcGxpY2UoWzAsIHRoaXMuZWxzLmxlbmd0aF0uY29uY2F0KHZhbCksIHZhbCk7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgY29uc29sZS53YXJuKCfpnIDopoHkuIDkuKrmlbDnu4QnKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgLy/nsr7noa7mjqfliLYgRE9NIOWIl+ihqFxuICAvL2FyZ3M6IFtpbmRleCwgbi8qLCBpdGVtcy4uLiovXVxuICAvL2Fycjog5pWw57uE5pWw5o2uXG4gIC8vZml4Vm06IOaYr+WQpue7tOaKpCB2aWV3bW9kZWwg57Si5byVXG4sIHNwbGljZTogZnVuY3Rpb24oYXJncywgYXJyLCBmaXhWbSkge1xuICAgIHZhciBlbHMgPSB0aGlzLmVsc1xuICAgICAgLCBpdGVtcyA9IGFyZ3Muc2xpY2UoMilcbiAgICAgICwgaW5kZXggPSBhcmdzWzBdICogMVxuICAgICAgLCBuID0gYXJnc1sxXSAqIDFcbiAgICAgICwgbSA9IGl0ZW1zLmxlbmd0aFxuICAgICAgLCBuZXdFbHMgPSBbXVxuICAgICAgLCBmcmFnID0gZG9jLmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKVxuICAgICAgLCBwbiA9IHRoaXMuYW5jaG9ycy5zdGFydC5wYXJlbnROb2RlXG4gICAgICAsIGVsLCB2bVxuICAgICAgO1xuICAgIFxuICAgIGlmKHV0aWxzLmlzVW5kZWZpbmVkKG4pKXtcbiAgICAgIGFyZ3NbMV0gPSBuID0gZWxzLmxlbmd0aCAtIGluZGV4O1xuICAgIH1cbiAgICBcbiAgICBmb3IodmFyIGkgPSBpbmRleCwgbCA9IGVscy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgaWYoaSA8IGluZGV4ICsgbil7XG4gICAgICAgIC8v5Yig6ZmkXG4gICAgICAgIC8v5a+55LqO5oul5pyJIGlmIOWxnuaAp+W5tuS4lOS4jeaYvuekuueahOiKgueCuSwg5YW25bm25LiN5a2Y5Zyo5LqOIERPTSDmoJHkuK1cbiAgICAgICAgdHJ5eyBwbi5yZW1vdmVDaGlsZChlbHNbaV0pOyB9Y2F0Y2goZSl7fVxuICAgICAgICBmaXhWbSAmJiBkZWxldGUgdGhpcy52bVtpXTtcbiAgICAgIH1lbHNle1xuICAgICAgICBpZihuIHx8IG0pe1xuICAgICAgICAgIC8v57u05oqk57Si5byVXG4gICAgICAgICAgdmFyIG5ld0kgPSBpIC0gKG4gLSBtKVxuICAgICAgICAgICAgLCBvbGRJID0gaVxuICAgICAgICAgICAgO1xuICAgICAgICAgIFxuICAgICAgICAgIGlmKG5ld0kgPiBvbGRJKSB7XG4gICAgICAgICAgICBuZXdJID0gbCAtIChpIC0gaW5kZXgpO1xuICAgICAgICAgICAgb2xkSSA9IG5ld0kgKyAobiAtIG0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICBlbHNbb2xkSV1bJyRpbmRleCddID0gbmV3STtcbiAgICAgICAgICBpZihmaXhWbSl7XG4gICAgICAgICAgICB2bSA9IHRoaXMudm1bbmV3SV0gPSB0aGlzLnZtW29sZEldO1xuICAgICAgICAgICAgdm0uJGtleSA9IG5ld0kgKyAnJztcbiAgICAgICAgICAgIHZtWyckaW5kZXgnXSAmJiB2bVsnJGluZGV4J10uJHVwZGF0ZSh2bS4ka2V5KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8v5paw5aKeXG4gICAgdmFyIGFzc2lnbm1lbnQ7XG4gICAgZm9yKHZhciBqID0gMDsgaiA8IG07IGorKyl7XG4gICAgICBlbCA9IHRoaXMuZWwuY2xvbmVOb2RlKHRydWUpO1xuICAgICAgZml4Vm0gJiYgZGVsZXRlIHRoaXMudm1baW5kZXggKyBqXTtcbiAgICAgIHZtID0gdGhpcy52bS4kZ2V0Vk0oaW5kZXggKyBqLCB7c2NvcGU6IHRoaXMudm0sIGFzc2lnbm1lbnQ6IHRoaXMuYXNzaWdubWVudH0pO1xuICAgICAgXG4gICAgICBhc3NpZ25tZW50ID0gdXRpbHMuY3JlYXRlKHRoaXMuYXNzaWdubWVudCk7XG4gICAgICBmb3IodmFyIGEgPSAwOyBhIDwgdGhpcy5hc3NpZ25tZW50cy5sZW5ndGg7IGErKykge1xuICAgICAgICBhc3NpZ25tZW50W3RoaXMuYXNzaWdubWVudHNbYV1dID0gdm07XG4gICAgICB9XG4gICAgICBcbiAgICAgIGVsWyckaW5kZXgnXSA9IGluZGV4ICsgajtcbiAgICAgIGZyYWcuYXBwZW5kQ2hpbGQoZWwpO1xuICAgICAgdm0uJGJ1aWxkKGVsLCBhc3NpZ25tZW50KTtcbiAgICAgIFxuICAgICAgZml4Vm0gJiYgdm1bJyRpbmRleCddICYmIHZtWyckaW5kZXgnXS4kdXBkYXRlKHZtLiRrZXkpO1xuICAgICAgXG4gICAgICBuZXdFbHMucHVzaChlbCk7XG4gICAgfVxuICAgIGlmKG5ld0Vscy5sZW5ndGgpe1xuICAgICAgcG4uaW5zZXJ0QmVmb3JlKGZyYWcsIGVsc1tpbmRleCArIG5dIHx8IHRoaXMuYW5jaG9ycy5lbmQpO1xuICAgIH1cbiAgICBcbiAgICAvL+mcgOimgea4hemZpOe8qeefreWQjuWkmuWHuueahOmDqOWIhlxuICAgIGlmKGZpeFZtKXtcbiAgICAgIGZvcih2YXIgayA9IGwgLSBuICsgbTsgayA8IGw7IGsrKyl7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnZtW2tdO1xuICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBpZihhcnIuX192bV9fICE9PSB0aGlzLnZtKSB7XG4gICAgICBhcnIuX192bV9fID0gdGhpcy52bTtcbiAgICB9XG4gICAgXG4gICAgYXJncyA9IGFyZ3Muc2xpY2UoMCwgMikuY29uY2F0KG5ld0Vscyk7XG4gICAgZWxzLnNwbGljZS5hcHBseShlbHMsIGFyZ3MpO1xuICB9XG4sIHJldmVyc2U6IGZ1bmN0aW9uKGFyZ3MsIGFyciwgZml4Vm0pIHtcbiAgICB2YXIgdm1zID0gdGhpcy52bSwgdm1cbiAgICAgICwgYW5jaG9yID0gdGhpcy5hbmNob3JzLmVuZFxuICAgICAgLCBmcmFnID0gZG9jLmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKVxuICAgICAgO1xuICAgIGZvcih2YXIgaSA9IDAsIGwgPSB0aGlzLmVscy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgaWYoZml4Vm0gJiYgaSA8IDEvMil7XG4gICAgICAgIHZtID0gdm1zW2ldO1xuICAgICAgICB2bXNbaV0gPSB2bXNbbCAtIGkgLSAxXTtcbiAgICAgICAgdm1zW2ldLiRrZXkgPSBpICsgJyc7XG4gICAgICAgIHZtLiRrZXkgPSBsIC0gaSAtIDEgKyAnJztcbiAgICAgICAgdm1zW2wgLSBpIC0gMV0gPSB2bTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZml4Vm0gJiYgdm1bJyRpbmRleCddICYmIHZtWyckaW5kZXgnXS4kdXBkYXRlKHZtLiRrZXkpO1xuICAgICAgXG4gICAgICB0aGlzLmVsc1tpXVsnJGluZGV4J10gPSBsIC0gaSAtIDE7XG4gICAgICBcbiAgICAgIGZyYWcuYXBwZW5kQ2hpbGQodGhpcy5lbHNbbCAtIGkgLSAxXSk7XG4gICAgfVxuICAgIGFuY2hvci5wYXJlbnROb2RlLmluc2VydEJlZm9yZShmcmFnLCBhbmNob3IpO1xuICAgIHRoaXMuZWxzLnJldmVyc2UoKTtcbiAgfVxuLCBzb3J0OiBmdW5jdGlvbihmbil7XG4gICAgLy9UT0RPIOi/m+ihjOeyvuehrumrmOi/mOWOn+eahOaOkuW6jz9cbiAgICB0aGlzLnVwZGF0ZSh0aGlzLnZtLiR2YWx1ZSk7XG4gIH1cbn07XG5cbi8vLS0tXG5mdW5jdGlvbiBjYWxsUmVwZWF0ZXIodm1BcnJheSwgbWV0aG9kLCBhcmdzKXtcbiAgdmFyIHdhdGNoZXJzID0gdm1BcnJheS5fX3ZtX18uJHdhdGNoZXJzO1xuICB2YXIgZml4Vm0gPSB0cnVlO1xuICBmb3IodmFyIGkgPSAwLCBsID0gd2F0Y2hlcnMubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICBpZih3YXRjaGVyc1tpXS50b2tlbi50eXBlID09PSAncmVwZWF0Jyl7XG4gICAgICB3YXRjaGVyc1tpXS50b2tlblttZXRob2RdKGFyZ3MsIHZtQXJyYXksIGZpeFZtKTtcbiAgICAgIGZpeFZtID0gZmFsc2U7XG4gICAgfVxuICB9XG4gIHZtQXJyYXkuX192bV9fLmxlbmd0aCAmJiB2bUFycmF5Ll9fdm1fXy5sZW5ndGguJHVwZGF0ZSh2bUFycmF5Lmxlbmd0aCwgZmFsc2UsIHRydWUpO1xufVxudmFyIGFycmF5TWV0aG9kcyA9IHtcbiAgc3BsaWNlOiBhZnRlckZuKFtdLnNwbGljZSwgZnVuY3Rpb24oKSB7XG4gICAgY2FsbFJlcGVhdGVyKHRoaXMsICdzcGxpY2UnLCBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xuICB9KVxuLCBwdXNoOiBhZnRlckZuKFtdLnB1c2gsIGZ1bmN0aW9uKC8qaXRlbTEsIGl0ZW0yLCAuLi4qLykge1xuICAgIHZhciBhcnIgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgYXJyLnVuc2hpZnQodGhpcy5sZW5ndGggLSBhcnIubGVuZ3RoLCAwKTtcbiAgICBcbiAgICBjYWxsUmVwZWF0ZXIodGhpcywgJ3NwbGljZScsIGFycik7XG4gIH0pXG4sIHBvcDogYWZ0ZXJGbihbXS5wb3AsIGZ1bmN0aW9uKCkge1xuICAgIGNhbGxSZXBlYXRlcih0aGlzLCAnc3BsaWNlJywgW3RoaXMubGVuZ3RoLCAxXSk7XG4gIH0pXG4sIHNoaWZ0OiBhZnRlckZuKFtdLnNoaWZ0LCBmdW5jdGlvbigpIHtcbiAgICBjYWxsUmVwZWF0ZXIodGhpcywgJ3NwbGljZScsIFswLCAxXSk7XG4gIH0pXG4sIHVuc2hpZnQ6IGFmdGVyRm4oW10udW5zaGlmdCwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGFyciA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICBhcnIudW5zaGlmdCgwLCAwKTtcbiAgICBcbiAgICBjYWxsUmVwZWF0ZXIodGhpcywgJ3NwbGljZScsIGFycik7XG4gIH0pXG4sIHNvcnQ6IGFmdGVyRm4oW10uc29ydCwgZnVuY3Rpb24oZm4pIHtcbiAgICBjYWxsUmVwZWF0ZXIodGhpcywgJ3NvcnQnKTtcbiAgfSlcbiwgcmV2ZXJzZTogYWZ0ZXJGbihbXS5yZXZlcnNlLCBmdW5jdGlvbigpe1xuICAgIGNhbGxSZXBlYXRlcih0aGlzLCAncmV2ZXJzZScpO1xuICB9KVxufTtcbiAgIiwiKGZ1bmN0aW9uKHJvb3Qpe1xuICBcInVzZSBzdHJpY3RcIjtcblxuICBtb2R1bGUuZXhwb3J0cyA9IHJvb3QuZG9jdW1lbnQgfHwgcmVxdWlyZSgnanNkb20nKS5qc2RvbSgpO1xuXG59KSgoZnVuY3Rpb24oKSB7cmV0dXJuIHRoaXN9KSgpKTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIG9wZXJhdG9ycyA9IHtcbiAgJ3VuYXJ5Jzoge1xuICAgICcrJzogZnVuY3Rpb24odikgeyByZXR1cm4gK3Y7IH1cbiAgLCAnLSc6IGZ1bmN0aW9uKHYpIHsgcmV0dXJuIC12OyB9XG4gICwgJyEnOiBmdW5jdGlvbih2KSB7IHJldHVybiAhdjsgfVxuICAgIFxuICAsICdbJzogZnVuY3Rpb24odil7IHJldHVybiB2OyB9XG4gICwgJ3snOiBmdW5jdGlvbih2KXtcbiAgICAgIHZhciByID0ge307XG4gICAgICBmb3IodmFyIGkgPSAwLCBsID0gdi5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgclt2W2ldWzBdXSA9IHZbaV1bMV07XG4gICAgICB9XG4gICAgICByZXR1cm4gcjtcbiAgICB9XG4gICwgJ3R5cGVvZic6IGZ1bmN0aW9uKHYpeyByZXR1cm4gdHlwZW9mIHY7IH1cbiAgLCAnbmV3JzogZnVuY3Rpb24odil7IHJldHVybiBuZXcgdiB9XG4gIH1cbiAgXG4sICdiaW5hcnknOiB7XG4gICAgJysnOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsICsgcjsgfVxuICAsICctJzogZnVuY3Rpb24obCwgcikgeyByZXR1cm4gbCAtIHI7IH1cbiAgLCAnKic6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgKiByOyB9XG4gICwgJy8nOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsIC8gcjsgfVxuICAsICclJzogZnVuY3Rpb24obCwgcikgeyByZXR1cm4gbCAlIHI7IH1cbiAgLCAnPCc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgPCByOyB9XG4gICwgJz4nOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsID4gcjsgfVxuICAsICc8PSc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgPD0gcjsgfVxuICAsICc+PSc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgPj0gcjsgfVxuICAsICc9PSc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgPT0gcjsgfVxuICAsICchPSc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgIT0gcjsgfVxuICAsICc9PT0nOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsID09PSByOyB9XG4gICwgJyE9PSc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgIT09IHI7IH1cbiAgLCAnJiYnOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsICYmIHI7IH1cbiAgLCAnfHwnOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsIHx8IHI7IH1cbiAgICBcbiAgLCAnLic6IGZ1bmN0aW9uKGwsIHIpIHtcbiAgICAgIGlmKHIpe1xuICAgICAgICBwYXRoID0gcGF0aCArICcuJyArIHI7XG4gICAgICB9XG4gICAgICByZXR1cm4gbFtyXTtcbiAgICB9XG4gICwgJ1snOiBmdW5jdGlvbihsLCByKSB7XG4gICAgICBpZihyKXtcbiAgICAgICAgcGF0aCA9IHBhdGggKyAnLicgKyByO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGxbcl07XG4gICAgfVxuICAsICcoJzogZnVuY3Rpb24obCwgcil7IHJldHVybiBsLmFwcGx5KG51bGwsIHIpIH1cbiAgICBcbiAgLCAnfCc6IGZ1bmN0aW9uKGwsIHIpeyByZXR1cm4gci5jYWxsKG51bGwsIGwpIH0vL2ZpbHRlci4gbmFtZXxmaWx0ZXJcbiAgLCAnaW4nOiBmdW5jdGlvbihsLCByKXtcbiAgICAgIGlmKHRoaXMuYXNzaWdubWVudCkge1xuICAgICAgICAvL3JlcGVhdFxuICAgICAgICByZXR1cm4gcjtcbiAgICAgIH1lbHNle1xuICAgICAgICByZXR1cm4gbCBpbiByO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBcbiwgJ3Rlcm5hcnknOiB7XG4gICAgJz8nOiBmdW5jdGlvbihmLCBzLCB0KSB7IHJldHVybiBmID8gcyA6IHQ7IH1cbiAgLCAnKCc6IGZ1bmN0aW9uKGYsIHMsIHQpIHsgcmV0dXJuIGZbc10uYXBwbHkoZiwgdCkgfVxuICBcbiAgLy9maWx0ZXIuIG5hbWUgfCBmaWx0ZXIgOiBhcmcyIDogYXJnM1xuICAsICd8JzogZnVuY3Rpb24oZiwgcywgdCl7IHJldHVybiBzLmFwcGx5KG51bGwsIFtmXS5jb25jYXQodCkpOyB9XG4gIH1cbn07XG5cbnZhciBhcmdOYW1lID0gWydmaXJzdCcsICdzZWNvbmQnLCAndGhpcmQnXVxuICAsIGNvbnRleHQsIHN1bW1hcnlcbiAgLCBwYXRoXG4gIDtcblxuLy/pgY3ljoYgYXN0XG52YXIgZXZhbHVhdGUgPSBmdW5jdGlvbih0cmVlKSB7XG4gIHZhciBhcml0eSA9IHRyZWUuYXJpdHlcbiAgICAsIHZhbHVlID0gdHJlZS52YWx1ZVxuICAgICwgYXJncyA9IFtdXG4gICAgLCBuID0gMFxuICAgICwgYXJnXG4gICAgLCByZXNcbiAgICA7XG4gIFxuICAvL+aTjeS9nOespuacgOWkmuWPquacieS4ieWFg1xuICBmb3IoOyBuIDwgMzsgbisrKXtcbiAgICBhcmcgPSB0cmVlW2FyZ05hbWVbbl1dO1xuICAgIGlmKGFyZyl7XG4gICAgICBpZihBcnJheS5pc0FycmF5KGFyZykpe1xuICAgICAgICBhcmdzW25dID0gW107XG4gICAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSBhcmcubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgICAgICBhcmdzW25dLnB1c2godHlwZW9mIGFyZ1tpXS5rZXkgPT09ICd1bmRlZmluZWQnID8gXG4gICAgICAgICAgICBldmFsdWF0ZShhcmdbaV0pIDogW2FyZ1tpXS5rZXksIGV2YWx1YXRlKGFyZ1tpXSldKTtcbiAgICAgICAgfVxuICAgICAgfWVsc2V7XG4gICAgICAgIGFyZ3Nbbl0gPSBldmFsdWF0ZShhcmcpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBcbiAgaWYoYXJpdHkgIT09ICdsaXRlcmFsJykge1xuICAgIGlmKHBhdGggJiYgdmFsdWUgIT09ICcuJyAmJiB2YWx1ZSAhPT0gJ1snKSB7XG4gICAgICBzdW1tYXJ5LnBhdGhzW3BhdGhdID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYoYXJpdHkgPT09ICduYW1lJykge1xuICAgICAgcGF0aCA9IHZhbHVlO1xuICAgIH1cbiAgfVxuICBcbiAgc3dpdGNoKGFyaXR5KXtcbiAgICBjYXNlICd1bmFyeSc6IFxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAndGVybmFyeSc6XG4gICAgICB0cnl7XG4gICAgICAgIHJlcyA9IGdldE9wZXJhdG9yKGFyaXR5LCB2YWx1ZSkuYXBwbHkodHJlZSwgYXJncyk7XG4gICAgICB9Y2F0Y2goZSl7XG4gICAgICAgIC8vY29uc29sZS5kZWJ1ZyhlKTtcbiAgICAgIH1cbiAgICBicmVhaztcbiAgICBjYXNlICdsaXRlcmFsJzpcbiAgICAgIHJlcyA9IHZhbHVlO1xuICAgIGJyZWFrO1xuICAgIGNhc2UgJ2Fzc2lnbm1lbnQnOlxuICAgICAgc3VtbWFyeS5hc3NpZ25tZW50c1t2YWx1ZV0gPSB0cnVlO1xuICAgIGJyZWFrO1xuICAgIGNhc2UgJ25hbWUnOlxuICAgICAgc3VtbWFyeS5sb2NhbHNbdmFsdWVdID0gdHJ1ZTtcbiAgICAgIHJlcyA9IGNvbnRleHQubG9jYWxzW3ZhbHVlXTtcbiAgICBicmVhaztcbiAgICBjYXNlICdmaWx0ZXInOlxuICAgICAgc3VtbWFyeS5maWx0ZXJzW3ZhbHVlXSA9IHRydWU7XG4gICAgICByZXMgPSBjb250ZXh0LmZpbHRlcnNbdmFsdWVdO1xuICAgIGJyZWFrO1xuICAgIGNhc2UgJ3RoaXMnOlxuICAgICAgcmVzID0gY29udGV4dC5sb2NhbHM7XG4gICAgYnJlYWs7XG4gIH1cbiAgcmV0dXJuIHJlcztcbn07XG5cbmZ1bmN0aW9uIGdldE9wZXJhdG9yKGFyaXR5LCB2YWx1ZSl7XG4gIHJldHVybiBvcGVyYXRvcnNbYXJpdHldW3ZhbHVlXSB8fCBmdW5jdGlvbigpIHsgcmV0dXJuOyB9XG59XG5cbmZ1bmN0aW9uIHJlc2V0KF9jb250ZXh0KSB7XG4gIGlmKF9jb250ZXh0KSB7XG4gICAgY29udGV4dCA9IHtsb2NhbHM6IF9jb250ZXh0LmxvY2FscyB8fCB7fSwgZmlsdGVyczogX2NvbnRleHQuZmlsdGVycyB8fCB7fX07XG4gIH1lbHNle1xuICAgIGNvbnRleHQgPSB7ZmlsdGVyczoge30sIGxvY2Fsczoge319O1xuICB9XG4gIFxuICBzdW1tYXJ5ID0ge2ZpbHRlcnM6IHt9LCBsb2NhbHM6IHt9LCBwYXRoczoge30sIGFzc2lnbm1lbnRzOiB7fX07XG4gIHBhdGggPSAnJztcbn1cblxuLy/ooajovr7lvI/msYLlgLxcbi8vdHJlZTogcGFyc2VyIOeUn+aIkOeahCBhc3Rcbi8vY29udGV4dDog6KGo6L6+5byP5omn6KGM55qE546v5aKDXG4vL2NvbnRleHQubG9jYWxzOiDlj5jph49cbi8vY29udGV4dC5maWx0ZXJzOiDov4fmu6Tlmajlh73mlbBcbmV4cG9ydHMuZXZhbCA9IGZ1bmN0aW9uKHRyZWUsIF9jb250ZXh0KSB7XG4gIHJlc2V0KF9jb250ZXh0IHx8IHt9KTtcbiAgXG4gIHJldHVybiBldmFsdWF0ZSh0cmVlKTtcbn07XG5cbi8v6KGo6L6+5byP5pGY6KaBXG5leHBvcnRzLnN1bW1hcnkgPSBmdW5jdGlvbih0cmVlKSB7XG4gIHJlc2V0KCk7XG4gIFxuICBldmFsdWF0ZSh0cmVlKTtcbiAgXG4gIGlmKHBhdGgpIHtcbiAgICBzdW1tYXJ5LnBhdGhzW3BhdGhdID0gdHJ1ZTtcbiAgfVxuICBmb3IodmFyIGtleSBpbiBzdW1tYXJ5KSB7XG4gICAgc3VtbWFyeVtrZXldID0gT2JqZWN0LmtleXMoc3VtbWFyeVtrZXldKTtcbiAgfVxuICByZXR1cm4gc3VtbWFyeTtcbn07IiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG52YXIgRXZlbnQgPSB7XG4gIC8v55uR5ZCs6Ieq5a6a5LmJ5LqL5Lu2LlxuICBvbjogZnVuY3Rpb24obmFtZSwgaGFuZGxlciwgY29udGV4dCkge1xuICAgIHZhciBjdHggPSBjb250ZXh0IHx8IHRoaXNcbiAgICAgIDtcbiAgICAgIFxuICAgIGN0eC5faGFuZGxlcnMgPSBjdHguX2hhbmRsZXJzIHx8IHt9O1xuICAgIGN0eC5faGFuZGxlcnNbbmFtZV0gPSBjdHguX2hhbmRsZXJzW25hbWVdIHx8IFtdO1xuICAgIFxuICAgIGN0eC5faGFuZGxlcnNbbmFtZV0ucHVzaCh7aGFuZGxlcjogaGFuZGxlciwgY29udGV4dDogY29udGV4dCwgY3R4OiBjdHh9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgLy/np7vpmaTnm5HlkKzkuovku7YuXG4gIG9mZjogZnVuY3Rpb24obmFtZSwgaGFuZGxlciwgY29udGV4dCkge1xuICAgIHZhciBjdHggPSBjb250ZXh0IHx8IHRoaXNcbiAgICAgICwgaGFuZGxlcnMgPSBjdHguX2hhbmRsZXJzXG4gICAgICA7XG4gICAgICBcbiAgICBpZihuYW1lICYmIGhhbmRsZXJzW25hbWVdKXtcbiAgICAgIGlmKHV0aWxzLmlzRnVuY3Rpb24oaGFuZGxlcikpe1xuICAgICAgICBmb3IodmFyIGkgPSBoYW5kbGVyc1tuYW1lXS5sZW5ndGggLSAxOyBpID49MDsgaS0tKSB7XG4gICAgICAgICAgaWYoaGFuZGxlcnNbbmFtZV1baV0uaGFuZGxlciA9PT0gaGFuZGxlcil7XG4gICAgICAgICAgICBoYW5kbGVyc1tuYW1lXS5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9ZWxzZXtcbiAgICAgICAgaGFuZGxlcnNbbmFtZV0gPSBbXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIC8v6Kem5Y+R6Ieq5a6a5LmJ5LqL5Lu2LiBcbiAgLy/or6Xmlrnms5XmsqHmnInmj5DkvpvpnZnmgIHljJbnmoQgY29udGV4dCDlj4LmlbAuIOWmguimgemdmeaAgeWMluS9v+eUqCwg5bqU6K+lOiBgRXZlbnQudHJpZ2dlci5jYWxsKGNvbnRleHQsIG5hbWUsIGRhdGEpYFxuICB0cmlnZ2VyOiBmdW5jdGlvbihuYW1lLCBkYXRhKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzXG4gICAgICAsIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSlcbiAgICAgICwgaGFuZGxlcnMgPSB0aGF0Ll9oYW5kbGVyc1xuICAgICAgO1xuICAgICAgXG4gICAgaWYoaGFuZGxlcnMgJiYgaGFuZGxlcnNbbmFtZV0pe1xuICAgICAgaGFuZGxlcnNbbmFtZV0uZm9yRWFjaChmdW5jdGlvbihlKSB7XG4gICAgICAgIGUuaGFuZGxlci5hcHBseSh0aGF0LCBhcmdzKVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50OyIsIlwidXNlIHN0cmljdFwiO1xuLy9KYXZhc2NyaXB0IGV4cHJlc3Npb24gcGFyc2VyIG1vZGlmaWVkIGZvcm0gQ3JvY2tmb3JkJ3MgVERPUCBwYXJzZXJcbnZhciBjcmVhdGUgPSBPYmplY3QuY3JlYXRlIHx8IGZ1bmN0aW9uIChvKSB7XG4gIGZ1bmN0aW9uIEYoKSB7fVxuICBGLnByb3RvdHlwZSA9IG87XG4gIHJldHVybiBuZXcgRigpO1xufTtcblxudmFyIGVycm9yID0gZnVuY3Rpb24gKG1lc3NhZ2UsIHQpIHtcbiAgICB0ID0gdCB8fCB0aGlzO1xuICAgIHQubmFtZSA9IFwiU3ludGF4RXJyb3JcIjtcbiAgICB0Lm1lc3NhZ2UgPSBtZXNzYWdlO1xuICAgIHRocm93IHQ7XG59O1xuXG52YXIgbm9vcCA9IGZ1bmN0aW9uKCkge307XG5cbnZhciB0b2tlbml6ZSA9IGZ1bmN0aW9uIChjb2RlLCBwcmVmaXgsIHN1ZmZpeCkge1xuICAgIHZhciBjOyAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgY3VycmVudCBjaGFyYWN0ZXIuXG4gICAgdmFyIGZyb207ICAgICAgICAgICAgICAgICAgIC8vIFRoZSBpbmRleCBvZiB0aGUgc3RhcnQgb2YgdGhlIHRva2VuLlxuICAgIHZhciBpID0gMDsgICAgICAgICAgICAgICAgICAvLyBUaGUgaW5kZXggb2YgdGhlIGN1cnJlbnQgY2hhcmFjdGVyLlxuICAgIHZhciBsZW5ndGggPSBjb2RlLmxlbmd0aDtcbiAgICB2YXIgbjsgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIG51bWJlciB2YWx1ZS5cbiAgICB2YXIgcTsgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIHF1b3RlIGNoYXJhY3Rlci5cbiAgICB2YXIgc3RyOyAgICAgICAgICAgICAgICAgICAgLy8gVGhlIHN0cmluZyB2YWx1ZS5cblxuICAgIHZhciByZXN1bHQgPSBbXTsgICAgICAgICAgICAvLyBBbiBhcnJheSB0byBob2xkIHRoZSByZXN1bHRzLlxuXG4gICAgLy8gTWFrZSBhIHRva2VuIG9iamVjdC5cbiAgICB2YXIgbWFrZSA9IGZ1bmN0aW9uICh0eXBlLCB2YWx1ZSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogdHlwZSxcbiAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAgIGZyb206IGZyb20sXG4gICAgICAgICAgICB0bzogaVxuICAgICAgICB9O1xuICAgIH07XG5cbi8vIEJlZ2luIHRva2VuaXphdGlvbi4gSWYgdGhlIHNvdXJjZSBzdHJpbmcgaXMgZW1wdHksIHJldHVybiBub3RoaW5nLlxuXG4gICAgaWYgKCFjb2RlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbi8vIElmIHByZWZpeCBhbmQgc3VmZml4IHN0cmluZ3MgYXJlIG5vdCBwcm92aWRlZCwgc3VwcGx5IGRlZmF1bHRzLlxuXG4gICAgaWYgKHR5cGVvZiBwcmVmaXggIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHByZWZpeCA9ICc8PistJic7XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygc3VmZml4ICE9PSAnc3RyaW5nJykge1xuICAgICAgICBzdWZmaXggPSAnPT4mOic7XG4gICAgfVxuXG5cbi8vIExvb3AgdGhyb3VnaCBjb2RlIHRleHQsIG9uZSBjaGFyYWN0ZXIgYXQgYSB0aW1lLlxuXG4gICAgYyA9IGNvZGUuY2hhckF0KGkpO1xuICAgIHdoaWxlIChjKSB7XG4gICAgICAgIGZyb20gPSBpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGMgPD0gJyAnKSB7Ly8gSWdub3JlIHdoaXRlc3BhY2UuXG4gICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICBjID0gY29kZS5jaGFyQXQoaSk7XG4gICAgICAgIH0gZWxzZSBpZiAoKGMgPj0gJ2EnICYmIGMgPD0gJ3onKSB8fCAoYyA+PSAnQScgJiYgYyA8PSAnWicpIHx8IGMgPT09ICckJyB8fCBjID09PSAnXycpIHsvLyBuYW1lLlxuICAgICAgICAgICAgc3RyID0gYztcbiAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgIGZvciAoOzspIHtcbiAgICAgICAgICAgICAgICBjID0gY29kZS5jaGFyQXQoaSk7XG4gICAgICAgICAgICAgICAgaWYgKChjID49ICdhJyAmJiBjIDw9ICd6JykgfHwgKGMgPj0gJ0EnICYmIGMgPD0gJ1onKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgKGMgPj0gJzAnICYmIGMgPD0gJzknKSB8fCBjID09PSAnXycpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RyICs9IGM7XG4gICAgICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXN1bHQucHVzaChtYWtlKCduYW1lJywgc3RyKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoYyA+PSAnMCcgJiYgYyA8PSAnOScpIHtcbiAgICAgICAgLy8gbnVtYmVyLlxuXG4gICAgICAgIC8vIEEgbnVtYmVyIGNhbm5vdCBzdGFydCB3aXRoIGEgZGVjaW1hbCBwb2ludC4gSXQgbXVzdCBzdGFydCB3aXRoIGEgZGlnaXQsXG4gICAgICAgIC8vIHBvc3NpYmx5ICcwJy5cbiAgICAgICAgICAgIHN0ciA9IGM7XG4gICAgICAgICAgICBpICs9IDE7XG5cbi8vIExvb2sgZm9yIG1vcmUgZGlnaXRzLlxuXG4gICAgICAgICAgICBmb3IgKDs7KSB7XG4gICAgICAgICAgICAgICAgYyA9IGNvZGUuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgIGlmIChjIDwgJzAnIHx8IGMgPiAnOScpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgICAgICBzdHIgKz0gYztcbiAgICAgICAgICAgIH1cblxuLy8gTG9vayBmb3IgYSBkZWNpbWFsIGZyYWN0aW9uIHBhcnQuXG5cbiAgICAgICAgICAgIGlmIChjID09PSAnLicpIHtcbiAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICAgICAgc3RyICs9IGM7XG4gICAgICAgICAgICAgICAgZm9yICg7Oykge1xuICAgICAgICAgICAgICAgICAgICBjID0gY29kZS5jaGFyQXQoaSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjIDwgJzAnIHx8IGMgPiAnOScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgc3RyICs9IGM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4vLyBMb29rIGZvciBhbiBleHBvbmVudCBwYXJ0LlxuXG4gICAgICAgICAgICBpZiAoYyA9PT0gJ2UnIHx8IGMgPT09ICdFJykge1xuICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgICAgICBzdHIgKz0gYztcbiAgICAgICAgICAgICAgICBjID0gY29kZS5jaGFyQXQoaSk7XG4gICAgICAgICAgICAgICAgaWYgKGMgPT09ICctJyB8fCBjID09PSAnKycpIHtcbiAgICAgICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgICAgICAgICBzdHIgKz0gYztcbiAgICAgICAgICAgICAgICAgICAgYyA9IGNvZGUuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoYyA8ICcwJyB8fCBjID4gJzknKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yKFwiQmFkIGV4cG9uZW50XCIsIG1ha2UoJ251bWJlcicsIHN0cikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgc3RyICs9IGM7XG4gICAgICAgICAgICAgICAgICAgIGMgPSBjb2RlLmNoYXJBdChpKTtcbiAgICAgICAgICAgICAgICB9IHdoaWxlIChjID49ICcwJyAmJiBjIDw9ICc5Jyk7XG4gICAgICAgICAgICB9XG5cbi8vIE1ha2Ugc3VyZSB0aGUgbmV4dCBjaGFyYWN0ZXIgaXMgbm90IGEgbGV0dGVyLlxuXG4gICAgICAgICAgICBpZiAoYyA+PSAnYScgJiYgYyA8PSAneicpIHtcbiAgICAgICAgICAgICAgICBzdHIgKz0gYztcbiAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICAgICAgZXJyb3IoXCJCYWQgbnVtYmVyXCIsIG1ha2UoJ251bWJlcicsIHN0cikpO1xuICAgICAgICAgICAgfVxuXG4vLyBDb252ZXJ0IHRoZSBzdHJpbmcgdmFsdWUgdG8gYSBudW1iZXIuIElmIGl0IGlzIGZpbml0ZSwgdGhlbiBpdCBpcyBhIGdvb2Rcbi8vIHRva2VuLlxuXG4gICAgICAgICAgICBuID0gK3N0cjtcbiAgICAgICAgICAgIGlmIChpc0Zpbml0ZShuKSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKG1ha2UoJ251bWJlcicsIG4pKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXJyb3IoXCJCYWQgbnVtYmVyXCIsIG1ha2UoJ251bWJlcicsIHN0cikpO1xuICAgICAgICAgICAgfVxuXG4vLyBzdHJpbmdcblxuICAgICAgICB9IGVsc2UgaWYgKGMgPT09ICdcXCcnIHx8IGMgPT09ICdcIicpIHtcbiAgICAgICAgICAgIHN0ciA9ICcnO1xuICAgICAgICAgICAgcSA9IGM7XG4gICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICBmb3IgKDs7KSB7XG4gICAgICAgICAgICAgICAgYyA9IGNvZGUuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgIGlmIChjIDwgJyAnKSB7XG4gICAgICAgICAgICAgICAgICAgIG1ha2UoJ3N0cmluZycsIHN0cik7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yKGMgPT09ICdcXG4nIHx8IGMgPT09ICdcXHInIHx8IGMgPT09ICcnID9cbiAgICAgICAgICAgICAgICAgICAgICAgIFwiVW50ZXJtaW5hdGVkIHN0cmluZy5cIiA6XG4gICAgICAgICAgICAgICAgICAgICAgICBcIkNvbnRyb2wgY2hhcmFjdGVyIGluIHN0cmluZy5cIiwgbWFrZSgnJywgc3RyKSk7XG4gICAgICAgICAgICAgICAgfVxuXG4vLyBMb29rIGZvciB0aGUgY2xvc2luZyBxdW90ZS5cblxuICAgICAgICAgICAgICAgIGlmIChjID09PSBxKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cblxuLy8gTG9vayBmb3IgZXNjYXBlbWVudC5cblxuICAgICAgICAgICAgICAgIGlmIChjID09PSAnXFxcXCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaSA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICBlcnJvcihcIlVudGVybWluYXRlZCBzdHJpbmdcIiwgbWFrZSgnc3RyaW5nJywgc3RyKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYyA9IGNvZGUuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGMpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnYic6XG4gICAgICAgICAgICAgICAgICAgICAgICBjID0gJ1xcYic7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZic6XG4gICAgICAgICAgICAgICAgICAgICAgICBjID0gJ1xcZic7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbic6XG4gICAgICAgICAgICAgICAgICAgICAgICBjID0gJ1xcbic7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncic6XG4gICAgICAgICAgICAgICAgICAgICAgICBjID0gJ1xccic7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBjID0gJ1xcdCc7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaSA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yKFwiVW50ZXJtaW5hdGVkIHN0cmluZ1wiLCBtYWtlKCdzdHJpbmcnLCBzdHIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGMgPSBwYXJzZUludChjb2RlLnN1YnN0cihpICsgMSwgNCksIDE2KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXNGaW5pdGUoYykgfHwgYyA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yKFwiVW50ZXJtaW5hdGVkIHN0cmluZ1wiLCBtYWtlKCdzdHJpbmcnLCBzdHIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaSArPSA0O1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3RyICs9IGM7XG4gICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgcmVzdWx0LnB1c2gobWFrZSgnc3RyaW5nJywgc3RyKSk7XG4gICAgICAgICAgICBjID0gY29kZS5jaGFyQXQoaSk7XG5cbi8vIGNvbW1lbnQuXG5cbiAgICAgICAgfSBlbHNlIGlmIChjID09PSAnLycgJiYgY29kZS5jaGFyQXQoaSArIDEpID09PSAnLycpIHtcbiAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgIGZvciAoOzspIHtcbiAgICAgICAgICAgICAgICBjID0gY29kZS5jaGFyQXQoaSk7XG4gICAgICAgICAgICAgICAgaWYgKGMgPT09ICdcXG4nIHx8IGMgPT09ICdcXHInIHx8IGMgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICB9XG5cbi8vIGNvbWJpbmluZ1xuXG4gICAgICAgIH0gZWxzZSBpZiAocHJlZml4LmluZGV4T2YoYykgPj0gMCkge1xuICAgICAgICAgICAgc3RyID0gYztcbiAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICAgICAgYyA9IGNvZGUuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgIGlmIChpID49IGxlbmd0aCB8fCBzdWZmaXguaW5kZXhPZihjKSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN0ciArPSBjO1xuICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKG1ha2UoJ29wZXJhdG9yJywgc3RyKSk7XG5cbi8vIHNpbmdsZS1jaGFyYWN0ZXIgb3BlcmF0b3JcblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgcmVzdWx0LnB1c2gobWFrZSgnb3BlcmF0b3InLCBjKSk7XG4gICAgICAgICAgICBjID0gY29kZS5jaGFyQXQoaSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cblxudmFyIG1ha2VfcGFyc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN5bWJvbF90YWJsZSA9IHt9O1xuICAgIHZhciB0b2tlbjtcbiAgICB2YXIgdG9rZW5zO1xuICAgIHZhciB0b2tlbl9ucjtcbiAgICB2YXIgY29udGV4dDtcbiAgICBcbiAgICB2YXIgaXRzZWxmID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgdmFyIGZpbmQgPSBmdW5jdGlvbiAobikge1xuICAgICAgbi5udWQgICAgICA9IGl0c2VsZjtcbiAgICAgIG4ubGVkICAgICAgPSBudWxsO1xuICAgICAgbi5zdGQgICAgICA9IG51bGw7XG4gICAgICBuLmxicCAgICAgID0gMDtcbiAgICAgIHJldHVybiBuO1xuICAgIH07XG5cbiAgICB2YXIgYWR2YW5jZSA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICB2YXIgYSwgbywgdCwgdjtcbiAgICAgICAgaWYgKGlkICYmIHRva2VuLmlkICE9PSBpZCkge1xuICAgICAgICAgICAgZXJyb3IoXCJFeHBlY3RlZCAnXCIgKyBpZCArIFwiJy5cIiwgdG9rZW4pO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0b2tlbl9uciA+PSB0b2tlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICB0b2tlbiA9IHN5bWJvbF90YWJsZVtcIihlbmQpXCJdO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHQgPSB0b2tlbnNbdG9rZW5fbnJdO1xuICAgICAgICB0b2tlbl9uciArPSAxO1xuICAgICAgICB2ID0gdC52YWx1ZTtcbiAgICAgICAgYSA9IHQudHlwZTtcbiAgICAgICAgaWYgKChhID09PSBcIm9wZXJhdG9yXCIgfHwgYSAhPT0gJ3N0cmluZycpICYmIHYgaW4gc3ltYm9sX3RhYmxlKSB7XG4gICAgICAgICAgICAvL3RydWUsIGZhbHNlIOetieebtOaOpemHj+S5n+S8mui/m+WFpeatpOWIhuaUr1xuICAgICAgICAgICAgbyA9IHN5bWJvbF90YWJsZVt2XTtcbiAgICAgICAgICAgIGlmICghbykge1xuICAgICAgICAgICAgICAgIGVycm9yKFwiVW5rbm93biBvcGVyYXRvci5cIiwgdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoYSA9PT0gXCJuYW1lXCIpIHtcbiAgICAgICAgICAgIG8gPSBmaW5kKHQpO1xuICAgICAgICB9IGVsc2UgaWYgKGEgPT09IFwic3RyaW5nXCIgfHwgYSA9PT0gIFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgIG8gPSBzeW1ib2xfdGFibGVbXCIobGl0ZXJhbClcIl07XG4gICAgICAgICAgICBhID0gXCJsaXRlcmFsXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlcnJvcihcIlVuZXhwZWN0ZWQgdG9rZW4uXCIsIHQpO1xuICAgICAgICB9XG4gICAgICAgIHRva2VuID0gY3JlYXRlKG8pO1xuICAgICAgICB0b2tlbi5mcm9tICA9IHQuZnJvbTtcbiAgICAgICAgdG9rZW4udG8gICAgPSB0LnRvO1xuICAgICAgICB0b2tlbi52YWx1ZSA9IHY7XG4gICAgICAgIHRva2VuLmFyaXR5ID0gYTtcbiAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgIH07XG5cbiAgICB2YXIgZXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChyYnApIHtcbiAgICAgICAgdmFyIGxlZnQ7XG4gICAgICAgIHZhciB0ID0gdG9rZW47XG4gICAgICAgIGFkdmFuY2UoKTtcbiAgICAgICAgbGVmdCA9IHQubnVkKCk7XG4gICAgICAgIHdoaWxlIChyYnAgPCB0b2tlbi5sYnApIHtcbiAgICAgICAgICAgIHQgPSB0b2tlbjtcbiAgICAgICAgICAgIGFkdmFuY2UoKTtcbiAgICAgICAgICAgIGxlZnQgPSB0LmxlZChsZWZ0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbGVmdDtcbiAgICB9O1xuXG4gICAgdmFyIG9yaWdpbmFsX3N5bWJvbCA9IHtcbiAgICAgICAgbnVkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBlcnJvcihcIlVuZGVmaW5lZC5cIiwgdGhpcyk7XG4gICAgICAgIH0sXG4gICAgICAgIGxlZDogZnVuY3Rpb24gKGxlZnQpIHtcbiAgICAgICAgICAgIGVycm9yKFwiTWlzc2luZyBvcGVyYXRvci5cIiwgdGhpcyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIHN5bWJvbCA9IGZ1bmN0aW9uIChpZCwgYnApIHtcbiAgICAgICAgdmFyIHMgPSBzeW1ib2xfdGFibGVbaWRdO1xuICAgICAgICBicCA9IGJwIHx8IDA7XG4gICAgICAgIGlmIChzKSB7XG4gICAgICAgICAgICBpZiAoYnAgPj0gcy5sYnApIHtcbiAgICAgICAgICAgICAgICBzLmxicCA9IGJwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcyA9IGNyZWF0ZShvcmlnaW5hbF9zeW1ib2wpO1xuICAgICAgICAgICAgcy5pZCA9IHMudmFsdWUgPSBpZDtcbiAgICAgICAgICAgIHMubGJwID0gYnA7XG4gICAgICAgICAgICBzeW1ib2xfdGFibGVbaWRdID0gcztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcztcbiAgICB9O1xuXG4gICAgdmFyIGNvbnN0YW50ID0gZnVuY3Rpb24gKHMsIHYsIGEpIHtcbiAgICAgICAgdmFyIHggPSBzeW1ib2wocyk7XG4gICAgICAgIHgubnVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IHN5bWJvbF90YWJsZVt0aGlzLmlkXS52YWx1ZTtcbiAgICAgICAgICAgIHRoaXMuYXJpdHkgPSBcImxpdGVyYWxcIjtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuICAgICAgICB4LnZhbHVlID0gdjtcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgfTtcbiAgICBcbiAgICB2YXIgaW5maXggPSBmdW5jdGlvbiAoaWQsIGJwLCBsZWQpIHtcbiAgICAgICAgdmFyIHMgPSBzeW1ib2woaWQsIGJwKTtcbiAgICAgICAgcy5sZWQgPSBsZWQgfHwgZnVuY3Rpb24gKGxlZnQpIHtcbiAgICAgICAgICAgIHRoaXMuZmlyc3QgPSBsZWZ0O1xuICAgICAgICAgICAgdGhpcy5zZWNvbmQgPSBleHByZXNzaW9uKGJwKTtcbiAgICAgICAgICAgIHRoaXMuYXJpdHkgPSBcImJpbmFyeVwiO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBzO1xuICAgIH07XG5cbiAgICB2YXIgaW5maXhyID0gZnVuY3Rpb24gKGlkLCBicCwgbGVkKSB7XG4gICAgICAgIHZhciBzID0gc3ltYm9sKGlkLCBicCk7XG4gICAgICAgIHMubGVkID0gbGVkIHx8IGZ1bmN0aW9uIChsZWZ0KSB7XG4gICAgICAgICAgICB0aGlzLmZpcnN0ID0gbGVmdDtcbiAgICAgICAgICAgIHRoaXMuc2Vjb25kID0gZXhwcmVzc2lvbihicCAtIDEpO1xuICAgICAgICAgICAgdGhpcy5hcml0eSA9IFwiYmluYXJ5XCI7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHM7XG4gICAgfTtcblxuICAgIHZhciBwcmVmaXggPSBmdW5jdGlvbiAoaWQsIG51ZCkge1xuICAgICAgICB2YXIgcyA9IHN5bWJvbChpZCk7XG4gICAgICAgIHMubnVkID0gbnVkIHx8IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuZmlyc3QgPSBleHByZXNzaW9uKDcwKTtcbiAgICAgICAgICAgIHRoaXMuYXJpdHkgPSBcInVuYXJ5XCI7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHM7XG4gICAgfTtcblxuICAgIHN5bWJvbChcIihlbmQpXCIpO1xuICAgIHN5bWJvbChcIihuYW1lKVwiKTtcbiAgICBzeW1ib2woXCI6XCIpO1xuICAgIHN5bWJvbChcIilcIik7XG4gICAgc3ltYm9sKFwiXVwiKTtcbiAgICBzeW1ib2woXCJ9XCIpO1xuICAgIHN5bWJvbChcIixcIik7XG5cbiAgICBjb25zdGFudChcInRydWVcIiwgdHJ1ZSk7XG4gICAgY29uc3RhbnQoXCJmYWxzZVwiLCBmYWxzZSk7XG4gICAgY29uc3RhbnQoXCJudWxsXCIsIG51bGwpO1xuICAgIFxuICAgIGNvbnN0YW50KFwiTWF0aFwiLCBNYXRoKTtcbiAgICBjb25zdGFudChcIkRhdGVcIiwgRGF0ZSk7XG5cbiAgICBzeW1ib2woXCIobGl0ZXJhbClcIikubnVkID0gaXRzZWxmO1xuXG4gICAgLy8gc3ltYm9sKFwidGhpc1wiKS5udWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIHRoaXMuYXJpdHkgPSBcInRoaXNcIjtcbiAgICAgICAgLy8gcmV0dXJuIHRoaXM7XG4gICAgLy8gfTtcblxuICAgIC8vT3BlcmF0b3IgUHJlY2VkZW5jZTpcbiAgICAvL2h0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL09wZXJhdG9ycy9PcGVyYXRvcl9QcmVjZWRlbmNlXG5cbiAgICBpbmZpeChcIj9cIiwgMjAsIGZ1bmN0aW9uIChsZWZ0KSB7XG4gICAgICAgIHRoaXMuZmlyc3QgPSBsZWZ0O1xuICAgICAgICB0aGlzLnNlY29uZCA9IGV4cHJlc3Npb24oMCk7XG4gICAgICAgIGFkdmFuY2UoXCI6XCIpO1xuICAgICAgICB0aGlzLnRoaXJkID0gZXhwcmVzc2lvbigwKTtcbiAgICAgICAgdGhpcy5hcml0eSA9IFwidGVybmFyeVwiO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9KTtcbiAgICBcbiAgICBpbmZpeHIoXCImJlwiLCAzMSk7XG4gICAgaW5maXhyKFwifHxcIiwgMzApO1xuXG4gICAgaW5maXhyKFwiPT09XCIsIDQwKTtcbiAgICBpbmZpeHIoXCIhPT1cIiwgNDApO1xuXG4gICAgaW5maXhyKFwiPT1cIiwgNDApO1xuICAgIGluZml4cihcIiE9XCIsIDQwKTtcblxuICAgIGluZml4cihcIjxcIiwgNDApO1xuICAgIGluZml4cihcIjw9XCIsIDQwKTtcbiAgICBpbmZpeHIoXCI+XCIsIDQwKTtcbiAgICBpbmZpeHIoXCI+PVwiLCA0MCk7XG4gICAgXG4gICAgaW5maXgoXCJpblwiLCA0NSwgZnVuY3Rpb24gKGxlZnQpIHtcbiAgICAgICAgdGhpcy5maXJzdCA9IGxlZnQ7XG4gICAgICAgIHRoaXMuc2Vjb25kID0gZXhwcmVzc2lvbigwKTtcbiAgICAgICAgdGhpcy5hcml0eSA9IFwiYmluYXJ5XCI7XG4gICAgICAgIGlmKGNvbnRleHQgPT09ICdyZXBlYXQnKXtcbiAgICAgICAgICAvLyBgaW5gIGF0IHJlcGVhdCBibG9ja1xuICAgICAgICAgIGxlZnQuYXJpdHkgPSAnYXNzaWdubWVudCc7XG4gICAgICAgICAgdGhpcy5hc3NpZ25tZW50ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9KTtcblxuICAgIGluZml4KFwiK1wiLCA1MCk7XG4gICAgaW5maXgoXCItXCIsIDUwKTtcblxuICAgIGluZml4KFwiKlwiLCA2MCk7XG4gICAgaW5maXgoXCIvXCIsIDYwKTtcbiAgICBpbmZpeChcIiVcIiwgNjApO1xuXG4gICAgaW5maXgoXCIuXCIsIDgwLCBmdW5jdGlvbiAobGVmdCkge1xuICAgICAgICB0aGlzLmZpcnN0ID0gbGVmdDtcbiAgICAgICAgaWYgKHRva2VuLmFyaXR5ICE9PSBcIm5hbWVcIikge1xuICAgICAgICAgICAgZXJyb3IoXCJFeHBlY3RlZCBhIHByb3BlcnR5IG5hbWUuXCIsIHRva2VuKTtcbiAgICAgICAgfVxuICAgICAgICB0b2tlbi5hcml0eSA9IFwibGl0ZXJhbFwiO1xuICAgICAgICB0aGlzLnNlY29uZCA9IHRva2VuO1xuICAgICAgICB0aGlzLmFyaXR5ID0gXCJiaW5hcnlcIjtcbiAgICAgICAgYWR2YW5jZSgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9KTtcblxuICAgIGluZml4KFwiW1wiLCA4MCwgZnVuY3Rpb24gKGxlZnQpIHtcbiAgICAgICAgdGhpcy5maXJzdCA9IGxlZnQ7XG4gICAgICAgIHRoaXMuc2Vjb25kID0gZXhwcmVzc2lvbigwKTtcbiAgICAgICAgdGhpcy5hcml0eSA9IFwiYmluYXJ5XCI7XG4gICAgICAgIGFkdmFuY2UoXCJdXCIpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9KTtcblxuICAgIGluZml4KFwiKFwiLCA4MCwgZnVuY3Rpb24gKGxlZnQpIHtcbiAgICAgICAgdmFyIGEgPSBbXTtcbiAgICAgICAgaWYgKGxlZnQuaWQgPT09IFwiLlwiIHx8IGxlZnQuaWQgPT09IFwiW1wiKSB7XG4gICAgICAgICAgICB0aGlzLmFyaXR5ID0gXCJ0ZXJuYXJ5XCI7XG4gICAgICAgICAgICB0aGlzLmZpcnN0ID0gbGVmdC5maXJzdDtcbiAgICAgICAgICAgIHRoaXMuc2Vjb25kID0gbGVmdC5zZWNvbmQ7XG4gICAgICAgICAgICB0aGlzLnRoaXJkID0gYTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuYXJpdHkgPSBcImJpbmFyeVwiO1xuICAgICAgICAgICAgdGhpcy5maXJzdCA9IGxlZnQ7XG4gICAgICAgICAgICB0aGlzLnNlY29uZCA9IGE7XG4gICAgICAgICAgICBpZiAoKGxlZnQuYXJpdHkgIT09IFwidW5hcnlcIiB8fCBsZWZ0LmlkICE9PSBcImZ1bmN0aW9uXCIpICYmXG4gICAgICAgICAgICAgICAgICAgIGxlZnQuYXJpdHkgIT09IFwibmFtZVwiICYmIGxlZnQuYXJpdHkgIT09IFwibGl0ZXJhbFwiICYmIGxlZnQuaWQgIT09IFwiKFwiICYmXG4gICAgICAgICAgICAgICAgICAgIGxlZnQuaWQgIT09IFwiJiZcIiAmJiBsZWZ0LmlkICE9PSBcInx8XCIgJiYgbGVmdC5pZCAhPT0gXCI/XCIpIHtcbiAgICAgICAgICAgICAgICBlcnJvcihcIkV4cGVjdGVkIGEgdmFyaWFibGUgbmFtZS5cIiwgbGVmdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRva2VuLmlkICE9PSBcIilcIikge1xuICAgICAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgICAgICBhLnB1c2goZXhwcmVzc2lvbigwKSk7XG4gICAgICAgICAgICAgICAgaWYgKHRva2VuLmlkICE9PSBcIixcIikge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYWR2YW5jZShcIixcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYWR2YW5jZShcIilcIik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0pO1xuXG4gICAgLy9maWx0ZXJcbiAgICBpbmZpeChcInxcIiwgMTAsIGZ1bmN0aW9uKGxlZnQpIHtcbiAgICAgIHZhciBhO1xuICAgICAgdGhpcy5maXJzdCA9IGxlZnQ7XG4gICAgICB0b2tlbi5hcml0eSA9ICdmaWx0ZXInO1xuICAgICAgdGhpcy5zZWNvbmQgPSBleHByZXNzaW9uKDEwKTtcbiAgICAgIHRoaXMuYXJpdHkgPSAnYmluYXJ5JztcbiAgICAgIGlmKHRva2VuLmlkID09PSAnOicpe1xuICAgICAgICB0aGlzLmFyaXR5ID0gJ3Rlcm5hcnknO1xuICAgICAgICB0aGlzLnRoaXJkID0gYSA9IFtdO1xuICAgICAgICB3aGlsZSh0cnVlKXtcbiAgICAgICAgICBhZHZhbmNlKCc6Jyk7XG4gICAgICAgICAgYS5wdXNoKGV4cHJlc3Npb24oMCkpO1xuICAgICAgICAgIGlmKHRva2VuLmlkICE9PSBcIjpcIil7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0pO1xuICAgIFxuXG4gICAgcHJlZml4KFwiIVwiKTtcbiAgICBwcmVmaXgoXCItXCIpO1xuICAgIHByZWZpeChcInR5cGVvZlwiKTtcblxuICAgIHByZWZpeChcIihcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZSA9IGV4cHJlc3Npb24oMCk7XG4gICAgICAgIGFkdmFuY2UoXCIpXCIpO1xuICAgICAgICByZXR1cm4gZTtcbiAgICB9KTtcblxuICAgIHByZWZpeChcIltcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgYSA9IFtdO1xuICAgICAgICBpZiAodG9rZW4uaWQgIT09IFwiXVwiKSB7XG4gICAgICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgICAgIGEucHVzaChleHByZXNzaW9uKDApKTtcbiAgICAgICAgICAgICAgICBpZiAodG9rZW4uaWQgIT09IFwiLFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhZHZhbmNlKFwiLFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBhZHZhbmNlKFwiXVwiKTtcbiAgICAgICAgdGhpcy5maXJzdCA9IGE7XG4gICAgICAgIHRoaXMuYXJpdHkgPSBcInVuYXJ5XCI7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0pO1xuXG4gICAgcHJlZml4KFwie1wiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBhID0gW10sIG4sIHY7XG4gICAgICAgIGlmICh0b2tlbi5pZCAhPT0gXCJ9XCIpIHtcbiAgICAgICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICAgICAgbiA9IHRva2VuO1xuICAgICAgICAgICAgICAgIGlmIChuLmFyaXR5ICE9PSBcIm5hbWVcIiAmJiBuLmFyaXR5ICE9PSBcImxpdGVyYWxcIikge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcihcIkJhZCBwcm9wZXJ0eSBuYW1lLlwiLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFkdmFuY2UoKTtcbiAgICAgICAgICAgICAgICBhZHZhbmNlKFwiOlwiKTtcbiAgICAgICAgICAgICAgICB2ID0gZXhwcmVzc2lvbigwKTtcbiAgICAgICAgICAgICAgICB2LmtleSA9IG4udmFsdWU7XG4gICAgICAgICAgICAgICAgYS5wdXNoKHYpO1xuICAgICAgICAgICAgICAgIGlmICh0b2tlbi5pZCAhPT0gXCIsXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFkdmFuY2UoXCIsXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGFkdmFuY2UoXCJ9XCIpO1xuICAgICAgICB0aGlzLmZpcnN0ID0gYTtcbiAgICAgICAgdGhpcy5hcml0eSA9IFwidW5hcnlcIjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSk7XG5cbiAgICAvL19zb3VyY2U6IOihqOi+vuW8j+S7o+eggeWtl+espuS4slxuICAgIC8vX2NvbnRleHQ6IOihqOi+vuW8j+eahOivreWPpeeOr+Wig1xuICAgIHJldHVybiBmdW5jdGlvbiAoX3NvdXJjZSwgX2NvbnRleHQpIHtcbiAgICAgICAgdG9rZW5zID0gdG9rZW5pemUoX3NvdXJjZSwgJz08PiErLSomfC8lXicsICc9PD4mfCcpO1xuICAgICAgICB0b2tlbl9uciA9IDA7XG4gICAgICAgIGNvbnRleHQgPSBfY29udGV4dDtcbiAgICAgICAgYWR2YW5jZSgpO1xuICAgICAgICB2YXIgcyA9IGV4cHJlc3Npb24oMCk7XG4gICAgICAgIGFkdmFuY2UoXCIoZW5kKVwiKTtcbiAgICAgICAgcmV0dXJuIHM7XG4gICAgfTtcbn07XG5cbmV4cG9ydHMucGFyc2UgPSBtYWtlX3BhcnNlKCk7IiwidmFyIHRva2VuUmVnID0gL3t7KHsoW159XFxuXSspfXxbXn1cXG5dKyl9fS9nO1xuXG4vL+Wtl+espuS4suS4reaYr+WQpuWMheWQq+aooeadv+WNoOS9jeespuagh+iusFxuZnVuY3Rpb24gaGFzVG9rZW4oc3RyKSB7XG4gIHRva2VuUmVnLmxhc3RJbmRleCA9IDA7XG4gIHJldHVybiBzdHIgJiYgdG9rZW5SZWcudGVzdChzdHIpO1xufVxuXG5mdW5jdGlvbiBwYXJzZVRva2VuKHZhbHVlKSB7XG4gIHZhciB0b2tlbnMgPSBbXVxuICAgICwgdGV4dE1hcCA9IFtdXG4gICAgLCBzdGFydCA9IDBcbiAgICAsIHZhbCwgdG9rZW5cbiAgICA7XG4gIFxuICB0b2tlblJlZy5sYXN0SW5kZXggPSAwO1xuICBcbiAgd2hpbGUoKHZhbCA9IHRva2VuUmVnLmV4ZWModmFsdWUpKSl7XG4gICAgaWYodG9rZW5SZWcubGFzdEluZGV4IC0gc3RhcnQgPiB2YWxbMF0ubGVuZ3RoKXtcbiAgICAgIHRleHRNYXAucHVzaCh2YWx1ZS5zbGljZShzdGFydCwgdG9rZW5SZWcubGFzdEluZGV4IC0gdmFsWzBdLmxlbmd0aCkpO1xuICAgIH1cbiAgICBcbiAgICB0b2tlbiA9IHtcbiAgICAgIGVzY2FwZTogIXZhbFsyXVxuICAgICwgcGF0aDogKHZhbFsyXSB8fCB2YWxbMV0pLnRyaW0oKVxuICAgICwgcG9zaXRpb246IHRleHRNYXAubGVuZ3RoXG4gICAgLCB0ZXh0TWFwOiB0ZXh0TWFwXG4gICAgfTtcbiAgICBcbiAgICB0b2tlbnMucHVzaCh0b2tlbik7XG4gICAgXG4gICAgLy/kuIDkuKrlvJXnlKjnsbvlnoso5pWw57uEKeS9nOS4uuiKgueCueWvueixoeeahOaWh+acrOWbviwg6L+Z5qC35b2T5p+Q5LiA5Liq5byV55So5pS55Y+Y5LqG5LiA5Liq5YC85ZCOLCDlhbbku5blvJXnlKjlj5blvpfnmoTlgLzpg73kvJrlkIzml7bmm7TmlrBcbiAgICB0ZXh0TWFwLnB1c2godmFsWzBdKTtcbiAgICBcbiAgICBzdGFydCA9IHRva2VuUmVnLmxhc3RJbmRleDtcbiAgfVxuICBcbiAgaWYodmFsdWUubGVuZ3RoID4gc3RhcnQpe1xuICAgIHRleHRNYXAucHVzaCh2YWx1ZS5zbGljZShzdGFydCwgdmFsdWUubGVuZ3RoKSk7XG4gIH1cbiAgXG4gIHRva2Vucy50ZXh0TWFwID0gdGV4dE1hcDtcbiAgXG4gIHJldHVybiB0b2tlbnM7XG59XG5cbmV4cG9ydHMuaGFzVG9rZW4gPSBoYXNUb2tlbjtcblxuZXhwb3J0cy5wYXJzZVRva2VuID0gcGFyc2VUb2tlbjsiLCJcInVzZSBzdHJpY3RcIjtcblxuLy91dGlsc1xuLy8tLS1cblxudmFyIGRvYyA9IHJlcXVpcmUoJy4vZG9jdW1lbnQuanMnKTtcblxudmFyIGtleVBhdGhSZWcgPSAvKD86XFwufFxcWykvZ1xuICAsIGJyYSA9IC9cXF0vZ1xuICA7XG5cbi8vcGF0aC5rZXksIHBhdGhba2V5XSAtLT4gWydwYXRoJywgJ2tleSddXG5mdW5jdGlvbiBwYXJzZUtleVBhdGgoa2V5UGF0aCl7XG4gIHJldHVybiBrZXlQYXRoLnJlcGxhY2UoYnJhLCAnJykuc3BsaXQoa2V5UGF0aFJlZyk7XG59XG5cbi8qKlxuICog5ZCI5bm25a+56LGhXG4gKiBAc3RhdGljXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtkZWVwPWZhbHNlXSDmmK/lkKbmt7HluqblkIjlubZcbiAqIEBwYXJhbSB7T2JqZWN0fSB0YXJnZXQg55uu5qCH5a+56LGhXG4gKiBAcGFyYW0ge09iamVjdH0gW29iamVjdC4uLl0g5p2l5rqQ5a+56LGhXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIOeUqOS6juiHquWumuS5ieWQiOW5tueahOWbnuiwg1xuICogQHJldHVybiB7RnVuY3Rpb259IOWQiOW5tuWQjueahCB0YXJnZXQg5a+56LGhXG4gKi9cbmZ1bmN0aW9uIGV4dGVuZCgvKiBkZWVwLCB0YXJnZXQsIG9iamVjdC4uLiwgY2FsbGxiYWNrICovKSB7XG4gIHZhciBvcHRpb25zXG4gICAgLCBuYW1lLCBzcmMsIGNvcHksIGNvcHlJc0FycmF5LCBjbG9uZVxuICAgICwgdGFyZ2V0ID0gYXJndW1lbnRzWzBdIHx8IHt9XG4gICAgLCBpID0gMVxuICAgICwgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aFxuICAgICwgZGVlcCA9IGZhbHNlXG4gICAgLCBjYWxsYmFja1xuICAgIDtcblxuICAvLyBIYW5kbGUgYSBkZWVwIGNvcHkgc2l0dWF0aW9uXG4gIGlmICh0eXBlb2YgdGFyZ2V0ID09PSBcImJvb2xlYW5cIikge1xuICAgIGRlZXAgPSB0YXJnZXQ7XG5cbiAgICAvLyBza2lwIHRoZSBib29sZWFuIGFuZCB0aGUgdGFyZ2V0XG4gICAgdGFyZ2V0ID0gYXJndW1lbnRzWyBpIF0gfHwge307XG4gICAgaSsrO1xuICB9XG4gIFxuICBpZih1dGlscy5pc0Z1bmN0aW9uKGFyZ3VtZW50c1tsZW5ndGggLSAxXSkpIHtcbiAgICBjYWxsYmFjayA9IGFyZ3VtZW50c1tsZW5ndGggLSAxXTtcbiAgICBsZW5ndGgtLTtcbiAgfVxuXG4gIC8vIEhhbmRsZSBjYXNlIHdoZW4gdGFyZ2V0IGlzIGEgc3RyaW5nIG9yIHNvbWV0aGluZyAocG9zc2libGUgaW4gZGVlcCBjb3B5KVxuICBpZiAodHlwZW9mIHRhcmdldCAhPT0gXCJvYmplY3RcIiAmJiAhdXRpbHMuaXNGdW5jdGlvbih0YXJnZXQpKSB7XG4gICAgdGFyZ2V0ID0ge307XG4gIH1cblxuICBmb3IgKCA7IGkgPCBsZW5ndGg7IGkrKyApIHtcbiAgICAvLyBPbmx5IGRlYWwgd2l0aCBub24tbnVsbC91bmRlZmluZWQgdmFsdWVzXG4gICAgaWYgKCAob3B0aW9ucyA9IGFyZ3VtZW50c1sgaSBdKSAhPSBudWxsICkge1xuICAgICAgLy8gRXh0ZW5kIHRoZSBiYXNlIG9iamVjdFxuICAgICAgZm9yICggbmFtZSBpbiBvcHRpb25zICkge1xuICAgICAgICAvL2FuZHJvaWQgMi4zIGJyb3dzZXIgY2FuIGVudW0gdGhlIHByb3RvdHlwZSBvZiBjb25zdHJ1Y3Rvci4uLlxuICAgICAgICBpZihvcHRpb25zLmhhc093blByb3BlcnR5KG5hbWUpICYmIG5hbWUgIT09ICdwcm90b3R5cGUnKXtcbiAgICAgICAgICBzcmMgPSB0YXJnZXRbIG5hbWUgXTtcbiAgICAgICAgICBjb3B5ID0gb3B0aW9uc1sgbmFtZSBdO1xuICAgICAgICAgIFxuXG4gICAgICAgICAgLy8gUmVjdXJzZSBpZiB3ZSdyZSBtZXJnaW5nIHBsYWluIG9iamVjdHMgb3IgYXJyYXlzXG4gICAgICAgICAgaWYgKCBkZWVwICYmIGNvcHkgJiYgKCB1dGlscy5pc1BsYWluT2JqZWN0KGNvcHkpIHx8IChjb3B5SXNBcnJheSA9IHV0aWxzLmlzQXJyYXkoY29weSkpICkgKSB7XG4gICAgICAgICAgXG4gICAgICAgICAgICAvLyBQcmV2ZW50IG5ldmVyLWVuZGluZyBsb29wXG4gICAgICAgICAgICBpZiAoIHRhcmdldCA9PT0gY29weSApIHtcbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIGNvcHlJc0FycmF5ICkge1xuICAgICAgICAgICAgICBjb3B5SXNBcnJheSA9IGZhbHNlO1xuICAgICAgICAgICAgICBjbG9uZSA9IHNyYyAmJiB1dGlscy5pc0FycmF5KHNyYykgPyBzcmMgOiBbXTtcblxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY2xvbmUgPSBzcmMgJiYgdXRpbHMuaXNQbGFpbk9iamVjdChzcmMpID8gc3JjIDoge307XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgIGNvcHkgPSBjYWxsYmFjayhjbG9uZSwgY29weSwgbmFtZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE5ldmVyIG1vdmUgb3JpZ2luYWwgb2JqZWN0cywgY2xvbmUgdGhlbVxuICAgICAgICAgICAgdGFyZ2V0WyBuYW1lIF0gPSBleHRlbmQoIGRlZXAsIGNsb25lLCBjb3B5LCBjYWxsYmFjayk7XG5cbiAgICAgICAgICAgIC8vIERvbid0IGJyaW5nIGluIHVuZGVmaW5lZCB2YWx1ZXNcbiAgICAgICAgICB9IGVsc2UgaWYgKCAhdXRpbHMuaXNVbmRlZmluZWQoY29weSkgKSB7XG5cbiAgICAgICAgICAgIGlmKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgIGNvcHkgPSBjYWxsYmFjayhzcmMsIGNvcHksIG5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGFyZ2V0WyBuYW1lIF0gPSBjb3B5O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFJldHVybiB0aGUgbW9kaWZpZWQgb2JqZWN0XG4gIHJldHVybiB0YXJnZXQ7XG59XG5cbnZhciBjcmVhdGUgPSBPYmplY3QuY3JlYXRlIHx8IGZ1bmN0aW9uIChvKSB7XG4gIGZ1bmN0aW9uIEYoKSB7fVxuICBGLnByb3RvdHlwZSA9IG87XG4gIHJldHVybiBuZXcgRigpO1xufTtcblxuZnVuY3Rpb24gdHBsUGFyc2UodHBsLCB0YXJnZXQpIHtcbiAgdmFyIGVsO1xuICBpZih1dGlscy5pc09iamVjdCh0cGwpKXtcbiAgICBpZih0YXJnZXQpe1xuICAgICAgZWwgPSB0YXJnZXQgPSB1dGlscy5pc09iamVjdCh0YXJnZXQpID8gdGFyZ2V0IDogZG9jLmNyZWF0ZUVsZW1lbnQodGFyZ2V0KTtcbiAgICAgIGVsLmlubmVySFRNTCA9ICcnOy8v5riF56m655uu5qCH5a+56LGhXG4gICAgICB0YXJnZXQuYXBwZW5kQ2hpbGQodHBsKTtcbiAgICB9ZWxzZXtcbiAgICAgIGVsID0gdHBsO1xuICAgIH1cbiAgICB0cGwgPSBlbC5vdXRlckhUTUw7XG4gIH1lbHNle1xuICAgIGVsID0gdXRpbHMuaXNPYmplY3QodGFyZ2V0KSA/IHRhcmdldCA6IGRvYy5jcmVhdGVFbGVtZW50KHRhcmdldCB8fCAnZGl2Jyk7XG4gICAgZWwuaW5uZXJIVE1MID0gdHBsO1xuICB9XG4gIHJldHVybiB7ZWw6IGVsLCB0cGw6IHRwbH07XG59XG5cbiBcbnZhciB1dGlscyA9IHtcbiAgbm9vcDogZnVuY3Rpb24gKCl7fVxuLCBpZTogISFkb2MuYXR0YWNoRXZlbnRcblxuLCBpc09iamVjdDogZnVuY3Rpb24gKHZhbCkge1xuICAgIHJldHVybiB0eXBlb2YgdmFsID09PSAnb2JqZWN0JyAmJiB2YWwgIT09IG51bGw7XG4gIH1cblxuLCBpc1VuZGVmaW5lZDogZnVuY3Rpb24gKHZhbCkge1xuICAgIHJldHVybiB0eXBlb2YgdmFsID09PSAndW5kZWZpbmVkJztcbiAgfVxuXG4sIGlzRnVuY3Rpb246IGZ1bmN0aW9uICh2YWwpe1xuICAgIHJldHVybiB0eXBlb2YgdmFsID09PSAnZnVuY3Rpb24nO1xuICB9XG5cbiwgaXNBcnJheTogZnVuY3Rpb24gKHZhbCkge1xuICAgIGlmKHV0aWxzLmllKXtcbiAgICAgIC8vSUUgOSDlj4rku6XkuIsgSUUg6Leo56qX5Y+j5qOA5rWL5pWw57uEXG4gICAgICByZXR1cm4gdmFsICYmIHZhbC5jb25zdHJ1Y3RvciArICcnID09PSBBcnJheSArICcnO1xuICAgIH1lbHNle1xuICAgICAgcmV0dXJuIEFycmF5LmlzQXJyYXkodmFsKTtcbiAgICB9XG4gIH1cblxuICAvL+eugOWNleWvueixoeeahOeugOaYk+WIpOaWrVxuLCBpc1BsYWluT2JqZWN0OiBmdW5jdGlvbiAobyl7XG4gICAgaWYgKCFvIHx8ICh7fSkudG9TdHJpbmcuY2FsbChvKSAhPT0gJ1tvYmplY3QgT2JqZWN0XScgfHwgby5ub2RlVHlwZSB8fCBvID09PSBvLndpbmRvdykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1lbHNle1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgLy/lh73mlbDliIfpnaIuIG9yaUZuIOWOn+Wni+WHveaVsCwgZm4g5YiH6Z2i6KGl5YWF5Ye95pWwXG4gIC8v5YmN6Z2i55qE5Ye95pWw6L+U5Zue5YC85Lyg5YWlIGJyZWFrQ2hlY2sg5Yik5patLCBicmVha0NoZWNrIOi/lOWbnuWAvOS4uuecn+aXtuS4jeaJp+ihjOWIh+mdouihpeWFheeahOWHveaVsFxuLCBiZWZvcmVGbjogZnVuY3Rpb24gKG9yaUZuLCBmbiwgYnJlYWtDaGVjaykge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciByZXQgPSBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgaWYoYnJlYWtDaGVjayAmJiBicmVha0NoZWNrLmNhbGwodGhpcywgcmV0KSl7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gb3JpRm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG5cbiwgYWZ0ZXJGbjogZnVuY3Rpb24gKG9yaUZuLCBmbiwgYnJlYWtDaGVjaykge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciByZXQgPSBvcmlGbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgaWYoYnJlYWtDaGVjayAmJiBicmVha0NoZWNrLmNhbGwodGhpcywgcmV0KSl7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgICB9XG4gICAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG4gIH1cbiAgXG4sIHBhcnNlS2V5UGF0aDogcGFyc2VLZXlQYXRoXG5cbiwgZGVlcFNldDogZnVuY3Rpb24gKGtleVN0ciwgdmFsdWUsIG9iaikge1xuICAgIGlmKGtleVN0cil7XG4gICAgICB2YXIgY2hhaW4gPSBwYXJzZUtleVBhdGgoa2V5U3RyKVxuICAgICAgICAsIGN1ciA9IG9ialxuICAgICAgICA7XG4gICAgICBjaGFpbi5mb3JFYWNoKGZ1bmN0aW9uKGtleSwgaSkge1xuICAgICAgICBpZihpID09PSBjaGFpbi5sZW5ndGggLSAxKXtcbiAgICAgICAgICBjdXJba2V5XSA9IHZhbHVlO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICBpZihjdXIgJiYgY3VyLmhhc093blByb3BlcnR5KGtleSkpe1xuICAgICAgICAgICAgY3VyID0gY3VyW2tleV07XG4gICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICBjdXJba2V5XSA9IHt9O1xuICAgICAgICAgICAgY3VyID0gY3VyW2tleV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9ZWxzZXtcbiAgICAgIGV4dGVuZChvYmosIHZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuLCBkZWVwR2V0OiBmdW5jdGlvbiAoa2V5U3RyLCBvYmopIHtcbiAgICB2YXIgY2hhaW4sIGN1ciA9IG9iaiwga2V5O1xuICAgIGlmKGtleVN0cil7XG4gICAgICBjaGFpbiA9IHBhcnNlS2V5UGF0aChrZXlTdHIpO1xuICAgICAgZm9yKHZhciBpID0gMCwgbCA9IGNoYWluLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICBrZXkgPSBjaGFpbltpXTtcbiAgICAgICAgaWYoY3VyICYmIGN1ci5oYXNPd25Qcm9wZXJ0eShrZXkpKXtcbiAgICAgICAgICBjdXIgPSBjdXJba2V5XTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjdXI7XG4gIH1cbiwgZXh0ZW5kOiBleHRlbmRcbiwgY3JlYXRlOiBjcmVhdGVcbiwgdHBsUGFyc2U6IHRwbFBhcnNlXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHV0aWxzOyJdfQ==
(1)
});
