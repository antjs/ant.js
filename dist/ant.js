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
        if(vm.$watchers[i].token.update === callback){
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
, FRAGMENT: 11
};

//遍历元素及其子元素的所有属性节点及文本节点
function travelEl(el, vm, assignment) {
  assignment = create(assignment || {});
  
  if(el.nodeType === NODETYPE.FRAGMENT) {
    el = el.childNodes;
  }
  
  if(('length' in el) && isUndefined(el.nodeType)){
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
  
  if(checkAttr(el, vm, assignment)){
    return;
  }
  
  //template
  if(el.content) {
    travelEl(el.content, vm, assignment);
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
    , dirs = Ant.directive.getDir(el, Ant.directives, prefix)
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
    
    el.removeAttribute(dir.nodeName);
    
    setBinding(vm, dir);
   
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
  var ass = token.assignment;
  
  this.token = token;
  this.relativeVm = relativeVm;
  this.ant = relativeVm.$root.$ant;
  
  this.val = NaN;
  
  exParse.call(this, token.path);
  
  for(var i = 0, l = this.paths.length; i < l; i++){
    relativeVm.$getVM(this.paths[i], {assignment: ass}).$watchers.push(this);
  }
  
  var run;
  for(var i = 0, l = this.locals.length; i < l; i++) {
    run = run || ass && (this.locals[i] in ass) && ass[this.locals[i]] !== relativeVm;
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
    
    try{
      val = evaluate.eval(this._ast, {locals: vals, filters: ant.filters});
    }catch(e){
      val = '';
      console.error(e);
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

Ant.version = '0.3.0-alpha';

module.exports = Ant;

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
  , token = _dereq_('./token.js')
  , doc = _dereq_('./document.js')
  ;

/**
 * 为 Ant 构造函数添加指令 (directive). `Ant.directive`
 * @param {String} key directive 名称
 * @param {Object} [opts] directive 参数
 * @param {Number} opts.priority=0 directive 优先级. 同一个元素上的指令按照优先级顺序执行. 
 * @param {Boolean} opts.terminal=false 执行该 directive 后, 是否终止后续 directive 执行.
 *   terminal 为真时, 与该 directive 优先级相同的 directive 仍会继续执行, 较低优先级的才会被忽略.
 * @param {Boolean} opts.anchor anchor 为 true 时, 会在指令节点前后各产生一个空白的标记节点. 分别对应 `anchors.start` 和 `anchors.end`
 */
function directive(key, opts) {
  var dirs = this.directives = this.directives || {};
  
  return dirs[key] = new Directive(key, opts);
}

function Directive(key, opts) {
  this.type = key;
  utils.extend(this, opts);
}

Directive.prototype = {
  priority: 0
, link: utils.noop
, update: utils.noop
, tearDown: utils.noop
, terminal: false
, replace: false

, anchor: false
, anchors: null

  //当 anchor 为 true 时, 获取两个锚点之间的所有节点.
, getNodes: function() {
    var nodes = [], node = this.anchors.start.nextSibling;
    if(this.anchor) {
      while(node !== this.anchors.end){
        nodes.push(node);
        node = node.nextSibling;
      }
      
      return nodes;
    }else{
      return null;
    }
  }
};

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
      dir = utils.create(directives[dirName]);
      dir.dirName = dirName
    }else if(token.hasToken(attr.value)) {
      dir = utils.create(directives['attr']);
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
      dirs.push(utils.extend(dir, {el: el, node: attr, nodeName: attrName, path: attr.value, anchors: dir.anchor ? anchors : null}));
    }
  }
  dirs.sort(function(d0, d1) {
    return d1.priority - d0.priority;
  });
  return dirs;
}

directive.getDir = getDir;

exports.directive = directive;

},{"./document.js":8,"./token.js":12,"./utils.js":13}],4:[function(_dereq_,module,exports){
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
, replace: true
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
    var el = doc.createElement('div');
    el.innerHTML = utils.isUndefined(val) ? '' : val;
    
    var node;
    while(node = this.nodes.pop()) {
      node.parentNode && node.parentNode.removeChild(node);
    }
    
    var nodes = el.childNodes;
    while(node = nodes[0]) {
      this.nodes.push(node);
      this.el.insertBefore(node, this.node);
    }
  }
};

  
dirs['if'] = {
  anchor: true
, link: function() {
    if(this.el.content) {
      this.frag = this.el.content;
      this.el.parentNode.removeChild(this.el);
    }else{
      this.frag = doc.createDocumentFragment()
      this.hide();
    }
  }
, update: function(val) {
    if(val) {
      if(!this.state) { this.show() }
    }else{
      if(this.state) { this.hide(); }
    }
    this.state = val;
  }
  
, show: function() {
    var anchor = this.anchors.end;
    
    anchor.parentNode.insertBefore(this.frag, anchor);
  }
, hide: function() {
    var parent = this.anchors.end.parentNode
      , nodes = this.getNodes()
      ;
    
    for(var i = 0, l = nodes.length; i < l; i++) {
      this.frag.appendChild(nodes[i]);
    }
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
, anchor: true
, link: function() {
    var nodes = this.el.childNodes
      , parent = this.anchors.end.parentNode
      , frag = doc.createDocumentFragment()
      ;
      
    while(nodes[0]) {
      frag.appendChild(nodes[0]);
    }
    
    this.el.content = frag;
    
    //parent.removeChild(this.el);
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
    var parent = this.anchors.end.parentNode
      , nodes = this.getNodes()
      ;
      
    this.els = [];
    this.relativeVm = vm;
    
    if(this.el.content) {
      this.frag = this.el.content;
      this.el.parentNode.removeChild(this.el);
    }else{
      this.frag = doc.createDocumentFragment();
      
      for(var i = 0, l = nodes.length; i < l; i++) {
        this.frag.appendChild(nodes[i]);
      }
    }
    
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
      , vm
      ;
    
    if(utils.isUndefined(n)){
      args[1] = n = els.length - index;
    }
    
    for(var i = index, l = els.length; i < l; i++){
      if(i < index + n){
        //删除
        //对于拥有 if 属性并且不显示的节点, 其并不存在于 DOM 树中
        try{ 
          setList(els[i], function() {
            pn.removeChild(this)
          });
          //pn.removeChild(els[i]); 
        }catch(e){}
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
          
          //els[oldI]['$index'] = newI;
          setList(els[oldI], function() {this['$index'] = newI});
          
          if(fixVm){
            vm = this.vm[newI] = this.vm[oldI];
            vm.$key = newI + '';
            vm['$index'] && vm['$index'].$update(vm.$key);
            vm['$index'] && vm['$index'].$update(vm.$key);
          }
        }else{
          break;
        }
      }
    }
    
    //新增
    var assignment, el, nodes;
    for(var j = 0; j < m; j++){
      el = this.frag.cloneNode(true);
      fixVm && delete this.vm[index + j];
      vm = this.vm.$getVM(index + j, {scope: this.vm, assignment: this.assignment});
      
      assignment = utils.create(this.assignment);
      for(var a = 0; a < this.assignments.length; a++) {
        assignment[this.assignments[a]] = vm;
      }
      
      vm.$build(el, assignment);
      
      nodes = [].slice.call(el.childNodes);
      
      frag.appendChild(el);
      
      fixVm && vm['$index'] && vm['$index'].$update(vm.$key);
      
      //el['$index'] = index + j;
      setList(nodes, function() {this['$index'] = index + j});
      
      newEls.push(nodes);
    }
    if(newEls.length){
      pn.insertBefore(frag, els[index + n] && els[index + n][0] || this.anchors.end);
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
      
      setList(this.els[i], function() {this['$index'] = l - i - 1});
      //this.els[i]['$index'] = l - i - 1;
      
      setList(this.els[l - i - 1], function() {
        frag.appendChild(this)
      });
      //frag.appendChild(this.els[l - i - 1]);
    }
    anchor.parentNode.insertBefore(frag, anchor);
    this.els.reverse();
  }
, sort: function(fn){
    //TODO 进行精确高还原的排序?
    this.update(this.vm.$value);
  }
};


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

//nodelist 批量处理
function setList(nodeList, fn) {
  fn = fn || utils.noop;
  for(var i = 0, l = nodeList.length; i < l; i++) {
    fn.call(nodeList[i]);
  }
}
  
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
      if(typeof r !== 'undefined'){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJFOlxcanVzdGFuXFxEcm9wYm94XFxjb2RlXFxhbnQuanNcXG5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwiRTovanVzdGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL2FudC5qcyIsIkU6L2p1c3Rhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy9jbGFzcy5qcyIsIkU6L2p1c3Rhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy9kaXJlY3RpdmUuanMiLCJFOi9qdXN0YW4vRHJvcGJveC9jb2RlL2FudC5qcy9zcmMvZGlyZWN0aXZlcy9hdHRyLmpzIiwiRTovanVzdGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL2RpcmVjdGl2ZXMvaW5kZXguanMiLCJFOi9qdXN0YW4vRHJvcGJveC9jb2RlL2FudC5qcy9zcmMvZGlyZWN0aXZlcy9tb2RlbC5qcyIsIkU6L2p1c3Rhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy9kaXJlY3RpdmVzL3JlcGVhdC5qcyIsIkU6L2p1c3Rhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy9kb2N1bWVudC5qcyIsIkU6L2p1c3Rhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy9ldmFsLmpzIiwiRTovanVzdGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL2V2ZW50LmpzIiwiRTovanVzdGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL3BhcnNlLmpzIiwiRTovanVzdGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL3Rva2VuLmpzIiwiRTovanVzdGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4c0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdk9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgZG9jID0gcmVxdWlyZSgnLi9kb2N1bWVudC5qcycpXG4gICwgcGFyc2UgPSByZXF1aXJlKCcuL3BhcnNlLmpzJykucGFyc2VcbiAgLCBldmFsdWF0ZSA9IHJlcXVpcmUoJy4vZXZhbC5qcycpXG4gICwgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJylcbiAgLCBFdmVudCA9IHJlcXVpcmUoJy4vZXZlbnQuanMnKVxuICAsIENsYXNzID0gcmVxdWlyZSgnLi9jbGFzcy5qcycpXG4gICwgRGlyID0gcmVxdWlyZSgnLi9kaXJlY3RpdmUuanMnKVxuICAsIGRpcnMgPSByZXF1aXJlKCcuL2RpcmVjdGl2ZXMnKVxuICAsIHRva2VuID0gcmVxdWlyZSgnLi90b2tlbi5qcycpXG4gIDtcblxuXG52YXIgaXNPYmplY3QgPSB1dGlscy5pc09iamVjdFxuICAsIGlzVW5kZWZpbmVkID0gdXRpbHMuaXNVbmRlZmluZWRcbiAgLCBpc0Z1bmN0aW9uID0gdXRpbHMuaXNGdW5jdGlvblxuICAsIGlzQXJyYXkgPSB1dGlscy5pc0FycmF5XG4gICwgaXNQbGFpbk9iamVjdCA9IHV0aWxzLmlzUGxhaW5PYmplY3RcbiAgLCBhZnRlckZuID0gdXRpbHMuYWZ0ZXJGblxuICAsIHBhcnNlS2V5UGF0aCA9IHV0aWxzLnBhcnNlS2V5UGF0aFxuICAsIGRlZXBTZXQgPSB1dGlscy5kZWVwU2V0XG4gICwgZGVlcEdldCA9IHV0aWxzLmRlZXBHZXRcbiAgLCBleHRlbmQgPSB1dGlscy5leHRlbmRcbiAgLCBpZSA9IHV0aWxzLmllXG4gICwgdHBsUGFyc2UgPSB1dGlscy50cGxQYXJzZVxuICAsIGNyZWF0ZSA9IHV0aWxzLmNyZWF0ZVxuICA7XG5cblxuZnVuY3Rpb24gc2V0UHJlZml4KG5ld1ByZWZpeCkge1xuICBpZihuZXdQcmVmaXgpe1xuICAgIHRoaXMucHJlZml4ID0gbmV3UHJlZml4O1xuICB9XG59XG5cblxuLyoqXG4gKiAjIEFudFxuICog5Z+65LqOIGRvbSDnmoTmqKHmnb/lvJXmk44uIOaUr+aMgeaVsOaNrue7keWumlxuICogQHBhcmFtIHtTdHJpbmcgfCBFbGVtZW50fSBbdHBsXSDmqKHmnb/lupTor6XmmK/lkIjms5XogIzkuJTmoIflh4bnmoQgSFRNTCDmoIfnrb7lrZfnrKbkuLLmiJbogIXnm7TmjqXmmK/njrDmnIkgRE9NIOagkeS4reeahOS4gOS4qiBlbGVtZW50IOWvueixoS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0c11cbiAqIEBwYXJhbSB7U3RyaW5nIHwgRWxlbWVudH0gb3B0cy50cGxcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzLmRhdGEg5riy5p+T5qih5p2/55qE5pWw5o2uLiDor6XpobnlpoLmnpzkuLrnqbosIOeojeWQjuWPr+S7peeUqCBgdHBsLnJlbmRlcihtb2RlbClgIOadpea4suafk+eUn+aIkCBodG1sLlxuICogQHBhcmFtIHtCb29sZWFufSBvcHRzLmxhenkg5piv5ZCm5a+5ICdpbnB1dCcg5Y+KICd0ZXh0YXJlYScg55uR5ZCsIGBjaGFuZ2VgIOS6i+S7tiwg6ICM5LiN5pivIGBpbnB1dGAg5LqL5Lu2XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cy5ldmVudHMgXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cy5wYXJ0aWFsc1xuICogQHBhcmFtIHtTdHJpbmcgfCBIVE1MRUxlbWVudH0gb3B0cy5lbFxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIEFudCh0cGwsIG9wdHMpIHtcbiAgaWYoaXNQbGFpbk9iamVjdCh0cGwpKSB7XG4gICAgdHBsID0gb3B0cy50cGw7XG4gIH1cbiAgb3B0cyA9IG9wdHMgfHwge307XG4gIHZhciBlbFxuICAgICwgZGVmYXVsdHMgPSB0aGlzLmRlZmF1bHRzIHx8IHt9XG4gICAgO1xuXG4gIG9wdHMgPSBleHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBvcHRzKTtcblxuICB2YXIgZGF0YSA9IG9wdHMuZGF0YSB8fCB7fVxuICAgICwgZXZlbnRzID0gb3B0cy5ldmVudHMgfHwge31cbiAgICAsIGZpbHRlcnMgPSBvcHRzLmZpbHRlcnMgfHwge31cbiAgICA7XG4gIFxuICBlbCA9IHRwbFBhcnNlKHRwbCwgb3B0cy5lbCk7XG4gIHRwbCA9IGVsLnRwbDtcbiAgZWwgPSBlbC5lbDtcbiAgXG4gIC8v5bGe5oCnXG4gIC8vLS0tLVxuICBcbiAgdGhpcy5vcHRpb25zID0gb3B0cztcbiAgLyoqXG4gICAqICMjIyBhbnQudHBsXG4gICAqIOaooeadv+Wtl+espuS4slxuICAgKiBAdHlwZSB7U3RyaW5nfVxuICAgKi9cbiAgdGhpcy50cGwgPSB0cGw7XG4gIFxuICAvKipcbiAgICogIyMjIGFudC5lbFxuICAgKiDmqKHmnb8gRE9NIOWvueixoS5cbiAgICogQHR5cGUge0hUTUxFbGVtZW50T2JqZWN0fVxuICAgKi9cbiAgdGhpcy5lbCA9IGVsO1xuICBcbiAgLyoqXG4gICAqICMjIyBhbnQuZGF0YVxuICAgKiDnu5HlrprmqKHmnb/nmoTmlbDmja4uXG4gICAqIEB0eXBlIHtPYmplY3R9IOaVsOaNruWvueixoSwg5LiN5bqU6K+l5piv5pWw57uELlxuICAgKi9cbiAgdGhpcy5kYXRhID0ge307XG4gIC8qKlxuICAgKiAjIyMgYW50LmlzUmVuZGVyZWRcbiAgICog6K+l5qih5p2/5piv5ZCm5bey57uP57uR5a6a5pWw5o2uXG4gICAqIEB0eXBlIHtCb29sZWFufSDlnKjosIPnlKggYHJlbmRlcmAg5pa55rOV5ZCOLCDor6XlsZ7mgKflsIbkuLogYHRydWVgXG4gICAqL1xuICB0aGlzLmlzUmVuZGVyZWQgPSBmYWxzZTtcbiAgXG4gIHRoaXMucGFydGlhbHMgPSB7fTtcbiAgdGhpcy5maWx0ZXJzID0ge307XG4gIFxuICBmb3IodmFyIGV2ZW50IGluIGV2ZW50cykge1xuICAgIHRoaXMub24oZXZlbnQsIGV2ZW50c1tldmVudF0pO1xuICB9XG5cbiAgZm9yKHZhciBmaWx0ZXJOYW1lIGluIGZpbHRlcnMpe1xuICAgIHRoaXMuc2V0RmlsdGVyKGZpbHRlck5hbWUsIGZpbHRlcnNbZmlsdGVyTmFtZV0pO1xuICB9XG4gIFxuICBidWlsZFZpZXdNb2RlbC5jYWxsKHRoaXMpO1xuICBcbiAgLy/ov5nph4zpnIDopoHlkIjlubblj6/og73lrZjlnKjnmoQgdGhpcy5kYXRhXG4gIC8v6KGo5Y2V5o6n5Lu25Y+v6IO95Lya5pyJ6buY6K6k5YC8LCBgYnVpbGRWaWV3TW9kZWxgIOWQjuS8mum7mOiupOWAvOS8muW5tuWFpSBgdGhpcy5kYXRhYCDkuK1cbiAgZGF0YSA9IGV4dGVuZCh0aGlzLmRhdGEsIGRhdGEpO1xuICBcbiAgaWYob3B0cy5kYXRhKXtcbiAgICB0aGlzLnJlbmRlcihkYXRhKTtcbiAgfVxufVxuXG4vL+mdmeaAgeaWueazleWPiuWxnuaAp1xuLy8tLS1cbmV4dGVuZChBbnQsIENsYXNzLCBEaXIsIHtcbiAgc2V0UHJlZml4OiBzZXRQcmVmaXhcbiwgZG9jOiBkb2NcbiwgZGlyZWN0aXZlczoge31cbiwgdXRpbHM6IHV0aWxzXG59KTtcblxuQW50LnNldFByZWZpeCgnYS0nKTtcblxuLy/lhoXnva4gZGlyZWN0aXZlXG5mb3IodmFyIGRpciBpbiBkaXJzKSB7XG4gIEFudC5kaXJlY3RpdmUoZGlyLCBkaXJzW2Rpcl0pO1xufVxuICBcbi8v5a6e5L6L5pa55rOVXG4vLy0tLS1cbmV4dGVuZChBbnQucHJvdG90eXBlLCBFdmVudCwge1xuICAvKipcbiAgICogIyMjIGFudC5yZW5kZXJcbiAgICog5riy5p+T5qih5p2/XG4gICAqL1xuICByZW5kZXI6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICBkYXRhID0gZGF0YSB8fCB0aGlzLmRhdGE7XG4gICAgdGhpcy5zZXQoZGF0YSwge2lzRXh0ZW5kOiBmYWxzZX0pO1xuICAgIHRoaXMuaXNSZW5kZXJlZCA9IHRydWU7XG4gICAgdGhpcy50cmlnZ2VyKCdyZW5kZXInKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICAvKipcbiAgICogIyMjIGFudC5jbG9uZVxuICAgKiDlpI3liLbmqKHmnb9cbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRzXVxuICAgKiBAcmV0dXJuIHtUZW1wbGF0ZU9iamVjdH0g5LiA5Liq5pawIGBBbnRgIOWunuS+i1xuICAgKi9cbiwgY2xvbmU6IGZ1bmN0aW9uKG9wdHMpIHtcbiAgICB2YXIgb3B0aW9ucyA9IGV4dGVuZCh0cnVlLCB7fSwgdGhpcy5vcHRpb25zKTtcbiAgICBpZihvcHRzICYmIG9wdHMuZGF0YSl7IG9wdGlvbnMuZGF0YSA9IG51bGw7IH1cbiAgICByZXR1cm4gbmV3IHRoaXMuY29uc3RydWN0b3IodGhpcy50cGwsIGV4dGVuZCh0cnVlLCBvcHRpb25zLCBvcHRzKSk7XG4gIH1cbiAgXG4sIGdldDogZnVuY3Rpb24oa2V5KSB7XG4gICAgcmV0dXJuIGRlZXBHZXQoa2V5LCB0aGlzLmRhdGEpO1xuICB9XG4gIFxuICAvKipcbiAgICogIyMjIGFudC5zZXRcbiAgICog5pu05pawIGBhbnQuZGF0YWAg5Lit55qE5pWw5o2uXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBba2V5XSDmlbDmja7ot6/lvoQuIFxuICAgKiBAcGFyYW0ge0FueVR5cGV8T2JqZWN0fSB2YWwg5pWw5o2u5YaF5a65LiDlpoLmnpzmlbDmja7ot6/lvoTooqvnnIHnlaUsIOesrOS4gOS4quWPguaVsOaYr+S4gOS4quWvueixoS4g6YKj5LmIIHZhbCDlsIbmm7/mjaIgYW50LmRhdGEg5oiW6ICF5bm25YWl5YW25LitXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0XSDlj4LmlbDpoblcbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHQuc2lsZW5jZSDmmK/lkKbpnZnpnZnnmoTmm7TmlrDmlbDmja7ogIzkuI3op6blj5EgYHVwZGF0ZWAg5LqL5Lu25Y+K5pu05pawIERPTS5cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHQuaXNFeHRlbmQg5pWw5o2u6K6+572u57G75Z6LLiDmmK/lkKblsIbmlbDmja7lubblhaXljp/mlbDmja4uIFxuICAgICAgICAgICAg56ys5LiA5Liq5Y+C5pWw5piv5pWw5o2u6Lev5b6E5piv6K+l5YC86buY6K6k5Li6IGZhbHNlLCDogIznrKzkuIDkuKrmlbDmja7mmK/mlbDmja7lr7nosaHnmoTml7blgJnliJnpu5jorqTkuLogdHJ1ZVxuICAgKi9cbiwgc2V0OiBmdW5jdGlvbihrZXksIHZhbCwgb3B0KSB7XG4gICAgdmFyIGNoYW5nZWQsIGlzRXh0ZW5kLCBwYXJlbnQsIGtleXMsIHBhdGg7XG4gICAgXG4gICAgaWYoaXNVbmRlZmluZWQoa2V5KSl7IHJldHVybiB0aGlzOyB9XG4gICAgXG4gICAgaWYoaXNPYmplY3Qoa2V5KSl7XG4gICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgIG9wdCA9IHZhbDtcbiAgICAgIG9wdCA9IG9wdCB8fCB7fTtcbiAgICAgIGlmKG9wdC5pc0V4dGVuZCAhPT0gZmFsc2Upe1xuICAgICAgICBpc0V4dGVuZCA9IHRydWU7XG4gICAgICAgIC8vbW9kZWxFeHRlbmQodGhpcy5kYXRhLCBrZXksIHRoaXMuX3ZtKTtcbiAgICAgICAgZXh0ZW5kKHRydWUsIHRoaXMuZGF0YSwga2V5KTtcbiAgICAgIH1lbHNle1xuICAgICAgICBpc0V4dGVuZCA9IGZhbHNlO1xuICAgICAgICAvL3RoaXMuZGF0YSA9IG1vZGVsRXh0ZW5kKHt9LCBrZXksIHRoaXMuX3ZtKTtcbiAgICAgICAgdGhpcy5kYXRhID0gZXh0ZW5kKHRydWUsIHt9LCBrZXkpO1xuICAgICAgfVxuICAgIH1lbHNle1xuICAgICAgb3B0ID0gb3B0IHx8IHt9O1xuICAgICAgXG4gICAgICBpZihkZWVwR2V0KGtleSwgdGhpcy5kYXRhKSAhPT0gdmFsKSB7XG4gICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgfVxuICAgICAgaWYoY2hhbmdlZCl7XG4gICAgICAgIGlmKG9wdC5pc0V4dGVuZCAhPT0gdHJ1ZSl7XG4gICAgICAgICAga2V5cyA9IHBhcnNlS2V5UGF0aChrZXkpO1xuICAgICAgICAgIGlmKGtleXMubGVuZ3RoID4gMSl7XG4gICAgICAgICAgICBwYXRoID0ga2V5cy5wb3AoKTtcbiAgICAgICAgICAgIHBhcmVudCA9IGRlZXBHZXQoa2V5cy5qb2luKCcuJyksIHRoaXMuZGF0YSk7XG4gICAgICAgICAgICBpZihpc1VuZGVmaW5lZChwYXJlbnQpKXtcbiAgICAgICAgICAgICAgZGVlcFNldChrZXlzLmpvaW4oJy4nKSwgcGFyZW50ID0ge30sIHRoaXMuZGF0YSk7XG4gICAgICAgICAgICB9ZWxzZSBpZighaXNPYmplY3QocGFyZW50KSl7XG4gICAgICAgICAgICAgIHZhciBvbGRQYXJlbnQgPSBwYXJlbnQ7XG4gICAgICAgICAgICAgIGRlZXBTZXQoa2V5cy5qb2luKCcuJyksIHBhcmVudCA9IHt0b1N0cmluZzogZnVuY3Rpb24oKSB7IHJldHVybiBvbGRQYXJlbnQ7IH19LCB0aGlzLmRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgaWYoa2V5KXtcbiAgICAgICAgICAgICAgcGFyZW50ID0gdGhpcy5kYXRhO1xuICAgICAgICAgICAgICBwYXRoID0ga2V5O1xuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgIHBhcmVudCA9IHRoaXM7XG4gICAgICAgICAgICAgIHBhdGggPSAnZGF0YSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHBhcmVudFtwYXRoXSA9IGlzT2JqZWN0KHZhbCkgPyBleHRlbmQodHJ1ZSwgaXNBcnJheSh2YWwpID8gW10gOiB7fSwgdmFsKSA6IHZhbDtcbiAgICAgICAgICAvL3BhcmVudFtwYXRoXSA9IHZhbDtcbiAgICAgICAgICBpc0V4dGVuZCA9IGZhbHNlO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAvL21vZGVsRXh0ZW5kKHRoaXMuZGF0YSwgZGVlcFNldChrZXksIHZhbCwge30pLCB0aGlzLl92bSk7XG4gICAgICAgICAgZXh0ZW5kKHRydWUsIHRoaXMuZGF0YSwgZGVlcFNldChrZXksIHZhbCwge30pKTtcbiAgICAgICAgICBpc0V4dGVuZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgY2hhbmdlZCAmJiAoIW9wdC5zaWxlbmNlKSAmJiAoaXNPYmplY3Qoa2V5KSA/IHVwZGF0ZS5jYWxsKHRoaXMsIGtleSwgaXNFeHRlbmQsIG9wdC5pc0J1YmJsZSkgOiB1cGRhdGUuY2FsbCh0aGlzLCBrZXksIHZhbCwgaXNFeHRlbmQsIG9wdC5pc0J1YmJsZSkpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIC8qKlxuICAgKiAjIyMgYW50LnNldFBhcnRpYWxcbiAgICog5re75Yqg5a2Q5qih5p2/XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBpbmZvIOWtkOaooeadv+S/oeaBr1xuICAgKiBAcGFyYW0ge1N0cmluZ3xIVE1MRWxlbWVudH0gaW5mby5jb250ZW50IOWtkOaooeadv+WGheWuuVxuICAgKiBAcGFyYW0ge1N0cmluZ30gW2luZm8ubmFtZV0g5a2Q5qih5p2/5qCH56S656ymXG4gICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR8ZnVuY3Rpb259IFtpbmZvLnRhcmdldF0g5a2Q5qih5p2/55qE55uu5qCH6IqC54K5XG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gW2luZm8uZXNjYXBlXSDmmK/lkKbovazkuYnlrZfnrKbkuLLlrZDmqKHmnb9cbiAgICogQHBhcmFtIHtTdHJpbmd9IFtpbmZvLnBhdGhdIOaMh+WumuWtkOaooeadv+S4reWPmOmHj+WcqOaVsOaNruS4reeahOS9nOeUqOWfn1xuICAgKi9cbiwgc2V0UGFydGlhbDogZnVuY3Rpb24ocGFydGlhbEluZm8pIHtcbiAgICBpZighcGFydGlhbEluZm8peyByZXR1cm47IH1cbiAgICBcbiAgICBwYXJ0aWFsSW5mbyA9IGV4dGVuZCh7fSwgdGhpcy5wYXJ0aWFsc1twYXJ0aWFsSW5mby5uYW1lXSwgcGFydGlhbEluZm8pO1xuICAgIFxuICAgIHZhciBlbHMsIF9lbHMsIHZtXG4gICAgICAsIG5hbWUgPSBwYXJ0aWFsSW5mby5uYW1lXG4gICAgICAsIHRhcmdldCA9IHBhcnRpYWxJbmZvLnRhcmdldFxuICAgICAgLCBwYXJ0aWFsID0gcGFydGlhbEluZm8uY29udGVudFxuICAgICAgLCBwYXRoID0gcGFydGlhbEluZm8ucGF0aCB8fCAnJ1xuICAgICAgO1xuICAgIGlmKG5hbWUpe1xuICAgICAgdGhpcy5wYXJ0aWFsc1tuYW1lXSA9IHBhcnRpYWxJbmZvO1xuICAgIH1cbiAgICBpZihwYXJ0aWFsKSB7XG4gICAgICB2bSA9IHRoaXMuX3ZtLiRnZXRWTShwYXRoKTtcbiAgICAgIFxuICAgICAgaWYodHlwZW9mIHBhcnRpYWwgPT09ICdzdHJpbmcnKXtcbiAgICAgICAgaWYocGFydGlhbEluZm8uZXNjYXBlKXtcbiAgICAgICAgICBlbHMgPSBbZG9jLmNyZWF0ZVRleHROb2RlKHBhcnRpYWwpXTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgX2VscyA9IHRwbFBhcnNlKHBhcnRpYWwsICdkaXYnKS5lbC5jaGlsZE5vZGVzO1xuICAgICAgICAgIGVscyA9IFtdO1xuICAgICAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSBfZWxzLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICAgICAgICBlbHMucHVzaChfZWxzW2ldKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1lbHNle1xuICAgICAgICBlbHMgPSBbKHBhcnRpYWwgaW5zdGFuY2VvZiBBbnQpID8gcGFydGlhbC5lbCA6IHBhcnRpYWxdO1xuICAgICAgfVxuICAgICAgXG4gICAgICBpZih0YXJnZXQpe1xuICAgICAgICBmb3IodmFyIGkgPSAwLCBsID0gZWxzLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICAgICAgaXNGdW5jdGlvbih0YXJnZXQpID8gXG4gICAgICAgICAgICB0YXJnZXQuY2FsbCh0aGlzLCBlbHNbaV0pIDpcbiAgICAgICAgICAgIHRhcmdldC5hcHBlbmRDaGlsZChlbHNbaV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBcbiAgICAgIHZtLiRidWlsZChlbHMsIHBhcnRpYWxJbmZvLmNvbnRleHQgJiYgcGFydGlhbEluZm8uY29udGV4dC5hc3NpZ25tZW50KVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4sIHdhdGNoOiBmdW5jdGlvbihrZXlQYXRoLCBjYWxsYmFjaykge1xuICAgIGlmKGtleVBhdGggJiYgY2FsbGJhY2spe1xuICAgICAgYWRkV2F0Y2hlcih0aGlzLl92bSwge3BhdGg6IGtleVBhdGgsIHVwZGF0ZTogY2FsbGJhY2t9KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiwgdW53YXRjaDogZnVuY3Rpb24oa2V5UGF0aCwgY2FsbGJhY2spIHtcbiAgICB2YXIgdm0gPSB0aGlzLl92bS4kZ2V0Vk0oa2V5UGF0aCwge3N0cmljdDogdHJ1ZX0pO1xuICAgIGlmKHZtKXtcbiAgICAgIGZvcih2YXIgaSA9IHZtLiR3YXRjaGVycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSl7XG4gICAgICAgIGlmKHZtLiR3YXRjaGVyc1tpXS50b2tlbi51cGRhdGUgPT09IGNhbGxiYWNrKXtcbiAgICAgICAgICB2bS4kd2F0Y2hlcnMuc3BsaWNlKGksIDEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIFxuICBcbiwgc2V0RmlsdGVyOiBmdW5jdGlvbihuYW1lLCBmaWx0ZXIpIHtcbiAgICB0aGlzLmZpbHRlcnNbbmFtZV0gPSBmaWx0ZXIuYmluZCh0aGlzKTtcbiAgfVxuLCBnZXRGaWx0ZXI6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXJzW25hbWVdXG4gIH1cbiwgcmVtb3ZlRmlsdGVyOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgZGVsZXRlIHRoaXMuZmlsdGVyc1tuYW1lXTtcbiAgfVxufSk7XG5cbi8qKlxuICog5pu05paw5qih5p2/LiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIOimgeabtOaWsOeahOaVsOaNri4g5aKe6YeP5pWw5o2u5oiW5YWo5paw55qE5pWw5o2uLlxuICogQHBhcmFtIHtTdHJpbmd9IFtrZXlQYXRoXSDpnIDopoHmm7TmlrDnmoTmlbDmja7ot6/lvoQuXG4gKiBAcGFyYW0ge0FueVR5cGV8T2JqZWN0fSBbZGF0YV0g6ZyA6KaB5pu05paw55qE5pWw5o2uLiDnnIHnlaXnmoTor53lsIbkvb/nlKjnjrDmnInnmoTmlbDmja4uXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtpc0V4dGVuZF0g55WM6Z2i5pu05paw57G75Z6LLlxuICAgICAgICAgIOS4uiB0cnVlIOaXtiwg5piv5omp5bGV5byP5pu05pawLCDljp/mnInnmoTmlbDmja7kuI3lj5hcbiAgICAgICAgICDkuLogZmFsc2Ug5pe2LCDkuLrmm7/mjaLmm7TmlrAsIOS4jeWcqCBkYXRhIOS4reeahOWPmOmHjywg5bCG5ZyoIERPTSDkuK3ooqvmuIXnqbouXG4gKi9cbmZ1bmN0aW9uIHVwZGF0ZSAoa2V5UGF0aCwgZGF0YSwgaXNFeHRlbmQsIGlzQnViYmxlKSB7XG4gIHZhciBhdHRycywgdm0gPSB0aGlzLl92bTtcbiAgaWYoaXNPYmplY3Qoa2V5UGF0aCkpe1xuICAgIGlzQnViYmxlID0gaXNFeHRlbmQ7XG4gICAgaXNFeHRlbmQgPSBkYXRhO1xuICAgIGF0dHJzID0gZGF0YSA9IGtleVBhdGg7XG4gIH1lbHNlIGlmKHR5cGVvZiBrZXlQYXRoID09PSAnc3RyaW5nJyl7XG4gICAga2V5UGF0aCA9IHBhcnNlS2V5UGF0aChrZXlQYXRoKS5qb2luKCcuJyk7XG4gICAgaWYoaXNVbmRlZmluZWQoZGF0YSkpe1xuICAgICAgZGF0YSA9IHRoaXMuZ2V0KGtleVBhdGgpO1xuICAgIH1cbiAgICBhdHRycyA9IGRlZXBTZXQoa2V5UGF0aCwgZGF0YSwge30pO1xuICAgIHZtID0gdm0uJGdldFZNKGtleVBhdGgpO1xuICB9ZWxzZXtcbiAgICBkYXRhID0gdGhpcy5kYXRhO1xuICB9XG4gIFxuICBpZihpc1VuZGVmaW5lZChpc0V4dGVuZCkpeyBpc0V4dGVuZCA9IGlzT2JqZWN0KGtleVBhdGgpOyB9XG4gIHZtLiR1cGRhdGUoZGF0YSwgaXNFeHRlbmQsIGlzQnViYmxlICE9PSBmYWxzZSk7XG4gIHJldHVybiB0aGlzO1xufVxuXG5mdW5jdGlvbiBidWlsZFZpZXdNb2RlbCgpIHtcbiAgdmFyIHZtID0gbmV3IFZpZXdNb2RlbCh7XG4gICAgJGFudDogdGhpc1xuICB9KTtcbiAgXG4gIHRoaXMuX3ZtID0gdm07XG4gIHZtLiRidWlsZCh0aGlzLmVsKTtcbn1cblxudmFyIE5PREVUWVBFID0ge1xuICBBVFRSOiAyXG4sIFRFWFQ6IDNcbiwgQ09NTUVOVDogOFxuLCBGUkFHTUVOVDogMTFcbn07XG5cbi8v6YGN5Y6G5YWD57Sg5Y+K5YW25a2Q5YWD57Sg55qE5omA5pyJ5bGe5oCn6IqC54K55Y+K5paH5pys6IqC54K5XG5mdW5jdGlvbiB0cmF2ZWxFbChlbCwgdm0sIGFzc2lnbm1lbnQpIHtcbiAgYXNzaWdubWVudCA9IGNyZWF0ZShhc3NpZ25tZW50IHx8IHt9KTtcbiAgXG4gIGlmKGVsLm5vZGVUeXBlID09PSBOT0RFVFlQRS5GUkFHTUVOVCkge1xuICAgIGVsID0gZWwuY2hpbGROb2RlcztcbiAgfVxuICBcbiAgaWYoKCdsZW5ndGgnIGluIGVsKSAmJiBpc1VuZGVmaW5lZChlbC5ub2RlVHlwZSkpe1xuICAgIC8vbm9kZSBsaXN0XG4gICAgZm9yKHZhciBpID0gMCwgbCA9IGVsLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgdHJhdmVsRWwoZWxbaV0sIHZtLCBhc3NpZ25tZW50KTtcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG4gIFxuICBpZihlbC5ub2RlVHlwZSA9PT0gTk9ERVRZUEUuQ09NTUVOVCl7XG4gICAgLy/ms6jph4roioLngrlcbiAgICByZXR1cm47XG4gIH1lbHNlIGlmKGVsLm5vZGVUeXBlID09PSBOT0RFVFlQRS5URVhUKXtcbiAgICAvL+aWh+acrOiKgueCuVxuICAgIGNoZWNrVGV4dChlbCwgdm0sIGFzc2lnbm1lbnQpO1xuICAgIHJldHVybjtcbiAgfVxuICBcbiAgaWYoY2hlY2tBdHRyKGVsLCB2bSwgYXNzaWdubWVudCkpe1xuICAgIHJldHVybjtcbiAgfVxuICBcbiAgLy90ZW1wbGF0ZVxuICBpZihlbC5jb250ZW50KSB7XG4gICAgdHJhdmVsRWwoZWwuY29udGVudCwgdm0sIGFzc2lnbm1lbnQpO1xuICAgIHJldHVybjtcbiAgfVxuICBcbiAgZm9yKHZhciBjaGlsZCA9IGVsLmZpcnN0Q2hpbGQsIG5leHQ7IGNoaWxkOyApe1xuICAgIG5leHQgPSBjaGlsZC5uZXh0U2libGluZztcbiAgICB0cmF2ZWxFbChjaGlsZCwgdm0sIGFzc2lnbm1lbnQpO1xuICAgIGNoaWxkID0gbmV4dDtcbiAgfVxufVxuXG4vL+mBjeWOhuWxnuaAp1xuZnVuY3Rpb24gY2hlY2tBdHRyKGVsLCB2bSwgYXNzaWdubWVudCkge1xuICB2YXIgcHJlZml4ID0gQW50LnByZWZpeFxuICAgICwgZGlycyA9IEFudC5kaXJlY3RpdmUuZ2V0RGlyKGVsLCBBbnQuZGlyZWN0aXZlcywgcHJlZml4KVxuICAgICwgZGlyXG4gICAgLCB0ZXJtaW5hbFByaW9yaXR5LCB0ZXJtaW5hbFxuICAgIDtcbiAgXG4gIGZvciAodmFyIGkgPSAwLCBsID0gZGlycy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBkaXIgPSBkaXJzW2ldO1xuICAgIGRpci5hc3NpZ25tZW50ID0gYXNzaWdubWVudDtcbiAgIFxuICAgIC8v5a+55LqOIHRlcm1pbmFsIOS4uiB0cnVlIOeahCBkaXJlY3RpdmUsIOWcqOino+aekOWujOWFtuebuOWQjOadg+mHjeeahCBkaXJlY3RpdmUg5ZCO5Lit5pat6YGN5Y6G6K+l5YWD57SgXG4gICAgaWYodGVybWluYWxQcmlvcml0eSA+IGRpci5wcmlvcml0eSkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIFxuICAgIGVsLnJlbW92ZUF0dHJpYnV0ZShkaXIubm9kZU5hbWUpO1xuICAgIFxuICAgIHNldEJpbmRpbmcodm0sIGRpcik7XG4gICBcbiAgICBpZihkaXIudGVybWluYWwpIHtcbiAgICAgIHRlcm1pbmFsID0gdHJ1ZTtcbiAgICAgIHRlcm1pbmFsUHJpb3JpdHkgPSBkaXIucHJpb3JpdHk7XG4gICAgfVxuICB9XG4gIFxuICBpZih0ZXJtaW5hbCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG59XG5cbnZhciBwYXJ0aWFsUmVnID0gL14+XFxzKig/PS4rKS87XG4vL+WkhOeQhuaWh+acrOiKgueCueS4reeahOe7keWumuWNoOS9jeespih7ey4uLn19KVxuZnVuY3Rpb24gY2hlY2tUZXh0KG5vZGUsIHZtLCBhc3NpZ25tZW50KSB7XG4gIGlmKHRva2VuLmhhc1Rva2VuKG5vZGUubm9kZVZhbHVlKSkge1xuICAgIHZhciB0b2tlbnMgPSB0b2tlbi5wYXJzZVRva2VuKG5vZGUubm9kZVZhbHVlKVxuICAgICAgLCB0ZXh0TWFwID0gdG9rZW5zLnRleHRNYXBcbiAgICAgICwgZWwgPSBub2RlLnBhcmVudE5vZGVcbiAgICAgIFxuICAgICAgLCB0LCBkaXJcbiAgICAgIDtcbiAgICBcbiAgICAvL+Wwhnt7a2V5fX3liIblibLmiJDljZXni6znmoTmlofmnKzoioLngrlcbiAgICBpZih0ZXh0TWFwLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRleHRNYXAuZm9yRWFjaChmdW5jdGlvbih0ZXh0KSB7XG4gICAgICAgIHZhciB0biA9IGRvYy5jcmVhdGVUZXh0Tm9kZSh0ZXh0KTtcbiAgICAgICAgZWwuaW5zZXJ0QmVmb3JlKHRuLCBub2RlKTtcbiAgICAgICAgY2hlY2tUZXh0KHRuLCB2bSwgYXNzaWdubWVudCk7XG4gICAgICB9KTtcbiAgICAgIGVsLnJlbW92ZUNoaWxkKG5vZGUpO1xuICAgIH1lbHNle1xuICAgICAgdCA9IHRva2Vuc1swXTtcbiAgICAgIC8v5YaF572u5ZCE5Y2g5L2N56ym5aSE55CGLiBcbiAgICAgIC8v5a6a5LmJ5paw55qE5Y+C5pWwLCDlsIblhbbmlL7liLAgZGlyZWN0aXZlIOS4reWkhOeQhj9cbiAgICAgIGlmKHBhcnRpYWxSZWcudGVzdCh0LnBhdGgpKSB7XG4gICAgICAgIHQucGF0aCA9IHQucGF0aC5yZXBsYWNlKHBhcnRpYWxSZWcsICcnKTtcbiAgICAgICAgZGlyID0gY3JlYXRlKEFudC5kaXJlY3RpdmVzLnBhcnRpYWwpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIGRpciA9IGNyZWF0ZSh0LmVzY2FwZSA/IEFudC5kaXJlY3RpdmVzLnRleHQgOiBBbnQuZGlyZWN0aXZlcy5odG1sKTtcbiAgICAgIH1cbiAgICAgIHNldEJpbmRpbmcodm0sIGV4dGVuZChkaXIsIHQsIHtcbiAgICAgICAgZWw6IG5vZGVcbiAgICAgICwgYXNzaWdubWVudDogYXNzaWdubWVudFxuICAgICAgfSkpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBzZXRCaW5kaW5nKHZtLCBkaXIpIHtcbiAgaWYoZGlyLnJlcGxhY2UpIHtcbiAgICB2YXIgZWwgPSBkaXIuZWw7XG4gICAgaWYoaXNGdW5jdGlvbihkaXIucmVwbGFjZSkpIHtcbiAgICAgIGRpci5ub2RlID0gZGlyLnJlcGxhY2UoKTtcbiAgICB9ZWxzZSBpZihkaXIucmVwbGFjZSl7XG4gICAgICAvL2Rpci5ub2RlID0gZG9jLmNyZWF0ZUNvbW1lbnQoZGlyLnR5cGUgKyAnID0gJyArIGRpci5wYXRoKTtcbiAgICAgIGRpci5ub2RlID0gZG9jLmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICB9XG4gICAgXG4gICAgZGlyLmVsID0gZGlyLmVsLnBhcmVudE5vZGU7XG4gICAgZGlyLmVsLnJlcGxhY2VDaGlsZChkaXIubm9kZSwgZWwpO1xuICB9XG4gIFxuICBkaXIubGluayh2bSk7XG4gIFxuICBpZihkaXIuZGlycykge1xuICAgIGRpci5kaXJzLmZvckVhY2goZnVuY3Rpb24oZCkge1xuICAgICAgYWRkV2F0Y2hlcih2bSwgZXh0ZW5kKGNyZWF0ZShkaXIpLCBkKSk7XG4gICAgfSk7XG4gIH1lbHNle1xuICAgIGFkZFdhdGNoZXIodm0sIGRpcik7XG4gIH1cbn1cblxuZnVuY3Rpb24gYWRkV2F0Y2hlcih2bSwgZGlyKSB7XG4gIGlmKGRpci5wYXRoKSB7XG4gICAgcmV0dXJuIG5ldyBXYXRjaGVyKHZtLCBkaXIpO1xuICB9XG59XG5cbnZhciBleFBhcnNlID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgdGhhdCA9IHRoaXM7XG4gIHZhciBhc3QgPSBwYXJzZShwYXRoLCB0aGlzLnRva2VuLnR5cGUpO1xuICB2YXIgc3VtbWFyeSA9IGV2YWx1YXRlLnN1bW1hcnkoYXN0KTtcbiAgICBcbiAgZXh0ZW5kKHRoaXMudG9rZW4sIHN1bW1hcnkpO1xuICBleHRlbmQodGhpcywgc3VtbWFyeSk7XG4gIHRoaXMuX2FzdCA9IGFzdDtcbn07XG5cbmZ1bmN0aW9uIFdhdGNoZXIocmVsYXRpdmVWbSwgdG9rZW4pIHtcbiAgdmFyIGFzcyA9IHRva2VuLmFzc2lnbm1lbnQ7XG4gIFxuICB0aGlzLnRva2VuID0gdG9rZW47XG4gIHRoaXMucmVsYXRpdmVWbSA9IHJlbGF0aXZlVm07XG4gIHRoaXMuYW50ID0gcmVsYXRpdmVWbS4kcm9vdC4kYW50O1xuICBcbiAgdGhpcy52YWwgPSBOYU47XG4gIFxuICBleFBhcnNlLmNhbGwodGhpcywgdG9rZW4ucGF0aCk7XG4gIFxuICBmb3IodmFyIGkgPSAwLCBsID0gdGhpcy5wYXRocy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgIHJlbGF0aXZlVm0uJGdldFZNKHRoaXMucGF0aHNbaV0sIHthc3NpZ25tZW50OiBhc3N9KS4kd2F0Y2hlcnMucHVzaCh0aGlzKTtcbiAgfVxuICBcbiAgdmFyIHJ1bjtcbiAgZm9yKHZhciBpID0gMCwgbCA9IHRoaXMubG9jYWxzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHJ1biA9IHJ1biB8fCBhc3MgJiYgKHRoaXMubG9jYWxzW2ldIGluIGFzcykgJiYgYXNzW3RoaXMubG9jYWxzW2ldXSAhPT0gcmVsYXRpdmVWbTtcbiAgfVxuICBcbiAgdGhpcy5zdGF0ZSA9IFdhdGNoZXIuU1RBVEVfUkVBRFlcbiAgXG4gIC8v56uL5Y2z6K6h566X55qE5oOF5Ya1OlxuICAvLzEuIOa4suafk+i/h+WQjuaWsOWKoOWFpeeahOaooeadv1xuICAvLzIuIOayoeacieWPmOmHj+eahOihqOi+vuW8j1xuICAvLzMuIOWtkOS9nOeUqOWfn+W8leeUqOeItue6p+S9nOeUqOWfn1xuICBpZih0aGlzLmFudC5pc1JlbmRlcmVkIHx8ICF0aGlzLmxvY2Fscy5sZW5ndGggfHwgcnVuKSB7XG4gICAgdGhpcy5mbigpO1xuICB9XG59XG5cbmV4dGVuZChXYXRjaGVyLCB7XG4gIFNUQVRFX1JFQURZOiAwXG4sIFNUQVRFX0NBTExFRDogMVxufSwgQ2xhc3MpO1xuXG5leHRlbmQoV2F0Y2hlci5wcm90b3R5cGUsIHtcbiAgZm46IGZ1bmN0aW9uKHZhbHMpIHtcbiAgICB2YXIga2V5XG4gICAgICAsIGRpciA9IHRoaXMudG9rZW5cbiAgICAgICwgbmV3VmFsXG4gICAgICA7XG4gICAgICBcbiAgICB2YWxzID0gdmFscyB8fCB7fVxuICAgIFxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSB0aGlzLmxvY2Fscy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAga2V5ID0gdGhpcy5sb2NhbHNbaV07XG4gICAgICB2YWxzW2tleV0gPSB0aGlzLnJlbGF0aXZlVm0uJGdldFZNKGtleSwge2Fzc2lnbm1lbnQ6IGRpci5hc3NpZ25tZW50fSkuJGdldERhdGEoKTtcbiAgICB9XG4gICAgXG4gICAgbmV3VmFsID0gdGhpcy5nZXRWYWx1ZSh2YWxzKTtcbiAgICAgIFxuICAgIGlmKG5ld1ZhbCAhPT0gdGhpcy52YWwpe1xuICAgICAgdHJ5e1xuICAgICAgICB0aGlzLnRva2VuLnVwZGF0ZShuZXdWYWwsIHRoaXMudmFsKTtcbiAgICAgICAgdGhpcy52YWwgPSBuZXdWYWw7XG4gICAgICB9Y2F0Y2goZSl7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuc3RhdGUgPSBXYXRjaGVyLlNUQVRFX0NBTExFRDtcbiAgfVxuLCBnZXRWYWx1ZTogZnVuY3Rpb24odmFscykge1xuICAgIHZhciBmaWx0ZXJzID0gdGhpcy5maWx0ZXJzXG4gICAgICAsIHZhbFxuICAgICAgLCBhbnQgPSB0aGlzLmFudFxuICAgICAgO1xuICAgIFxuICAgIHRyeXtcbiAgICAgIHZhbCA9IGV2YWx1YXRlLmV2YWwodGhpcy5fYXN0LCB7bG9jYWxzOiB2YWxzLCBmaWx0ZXJzOiBhbnQuZmlsdGVyc30pO1xuICAgIH1jYXRjaChlKXtcbiAgICAgIHZhbCA9ICcnO1xuICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbDtcbiAgfVxufSk7XG5cbmZ1bmN0aW9uIFZpZXdNb2RlbChvcHRzKSB7XG4gIGV4dGVuZCh0aGlzLCB7XG4gICAgJGtleTogJydcbiAgLCAkcm9vdDogdGhpc1xuICAsICR3YXRjaGVyczogW11cbiAgfSwgb3B0cyk7XG59XG5cblZpZXdNb2RlbC5wcm90b3R5cGUgPSB7XG4gICRyb290OiBudWxsXG4sICRwYXJlbnQ6IG51bGxcblxuLCAkYW50OiBudWxsXG4sICRrZXk6IG51bGxcblxuLCAkd2F0Y2hlcnM6IG51bGxcblxuLCAkaW5kZXg6IG51bGxcbiwgJHZhbHVlOiBOYU5cbiAgXG4vL+iOt+WPliB2bSDkuI3lrZjlnKjnmoTor53lsIbmlrDlu7rkuIDkuKouXG4vL29wdHMuc3RyaWN0ICDkuI3oh6rliqjmlrDlu7ogdm1cbi8vb3B0cy5zY29wZVxuLCAkZ2V0Vk06IGZ1bmN0aW9uKHBhdGgsIG9wdHMpIHtcbiAgICBwYXRoID0gcGF0aCArICcnO1xuICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgIFxuICAgIHZhciBrZXlcbiAgICAgICwgY3VyID0gb3B0cy5zY29wZSB8fCB0aGlzLiRyb290XG4gICAgICAsIGFzc2lnbm1lbnQgPSBvcHRzLmFzc2lnbm1lbnQgfHwge31cbiAgICAgICwga2V5Q2hhaW4gPSB1dGlscy5wYXJzZUtleVBhdGgocGF0aClcbiAgICAgIDtcbiAgICAgIFxuICAgIGlmKGtleUNoYWluWzBdIGluIGFzc2lnbm1lbnQpIHtcbiAgICAgIGN1ciA9IGFzc2lnbm1lbnRba2V5Q2hhaW5bMF1dO1xuICAgICAga2V5Q2hhaW4uc2hpZnQoKTtcbiAgICB9XG4gICAgaWYocGF0aCl7XG4gICAgICBmb3IodmFyIGkgPSAwLCBsID0ga2V5Q2hhaW4ubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgICAga2V5ID0ga2V5Q2hhaW5baV07XG4gICAgICAgIFxuICAgICAgICBpZighY3VyW2tleV0pe1xuICAgICAgICAgIGlmKG9wdHMuc3RyaWN0KXsgcmV0dXJuIG51bGw7IH1cbiAgICAgICAgICBjdXJba2V5XSA9IG5ldyBWaWV3TW9kZWwoe1xuICAgICAgICAgICAgJHBhcmVudDogY3VyXG4gICAgICAgICAgLCAkcm9vdDogY3VyLiRyb290XG4gICAgICAgICAgLCAka2V5OiBrZXlcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY3VyID0gY3VyW2tleV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjdXI7XG4gIH1cbiAgXG4sICRnZXRLZXlQYXRoOiBmdW5jdGlvbigpIHtcbiAgICB2YXIga2V5UGF0aCA9IHRoaXMuJGtleVxuICAgICAgLCBjdXIgPSB0aGlzXG4gICAgICA7XG4gICAgd2hpbGUoY3VyID0gY3VyLiRwYXJlbnQpe1xuICAgICAgaWYoY3VyLiRrZXkpe1xuICAgICAgICBrZXlQYXRoID0gY3VyLiRrZXkgKyAnLicgKyBrZXlQYXRoO1xuICAgICAgfWVsc2V7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4ga2V5UGF0aDtcbiAgfVxuXG4sICRnZXREYXRhOiBmdW5jdGlvbihrZXkpIHtcbiAgICB2YXIgY3VyVmFsID0gZGVlcEdldChrZXksIHRoaXMuJHJvb3QuJGFudC5nZXQodGhpcy4kZ2V0S2V5UGF0aCgpKSk7XG4gICAgcmV0dXJuIGN1clZhbDtcbiAgfVxuXG5cbiwgJHVwZGF0ZTogZnVuY3Rpb24gKGRhdGEsIGlzRXh0ZW5kLCBpc0J1YmJsZSkge1xuICAgIHZhciBtYXAgPSBpc0V4dGVuZCA/IGRhdGEgOiB0aGlzXG4gICAgICAsIHBhcmVudCA9IHRoaXNcbiAgICAgIDtcbiAgICBcbiAgICBmb3IodmFyIGkgPSAwLCBsID0gdGhpcy4kd2F0Y2hlcnMubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgIGlmKCh0aGlzLiR2YWx1ZSAhPT0gZGF0YSkgfHwgdGhpcy4kd2F0Y2hlcnNbaV0uc3RhdGUgPT09IFdhdGNoZXIuU1RBVEVfUkVBRFkpe1xuICAgICAgICB0aGlzLiR3YXRjaGVyc1tpXS5mbigpO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLiR2YWx1ZSA9IGRhdGE7XG4gICAgXG4gICAgaWYoaXNPYmplY3QobWFwKSl7XG4gICAgICBmb3IodmFyIHBhdGggaW4gbWFwKSB7XG4gICAgICAgIC8v5Lyg5YWl55qE5pWw5o2u6ZSu5YC85LiN6IO95ZKMIHZtIOS4reeahOiHquW4puWxnuaAp+WQjeebuOWQjC5cbiAgICAgICAgLy/miYDku6XkuI3mjqjojZDkvb/nlKggJyQnIOS9nOS4uiBKU09OIOaVsOaNrumUruWAvOeahOW8gOWktC5cbiAgICAgICAgaWYodGhpcy5oYXNPd25Qcm9wZXJ0eShwYXRoKSAmJiAoIShwYXRoIGluIFZpZXdNb2RlbC5wcm90b3R5cGUpKSl7XG4gICAgICAgICAgdGhpc1twYXRoXS4kdXBkYXRlKGRhdGEgPyBkYXRhW3BhdGhdIDogdm9pZCgwKSwgaXNFeHRlbmQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYoaXNCdWJibGUpe1xuICAgICAgd2hpbGUocGFyZW50ID0gcGFyZW50LiRwYXJlbnQpe1xuICAgICAgICBmb3IodmFyIGkgPSAwLCBsID0gcGFyZW50LiR3YXRjaGVycy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgICAgIHBhcmVudC4kd2F0Y2hlcnNbaV0uZm4oKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuLCAkYnVpbGQ6IGZ1bmN0aW9uKGVsLCBhc3NpZ25tZW50KSB7XG4gICAgdHJhdmVsRWwoZWwsIHRoaXMsIGFzc2lnbm1lbnQpO1xuICB9XG59O1xuXG5BbnQudmVyc2lvbiA9ICclVkVSU0lPTic7XG5cbm1vZHVsZS5leHBvcnRzID0gQW50O1xuIiwidmFyIGV4dGVuZCA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKS5leHRlbmQ7XG5cbnZhciBDbGFzcyA9IHtcbiAgLyoqIFxuICAgKiDmnoTpgKDlh73mlbDnu6fmib8uIFxuICAgKiDlpoI6IGB2YXIgQ2FyID0gQW50LmV4dGVuZCh7ZHJpdmU6IGZ1bmN0aW9uKCl7fX0pOyBuZXcgQ2FyKCk7YFxuICAgKiBAcGFyYW0ge09iamVjdH0gW3Byb3RvUHJvcHNdIOWtkOaehOmAoOWHveaVsOeahOaJqeWxleWOn+Wei+WvueixoVxuICAgKiBAcGFyYW0ge09iamVjdH0gW3N0YXRpY1Byb3BzXSDlrZDmnoTpgKDlh73mlbDnmoTmianlsZXpnZnmgIHlsZ7mgKdcbiAgICogQHJldHVybiB7RnVuY3Rpb259IOWtkOaehOmAoOWHveaVsFxuICAgKi9cbiAgZXh0ZW5kOiBmdW5jdGlvbiAocHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHtcbiAgICBwcm90b1Byb3BzID0gcHJvdG9Qcm9wcyB8fCB7fTtcbiAgICB2YXIgY29uc3RydWN0b3IgPSBwcm90b1Byb3BzLmhhc093blByb3BlcnR5KCdjb25zdHJ1Y3RvcicpID8gcHJvdG9Qcm9wcy5jb25zdHJ1Y3RvciA6IGZ1bmN0aW9uKCl7IHJldHVybiBzdXAuYXBwbHkodGhpcywgYXJndW1lbnRzKTsgfVxuICAgIHZhciBzdXAgPSB0aGlzO1xuICAgIHZhciBGbiA9IGZ1bmN0aW9uKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gY29uc3RydWN0b3I7IH07XG4gICAgXG4gICAgRm4ucHJvdG90eXBlID0gc3VwLnByb3RvdHlwZTtcbiAgICBjb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBuZXcgRm4oKTtcbiAgICBleHRlbmQoY29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTtcbiAgICBleHRlbmQoY29uc3RydWN0b3IsIHN1cCwgc3RhdGljUHJvcHMsIHtfX3N1cGVyX186IHN1cC5wcm90b3R5cGV9KTtcbiAgICBcbiAgICByZXR1cm4gY29uc3RydWN0b3I7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2xhc3M7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKVxuICAsIHRva2VuID0gcmVxdWlyZSgnLi90b2tlbi5qcycpXG4gICwgZG9jID0gcmVxdWlyZSgnLi9kb2N1bWVudC5qcycpXG4gIDtcblxuLyoqXG4gKiDkuLogQW50IOaehOmAoOWHveaVsOa3u+WKoOaMh+S7pCAoZGlyZWN0aXZlKS4gYEFudC5kaXJlY3RpdmVgXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5IGRpcmVjdGl2ZSDlkI3np7BcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0c10gZGlyZWN0aXZlIOWPguaVsFxuICogQHBhcmFtIHtOdW1iZXJ9IG9wdHMucHJpb3JpdHk9MCBkaXJlY3RpdmUg5LyY5YWI57qnLiDlkIzkuIDkuKrlhYPntKDkuIrnmoTmjIfku6TmjInnhafkvJjlhYjnuqfpobrluo/miafooYwuIFxuICogQHBhcmFtIHtCb29sZWFufSBvcHRzLnRlcm1pbmFsPWZhbHNlIOaJp+ihjOivpSBkaXJlY3RpdmUg5ZCOLCDmmK/lkKbnu4jmraLlkI7nu60gZGlyZWN0aXZlIOaJp+ihjC5cbiAqICAgdGVybWluYWwg5Li655yf5pe2LCDkuI7or6UgZGlyZWN0aXZlIOS8mOWFiOe6p+ebuOWQjOeahCBkaXJlY3RpdmUg5LuN5Lya57un57ut5omn6KGMLCDovoPkvY7kvJjlhYjnuqfnmoTmiY3kvJrooqvlv73nlaUuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IG9wdHMuYW5jaG9yIGFuY2hvciDkuLogdHJ1ZSDml7YsIOS8muWcqOaMh+S7pOiKgueCueWJjeWQjuWQhOS6p+eUn+S4gOS4quepuueZveeahOagh+iusOiKgueCuS4g5YiG5Yir5a+55bqUIGBhbmNob3JzLnN0YXJ0YCDlkowgYGFuY2hvcnMuZW5kYFxuICovXG5mdW5jdGlvbiBkaXJlY3RpdmUoa2V5LCBvcHRzKSB7XG4gIHZhciBkaXJzID0gdGhpcy5kaXJlY3RpdmVzID0gdGhpcy5kaXJlY3RpdmVzIHx8IHt9O1xuICBcbiAgcmV0dXJuIGRpcnNba2V5XSA9IG5ldyBEaXJlY3RpdmUoa2V5LCBvcHRzKTtcbn1cblxuZnVuY3Rpb24gRGlyZWN0aXZlKGtleSwgb3B0cykge1xuICB0aGlzLnR5cGUgPSBrZXk7XG4gIHV0aWxzLmV4dGVuZCh0aGlzLCBvcHRzKTtcbn1cblxuRGlyZWN0aXZlLnByb3RvdHlwZSA9IHtcbiAgcHJpb3JpdHk6IDBcbiwgbGluazogdXRpbHMubm9vcFxuLCB1cGRhdGU6IHV0aWxzLm5vb3BcbiwgdGVhckRvd246IHV0aWxzLm5vb3BcbiwgdGVybWluYWw6IGZhbHNlXG4sIHJlcGxhY2U6IGZhbHNlXG5cbiwgYW5jaG9yOiBmYWxzZVxuLCBhbmNob3JzOiBudWxsXG5cbiAgLy/lvZMgYW5jaG9yIOS4uiB0cnVlIOaXtiwg6I635Y+W5Lik5Liq6ZSa54K55LmL6Ze055qE5omA5pyJ6IqC54K5LlxuLCBnZXROb2RlczogZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5vZGVzID0gW10sIG5vZGUgPSB0aGlzLmFuY2hvcnMuc3RhcnQubmV4dFNpYmxpbmc7XG4gICAgaWYodGhpcy5hbmNob3IpIHtcbiAgICAgIHdoaWxlKG5vZGUgIT09IHRoaXMuYW5jaG9ycy5lbmQpe1xuICAgICAgICBub2Rlcy5wdXNoKG5vZGUpO1xuICAgICAgICBub2RlID0gbm9kZS5uZXh0U2libGluZztcbiAgICAgIH1cbiAgICAgIFxuICAgICAgcmV0dXJuIG5vZGVzO1xuICAgIH1lbHNle1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG59O1xuXG4vL+iOt+WPluS4gOS4quWFg+e0oOS4iuaJgOacieeUqCBIVE1MIOWxnuaAp+WumuS5ieeahOaMh+S7pFxuZnVuY3Rpb24gZ2V0RGlyKGVsLCBkaXJlY3RpdmVzLCBwcmVmaXgpIHtcbiAgcHJlZml4ID0gcHJlZml4IHx8ICcnO1xuICBkaXJlY3RpdmVzID0gZGlyZWN0aXZlcyB8fCB7fTtcbiAgXG4gIHZhciBhdHRyLCBhdHRyTmFtZSwgZGlyTmFtZVxuICAgICwgZGlycyA9IFtdLCBkaXIsIGFuY2hvcnMgPSB7fVxuICAgICwgcGFyZW50ID0gZWwucGFyZW50Tm9kZVxuICAgIDtcbiAgICBcbiAgZm9yKHZhciBpID0gZWwuYXR0cmlidXRlcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSl7XG4gICAgYXR0ciA9IGVsLmF0dHJpYnV0ZXNbaV07XG4gICAgYXR0ck5hbWUgPSBhdHRyLm5vZGVOYW1lO1xuICAgIGRpck5hbWUgPSBhdHRyTmFtZS5zbGljZShwcmVmaXgubGVuZ3RoKTtcbiAgICBpZihhdHRyTmFtZS5pbmRleE9mKHByZWZpeCkgPT09IDAgJiYgKGRpck5hbWUgaW4gZGlyZWN0aXZlcykpIHtcbiAgICAgIGRpciA9IHV0aWxzLmNyZWF0ZShkaXJlY3RpdmVzW2Rpck5hbWVdKTtcbiAgICAgIGRpci5kaXJOYW1lID0gZGlyTmFtZVxuICAgIH1lbHNlIGlmKHRva2VuLmhhc1Rva2VuKGF0dHIudmFsdWUpKSB7XG4gICAgICBkaXIgPSB1dGlscy5jcmVhdGUoZGlyZWN0aXZlc1snYXR0ciddKTtcbiAgICAgIGRpci5kaXJzID0gdG9rZW4ucGFyc2VUb2tlbihhdHRyLnZhbHVlKTtcbiAgICAgIGRpci5kaXJOYW1lID0gYXR0ck5hbWUuaW5kZXhPZihwcmVmaXgpID09PSAwID8gZGlyTmFtZSA6IGF0dHJOYW1lIDtcbiAgICB9ZWxzZXtcbiAgICAgIGRpciA9IGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICBpZihkaXIpIHtcbiAgICAgIGlmKGRpci5hbmNob3IgJiYgIWFuY2hvcnMuc3RhcnQpIHtcbiAgICAgICAgLy/lkIzkuIDkuKrlhYPntKDkuIrnmoQgZGlyZWN0aXZlIOWFseS6q+WQjOS4gOWvuemUmueCuVxuICAgICAgICBhbmNob3JzLnN0YXJ0ID0gZG9jLmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICAgICAgcGFyZW50Lmluc2VydEJlZm9yZShhbmNob3JzLnN0YXJ0LCBlbCk7XG4gICAgICAgIFxuICAgICAgICBhbmNob3JzLmVuZCA9IGRvYy5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICAgIGlmKGVsLm5leHRTaWJsaW5nKSB7XG4gICAgICAgICAgcGFyZW50Lmluc2VydEJlZm9yZShhbmNob3JzLmVuZCwgZWwubmV4dFNpYmxpbmcpO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICBwYXJlbnQuYXBwZW5kQ2hpbGQoYW5jaG9ycy5lbmQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBkaXJzLnB1c2godXRpbHMuZXh0ZW5kKGRpciwge2VsOiBlbCwgbm9kZTogYXR0ciwgbm9kZU5hbWU6IGF0dHJOYW1lLCBwYXRoOiBhdHRyLnZhbHVlLCBhbmNob3JzOiBkaXIuYW5jaG9yID8gYW5jaG9ycyA6IG51bGx9KSk7XG4gICAgfVxuICB9XG4gIGRpcnMuc29ydChmdW5jdGlvbihkMCwgZDEpIHtcbiAgICByZXR1cm4gZDEucHJpb3JpdHkgLSBkMC5wcmlvcml0eTtcbiAgfSk7XG4gIHJldHVybiBkaXJzO1xufVxuXG5kaXJlY3RpdmUuZ2V0RGlyID0gZ2V0RGlyO1xuXG5leHBvcnRzLmRpcmVjdGl2ZSA9IGRpcmVjdGl2ZTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgYXR0clBvc3RSZWcgPSAvXFw/JC87XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBsaW5rOiBmdW5jdGlvbigpIHtcbiAgICBpZih0aGlzLmRpck5hbWUgPT09IHRoaXMudHlwZSkgey8vYXR0ciBiaW5kaW5nXG4gICAgICB0aGlzLmF0dHJzID0ge307XG4gICAgfWVsc2Uge1xuICAgICAgaWYoYXR0clBvc3RSZWcudGVzdCh0aGlzLmRpck5hbWUpKSB7Ly8gc29tZUF0dHI/IGNvbmRpdGlvbiBiaW5kaW5nXG4gICAgICAgIHRoaXMuZGlyTmFtZSA9IHRoaXMuZGlyTmFtZS5yZXBsYWNlKGF0dHJQb3N0UmVnLCAnJyk7XG4gICAgICAgIHRoaXMuY29uZGl0aW9uYWxBdHRyID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiwgdXBkYXRlOiBmdW5jdGlvbih2YWwpIHtcbiAgICB2YXIgZWwgPSB0aGlzLmVsO1xuICAgIGlmKHRoaXMuZGlyTmFtZSA9PT0gdGhpcy50eXBlKSB7XG4gICAgICBmb3IodmFyIGF0dHIgaW4gdmFsKSB7XG4gICAgICAgIHNldEF0dHIoZWwsIGF0dHIsIHZhbFthdHRyXSk7XG4gICAgICAgIC8vaWYodmFsW2F0dHJdKSB7XG4gICAgICAgICAgZGVsZXRlIHRoaXMuYXR0cnNbYXR0cl07XG4gICAgICAgIC8vfVxuICAgICAgfVxuICAgICAgXG4gICAgICBmb3IodmFyIGF0dHIgaW4gdGhpcy5hdHRycykge1xuICAgICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoYXR0cik7XG4gICAgICB9XG4gICAgICB0aGlzLmF0dHJzID0gdmFsO1xuICAgIH1lbHNle1xuICAgICAgaWYodGhpcy5jb25kaXRpb25hbEF0dHIpIHtcbiAgICAgICAgdmFsID8gc2V0QXR0cihlbCwgdGhpcy5kaXJOYW1lLCB2YWwpIDogZWwucmVtb3ZlQXR0cmlidXRlKHRoaXMuZGlyTmFtZSk7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgdGhpcy50ZXh0TWFwW3RoaXMucG9zaXRpb25dID0gdmFsICYmICh2YWwgKyAnJyk7XG4gICAgICAgIHNldEF0dHIoZWwsIHRoaXMuZGlyTmFtZSwgdGhpcy50ZXh0TWFwLmpvaW4oJycpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cblxuLy9JRSDmtY/op4jlmajlvojlpJrlsZ7mgKfpgJrov4cgYHNldEF0dHJpYnV0ZWAg6K6+572u5ZCO5peg5pWILiBcbi8v6L+Z5Lqb6YCa6L+HIGBlbFthdHRyXSA9IHZhbHVlYCDorr7nva7nmoTlsZ7mgKfljbTog73lpJ/pgJrov4cgYHJlbW92ZUF0dHJpYnV0ZWAg5riF6ZmkLlxuZnVuY3Rpb24gc2V0QXR0cihlbCwgYXR0ciwgdmFsKXtcbiAgdHJ5e1xuICAgIGlmKCgoYXR0ciBpbiBlbCkgfHwgYXR0ciA9PT0gJ2NsYXNzJykpe1xuICAgICAgaWYoYXR0ciA9PT0gJ3N0eWxlJyAmJiBlbC5zdHlsZS5zZXRBdHRyaWJ1dGUpe1xuICAgICAgICBlbC5zdHlsZS5zZXRBdHRyaWJ1dGUoJ2Nzc1RleHQnLCB2YWwpO1xuICAgICAgfWVsc2UgaWYoYXR0ciA9PT0gJ2NsYXNzJyl7XG4gICAgICAgIGVsLmNsYXNzTmFtZSA9IHZhbDtcbiAgICAgIH1lbHNle1xuICAgICAgICBlbFthdHRyXSA9IHR5cGVvZiBlbFthdHRyXSA9PT0gJ2Jvb2xlYW4nID8gdHJ1ZSA6IHZhbDtcbiAgICAgIH1cbiAgICB9XG4gIH1jYXRjaChlKXt9XG4gIHRyeXtcbiAgICAvL2Nocm9tZSBzZXRhdHRyaWJ1dGUgd2l0aCBge3t9fWAgd2lsbCB0aHJvdyBhbiBlcnJvclxuICAgIGVsLnNldEF0dHJpYnV0ZShhdHRyLCB2YWwpO1xuICB9Y2F0Y2goZSl7IGNvbnNvbGUud2FybihlKSB9XG59IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBkb2MgPSByZXF1aXJlKCcuLi9kb2N1bWVudC5qcycpXG4gICwgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpXG4gIDtcblxudmFyIGRpcnMgPSB7fTtcblxuXG5kaXJzLnRleHQgPSB7XG4gIHRlcm1pbmFsOiB0cnVlXG4sIHJlcGxhY2U6IHRydWVcbiwgdXBkYXRlOiBmdW5jdGlvbih2YWwpIHtcbiAgICB0aGlzLm5vZGUubm9kZVZhbHVlID0gdXRpbHMuaXNVbmRlZmluZWQodmFsKSA/ICcnIDogdmFsO1xuICB9XG59O1xuXG5cbmRpcnMuaHRtbCA9IHtcbiAgdGVybWluYWw6IHRydWVcbiwgcmVwbGFjZTogdHJ1ZVxuLCBsaW5rOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLm5vZGVzID0gW107XG4gIH1cbiwgdXBkYXRlOiBmdW5jdGlvbih2YWwpIHtcbiAgICB2YXIgZWwgPSBkb2MuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZWwuaW5uZXJIVE1MID0gdXRpbHMuaXNVbmRlZmluZWQodmFsKSA/ICcnIDogdmFsO1xuICAgIFxuICAgIHZhciBub2RlO1xuICAgIHdoaWxlKG5vZGUgPSB0aGlzLm5vZGVzLnBvcCgpKSB7XG4gICAgICBub2RlLnBhcmVudE5vZGUgJiYgbm9kZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKG5vZGUpO1xuICAgIH1cbiAgICBcbiAgICB2YXIgbm9kZXMgPSBlbC5jaGlsZE5vZGVzO1xuICAgIHdoaWxlKG5vZGUgPSBub2Rlc1swXSkge1xuICAgICAgdGhpcy5ub2Rlcy5wdXNoKG5vZGUpO1xuICAgICAgdGhpcy5lbC5pbnNlcnRCZWZvcmUobm9kZSwgdGhpcy5ub2RlKTtcbiAgICB9XG4gIH1cbn07XG5cbiAgXG5kaXJzWydpZiddID0ge1xuICBhbmNob3I6IHRydWVcbiwgbGluazogZnVuY3Rpb24oKSB7XG4gICAgaWYodGhpcy5lbC5jb250ZW50KSB7XG4gICAgICB0aGlzLmZyYWcgPSB0aGlzLmVsLmNvbnRlbnQ7XG4gICAgICB0aGlzLmVsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5lbCk7XG4gICAgfWVsc2V7XG4gICAgICB0aGlzLmZyYWcgPSBkb2MuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpXG4gICAgICB0aGlzLmhpZGUoKTtcbiAgICB9XG4gIH1cbiwgdXBkYXRlOiBmdW5jdGlvbih2YWwpIHtcbiAgICBpZih2YWwpIHtcbiAgICAgIGlmKCF0aGlzLnN0YXRlKSB7IHRoaXMuc2hvdygpIH1cbiAgICB9ZWxzZXtcbiAgICAgIGlmKHRoaXMuc3RhdGUpIHsgdGhpcy5oaWRlKCk7IH1cbiAgICB9XG4gICAgdGhpcy5zdGF0ZSA9IHZhbDtcbiAgfVxuICBcbiwgc2hvdzogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGFuY2hvciA9IHRoaXMuYW5jaG9ycy5lbmQ7XG4gICAgXG4gICAgYW5jaG9yLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMuZnJhZywgYW5jaG9yKTtcbiAgfVxuLCBoaWRlOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgcGFyZW50ID0gdGhpcy5hbmNob3JzLmVuZC5wYXJlbnROb2RlXG4gICAgICAsIG5vZGVzID0gdGhpcy5nZXROb2RlcygpXG4gICAgICA7XG4gICAgXG4gICAgZm9yKHZhciBpID0gMCwgbCA9IG5vZGVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgdGhpcy5mcmFnLmFwcGVuZENoaWxkKG5vZGVzW2ldKTtcbiAgICB9XG4gIH1cbn07XG5cblxuZGlycy5wYXJ0aWFsID0ge1xuICB0ZXJtaW5hbDogdHJ1ZVxuLCByZXBsYWNlOiB0cnVlXG4sIGxpbms6IGZ1bmN0aW9uKHZtKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciBwTmFtZSwgYW50LCBvcHRzO1xuICAgIHBOYW1lID0gdGhpcy5wYXRoO1xuICAgIGFudCA9IHZtLiRyb290LiRhbnQ7XG4gICAgb3B0cyA9IGFudC5vcHRpb25zO1xuICAgIFxuICAgIHRoaXMucGF0aCA9ICcnO1xuICAgIFxuICAgIGFudC5zZXRQYXJ0aWFsKHtcbiAgICAgIG5hbWU6IHBOYW1lXG4gICAgLCBjb250ZW50OiBvcHRzICYmIG9wdHMucGFydGlhbHMgJiYgb3B0cy5wYXJ0aWFsc1twTmFtZV1cbiAgICAsIHRhcmdldDogZnVuY3Rpb24oZWwpIHsgdGhhdC5lbC5pbnNlcnRCZWZvcmUoZWwsIHRoYXQubm9kZSkgfVxuICAgICwgZXNjYXBlOiB0aGlzLmVzY2FwZVxuICAgICwgcGF0aDogdm0uJGdldEtleVBhdGgoKVxuICAgICwgY29udGV4dDogdGhpc1xuICAgIH0pO1xuICB9XG59O1xuXG5kaXJzLnRlbXBsYXRlID0ge1xuICBwcmlvcml0eTogMTAwMDBcbiwgYW5jaG9yOiB0cnVlXG4sIGxpbms6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBub2RlcyA9IHRoaXMuZWwuY2hpbGROb2Rlc1xuICAgICAgLCBwYXJlbnQgPSB0aGlzLmFuY2hvcnMuZW5kLnBhcmVudE5vZGVcbiAgICAgICwgZnJhZyA9IGRvYy5jcmVhdGVEb2N1bWVudEZyYWdtZW50KClcbiAgICAgIDtcbiAgICAgIFxuICAgIHdoaWxlKG5vZGVzWzBdKSB7XG4gICAgICBmcmFnLmFwcGVuZENoaWxkKG5vZGVzWzBdKTtcbiAgICB9XG4gICAgXG4gICAgdGhpcy5lbC5jb250ZW50ID0gZnJhZztcbiAgICBcbiAgICAvL3BhcmVudC5yZW1vdmVDaGlsZCh0aGlzLmVsKTtcbiAgfVxufTtcbiAgXG5kaXJzLnJlcGVhdCA9IHJlcXVpcmUoJy4vcmVwZWF0LmpzJyk7XG5kaXJzLmF0dHIgPSByZXF1aXJlKCcuL2F0dHIuanMnKTtcbmRpcnMubW9kZWwgPSByZXF1aXJlKCcuL21vZGVsLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZGlyczsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKVxuICAsIGhhc1Rva2VuID0gcmVxdWlyZSgnLi4vdG9rZW4uanMnKS5oYXNUb2tlblxuICA7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICB0ZW1pbmFsOiB0cnVlXG4sIHByaW9yaXR5OiAxXG4sIGxpbms6IGZ1bmN0aW9uKHZtKSB7XG4gICAgdmFyIGtleVBhdGggPSB0aGlzLnBhdGg7XG4gICAgXG4gICAgaWYoIWtleVBhdGgpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgXG4gICAgdmFyIGVsID0gdGhpcy5lbFxuICAgICAgLCBldiA9ICdjaGFuZ2UnXG4gICAgICAsIGF0dHIsIHZhbHVlID0gYXR0ciA9ICd2YWx1ZSdcbiAgICAgICwgYW50ID0gdm0uJHJvb3QuJGFudFxuICAgICAgLCBjdXIgPSB2bS4kZ2V0Vk0oa2V5UGF0aCwge2Fzc2lnbm1lbnQ6IHRoaXMuYXNzaWdubWVudH0pXG4gICAgICAsIGlzU2V0RGVmYXV0ID0gdXRpbHMuaXNVbmRlZmluZWQoYW50LmdldChjdXIuJGdldEtleVBhdGgoKSkpLy/nlYzpnaLnmoTliJ3lp4vlgLzkuI3kvJropobnm5YgbW9kZWwg55qE5Yid5aeL5YC8XG4gICAgICAsIGNybGYgPSAvXFxyXFxuL2cvL0lFIDgg5LiLIHRleHRhcmVhIOS8muiHquWKqOWwhiBcXG4g5o2i6KGM56ym5o2i5oiQIFxcclxcbi4g6ZyA6KaB5bCG5YW25pu/5o2i5Zue5p2lXG4gICAgICAsIGNhbGxiYWNrID0gZnVuY3Rpb24odmFsKSB7XG4gICAgICAgICAgLy/miafooYzov5nph4znmoTml7blgJksIOW+iOWPr+iDvSByZW5kZXIg6L+Y5pyq5omn6KGMLiB2bS4kZ2V0RGF0YShrZXlQYXRoKSDmnKrlrprkuYksIOS4jeiDvei/lOWbnuaWsOiuvue9rueahOWAvFxuICAgICAgICAgIHZhciBuZXdWYWwgPSAodmFsIHx8IHZtLiRnZXREYXRhKGtleVBhdGgpIHx8ICcnKSArICcnXG4gICAgICAgICAgICAsIHZhbCA9IGVsW2F0dHJdXG4gICAgICAgICAgICA7XG4gICAgICAgICAgdmFsICYmIHZhbC5yZXBsYWNlICYmICh2YWwgPSB2YWwucmVwbGFjZShjcmxmLCAnXFxuJykpO1xuICAgICAgICAgIGlmKG5ld1ZhbCAhPT0gdmFsKXsgZWxbYXR0cl0gPSBuZXdWYWw7IH1cbiAgICAgICAgfVxuICAgICAgLCBoYW5kbGVyID0gZnVuY3Rpb24oaXNJbml0KSB7XG4gICAgICAgICAgdmFyIHZhbCA9IGVsW3ZhbHVlXTtcbiAgICAgICAgICBcbiAgICAgICAgICB2YWwucmVwbGFjZSAmJiAodmFsID0gdmFsLnJlcGxhY2UoY3JsZiwgJ1xcbicpKTtcbiAgICAgICAgICBhbnQuc2V0KGN1ci4kZ2V0S2V5UGF0aCgpLCB2YWwsIHtpc0J1YmJsZTogaXNJbml0ICE9PSB0cnVlfSk7XG4gICAgICAgIH1cbiAgICAgICwgY2FsbEhhbmRsZXIgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgaWYoZSAmJiBlLnByb3BlcnR5TmFtZSAmJiBlLnByb3BlcnR5TmFtZSAhPT0gYXR0cikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbiAgICAgICAgfVxuICAgICAgLCBpZSA9IHV0aWxzLmllXG4gICAgICA7XG4gICAgXG4gICAgc3dpdGNoKGVsLnRhZ05hbWUpIHtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHZhbHVlID0gYXR0ciA9ICdpbm5lckhUTUwnO1xuICAgICAgICAvL2V2ICs9ICcgYmx1cic7XG4gICAgICBjYXNlICdJTlBVVCc6XG4gICAgICBjYXNlICdURVhUQVJFQSc6XG4gICAgICAgIHN3aXRjaChlbC50eXBlKSB7XG4gICAgICAgICAgY2FzZSAnY2hlY2tib3gnOlxuICAgICAgICAgICAgdmFsdWUgPSBhdHRyID0gJ2NoZWNrZWQnO1xuICAgICAgICAgICAgLy9JRTYsIElFNyDkuIvnm5HlkKwgcHJvcGVydHljaGFuZ2Ug5Lya5oyCP1xuICAgICAgICAgICAgaWYoaWUpIHsgZXYgKz0gJyBjbGljayc7IH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdyYWRpbyc6XG4gICAgICAgICAgICBhdHRyID0gJ2NoZWNrZWQnO1xuICAgICAgICAgICAgaWYoaWUpIHsgZXYgKz0gJyBjbGljayc7IH1cbiAgICAgICAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIGVsLmNoZWNrZWQgPSBlbC52YWx1ZSA9PT0gdm0uJGdldERhdGEoa2V5UGF0aCkgKyAnJztcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpc1NldERlZmF1dCA9IGVsLmNoZWNrZWQ7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIGlmKCFhbnQub3B0aW9ucy5sYXp5KXtcbiAgICAgICAgICAgICAgaWYoJ29uaW5wdXQnIGluIGVsKXtcbiAgICAgICAgICAgICAgICBldiArPSAnIGlucHV0JztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvL0lFIOS4i+eahCBpbnB1dCDkuovku7bmm7/ku6NcbiAgICAgICAgICAgICAgaWYoaWUpIHtcbiAgICAgICAgICAgICAgICBldiArPSAnIGtleXVwIHByb3BlcnR5Y2hhbmdlIGN1dCc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdTRUxFQ1QnOlxuICAgICAgICBpZihlbC5tdWx0aXBsZSl7XG4gICAgICAgICAgaGFuZGxlciA9IGZ1bmN0aW9uKGlzSW5pdCkge1xuICAgICAgICAgICAgdmFyIHZhbHMgPSBbXTtcbiAgICAgICAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSBlbC5vcHRpb25zLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICAgICAgICAgIGlmKGVsLm9wdGlvbnNbaV0uc2VsZWN0ZWQpeyB2YWxzLnB1c2goZWwub3B0aW9uc1tpXS52YWx1ZSkgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYW50LnNldChjdXIuJGdldEtleVBhdGgoKSwgdmFscywge2lzQnViYmxlOiBpc0luaXQgIT09IHRydWV9KTtcbiAgICAgICAgICB9O1xuICAgICAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciB2YWxzID0gdm0uJGdldERhdGEoa2V5UGF0aCk7XG4gICAgICAgICAgICBpZih2YWxzICYmIHZhbHMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgZm9yKHZhciBpID0gMCwgbCA9IGVsLm9wdGlvbnMubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgICAgICAgICAgICBlbC5vcHRpb25zW2ldLnNlbGVjdGVkID0gdmFscy5pbmRleE9mKGVsLm9wdGlvbnNbaV0udmFsdWUpICE9PSAtMTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgaXNTZXREZWZhdXQgPSBpc1NldERlZmF1dCAmJiAhaGFzVG9rZW4oZWxbdmFsdWVdKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBcbiAgICB0aGlzLnVwZGF0ZSA9IGNhbGxiYWNrO1xuICAgIFxuICAgIGV2LnNwbGl0KC9cXHMrL2cpLmZvckVhY2goZnVuY3Rpb24oZSl7XG4gICAgICByZW1vdmVFdmVudChlbCwgZSwgY2FsbEhhbmRsZXIpO1xuICAgICAgYWRkRXZlbnQoZWwsIGUsIGNhbGxIYW5kbGVyKTtcbiAgICB9KTtcbiAgICBcbiAgICAvL+agueaNruihqOWNleWFg+e0oOeahOWIneWni+WMlum7mOiupOWAvOiuvue9ruWvueW6lCBtb2RlbCDnmoTlgLxcbiAgICBpZihlbFt2YWx1ZV0gJiYgaXNTZXREZWZhdXQpe1xuICAgICAgIGhhbmRsZXIodHJ1ZSk7IFxuICAgIH1cbiAgICAgIFxuICB9XG59O1xuXG5mdW5jdGlvbiBhZGRFdmVudChlbCwgZXZlbnQsIGhhbmRsZXIpIHtcbiAgaWYoZWwuYWRkRXZlbnRMaXN0ZW5lcikge1xuICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIGhhbmRsZXIsIGZhbHNlKTtcbiAgfWVsc2V7XG4gICAgZWwuYXR0YWNoRXZlbnQoJ29uJyArIGV2ZW50LCBoYW5kbGVyKTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZW1vdmVFdmVudChlbCwgZXZlbnQsIGhhbmRsZXIpIHtcbiAgaWYoZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcikge1xuICAgIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnQsIGhhbmRsZXIpO1xuICB9ZWxzZXtcbiAgICBlbC5kZXRhY2hFdmVudCgnb24nICsgZXZlbnQsIGhhbmRsZXIpO1xuICB9XG59IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBkb2MgPSByZXF1aXJlKCcuLi9kb2N1bWVudC5qcycpXG4gICwgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpXG4gICwgYWZ0ZXJGbiA9IHV0aWxzLmFmdGVyRm5cbiAgO1xuIFxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHByaW9yaXR5OiAxMDAwXG4sIGFuY2hvcjogdHJ1ZVxuLCB0ZXJtaW5hbDogdHJ1ZVxuLCBsaW5rOiBmdW5jdGlvbih2bSkge1xuICAgIHZhciBwYXJlbnQgPSB0aGlzLmFuY2hvcnMuZW5kLnBhcmVudE5vZGVcbiAgICAgICwgbm9kZXMgPSB0aGlzLmdldE5vZGVzKClcbiAgICAgIDtcbiAgICAgIFxuICAgIHRoaXMuZWxzID0gW107XG4gICAgdGhpcy5yZWxhdGl2ZVZtID0gdm07XG4gICAgXG4gICAgaWYodGhpcy5lbC5jb250ZW50KSB7XG4gICAgICB0aGlzLmZyYWcgPSB0aGlzLmVsLmNvbnRlbnQ7XG4gICAgICB0aGlzLmVsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5lbCk7XG4gICAgfWVsc2V7XG4gICAgICB0aGlzLmZyYWcgPSBkb2MuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgXG4gICAgICBmb3IodmFyIGkgPSAwLCBsID0gbm9kZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHRoaXMuZnJhZy5hcHBlbmRDaGlsZChub2Rlc1tpXSk7XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8vVE9ETzogY2FjaGUgdm1cbiAgfVxuLCB1cGRhdGU6IGZ1bmN0aW9uKHZhbCkge1xuICAgIGlmKCF0aGlzLnZtKSB7XG4gICAgICB0aGlzLnZtID0gdGhpcy5yZWxhdGl2ZVZtLiRnZXRWTSh0aGlzLnBhdGhzWzBdLCB7YXNzaWdubWVudDogdGhpcy5hc3NpZ25tZW50fSk7XG4gICAgfVxuICAgIGlmKHZhbCkge1xuICAgICAgaWYodXRpbHMuaXNBcnJheSh2YWwpKSB7XG4gICAgICAgIGlmKHZhbC5zcGxpY2UgIT09IGFycmF5TWV0aG9kcy5zcGxpY2UpIHtcbiAgICAgICAgICB1dGlscy5leHRlbmQodmFsLCBhcnJheU1ldGhvZHMpO1xuICAgICAgICAgIHZhbC5fX3ZtX18gPSB0aGlzLnZtO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc3BsaWNlKFswLCB0aGlzLmVscy5sZW5ndGhdLmNvbmNhdCh2YWwpLCB2YWwpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIGNvbnNvbGUud2Fybign6ZyA6KaB5LiA5Liq5pWw57uEJyk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIC8v57K+56Gu5o6n5Yi2IERPTSDliJfooahcbiAgLy9hcmdzOiBbaW5kZXgsIG4vKiwgaXRlbXMuLi4qL11cbiAgLy9hcnI6IOaVsOe7hOaVsOaNrlxuICAvL2ZpeFZtOiDmmK/lkKbnu7TmiqQgdmlld21vZGVsIOe0ouW8lVxuLCBzcGxpY2U6IGZ1bmN0aW9uKGFyZ3MsIGFyciwgZml4Vm0pIHtcbiAgICB2YXIgZWxzID0gdGhpcy5lbHNcbiAgICAgICwgaXRlbXMgPSBhcmdzLnNsaWNlKDIpXG4gICAgICAsIGluZGV4ID0gYXJnc1swXSAqIDFcbiAgICAgICwgbiA9IGFyZ3NbMV0gKiAxXG4gICAgICAsIG0gPSBpdGVtcy5sZW5ndGhcbiAgICAgICwgbmV3RWxzID0gW11cbiAgICAgICwgZnJhZyA9IGRvYy5jcmVhdGVEb2N1bWVudEZyYWdtZW50KClcbiAgICAgICwgcG4gPSB0aGlzLmFuY2hvcnMuc3RhcnQucGFyZW50Tm9kZVxuICAgICAgLCB2bVxuICAgICAgO1xuICAgIFxuICAgIGlmKHV0aWxzLmlzVW5kZWZpbmVkKG4pKXtcbiAgICAgIGFyZ3NbMV0gPSBuID0gZWxzLmxlbmd0aCAtIGluZGV4O1xuICAgIH1cbiAgICBcbiAgICBmb3IodmFyIGkgPSBpbmRleCwgbCA9IGVscy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgaWYoaSA8IGluZGV4ICsgbil7XG4gICAgICAgIC8v5Yig6ZmkXG4gICAgICAgIC8v5a+55LqO5oul5pyJIGlmIOWxnuaAp+W5tuS4lOS4jeaYvuekuueahOiKgueCuSwg5YW25bm25LiN5a2Y5Zyo5LqOIERPTSDmoJHkuK1cbiAgICAgICAgdHJ5eyBcbiAgICAgICAgICBzZXRMaXN0KGVsc1tpXSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwbi5yZW1vdmVDaGlsZCh0aGlzKVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIC8vcG4ucmVtb3ZlQ2hpbGQoZWxzW2ldKTsgXG4gICAgICAgIH1jYXRjaChlKXt9XG4gICAgICAgIGZpeFZtICYmIGRlbGV0ZSB0aGlzLnZtW2ldO1xuICAgICAgfWVsc2V7XG4gICAgICAgIGlmKG4gfHwgbSl7XG4gICAgICAgICAgLy/nu7TmiqTntKLlvJVcbiAgICAgICAgICB2YXIgbmV3SSA9IGkgLSAobiAtIG0pXG4gICAgICAgICAgICAsIG9sZEkgPSBpXG4gICAgICAgICAgICA7XG4gICAgICAgICAgXG4gICAgICAgICAgaWYobmV3SSA+IG9sZEkpIHtcbiAgICAgICAgICAgIG5ld0kgPSBsIC0gKGkgLSBpbmRleCk7XG4gICAgICAgICAgICBvbGRJID0gbmV3SSArIChuIC0gbSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIC8vZWxzW29sZEldWyckaW5kZXgnXSA9IG5ld0k7XG4gICAgICAgICAgc2V0TGlzdChlbHNbb2xkSV0sIGZ1bmN0aW9uKCkge3RoaXNbJyRpbmRleCddID0gbmV3SX0pO1xuICAgICAgICAgIFxuICAgICAgICAgIGlmKGZpeFZtKXtcbiAgICAgICAgICAgIHZtID0gdGhpcy52bVtuZXdJXSA9IHRoaXMudm1bb2xkSV07XG4gICAgICAgICAgICB2bS4ka2V5ID0gbmV3SSArICcnO1xuICAgICAgICAgICAgdm1bJyRpbmRleCddICYmIHZtWyckaW5kZXgnXS4kdXBkYXRlKHZtLiRrZXkpO1xuICAgICAgICAgICAgdm1bJyRpbmRleCddICYmIHZtWyckaW5kZXgnXS4kdXBkYXRlKHZtLiRrZXkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLy/mlrDlop5cbiAgICB2YXIgYXNzaWdubWVudCwgZWwsIG5vZGVzO1xuICAgIGZvcih2YXIgaiA9IDA7IGogPCBtOyBqKyspe1xuICAgICAgZWwgPSB0aGlzLmZyYWcuY2xvbmVOb2RlKHRydWUpO1xuICAgICAgZml4Vm0gJiYgZGVsZXRlIHRoaXMudm1baW5kZXggKyBqXTtcbiAgICAgIHZtID0gdGhpcy52bS4kZ2V0Vk0oaW5kZXggKyBqLCB7c2NvcGU6IHRoaXMudm0sIGFzc2lnbm1lbnQ6IHRoaXMuYXNzaWdubWVudH0pO1xuICAgICAgXG4gICAgICBhc3NpZ25tZW50ID0gdXRpbHMuY3JlYXRlKHRoaXMuYXNzaWdubWVudCk7XG4gICAgICBmb3IodmFyIGEgPSAwOyBhIDwgdGhpcy5hc3NpZ25tZW50cy5sZW5ndGg7IGErKykge1xuICAgICAgICBhc3NpZ25tZW50W3RoaXMuYXNzaWdubWVudHNbYV1dID0gdm07XG4gICAgICB9XG4gICAgICBcbiAgICAgIHZtLiRidWlsZChlbCwgYXNzaWdubWVudCk7XG4gICAgICBcbiAgICAgIG5vZGVzID0gW10uc2xpY2UuY2FsbChlbC5jaGlsZE5vZGVzKTtcbiAgICAgIFxuICAgICAgZnJhZy5hcHBlbmRDaGlsZChlbCk7XG4gICAgICBcbiAgICAgIGZpeFZtICYmIHZtWyckaW5kZXgnXSAmJiB2bVsnJGluZGV4J10uJHVwZGF0ZSh2bS4ka2V5KTtcbiAgICAgIFxuICAgICAgLy9lbFsnJGluZGV4J10gPSBpbmRleCArIGo7XG4gICAgICBzZXRMaXN0KG5vZGVzLCBmdW5jdGlvbigpIHt0aGlzWyckaW5kZXgnXSA9IGluZGV4ICsgan0pO1xuICAgICAgXG4gICAgICBuZXdFbHMucHVzaChub2Rlcyk7XG4gICAgfVxuICAgIGlmKG5ld0Vscy5sZW5ndGgpe1xuICAgICAgcG4uaW5zZXJ0QmVmb3JlKGZyYWcsIGVsc1tpbmRleCArIG5dICYmIGVsc1tpbmRleCArIG5dWzBdIHx8IHRoaXMuYW5jaG9ycy5lbmQpO1xuICAgIH1cbiAgICBcbiAgICAvL+mcgOimgea4hemZpOe8qeefreWQjuWkmuWHuueahOmDqOWIhlxuICAgIGlmKGZpeFZtKXtcbiAgICAgIGZvcih2YXIgayA9IGwgLSBuICsgbTsgayA8IGw7IGsrKyl7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnZtW2tdO1xuICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBpZihhcnIuX192bV9fICE9PSB0aGlzLnZtKSB7XG4gICAgICBhcnIuX192bV9fID0gdGhpcy52bTtcbiAgICB9XG4gICAgXG4gICAgYXJncyA9IGFyZ3Muc2xpY2UoMCwgMikuY29uY2F0KG5ld0Vscyk7XG4gICAgZWxzLnNwbGljZS5hcHBseShlbHMsIGFyZ3MpO1xuICB9XG4sIHJldmVyc2U6IGZ1bmN0aW9uKGFyZ3MsIGFyciwgZml4Vm0pIHtcbiAgICB2YXIgdm1zID0gdGhpcy52bSwgdm1cbiAgICAgICwgYW5jaG9yID0gdGhpcy5hbmNob3JzLmVuZFxuICAgICAgLCBmcmFnID0gZG9jLmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKVxuICAgICAgO1xuICAgIGZvcih2YXIgaSA9IDAsIGwgPSB0aGlzLmVscy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgaWYoZml4Vm0gJiYgaSA8IDEvMil7XG4gICAgICAgIHZtID0gdm1zW2ldO1xuICAgICAgICB2bXNbaV0gPSB2bXNbbCAtIGkgLSAxXTtcbiAgICAgICAgdm1zW2ldLiRrZXkgPSBpICsgJyc7XG4gICAgICAgIHZtLiRrZXkgPSBsIC0gaSAtIDEgKyAnJztcbiAgICAgICAgdm1zW2wgLSBpIC0gMV0gPSB2bTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZml4Vm0gJiYgdm1bJyRpbmRleCddICYmIHZtWyckaW5kZXgnXS4kdXBkYXRlKHZtLiRrZXkpO1xuICAgICAgXG4gICAgICBzZXRMaXN0KHRoaXMuZWxzW2ldLCBmdW5jdGlvbigpIHt0aGlzWyckaW5kZXgnXSA9IGwgLSBpIC0gMX0pO1xuICAgICAgLy90aGlzLmVsc1tpXVsnJGluZGV4J10gPSBsIC0gaSAtIDE7XG4gICAgICBcbiAgICAgIHNldExpc3QodGhpcy5lbHNbbCAtIGkgLSAxXSwgZnVuY3Rpb24oKSB7XG4gICAgICAgIGZyYWcuYXBwZW5kQ2hpbGQodGhpcylcbiAgICAgIH0pO1xuICAgICAgLy9mcmFnLmFwcGVuZENoaWxkKHRoaXMuZWxzW2wgLSBpIC0gMV0pO1xuICAgIH1cbiAgICBhbmNob3IucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoZnJhZywgYW5jaG9yKTtcbiAgICB0aGlzLmVscy5yZXZlcnNlKCk7XG4gIH1cbiwgc29ydDogZnVuY3Rpb24oZm4pe1xuICAgIC8vVE9ETyDov5vooYznsr7noa7pq5jov5jljp/nmoTmjpLluo8/XG4gICAgdGhpcy51cGRhdGUodGhpcy52bS4kdmFsdWUpO1xuICB9XG59O1xuXG5cbmZ1bmN0aW9uIGNhbGxSZXBlYXRlcih2bUFycmF5LCBtZXRob2QsIGFyZ3Mpe1xuICB2YXIgd2F0Y2hlcnMgPSB2bUFycmF5Ll9fdm1fXy4kd2F0Y2hlcnM7XG4gIHZhciBmaXhWbSA9IHRydWU7XG4gIGZvcih2YXIgaSA9IDAsIGwgPSB3YXRjaGVycy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgIGlmKHdhdGNoZXJzW2ldLnRva2VuLnR5cGUgPT09ICdyZXBlYXQnKXtcbiAgICAgIHdhdGNoZXJzW2ldLnRva2VuW21ldGhvZF0oYXJncywgdm1BcnJheSwgZml4Vm0pO1xuICAgICAgZml4Vm0gPSBmYWxzZTtcbiAgICB9XG4gIH1cbiAgdm1BcnJheS5fX3ZtX18ubGVuZ3RoICYmIHZtQXJyYXkuX192bV9fLmxlbmd0aC4kdXBkYXRlKHZtQXJyYXkubGVuZ3RoLCBmYWxzZSwgdHJ1ZSk7XG59XG52YXIgYXJyYXlNZXRob2RzID0ge1xuICBzcGxpY2U6IGFmdGVyRm4oW10uc3BsaWNlLCBmdW5jdGlvbigpIHtcbiAgICBjYWxsUmVwZWF0ZXIodGhpcywgJ3NwbGljZScsIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKSk7XG4gIH0pXG4sIHB1c2g6IGFmdGVyRm4oW10ucHVzaCwgZnVuY3Rpb24oLyppdGVtMSwgaXRlbTIsIC4uLiovKSB7XG4gICAgdmFyIGFyciA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICBhcnIudW5zaGlmdCh0aGlzLmxlbmd0aCAtIGFyci5sZW5ndGgsIDApO1xuICAgIFxuICAgIGNhbGxSZXBlYXRlcih0aGlzLCAnc3BsaWNlJywgYXJyKTtcbiAgfSlcbiwgcG9wOiBhZnRlckZuKFtdLnBvcCwgZnVuY3Rpb24oKSB7XG4gICAgY2FsbFJlcGVhdGVyKHRoaXMsICdzcGxpY2UnLCBbdGhpcy5sZW5ndGgsIDFdKTtcbiAgfSlcbiwgc2hpZnQ6IGFmdGVyRm4oW10uc2hpZnQsIGZ1bmN0aW9uKCkge1xuICAgIGNhbGxSZXBlYXRlcih0aGlzLCAnc3BsaWNlJywgWzAsIDFdKTtcbiAgfSlcbiwgdW5zaGlmdDogYWZ0ZXJGbihbXS51bnNoaWZ0LCBmdW5jdGlvbigpIHtcbiAgICB2YXIgYXJyID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgIGFyci51bnNoaWZ0KDAsIDApO1xuICAgIFxuICAgIGNhbGxSZXBlYXRlcih0aGlzLCAnc3BsaWNlJywgYXJyKTtcbiAgfSlcbiwgc29ydDogYWZ0ZXJGbihbXS5zb3J0LCBmdW5jdGlvbihmbikge1xuICAgIGNhbGxSZXBlYXRlcih0aGlzLCAnc29ydCcpO1xuICB9KVxuLCByZXZlcnNlOiBhZnRlckZuKFtdLnJldmVyc2UsIGZ1bmN0aW9uKCl7XG4gICAgY2FsbFJlcGVhdGVyKHRoaXMsICdyZXZlcnNlJyk7XG4gIH0pXG59O1xuXG4vL25vZGVsaXN0IOaJuemHj+WkhOeQhlxuZnVuY3Rpb24gc2V0TGlzdChub2RlTGlzdCwgZm4pIHtcbiAgZm4gPSBmbiB8fCB1dGlscy5ub29wO1xuICBmb3IodmFyIGkgPSAwLCBsID0gbm9kZUxpc3QubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgZm4uY2FsbChub2RlTGlzdFtpXSk7XG4gIH1cbn1cbiAgIiwiKGZ1bmN0aW9uKHJvb3Qpe1xuICBcInVzZSBzdHJpY3RcIjtcblxuICBtb2R1bGUuZXhwb3J0cyA9IHJvb3QuZG9jdW1lbnQgfHwgcmVxdWlyZSgnanNkb20nKS5qc2RvbSgpO1xuXG59KSgoZnVuY3Rpb24oKSB7cmV0dXJuIHRoaXN9KSgpKTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIG9wZXJhdG9ycyA9IHtcbiAgJ3VuYXJ5Jzoge1xuICAgICcrJzogZnVuY3Rpb24odikgeyByZXR1cm4gK3Y7IH1cbiAgLCAnLSc6IGZ1bmN0aW9uKHYpIHsgcmV0dXJuIC12OyB9XG4gICwgJyEnOiBmdW5jdGlvbih2KSB7IHJldHVybiAhdjsgfVxuICAgIFxuICAsICdbJzogZnVuY3Rpb24odil7IHJldHVybiB2OyB9XG4gICwgJ3snOiBmdW5jdGlvbih2KXtcbiAgICAgIHZhciByID0ge307XG4gICAgICBmb3IodmFyIGkgPSAwLCBsID0gdi5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgclt2W2ldWzBdXSA9IHZbaV1bMV07XG4gICAgICB9XG4gICAgICByZXR1cm4gcjtcbiAgICB9XG4gICwgJ3R5cGVvZic6IGZ1bmN0aW9uKHYpeyByZXR1cm4gdHlwZW9mIHY7IH1cbiAgLCAnbmV3JzogZnVuY3Rpb24odil7IHJldHVybiBuZXcgdiB9XG4gIH1cbiAgXG4sICdiaW5hcnknOiB7XG4gICAgJysnOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsICsgcjsgfVxuICAsICctJzogZnVuY3Rpb24obCwgcikgeyByZXR1cm4gbCAtIHI7IH1cbiAgLCAnKic6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgKiByOyB9XG4gICwgJy8nOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsIC8gcjsgfVxuICAsICclJzogZnVuY3Rpb24obCwgcikgeyByZXR1cm4gbCAlIHI7IH1cbiAgLCAnPCc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgPCByOyB9XG4gICwgJz4nOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsID4gcjsgfVxuICAsICc8PSc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgPD0gcjsgfVxuICAsICc+PSc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgPj0gcjsgfVxuICAsICc9PSc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgPT0gcjsgfVxuICAsICchPSc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgIT0gcjsgfVxuICAsICc9PT0nOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsID09PSByOyB9XG4gICwgJyE9PSc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgIT09IHI7IH1cbiAgLCAnJiYnOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsICYmIHI7IH1cbiAgLCAnfHwnOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsIHx8IHI7IH1cbiAgICBcbiAgLCAnLic6IGZ1bmN0aW9uKGwsIHIpIHtcbiAgICAgIGlmKHIpe1xuICAgICAgICBwYXRoID0gcGF0aCArICcuJyArIHI7XG4gICAgICB9XG4gICAgICByZXR1cm4gbFtyXTtcbiAgICB9XG4gICwgJ1snOiBmdW5jdGlvbihsLCByKSB7XG4gICAgICBpZih0eXBlb2YgciAhPT0gJ3VuZGVmaW5lZCcpe1xuICAgICAgICBwYXRoID0gcGF0aCArICcuJyArIHI7XG4gICAgICB9XG4gICAgICByZXR1cm4gbFtyXTtcbiAgICB9XG4gICwgJygnOiBmdW5jdGlvbihsLCByKXsgcmV0dXJuIGwuYXBwbHkobnVsbCwgcikgfVxuICAgIFxuICAsICd8JzogZnVuY3Rpb24obCwgcil7IHJldHVybiByLmNhbGwobnVsbCwgbCkgfS8vZmlsdGVyLiBuYW1lfGZpbHRlclxuICAsICdpbic6IGZ1bmN0aW9uKGwsIHIpe1xuICAgICAgaWYodGhpcy5hc3NpZ25tZW50KSB7XG4gICAgICAgIC8vcmVwZWF0XG4gICAgICAgIHJldHVybiByO1xuICAgICAgfWVsc2V7XG4gICAgICAgIHJldHVybiBsIGluIHI7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIFxuLCAndGVybmFyeSc6IHtcbiAgICAnPyc6IGZ1bmN0aW9uKGYsIHMsIHQpIHsgcmV0dXJuIGYgPyBzIDogdDsgfVxuICAsICcoJzogZnVuY3Rpb24oZiwgcywgdCkgeyByZXR1cm4gZltzXS5hcHBseShmLCB0KSB9XG4gIFxuICAvL2ZpbHRlci4gbmFtZSB8IGZpbHRlciA6IGFyZzIgOiBhcmczXG4gICwgJ3wnOiBmdW5jdGlvbihmLCBzLCB0KXsgcmV0dXJuIHMuYXBwbHkobnVsbCwgW2ZdLmNvbmNhdCh0KSk7IH1cbiAgfVxufTtcblxudmFyIGFyZ05hbWUgPSBbJ2ZpcnN0JywgJ3NlY29uZCcsICd0aGlyZCddXG4gICwgY29udGV4dCwgc3VtbWFyeVxuICAsIHBhdGhcbiAgO1xuXG4vL+mBjeWOhiBhc3RcbnZhciBldmFsdWF0ZSA9IGZ1bmN0aW9uKHRyZWUpIHtcbiAgdmFyIGFyaXR5ID0gdHJlZS5hcml0eVxuICAgICwgdmFsdWUgPSB0cmVlLnZhbHVlXG4gICAgLCBhcmdzID0gW11cbiAgICAsIG4gPSAwXG4gICAgLCBhcmdcbiAgICAsIHJlc1xuICAgIDtcbiAgXG4gIC8v5pON5L2c56ym5pyA5aSa5Y+q5pyJ5LiJ5YWDXG4gIGZvcig7IG4gPCAzOyBuKyspe1xuICAgIGFyZyA9IHRyZWVbYXJnTmFtZVtuXV07XG4gICAgaWYoYXJnKXtcbiAgICAgIGlmKEFycmF5LmlzQXJyYXkoYXJnKSl7XG4gICAgICAgIGFyZ3Nbbl0gPSBbXTtcbiAgICAgICAgZm9yKHZhciBpID0gMCwgbCA9IGFyZy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgICAgIGFyZ3Nbbl0ucHVzaCh0eXBlb2YgYXJnW2ldLmtleSA9PT0gJ3VuZGVmaW5lZCcgPyBcbiAgICAgICAgICAgIGV2YWx1YXRlKGFyZ1tpXSkgOiBbYXJnW2ldLmtleSwgZXZhbHVhdGUoYXJnW2ldKV0pO1xuICAgICAgICB9XG4gICAgICB9ZWxzZXtcbiAgICAgICAgYXJnc1tuXSA9IGV2YWx1YXRlKGFyZyk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIFxuICBpZihhcml0eSAhPT0gJ2xpdGVyYWwnKSB7XG4gICAgaWYocGF0aCAmJiB2YWx1ZSAhPT0gJy4nICYmIHZhbHVlICE9PSAnWycpIHtcbiAgICAgIHN1bW1hcnkucGF0aHNbcGF0aF0gPSB0cnVlO1xuICAgIH1cbiAgICBpZihhcml0eSA9PT0gJ25hbWUnKSB7XG4gICAgICBwYXRoID0gdmFsdWU7XG4gICAgfVxuICB9XG4gIFxuICBzd2l0Y2goYXJpdHkpe1xuICAgIGNhc2UgJ3VuYXJ5JzogXG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICd0ZXJuYXJ5JzpcbiAgICAgIHRyeXtcbiAgICAgICAgcmVzID0gZ2V0T3BlcmF0b3IoYXJpdHksIHZhbHVlKS5hcHBseSh0cmVlLCBhcmdzKTtcbiAgICAgIH1jYXRjaChlKXtcbiAgICAgICAgLy9jb25zb2xlLmRlYnVnKGUpO1xuICAgICAgfVxuICAgIGJyZWFrO1xuICAgIGNhc2UgJ2xpdGVyYWwnOlxuICAgICAgcmVzID0gdmFsdWU7XG4gICAgYnJlYWs7XG4gICAgY2FzZSAnYXNzaWdubWVudCc6XG4gICAgICBzdW1tYXJ5LmFzc2lnbm1lbnRzW3ZhbHVlXSA9IHRydWU7XG4gICAgYnJlYWs7XG4gICAgY2FzZSAnbmFtZSc6XG4gICAgICBzdW1tYXJ5LmxvY2Fsc1t2YWx1ZV0gPSB0cnVlO1xuICAgICAgcmVzID0gY29udGV4dC5sb2NhbHNbdmFsdWVdO1xuICAgIGJyZWFrO1xuICAgIGNhc2UgJ2ZpbHRlcic6XG4gICAgICBzdW1tYXJ5LmZpbHRlcnNbdmFsdWVdID0gdHJ1ZTtcbiAgICAgIHJlcyA9IGNvbnRleHQuZmlsdGVyc1t2YWx1ZV07XG4gICAgYnJlYWs7XG4gICAgY2FzZSAndGhpcyc6XG4gICAgICByZXMgPSBjb250ZXh0LmxvY2FscztcbiAgICBicmVhaztcbiAgfVxuICByZXR1cm4gcmVzO1xufTtcblxuZnVuY3Rpb24gZ2V0T3BlcmF0b3IoYXJpdHksIHZhbHVlKXtcbiAgcmV0dXJuIG9wZXJhdG9yc1thcml0eV1bdmFsdWVdIHx8IGZ1bmN0aW9uKCkgeyByZXR1cm47IH1cbn1cblxuZnVuY3Rpb24gcmVzZXQoX2NvbnRleHQpIHtcbiAgaWYoX2NvbnRleHQpIHtcbiAgICBjb250ZXh0ID0ge2xvY2FsczogX2NvbnRleHQubG9jYWxzIHx8IHt9LCBmaWx0ZXJzOiBfY29udGV4dC5maWx0ZXJzIHx8IHt9fTtcbiAgfWVsc2V7XG4gICAgY29udGV4dCA9IHtmaWx0ZXJzOiB7fSwgbG9jYWxzOiB7fX07XG4gIH1cbiAgXG4gIHN1bW1hcnkgPSB7ZmlsdGVyczoge30sIGxvY2Fsczoge30sIHBhdGhzOiB7fSwgYXNzaWdubWVudHM6IHt9fTtcbiAgcGF0aCA9ICcnO1xufVxuXG4vL+ihqOi+vuW8j+axguWAvFxuLy90cmVlOiBwYXJzZXIg55Sf5oiQ55qEIGFzdFxuLy9jb250ZXh0OiDooajovr7lvI/miafooYznmoTnjq/looNcbi8vY29udGV4dC5sb2NhbHM6IOWPmOmHj1xuLy9jb250ZXh0LmZpbHRlcnM6IOi/h+a7pOWZqOWHveaVsFxuZXhwb3J0cy5ldmFsID0gZnVuY3Rpb24odHJlZSwgX2NvbnRleHQpIHtcbiAgcmVzZXQoX2NvbnRleHQgfHwge30pO1xuICBcbiAgcmV0dXJuIGV2YWx1YXRlKHRyZWUpO1xufTtcblxuLy/ooajovr7lvI/mkZjopoFcbmV4cG9ydHMuc3VtbWFyeSA9IGZ1bmN0aW9uKHRyZWUpIHtcbiAgcmVzZXQoKTtcbiAgXG4gIGV2YWx1YXRlKHRyZWUpO1xuICBcbiAgaWYocGF0aCkge1xuICAgIHN1bW1hcnkucGF0aHNbcGF0aF0gPSB0cnVlO1xuICB9XG4gIGZvcih2YXIga2V5IGluIHN1bW1hcnkpIHtcbiAgICBzdW1tYXJ5W2tleV0gPSBPYmplY3Qua2V5cyhzdW1tYXJ5W2tleV0pO1xuICB9XG4gIHJldHVybiBzdW1tYXJ5O1xufTsiLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbnZhciBFdmVudCA9IHtcbiAgLy/nm5HlkKzoh6rlrprkuYnkuovku7YuXG4gIG9uOiBmdW5jdGlvbihuYW1lLCBoYW5kbGVyLCBjb250ZXh0KSB7XG4gICAgdmFyIGN0eCA9IGNvbnRleHQgfHwgdGhpc1xuICAgICAgO1xuICAgICAgXG4gICAgY3R4Ll9oYW5kbGVycyA9IGN0eC5faGFuZGxlcnMgfHwge307XG4gICAgY3R4Ll9oYW5kbGVyc1tuYW1lXSA9IGN0eC5faGFuZGxlcnNbbmFtZV0gfHwgW107XG4gICAgXG4gICAgY3R4Ll9oYW5kbGVyc1tuYW1lXS5wdXNoKHtoYW5kbGVyOiBoYW5kbGVyLCBjb250ZXh0OiBjb250ZXh0LCBjdHg6IGN0eH0pO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICAvL+enu+mZpOebkeWQrOS6i+S7ti5cbiAgb2ZmOiBmdW5jdGlvbihuYW1lLCBoYW5kbGVyLCBjb250ZXh0KSB7XG4gICAgdmFyIGN0eCA9IGNvbnRleHQgfHwgdGhpc1xuICAgICAgLCBoYW5kbGVycyA9IGN0eC5faGFuZGxlcnNcbiAgICAgIDtcbiAgICAgIFxuICAgIGlmKG5hbWUgJiYgaGFuZGxlcnNbbmFtZV0pe1xuICAgICAgaWYodXRpbHMuaXNGdW5jdGlvbihoYW5kbGVyKSl7XG4gICAgICAgIGZvcih2YXIgaSA9IGhhbmRsZXJzW25hbWVdLmxlbmd0aCAtIDE7IGkgPj0wOyBpLS0pIHtcbiAgICAgICAgICBpZihoYW5kbGVyc1tuYW1lXVtpXS5oYW5kbGVyID09PSBoYW5kbGVyKXtcbiAgICAgICAgICAgIGhhbmRsZXJzW25hbWVdLnNwbGljZShpLCAxKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1lbHNle1xuICAgICAgICBoYW5kbGVyc1tuYW1lXSA9IFtdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgLy/op6blj5Hoh6rlrprkuYnkuovku7YuIFxuICAvL+ivpeaWueazleayoeacieaPkOS+m+mdmeaAgeWMlueahCBjb250ZXh0IOWPguaVsC4g5aaC6KaB6Z2Z5oCB5YyW5L2/55SoLCDlupTor6U6IGBFdmVudC50cmlnZ2VyLmNhbGwoY29udGV4dCwgbmFtZSwgZGF0YSlgXG4gIHRyaWdnZXI6IGZ1bmN0aW9uKG5hbWUsIGRhdGEpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXNcbiAgICAgICwgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKVxuICAgICAgLCBoYW5kbGVycyA9IHRoYXQuX2hhbmRsZXJzXG4gICAgICA7XG4gICAgICBcbiAgICBpZihoYW5kbGVycyAmJiBoYW5kbGVyc1tuYW1lXSl7XG4gICAgICBoYW5kbGVyc1tuYW1lXS5mb3JFYWNoKGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5oYW5kbGVyLmFwcGx5KHRoYXQsIGFyZ3MpXG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRXZlbnQ7IiwiXCJ1c2Ugc3RyaWN0XCI7XG4vL0phdmFzY3JpcHQgZXhwcmVzc2lvbiBwYXJzZXIgbW9kaWZpZWQgZm9ybSBDcm9ja2ZvcmQncyBURE9QIHBhcnNlclxudmFyIGNyZWF0ZSA9IE9iamVjdC5jcmVhdGUgfHwgZnVuY3Rpb24gKG8pIHtcbiAgZnVuY3Rpb24gRigpIHt9XG4gIEYucHJvdG90eXBlID0gbztcbiAgcmV0dXJuIG5ldyBGKCk7XG59O1xuXG52YXIgZXJyb3IgPSBmdW5jdGlvbiAobWVzc2FnZSwgdCkge1xuICAgIHQgPSB0IHx8IHRoaXM7XG4gICAgdC5uYW1lID0gXCJTeW50YXhFcnJvclwiO1xuICAgIHQubWVzc2FnZSA9IG1lc3NhZ2U7XG4gICAgdGhyb3cgdDtcbn07XG5cbnZhciBub29wID0gZnVuY3Rpb24oKSB7fTtcblxudmFyIHRva2VuaXplID0gZnVuY3Rpb24gKGNvZGUsIHByZWZpeCwgc3VmZml4KSB7XG4gICAgdmFyIGM7ICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZSBjdXJyZW50IGNoYXJhY3Rlci5cbiAgICB2YXIgZnJvbTsgICAgICAgICAgICAgICAgICAgLy8gVGhlIGluZGV4IG9mIHRoZSBzdGFydCBvZiB0aGUgdG9rZW4uXG4gICAgdmFyIGkgPSAwOyAgICAgICAgICAgICAgICAgIC8vIFRoZSBpbmRleCBvZiB0aGUgY3VycmVudCBjaGFyYWN0ZXIuXG4gICAgdmFyIGxlbmd0aCA9IGNvZGUubGVuZ3RoO1xuICAgIHZhciBuOyAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgbnVtYmVyIHZhbHVlLlxuICAgIHZhciBxOyAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgcXVvdGUgY2hhcmFjdGVyLlxuICAgIHZhciBzdHI7ICAgICAgICAgICAgICAgICAgICAvLyBUaGUgc3RyaW5nIHZhbHVlLlxuXG4gICAgdmFyIHJlc3VsdCA9IFtdOyAgICAgICAgICAgIC8vIEFuIGFycmF5IHRvIGhvbGQgdGhlIHJlc3VsdHMuXG5cbiAgICAvLyBNYWtlIGEgdG9rZW4gb2JqZWN0LlxuICAgIHZhciBtYWtlID0gZnVuY3Rpb24gKHR5cGUsIHZhbHVlKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiB0eXBlLFxuICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgZnJvbTogZnJvbSxcbiAgICAgICAgICAgIHRvOiBpXG4gICAgICAgIH07XG4gICAgfTtcblxuLy8gQmVnaW4gdG9rZW5pemF0aW9uLiBJZiB0aGUgc291cmNlIHN0cmluZyBpcyBlbXB0eSwgcmV0dXJuIG5vdGhpbmcuXG5cbiAgICBpZiAoIWNvZGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuLy8gSWYgcHJlZml4IGFuZCBzdWZmaXggc3RyaW5ncyBhcmUgbm90IHByb3ZpZGVkLCBzdXBwbHkgZGVmYXVsdHMuXG5cbiAgICBpZiAodHlwZW9mIHByZWZpeCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgcHJlZml4ID0gJzw+Ky0mJztcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBzdWZmaXggIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHN1ZmZpeCA9ICc9PiY6JztcbiAgICB9XG5cblxuLy8gTG9vcCB0aHJvdWdoIGNvZGUgdGV4dCwgb25lIGNoYXJhY3RlciBhdCBhIHRpbWUuXG5cbiAgICBjID0gY29kZS5jaGFyQXQoaSk7XG4gICAgd2hpbGUgKGMpIHtcbiAgICAgICAgZnJvbSA9IGk7XG4gICAgICAgIFxuICAgICAgICBpZiAoYyA8PSAnICcpIHsvLyBJZ25vcmUgd2hpdGVzcGFjZS5cbiAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgIGMgPSBjb2RlLmNoYXJBdChpKTtcbiAgICAgICAgfSBlbHNlIGlmICgoYyA+PSAnYScgJiYgYyA8PSAneicpIHx8IChjID49ICdBJyAmJiBjIDw9ICdaJykgfHwgYyA9PT0gJyQnIHx8IGMgPT09ICdfJykgey8vIG5hbWUuXG4gICAgICAgICAgICBzdHIgPSBjO1xuICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgZm9yICg7Oykge1xuICAgICAgICAgICAgICAgIGMgPSBjb2RlLmNoYXJBdChpKTtcbiAgICAgICAgICAgICAgICBpZiAoKGMgPj0gJ2EnICYmIGMgPD0gJ3onKSB8fCAoYyA+PSAnQScgJiYgYyA8PSAnWicpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAoYyA+PSAnMCcgJiYgYyA8PSAnOScpIHx8IGMgPT09ICdfJykge1xuICAgICAgICAgICAgICAgICAgICBzdHIgKz0gYztcbiAgICAgICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKG1ha2UoJ25hbWUnLCBzdHIpKTtcbiAgICAgICAgfSBlbHNlIGlmIChjID49ICcwJyAmJiBjIDw9ICc5Jykge1xuICAgICAgICAvLyBudW1iZXIuXG5cbiAgICAgICAgLy8gQSBudW1iZXIgY2Fubm90IHN0YXJ0IHdpdGggYSBkZWNpbWFsIHBvaW50LiBJdCBtdXN0IHN0YXJ0IHdpdGggYSBkaWdpdCxcbiAgICAgICAgLy8gcG9zc2libHkgJzAnLlxuICAgICAgICAgICAgc3RyID0gYztcbiAgICAgICAgICAgIGkgKz0gMTtcblxuLy8gTG9vayBmb3IgbW9yZSBkaWdpdHMuXG5cbiAgICAgICAgICAgIGZvciAoOzspIHtcbiAgICAgICAgICAgICAgICBjID0gY29kZS5jaGFyQXQoaSk7XG4gICAgICAgICAgICAgICAgaWYgKGMgPCAnMCcgfHwgYyA+ICc5Jykge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgICAgIHN0ciArPSBjO1xuICAgICAgICAgICAgfVxuXG4vLyBMb29rIGZvciBhIGRlY2ltYWwgZnJhY3Rpb24gcGFydC5cblxuICAgICAgICAgICAgaWYgKGMgPT09ICcuJykge1xuICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgICAgICBzdHIgKz0gYztcbiAgICAgICAgICAgICAgICBmb3IgKDs7KSB7XG4gICAgICAgICAgICAgICAgICAgIGMgPSBjb2RlLmNoYXJBdChpKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGMgPCAnMCcgfHwgYyA+ICc5Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgICAgICAgICBzdHIgKz0gYztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbi8vIExvb2sgZm9yIGFuIGV4cG9uZW50IHBhcnQuXG5cbiAgICAgICAgICAgIGlmIChjID09PSAnZScgfHwgYyA9PT0gJ0UnKSB7XG4gICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgICAgIHN0ciArPSBjO1xuICAgICAgICAgICAgICAgIGMgPSBjb2RlLmNoYXJBdChpKTtcbiAgICAgICAgICAgICAgICBpZiAoYyA9PT0gJy0nIHx8IGMgPT09ICcrJykge1xuICAgICAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIHN0ciArPSBjO1xuICAgICAgICAgICAgICAgICAgICBjID0gY29kZS5jaGFyQXQoaSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjIDwgJzAnIHx8IGMgPiAnOScpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3IoXCJCYWQgZXhwb25lbnRcIiwgbWFrZSgnbnVtYmVyJywgc3RyKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgICAgICAgICBzdHIgKz0gYztcbiAgICAgICAgICAgICAgICAgICAgYyA9IGNvZGUuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgIH0gd2hpbGUgKGMgPj0gJzAnICYmIGMgPD0gJzknKTtcbiAgICAgICAgICAgIH1cblxuLy8gTWFrZSBzdXJlIHRoZSBuZXh0IGNoYXJhY3RlciBpcyBub3QgYSBsZXR0ZXIuXG5cbiAgICAgICAgICAgIGlmIChjID49ICdhJyAmJiBjIDw9ICd6Jykge1xuICAgICAgICAgICAgICAgIHN0ciArPSBjO1xuICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgICAgICBlcnJvcihcIkJhZCBudW1iZXJcIiwgbWFrZSgnbnVtYmVyJywgc3RyKSk7XG4gICAgICAgICAgICB9XG5cbi8vIENvbnZlcnQgdGhlIHN0cmluZyB2YWx1ZSB0byBhIG51bWJlci4gSWYgaXQgaXMgZmluaXRlLCB0aGVuIGl0IGlzIGEgZ29vZFxuLy8gdG9rZW4uXG5cbiAgICAgICAgICAgIG4gPSArc3RyO1xuICAgICAgICAgICAgaWYgKGlzRmluaXRlKG4pKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnB1c2gobWFrZSgnbnVtYmVyJywgbikpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBlcnJvcihcIkJhZCBudW1iZXJcIiwgbWFrZSgnbnVtYmVyJywgc3RyKSk7XG4gICAgICAgICAgICB9XG5cbi8vIHN0cmluZ1xuXG4gICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJ1xcJycgfHwgYyA9PT0gJ1wiJykge1xuICAgICAgICAgICAgc3RyID0gJyc7XG4gICAgICAgICAgICBxID0gYztcbiAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgIGZvciAoOzspIHtcbiAgICAgICAgICAgICAgICBjID0gY29kZS5jaGFyQXQoaSk7XG4gICAgICAgICAgICAgICAgaWYgKGMgPCAnICcpIHtcbiAgICAgICAgICAgICAgICAgICAgbWFrZSgnc3RyaW5nJywgc3RyKTtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3IoYyA9PT0gJ1xcbicgfHwgYyA9PT0gJ1xccicgfHwgYyA9PT0gJycgP1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJVbnRlcm1pbmF0ZWQgc3RyaW5nLlwiIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiQ29udHJvbCBjaGFyYWN0ZXIgaW4gc3RyaW5nLlwiLCBtYWtlKCcnLCBzdHIpKTtcbiAgICAgICAgICAgICAgICB9XG5cbi8vIExvb2sgZm9yIHRoZSBjbG9zaW5nIHF1b3RlLlxuXG4gICAgICAgICAgICAgICAgaWYgKGMgPT09IHEpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuXG4vLyBMb29rIGZvciBlc2NhcGVtZW50LlxuXG4gICAgICAgICAgICAgICAgaWYgKGMgPT09ICdcXFxcJykge1xuICAgICAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgIGVycm9yKFwiVW50ZXJtaW5hdGVkIHN0cmluZ1wiLCBtYWtlKCdzdHJpbmcnLCBzdHIpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjID0gY29kZS5jaGFyQXQoaSk7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoYykge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdiJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGMgPSAnXFxiJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdmJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGMgPSAnXFxmJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICduJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGMgPSAnXFxuJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdyJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGMgPSAnXFxyJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICd0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGMgPSAnXFx0JztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICd1JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IoXCJVbnRlcm1pbmF0ZWQgc3RyaW5nXCIsIG1ha2UoJ3N0cmluZycsIHN0cikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYyA9IHBhcnNlSW50KGNvZGUuc3Vic3RyKGkgKyAxLCA0KSwgMTYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpc0Zpbml0ZShjKSB8fCBjIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IoXCJVbnRlcm1pbmF0ZWQgc3RyaW5nXCIsIG1ha2UoJ3N0cmluZycsIHN0cikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYyA9IFN0cmluZy5mcm9tQ2hhckNvZGUoYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpICs9IDQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdHIgKz0gYztcbiAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICByZXN1bHQucHVzaChtYWtlKCdzdHJpbmcnLCBzdHIpKTtcbiAgICAgICAgICAgIGMgPSBjb2RlLmNoYXJBdChpKTtcblxuLy8gY29tbWVudC5cblxuICAgICAgICB9IGVsc2UgaWYgKGMgPT09ICcvJyAmJiBjb2RlLmNoYXJBdChpICsgMSkgPT09ICcvJykge1xuICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgZm9yICg7Oykge1xuICAgICAgICAgICAgICAgIGMgPSBjb2RlLmNoYXJBdChpKTtcbiAgICAgICAgICAgICAgICBpZiAoYyA9PT0gJ1xcbicgfHwgYyA9PT0gJ1xccicgfHwgYyA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgIH1cblxuLy8gY29tYmluaW5nXG5cbiAgICAgICAgfSBlbHNlIGlmIChwcmVmaXguaW5kZXhPZihjKSA+PSAwKSB7XG4gICAgICAgICAgICBzdHIgPSBjO1xuICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgICAgICBjID0gY29kZS5jaGFyQXQoaSk7XG4gICAgICAgICAgICAgICAgaWYgKGkgPj0gbGVuZ3RoIHx8IHN1ZmZpeC5pbmRleE9mKGMpIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3RyICs9IGM7XG4gICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzdWx0LnB1c2gobWFrZSgnb3BlcmF0b3InLCBzdHIpKTtcblxuLy8gc2luZ2xlLWNoYXJhY3RlciBvcGVyYXRvclxuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICByZXN1bHQucHVzaChtYWtlKCdvcGVyYXRvcicsIGMpKTtcbiAgICAgICAgICAgIGMgPSBjb2RlLmNoYXJBdChpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuXG52YXIgbWFrZV9wYXJzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3ltYm9sX3RhYmxlID0ge307XG4gICAgdmFyIHRva2VuO1xuICAgIHZhciB0b2tlbnM7XG4gICAgdmFyIHRva2VuX25yO1xuICAgIHZhciBjb250ZXh0O1xuICAgIFxuICAgIHZhciBpdHNlbGYgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICB2YXIgZmluZCA9IGZ1bmN0aW9uIChuKSB7XG4gICAgICBuLm51ZCAgICAgID0gaXRzZWxmO1xuICAgICAgbi5sZWQgICAgICA9IG51bGw7XG4gICAgICBuLnN0ZCAgICAgID0gbnVsbDtcbiAgICAgIG4ubGJwICAgICAgPSAwO1xuICAgICAgcmV0dXJuIG47XG4gICAgfTtcblxuICAgIHZhciBhZHZhbmNlID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgIHZhciBhLCBvLCB0LCB2O1xuICAgICAgICBpZiAoaWQgJiYgdG9rZW4uaWQgIT09IGlkKSB7XG4gICAgICAgICAgICBlcnJvcihcIkV4cGVjdGVkICdcIiArIGlkICsgXCInLlwiLCB0b2tlbik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRva2VuX25yID49IHRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRva2VuID0gc3ltYm9sX3RhYmxlW1wiKGVuZClcIl07XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdCA9IHRva2Vuc1t0b2tlbl9ucl07XG4gICAgICAgIHRva2VuX25yICs9IDE7XG4gICAgICAgIHYgPSB0LnZhbHVlO1xuICAgICAgICBhID0gdC50eXBlO1xuICAgICAgICBpZiAoKGEgPT09IFwib3BlcmF0b3JcIiB8fCBhICE9PSAnc3RyaW5nJykgJiYgdiBpbiBzeW1ib2xfdGFibGUpIHtcbiAgICAgICAgICAgIC8vdHJ1ZSwgZmFsc2Ug562J55u05o6l6YeP5Lmf5Lya6L+b5YWl5q2k5YiG5pSvXG4gICAgICAgICAgICBvID0gc3ltYm9sX3RhYmxlW3ZdO1xuICAgICAgICAgICAgaWYgKCFvKSB7XG4gICAgICAgICAgICAgICAgZXJyb3IoXCJVbmtub3duIG9wZXJhdG9yLlwiLCB0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChhID09PSBcIm5hbWVcIikge1xuICAgICAgICAgICAgbyA9IGZpbmQodCk7XG4gICAgICAgIH0gZWxzZSBpZiAoYSA9PT0gXCJzdHJpbmdcIiB8fCBhID09PSAgXCJudW1iZXJcIikge1xuICAgICAgICAgICAgbyA9IHN5bWJvbF90YWJsZVtcIihsaXRlcmFsKVwiXTtcbiAgICAgICAgICAgIGEgPSBcImxpdGVyYWxcIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVycm9yKFwiVW5leHBlY3RlZCB0b2tlbi5cIiwgdCk7XG4gICAgICAgIH1cbiAgICAgICAgdG9rZW4gPSBjcmVhdGUobyk7XG4gICAgICAgIHRva2VuLmZyb20gID0gdC5mcm9tO1xuICAgICAgICB0b2tlbi50byAgICA9IHQudG87XG4gICAgICAgIHRva2VuLnZhbHVlID0gdjtcbiAgICAgICAgdG9rZW4uYXJpdHkgPSBhO1xuICAgICAgICByZXR1cm4gdG9rZW47XG4gICAgfTtcblxuICAgIHZhciBleHByZXNzaW9uID0gZnVuY3Rpb24gKHJicCkge1xuICAgICAgICB2YXIgbGVmdDtcbiAgICAgICAgdmFyIHQgPSB0b2tlbjtcbiAgICAgICAgYWR2YW5jZSgpO1xuICAgICAgICBsZWZ0ID0gdC5udWQoKTtcbiAgICAgICAgd2hpbGUgKHJicCA8IHRva2VuLmxicCkge1xuICAgICAgICAgICAgdCA9IHRva2VuO1xuICAgICAgICAgICAgYWR2YW5jZSgpO1xuICAgICAgICAgICAgbGVmdCA9IHQubGVkKGxlZnQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsZWZ0O1xuICAgIH07XG5cbiAgICB2YXIgb3JpZ2luYWxfc3ltYm9sID0ge1xuICAgICAgICBudWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGVycm9yKFwiVW5kZWZpbmVkLlwiLCB0aGlzKTtcbiAgICAgICAgfSxcbiAgICAgICAgbGVkOiBmdW5jdGlvbiAobGVmdCkge1xuICAgICAgICAgICAgZXJyb3IoXCJNaXNzaW5nIG9wZXJhdG9yLlwiLCB0aGlzKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgc3ltYm9sID0gZnVuY3Rpb24gKGlkLCBicCkge1xuICAgICAgICB2YXIgcyA9IHN5bWJvbF90YWJsZVtpZF07XG4gICAgICAgIGJwID0gYnAgfHwgMDtcbiAgICAgICAgaWYgKHMpIHtcbiAgICAgICAgICAgIGlmIChicCA+PSBzLmxicCkge1xuICAgICAgICAgICAgICAgIHMubGJwID0gYnA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzID0gY3JlYXRlKG9yaWdpbmFsX3N5bWJvbCk7XG4gICAgICAgICAgICBzLmlkID0gcy52YWx1ZSA9IGlkO1xuICAgICAgICAgICAgcy5sYnAgPSBicDtcbiAgICAgICAgICAgIHN5bWJvbF90YWJsZVtpZF0gPSBzO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzO1xuICAgIH07XG5cbiAgICB2YXIgY29uc3RhbnQgPSBmdW5jdGlvbiAocywgdiwgYSkge1xuICAgICAgICB2YXIgeCA9IHN5bWJvbChzKTtcbiAgICAgICAgeC5udWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gc3ltYm9sX3RhYmxlW3RoaXMuaWRdLnZhbHVlO1xuICAgICAgICAgICAgdGhpcy5hcml0eSA9IFwibGl0ZXJhbFwiO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH07XG4gICAgICAgIHgudmFsdWUgPSB2O1xuICAgICAgICByZXR1cm4geDtcbiAgICB9O1xuICAgIFxuICAgIHZhciBpbmZpeCA9IGZ1bmN0aW9uIChpZCwgYnAsIGxlZCkge1xuICAgICAgICB2YXIgcyA9IHN5bWJvbChpZCwgYnApO1xuICAgICAgICBzLmxlZCA9IGxlZCB8fCBmdW5jdGlvbiAobGVmdCkge1xuICAgICAgICAgICAgdGhpcy5maXJzdCA9IGxlZnQ7XG4gICAgICAgICAgICB0aGlzLnNlY29uZCA9IGV4cHJlc3Npb24oYnApO1xuICAgICAgICAgICAgdGhpcy5hcml0eSA9IFwiYmluYXJ5XCI7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHM7XG4gICAgfTtcblxuICAgIHZhciBpbmZpeHIgPSBmdW5jdGlvbiAoaWQsIGJwLCBsZWQpIHtcbiAgICAgICAgdmFyIHMgPSBzeW1ib2woaWQsIGJwKTtcbiAgICAgICAgcy5sZWQgPSBsZWQgfHwgZnVuY3Rpb24gKGxlZnQpIHtcbiAgICAgICAgICAgIHRoaXMuZmlyc3QgPSBsZWZ0O1xuICAgICAgICAgICAgdGhpcy5zZWNvbmQgPSBleHByZXNzaW9uKGJwIC0gMSk7XG4gICAgICAgICAgICB0aGlzLmFyaXR5ID0gXCJiaW5hcnlcIjtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gcztcbiAgICB9O1xuXG4gICAgdmFyIHByZWZpeCA9IGZ1bmN0aW9uIChpZCwgbnVkKSB7XG4gICAgICAgIHZhciBzID0gc3ltYm9sKGlkKTtcbiAgICAgICAgcy5udWQgPSBudWQgfHwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5maXJzdCA9IGV4cHJlc3Npb24oNzApO1xuICAgICAgICAgICAgdGhpcy5hcml0eSA9IFwidW5hcnlcIjtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gcztcbiAgICB9O1xuXG4gICAgc3ltYm9sKFwiKGVuZClcIik7XG4gICAgc3ltYm9sKFwiKG5hbWUpXCIpO1xuICAgIHN5bWJvbChcIjpcIik7XG4gICAgc3ltYm9sKFwiKVwiKTtcbiAgICBzeW1ib2woXCJdXCIpO1xuICAgIHN5bWJvbChcIn1cIik7XG4gICAgc3ltYm9sKFwiLFwiKTtcblxuICAgIGNvbnN0YW50KFwidHJ1ZVwiLCB0cnVlKTtcbiAgICBjb25zdGFudChcImZhbHNlXCIsIGZhbHNlKTtcbiAgICBjb25zdGFudChcIm51bGxcIiwgbnVsbCk7XG4gICAgXG4gICAgY29uc3RhbnQoXCJNYXRoXCIsIE1hdGgpO1xuICAgIGNvbnN0YW50KFwiRGF0ZVwiLCBEYXRlKTtcblxuICAgIHN5bWJvbChcIihsaXRlcmFsKVwiKS5udWQgPSBpdHNlbGY7XG5cbiAgICAvLyBzeW1ib2woXCJ0aGlzXCIpLm51ZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gdGhpcy5hcml0eSA9IFwidGhpc1wiO1xuICAgICAgICAvLyByZXR1cm4gdGhpcztcbiAgICAvLyB9O1xuXG4gICAgLy9PcGVyYXRvciBQcmVjZWRlbmNlOlxuICAgIC8vaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvT3BlcmF0b3JzL09wZXJhdG9yX1ByZWNlZGVuY2VcblxuICAgIGluZml4KFwiP1wiLCAyMCwgZnVuY3Rpb24gKGxlZnQpIHtcbiAgICAgICAgdGhpcy5maXJzdCA9IGxlZnQ7XG4gICAgICAgIHRoaXMuc2Vjb25kID0gZXhwcmVzc2lvbigwKTtcbiAgICAgICAgYWR2YW5jZShcIjpcIik7XG4gICAgICAgIHRoaXMudGhpcmQgPSBleHByZXNzaW9uKDApO1xuICAgICAgICB0aGlzLmFyaXR5ID0gXCJ0ZXJuYXJ5XCI7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0pO1xuICAgIFxuICAgIGluZml4cihcIiYmXCIsIDMxKTtcbiAgICBpbmZpeHIoXCJ8fFwiLCAzMCk7XG5cbiAgICBpbmZpeHIoXCI9PT1cIiwgNDApO1xuICAgIGluZml4cihcIiE9PVwiLCA0MCk7XG5cbiAgICBpbmZpeHIoXCI9PVwiLCA0MCk7XG4gICAgaW5maXhyKFwiIT1cIiwgNDApO1xuXG4gICAgaW5maXhyKFwiPFwiLCA0MCk7XG4gICAgaW5maXhyKFwiPD1cIiwgNDApO1xuICAgIGluZml4cihcIj5cIiwgNDApO1xuICAgIGluZml4cihcIj49XCIsIDQwKTtcbiAgICBcbiAgICBpbmZpeChcImluXCIsIDQ1LCBmdW5jdGlvbiAobGVmdCkge1xuICAgICAgICB0aGlzLmZpcnN0ID0gbGVmdDtcbiAgICAgICAgdGhpcy5zZWNvbmQgPSBleHByZXNzaW9uKDApO1xuICAgICAgICB0aGlzLmFyaXR5ID0gXCJiaW5hcnlcIjtcbiAgICAgICAgaWYoY29udGV4dCA9PT0gJ3JlcGVhdCcpe1xuICAgICAgICAgIC8vIGBpbmAgYXQgcmVwZWF0IGJsb2NrXG4gICAgICAgICAgbGVmdC5hcml0eSA9ICdhc3NpZ25tZW50JztcbiAgICAgICAgICB0aGlzLmFzc2lnbm1lbnQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0pO1xuXG4gICAgaW5maXgoXCIrXCIsIDUwKTtcbiAgICBpbmZpeChcIi1cIiwgNTApO1xuXG4gICAgaW5maXgoXCIqXCIsIDYwKTtcbiAgICBpbmZpeChcIi9cIiwgNjApO1xuICAgIGluZml4KFwiJVwiLCA2MCk7XG5cbiAgICBpbmZpeChcIi5cIiwgODAsIGZ1bmN0aW9uIChsZWZ0KSB7XG4gICAgICAgIHRoaXMuZmlyc3QgPSBsZWZ0O1xuICAgICAgICBpZiAodG9rZW4uYXJpdHkgIT09IFwibmFtZVwiKSB7XG4gICAgICAgICAgICBlcnJvcihcIkV4cGVjdGVkIGEgcHJvcGVydHkgbmFtZS5cIiwgdG9rZW4pO1xuICAgICAgICB9XG4gICAgICAgIHRva2VuLmFyaXR5ID0gXCJsaXRlcmFsXCI7XG4gICAgICAgIHRoaXMuc2Vjb25kID0gdG9rZW47XG4gICAgICAgIHRoaXMuYXJpdHkgPSBcImJpbmFyeVwiO1xuICAgICAgICBhZHZhbmNlKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0pO1xuXG4gICAgaW5maXgoXCJbXCIsIDgwLCBmdW5jdGlvbiAobGVmdCkge1xuICAgICAgICB0aGlzLmZpcnN0ID0gbGVmdDtcbiAgICAgICAgdGhpcy5zZWNvbmQgPSBleHByZXNzaW9uKDApO1xuICAgICAgICB0aGlzLmFyaXR5ID0gXCJiaW5hcnlcIjtcbiAgICAgICAgYWR2YW5jZShcIl1cIik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0pO1xuXG4gICAgaW5maXgoXCIoXCIsIDgwLCBmdW5jdGlvbiAobGVmdCkge1xuICAgICAgICB2YXIgYSA9IFtdO1xuICAgICAgICBpZiAobGVmdC5pZCA9PT0gXCIuXCIgfHwgbGVmdC5pZCA9PT0gXCJbXCIpIHtcbiAgICAgICAgICAgIHRoaXMuYXJpdHkgPSBcInRlcm5hcnlcIjtcbiAgICAgICAgICAgIHRoaXMuZmlyc3QgPSBsZWZ0LmZpcnN0O1xuICAgICAgICAgICAgdGhpcy5zZWNvbmQgPSBsZWZ0LnNlY29uZDtcbiAgICAgICAgICAgIHRoaXMudGhpcmQgPSBhO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5hcml0eSA9IFwiYmluYXJ5XCI7XG4gICAgICAgICAgICB0aGlzLmZpcnN0ID0gbGVmdDtcbiAgICAgICAgICAgIHRoaXMuc2Vjb25kID0gYTtcbiAgICAgICAgICAgIGlmICgobGVmdC5hcml0eSAhPT0gXCJ1bmFyeVwiIHx8IGxlZnQuaWQgIT09IFwiZnVuY3Rpb25cIikgJiZcbiAgICAgICAgICAgICAgICAgICAgbGVmdC5hcml0eSAhPT0gXCJuYW1lXCIgJiYgbGVmdC5hcml0eSAhPT0gXCJsaXRlcmFsXCIgJiYgbGVmdC5pZCAhPT0gXCIoXCIgJiZcbiAgICAgICAgICAgICAgICAgICAgbGVmdC5pZCAhPT0gXCImJlwiICYmIGxlZnQuaWQgIT09IFwifHxcIiAmJiBsZWZ0LmlkICE9PSBcIj9cIikge1xuICAgICAgICAgICAgICAgIGVycm9yKFwiRXhwZWN0ZWQgYSB2YXJpYWJsZSBuYW1lLlwiLCBsZWZ0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodG9rZW4uaWQgIT09IFwiKVwiKSB7XG4gICAgICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgICAgIGEucHVzaChleHByZXNzaW9uKDApKTtcbiAgICAgICAgICAgICAgICBpZiAodG9rZW4uaWQgIT09IFwiLFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhZHZhbmNlKFwiLFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBhZHZhbmNlKFwiKVwiKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSk7XG5cbiAgICAvL2ZpbHRlclxuICAgIGluZml4KFwifFwiLCAxMCwgZnVuY3Rpb24obGVmdCkge1xuICAgICAgdmFyIGE7XG4gICAgICB0aGlzLmZpcnN0ID0gbGVmdDtcbiAgICAgIHRva2VuLmFyaXR5ID0gJ2ZpbHRlcic7XG4gICAgICB0aGlzLnNlY29uZCA9IGV4cHJlc3Npb24oMTApO1xuICAgICAgdGhpcy5hcml0eSA9ICdiaW5hcnknO1xuICAgICAgaWYodG9rZW4uaWQgPT09ICc6Jyl7XG4gICAgICAgIHRoaXMuYXJpdHkgPSAndGVybmFyeSc7XG4gICAgICAgIHRoaXMudGhpcmQgPSBhID0gW107XG4gICAgICAgIHdoaWxlKHRydWUpe1xuICAgICAgICAgIGFkdmFuY2UoJzonKTtcbiAgICAgICAgICBhLnB1c2goZXhwcmVzc2lvbigwKSk7XG4gICAgICAgICAgaWYodG9rZW4uaWQgIT09IFwiOlwiKXtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSk7XG4gICAgXG5cbiAgICBwcmVmaXgoXCIhXCIpO1xuICAgIHByZWZpeChcIi1cIik7XG4gICAgcHJlZml4KFwidHlwZW9mXCIpO1xuXG4gICAgcHJlZml4KFwiKFwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBlID0gZXhwcmVzc2lvbigwKTtcbiAgICAgICAgYWR2YW5jZShcIilcIik7XG4gICAgICAgIHJldHVybiBlO1xuICAgIH0pO1xuXG4gICAgcHJlZml4KFwiW1wiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBhID0gW107XG4gICAgICAgIGlmICh0b2tlbi5pZCAhPT0gXCJdXCIpIHtcbiAgICAgICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICAgICAgYS5wdXNoKGV4cHJlc3Npb24oMCkpO1xuICAgICAgICAgICAgICAgIGlmICh0b2tlbi5pZCAhPT0gXCIsXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFkdmFuY2UoXCIsXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGFkdmFuY2UoXCJdXCIpO1xuICAgICAgICB0aGlzLmZpcnN0ID0gYTtcbiAgICAgICAgdGhpcy5hcml0eSA9IFwidW5hcnlcIjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSk7XG5cbiAgICBwcmVmaXgoXCJ7XCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGEgPSBbXSwgbiwgdjtcbiAgICAgICAgaWYgKHRva2VuLmlkICE9PSBcIn1cIikge1xuICAgICAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgICAgICBuID0gdG9rZW47XG4gICAgICAgICAgICAgICAgaWYgKG4uYXJpdHkgIT09IFwibmFtZVwiICYmIG4uYXJpdHkgIT09IFwibGl0ZXJhbFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yKFwiQmFkIHByb3BlcnR5IG5hbWUuXCIsIHRva2VuKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYWR2YW5jZSgpO1xuICAgICAgICAgICAgICAgIGFkdmFuY2UoXCI6XCIpO1xuICAgICAgICAgICAgICAgIHYgPSBleHByZXNzaW9uKDApO1xuICAgICAgICAgICAgICAgIHYua2V5ID0gbi52YWx1ZTtcbiAgICAgICAgICAgICAgICBhLnB1c2godik7XG4gICAgICAgICAgICAgICAgaWYgKHRva2VuLmlkICE9PSBcIixcIikge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYWR2YW5jZShcIixcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYWR2YW5jZShcIn1cIik7XG4gICAgICAgIHRoaXMuZmlyc3QgPSBhO1xuICAgICAgICB0aGlzLmFyaXR5ID0gXCJ1bmFyeVwiO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9KTtcblxuICAgIC8vX3NvdXJjZTog6KGo6L6+5byP5Luj56CB5a2X56ym5LiyXG4gICAgLy9fY29udGV4dDog6KGo6L6+5byP55qE6K+t5Y+l546v5aKDXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChfc291cmNlLCBfY29udGV4dCkge1xuICAgICAgICB0b2tlbnMgPSB0b2tlbml6ZShfc291cmNlLCAnPTw+ISstKiZ8LyVeJywgJz08PiZ8Jyk7XG4gICAgICAgIHRva2VuX25yID0gMDtcbiAgICAgICAgY29udGV4dCA9IF9jb250ZXh0O1xuICAgICAgICBhZHZhbmNlKCk7XG4gICAgICAgIHZhciBzID0gZXhwcmVzc2lvbigwKTtcbiAgICAgICAgYWR2YW5jZShcIihlbmQpXCIpO1xuICAgICAgICByZXR1cm4gcztcbiAgICB9O1xufTtcblxuZXhwb3J0cy5wYXJzZSA9IG1ha2VfcGFyc2UoKTsiLCJ2YXIgdG9rZW5SZWcgPSAve3soeyhbXn1cXG5dKyl9fFtefVxcbl0rKX19L2c7XG5cbi8v5a2X56ym5Liy5Lit5piv5ZCm5YyF5ZCr5qih5p2/5Y2g5L2N56ym5qCH6K6wXG5mdW5jdGlvbiBoYXNUb2tlbihzdHIpIHtcbiAgdG9rZW5SZWcubGFzdEluZGV4ID0gMDtcbiAgcmV0dXJuIHN0ciAmJiB0b2tlblJlZy50ZXN0KHN0cik7XG59XG5cbmZ1bmN0aW9uIHBhcnNlVG9rZW4odmFsdWUpIHtcbiAgdmFyIHRva2VucyA9IFtdXG4gICAgLCB0ZXh0TWFwID0gW11cbiAgICAsIHN0YXJ0ID0gMFxuICAgICwgdmFsLCB0b2tlblxuICAgIDtcbiAgXG4gIHRva2VuUmVnLmxhc3RJbmRleCA9IDA7XG4gIFxuICB3aGlsZSgodmFsID0gdG9rZW5SZWcuZXhlYyh2YWx1ZSkpKXtcbiAgICBpZih0b2tlblJlZy5sYXN0SW5kZXggLSBzdGFydCA+IHZhbFswXS5sZW5ndGgpe1xuICAgICAgdGV4dE1hcC5wdXNoKHZhbHVlLnNsaWNlKHN0YXJ0LCB0b2tlblJlZy5sYXN0SW5kZXggLSB2YWxbMF0ubGVuZ3RoKSk7XG4gICAgfVxuICAgIFxuICAgIHRva2VuID0ge1xuICAgICAgZXNjYXBlOiAhdmFsWzJdXG4gICAgLCBwYXRoOiAodmFsWzJdIHx8IHZhbFsxXSkudHJpbSgpXG4gICAgLCBwb3NpdGlvbjogdGV4dE1hcC5sZW5ndGhcbiAgICAsIHRleHRNYXA6IHRleHRNYXBcbiAgICB9O1xuICAgIFxuICAgIHRva2Vucy5wdXNoKHRva2VuKTtcbiAgICBcbiAgICAvL+S4gOS4quW8leeUqOexu+WeiyjmlbDnu4Qp5L2c5Li66IqC54K55a+56LGh55qE5paH5pys5Zu+LCDov5nmoLflvZPmn5DkuIDkuKrlvJXnlKjmlLnlj5jkuobkuIDkuKrlgLzlkI4sIOWFtuS7luW8leeUqOWPluW+l+eahOWAvOmDveS8muWQjOaXtuabtOaWsFxuICAgIHRleHRNYXAucHVzaCh2YWxbMF0pO1xuICAgIFxuICAgIHN0YXJ0ID0gdG9rZW5SZWcubGFzdEluZGV4O1xuICB9XG4gIFxuICBpZih2YWx1ZS5sZW5ndGggPiBzdGFydCl7XG4gICAgdGV4dE1hcC5wdXNoKHZhbHVlLnNsaWNlKHN0YXJ0LCB2YWx1ZS5sZW5ndGgpKTtcbiAgfVxuICBcbiAgdG9rZW5zLnRleHRNYXAgPSB0ZXh0TWFwO1xuICBcbiAgcmV0dXJuIHRva2Vucztcbn1cblxuZXhwb3J0cy5oYXNUb2tlbiA9IGhhc1Rva2VuO1xuXG5leHBvcnRzLnBhcnNlVG9rZW4gPSBwYXJzZVRva2VuOyIsIlwidXNlIHN0cmljdFwiO1xuXG4vL3V0aWxzXG4vLy0tLVxuXG52YXIgZG9jID0gcmVxdWlyZSgnLi9kb2N1bWVudC5qcycpO1xuXG52YXIga2V5UGF0aFJlZyA9IC8oPzpcXC58XFxbKS9nXG4gICwgYnJhID0gL1xcXS9nXG4gIDtcblxuLy9wYXRoLmtleSwgcGF0aFtrZXldIC0tPiBbJ3BhdGgnLCAna2V5J11cbmZ1bmN0aW9uIHBhcnNlS2V5UGF0aChrZXlQYXRoKXtcbiAgcmV0dXJuIGtleVBhdGgucmVwbGFjZShicmEsICcnKS5zcGxpdChrZXlQYXRoUmVnKTtcbn1cblxuLyoqXG4gKiDlkIjlubblr7nosaFcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW2RlZXA9ZmFsc2VdIOaYr+WQpua3seW6puWQiOW5tlxuICogQHBhcmFtIHtPYmplY3R9IHRhcmdldCDnm67moIflr7nosaFcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb2JqZWN0Li4uXSDmnaXmupDlr7nosaFcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10g55So5LqO6Ieq5a6a5LmJ5ZCI5bm255qE5Zue6LCDXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn0g5ZCI5bm25ZCO55qEIHRhcmdldCDlr7nosaFcbiAqL1xuZnVuY3Rpb24gZXh0ZW5kKC8qIGRlZXAsIHRhcmdldCwgb2JqZWN0Li4uLCBjYWxsbGJhY2sgKi8pIHtcbiAgdmFyIG9wdGlvbnNcbiAgICAsIG5hbWUsIHNyYywgY29weSwgY29weUlzQXJyYXksIGNsb25lXG4gICAgLCB0YXJnZXQgPSBhcmd1bWVudHNbMF0gfHwge31cbiAgICAsIGkgPSAxXG4gICAgLCBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoXG4gICAgLCBkZWVwID0gZmFsc2VcbiAgICAsIGNhbGxiYWNrXG4gICAgO1xuXG4gIC8vIEhhbmRsZSBhIGRlZXAgY29weSBzaXR1YXRpb25cbiAgaWYgKHR5cGVvZiB0YXJnZXQgPT09IFwiYm9vbGVhblwiKSB7XG4gICAgZGVlcCA9IHRhcmdldDtcblxuICAgIC8vIHNraXAgdGhlIGJvb2xlYW4gYW5kIHRoZSB0YXJnZXRcbiAgICB0YXJnZXQgPSBhcmd1bWVudHNbIGkgXSB8fCB7fTtcbiAgICBpKys7XG4gIH1cbiAgXG4gIGlmKHV0aWxzLmlzRnVuY3Rpb24oYXJndW1lbnRzW2xlbmd0aCAtIDFdKSkge1xuICAgIGNhbGxiYWNrID0gYXJndW1lbnRzW2xlbmd0aCAtIDFdO1xuICAgIGxlbmd0aC0tO1xuICB9XG5cbiAgLy8gSGFuZGxlIGNhc2Ugd2hlbiB0YXJnZXQgaXMgYSBzdHJpbmcgb3Igc29tZXRoaW5nIChwb3NzaWJsZSBpbiBkZWVwIGNvcHkpXG4gIGlmICh0eXBlb2YgdGFyZ2V0ICE9PSBcIm9iamVjdFwiICYmICF1dGlscy5pc0Z1bmN0aW9uKHRhcmdldCkpIHtcbiAgICB0YXJnZXQgPSB7fTtcbiAgfVxuXG4gIGZvciAoIDsgaSA8IGxlbmd0aDsgaSsrICkge1xuICAgIC8vIE9ubHkgZGVhbCB3aXRoIG5vbi1udWxsL3VuZGVmaW5lZCB2YWx1ZXNcbiAgICBpZiAoIChvcHRpb25zID0gYXJndW1lbnRzWyBpIF0pICE9IG51bGwgKSB7XG4gICAgICAvLyBFeHRlbmQgdGhlIGJhc2Ugb2JqZWN0XG4gICAgICBmb3IgKCBuYW1lIGluIG9wdGlvbnMgKSB7XG4gICAgICAgIC8vYW5kcm9pZCAyLjMgYnJvd3NlciBjYW4gZW51bSB0aGUgcHJvdG90eXBlIG9mIGNvbnN0cnVjdG9yLi4uXG4gICAgICAgIGlmKG9wdGlvbnMuaGFzT3duUHJvcGVydHkobmFtZSkgJiYgbmFtZSAhPT0gJ3Byb3RvdHlwZScpe1xuICAgICAgICAgIHNyYyA9IHRhcmdldFsgbmFtZSBdO1xuICAgICAgICAgIGNvcHkgPSBvcHRpb25zWyBuYW1lIF07XG4gICAgICAgICAgXG5cbiAgICAgICAgICAvLyBSZWN1cnNlIGlmIHdlJ3JlIG1lcmdpbmcgcGxhaW4gb2JqZWN0cyBvciBhcnJheXNcbiAgICAgICAgICBpZiAoIGRlZXAgJiYgY29weSAmJiAoIHV0aWxzLmlzUGxhaW5PYmplY3QoY29weSkgfHwgKGNvcHlJc0FycmF5ID0gdXRpbHMuaXNBcnJheShjb3B5KSkgKSApIHtcbiAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFByZXZlbnQgbmV2ZXItZW5kaW5nIGxvb3BcbiAgICAgICAgICAgIGlmICggdGFyZ2V0ID09PSBjb3B5ICkge1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICggY29weUlzQXJyYXkgKSB7XG4gICAgICAgICAgICAgIGNvcHlJc0FycmF5ID0gZmFsc2U7XG4gICAgICAgICAgICAgIGNsb25lID0gc3JjICYmIHV0aWxzLmlzQXJyYXkoc3JjKSA/IHNyYyA6IFtdO1xuXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjbG9uZSA9IHNyYyAmJiB1dGlscy5pc1BsYWluT2JqZWN0KHNyYykgPyBzcmMgOiB7fTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYoY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgY29weSA9IGNhbGxiYWNrKGNsb25lLCBjb3B5LCBuYW1lKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTmV2ZXIgbW92ZSBvcmlnaW5hbCBvYmplY3RzLCBjbG9uZSB0aGVtXG4gICAgICAgICAgICB0YXJnZXRbIG5hbWUgXSA9IGV4dGVuZCggZGVlcCwgY2xvbmUsIGNvcHksIGNhbGxiYWNrKTtcblxuICAgICAgICAgICAgLy8gRG9uJ3QgYnJpbmcgaW4gdW5kZWZpbmVkIHZhbHVlc1xuICAgICAgICAgIH0gZWxzZSBpZiAoICF1dGlscy5pc1VuZGVmaW5lZChjb3B5KSApIHtcblxuICAgICAgICAgICAgaWYoY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgY29weSA9IGNhbGxiYWNrKHNyYywgY29weSwgbmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0YXJnZXRbIG5hbWUgXSA9IGNvcHk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gUmV0dXJuIHRoZSBtb2RpZmllZCBvYmplY3RcbiAgcmV0dXJuIHRhcmdldDtcbn1cblxudmFyIGNyZWF0ZSA9IE9iamVjdC5jcmVhdGUgfHwgZnVuY3Rpb24gKG8pIHtcbiAgZnVuY3Rpb24gRigpIHt9XG4gIEYucHJvdG90eXBlID0gbztcbiAgcmV0dXJuIG5ldyBGKCk7XG59O1xuXG5mdW5jdGlvbiB0cGxQYXJzZSh0cGwsIHRhcmdldCkge1xuICB2YXIgZWw7XG4gIGlmKHV0aWxzLmlzT2JqZWN0KHRwbCkpe1xuICAgIGlmKHRhcmdldCl7XG4gICAgICBlbCA9IHRhcmdldCA9IHV0aWxzLmlzT2JqZWN0KHRhcmdldCkgPyB0YXJnZXQgOiBkb2MuY3JlYXRlRWxlbWVudCh0YXJnZXQpO1xuICAgICAgZWwuaW5uZXJIVE1MID0gJyc7Ly/muIXnqbrnm67moIflr7nosaFcbiAgICAgIHRhcmdldC5hcHBlbmRDaGlsZCh0cGwpO1xuICAgIH1lbHNle1xuICAgICAgZWwgPSB0cGw7XG4gICAgfVxuICAgIHRwbCA9IGVsLm91dGVySFRNTDtcbiAgfWVsc2V7XG4gICAgZWwgPSB1dGlscy5pc09iamVjdCh0YXJnZXQpID8gdGFyZ2V0IDogZG9jLmNyZWF0ZUVsZW1lbnQodGFyZ2V0IHx8ICdkaXYnKTtcbiAgICBlbC5pbm5lckhUTUwgPSB0cGw7XG4gIH1cbiAgcmV0dXJuIHtlbDogZWwsIHRwbDogdHBsfTtcbn1cblxuIFxudmFyIHV0aWxzID0ge1xuICBub29wOiBmdW5jdGlvbiAoKXt9XG4sIGllOiAhIWRvYy5hdHRhY2hFdmVudFxuXG4sIGlzT2JqZWN0OiBmdW5jdGlvbiAodmFsKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWwgPT09ICdvYmplY3QnICYmIHZhbCAhPT0gbnVsbDtcbiAgfVxuXG4sIGlzVW5kZWZpbmVkOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWwgPT09ICd1bmRlZmluZWQnO1xuICB9XG5cbiwgaXNGdW5jdGlvbjogZnVuY3Rpb24gKHZhbCl7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWwgPT09ICdmdW5jdGlvbic7XG4gIH1cblxuLCBpc0FycmF5OiBmdW5jdGlvbiAodmFsKSB7XG4gICAgaWYodXRpbHMuaWUpe1xuICAgICAgLy9JRSA5IOWPiuS7peS4iyBJRSDot6jnqpflj6Pmo4DmtYvmlbDnu4RcbiAgICAgIHJldHVybiB2YWwgJiYgdmFsLmNvbnN0cnVjdG9yICsgJycgPT09IEFycmF5ICsgJyc7XG4gICAgfWVsc2V7XG4gICAgICByZXR1cm4gQXJyYXkuaXNBcnJheSh2YWwpO1xuICAgIH1cbiAgfVxuXG4gIC8v566A5Y2V5a+56LGh55qE566A5piT5Yik5patXG4sIGlzUGxhaW5PYmplY3Q6IGZ1bmN0aW9uIChvKXtcbiAgICBpZiAoIW8gfHwgKHt9KS50b1N0cmluZy5jYWxsKG8pICE9PSAnW29iamVjdCBPYmplY3RdJyB8fCBvLm5vZGVUeXBlIHx8IG8gPT09IG8ud2luZG93KSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfWVsc2V7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICAvL+WHveaVsOWIh+mdoi4gb3JpRm4g5Y6f5aeL5Ye95pWwLCBmbiDliIfpnaLooaXlhYXlh73mlbBcbiAgLy/liY3pnaLnmoTlh73mlbDov5Tlm57lgLzkvKDlhaUgYnJlYWtDaGVjayDliKTmlq0sIGJyZWFrQ2hlY2sg6L+U5Zue5YC85Li655yf5pe25LiN5omn6KGM5YiH6Z2i6KGl5YWF55qE5Ye95pWwXG4sIGJlZm9yZUZuOiBmdW5jdGlvbiAob3JpRm4sIGZuLCBicmVha0NoZWNrKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHJldCA9IGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICBpZihicmVha0NoZWNrICYmIGJyZWFrQ2hlY2suY2FsbCh0aGlzLCByZXQpKXtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvcmlGbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH1cblxuLCBhZnRlckZuOiBmdW5jdGlvbiAob3JpRm4sIGZuLCBicmVha0NoZWNrKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHJldCA9IG9yaUZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICBpZihicmVha0NoZWNrICYmIGJyZWFrQ2hlY2suY2FsbCh0aGlzLCByZXQpKXtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgIH1cbiAgICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICByZXR1cm4gcmV0O1xuICAgIH1cbiAgfVxuICBcbiwgcGFyc2VLZXlQYXRoOiBwYXJzZUtleVBhdGhcblxuLCBkZWVwU2V0OiBmdW5jdGlvbiAoa2V5U3RyLCB2YWx1ZSwgb2JqKSB7XG4gICAgaWYoa2V5U3RyKXtcbiAgICAgIHZhciBjaGFpbiA9IHBhcnNlS2V5UGF0aChrZXlTdHIpXG4gICAgICAgICwgY3VyID0gb2JqXG4gICAgICAgIDtcbiAgICAgIGNoYWluLmZvckVhY2goZnVuY3Rpb24oa2V5LCBpKSB7XG4gICAgICAgIGlmKGkgPT09IGNoYWluLmxlbmd0aCAtIDEpe1xuICAgICAgICAgIGN1cltrZXldID0gdmFsdWU7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgIGlmKGN1ciAmJiBjdXIuaGFzT3duUHJvcGVydHkoa2V5KSl7XG4gICAgICAgICAgICBjdXIgPSBjdXJba2V5XTtcbiAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgIGN1cltrZXldID0ge307XG4gICAgICAgICAgICBjdXIgPSBjdXJba2V5XTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1lbHNle1xuICAgICAgZXh0ZW5kKG9iaiwgdmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9XG4sIGRlZXBHZXQ6IGZ1bmN0aW9uIChrZXlTdHIsIG9iaikge1xuICAgIHZhciBjaGFpbiwgY3VyID0gb2JqLCBrZXk7XG4gICAgaWYoa2V5U3RyKXtcbiAgICAgIGNoYWluID0gcGFyc2VLZXlQYXRoKGtleVN0cik7XG4gICAgICBmb3IodmFyIGkgPSAwLCBsID0gY2hhaW4ubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGtleSA9IGNoYWluW2ldO1xuICAgICAgICBpZihjdXIgJiYgY3VyLmhhc093blByb3BlcnR5KGtleSkpe1xuICAgICAgICAgIGN1ciA9IGN1cltrZXldO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGN1cjtcbiAgfVxuLCBleHRlbmQ6IGV4dGVuZFxuLCBjcmVhdGU6IGNyZWF0ZVxuLCB0cGxQYXJzZTogdHBsUGFyc2Vcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gdXRpbHM7Il19
(1)
});
