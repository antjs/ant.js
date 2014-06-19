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
  , parseKeyPath = utils.parseKeyPath
  , deepSet = utils.deepSet
  , deepGet = utils.deepGet
  , extend = utils.extend
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
    opts = tpl;
    tpl = opts.tpl;
  }
  opts = opts || {};
  var el, that = this
    , defaults = this.defaults || {}
    ;

  opts = extend(true, {}, defaults, opts);

  var data = opts.data || {}
    , events = opts.events || {}
    , filters = opts.filters || {}
    , watchers = opts.watchers || {}
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
  
  this.partials = {};
  this.filters = filters;
  
  for(var event in events) {
    this.on(event, events[event]);
  }
  
  buildViewModel.call(this);
  
  for(var keyPath in watchers) {
    this.watch(keyPath, watchers[keyPath].bind(this));
  }
  
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
    if(callback){
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
    //对于 nodelist 如果其中有包含 {{text}} 直接量的表达式, 文本节点会被分割, 其节点数量可能会动态增加
    for(var i = 0; i < el.length; i++) {
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
    el.parentNode && el.parentNode.replaceChild(el.content, el);
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

function exParse(path) {
  var that = this;
  var ast = parse(path, this.token.type);
  var summary = evaluate.summary(ast);
    
  extend(this.token, summary);
  extend(this, summary);
  this.ast = ast;
};

function Watcher(relativeVm, token) {
  var ass = token.assignment;
  
  this.token = token;
  this.relativeVm = relativeVm;
  this.ant = relativeVm.$root.$ant;
  
  this.val = NaN;
  
  this.state = Watcher.STATE_READY;
  
  exParse.call(this, token.path);
  
  relativeVm.$$sPaths = relativeVm.$$sPaths || [];
  
  for(var i = 0, l = this.paths.length; i < l; i++){
    relativeVm.$getVM(this.paths[i], {assignment: ass, sPaths: relativeVm.$$sPaths}).$watchers.push(this);
  }
  
  //没有变量的表达式
  if(!this.locals.length) {
    this.fn();
  }
}

extend(Watcher, {
  STATE_READY: 0
, STATE_CALLED: 1
}, Class);

function watcherUpdate (val) {
  try{
    this.token.update(val, this.val);
    this.val = val;
  }catch(e){
    console.error(e);
  }
}

extend(Watcher.prototype, {
  fn: function() {
    var key
      , that = this
      , dir = this.token
      , newVal
      , vals = {}
      ;
      
    for(var i = 0, l = this.locals.length; i < l; i++){
      key = this.locals[i];
      vals[key] = this.relativeVm.$getVM(key, {assignment: dir.assignment}).$getData();
      
      if(dir.assignment && dir.assignment[key] && this.paths.indexOf(key + '.$index') >= 0) {
        vals[key] = extend({'$index': dir.assignment[key]['$key'] * 1}, vals[key])
      }
    }

    newVal = this.getValue(vals);
    
    if(newVal && newVal.then) {
      //a promise
      newVal.then(function(val) {
        watcherUpdate.call(that, val);
      });
    }else{
      watcherUpdate.call(this, newVal);
    }

    this.state = Watcher.STATE_CALLED;
  }
, getValue: function(vals) {
    var dir = this.token
      , val
      , filters = extend({}, this.ant.filters, function(a, b) {  return b.bind(dir); })
      ;
    
    try{
      val = evaluate.eval(this.ast, {locals: vals, filters: filters});
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

, $$sPaths: null
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
      , sPaths = opts.sPaths || []
      , update, shiftScope
      ;
    
    for(var key in assignment) {
      shiftScope = true;
      break;
    }
      
    if(keyChain[0] in assignment) {
      cur = assignment[keyChain[0]];
      keyChain.shift();
      if(cur !== this) {
        update = true;
      }
    }else{
      update = shiftScope;
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
    if(update) {
      sPaths.push(cur.$getKeyPath());
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
    var ant = this.$root.$ant;
    
    //新加入模板后更新
    this.$update(ant.get(this.$getKeyPath()), true);
    
    //引用父级作用域变量时, 自动运算
    if(this.$$sPaths) {
      for(var i = 0, l = this.$$sPaths.length; i < l; i++) {
        this.$getVM(this.$$sPaths[i]).$update(ant.get(this.$$sPaths[i]), true);
      }
      this.$$sPaths = null;
    }
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
    if(this.anchor && node) {
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
        removeAttr(el, attr);
      }
      this.attrs = val;
    }else{
      if(this.conditionalAttr) {
        val ? setAttr(el, this.dirName, val) : removeAttr(el, this.dirName);
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

function removeAttr(el, attr) {
  el.removeAttribute(attr);
  delete el[attr];
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
    
    anchor.parentNode && anchor.parentNode.insertBefore(this.frag, anchor);
  }
, hide: function() {
    var nodes = this.getNodes();
    
    if(nodes) {
      for(var i = 0, l = nodes.length; i < l; i++) {
        this.frag.appendChild(nodes[i]);
      }
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
, link: function() {
    var nodes = this.el.childNodes
      , frag = doc.createDocumentFragment()
      ;

    while(nodes[0]) {
      frag.appendChild(nodes[0]);
    }
    
    this.el.content = frag;
    
    //this.el.setAttribute(this.nodeName, '');
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

    this._anchors = [];
    this.relativeVm = vm;
    
    this.el.parentNode.removeChild(this.el);
    
    //TODO: cache vm
  }
, update: function(val, old) {
    if(!this.vm) {
      this.vm = this.relativeVm.$getVM(this.paths[0], {assignment: this.assignment});
    }
    var fixVm
      , watchers = this.vm.$watchers
      ;
    if(val && val !== old) {
      if(utils.isArray(val)) {
        if(val.splice !== arrayMethods.splice) {
          utils.extend(val, arrayMethods);
          val.__vm__ = this.vm;
        }
        
        for(var i = 0, l = watchers.length; i < l; i++) {
          if(watchers[i].token.type === 'repeat'){
            fixVm = watchers[i].token === this;
            break;
          }
        }
        
        this.splice([0, this._anchors.length].concat(val), val, fixVm);
      }else{
        console.warn('需要一个数组');
      }
    }
  }
  
  //获取当次遍历的所有节点
, getRepeatNodes: function(index, fn) {
    var anchor = this._anchors[index]
      , endAnchor = this._anchors[index + 1]
      , nodes = []
      ;
     
    fn = fn || utils.noop;
     
    for(var node = anchor, next; node && node !==  endAnchor && node !== this.anchors.end; node = next) {
      next = node.nextSibling;
      nodes.push(node);
      fn.call(node);
    }
    return nodes;
  }
  //精确控制 DOM 列表
  //args: [index, n/*, items...*/]
  //arr: 数组数据
  //fixVm: 是否维护 viewmodel 索引
, splice: function(args, arr, fixVm) {
    var anchors = this._anchors
      , newAnchors = []
      , items = args.slice(2)
      , index = args[0] * 1
      , n = args[1] * 1
      , m = items.length
      , pn = this.anchors.start.parentNode
      , vm
      ;
    
    if(utils.isUndefined(n)){
      args[1] = n = anchors.length - index;
    }
    
    for(var i = index, l = anchors.length; i < l; i++){
      if(i < index + n){
        //删除
        //对于拥有 if 属性并且不显示的节点, 其并不存在于 DOM 树中
        try{ 
          this.getRepeatNodes(i, function() {
            pn.removeChild(this)
          });
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
          
          this.getRepeatNodes(oldI, function() {this['$index'] = newI});
          
          if(fixVm){
            vm = this.vm[newI] = this.vm[oldI];
            vm.$key = newI + '';
          }
          vm['$index'] && vm['$index'].$update(vm.$key);
        }else{
          break;
        }
      }
    }
    
    //新增
    var assignment, el, anchor
      , frag = doc.createDocumentFragment()
      ;
    for(var j = 0; j < m; j++){
      el = this.el.cloneNode(true);
      anchor = doc.createTextNode('');
      
      if(this.el.content) {
        el.content = this.el.content.cloneNode(true);
      }
      fixVm && delete this.vm[index + j];
      vm = this.vm.$getVM(index + j, {scope: this.vm, assignment: this.assignment});
      
      assignment = utils.create(this.assignment);
      for(var a = 0; a < this.assignments.length; a++) {
        assignment[this.assignments[a]] = vm;
      }
      
      frag.appendChild(anchor);
      frag.appendChild(el);
      vm.$build(el, assignment);
      
      vm['$index'] && vm['$index'].$update(vm.$key);
      
      newAnchors.push(anchor);
      
      for(var node = anchor; node; node = node.nextSibling) {
        node['$index'] = index + j;
      }
    }
    if(newAnchors.length){
      pn.insertBefore(frag, anchors[index + n] || this.anchors.end);
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
    
    args = args.slice(0, 2).concat(newAnchors);
    anchors.splice.apply(anchors, args);
  }
, reverse: function(args, arr, fixVm) {
    var vms = this.vm, vm
      , anchor = this.anchors.end
      , frag = doc.createDocumentFragment()
      ;
    for(var i = 0, l = this._anchors.length; i < l; i++){
      if(fixVm && i < 1/2){
        vm = vms[i];
        vms[i] = vms[l - i - 1];
        vms[i].$key = i + '';
        vm.$key = l - i - 1 + '';
        vms[l - i - 1] = vm;
      }
      
      fixVm && vm['$index'] && vm['$index'].$update(vm.$key);
      
      this.getRepeatNodes(l - i - 1, function() {
        this['$index'] = i;
        frag.appendChild(this)
      });
    }
    anchor.parentNode.insertBefore(frag, anchor);
    this._anchors.reverse();
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
//return: {filters:[], locals:[], paths: [], assignments: []}
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
    console.error(t);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJFOlxcemh1emhhblxcRHJvcGJveFxcY29kZVxcYW50LmpzXFxub2RlX21vZHVsZXNcXGJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3Nlci1wYWNrXFxfcHJlbHVkZS5qcyIsIkU6L3podXpoYW4vRHJvcGJveC9jb2RlL2FudC5qcy9zcmMvYW50LmpzIiwiRTovemh1emhhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy9jbGFzcy5qcyIsIkU6L3podXpoYW4vRHJvcGJveC9jb2RlL2FudC5qcy9zcmMvZGlyZWN0aXZlLmpzIiwiRTovemh1emhhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy9kaXJlY3RpdmVzL2F0dHIuanMiLCJFOi96aHV6aGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL2RpcmVjdGl2ZXMvaW5kZXguanMiLCJFOi96aHV6aGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL2RpcmVjdGl2ZXMvbW9kZWwuanMiLCJFOi96aHV6aGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL2RpcmVjdGl2ZXMvcmVwZWF0LmpzIiwiRTovemh1emhhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy9kb2N1bWVudC5qcyIsIkU6L3podXpoYW4vRHJvcGJveC9jb2RlL2FudC5qcy9zcmMvZXZhbC5qcyIsIkU6L3podXpoYW4vRHJvcGJveC9jb2RlL2FudC5qcy9zcmMvZXZlbnQuanMiLCJFOi96aHV6aGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL3BhcnNlLmpzIiwiRTovemh1emhhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy90b2tlbi5qcyIsIkU6L3podXpoYW4vRHJvcGJveC9jb2RlL2FudC5qcy9zcmMvdXRpbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOU9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2psQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBkb2MgPSByZXF1aXJlKCcuL2RvY3VtZW50LmpzJylcbiAgLCBwYXJzZSA9IHJlcXVpcmUoJy4vcGFyc2UuanMnKS5wYXJzZVxuICAsIGV2YWx1YXRlID0gcmVxdWlyZSgnLi9ldmFsLmpzJylcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKVxuICAsIEV2ZW50ID0gcmVxdWlyZSgnLi9ldmVudC5qcycpXG4gICwgQ2xhc3MgPSByZXF1aXJlKCcuL2NsYXNzLmpzJylcbiAgLCBEaXIgPSByZXF1aXJlKCcuL2RpcmVjdGl2ZS5qcycpXG4gICwgZGlycyA9IHJlcXVpcmUoJy4vZGlyZWN0aXZlcycpXG4gICwgdG9rZW4gPSByZXF1aXJlKCcuL3Rva2VuLmpzJylcbiAgO1xuXG5cbnZhciBpc09iamVjdCA9IHV0aWxzLmlzT2JqZWN0XG4gICwgaXNVbmRlZmluZWQgPSB1dGlscy5pc1VuZGVmaW5lZFxuICAsIGlzRnVuY3Rpb24gPSB1dGlscy5pc0Z1bmN0aW9uXG4gICwgaXNBcnJheSA9IHV0aWxzLmlzQXJyYXlcbiAgLCBpc1BsYWluT2JqZWN0ID0gdXRpbHMuaXNQbGFpbk9iamVjdFxuICAsIHBhcnNlS2V5UGF0aCA9IHV0aWxzLnBhcnNlS2V5UGF0aFxuICAsIGRlZXBTZXQgPSB1dGlscy5kZWVwU2V0XG4gICwgZGVlcEdldCA9IHV0aWxzLmRlZXBHZXRcbiAgLCBleHRlbmQgPSB1dGlscy5leHRlbmRcbiAgLCB0cGxQYXJzZSA9IHV0aWxzLnRwbFBhcnNlXG4gICwgY3JlYXRlID0gdXRpbHMuY3JlYXRlXG4gIDtcblxuXG5mdW5jdGlvbiBzZXRQcmVmaXgobmV3UHJlZml4KSB7XG4gIGlmKG5ld1ByZWZpeCl7XG4gICAgdGhpcy5wcmVmaXggPSBuZXdQcmVmaXg7XG4gIH1cbn1cblxuXG4vKipcbiAqICMgQW50XG4gKiDln7rkuo4gZG9tIOeahOaooeadv+W8leaTji4g5pSv5oyB5pWw5o2u57uR5a6aXG4gKiBAcGFyYW0ge1N0cmluZyB8IEVsZW1lbnR9IFt0cGxdIOaooeadv+W6lOivpeaYr+WQiOazleiAjOS4lOagh+WHhueahCBIVE1MIOagh+etvuWtl+espuS4suaIluiAheebtOaOpeaYr+eOsOaciSBET00g5qCR5Lit55qE5LiA5LiqIGVsZW1lbnQg5a+56LGhLlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRzXVxuICogQHBhcmFtIHtTdHJpbmcgfCBFbGVtZW50fSBvcHRzLnRwbFxuICogQHBhcmFtIHtPYmplY3R9IG9wdHMuZGF0YSDmuLLmn5PmqKHmnb/nmoTmlbDmja4uIOivpemhueWmguaenOS4uuepuiwg56iN5ZCO5Y+v5Lul55SoIGB0cGwucmVuZGVyKG1vZGVsKWAg5p2l5riy5p+T55Sf5oiQIGh0bWwuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IG9wdHMubGF6eSDmmK/lkKblr7kgJ2lucHV0JyDlj4ogJ3RleHRhcmVhJyDnm5HlkKwgYGNoYW5nZWAg5LqL5Lu2LCDogIzkuI3mmK8gYGlucHV0YCDkuovku7ZcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzLmV2ZW50cyBcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzLnBhcnRpYWxzXG4gKiBAcGFyYW0ge1N0cmluZyB8IEhUTUxFTGVtZW50fSBvcHRzLmVsXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gQW50KHRwbCwgb3B0cykge1xuICBpZihpc1BsYWluT2JqZWN0KHRwbCkpIHtcbiAgICBvcHRzID0gdHBsO1xuICAgIHRwbCA9IG9wdHMudHBsO1xuICB9XG4gIG9wdHMgPSBvcHRzIHx8IHt9O1xuICB2YXIgZWwsIHRoYXQgPSB0aGlzXG4gICAgLCBkZWZhdWx0cyA9IHRoaXMuZGVmYXVsdHMgfHwge31cbiAgICA7XG5cbiAgb3B0cyA9IGV4dGVuZCh0cnVlLCB7fSwgZGVmYXVsdHMsIG9wdHMpO1xuXG4gIHZhciBkYXRhID0gb3B0cy5kYXRhIHx8IHt9XG4gICAgLCBldmVudHMgPSBvcHRzLmV2ZW50cyB8fCB7fVxuICAgICwgZmlsdGVycyA9IG9wdHMuZmlsdGVycyB8fCB7fVxuICAgICwgd2F0Y2hlcnMgPSBvcHRzLndhdGNoZXJzIHx8IHt9XG4gICAgO1xuICBcbiAgZWwgPSB0cGxQYXJzZSh0cGwsIG9wdHMuZWwpO1xuICB0cGwgPSBlbC50cGw7XG4gIGVsID0gZWwuZWw7XG4gIFxuICAvL+WxnuaAp1xuICAvLy0tLS1cbiAgXG4gIHRoaXMub3B0aW9ucyA9IG9wdHM7XG4gIC8qKlxuICAgKiAjIyMgYW50LnRwbFxuICAgKiDmqKHmnb/lrZfnrKbkuLJcbiAgICogQHR5cGUge1N0cmluZ31cbiAgICovXG4gIHRoaXMudHBsID0gdHBsO1xuICBcbiAgLyoqXG4gICAqICMjIyBhbnQuZWxcbiAgICog5qih5p2/IERPTSDlr7nosaEuXG4gICAqIEB0eXBlIHtIVE1MRWxlbWVudE9iamVjdH1cbiAgICovXG4gIHRoaXMuZWwgPSBlbDtcbiAgXG4gIC8qKlxuICAgKiAjIyMgYW50LmRhdGFcbiAgICog57uR5a6a5qih5p2/55qE5pWw5o2uLlxuICAgKiBAdHlwZSB7T2JqZWN0fSDmlbDmja7lr7nosaEsIOS4jeW6lOivpeaYr+aVsOe7hC5cbiAgICovXG4gIHRoaXMuZGF0YSA9IHt9O1xuICBcbiAgdGhpcy5wYXJ0aWFscyA9IHt9O1xuICB0aGlzLmZpbHRlcnMgPSBmaWx0ZXJzO1xuICBcbiAgZm9yKHZhciBldmVudCBpbiBldmVudHMpIHtcbiAgICB0aGlzLm9uKGV2ZW50LCBldmVudHNbZXZlbnRdKTtcbiAgfVxuICBcbiAgYnVpbGRWaWV3TW9kZWwuY2FsbCh0aGlzKTtcbiAgXG4gIGZvcih2YXIga2V5UGF0aCBpbiB3YXRjaGVycykge1xuICAgIHRoaXMud2F0Y2goa2V5UGF0aCwgd2F0Y2hlcnNba2V5UGF0aF0uYmluZCh0aGlzKSk7XG4gIH1cbiAgXG4gIC8v6L+Z6YeM6ZyA6KaB5ZCI5bm25Y+v6IO95a2Y5Zyo55qEIHRoaXMuZGF0YVxuICAvL+ihqOWNleaOp+S7tuWPr+iDveS8muaciem7mOiupOWAvCwgYGJ1aWxkVmlld01vZGVsYCDlkI7kvJrpu5jorqTlgLzkvJrlubblhaUgYHRoaXMuZGF0YWAg5LitXG4gIGRhdGEgPSBleHRlbmQodGhpcy5kYXRhLCBkYXRhKTtcbiAgXG4gIGlmKG9wdHMuZGF0YSl7XG4gICAgdGhpcy5yZW5kZXIoZGF0YSk7XG4gIH1cbn1cblxuLy/pnZnmgIHmlrnms5Xlj4rlsZ7mgKdcbi8vLS0tXG5leHRlbmQoQW50LCBDbGFzcywgRGlyLCB7XG4gIHNldFByZWZpeDogc2V0UHJlZml4XG4sIGRvYzogZG9jXG4sIGRpcmVjdGl2ZXM6IHt9XG4sIHV0aWxzOiB1dGlsc1xufSk7XG5cbkFudC5zZXRQcmVmaXgoJ2EtJyk7XG5cbi8v5YaF572uIGRpcmVjdGl2ZVxuZm9yKHZhciBkaXIgaW4gZGlycykge1xuICBBbnQuZGlyZWN0aXZlKGRpciwgZGlyc1tkaXJdKTtcbn1cblxuLy/lrp7kvovmlrnms5Vcbi8vLS0tLVxuZXh0ZW5kKEFudC5wcm90b3R5cGUsIEV2ZW50LCB7XG4gIC8qKlxuICAgKiAjIyMgYW50LnJlbmRlclxuICAgKiDmuLLmn5PmqKHmnb9cbiAgICovXG4gIHJlbmRlcjogZnVuY3Rpb24oZGF0YSkge1xuICAgIGRhdGEgPSBkYXRhIHx8IHRoaXMuZGF0YTtcbiAgICB0aGlzLnNldChkYXRhLCB7aXNFeHRlbmQ6IGZhbHNlfSk7XG4gICAgdGhpcy50cmlnZ2VyKCdyZW5kZXInKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICAvKipcbiAgICogIyMjIGFudC5jbG9uZVxuICAgKiDlpI3liLbmqKHmnb9cbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRzXVxuICAgKiBAcmV0dXJuIHtUZW1wbGF0ZU9iamVjdH0g5LiA5Liq5pawIGBBbnRgIOWunuS+i1xuICAgKi9cbiwgY2xvbmU6IGZ1bmN0aW9uKG9wdHMpIHtcbiAgICB2YXIgb3B0aW9ucyA9IGV4dGVuZCh0cnVlLCB7fSwgdGhpcy5vcHRpb25zKTtcbiAgICBpZihvcHRzICYmIG9wdHMuZGF0YSl7IG9wdGlvbnMuZGF0YSA9IG51bGw7IH1cbiAgICByZXR1cm4gbmV3IHRoaXMuY29uc3RydWN0b3IodGhpcy50cGwsIGV4dGVuZCh0cnVlLCBvcHRpb25zLCBvcHRzKSk7XG4gIH1cbiAgXG4sIGdldDogZnVuY3Rpb24oa2V5KSB7XG4gICAgcmV0dXJuIGRlZXBHZXQoa2V5LCB0aGlzLmRhdGEpO1xuICB9XG4gIFxuICAvKipcbiAgICogIyMjIGFudC5zZXRcbiAgICog5pu05pawIGBhbnQuZGF0YWAg5Lit55qE5pWw5o2uXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBba2V5XSDmlbDmja7ot6/lvoQuIFxuICAgKiBAcGFyYW0ge0FueVR5cGV8T2JqZWN0fSB2YWwg5pWw5o2u5YaF5a65LiDlpoLmnpzmlbDmja7ot6/lvoTooqvnnIHnlaUsIOesrOS4gOS4quWPguaVsOaYr+S4gOS4quWvueixoS4g6YKj5LmIIHZhbCDlsIbmm7/mjaIgYW50LmRhdGEg5oiW6ICF5bm25YWl5YW25LitXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0XSDlj4LmlbDpoblcbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHQuc2lsZW5jZSDmmK/lkKbpnZnpnZnnmoTmm7TmlrDmlbDmja7ogIzkuI3op6blj5EgYHVwZGF0ZWAg5LqL5Lu25Y+K5pu05pawIERPTS5cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHQuaXNFeHRlbmQg5pWw5o2u6K6+572u57G75Z6LLiDmmK/lkKblsIbmlbDmja7lubblhaXljp/mlbDmja4uIFxuICAgICAgICAgICAg56ys5LiA5Liq5Y+C5pWw5piv5pWw5o2u6Lev5b6E5piv6K+l5YC86buY6K6k5Li6IGZhbHNlLCDogIznrKzkuIDkuKrmlbDmja7mmK/mlbDmja7lr7nosaHnmoTml7blgJnliJnpu5jorqTkuLogdHJ1ZVxuICAgKi9cbiwgc2V0OiBmdW5jdGlvbihrZXksIHZhbCwgb3B0KSB7XG4gICAgdmFyIGNoYW5nZWQsIGlzRXh0ZW5kLCBwYXJlbnQsIGtleXMsIHBhdGg7XG4gICAgXG4gICAgaWYoaXNVbmRlZmluZWQoa2V5KSl7IHJldHVybiB0aGlzOyB9XG4gICAgXG4gICAgaWYoaXNPYmplY3Qoa2V5KSl7XG4gICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgIG9wdCA9IHZhbDtcbiAgICAgIG9wdCA9IG9wdCB8fCB7fTtcbiAgICAgIGlmKG9wdC5pc0V4dGVuZCAhPT0gZmFsc2Upe1xuICAgICAgICBpc0V4dGVuZCA9IHRydWU7XG4gICAgICAgIC8vbW9kZWxFeHRlbmQodGhpcy5kYXRhLCBrZXksIHRoaXMuX3ZtKTtcbiAgICAgICAgZXh0ZW5kKHRydWUsIHRoaXMuZGF0YSwga2V5KTtcbiAgICAgIH1lbHNle1xuICAgICAgICBpc0V4dGVuZCA9IGZhbHNlO1xuICAgICAgICAvL3RoaXMuZGF0YSA9IG1vZGVsRXh0ZW5kKHt9LCBrZXksIHRoaXMuX3ZtKTtcbiAgICAgICAgdGhpcy5kYXRhID0gZXh0ZW5kKHRydWUsIHt9LCBrZXkpO1xuICAgICAgfVxuICAgIH1lbHNle1xuICAgICAgb3B0ID0gb3B0IHx8IHt9O1xuICAgICAgXG4gICAgICBpZihkZWVwR2V0KGtleSwgdGhpcy5kYXRhKSAhPT0gdmFsKSB7XG4gICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgfVxuICAgICAgaWYoY2hhbmdlZCl7XG4gICAgICAgIGlmKG9wdC5pc0V4dGVuZCAhPT0gdHJ1ZSl7XG4gICAgICAgICAga2V5cyA9IHBhcnNlS2V5UGF0aChrZXkpO1xuICAgICAgICAgIGlmKGtleXMubGVuZ3RoID4gMSl7XG4gICAgICAgICAgICBwYXRoID0ga2V5cy5wb3AoKTtcbiAgICAgICAgICAgIHBhcmVudCA9IGRlZXBHZXQoa2V5cy5qb2luKCcuJyksIHRoaXMuZGF0YSk7XG4gICAgICAgICAgICBpZihpc1VuZGVmaW5lZChwYXJlbnQpKXtcbiAgICAgICAgICAgICAgZGVlcFNldChrZXlzLmpvaW4oJy4nKSwgcGFyZW50ID0ge30sIHRoaXMuZGF0YSk7XG4gICAgICAgICAgICB9ZWxzZSBpZighaXNPYmplY3QocGFyZW50KSl7XG4gICAgICAgICAgICAgIHZhciBvbGRQYXJlbnQgPSBwYXJlbnQ7XG4gICAgICAgICAgICAgIGRlZXBTZXQoa2V5cy5qb2luKCcuJyksIHBhcmVudCA9IHt0b1N0cmluZzogZnVuY3Rpb24oKSB7IHJldHVybiBvbGRQYXJlbnQ7IH19LCB0aGlzLmRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgaWYoa2V5KXtcbiAgICAgICAgICAgICAgcGFyZW50ID0gdGhpcy5kYXRhO1xuICAgICAgICAgICAgICBwYXRoID0ga2V5O1xuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgIHBhcmVudCA9IHRoaXM7XG4gICAgICAgICAgICAgIHBhdGggPSAnZGF0YSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHBhcmVudFtwYXRoXSA9IGlzT2JqZWN0KHZhbCkgPyBleHRlbmQodHJ1ZSwgaXNBcnJheSh2YWwpID8gW10gOiB7fSwgdmFsKSA6IHZhbDtcbiAgICAgICAgICAvL3BhcmVudFtwYXRoXSA9IHZhbDtcbiAgICAgICAgICBpc0V4dGVuZCA9IGZhbHNlO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAvL21vZGVsRXh0ZW5kKHRoaXMuZGF0YSwgZGVlcFNldChrZXksIHZhbCwge30pLCB0aGlzLl92bSk7XG4gICAgICAgICAgZXh0ZW5kKHRydWUsIHRoaXMuZGF0YSwgZGVlcFNldChrZXksIHZhbCwge30pKTtcbiAgICAgICAgICBpc0V4dGVuZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgY2hhbmdlZCAmJiAoIW9wdC5zaWxlbmNlKSAmJiAoaXNPYmplY3Qoa2V5KSA/IHVwZGF0ZS5jYWxsKHRoaXMsIGtleSwgaXNFeHRlbmQsIG9wdC5pc0J1YmJsZSkgOiB1cGRhdGUuY2FsbCh0aGlzLCBrZXksIHZhbCwgaXNFeHRlbmQsIG9wdC5pc0J1YmJsZSkpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIC8qKlxuICAgKiAjIyMgYW50LnNldFBhcnRpYWxcbiAgICog5re75Yqg5a2Q5qih5p2/XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBpbmZvIOWtkOaooeadv+S/oeaBr1xuICAgKiBAcGFyYW0ge1N0cmluZ3xIVE1MRWxlbWVudH0gaW5mby5jb250ZW50IOWtkOaooeadv+WGheWuuVxuICAgKiBAcGFyYW0ge1N0cmluZ30gW2luZm8ubmFtZV0g5a2Q5qih5p2/5qCH56S656ymXG4gICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR8ZnVuY3Rpb259IFtpbmZvLnRhcmdldF0g5a2Q5qih5p2/55qE55uu5qCH6IqC54K5XG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gW2luZm8uZXNjYXBlXSDmmK/lkKbovazkuYnlrZfnrKbkuLLlrZDmqKHmnb9cbiAgICogQHBhcmFtIHtTdHJpbmd9IFtpbmZvLnBhdGhdIOaMh+WumuWtkOaooeadv+S4reWPmOmHj+WcqOaVsOaNruS4reeahOS9nOeUqOWfn1xuICAgKi9cbiwgc2V0UGFydGlhbDogZnVuY3Rpb24ocGFydGlhbEluZm8pIHtcbiAgICBpZighcGFydGlhbEluZm8peyByZXR1cm47IH1cbiAgICBcbiAgICBwYXJ0aWFsSW5mbyA9IGV4dGVuZCh7fSwgdGhpcy5wYXJ0aWFsc1twYXJ0aWFsSW5mby5uYW1lXSwgcGFydGlhbEluZm8pO1xuICAgIFxuICAgIHZhciBlbHMsIF9lbHMsIHZtXG4gICAgICAsIG5hbWUgPSBwYXJ0aWFsSW5mby5uYW1lXG4gICAgICAsIHRhcmdldCA9IHBhcnRpYWxJbmZvLnRhcmdldFxuICAgICAgLCBwYXJ0aWFsID0gcGFydGlhbEluZm8uY29udGVudFxuICAgICAgLCBwYXRoID0gcGFydGlhbEluZm8ucGF0aCB8fCAnJ1xuICAgICAgO1xuICAgIGlmKG5hbWUpe1xuICAgICAgdGhpcy5wYXJ0aWFsc1tuYW1lXSA9IHBhcnRpYWxJbmZvO1xuICAgIH1cbiAgICBpZihwYXJ0aWFsKSB7XG4gICAgICB2bSA9IHRoaXMuX3ZtLiRnZXRWTShwYXRoKTtcbiAgICAgIFxuICAgICAgaWYodHlwZW9mIHBhcnRpYWwgPT09ICdzdHJpbmcnKXtcbiAgICAgICAgaWYocGFydGlhbEluZm8uZXNjYXBlKXtcbiAgICAgICAgICBlbHMgPSBbZG9jLmNyZWF0ZVRleHROb2RlKHBhcnRpYWwpXTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgX2VscyA9IHRwbFBhcnNlKHBhcnRpYWwsICdkaXYnKS5lbC5jaGlsZE5vZGVzO1xuICAgICAgICAgIGVscyA9IFtdO1xuICAgICAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSBfZWxzLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICAgICAgICBlbHMucHVzaChfZWxzW2ldKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1lbHNle1xuICAgICAgICBlbHMgPSBbKHBhcnRpYWwgaW5zdGFuY2VvZiBBbnQpID8gcGFydGlhbC5lbCA6IHBhcnRpYWxdO1xuICAgICAgfVxuICAgICAgXG4gICAgICBpZih0YXJnZXQpe1xuICAgICAgICBmb3IodmFyIGkgPSAwLCBsID0gZWxzLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICAgICAgaXNGdW5jdGlvbih0YXJnZXQpID8gXG4gICAgICAgICAgICB0YXJnZXQuY2FsbCh0aGlzLCBlbHNbaV0pIDpcbiAgICAgICAgICAgIHRhcmdldC5hcHBlbmRDaGlsZChlbHNbaV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBcbiAgICAgIHZtLiRidWlsZChlbHMsIHBhcnRpYWxJbmZvLmNvbnRleHQgJiYgcGFydGlhbEluZm8uY29udGV4dC5hc3NpZ25tZW50KVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4sIHdhdGNoOiBmdW5jdGlvbihrZXlQYXRoLCBjYWxsYmFjaykge1xuICAgIGlmKGNhbGxiYWNrKXtcbiAgICAgIGFkZFdhdGNoZXIodGhpcy5fdm0sIHtwYXRoOiBrZXlQYXRoLCB1cGRhdGU6IGNhbGxiYWNrfSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG4sIHVud2F0Y2g6IGZ1bmN0aW9uKGtleVBhdGgsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHZtID0gdGhpcy5fdm0uJGdldFZNKGtleVBhdGgsIHtzdHJpY3Q6IHRydWV9KTtcbiAgICBpZih2bSl7XG4gICAgICBmb3IodmFyIGkgPSB2bS4kd2F0Y2hlcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pe1xuICAgICAgICBpZih2bS4kd2F0Y2hlcnNbaV0udG9rZW4udXBkYXRlID09PSBjYWxsYmFjayl7XG4gICAgICAgICAgdm0uJHdhdGNoZXJzLnNwbGljZShpLCAxKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxufSk7XG5cbi8qKlxuICog5pu05paw5qih5p2/LiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIOimgeabtOaWsOeahOaVsOaNri4g5aKe6YeP5pWw5o2u5oiW5YWo5paw55qE5pWw5o2uLlxuICogQHBhcmFtIHtTdHJpbmd9IFtrZXlQYXRoXSDpnIDopoHmm7TmlrDnmoTmlbDmja7ot6/lvoQuXG4gKiBAcGFyYW0ge0FueVR5cGV8T2JqZWN0fSBbZGF0YV0g6ZyA6KaB5pu05paw55qE5pWw5o2uLiDnnIHnlaXnmoTor53lsIbkvb/nlKjnjrDmnInnmoTmlbDmja4uXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtpc0V4dGVuZF0g55WM6Z2i5pu05paw57G75Z6LLlxuICAgICAgICAgIOS4uiB0cnVlIOaXtiwg5piv5omp5bGV5byP5pu05pawLCDljp/mnInnmoTmlbDmja7kuI3lj5hcbiAgICAgICAgICDkuLogZmFsc2Ug5pe2LCDkuLrmm7/mjaLmm7TmlrAsIOS4jeWcqCBkYXRhIOS4reeahOWPmOmHjywg5bCG5ZyoIERPTSDkuK3ooqvmuIXnqbouXG4gKi9cbmZ1bmN0aW9uIHVwZGF0ZSAoa2V5UGF0aCwgZGF0YSwgaXNFeHRlbmQsIGlzQnViYmxlKSB7XG4gIHZhciBhdHRycywgdm0gPSB0aGlzLl92bTtcbiAgaWYoaXNPYmplY3Qoa2V5UGF0aCkpe1xuICAgIGlzQnViYmxlID0gaXNFeHRlbmQ7XG4gICAgaXNFeHRlbmQgPSBkYXRhO1xuICAgIGF0dHJzID0gZGF0YSA9IGtleVBhdGg7XG4gIH1lbHNlIGlmKHR5cGVvZiBrZXlQYXRoID09PSAnc3RyaW5nJyl7XG4gICAga2V5UGF0aCA9IHBhcnNlS2V5UGF0aChrZXlQYXRoKS5qb2luKCcuJyk7XG4gICAgaWYoaXNVbmRlZmluZWQoZGF0YSkpe1xuICAgICAgZGF0YSA9IHRoaXMuZ2V0KGtleVBhdGgpO1xuICAgIH1cbiAgICBhdHRycyA9IGRlZXBTZXQoa2V5UGF0aCwgZGF0YSwge30pO1xuICAgIHZtID0gdm0uJGdldFZNKGtleVBhdGgpO1xuICB9ZWxzZXtcbiAgICBkYXRhID0gdGhpcy5kYXRhO1xuICB9XG4gIFxuICBpZihpc1VuZGVmaW5lZChpc0V4dGVuZCkpeyBpc0V4dGVuZCA9IGlzT2JqZWN0KGtleVBhdGgpOyB9XG4gIHZtLiR1cGRhdGUoZGF0YSwgaXNFeHRlbmQsIGlzQnViYmxlICE9PSBmYWxzZSk7XG4gIHJldHVybiB0aGlzO1xufVxuXG5mdW5jdGlvbiBidWlsZFZpZXdNb2RlbCgpIHtcbiAgdmFyIHZtID0gbmV3IFZpZXdNb2RlbCh7XG4gICAgJGFudDogdGhpc1xuICB9KTtcbiAgXG4gIHRoaXMuX3ZtID0gdm07XG4gIHZtLiRidWlsZCh0aGlzLmVsKTtcbn1cblxudmFyIE5PREVUWVBFID0ge1xuICBBVFRSOiAyXG4sIFRFWFQ6IDNcbiwgQ09NTUVOVDogOFxuLCBGUkFHTUVOVDogMTFcbn07XG5cbi8v6YGN5Y6G5YWD57Sg5Y+K5YW25a2Q5YWD57Sg55qE5omA5pyJ5bGe5oCn6IqC54K55Y+K5paH5pys6IqC54K5XG5mdW5jdGlvbiB0cmF2ZWxFbChlbCwgdm0sIGFzc2lnbm1lbnQpIHtcbiAgYXNzaWdubWVudCA9IGNyZWF0ZShhc3NpZ25tZW50IHx8IHt9KTtcbiAgXG4gIGlmKGVsLm5vZGVUeXBlID09PSBOT0RFVFlQRS5GUkFHTUVOVCkge1xuICAgIGVsID0gZWwuY2hpbGROb2RlcztcbiAgfVxuICBcbiAgaWYoKCdsZW5ndGgnIGluIGVsKSAmJiBpc1VuZGVmaW5lZChlbC5ub2RlVHlwZSkpe1xuICAgIC8vbm9kZSBsaXN0XG4gICAgLy/lr7nkuo4gbm9kZWxpc3Qg5aaC5p6c5YW25Lit5pyJ5YyF5ZCrIHt7dGV4dH19IOebtOaOpemHj+eahOihqOi+vuW8jywg5paH5pys6IqC54K55Lya6KKr5YiG5YmyLCDlhbboioLngrnmlbDph4/lj6/og73kvJrliqjmgIHlop7liqBcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgZWwubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRyYXZlbEVsKGVsW2ldLCB2bSwgYXNzaWdubWVudCk7XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuICBcbiAgaWYoZWwubm9kZVR5cGUgPT09IE5PREVUWVBFLkNPTU1FTlQpe1xuICAgIC8v5rOo6YeK6IqC54K5XG4gICAgcmV0dXJuO1xuICB9ZWxzZSBpZihlbC5ub2RlVHlwZSA9PT0gTk9ERVRZUEUuVEVYVCl7XG4gICAgLy/mlofmnKzoioLngrlcbiAgICBjaGVja1RleHQoZWwsIHZtLCBhc3NpZ25tZW50KTtcbiAgICByZXR1cm47XG4gIH1cbiAgXG4gIGlmKGNoZWNrQXR0cihlbCwgdm0sIGFzc2lnbm1lbnQpKXtcbiAgICByZXR1cm47XG4gIH1cbiAgXG4gIC8vdGVtcGxhdGVcbiAgaWYoZWwuY29udGVudCkge1xuICAgIHRyYXZlbEVsKGVsLmNvbnRlbnQsIHZtLCBhc3NpZ25tZW50KTtcbiAgICBlbC5wYXJlbnROb2RlICYmIGVsLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKGVsLmNvbnRlbnQsIGVsKTtcbiAgICByZXR1cm47XG4gIH1cbiAgXG4gIGZvcih2YXIgY2hpbGQgPSBlbC5maXJzdENoaWxkLCBuZXh0OyBjaGlsZDsgKXtcbiAgICBuZXh0ID0gY2hpbGQubmV4dFNpYmxpbmc7XG4gICAgdHJhdmVsRWwoY2hpbGQsIHZtLCBhc3NpZ25tZW50KTtcbiAgICBjaGlsZCA9IG5leHQ7XG4gIH1cbn1cblxuLy/pgY3ljoblsZ7mgKdcbmZ1bmN0aW9uIGNoZWNrQXR0cihlbCwgdm0sIGFzc2lnbm1lbnQpIHtcbiAgdmFyIHByZWZpeCA9IEFudC5wcmVmaXhcbiAgICAsIGRpcnMgPSBBbnQuZGlyZWN0aXZlLmdldERpcihlbCwgQW50LmRpcmVjdGl2ZXMsIHByZWZpeClcbiAgICAsIGRpclxuICAgICwgdGVybWluYWxQcmlvcml0eSwgdGVybWluYWxcbiAgICA7XG4gIFxuICBmb3IgKHZhciBpID0gMCwgbCA9IGRpcnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgZGlyID0gZGlyc1tpXTtcbiAgICBkaXIuYXNzaWdubWVudCA9IGFzc2lnbm1lbnQ7XG4gICBcbiAgICAvL+WvueS6jiB0ZXJtaW5hbCDkuLogdHJ1ZSDnmoQgZGlyZWN0aXZlLCDlnKjop6PmnpDlrozlhbbnm7jlkIzmnYPph43nmoQgZGlyZWN0aXZlIOWQjuS4reaWremBjeWOhuivpeWFg+e0oFxuICAgIGlmKHRlcm1pbmFsUHJpb3JpdHkgPiBkaXIucHJpb3JpdHkpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBcbiAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoZGlyLm5vZGVOYW1lKTtcbiAgICBcbiAgICBzZXRCaW5kaW5nKHZtLCBkaXIpO1xuICAgXG4gICAgaWYoZGlyLnRlcm1pbmFsKSB7XG4gICAgICB0ZXJtaW5hbCA9IHRydWU7XG4gICAgICB0ZXJtaW5hbFByaW9yaXR5ID0gZGlyLnByaW9yaXR5O1xuICAgIH1cbiAgfVxuICBcbiAgaWYodGVybWluYWwpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufVxuXG52YXIgcGFydGlhbFJlZyA9IC9ePlxccyooPz0uKykvO1xuLy/lpITnkIbmlofmnKzoioLngrnkuK3nmoTnu5HlrprljaDkvY3nrKYoe3suLi59fSlcbmZ1bmN0aW9uIGNoZWNrVGV4dChub2RlLCB2bSwgYXNzaWdubWVudCkge1xuICBpZih0b2tlbi5oYXNUb2tlbihub2RlLm5vZGVWYWx1ZSkpIHtcbiAgICB2YXIgdG9rZW5zID0gdG9rZW4ucGFyc2VUb2tlbihub2RlLm5vZGVWYWx1ZSlcbiAgICAgICwgdGV4dE1hcCA9IHRva2Vucy50ZXh0TWFwXG4gICAgICAsIGVsID0gbm9kZS5wYXJlbnROb2RlXG4gICAgICBcbiAgICAgICwgdCwgZGlyXG4gICAgICA7XG4gICAgXG4gICAgLy/lsIZ7e2tleX195YiG5Ymy5oiQ5Y2V54us55qE5paH5pys6IqC54K5XG4gICAgaWYodGV4dE1hcC5sZW5ndGggPiAxKSB7XG4gICAgICB0ZXh0TWFwLmZvckVhY2goZnVuY3Rpb24odGV4dCkge1xuICAgICAgICB2YXIgdG4gPSBkb2MuY3JlYXRlVGV4dE5vZGUodGV4dCk7XG4gICAgICAgIGVsLmluc2VydEJlZm9yZSh0biwgbm9kZSk7XG4gICAgICAgIGNoZWNrVGV4dCh0biwgdm0sIGFzc2lnbm1lbnQpO1xuICAgICAgfSk7XG4gICAgICBlbC5yZW1vdmVDaGlsZChub2RlKTtcbiAgICB9ZWxzZXtcbiAgICAgIHQgPSB0b2tlbnNbMF07XG4gICAgICAvL+WGhee9ruWQhOWNoOS9jeespuWkhOeQhi4gXG4gICAgICAvL+WumuS5ieaWsOeahOWPguaVsCwg5bCG5YW25pS+5YiwIGRpcmVjdGl2ZSDkuK3lpITnkIY/XG4gICAgICBpZihwYXJ0aWFsUmVnLnRlc3QodC5wYXRoKSkge1xuICAgICAgICB0LnBhdGggPSB0LnBhdGgucmVwbGFjZShwYXJ0aWFsUmVnLCAnJyk7XG4gICAgICAgIGRpciA9IGNyZWF0ZShBbnQuZGlyZWN0aXZlcy5wYXJ0aWFsKTtcbiAgICAgIH1lbHNle1xuICAgICAgICBkaXIgPSBjcmVhdGUodC5lc2NhcGUgPyBBbnQuZGlyZWN0aXZlcy50ZXh0IDogQW50LmRpcmVjdGl2ZXMuaHRtbCk7XG4gICAgICB9XG4gICAgICBzZXRCaW5kaW5nKHZtLCBleHRlbmQoZGlyLCB0LCB7XG4gICAgICAgIGVsOiBub2RlXG4gICAgICAsIGFzc2lnbm1lbnQ6IGFzc2lnbm1lbnRcbiAgICAgIH0pKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gc2V0QmluZGluZyh2bSwgZGlyKSB7XG4gIGlmKGRpci5yZXBsYWNlKSB7XG4gICAgdmFyIGVsID0gZGlyLmVsO1xuICAgIGlmKGlzRnVuY3Rpb24oZGlyLnJlcGxhY2UpKSB7XG4gICAgICBkaXIubm9kZSA9IGRpci5yZXBsYWNlKCk7XG4gICAgfWVsc2UgaWYoZGlyLnJlcGxhY2Upe1xuICAgICAgLy9kaXIubm9kZSA9IGRvYy5jcmVhdGVDb21tZW50KGRpci50eXBlICsgJyA9ICcgKyBkaXIucGF0aCk7XG4gICAgICBkaXIubm9kZSA9IGRvYy5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgfVxuICAgIFxuICAgIGRpci5lbCA9IGRpci5lbC5wYXJlbnROb2RlO1xuICAgIGRpci5lbC5yZXBsYWNlQ2hpbGQoZGlyLm5vZGUsIGVsKTtcbiAgfVxuICBcbiAgZGlyLmxpbmsodm0pO1xuICBcbiAgaWYoZGlyLmRpcnMpIHtcbiAgICBkaXIuZGlycy5mb3JFYWNoKGZ1bmN0aW9uKGQpIHtcbiAgICAgIGFkZFdhdGNoZXIodm0sIGV4dGVuZChjcmVhdGUoZGlyKSwgZCkpO1xuICAgIH0pO1xuICB9ZWxzZXtcbiAgICBhZGRXYXRjaGVyKHZtLCBkaXIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGFkZFdhdGNoZXIodm0sIGRpcikge1xuICBpZihkaXIucGF0aCkge1xuICAgIHJldHVybiBuZXcgV2F0Y2hlcih2bSwgZGlyKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBleFBhcnNlKHBhdGgpIHtcbiAgdmFyIHRoYXQgPSB0aGlzO1xuICB2YXIgYXN0ID0gcGFyc2UocGF0aCwgdGhpcy50b2tlbi50eXBlKTtcbiAgdmFyIHN1bW1hcnkgPSBldmFsdWF0ZS5zdW1tYXJ5KGFzdCk7XG4gICAgXG4gIGV4dGVuZCh0aGlzLnRva2VuLCBzdW1tYXJ5KTtcbiAgZXh0ZW5kKHRoaXMsIHN1bW1hcnkpO1xuICB0aGlzLmFzdCA9IGFzdDtcbn07XG5cbmZ1bmN0aW9uIFdhdGNoZXIocmVsYXRpdmVWbSwgdG9rZW4pIHtcbiAgdmFyIGFzcyA9IHRva2VuLmFzc2lnbm1lbnQ7XG4gIFxuICB0aGlzLnRva2VuID0gdG9rZW47XG4gIHRoaXMucmVsYXRpdmVWbSA9IHJlbGF0aXZlVm07XG4gIHRoaXMuYW50ID0gcmVsYXRpdmVWbS4kcm9vdC4kYW50O1xuICBcbiAgdGhpcy52YWwgPSBOYU47XG4gIFxuICB0aGlzLnN0YXRlID0gV2F0Y2hlci5TVEFURV9SRUFEWTtcbiAgXG4gIGV4UGFyc2UuY2FsbCh0aGlzLCB0b2tlbi5wYXRoKTtcbiAgXG4gIHJlbGF0aXZlVm0uJCRzUGF0aHMgPSByZWxhdGl2ZVZtLiQkc1BhdGhzIHx8IFtdO1xuICBcbiAgZm9yKHZhciBpID0gMCwgbCA9IHRoaXMucGF0aHMubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICByZWxhdGl2ZVZtLiRnZXRWTSh0aGlzLnBhdGhzW2ldLCB7YXNzaWdubWVudDogYXNzLCBzUGF0aHM6IHJlbGF0aXZlVm0uJCRzUGF0aHN9KS4kd2F0Y2hlcnMucHVzaCh0aGlzKTtcbiAgfVxuICBcbiAgLy/msqHmnInlj5jph4/nmoTooajovr7lvI9cbiAgaWYoIXRoaXMubG9jYWxzLmxlbmd0aCkge1xuICAgIHRoaXMuZm4oKTtcbiAgfVxufVxuXG5leHRlbmQoV2F0Y2hlciwge1xuICBTVEFURV9SRUFEWTogMFxuLCBTVEFURV9DQUxMRUQ6IDFcbn0sIENsYXNzKTtcblxuZnVuY3Rpb24gd2F0Y2hlclVwZGF0ZSAodmFsKSB7XG4gIHRyeXtcbiAgICB0aGlzLnRva2VuLnVwZGF0ZSh2YWwsIHRoaXMudmFsKTtcbiAgICB0aGlzLnZhbCA9IHZhbDtcbiAgfWNhdGNoKGUpe1xuICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gIH1cbn1cblxuZXh0ZW5kKFdhdGNoZXIucHJvdG90eXBlLCB7XG4gIGZuOiBmdW5jdGlvbigpIHtcbiAgICB2YXIga2V5XG4gICAgICAsIHRoYXQgPSB0aGlzXG4gICAgICAsIGRpciA9IHRoaXMudG9rZW5cbiAgICAgICwgbmV3VmFsXG4gICAgICAsIHZhbHMgPSB7fVxuICAgICAgO1xuICAgICAgXG4gICAgZm9yKHZhciBpID0gMCwgbCA9IHRoaXMubG9jYWxzLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICBrZXkgPSB0aGlzLmxvY2Fsc1tpXTtcbiAgICAgIHZhbHNba2V5XSA9IHRoaXMucmVsYXRpdmVWbS4kZ2V0Vk0oa2V5LCB7YXNzaWdubWVudDogZGlyLmFzc2lnbm1lbnR9KS4kZ2V0RGF0YSgpO1xuICAgICAgXG4gICAgICBpZihkaXIuYXNzaWdubWVudCAmJiBkaXIuYXNzaWdubWVudFtrZXldICYmIHRoaXMucGF0aHMuaW5kZXhPZihrZXkgKyAnLiRpbmRleCcpID49IDApIHtcbiAgICAgICAgdmFsc1trZXldID0gZXh0ZW5kKHsnJGluZGV4JzogZGlyLmFzc2lnbm1lbnRba2V5XVsnJGtleSddICogMX0sIHZhbHNba2V5XSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICBuZXdWYWwgPSB0aGlzLmdldFZhbHVlKHZhbHMpO1xuICAgIFxuICAgIGlmKG5ld1ZhbCAmJiBuZXdWYWwudGhlbikge1xuICAgICAgLy9hIHByb21pc2VcbiAgICAgIG5ld1ZhbC50aGVuKGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICB3YXRjaGVyVXBkYXRlLmNhbGwodGhhdCwgdmFsKTtcbiAgICAgIH0pO1xuICAgIH1lbHNle1xuICAgICAgd2F0Y2hlclVwZGF0ZS5jYWxsKHRoaXMsIG5ld1ZhbCk7XG4gICAgfVxuXG4gICAgdGhpcy5zdGF0ZSA9IFdhdGNoZXIuU1RBVEVfQ0FMTEVEO1xuICB9XG4sIGdldFZhbHVlOiBmdW5jdGlvbih2YWxzKSB7XG4gICAgdmFyIGRpciA9IHRoaXMudG9rZW5cbiAgICAgICwgdmFsXG4gICAgICAsIGZpbHRlcnMgPSBleHRlbmQoe30sIHRoaXMuYW50LmZpbHRlcnMsIGZ1bmN0aW9uKGEsIGIpIHsgIHJldHVybiBiLmJpbmQoZGlyKTsgfSlcbiAgICAgIDtcbiAgICBcbiAgICB0cnl7XG4gICAgICB2YWwgPSBldmFsdWF0ZS5ldmFsKHRoaXMuYXN0LCB7bG9jYWxzOiB2YWxzLCBmaWx0ZXJzOiBmaWx0ZXJzfSk7XG4gICAgfWNhdGNoKGUpe1xuICAgICAgdmFsID0gJyc7XG4gICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgIH1cbiAgICByZXR1cm4gdmFsO1xuICB9XG59KTtcblxuZnVuY3Rpb24gVmlld01vZGVsKG9wdHMpIHtcbiAgZXh0ZW5kKHRoaXMsIHtcbiAgICAka2V5OiAnJ1xuICAsICRyb290OiB0aGlzXG4gICwgJHdhdGNoZXJzOiBbXVxuICB9LCBvcHRzKTtcbn1cblxuVmlld01vZGVsLnByb3RvdHlwZSA9IHtcbiAgJHJvb3Q6IG51bGxcbiwgJHBhcmVudDogbnVsbFxuXG4sICQkc1BhdGhzOiBudWxsXG4sICRhbnQ6IG51bGxcbiwgJGtleTogbnVsbFxuXG4sICR3YXRjaGVyczogbnVsbFxuXG4sICRpbmRleDogbnVsbFxuLCAkdmFsdWU6IE5hTlxuICBcbi8v6I635Y+WIHZtIOS4jeWtmOWcqOeahOivneWwhuaWsOW7uuS4gOS4qi5cbi8vb3B0cy5zdHJpY3QgIOS4jeiHquWKqOaWsOW7uiB2bVxuLy9vcHRzLnNjb3BlXG4sICRnZXRWTTogZnVuY3Rpb24ocGF0aCwgb3B0cykge1xuICAgIHBhdGggPSBwYXRoICsgJyc7XG4gICAgb3B0cyA9IG9wdHMgfHwge307XG4gICAgXG4gICAgdmFyIGtleVxuICAgICAgLCBjdXIgPSBvcHRzLnNjb3BlIHx8IHRoaXMuJHJvb3RcbiAgICAgICwgYXNzaWdubWVudCA9IG9wdHMuYXNzaWdubWVudCB8fCB7fVxuICAgICAgLCBrZXlDaGFpbiA9IHV0aWxzLnBhcnNlS2V5UGF0aChwYXRoKVxuICAgICAgLCBzUGF0aHMgPSBvcHRzLnNQYXRocyB8fCBbXVxuICAgICAgLCB1cGRhdGUsIHNoaWZ0U2NvcGVcbiAgICAgIDtcbiAgICBcbiAgICBmb3IodmFyIGtleSBpbiBhc3NpZ25tZW50KSB7XG4gICAgICBzaGlmdFNjb3BlID0gdHJ1ZTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICAgIFxuICAgIGlmKGtleUNoYWluWzBdIGluIGFzc2lnbm1lbnQpIHtcbiAgICAgIGN1ciA9IGFzc2lnbm1lbnRba2V5Q2hhaW5bMF1dO1xuICAgICAga2V5Q2hhaW4uc2hpZnQoKTtcbiAgICAgIGlmKGN1ciAhPT0gdGhpcykge1xuICAgICAgICB1cGRhdGUgPSB0cnVlO1xuICAgICAgfVxuICAgIH1lbHNle1xuICAgICAgdXBkYXRlID0gc2hpZnRTY29wZTtcbiAgICB9XG4gICAgaWYocGF0aCl7XG4gICAgICBmb3IodmFyIGkgPSAwLCBsID0ga2V5Q2hhaW4ubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgICAga2V5ID0ga2V5Q2hhaW5baV07XG4gICAgICAgIFxuICAgICAgICBpZighY3VyW2tleV0pe1xuICAgICAgICAgIGlmKG9wdHMuc3RyaWN0KXsgcmV0dXJuIG51bGw7IH1cbiAgICAgICAgICBjdXJba2V5XSA9IG5ldyBWaWV3TW9kZWwoe1xuICAgICAgICAgICAgJHBhcmVudDogY3VyXG4gICAgICAgICAgLCAkcm9vdDogY3VyLiRyb290XG4gICAgICAgICAgLCAka2V5OiBrZXlcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY3VyID0gY3VyW2tleV07XG4gICAgICB9XG4gICAgfVxuICAgIGlmKHVwZGF0ZSkge1xuICAgICAgc1BhdGhzLnB1c2goY3VyLiRnZXRLZXlQYXRoKCkpO1xuICAgIH1cbiAgICByZXR1cm4gY3VyO1xuICB9XG4gIFxuLCAkZ2V0S2V5UGF0aDogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGtleVBhdGggPSB0aGlzLiRrZXlcbiAgICAgICwgY3VyID0gdGhpc1xuICAgICAgO1xuICAgIHdoaWxlKGN1ciA9IGN1ci4kcGFyZW50KXtcbiAgICAgIGlmKGN1ci4ka2V5KXtcbiAgICAgICAga2V5UGF0aCA9IGN1ci4ka2V5ICsgJy4nICsga2V5UGF0aDtcbiAgICAgIH1lbHNle1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGtleVBhdGg7XG4gIH1cblxuLCAkZ2V0RGF0YTogZnVuY3Rpb24oa2V5KSB7XG4gICAgdmFyIGN1clZhbCA9IGRlZXBHZXQoa2V5LCB0aGlzLiRyb290LiRhbnQuZ2V0KHRoaXMuJGdldEtleVBhdGgoKSkpO1xuICAgIHJldHVybiBjdXJWYWw7XG4gIH1cblxuLCAkdXBkYXRlOiBmdW5jdGlvbiAoZGF0YSwgaXNFeHRlbmQsIGlzQnViYmxlKSB7XG4gICAgdmFyIG1hcCA9IGlzRXh0ZW5kID8gZGF0YSA6IHRoaXNcbiAgICAgICwgcGFyZW50ID0gdGhpc1xuICAgICAgO1xuICAgIFxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSB0aGlzLiR3YXRjaGVycy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgaWYoKHRoaXMuJHZhbHVlICE9PSBkYXRhKSB8fCB0aGlzLiR3YXRjaGVyc1tpXS5zdGF0ZSA9PT0gV2F0Y2hlci5TVEFURV9SRUFEWSl7XG4gICAgICAgIHRoaXMuJHdhdGNoZXJzW2ldLmZuKCk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuJHZhbHVlID0gZGF0YTtcbiAgICBcbiAgICBpZihpc09iamVjdChtYXApKXtcbiAgICAgIGZvcih2YXIgcGF0aCBpbiBtYXApIHtcbiAgICAgICAgLy/kvKDlhaXnmoTmlbDmja7plK7lgLzkuI3og73lkowgdm0g5Lit55qE6Ieq5bim5bGe5oCn5ZCN55u45ZCMLlxuICAgICAgICAvL+aJgOS7peS4jeaOqOiNkOS9v+eUqCAnJCcg5L2c5Li6IEpTT04g5pWw5o2u6ZSu5YC855qE5byA5aS0LlxuICAgICAgICBpZih0aGlzLmhhc093blByb3BlcnR5KHBhdGgpICYmICghKHBhdGggaW4gVmlld01vZGVsLnByb3RvdHlwZSkpKXtcbiAgICAgICAgICB0aGlzW3BhdGhdLiR1cGRhdGUoZGF0YSA/IGRhdGFbcGF0aF0gOiB2b2lkKDApLCBpc0V4dGVuZCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZihpc0J1YmJsZSl7XG4gICAgICB3aGlsZShwYXJlbnQgPSBwYXJlbnQuJHBhcmVudCl7XG4gICAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSBwYXJlbnQuJHdhdGNoZXJzLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICAgICAgcGFyZW50LiR3YXRjaGVyc1tpXS5mbigpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4sICRidWlsZDogZnVuY3Rpb24oZWwsIGFzc2lnbm1lbnQpIHtcbiAgICB0cmF2ZWxFbChlbCwgdGhpcywgYXNzaWdubWVudCk7XG4gICAgdmFyIGFudCA9IHRoaXMuJHJvb3QuJGFudDtcbiAgICBcbiAgICAvL+aWsOWKoOWFpeaooeadv+WQjuabtOaWsFxuICAgIHRoaXMuJHVwZGF0ZShhbnQuZ2V0KHRoaXMuJGdldEtleVBhdGgoKSksIHRydWUpO1xuICAgIFxuICAgIC8v5byV55So54i257qn5L2c55So5Z+f5Y+Y6YeP5pe2LCDoh6rliqjov5DnrpdcbiAgICBpZih0aGlzLiQkc1BhdGhzKSB7XG4gICAgICBmb3IodmFyIGkgPSAwLCBsID0gdGhpcy4kJHNQYXRocy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdGhpcy4kZ2V0Vk0odGhpcy4kJHNQYXRoc1tpXSkuJHVwZGF0ZShhbnQuZ2V0KHRoaXMuJCRzUGF0aHNbaV0pLCB0cnVlKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuJCRzUGF0aHMgPSBudWxsO1xuICAgIH1cbiAgfVxufTtcblxuQW50LnZlcnNpb24gPSAnJVZFUlNJT04nO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFudDtcbiIsInZhciBleHRlbmQgPSByZXF1aXJlKCcuL3V0aWxzLmpzJykuZXh0ZW5kO1xuXG52YXIgQ2xhc3MgPSB7XG4gIC8qKiBcbiAgICog5p6E6YCg5Ye95pWw57un5om/LiBcbiAgICog5aaCOiBgdmFyIENhciA9IEFudC5leHRlbmQoe2RyaXZlOiBmdW5jdGlvbigpe319KTsgbmV3IENhcigpO2BcbiAgICogQHBhcmFtIHtPYmplY3R9IFtwcm90b1Byb3BzXSDlrZDmnoTpgKDlh73mlbDnmoTmianlsZXljp/lnovlr7nosaFcbiAgICogQHBhcmFtIHtPYmplY3R9IFtzdGF0aWNQcm9wc10g5a2Q5p6E6YCg5Ye95pWw55qE5omp5bGV6Z2Z5oCB5bGe5oCnXG4gICAqIEByZXR1cm4ge0Z1bmN0aW9ufSDlrZDmnoTpgKDlh73mlbBcbiAgICovXG4gIGV4dGVuZDogZnVuY3Rpb24gKHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7XG4gICAgcHJvdG9Qcm9wcyA9IHByb3RvUHJvcHMgfHwge307XG4gICAgdmFyIGNvbnN0cnVjdG9yID0gcHJvdG9Qcm9wcy5oYXNPd25Qcm9wZXJ0eSgnY29uc3RydWN0b3InKSA/IHByb3RvUHJvcHMuY29uc3RydWN0b3IgOiBmdW5jdGlvbigpeyByZXR1cm4gc3VwLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7IH1cbiAgICB2YXIgc3VwID0gdGhpcztcbiAgICB2YXIgRm4gPSBmdW5jdGlvbigpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGNvbnN0cnVjdG9yOyB9O1xuICAgIFxuICAgIEZuLnByb3RvdHlwZSA9IHN1cC5wcm90b3R5cGU7XG4gICAgY29uc3RydWN0b3IucHJvdG90eXBlID0gbmV3IEZuKCk7XG4gICAgZXh0ZW5kKGNvbnN0cnVjdG9yLnByb3RvdHlwZSwgcHJvdG9Qcm9wcyk7XG4gICAgZXh0ZW5kKGNvbnN0cnVjdG9yLCBzdXAsIHN0YXRpY1Byb3BzLCB7X19zdXBlcl9fOiBzdXAucHJvdG90eXBlfSk7XG4gICAgXG4gICAgcmV0dXJuIGNvbnN0cnVjdG9yO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENsYXNzOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJylcbiAgLCB0b2tlbiA9IHJlcXVpcmUoJy4vdG9rZW4uanMnKVxuICAsIGRvYyA9IHJlcXVpcmUoJy4vZG9jdW1lbnQuanMnKVxuICA7XG5cbi8qKlxuICog5Li6IEFudCDmnoTpgKDlh73mlbDmt7vliqDmjIfku6QgKGRpcmVjdGl2ZSkuIGBBbnQuZGlyZWN0aXZlYFxuICogQHBhcmFtIHtTdHJpbmd9IGtleSBkaXJlY3RpdmUg5ZCN56ewXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdHNdIGRpcmVjdGl2ZSDlj4LmlbBcbiAqIEBwYXJhbSB7TnVtYmVyfSBvcHRzLnByaW9yaXR5PTAgZGlyZWN0aXZlIOS8mOWFiOe6py4g5ZCM5LiA5Liq5YWD57Sg5LiK55qE5oyH5Luk5oyJ54Wn5LyY5YWI57qn6aG65bqP5omn6KGMLiBcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0cy50ZXJtaW5hbD1mYWxzZSDmiafooYzor6UgZGlyZWN0aXZlIOWQjiwg5piv5ZCm57uI5q2i5ZCO57utIGRpcmVjdGl2ZSDmiafooYwuXG4gKiAgIHRlcm1pbmFsIOS4uuecn+aXtiwg5LiO6K+lIGRpcmVjdGl2ZSDkvJjlhYjnuqfnm7jlkIznmoQgZGlyZWN0aXZlIOS7jeS8mue7p+e7reaJp+ihjCwg6L6D5L2O5LyY5YWI57qn55qE5omN5Lya6KKr5b+955WlLlxuICogQHBhcmFtIHtCb29sZWFufSBvcHRzLmFuY2hvciBhbmNob3Ig5Li6IHRydWUg5pe2LCDkvJrlnKjmjIfku6ToioLngrnliY3lkI7lkITkuqfnlJ/kuIDkuKrnqbrnmb3nmoTmoIforrDoioLngrkuIOWIhuWIq+WvueW6lCBgYW5jaG9ycy5zdGFydGAg5ZKMIGBhbmNob3JzLmVuZGBcbiAqL1xuZnVuY3Rpb24gZGlyZWN0aXZlKGtleSwgb3B0cykge1xuICB2YXIgZGlycyA9IHRoaXMuZGlyZWN0aXZlcyA9IHRoaXMuZGlyZWN0aXZlcyB8fCB7fTtcbiAgXG4gIHJldHVybiBkaXJzW2tleV0gPSBuZXcgRGlyZWN0aXZlKGtleSwgb3B0cyk7XG59XG5cbmZ1bmN0aW9uIERpcmVjdGl2ZShrZXksIG9wdHMpIHtcbiAgdGhpcy50eXBlID0ga2V5O1xuICB1dGlscy5leHRlbmQodGhpcywgb3B0cyk7XG59XG5cbkRpcmVjdGl2ZS5wcm90b3R5cGUgPSB7XG4gIHByaW9yaXR5OiAwXG4sIGxpbms6IHV0aWxzLm5vb3BcbiwgdXBkYXRlOiB1dGlscy5ub29wXG4sIHRlYXJEb3duOiB1dGlscy5ub29wXG4sIHRlcm1pbmFsOiBmYWxzZVxuLCByZXBsYWNlOiBmYWxzZVxuXG4sIGFuY2hvcjogZmFsc2VcbiwgYW5jaG9yczogbnVsbFxuXG4gIC8v5b2TIGFuY2hvciDkuLogdHJ1ZSDml7YsIOiOt+WPluS4pOS4qumUmueCueS5i+mXtOeahOaJgOacieiKgueCuS5cbiwgZ2V0Tm9kZXM6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBub2RlcyA9IFtdLCBub2RlID0gdGhpcy5hbmNob3JzLnN0YXJ0Lm5leHRTaWJsaW5nO1xuICAgIGlmKHRoaXMuYW5jaG9yICYmIG5vZGUpIHtcbiAgICAgIHdoaWxlKG5vZGUgIT09IHRoaXMuYW5jaG9ycy5lbmQpe1xuICAgICAgICBub2Rlcy5wdXNoKG5vZGUpO1xuICAgICAgICBub2RlID0gbm9kZS5uZXh0U2libGluZztcbiAgICAgIH1cbiAgICAgIFxuICAgICAgcmV0dXJuIG5vZGVzO1xuICAgIH1lbHNle1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG59O1xuXG4vL+iOt+WPluS4gOS4quWFg+e0oOS4iuaJgOacieeUqCBIVE1MIOWxnuaAp+WumuS5ieeahOaMh+S7pFxuZnVuY3Rpb24gZ2V0RGlyKGVsLCBkaXJlY3RpdmVzLCBwcmVmaXgpIHtcbiAgcHJlZml4ID0gcHJlZml4IHx8ICcnO1xuICBkaXJlY3RpdmVzID0gZGlyZWN0aXZlcyB8fCB7fTtcbiAgXG4gIHZhciBhdHRyLCBhdHRyTmFtZSwgZGlyTmFtZVxuICAgICwgZGlycyA9IFtdLCBkaXIsIGFuY2hvcnMgPSB7fVxuICAgICwgcGFyZW50ID0gZWwucGFyZW50Tm9kZVxuICAgIDtcbiAgICBcbiAgZm9yKHZhciBpID0gZWwuYXR0cmlidXRlcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSl7XG4gICAgYXR0ciA9IGVsLmF0dHJpYnV0ZXNbaV07XG4gICAgYXR0ck5hbWUgPSBhdHRyLm5vZGVOYW1lO1xuICAgIGRpck5hbWUgPSBhdHRyTmFtZS5zbGljZShwcmVmaXgubGVuZ3RoKTtcbiAgICBpZihhdHRyTmFtZS5pbmRleE9mKHByZWZpeCkgPT09IDAgJiYgKGRpck5hbWUgaW4gZGlyZWN0aXZlcykpIHtcbiAgICAgIGRpciA9IHV0aWxzLmNyZWF0ZShkaXJlY3RpdmVzW2Rpck5hbWVdKTtcbiAgICAgIGRpci5kaXJOYW1lID0gZGlyTmFtZVxuICAgIH1lbHNlIGlmKHRva2VuLmhhc1Rva2VuKGF0dHIudmFsdWUpKSB7XG4gICAgICBkaXIgPSB1dGlscy5jcmVhdGUoZGlyZWN0aXZlc1snYXR0ciddKTtcbiAgICAgIGRpci5kaXJzID0gdG9rZW4ucGFyc2VUb2tlbihhdHRyLnZhbHVlKTtcbiAgICAgIGRpci5kaXJOYW1lID0gYXR0ck5hbWUuaW5kZXhPZihwcmVmaXgpID09PSAwID8gZGlyTmFtZSA6IGF0dHJOYW1lIDtcbiAgICB9ZWxzZXtcbiAgICAgIGRpciA9IGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICBpZihkaXIpIHtcbiAgICAgIGlmKGRpci5hbmNob3IgJiYgIWFuY2hvcnMuc3RhcnQpIHtcbiAgICAgICAgLy/lkIzkuIDkuKrlhYPntKDkuIrnmoQgZGlyZWN0aXZlIOWFseS6q+WQjOS4gOWvuemUmueCuVxuICAgICAgICBhbmNob3JzLnN0YXJ0ID0gZG9jLmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICAgICAgcGFyZW50Lmluc2VydEJlZm9yZShhbmNob3JzLnN0YXJ0LCBlbCk7XG4gICAgICAgIFxuICAgICAgICBhbmNob3JzLmVuZCA9IGRvYy5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICAgIGlmKGVsLm5leHRTaWJsaW5nKSB7XG4gICAgICAgICAgcGFyZW50Lmluc2VydEJlZm9yZShhbmNob3JzLmVuZCwgZWwubmV4dFNpYmxpbmcpO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICBwYXJlbnQuYXBwZW5kQ2hpbGQoYW5jaG9ycy5lbmQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBkaXJzLnB1c2godXRpbHMuZXh0ZW5kKGRpciwge2VsOiBlbCwgbm9kZTogYXR0ciwgbm9kZU5hbWU6IGF0dHJOYW1lLCBwYXRoOiBhdHRyLnZhbHVlLCBhbmNob3JzOiBkaXIuYW5jaG9yID8gYW5jaG9ycyA6IG51bGx9KSk7XG4gICAgfVxuICB9XG4gIGRpcnMuc29ydChmdW5jdGlvbihkMCwgZDEpIHtcbiAgICByZXR1cm4gZDEucHJpb3JpdHkgLSBkMC5wcmlvcml0eTtcbiAgfSk7XG4gIHJldHVybiBkaXJzO1xufVxuXG5kaXJlY3RpdmUuZ2V0RGlyID0gZ2V0RGlyO1xuXG5leHBvcnRzLmRpcmVjdGl2ZSA9IGRpcmVjdGl2ZTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgYXR0clBvc3RSZWcgPSAvXFw/JC87XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBsaW5rOiBmdW5jdGlvbigpIHtcbiAgICBpZih0aGlzLmRpck5hbWUgPT09IHRoaXMudHlwZSkgey8vYXR0ciBiaW5kaW5nXG4gICAgICB0aGlzLmF0dHJzID0ge307XG4gICAgfWVsc2Uge1xuICAgICAgaWYoYXR0clBvc3RSZWcudGVzdCh0aGlzLmRpck5hbWUpKSB7Ly8gc29tZUF0dHI/IGNvbmRpdGlvbiBiaW5kaW5nXG4gICAgICAgIHRoaXMuZGlyTmFtZSA9IHRoaXMuZGlyTmFtZS5yZXBsYWNlKGF0dHJQb3N0UmVnLCAnJyk7XG4gICAgICAgIHRoaXMuY29uZGl0aW9uYWxBdHRyID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiwgdXBkYXRlOiBmdW5jdGlvbih2YWwpIHtcbiAgICB2YXIgZWwgPSB0aGlzLmVsO1xuICAgIGlmKHRoaXMuZGlyTmFtZSA9PT0gdGhpcy50eXBlKSB7XG4gICAgICBmb3IodmFyIGF0dHIgaW4gdmFsKSB7XG4gICAgICAgIHNldEF0dHIoZWwsIGF0dHIsIHZhbFthdHRyXSk7XG4gICAgICAgIC8vaWYodmFsW2F0dHJdKSB7XG4gICAgICAgICAgZGVsZXRlIHRoaXMuYXR0cnNbYXR0cl07XG4gICAgICAgIC8vfVxuICAgICAgfVxuICAgICAgXG4gICAgICBmb3IodmFyIGF0dHIgaW4gdGhpcy5hdHRycykge1xuICAgICAgICByZW1vdmVBdHRyKGVsLCBhdHRyKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuYXR0cnMgPSB2YWw7XG4gICAgfWVsc2V7XG4gICAgICBpZih0aGlzLmNvbmRpdGlvbmFsQXR0cikge1xuICAgICAgICB2YWwgPyBzZXRBdHRyKGVsLCB0aGlzLmRpck5hbWUsIHZhbCkgOiByZW1vdmVBdHRyKGVsLCB0aGlzLmRpck5hbWUpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIHRoaXMudGV4dE1hcFt0aGlzLnBvc2l0aW9uXSA9IHZhbCAmJiAodmFsICsgJycpO1xuICAgICAgICBzZXRBdHRyKGVsLCB0aGlzLmRpck5hbWUsIHRoaXMudGV4dE1hcC5qb2luKCcnKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG5cbi8vSUUg5rWP6KeI5Zmo5b6I5aSa5bGe5oCn6YCa6L+HIGBzZXRBdHRyaWJ1dGVgIOiuvue9ruWQjuaXoOaViC4gXG4vL+i/meS6m+mAmui/hyBgZWxbYXR0cl0gPSB2YWx1ZWAg6K6+572u55qE5bGe5oCn5Y206IO95aSf6YCa6L+HIGByZW1vdmVBdHRyaWJ1dGVgIOa4hemZpC5cbmZ1bmN0aW9uIHNldEF0dHIoZWwsIGF0dHIsIHZhbCl7XG4gIHRyeXtcbiAgICBpZigoKGF0dHIgaW4gZWwpIHx8IGF0dHIgPT09ICdjbGFzcycpKXtcbiAgICAgIGlmKGF0dHIgPT09ICdzdHlsZScgJiYgZWwuc3R5bGUuc2V0QXR0cmlidXRlKXtcbiAgICAgICAgZWwuc3R5bGUuc2V0QXR0cmlidXRlKCdjc3NUZXh0JywgdmFsKTtcbiAgICAgIH1lbHNlIGlmKGF0dHIgPT09ICdjbGFzcycpe1xuICAgICAgICBlbC5jbGFzc05hbWUgPSB2YWw7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgZWxbYXR0cl0gPSB0eXBlb2YgZWxbYXR0cl0gPT09ICdib29sZWFuJyA/IHRydWUgOiB2YWw7XG4gICAgICB9XG4gICAgfVxuICB9Y2F0Y2goZSl7fVxuICB0cnl7XG4gICAgLy9jaHJvbWUgc2V0YXR0cmlidXRlIHdpdGggYHt7fX1gIHdpbGwgdGhyb3cgYW4gZXJyb3JcbiAgICBlbC5zZXRBdHRyaWJ1dGUoYXR0ciwgdmFsKTtcbiAgfWNhdGNoKGUpeyBjb25zb2xlLndhcm4oZSkgfVxufVxuXG5mdW5jdGlvbiByZW1vdmVBdHRyKGVsLCBhdHRyKSB7XG4gIGVsLnJlbW92ZUF0dHJpYnV0ZShhdHRyKTtcbiAgZGVsZXRlIGVsW2F0dHJdO1xufSIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgZG9jID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQuanMnKVxuICAsIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKVxuICA7XG5cbnZhciBkaXJzID0ge307XG5cblxuZGlycy50ZXh0ID0ge1xuICB0ZXJtaW5hbDogdHJ1ZVxuLCByZXBsYWNlOiB0cnVlXG4sIHVwZGF0ZTogZnVuY3Rpb24odmFsKSB7XG4gICAgdGhpcy5ub2RlLm5vZGVWYWx1ZSA9IHV0aWxzLmlzVW5kZWZpbmVkKHZhbCkgPyAnJyA6IHZhbDtcbiAgfVxufTtcblxuXG5kaXJzLmh0bWwgPSB7XG4gIHRlcm1pbmFsOiB0cnVlXG4sIHJlcGxhY2U6IHRydWVcbiwgbGluazogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5ub2RlcyA9IFtdO1xuICB9XG4sIHVwZGF0ZTogZnVuY3Rpb24odmFsKSB7XG4gICAgdmFyIGVsID0gZG9jLmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGVsLmlubmVySFRNTCA9IHV0aWxzLmlzVW5kZWZpbmVkKHZhbCkgPyAnJyA6IHZhbDtcbiAgICBcbiAgICB2YXIgbm9kZTtcbiAgICB3aGlsZShub2RlID0gdGhpcy5ub2Rlcy5wb3AoKSkge1xuICAgICAgbm9kZS5wYXJlbnROb2RlICYmIG5vZGUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub2RlKTtcbiAgICB9XG4gICAgXG4gICAgdmFyIG5vZGVzID0gZWwuY2hpbGROb2RlcztcbiAgICB3aGlsZShub2RlID0gbm9kZXNbMF0pIHtcbiAgICAgIHRoaXMubm9kZXMucHVzaChub2RlKTtcbiAgICAgIHRoaXMuZWwuaW5zZXJ0QmVmb3JlKG5vZGUsIHRoaXMubm9kZSk7XG4gICAgfVxuICB9XG59O1xuXG4gIFxuZGlyc1snaWYnXSA9IHtcbiAgYW5jaG9yOiB0cnVlXG4sIGxpbms6IGZ1bmN0aW9uKCkge1xuICAgIGlmKHRoaXMuZWwuY29udGVudCkge1xuICAgICAgdGhpcy5mcmFnID0gdGhpcy5lbC5jb250ZW50O1xuICAgICAgdGhpcy5lbC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMuZWwpO1xuICAgIH1lbHNle1xuICAgICAgdGhpcy5mcmFnID0gZG9jLmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKVxuICAgICAgdGhpcy5oaWRlKCk7XG4gICAgfVxuICB9XG4sIHVwZGF0ZTogZnVuY3Rpb24odmFsKSB7XG4gICAgaWYodmFsKSB7XG4gICAgICBpZighdGhpcy5zdGF0ZSkgeyB0aGlzLnNob3coKSB9XG4gICAgfWVsc2V7XG4gICAgICBpZih0aGlzLnN0YXRlKSB7IHRoaXMuaGlkZSgpOyB9XG4gICAgfVxuICAgIHRoaXMuc3RhdGUgPSB2YWw7XG4gIH1cbiAgXG4sIHNob3c6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBhbmNob3IgPSB0aGlzLmFuY2hvcnMuZW5kO1xuICAgIFxuICAgIGFuY2hvci5wYXJlbnROb2RlICYmIGFuY2hvci5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmZyYWcsIGFuY2hvcik7XG4gIH1cbiwgaGlkZTogZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5vZGVzID0gdGhpcy5nZXROb2RlcygpO1xuICAgIFxuICAgIGlmKG5vZGVzKSB7XG4gICAgICBmb3IodmFyIGkgPSAwLCBsID0gbm9kZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHRoaXMuZnJhZy5hcHBlbmRDaGlsZChub2Rlc1tpXSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG5cbmRpcnMucGFydGlhbCA9IHtcbiAgdGVybWluYWw6IHRydWVcbiwgcmVwbGFjZTogdHJ1ZVxuLCBsaW5rOiBmdW5jdGlvbih2bSkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB2YXIgcE5hbWUsIGFudCwgb3B0cztcbiAgICBwTmFtZSA9IHRoaXMucGF0aDtcbiAgICBhbnQgPSB2bS4kcm9vdC4kYW50O1xuICAgIG9wdHMgPSBhbnQub3B0aW9ucztcbiAgICBcbiAgICB0aGlzLnBhdGggPSAnJztcbiAgICBcbiAgICBhbnQuc2V0UGFydGlhbCh7XG4gICAgICBuYW1lOiBwTmFtZVxuICAgICwgY29udGVudDogb3B0cyAmJiBvcHRzLnBhcnRpYWxzICYmIG9wdHMucGFydGlhbHNbcE5hbWVdXG4gICAgLCB0YXJnZXQ6IGZ1bmN0aW9uKGVsKSB7IHRoYXQuZWwuaW5zZXJ0QmVmb3JlKGVsLCB0aGF0Lm5vZGUpIH1cbiAgICAsIGVzY2FwZTogdGhpcy5lc2NhcGVcbiAgICAsIHBhdGg6IHZtLiRnZXRLZXlQYXRoKClcbiAgICAsIGNvbnRleHQ6IHRoaXNcbiAgICB9KTtcbiAgfVxufTtcblxuZGlycy50ZW1wbGF0ZSA9IHtcbiAgcHJpb3JpdHk6IDEwMDAwXG4sIGxpbms6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBub2RlcyA9IHRoaXMuZWwuY2hpbGROb2Rlc1xuICAgICAgLCBmcmFnID0gZG9jLmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKVxuICAgICAgO1xuXG4gICAgd2hpbGUobm9kZXNbMF0pIHtcbiAgICAgIGZyYWcuYXBwZW5kQ2hpbGQobm9kZXNbMF0pO1xuICAgIH1cbiAgICBcbiAgICB0aGlzLmVsLmNvbnRlbnQgPSBmcmFnO1xuICAgIFxuICAgIC8vdGhpcy5lbC5zZXRBdHRyaWJ1dGUodGhpcy5ub2RlTmFtZSwgJycpO1xuICB9XG59O1xuICBcbmRpcnMucmVwZWF0ID0gcmVxdWlyZSgnLi9yZXBlYXQuanMnKTtcbmRpcnMuYXR0ciA9IHJlcXVpcmUoJy4vYXR0ci5qcycpO1xuZGlycy5tb2RlbCA9IHJlcXVpcmUoJy4vbW9kZWwuanMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBkaXJzOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpXG4gICwgaGFzVG9rZW4gPSByZXF1aXJlKCcuLi90b2tlbi5qcycpLmhhc1Rva2VuXG4gIDtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHRlbWluYWw6IHRydWVcbiwgcHJpb3JpdHk6IDFcbiwgbGluazogZnVuY3Rpb24odm0pIHtcbiAgICB2YXIga2V5UGF0aCA9IHRoaXMucGF0aDtcbiAgICBcbiAgICBpZigha2V5UGF0aCkgeyByZXR1cm4gZmFsc2U7IH1cbiAgICBcbiAgICB2YXIgZWwgPSB0aGlzLmVsXG4gICAgICAsIGV2ID0gJ2NoYW5nZSdcbiAgICAgICwgYXR0ciwgdmFsdWUgPSBhdHRyID0gJ3ZhbHVlJ1xuICAgICAgLCBhbnQgPSB2bS4kcm9vdC4kYW50XG4gICAgICAsIGN1ciA9IHZtLiRnZXRWTShrZXlQYXRoLCB7YXNzaWdubWVudDogdGhpcy5hc3NpZ25tZW50fSlcbiAgICAgICwgaXNTZXREZWZhdXQgPSB1dGlscy5pc1VuZGVmaW5lZChhbnQuZ2V0KGN1ci4kZ2V0S2V5UGF0aCgpKSkvL+eVjOmdoueahOWIneWni+WAvOS4jeS8muimhuebliBtb2RlbCDnmoTliJ3lp4vlgLxcbiAgICAgICwgY3JsZiA9IC9cXHJcXG4vZy8vSUUgOCDkuIsgdGV4dGFyZWEg5Lya6Ieq5Yqo5bCGIFxcbiDmjaLooYznrKbmjaLmiJAgXFxyXFxuLiDpnIDopoHlsIblhbbmm7/mjaLlm57mnaVcbiAgICAgICwgY2FsbGJhY2sgPSBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgICAvL+aJp+ihjOi/memHjOeahOaXtuWAmSwg5b6I5Y+v6IO9IHJlbmRlciDov5jmnKrmiafooYwuIHZtLiRnZXREYXRhKGtleVBhdGgpIOacquWumuS5iSwg5LiN6IO96L+U5Zue5paw6K6+572u55qE5YC8XG4gICAgICAgICAgdmFyIG5ld1ZhbCA9ICh2YWwgfHwgdm0uJGdldERhdGEoa2V5UGF0aCkgfHwgJycpICsgJydcbiAgICAgICAgICAgICwgdmFsID0gZWxbYXR0cl1cbiAgICAgICAgICAgIDtcbiAgICAgICAgICB2YWwgJiYgdmFsLnJlcGxhY2UgJiYgKHZhbCA9IHZhbC5yZXBsYWNlKGNybGYsICdcXG4nKSk7XG4gICAgICAgICAgaWYobmV3VmFsICE9PSB2YWwpeyBlbFthdHRyXSA9IG5ld1ZhbDsgfVxuICAgICAgICB9XG4gICAgICAsIGhhbmRsZXIgPSBmdW5jdGlvbihpc0luaXQpIHtcbiAgICAgICAgICB2YXIgdmFsID0gZWxbdmFsdWVdO1xuICAgICAgICAgIFxuICAgICAgICAgIHZhbC5yZXBsYWNlICYmICh2YWwgPSB2YWwucmVwbGFjZShjcmxmLCAnXFxuJykpO1xuICAgICAgICAgIGFudC5zZXQoY3VyLiRnZXRLZXlQYXRoKCksIHZhbCwge2lzQnViYmxlOiBpc0luaXQgIT09IHRydWV9KTtcbiAgICAgICAgfVxuICAgICAgLCBjYWxsSGFuZGxlciA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICBpZihlICYmIGUucHJvcGVydHlOYW1lICYmIGUucHJvcGVydHlOYW1lICE9PSBhdHRyKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICAgICAgICB9XG4gICAgICAsIGllID0gdXRpbHMuaWVcbiAgICAgIDtcbiAgICBcbiAgICBzd2l0Y2goZWwudGFnTmFtZSkge1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdmFsdWUgPSBhdHRyID0gJ2lubmVySFRNTCc7XG4gICAgICAgIC8vZXYgKz0gJyBibHVyJztcbiAgICAgIGNhc2UgJ0lOUFVUJzpcbiAgICAgIGNhc2UgJ1RFWFRBUkVBJzpcbiAgICAgICAgc3dpdGNoKGVsLnR5cGUpIHtcbiAgICAgICAgICBjYXNlICdjaGVja2JveCc6XG4gICAgICAgICAgICB2YWx1ZSA9IGF0dHIgPSAnY2hlY2tlZCc7XG4gICAgICAgICAgICAvL0lFNiwgSUU3IOS4i+ebkeWQrCBwcm9wZXJ0eWNoYW5nZSDkvJrmjII/XG4gICAgICAgICAgICBpZihpZSkgeyBldiArPSAnIGNsaWNrJzsgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3JhZGlvJzpcbiAgICAgICAgICAgIGF0dHIgPSAnY2hlY2tlZCc7XG4gICAgICAgICAgICBpZihpZSkgeyBldiArPSAnIGNsaWNrJzsgfVxuICAgICAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgZWwuY2hlY2tlZCA9IGVsLnZhbHVlID09PSB2bS4kZ2V0RGF0YShrZXlQYXRoKSArICcnO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlzU2V0RGVmYXV0ID0gZWwuY2hlY2tlZDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgaWYoIWFudC5vcHRpb25zLmxhenkpe1xuICAgICAgICAgICAgICBpZignb25pbnB1dCcgaW4gZWwpe1xuICAgICAgICAgICAgICAgIGV2ICs9ICcgaW5wdXQnO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vSUUg5LiL55qEIGlucHV0IOS6i+S7tuabv+S7o1xuICAgICAgICAgICAgICBpZihpZSkge1xuICAgICAgICAgICAgICAgIGV2ICs9ICcga2V5dXAgcHJvcGVydHljaGFuZ2UgY3V0JztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICBicmVhaztcbiAgICAgIGNhc2UgJ1NFTEVDVCc6XG4gICAgICAgIGlmKGVsLm11bHRpcGxlKXtcbiAgICAgICAgICBoYW5kbGVyID0gZnVuY3Rpb24oaXNJbml0KSB7XG4gICAgICAgICAgICB2YXIgdmFscyA9IFtdO1xuICAgICAgICAgICAgZm9yKHZhciBpID0gMCwgbCA9IGVsLm9wdGlvbnMubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgICAgICAgICAgaWYoZWwub3B0aW9uc1tpXS5zZWxlY3RlZCl7IHZhbHMucHVzaChlbC5vcHRpb25zW2ldLnZhbHVlKSB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhbnQuc2V0KGN1ci4kZ2V0S2V5UGF0aCgpLCB2YWxzLCB7aXNCdWJibGU6IGlzSW5pdCAhPT0gdHJ1ZX0pO1xuICAgICAgICAgIH07XG4gICAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIHZhbHMgPSB2bS4kZ2V0RGF0YShrZXlQYXRoKTtcbiAgICAgICAgICAgIGlmKHZhbHMgJiYgdmFscy5sZW5ndGgpe1xuICAgICAgICAgICAgICBmb3IodmFyIGkgPSAwLCBsID0gZWwub3B0aW9ucy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgICAgICAgICAgIGVsLm9wdGlvbnNbaV0uc2VsZWN0ZWQgPSB2YWxzLmluZGV4T2YoZWwub3B0aW9uc1tpXS52YWx1ZSkgIT09IC0xO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBpc1NldERlZmF1dCA9IGlzU2V0RGVmYXV0ICYmICFoYXNUb2tlbihlbFt2YWx1ZV0pO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIFxuICAgIHRoaXMudXBkYXRlID0gY2FsbGJhY2s7XG4gICAgXG4gICAgZXYuc3BsaXQoL1xccysvZykuZm9yRWFjaChmdW5jdGlvbihlKXtcbiAgICAgIHJlbW92ZUV2ZW50KGVsLCBlLCBjYWxsSGFuZGxlcik7XG4gICAgICBhZGRFdmVudChlbCwgZSwgY2FsbEhhbmRsZXIpO1xuICAgIH0pO1xuICAgIFxuICAgIC8v5qC55o2u6KGo5Y2V5YWD57Sg55qE5Yid5aeL5YyW6buY6K6k5YC86K6+572u5a+55bqUIG1vZGVsIOeahOWAvFxuICAgIGlmKGVsW3ZhbHVlXSAmJiBpc1NldERlZmF1dCl7XG4gICAgICAgaGFuZGxlcih0cnVlKTsgXG4gICAgfVxuICAgICAgXG4gIH1cbn07XG5cbmZ1bmN0aW9uIGFkZEV2ZW50KGVsLCBldmVudCwgaGFuZGxlcikge1xuICBpZihlbC5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgZWwuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgaGFuZGxlciwgZmFsc2UpO1xuICB9ZWxzZXtcbiAgICBlbC5hdHRhY2hFdmVudCgnb24nICsgZXZlbnQsIGhhbmRsZXIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUV2ZW50KGVsLCBldmVudCwgaGFuZGxlcikge1xuICBpZihlbC5yZW1vdmVFdmVudExpc3RlbmVyKSB7XG4gICAgZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudCwgaGFuZGxlcik7XG4gIH1lbHNle1xuICAgIGVsLmRldGFjaEV2ZW50KCdvbicgKyBldmVudCwgaGFuZGxlcik7XG4gIH1cbn0iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGRvYyA9IHJlcXVpcmUoJy4uL2RvY3VtZW50LmpzJylcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJylcbiAgLCBhZnRlckZuID0gdXRpbHMuYWZ0ZXJGblxuICA7XG4gXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgcHJpb3JpdHk6IDEwMDBcbiwgYW5jaG9yOiB0cnVlXG4sIHRlcm1pbmFsOiB0cnVlXG4sIGxpbms6IGZ1bmN0aW9uKHZtKSB7XG5cbiAgICB0aGlzLl9hbmNob3JzID0gW107XG4gICAgdGhpcy5yZWxhdGl2ZVZtID0gdm07XG4gICAgXG4gICAgdGhpcy5lbC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMuZWwpO1xuICAgIFxuICAgIC8vVE9ETzogY2FjaGUgdm1cbiAgfVxuLCB1cGRhdGU6IGZ1bmN0aW9uKHZhbCwgb2xkKSB7XG4gICAgaWYoIXRoaXMudm0pIHtcbiAgICAgIHRoaXMudm0gPSB0aGlzLnJlbGF0aXZlVm0uJGdldFZNKHRoaXMucGF0aHNbMF0sIHthc3NpZ25tZW50OiB0aGlzLmFzc2lnbm1lbnR9KTtcbiAgICB9XG4gICAgdmFyIGZpeFZtXG4gICAgICAsIHdhdGNoZXJzID0gdGhpcy52bS4kd2F0Y2hlcnNcbiAgICAgIDtcbiAgICBpZih2YWwgJiYgdmFsICE9PSBvbGQpIHtcbiAgICAgIGlmKHV0aWxzLmlzQXJyYXkodmFsKSkge1xuICAgICAgICBpZih2YWwuc3BsaWNlICE9PSBhcnJheU1ldGhvZHMuc3BsaWNlKSB7XG4gICAgICAgICAgdXRpbHMuZXh0ZW5kKHZhbCwgYXJyYXlNZXRob2RzKTtcbiAgICAgICAgICB2YWwuX192bV9fID0gdGhpcy52bTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgZm9yKHZhciBpID0gMCwgbCA9IHdhdGNoZXJzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgIGlmKHdhdGNoZXJzW2ldLnRva2VuLnR5cGUgPT09ICdyZXBlYXQnKXtcbiAgICAgICAgICAgIGZpeFZtID0gd2F0Y2hlcnNbaV0udG9rZW4gPT09IHRoaXM7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMuc3BsaWNlKFswLCB0aGlzLl9hbmNob3JzLmxlbmd0aF0uY29uY2F0KHZhbCksIHZhbCwgZml4Vm0pO1xuICAgICAgfWVsc2V7XG4gICAgICAgIGNvbnNvbGUud2Fybign6ZyA6KaB5LiA5Liq5pWw57uEJyk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIFxuICAvL+iOt+WPluW9k+asoemBjeWOhueahOaJgOacieiKgueCuVxuLCBnZXRSZXBlYXROb2RlczogZnVuY3Rpb24oaW5kZXgsIGZuKSB7XG4gICAgdmFyIGFuY2hvciA9IHRoaXMuX2FuY2hvcnNbaW5kZXhdXG4gICAgICAsIGVuZEFuY2hvciA9IHRoaXMuX2FuY2hvcnNbaW5kZXggKyAxXVxuICAgICAgLCBub2RlcyA9IFtdXG4gICAgICA7XG4gICAgIFxuICAgIGZuID0gZm4gfHwgdXRpbHMubm9vcDtcbiAgICAgXG4gICAgZm9yKHZhciBub2RlID0gYW5jaG9yLCBuZXh0OyBub2RlICYmIG5vZGUgIT09ICBlbmRBbmNob3IgJiYgbm9kZSAhPT0gdGhpcy5hbmNob3JzLmVuZDsgbm9kZSA9IG5leHQpIHtcbiAgICAgIG5leHQgPSBub2RlLm5leHRTaWJsaW5nO1xuICAgICAgbm9kZXMucHVzaChub2RlKTtcbiAgICAgIGZuLmNhbGwobm9kZSk7XG4gICAgfVxuICAgIHJldHVybiBub2RlcztcbiAgfVxuICAvL+eyvuehruaOp+WItiBET00g5YiX6KGoXG4gIC8vYXJnczogW2luZGV4LCBuLyosIGl0ZW1zLi4uKi9dXG4gIC8vYXJyOiDmlbDnu4TmlbDmja5cbiAgLy9maXhWbTog5piv5ZCm57u05oqkIHZpZXdtb2RlbCDntKLlvJVcbiwgc3BsaWNlOiBmdW5jdGlvbihhcmdzLCBhcnIsIGZpeFZtKSB7XG4gICAgdmFyIGFuY2hvcnMgPSB0aGlzLl9hbmNob3JzXG4gICAgICAsIG5ld0FuY2hvcnMgPSBbXVxuICAgICAgLCBpdGVtcyA9IGFyZ3Muc2xpY2UoMilcbiAgICAgICwgaW5kZXggPSBhcmdzWzBdICogMVxuICAgICAgLCBuID0gYXJnc1sxXSAqIDFcbiAgICAgICwgbSA9IGl0ZW1zLmxlbmd0aFxuICAgICAgLCBwbiA9IHRoaXMuYW5jaG9ycy5zdGFydC5wYXJlbnROb2RlXG4gICAgICAsIHZtXG4gICAgICA7XG4gICAgXG4gICAgaWYodXRpbHMuaXNVbmRlZmluZWQobikpe1xuICAgICAgYXJnc1sxXSA9IG4gPSBhbmNob3JzLmxlbmd0aCAtIGluZGV4O1xuICAgIH1cbiAgICBcbiAgICBmb3IodmFyIGkgPSBpbmRleCwgbCA9IGFuY2hvcnMubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgIGlmKGkgPCBpbmRleCArIG4pe1xuICAgICAgICAvL+WIoOmZpFxuICAgICAgICAvL+WvueS6juaLpeaciSBpZiDlsZ7mgKflubbkuJTkuI3mmL7npLrnmoToioLngrksIOWFtuW5tuS4jeWtmOWcqOS6jiBET00g5qCR5LitXG4gICAgICAgIHRyeXsgXG4gICAgICAgICAgdGhpcy5nZXRSZXBlYXROb2RlcyhpLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBuLnJlbW92ZUNoaWxkKHRoaXMpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1jYXRjaChlKXt9XG4gICAgICAgIGZpeFZtICYmIGRlbGV0ZSB0aGlzLnZtW2ldO1xuICAgICAgfWVsc2V7XG4gICAgICAgIGlmKG4gfHwgbSl7XG4gICAgICAgICAgLy/nu7TmiqTntKLlvJVcbiAgICAgICAgICB2YXIgbmV3SSA9IGkgLSAobiAtIG0pXG4gICAgICAgICAgICAsIG9sZEkgPSBpXG4gICAgICAgICAgICA7XG4gICAgICAgICAgXG4gICAgICAgICAgaWYobmV3SSA+IG9sZEkpIHtcbiAgICAgICAgICAgIG5ld0kgPSBsIC0gKGkgLSBpbmRleCk7XG4gICAgICAgICAgICBvbGRJID0gbmV3SSArIChuIC0gbSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIHRoaXMuZ2V0UmVwZWF0Tm9kZXMob2xkSSwgZnVuY3Rpb24oKSB7dGhpc1snJGluZGV4J10gPSBuZXdJfSk7XG4gICAgICAgICAgXG4gICAgICAgICAgaWYoZml4Vm0pe1xuICAgICAgICAgICAgdm0gPSB0aGlzLnZtW25ld0ldID0gdGhpcy52bVtvbGRJXTtcbiAgICAgICAgICAgIHZtLiRrZXkgPSBuZXdJICsgJyc7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZtWyckaW5kZXgnXSAmJiB2bVsnJGluZGV4J10uJHVwZGF0ZSh2bS4ka2V5KTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLy/mlrDlop5cbiAgICB2YXIgYXNzaWdubWVudCwgZWwsIGFuY2hvclxuICAgICAgLCBmcmFnID0gZG9jLmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKVxuICAgICAgO1xuICAgIGZvcih2YXIgaiA9IDA7IGogPCBtOyBqKyspe1xuICAgICAgZWwgPSB0aGlzLmVsLmNsb25lTm9kZSh0cnVlKTtcbiAgICAgIGFuY2hvciA9IGRvYy5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICBcbiAgICAgIGlmKHRoaXMuZWwuY29udGVudCkge1xuICAgICAgICBlbC5jb250ZW50ID0gdGhpcy5lbC5jb250ZW50LmNsb25lTm9kZSh0cnVlKTtcbiAgICAgIH1cbiAgICAgIGZpeFZtICYmIGRlbGV0ZSB0aGlzLnZtW2luZGV4ICsgal07XG4gICAgICB2bSA9IHRoaXMudm0uJGdldFZNKGluZGV4ICsgaiwge3Njb3BlOiB0aGlzLnZtLCBhc3NpZ25tZW50OiB0aGlzLmFzc2lnbm1lbnR9KTtcbiAgICAgIFxuICAgICAgYXNzaWdubWVudCA9IHV0aWxzLmNyZWF0ZSh0aGlzLmFzc2lnbm1lbnQpO1xuICAgICAgZm9yKHZhciBhID0gMDsgYSA8IHRoaXMuYXNzaWdubWVudHMubGVuZ3RoOyBhKyspIHtcbiAgICAgICAgYXNzaWdubWVudFt0aGlzLmFzc2lnbm1lbnRzW2FdXSA9IHZtO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmcmFnLmFwcGVuZENoaWxkKGFuY2hvcik7XG4gICAgICBmcmFnLmFwcGVuZENoaWxkKGVsKTtcbiAgICAgIHZtLiRidWlsZChlbCwgYXNzaWdubWVudCk7XG4gICAgICBcbiAgICAgIHZtWyckaW5kZXgnXSAmJiB2bVsnJGluZGV4J10uJHVwZGF0ZSh2bS4ka2V5KTtcbiAgICAgIFxuICAgICAgbmV3QW5jaG9ycy5wdXNoKGFuY2hvcik7XG4gICAgICBcbiAgICAgIGZvcih2YXIgbm9kZSA9IGFuY2hvcjsgbm9kZTsgbm9kZSA9IG5vZGUubmV4dFNpYmxpbmcpIHtcbiAgICAgICAgbm9kZVsnJGluZGV4J10gPSBpbmRleCArIGo7XG4gICAgICB9XG4gICAgfVxuICAgIGlmKG5ld0FuY2hvcnMubGVuZ3RoKXtcbiAgICAgIHBuLmluc2VydEJlZm9yZShmcmFnLCBhbmNob3JzW2luZGV4ICsgbl0gfHwgdGhpcy5hbmNob3JzLmVuZCk7XG4gICAgfVxuICAgIFxuICAgIC8v6ZyA6KaB5riF6Zmk57yp55+t5ZCO5aSa5Ye655qE6YOo5YiGXG4gICAgaWYoZml4Vm0pe1xuICAgICAgZm9yKHZhciBrID0gbCAtIG4gKyBtOyBrIDwgbDsgaysrKXtcbiAgICAgICAgZGVsZXRlIHRoaXMudm1ba107XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIGlmKGFyci5fX3ZtX18gIT09IHRoaXMudm0pIHtcbiAgICAgIGFyci5fX3ZtX18gPSB0aGlzLnZtO1xuICAgIH1cbiAgICBcbiAgICBhcmdzID0gYXJncy5zbGljZSgwLCAyKS5jb25jYXQobmV3QW5jaG9ycyk7XG4gICAgYW5jaG9ycy5zcGxpY2UuYXBwbHkoYW5jaG9ycywgYXJncyk7XG4gIH1cbiwgcmV2ZXJzZTogZnVuY3Rpb24oYXJncywgYXJyLCBmaXhWbSkge1xuICAgIHZhciB2bXMgPSB0aGlzLnZtLCB2bVxuICAgICAgLCBhbmNob3IgPSB0aGlzLmFuY2hvcnMuZW5kXG4gICAgICAsIGZyYWcgPSBkb2MuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpXG4gICAgICA7XG4gICAgZm9yKHZhciBpID0gMCwgbCA9IHRoaXMuX2FuY2hvcnMubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgIGlmKGZpeFZtICYmIGkgPCAxLzIpe1xuICAgICAgICB2bSA9IHZtc1tpXTtcbiAgICAgICAgdm1zW2ldID0gdm1zW2wgLSBpIC0gMV07XG4gICAgICAgIHZtc1tpXS4ka2V5ID0gaSArICcnO1xuICAgICAgICB2bS4ka2V5ID0gbCAtIGkgLSAxICsgJyc7XG4gICAgICAgIHZtc1tsIC0gaSAtIDFdID0gdm07XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZpeFZtICYmIHZtWyckaW5kZXgnXSAmJiB2bVsnJGluZGV4J10uJHVwZGF0ZSh2bS4ka2V5KTtcbiAgICAgIFxuICAgICAgdGhpcy5nZXRSZXBlYXROb2RlcyhsIC0gaSAtIDEsIGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzWyckaW5kZXgnXSA9IGk7XG4gICAgICAgIGZyYWcuYXBwZW5kQ2hpbGQodGhpcylcbiAgICAgIH0pO1xuICAgIH1cbiAgICBhbmNob3IucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoZnJhZywgYW5jaG9yKTtcbiAgICB0aGlzLl9hbmNob3JzLnJldmVyc2UoKTtcbiAgfVxuLCBzb3J0OiBmdW5jdGlvbihmbil7XG4gICAgLy9UT0RPIOi/m+ihjOeyvuehrumrmOi/mOWOn+eahOaOkuW6jz9cbiAgICB0aGlzLnVwZGF0ZSh0aGlzLnZtLiR2YWx1ZSk7XG4gIH1cbn07XG5cblxuZnVuY3Rpb24gY2FsbFJlcGVhdGVyKHZtQXJyYXksIG1ldGhvZCwgYXJncyl7XG4gIHZhciB3YXRjaGVycyA9IHZtQXJyYXkuX192bV9fLiR3YXRjaGVycztcbiAgdmFyIGZpeFZtID0gdHJ1ZTtcbiAgZm9yKHZhciBpID0gMCwgbCA9IHdhdGNoZXJzLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgaWYod2F0Y2hlcnNbaV0udG9rZW4udHlwZSA9PT0gJ3JlcGVhdCcpe1xuICAgICAgd2F0Y2hlcnNbaV0udG9rZW5bbWV0aG9kXShhcmdzLCB2bUFycmF5LCBmaXhWbSk7XG4gICAgICBmaXhWbSA9IGZhbHNlO1xuICAgIH1cbiAgfVxuICB2bUFycmF5Ll9fdm1fXy5sZW5ndGggJiYgdm1BcnJheS5fX3ZtX18ubGVuZ3RoLiR1cGRhdGUodm1BcnJheS5sZW5ndGgsIGZhbHNlLCB0cnVlKTtcbn1cbnZhciBhcnJheU1ldGhvZHMgPSB7XG4gIHNwbGljZTogYWZ0ZXJGbihbXS5zcGxpY2UsIGZ1bmN0aW9uKCkge1xuICAgIGNhbGxSZXBlYXRlcih0aGlzLCAnc3BsaWNlJywgW10uc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcbiAgfSlcbiwgcHVzaDogYWZ0ZXJGbihbXS5wdXNoLCBmdW5jdGlvbigvKml0ZW0xLCBpdGVtMiwgLi4uKi8pIHtcbiAgICB2YXIgYXJyID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgIGFyci51bnNoaWZ0KHRoaXMubGVuZ3RoIC0gYXJyLmxlbmd0aCwgMCk7XG4gICAgXG4gICAgY2FsbFJlcGVhdGVyKHRoaXMsICdzcGxpY2UnLCBhcnIpO1xuICB9KVxuLCBwb3A6IGFmdGVyRm4oW10ucG9wLCBmdW5jdGlvbigpIHtcbiAgICBjYWxsUmVwZWF0ZXIodGhpcywgJ3NwbGljZScsIFt0aGlzLmxlbmd0aCwgMV0pO1xuICB9KVxuLCBzaGlmdDogYWZ0ZXJGbihbXS5zaGlmdCwgZnVuY3Rpb24oKSB7XG4gICAgY2FsbFJlcGVhdGVyKHRoaXMsICdzcGxpY2UnLCBbMCwgMV0pO1xuICB9KVxuLCB1bnNoaWZ0OiBhZnRlckZuKFtdLnVuc2hpZnQsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBhcnIgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgYXJyLnVuc2hpZnQoMCwgMCk7XG4gICAgXG4gICAgY2FsbFJlcGVhdGVyKHRoaXMsICdzcGxpY2UnLCBhcnIpO1xuICB9KVxuLCBzb3J0OiBhZnRlckZuKFtdLnNvcnQsIGZ1bmN0aW9uKGZuKSB7XG4gICAgY2FsbFJlcGVhdGVyKHRoaXMsICdzb3J0Jyk7XG4gIH0pXG4sIHJldmVyc2U6IGFmdGVyRm4oW10ucmV2ZXJzZSwgZnVuY3Rpb24oKXtcbiAgICBjYWxsUmVwZWF0ZXIodGhpcywgJ3JldmVyc2UnKTtcbiAgfSlcbn07XG4iLCIoZnVuY3Rpb24ocm9vdCl7XG4gIFwidXNlIHN0cmljdFwiO1xuXG4gIG1vZHVsZS5leHBvcnRzID0gcm9vdC5kb2N1bWVudCB8fCByZXF1aXJlKCdqc2RvbScpLmpzZG9tKCk7XG5cbn0pKChmdW5jdGlvbigpIHtyZXR1cm4gdGhpc30pKCkpOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgb3BlcmF0b3JzID0ge1xuICAndW5hcnknOiB7XG4gICAgJysnOiBmdW5jdGlvbih2KSB7IHJldHVybiArdjsgfVxuICAsICctJzogZnVuY3Rpb24odikgeyByZXR1cm4gLXY7IH1cbiAgLCAnISc6IGZ1bmN0aW9uKHYpIHsgcmV0dXJuICF2OyB9XG4gICAgXG4gICwgJ1snOiBmdW5jdGlvbih2KXsgcmV0dXJuIHY7IH1cbiAgLCAneyc6IGZ1bmN0aW9uKHYpe1xuICAgICAgdmFyIHIgPSB7fTtcbiAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSB2Lmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICByW3ZbaV1bMF1dID0gdltpXVsxXTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByO1xuICAgIH1cbiAgLCAndHlwZW9mJzogZnVuY3Rpb24odil7IHJldHVybiB0eXBlb2YgdjsgfVxuICAsICduZXcnOiBmdW5jdGlvbih2KXsgcmV0dXJuIG5ldyB2IH1cbiAgfVxuICBcbiwgJ2JpbmFyeSc6IHtcbiAgICAnKyc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgKyByOyB9XG4gICwgJy0nOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsIC0gcjsgfVxuICAsICcqJzogZnVuY3Rpb24obCwgcikgeyByZXR1cm4gbCAqIHI7IH1cbiAgLCAnLyc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgLyByOyB9XG4gICwgJyUnOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsICUgcjsgfVxuICAsICc8JzogZnVuY3Rpb24obCwgcikgeyByZXR1cm4gbCA8IHI7IH1cbiAgLCAnPic6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgPiByOyB9XG4gICwgJzw9JzogZnVuY3Rpb24obCwgcikgeyByZXR1cm4gbCA8PSByOyB9XG4gICwgJz49JzogZnVuY3Rpb24obCwgcikgeyByZXR1cm4gbCA+PSByOyB9XG4gICwgJz09JzogZnVuY3Rpb24obCwgcikgeyByZXR1cm4gbCA9PSByOyB9XG4gICwgJyE9JzogZnVuY3Rpb24obCwgcikgeyByZXR1cm4gbCAhPSByOyB9XG4gICwgJz09PSc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgPT09IHI7IH1cbiAgLCAnIT09JzogZnVuY3Rpb24obCwgcikgeyByZXR1cm4gbCAhPT0gcjsgfVxuICAsICcmJic6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgJiYgcjsgfVxuICAsICd8fCc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgfHwgcjsgfVxuICAgIFxuICAsICcuJzogZnVuY3Rpb24obCwgcikge1xuICAgICAgaWYocil7XG4gICAgICAgIHBhdGggPSBwYXRoICsgJy4nICsgcjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBsW3JdO1xuICAgIH1cbiAgLCAnWyc6IGZ1bmN0aW9uKGwsIHIpIHtcbiAgICAgIGlmKHR5cGVvZiByICE9PSAndW5kZWZpbmVkJyl7XG4gICAgICAgIHBhdGggPSBwYXRoICsgJy4nICsgcjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBsW3JdO1xuICAgIH1cbiAgLCAnKCc6IGZ1bmN0aW9uKGwsIHIpeyByZXR1cm4gbC5hcHBseShudWxsLCByKSB9XG4gICAgXG4gICwgJ3wnOiBmdW5jdGlvbihsLCByKXsgcmV0dXJuIHIuY2FsbChudWxsLCBsKSB9Ly9maWx0ZXIuIG5hbWV8ZmlsdGVyXG4gICwgJ2luJzogZnVuY3Rpb24obCwgcil7XG4gICAgICBpZih0aGlzLmFzc2lnbm1lbnQpIHtcbiAgICAgICAgLy9yZXBlYXRcbiAgICAgICAgcmV0dXJuIHI7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgcmV0dXJuIGwgaW4gcjtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgXG4sICd0ZXJuYXJ5Jzoge1xuICAgICc/JzogZnVuY3Rpb24oZiwgcywgdCkgeyByZXR1cm4gZiA/IHMgOiB0OyB9XG4gICwgJygnOiBmdW5jdGlvbihmLCBzLCB0KSB7IHJldHVybiBmW3NdLmFwcGx5KGYsIHQpIH1cbiAgXG4gIC8vZmlsdGVyLiBuYW1lIHwgZmlsdGVyIDogYXJnMiA6IGFyZzNcbiAgLCAnfCc6IGZ1bmN0aW9uKGYsIHMsIHQpeyByZXR1cm4gcy5hcHBseShudWxsLCBbZl0uY29uY2F0KHQpKTsgfVxuICB9XG59O1xuXG52YXIgYXJnTmFtZSA9IFsnZmlyc3QnLCAnc2Vjb25kJywgJ3RoaXJkJ11cbiAgLCBjb250ZXh0LCBzdW1tYXJ5XG4gICwgcGF0aFxuICA7XG5cbi8v6YGN5Y6GIGFzdFxudmFyIGV2YWx1YXRlID0gZnVuY3Rpb24odHJlZSkge1xuICB2YXIgYXJpdHkgPSB0cmVlLmFyaXR5XG4gICAgLCB2YWx1ZSA9IHRyZWUudmFsdWVcbiAgICAsIGFyZ3MgPSBbXVxuICAgICwgbiA9IDBcbiAgICAsIGFyZ1xuICAgICwgcmVzXG4gICAgO1xuICBcbiAgLy/mk43kvZznrKbmnIDlpJrlj6rmnInkuInlhYNcbiAgZm9yKDsgbiA8IDM7IG4rKyl7XG4gICAgYXJnID0gdHJlZVthcmdOYW1lW25dXTtcbiAgICBpZihhcmcpe1xuICAgICAgaWYoQXJyYXkuaXNBcnJheShhcmcpKXtcbiAgICAgICAgYXJnc1tuXSA9IFtdO1xuICAgICAgICBmb3IodmFyIGkgPSAwLCBsID0gYXJnLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICAgICAgYXJnc1tuXS5wdXNoKHR5cGVvZiBhcmdbaV0ua2V5ID09PSAndW5kZWZpbmVkJyA/IFxuICAgICAgICAgICAgZXZhbHVhdGUoYXJnW2ldKSA6IFthcmdbaV0ua2V5LCBldmFsdWF0ZShhcmdbaV0pXSk7XG4gICAgICAgIH1cbiAgICAgIH1lbHNle1xuICAgICAgICBhcmdzW25dID0gZXZhbHVhdGUoYXJnKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgXG4gIGlmKGFyaXR5ICE9PSAnbGl0ZXJhbCcpIHtcbiAgICBpZihwYXRoICYmIHZhbHVlICE9PSAnLicgJiYgdmFsdWUgIT09ICdbJykge1xuICAgICAgc3VtbWFyeS5wYXRoc1twYXRoXSA9IHRydWU7XG4gICAgfVxuICAgIGlmKGFyaXR5ID09PSAnbmFtZScpIHtcbiAgICAgIHBhdGggPSB2YWx1ZTtcbiAgICB9XG4gIH1cbiAgXG4gIHN3aXRjaChhcml0eSl7XG4gICAgY2FzZSAndW5hcnknOiBcbiAgICBjYXNlICdiaW5hcnknOlxuICAgIGNhc2UgJ3Rlcm5hcnknOlxuICAgICAgdHJ5e1xuICAgICAgICByZXMgPSBnZXRPcGVyYXRvcihhcml0eSwgdmFsdWUpLmFwcGx5KHRyZWUsIGFyZ3MpO1xuICAgICAgfWNhdGNoKGUpe1xuICAgICAgICAvL2NvbnNvbGUuZGVidWcoZSk7XG4gICAgICB9XG4gICAgYnJlYWs7XG4gICAgY2FzZSAnbGl0ZXJhbCc6XG4gICAgICByZXMgPSB2YWx1ZTtcbiAgICBicmVhaztcbiAgICBjYXNlICdhc3NpZ25tZW50JzpcbiAgICAgIHN1bW1hcnkuYXNzaWdubWVudHNbdmFsdWVdID0gdHJ1ZTtcbiAgICBicmVhaztcbiAgICBjYXNlICduYW1lJzpcbiAgICAgIHN1bW1hcnkubG9jYWxzW3ZhbHVlXSA9IHRydWU7XG4gICAgICByZXMgPSBjb250ZXh0LmxvY2Fsc1t2YWx1ZV07XG4gICAgYnJlYWs7XG4gICAgY2FzZSAnZmlsdGVyJzpcbiAgICAgIHN1bW1hcnkuZmlsdGVyc1t2YWx1ZV0gPSB0cnVlO1xuICAgICAgcmVzID0gY29udGV4dC5maWx0ZXJzW3ZhbHVlXTtcbiAgICBicmVhaztcbiAgICBjYXNlICd0aGlzJzpcbiAgICAgIHJlcyA9IGNvbnRleHQubG9jYWxzO1xuICAgIGJyZWFrO1xuICB9XG4gIHJldHVybiByZXM7XG59O1xuXG5mdW5jdGlvbiBnZXRPcGVyYXRvcihhcml0eSwgdmFsdWUpe1xuICByZXR1cm4gb3BlcmF0b3JzW2FyaXR5XVt2YWx1ZV0gfHwgZnVuY3Rpb24oKSB7IHJldHVybjsgfVxufVxuXG5mdW5jdGlvbiByZXNldChfY29udGV4dCkge1xuICBpZihfY29udGV4dCkge1xuICAgIGNvbnRleHQgPSB7bG9jYWxzOiBfY29udGV4dC5sb2NhbHMgfHwge30sIGZpbHRlcnM6IF9jb250ZXh0LmZpbHRlcnMgfHwge319O1xuICB9ZWxzZXtcbiAgICBjb250ZXh0ID0ge2ZpbHRlcnM6IHt9LCBsb2NhbHM6IHt9fTtcbiAgfVxuICBcbiAgc3VtbWFyeSA9IHtmaWx0ZXJzOiB7fSwgbG9jYWxzOiB7fSwgcGF0aHM6IHt9LCBhc3NpZ25tZW50czoge319O1xuICBwYXRoID0gJyc7XG59XG5cbi8v6KGo6L6+5byP5rGC5YC8XG4vL3RyZWU6IHBhcnNlciDnlJ/miJDnmoQgYXN0XG4vL2NvbnRleHQ6IOihqOi+vuW8j+aJp+ihjOeahOeOr+Wig1xuLy9jb250ZXh0LmxvY2Fsczog5Y+Y6YePXG4vL2NvbnRleHQuZmlsdGVyczog6L+H5ruk5Zmo5Ye95pWwXG5leHBvcnRzLmV2YWwgPSBmdW5jdGlvbih0cmVlLCBfY29udGV4dCkge1xuICByZXNldChfY29udGV4dCB8fCB7fSk7XG4gIFxuICByZXR1cm4gZXZhbHVhdGUodHJlZSk7XG59O1xuXG4vL+ihqOi+vuW8j+aRmOimgVxuLy9yZXR1cm46IHtmaWx0ZXJzOltdLCBsb2NhbHM6W10sIHBhdGhzOiBbXSwgYXNzaWdubWVudHM6IFtdfVxuZXhwb3J0cy5zdW1tYXJ5ID0gZnVuY3Rpb24odHJlZSkge1xuICByZXNldCgpO1xuICBcbiAgZXZhbHVhdGUodHJlZSk7XG4gIFxuICBpZihwYXRoKSB7XG4gICAgc3VtbWFyeS5wYXRoc1twYXRoXSA9IHRydWU7XG4gIH1cbiAgZm9yKHZhciBrZXkgaW4gc3VtbWFyeSkge1xuICAgIHN1bW1hcnlba2V5XSA9IE9iamVjdC5rZXlzKHN1bW1hcnlba2V5XSk7XG4gIH1cbiAgcmV0dXJuIHN1bW1hcnk7XG59OyIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxudmFyIEV2ZW50ID0ge1xuICAvL+ebkeWQrOiHquWumuS5ieS6i+S7ti5cbiAgb246IGZ1bmN0aW9uKG5hbWUsIGhhbmRsZXIsIGNvbnRleHQpIHtcbiAgICB2YXIgY3R4ID0gY29udGV4dCB8fCB0aGlzXG4gICAgICA7XG4gICAgICBcbiAgICBjdHguX2hhbmRsZXJzID0gY3R4Ll9oYW5kbGVycyB8fCB7fTtcbiAgICBjdHguX2hhbmRsZXJzW25hbWVdID0gY3R4Ll9oYW5kbGVyc1tuYW1lXSB8fCBbXTtcbiAgICBcbiAgICBjdHguX2hhbmRsZXJzW25hbWVdLnB1c2goe2hhbmRsZXI6IGhhbmRsZXIsIGNvbnRleHQ6IGNvbnRleHQsIGN0eDogY3R4fSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIC8v56e76Zmk55uR5ZCs5LqL5Lu2LlxuICBvZmY6IGZ1bmN0aW9uKG5hbWUsIGhhbmRsZXIsIGNvbnRleHQpIHtcbiAgICB2YXIgY3R4ID0gY29udGV4dCB8fCB0aGlzXG4gICAgICAsIGhhbmRsZXJzID0gY3R4Ll9oYW5kbGVyc1xuICAgICAgO1xuICAgICAgXG4gICAgaWYobmFtZSAmJiBoYW5kbGVyc1tuYW1lXSl7XG4gICAgICBpZih1dGlscy5pc0Z1bmN0aW9uKGhhbmRsZXIpKXtcbiAgICAgICAgZm9yKHZhciBpID0gaGFuZGxlcnNbbmFtZV0ubGVuZ3RoIC0gMTsgaSA+PTA7IGktLSkge1xuICAgICAgICAgIGlmKGhhbmRsZXJzW25hbWVdW2ldLmhhbmRsZXIgPT09IGhhbmRsZXIpe1xuICAgICAgICAgICAgaGFuZGxlcnNbbmFtZV0uc3BsaWNlKGksIDEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfWVsc2V7XG4gICAgICAgIGhhbmRsZXJzW25hbWVdID0gW107XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICAvL+inpuWPkeiHquWumuS5ieS6i+S7ti4gXG4gIC8v6K+l5pa55rOV5rKh5pyJ5o+Q5L6b6Z2Z5oCB5YyW55qEIGNvbnRleHQg5Y+C5pWwLiDlpoLopoHpnZnmgIHljJbkvb/nlKgsIOW6lOivpTogYEV2ZW50LnRyaWdnZXIuY2FsbChjb250ZXh0LCBuYW1lLCBkYXRhKWBcbiAgdHJpZ2dlcjogZnVuY3Rpb24obmFtZSwgZGF0YSkge1xuICAgIHZhciB0aGF0ID0gdGhpc1xuICAgICAgLCBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpXG4gICAgICAsIGhhbmRsZXJzID0gdGhhdC5faGFuZGxlcnNcbiAgICAgIDtcbiAgICAgIFxuICAgIGlmKGhhbmRsZXJzICYmIGhhbmRsZXJzW25hbWVdKXtcbiAgICAgIGhhbmRsZXJzW25hbWVdLmZvckVhY2goZnVuY3Rpb24oZSkge1xuICAgICAgICBlLmhhbmRsZXIuYXBwbHkodGhhdCwgYXJncylcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFdmVudDsiLCJcInVzZSBzdHJpY3RcIjtcbi8vSmF2YXNjcmlwdCBleHByZXNzaW9uIHBhcnNlciBtb2RpZmllZCBmb3JtIENyb2NrZm9yZCdzIFRET1AgcGFyc2VyXG52YXIgY3JlYXRlID0gT2JqZWN0LmNyZWF0ZSB8fCBmdW5jdGlvbiAobykge1xuICBmdW5jdGlvbiBGKCkge31cbiAgRi5wcm90b3R5cGUgPSBvO1xuICByZXR1cm4gbmV3IEYoKTtcbn07XG5cbnZhciBlcnJvciA9IGZ1bmN0aW9uIChtZXNzYWdlLCB0KSB7XG4gICAgdCA9IHQgfHwgdGhpcztcbiAgICB0Lm5hbWUgPSBcIlN5bnRheEVycm9yXCI7XG4gICAgdC5tZXNzYWdlID0gbWVzc2FnZTtcbiAgICBjb25zb2xlLmVycm9yKHQpO1xufTtcblxudmFyIG5vb3AgPSBmdW5jdGlvbigpIHt9O1xuXG52YXIgdG9rZW5pemUgPSBmdW5jdGlvbiAoY29kZSwgcHJlZml4LCBzdWZmaXgpIHtcbiAgICB2YXIgYzsgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIGN1cnJlbnQgY2hhcmFjdGVyLlxuICAgIHZhciBmcm9tOyAgICAgICAgICAgICAgICAgICAvLyBUaGUgaW5kZXggb2YgdGhlIHN0YXJ0IG9mIHRoZSB0b2tlbi5cbiAgICB2YXIgaSA9IDA7ICAgICAgICAgICAgICAgICAgLy8gVGhlIGluZGV4IG9mIHRoZSBjdXJyZW50IGNoYXJhY3Rlci5cbiAgICB2YXIgbGVuZ3RoID0gY29kZS5sZW5ndGg7XG4gICAgdmFyIG47ICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZSBudW1iZXIgdmFsdWUuXG4gICAgdmFyIHE7ICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZSBxdW90ZSBjaGFyYWN0ZXIuXG4gICAgdmFyIHN0cjsgICAgICAgICAgICAgICAgICAgIC8vIFRoZSBzdHJpbmcgdmFsdWUuXG5cbiAgICB2YXIgcmVzdWx0ID0gW107ICAgICAgICAgICAgLy8gQW4gYXJyYXkgdG8gaG9sZCB0aGUgcmVzdWx0cy5cblxuICAgIC8vIE1ha2UgYSB0b2tlbiBvYmplY3QuXG4gICAgdmFyIG1ha2UgPSBmdW5jdGlvbiAodHlwZSwgdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICBmcm9tOiBmcm9tLFxuICAgICAgICAgICAgdG86IGlcbiAgICAgICAgfTtcbiAgICB9O1xuXG4vLyBCZWdpbiB0b2tlbml6YXRpb24uIElmIHRoZSBzb3VyY2Ugc3RyaW5nIGlzIGVtcHR5LCByZXR1cm4gbm90aGluZy5cblxuICAgIGlmICghY29kZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4vLyBJZiBwcmVmaXggYW5kIHN1ZmZpeCBzdHJpbmdzIGFyZSBub3QgcHJvdmlkZWQsIHN1cHBseSBkZWZhdWx0cy5cblxuICAgIGlmICh0eXBlb2YgcHJlZml4ICE9PSAnc3RyaW5nJykge1xuICAgICAgICBwcmVmaXggPSAnPD4rLSYnO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHN1ZmZpeCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgc3VmZml4ID0gJz0+JjonO1xuICAgIH1cblxuXG4vLyBMb29wIHRocm91Z2ggY29kZSB0ZXh0LCBvbmUgY2hhcmFjdGVyIGF0IGEgdGltZS5cblxuICAgIGMgPSBjb2RlLmNoYXJBdChpKTtcbiAgICB3aGlsZSAoYykge1xuICAgICAgICBmcm9tID0gaTtcbiAgICAgICAgXG4gICAgICAgIGlmIChjIDw9ICcgJykgey8vIElnbm9yZSB3aGl0ZXNwYWNlLlxuICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgYyA9IGNvZGUuY2hhckF0KGkpO1xuICAgICAgICB9IGVsc2UgaWYgKChjID49ICdhJyAmJiBjIDw9ICd6JykgfHwgKGMgPj0gJ0EnICYmIGMgPD0gJ1onKSB8fCBjID09PSAnJCcgfHwgYyA9PT0gJ18nKSB7Ly8gbmFtZS5cbiAgICAgICAgICAgIHN0ciA9IGM7XG4gICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICBmb3IgKDs7KSB7XG4gICAgICAgICAgICAgICAgYyA9IGNvZGUuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgIGlmICgoYyA+PSAnYScgJiYgYyA8PSAneicpIHx8IChjID49ICdBJyAmJiBjIDw9ICdaJykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIChjID49ICcwJyAmJiBjIDw9ICc5JykgfHwgYyA9PT0gJ18nKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0ciArPSBjO1xuICAgICAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzdWx0LnB1c2gobWFrZSgnbmFtZScsIHN0cikpO1xuICAgICAgICB9IGVsc2UgaWYgKGMgPj0gJzAnICYmIGMgPD0gJzknKSB7XG4gICAgICAgIC8vIG51bWJlci5cblxuICAgICAgICAvLyBBIG51bWJlciBjYW5ub3Qgc3RhcnQgd2l0aCBhIGRlY2ltYWwgcG9pbnQuIEl0IG11c3Qgc3RhcnQgd2l0aCBhIGRpZ2l0LFxuICAgICAgICAvLyBwb3NzaWJseSAnMCcuXG4gICAgICAgICAgICBzdHIgPSBjO1xuICAgICAgICAgICAgaSArPSAxO1xuXG4vLyBMb29rIGZvciBtb3JlIGRpZ2l0cy5cblxuICAgICAgICAgICAgZm9yICg7Oykge1xuICAgICAgICAgICAgICAgIGMgPSBjb2RlLmNoYXJBdChpKTtcbiAgICAgICAgICAgICAgICBpZiAoYyA8ICcwJyB8fCBjID4gJzknKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICAgICAgc3RyICs9IGM7XG4gICAgICAgICAgICB9XG5cbi8vIExvb2sgZm9yIGEgZGVjaW1hbCBmcmFjdGlvbiBwYXJ0LlxuXG4gICAgICAgICAgICBpZiAoYyA9PT0gJy4nKSB7XG4gICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgICAgIHN0ciArPSBjO1xuICAgICAgICAgICAgICAgIGZvciAoOzspIHtcbiAgICAgICAgICAgICAgICAgICAgYyA9IGNvZGUuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYyA8ICcwJyB8fCBjID4gJzknKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIHN0ciArPSBjO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuLy8gTG9vayBmb3IgYW4gZXhwb25lbnQgcGFydC5cblxuICAgICAgICAgICAgaWYgKGMgPT09ICdlJyB8fCBjID09PSAnRScpIHtcbiAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICAgICAgc3RyICs9IGM7XG4gICAgICAgICAgICAgICAgYyA9IGNvZGUuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgIGlmIChjID09PSAnLScgfHwgYyA9PT0gJysnKSB7XG4gICAgICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgc3RyICs9IGM7XG4gICAgICAgICAgICAgICAgICAgIGMgPSBjb2RlLmNoYXJBdChpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGMgPCAnMCcgfHwgYyA+ICc5Jykge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcihcIkJhZCBleHBvbmVudFwiLCBtYWtlKCdudW1iZXInLCBzdHIpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIHN0ciArPSBjO1xuICAgICAgICAgICAgICAgICAgICBjID0gY29kZS5jaGFyQXQoaSk7XG4gICAgICAgICAgICAgICAgfSB3aGlsZSAoYyA+PSAnMCcgJiYgYyA8PSAnOScpO1xuICAgICAgICAgICAgfVxuXG4vLyBNYWtlIHN1cmUgdGhlIG5leHQgY2hhcmFjdGVyIGlzIG5vdCBhIGxldHRlci5cblxuICAgICAgICAgICAgaWYgKGMgPj0gJ2EnICYmIGMgPD0gJ3onKSB7XG4gICAgICAgICAgICAgICAgc3RyICs9IGM7XG4gICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgICAgIGVycm9yKFwiQmFkIG51bWJlclwiLCBtYWtlKCdudW1iZXInLCBzdHIpKTtcbiAgICAgICAgICAgIH1cblxuLy8gQ29udmVydCB0aGUgc3RyaW5nIHZhbHVlIHRvIGEgbnVtYmVyLiBJZiBpdCBpcyBmaW5pdGUsIHRoZW4gaXQgaXMgYSBnb29kXG4vLyB0b2tlbi5cblxuICAgICAgICAgICAgbiA9ICtzdHI7XG4gICAgICAgICAgICBpZiAoaXNGaW5pdGUobikpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaChtYWtlKCdudW1iZXInLCBuKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGVycm9yKFwiQmFkIG51bWJlclwiLCBtYWtlKCdudW1iZXInLCBzdHIpKTtcbiAgICAgICAgICAgIH1cblxuLy8gc3RyaW5nXG5cbiAgICAgICAgfSBlbHNlIGlmIChjID09PSAnXFwnJyB8fCBjID09PSAnXCInKSB7XG4gICAgICAgICAgICBzdHIgPSAnJztcbiAgICAgICAgICAgIHEgPSBjO1xuICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgZm9yICg7Oykge1xuICAgICAgICAgICAgICAgIGMgPSBjb2RlLmNoYXJBdChpKTtcbiAgICAgICAgICAgICAgICBpZiAoYyA8ICcgJykge1xuICAgICAgICAgICAgICAgICAgICBtYWtlKCdzdHJpbmcnLCBzdHIpO1xuICAgICAgICAgICAgICAgICAgICBlcnJvcihjID09PSAnXFxuJyB8fCBjID09PSAnXFxyJyB8fCBjID09PSAnJyA/XG4gICAgICAgICAgICAgICAgICAgICAgICBcIlVudGVybWluYXRlZCBzdHJpbmcuXCIgOlxuICAgICAgICAgICAgICAgICAgICAgICAgXCJDb250cm9sIGNoYXJhY3RlciBpbiBzdHJpbmcuXCIsIG1ha2UoJycsIHN0cikpO1xuICAgICAgICAgICAgICAgIH1cblxuLy8gTG9vayBmb3IgdGhlIGNsb3NpbmcgcXVvdGUuXG5cbiAgICAgICAgICAgICAgICBpZiAoYyA9PT0gcSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG5cbi8vIExvb2sgZm9yIGVzY2FwZW1lbnQuXG5cbiAgICAgICAgICAgICAgICBpZiAoYyA9PT0gJ1xcXFwnKSB7XG4gICAgICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgZXJyb3IoXCJVbnRlcm1pbmF0ZWQgc3RyaW5nXCIsIG1ha2UoJ3N0cmluZycsIHN0cikpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGMgPSBjb2RlLmNoYXJBdChpKTtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChjKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2InOlxuICAgICAgICAgICAgICAgICAgICAgICAgYyA9ICdcXGInO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2YnOlxuICAgICAgICAgICAgICAgICAgICAgICAgYyA9ICdcXGYnO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ24nOlxuICAgICAgICAgICAgICAgICAgICAgICAgYyA9ICdcXG4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3InOlxuICAgICAgICAgICAgICAgICAgICAgICAgYyA9ICdcXHInO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3QnOlxuICAgICAgICAgICAgICAgICAgICAgICAgYyA9ICdcXHQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3UnOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGkgPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcihcIlVudGVybWluYXRlZCBzdHJpbmdcIiwgbWFrZSgnc3RyaW5nJywgc3RyKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjID0gcGFyc2VJbnQoY29kZS5zdWJzdHIoaSArIDEsIDQpLCAxNik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzRmluaXRlKGMpIHx8IGMgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcihcIlVudGVybWluYXRlZCBzdHJpbmdcIiwgbWFrZSgnc3RyaW5nJywgc3RyKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjID0gU3RyaW5nLmZyb21DaGFyQ29kZShjKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGkgKz0gNDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN0ciArPSBjO1xuICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKG1ha2UoJ3N0cmluZycsIHN0cikpO1xuICAgICAgICAgICAgYyA9IGNvZGUuY2hhckF0KGkpO1xuXG4vLyBjb21tZW50LlxuXG4gICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJy8nICYmIGNvZGUuY2hhckF0KGkgKyAxKSA9PT0gJy8nKSB7XG4gICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICBmb3IgKDs7KSB7XG4gICAgICAgICAgICAgICAgYyA9IGNvZGUuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgIGlmIChjID09PSAnXFxuJyB8fCBjID09PSAnXFxyJyB8fCBjID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgfVxuXG4vLyBjb21iaW5pbmdcblxuICAgICAgICB9IGVsc2UgaWYgKHByZWZpeC5pbmRleE9mKGMpID49IDApIHtcbiAgICAgICAgICAgIHN0ciA9IGM7XG4gICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgICAgIGMgPSBjb2RlLmNoYXJBdChpKTtcbiAgICAgICAgICAgICAgICBpZiAoaSA+PSBsZW5ndGggfHwgc3VmZml4LmluZGV4T2YoYykgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdHIgKz0gYztcbiAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXN1bHQucHVzaChtYWtlKCdvcGVyYXRvcicsIHN0cikpO1xuXG4vLyBzaW5nbGUtY2hhcmFjdGVyIG9wZXJhdG9yXG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKG1ha2UoJ29wZXJhdG9yJywgYykpO1xuICAgICAgICAgICAgYyA9IGNvZGUuY2hhckF0KGkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5cbnZhciBtYWtlX3BhcnNlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzeW1ib2xfdGFibGUgPSB7fTtcbiAgICB2YXIgdG9rZW47XG4gICAgdmFyIHRva2VucztcbiAgICB2YXIgdG9rZW5fbnI7XG4gICAgdmFyIGNvbnRleHQ7XG4gICAgXG4gICAgdmFyIGl0c2VsZiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIHZhciBmaW5kID0gZnVuY3Rpb24gKG4pIHtcbiAgICAgIG4ubnVkICAgICAgPSBpdHNlbGY7XG4gICAgICBuLmxlZCAgICAgID0gbnVsbDtcbiAgICAgIG4uc3RkICAgICAgPSBudWxsO1xuICAgICAgbi5sYnAgICAgICA9IDA7XG4gICAgICByZXR1cm4gbjtcbiAgICB9O1xuXG4gICAgdmFyIGFkdmFuY2UgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgdmFyIGEsIG8sIHQsIHY7XG4gICAgICAgIGlmIChpZCAmJiB0b2tlbi5pZCAhPT0gaWQpIHtcbiAgICAgICAgICAgIGVycm9yKFwiRXhwZWN0ZWQgJ1wiICsgaWQgKyBcIicuXCIsIHRva2VuKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodG9rZW5fbnIgPj0gdG9rZW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgdG9rZW4gPSBzeW1ib2xfdGFibGVbXCIoZW5kKVwiXTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0ID0gdG9rZW5zW3Rva2VuX25yXTtcbiAgICAgICAgdG9rZW5fbnIgKz0gMTtcbiAgICAgICAgdiA9IHQudmFsdWU7XG4gICAgICAgIGEgPSB0LnR5cGU7XG4gICAgICAgIGlmICgoYSA9PT0gXCJvcGVyYXRvclwiIHx8IGEgIT09ICdzdHJpbmcnKSAmJiB2IGluIHN5bWJvbF90YWJsZSkge1xuICAgICAgICAgICAgLy90cnVlLCBmYWxzZSDnrYnnm7TmjqXph4/kuZ/kvJrov5vlhaXmraTliIbmlK9cbiAgICAgICAgICAgIG8gPSBzeW1ib2xfdGFibGVbdl07XG4gICAgICAgICAgICBpZiAoIW8pIHtcbiAgICAgICAgICAgICAgICBlcnJvcihcIlVua25vd24gb3BlcmF0b3IuXCIsIHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGEgPT09IFwibmFtZVwiKSB7XG4gICAgICAgICAgICBvID0gZmluZCh0KTtcbiAgICAgICAgfSBlbHNlIGlmIChhID09PSBcInN0cmluZ1wiIHx8IGEgPT09ICBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICBvID0gc3ltYm9sX3RhYmxlW1wiKGxpdGVyYWwpXCJdO1xuICAgICAgICAgICAgYSA9IFwibGl0ZXJhbFwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXJyb3IoXCJVbmV4cGVjdGVkIHRva2VuLlwiLCB0KTtcbiAgICAgICAgfVxuICAgICAgICB0b2tlbiA9IGNyZWF0ZShvKTtcbiAgICAgICAgdG9rZW4uZnJvbSAgPSB0LmZyb207XG4gICAgICAgIHRva2VuLnRvICAgID0gdC50bztcbiAgICAgICAgdG9rZW4udmFsdWUgPSB2O1xuICAgICAgICB0b2tlbi5hcml0eSA9IGE7XG4gICAgICAgIHJldHVybiB0b2tlbjtcbiAgICB9O1xuXG4gICAgdmFyIGV4cHJlc3Npb24gPSBmdW5jdGlvbiAocmJwKSB7XG4gICAgICAgIHZhciBsZWZ0O1xuICAgICAgICB2YXIgdCA9IHRva2VuO1xuICAgICAgICBhZHZhbmNlKCk7XG4gICAgICAgIGxlZnQgPSB0Lm51ZCgpO1xuICAgICAgICB3aGlsZSAocmJwIDwgdG9rZW4ubGJwKSB7XG4gICAgICAgICAgICB0ID0gdG9rZW47XG4gICAgICAgICAgICBhZHZhbmNlKCk7XG4gICAgICAgICAgICBsZWZ0ID0gdC5sZWQobGVmdCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxlZnQ7XG4gICAgfTtcblxuICAgIHZhciBvcmlnaW5hbF9zeW1ib2wgPSB7XG4gICAgICAgIG51ZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZXJyb3IoXCJVbmRlZmluZWQuXCIsIHRoaXMpO1xuICAgICAgICB9LFxuICAgICAgICBsZWQ6IGZ1bmN0aW9uIChsZWZ0KSB7XG4gICAgICAgICAgICBlcnJvcihcIk1pc3Npbmcgb3BlcmF0b3IuXCIsIHRoaXMpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBzeW1ib2wgPSBmdW5jdGlvbiAoaWQsIGJwKSB7XG4gICAgICAgIHZhciBzID0gc3ltYm9sX3RhYmxlW2lkXTtcbiAgICAgICAgYnAgPSBicCB8fCAwO1xuICAgICAgICBpZiAocykge1xuICAgICAgICAgICAgaWYgKGJwID49IHMubGJwKSB7XG4gICAgICAgICAgICAgICAgcy5sYnAgPSBicDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHMgPSBjcmVhdGUob3JpZ2luYWxfc3ltYm9sKTtcbiAgICAgICAgICAgIHMuaWQgPSBzLnZhbHVlID0gaWQ7XG4gICAgICAgICAgICBzLmxicCA9IGJwO1xuICAgICAgICAgICAgc3ltYm9sX3RhYmxlW2lkXSA9IHM7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHM7XG4gICAgfTtcblxuICAgIHZhciBjb25zdGFudCA9IGZ1bmN0aW9uIChzLCB2LCBhKSB7XG4gICAgICAgIHZhciB4ID0gc3ltYm9sKHMpO1xuICAgICAgICB4Lm51ZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSBzeW1ib2xfdGFibGVbdGhpcy5pZF0udmFsdWU7XG4gICAgICAgICAgICB0aGlzLmFyaXR5ID0gXCJsaXRlcmFsXCI7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfTtcbiAgICAgICAgeC52YWx1ZSA9IHY7XG4gICAgICAgIHJldHVybiB4O1xuICAgIH07XG4gICAgXG4gICAgdmFyIGluZml4ID0gZnVuY3Rpb24gKGlkLCBicCwgbGVkKSB7XG4gICAgICAgIHZhciBzID0gc3ltYm9sKGlkLCBicCk7XG4gICAgICAgIHMubGVkID0gbGVkIHx8IGZ1bmN0aW9uIChsZWZ0KSB7XG4gICAgICAgICAgICB0aGlzLmZpcnN0ID0gbGVmdDtcbiAgICAgICAgICAgIHRoaXMuc2Vjb25kID0gZXhwcmVzc2lvbihicCk7XG4gICAgICAgICAgICB0aGlzLmFyaXR5ID0gXCJiaW5hcnlcIjtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gcztcbiAgICB9O1xuXG4gICAgdmFyIGluZml4ciA9IGZ1bmN0aW9uIChpZCwgYnAsIGxlZCkge1xuICAgICAgICB2YXIgcyA9IHN5bWJvbChpZCwgYnApO1xuICAgICAgICBzLmxlZCA9IGxlZCB8fCBmdW5jdGlvbiAobGVmdCkge1xuICAgICAgICAgICAgdGhpcy5maXJzdCA9IGxlZnQ7XG4gICAgICAgICAgICB0aGlzLnNlY29uZCA9IGV4cHJlc3Npb24oYnAgLSAxKTtcbiAgICAgICAgICAgIHRoaXMuYXJpdHkgPSBcImJpbmFyeVwiO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBzO1xuICAgIH07XG5cbiAgICB2YXIgcHJlZml4ID0gZnVuY3Rpb24gKGlkLCBudWQpIHtcbiAgICAgICAgdmFyIHMgPSBzeW1ib2woaWQpO1xuICAgICAgICBzLm51ZCA9IG51ZCB8fCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmZpcnN0ID0gZXhwcmVzc2lvbig3MCk7XG4gICAgICAgICAgICB0aGlzLmFyaXR5ID0gXCJ1bmFyeVwiO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBzO1xuICAgIH07XG5cbiAgICBzeW1ib2woXCIoZW5kKVwiKTtcbiAgICBzeW1ib2woXCIobmFtZSlcIik7XG4gICAgc3ltYm9sKFwiOlwiKTtcbiAgICBzeW1ib2woXCIpXCIpO1xuICAgIHN5bWJvbChcIl1cIik7XG4gICAgc3ltYm9sKFwifVwiKTtcbiAgICBzeW1ib2woXCIsXCIpO1xuXG4gICAgY29uc3RhbnQoXCJ0cnVlXCIsIHRydWUpO1xuICAgIGNvbnN0YW50KFwiZmFsc2VcIiwgZmFsc2UpO1xuICAgIGNvbnN0YW50KFwibnVsbFwiLCBudWxsKTtcbiAgICBcbiAgICBjb25zdGFudChcIk1hdGhcIiwgTWF0aCk7XG4gICAgY29uc3RhbnQoXCJEYXRlXCIsIERhdGUpO1xuXG4gICAgc3ltYm9sKFwiKGxpdGVyYWwpXCIpLm51ZCA9IGl0c2VsZjtcblxuICAgIC8vIHN5bWJvbChcInRoaXNcIikubnVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyB0aGlzLmFyaXR5ID0gXCJ0aGlzXCI7XG4gICAgICAgIC8vIHJldHVybiB0aGlzO1xuICAgIC8vIH07XG5cbiAgICAvL09wZXJhdG9yIFByZWNlZGVuY2U6XG4gICAgLy9odHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9PcGVyYXRvcnMvT3BlcmF0b3JfUHJlY2VkZW5jZVxuXG4gICAgaW5maXgoXCI/XCIsIDIwLCBmdW5jdGlvbiAobGVmdCkge1xuICAgICAgICB0aGlzLmZpcnN0ID0gbGVmdDtcbiAgICAgICAgdGhpcy5zZWNvbmQgPSBleHByZXNzaW9uKDApO1xuICAgICAgICBhZHZhbmNlKFwiOlwiKTtcbiAgICAgICAgdGhpcy50aGlyZCA9IGV4cHJlc3Npb24oMCk7XG4gICAgICAgIHRoaXMuYXJpdHkgPSBcInRlcm5hcnlcIjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSk7XG4gICAgXG4gICAgaW5maXhyKFwiJiZcIiwgMzEpO1xuICAgIGluZml4cihcInx8XCIsIDMwKTtcblxuICAgIGluZml4cihcIj09PVwiLCA0MCk7XG4gICAgaW5maXhyKFwiIT09XCIsIDQwKTtcblxuICAgIGluZml4cihcIj09XCIsIDQwKTtcbiAgICBpbmZpeHIoXCIhPVwiLCA0MCk7XG5cbiAgICBpbmZpeHIoXCI8XCIsIDQwKTtcbiAgICBpbmZpeHIoXCI8PVwiLCA0MCk7XG4gICAgaW5maXhyKFwiPlwiLCA0MCk7XG4gICAgaW5maXhyKFwiPj1cIiwgNDApO1xuICAgIFxuICAgIGluZml4KFwiaW5cIiwgNDUsIGZ1bmN0aW9uIChsZWZ0KSB7XG4gICAgICAgIHRoaXMuZmlyc3QgPSBsZWZ0O1xuICAgICAgICB0aGlzLnNlY29uZCA9IGV4cHJlc3Npb24oMCk7XG4gICAgICAgIHRoaXMuYXJpdHkgPSBcImJpbmFyeVwiO1xuICAgICAgICBpZihjb250ZXh0ID09PSAncmVwZWF0Jyl7XG4gICAgICAgICAgLy8gYGluYCBhdCByZXBlYXQgYmxvY2tcbiAgICAgICAgICBsZWZ0LmFyaXR5ID0gJ2Fzc2lnbm1lbnQnO1xuICAgICAgICAgIHRoaXMuYXNzaWdubWVudCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSk7XG5cbiAgICBpbmZpeChcIitcIiwgNTApO1xuICAgIGluZml4KFwiLVwiLCA1MCk7XG5cbiAgICBpbmZpeChcIipcIiwgNjApO1xuICAgIGluZml4KFwiL1wiLCA2MCk7XG4gICAgaW5maXgoXCIlXCIsIDYwKTtcblxuICAgIGluZml4KFwiLlwiLCA4MCwgZnVuY3Rpb24gKGxlZnQpIHtcbiAgICAgICAgdGhpcy5maXJzdCA9IGxlZnQ7XG4gICAgICAgIGlmICh0b2tlbi5hcml0eSAhPT0gXCJuYW1lXCIpIHtcbiAgICAgICAgICAgIGVycm9yKFwiRXhwZWN0ZWQgYSBwcm9wZXJ0eSBuYW1lLlwiLCB0b2tlbik7XG4gICAgICAgIH1cbiAgICAgICAgdG9rZW4uYXJpdHkgPSBcImxpdGVyYWxcIjtcbiAgICAgICAgdGhpcy5zZWNvbmQgPSB0b2tlbjtcbiAgICAgICAgdGhpcy5hcml0eSA9IFwiYmluYXJ5XCI7XG4gICAgICAgIGFkdmFuY2UoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSk7XG5cbiAgICBpbmZpeChcIltcIiwgODAsIGZ1bmN0aW9uIChsZWZ0KSB7XG4gICAgICAgIHRoaXMuZmlyc3QgPSBsZWZ0O1xuICAgICAgICB0aGlzLnNlY29uZCA9IGV4cHJlc3Npb24oMCk7XG4gICAgICAgIHRoaXMuYXJpdHkgPSBcImJpbmFyeVwiO1xuICAgICAgICBhZHZhbmNlKFwiXVwiKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSk7XG5cbiAgICBpbmZpeChcIihcIiwgODAsIGZ1bmN0aW9uIChsZWZ0KSB7XG4gICAgICAgIHZhciBhID0gW107XG4gICAgICAgIGlmIChsZWZ0LmlkID09PSBcIi5cIiB8fCBsZWZ0LmlkID09PSBcIltcIikge1xuICAgICAgICAgICAgdGhpcy5hcml0eSA9IFwidGVybmFyeVwiO1xuICAgICAgICAgICAgdGhpcy5maXJzdCA9IGxlZnQuZmlyc3Q7XG4gICAgICAgICAgICB0aGlzLnNlY29uZCA9IGxlZnQuc2Vjb25kO1xuICAgICAgICAgICAgdGhpcy50aGlyZCA9IGE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmFyaXR5ID0gXCJiaW5hcnlcIjtcbiAgICAgICAgICAgIHRoaXMuZmlyc3QgPSBsZWZ0O1xuICAgICAgICAgICAgdGhpcy5zZWNvbmQgPSBhO1xuICAgICAgICAgICAgaWYgKChsZWZ0LmFyaXR5ICE9PSBcInVuYXJ5XCIgfHwgbGVmdC5pZCAhPT0gXCJmdW5jdGlvblwiKSAmJlxuICAgICAgICAgICAgICAgICAgICBsZWZ0LmFyaXR5ICE9PSBcIm5hbWVcIiAmJiBsZWZ0LmFyaXR5ICE9PSBcImxpdGVyYWxcIiAmJiBsZWZ0LmlkICE9PSBcIihcIiAmJlxuICAgICAgICAgICAgICAgICAgICBsZWZ0LmlkICE9PSBcIiYmXCIgJiYgbGVmdC5pZCAhPT0gXCJ8fFwiICYmIGxlZnQuaWQgIT09IFwiP1wiKSB7XG4gICAgICAgICAgICAgICAgZXJyb3IoXCJFeHBlY3RlZCBhIHZhcmlhYmxlIG5hbWUuXCIsIGxlZnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0b2tlbi5pZCAhPT0gXCIpXCIpIHtcbiAgICAgICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICAgICAgYS5wdXNoKGV4cHJlc3Npb24oMCkpO1xuICAgICAgICAgICAgICAgIGlmICh0b2tlbi5pZCAhPT0gXCIsXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFkdmFuY2UoXCIsXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGFkdmFuY2UoXCIpXCIpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9KTtcblxuICAgIC8vZmlsdGVyXG4gICAgaW5maXgoXCJ8XCIsIDEwLCBmdW5jdGlvbihsZWZ0KSB7XG4gICAgICB2YXIgYTtcbiAgICAgIHRoaXMuZmlyc3QgPSBsZWZ0O1xuICAgICAgdG9rZW4uYXJpdHkgPSAnZmlsdGVyJztcbiAgICAgIHRoaXMuc2Vjb25kID0gZXhwcmVzc2lvbigxMCk7XG4gICAgICB0aGlzLmFyaXR5ID0gJ2JpbmFyeSc7XG4gICAgICBpZih0b2tlbi5pZCA9PT0gJzonKXtcbiAgICAgICAgdGhpcy5hcml0eSA9ICd0ZXJuYXJ5JztcbiAgICAgICAgdGhpcy50aGlyZCA9IGEgPSBbXTtcbiAgICAgICAgd2hpbGUodHJ1ZSl7XG4gICAgICAgICAgYWR2YW5jZSgnOicpO1xuICAgICAgICAgIGEucHVzaChleHByZXNzaW9uKDApKTtcbiAgICAgICAgICBpZih0b2tlbi5pZCAhPT0gXCI6XCIpe1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9KTtcbiAgICBcblxuICAgIHByZWZpeChcIiFcIik7XG4gICAgcHJlZml4KFwiLVwiKTtcbiAgICBwcmVmaXgoXCJ0eXBlb2ZcIik7XG5cbiAgICBwcmVmaXgoXCIoXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGUgPSBleHByZXNzaW9uKDApO1xuICAgICAgICBhZHZhbmNlKFwiKVwiKTtcbiAgICAgICAgcmV0dXJuIGU7XG4gICAgfSk7XG5cbiAgICBwcmVmaXgoXCJbXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGEgPSBbXTtcbiAgICAgICAgaWYgKHRva2VuLmlkICE9PSBcIl1cIikge1xuICAgICAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgICAgICBhLnB1c2goZXhwcmVzc2lvbigwKSk7XG4gICAgICAgICAgICAgICAgaWYgKHRva2VuLmlkICE9PSBcIixcIikge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYWR2YW5jZShcIixcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYWR2YW5jZShcIl1cIik7XG4gICAgICAgIHRoaXMuZmlyc3QgPSBhO1xuICAgICAgICB0aGlzLmFyaXR5ID0gXCJ1bmFyeVwiO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9KTtcblxuICAgIHByZWZpeChcIntcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgYSA9IFtdLCBuLCB2O1xuICAgICAgICBpZiAodG9rZW4uaWQgIT09IFwifVwiKSB7XG4gICAgICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgICAgIG4gPSB0b2tlbjtcbiAgICAgICAgICAgICAgICBpZiAobi5hcml0eSAhPT0gXCJuYW1lXCIgJiYgbi5hcml0eSAhPT0gXCJsaXRlcmFsXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3IoXCJCYWQgcHJvcGVydHkgbmFtZS5cIiwgdG9rZW4pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhZHZhbmNlKCk7XG4gICAgICAgICAgICAgICAgYWR2YW5jZShcIjpcIik7XG4gICAgICAgICAgICAgICAgdiA9IGV4cHJlc3Npb24oMCk7XG4gICAgICAgICAgICAgICAgdi5rZXkgPSBuLnZhbHVlO1xuICAgICAgICAgICAgICAgIGEucHVzaCh2KTtcbiAgICAgICAgICAgICAgICBpZiAodG9rZW4uaWQgIT09IFwiLFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhZHZhbmNlKFwiLFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBhZHZhbmNlKFwifVwiKTtcbiAgICAgICAgdGhpcy5maXJzdCA9IGE7XG4gICAgICAgIHRoaXMuYXJpdHkgPSBcInVuYXJ5XCI7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0pO1xuXG4gICAgLy9fc291cmNlOiDooajovr7lvI/ku6PnoIHlrZfnrKbkuLJcbiAgICAvL19jb250ZXh0OiDooajovr7lvI/nmoTor63lj6Xnjq/looNcbiAgICByZXR1cm4gZnVuY3Rpb24gKF9zb3VyY2UsIF9jb250ZXh0KSB7XG4gICAgICAgIHRva2VucyA9IHRva2VuaXplKF9zb3VyY2UsICc9PD4hKy0qJnwvJV4nLCAnPTw+JnwnKTtcbiAgICAgICAgdG9rZW5fbnIgPSAwO1xuICAgICAgICBjb250ZXh0ID0gX2NvbnRleHQ7XG4gICAgICAgIGFkdmFuY2UoKTtcbiAgICAgICAgdmFyIHMgPSBleHByZXNzaW9uKDApO1xuICAgICAgICBhZHZhbmNlKFwiKGVuZClcIik7XG4gICAgICAgIHJldHVybiBzO1xuICAgIH07XG59O1xuXG5leHBvcnRzLnBhcnNlID0gbWFrZV9wYXJzZSgpOyIsInZhciB0b2tlblJlZyA9IC97eyh7KFtefVxcbl0rKX18W159XFxuXSspfX0vZztcblxuLy/lrZfnrKbkuLLkuK3mmK/lkKbljIXlkKvmqKHmnb/ljaDkvY3nrKbmoIforrBcbmZ1bmN0aW9uIGhhc1Rva2VuKHN0cikge1xuICB0b2tlblJlZy5sYXN0SW5kZXggPSAwO1xuICByZXR1cm4gc3RyICYmIHRva2VuUmVnLnRlc3Qoc3RyKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VUb2tlbih2YWx1ZSkge1xuICB2YXIgdG9rZW5zID0gW11cbiAgICAsIHRleHRNYXAgPSBbXVxuICAgICwgc3RhcnQgPSAwXG4gICAgLCB2YWwsIHRva2VuXG4gICAgO1xuICBcbiAgdG9rZW5SZWcubGFzdEluZGV4ID0gMDtcbiAgXG4gIHdoaWxlKCh2YWwgPSB0b2tlblJlZy5leGVjKHZhbHVlKSkpe1xuICAgIGlmKHRva2VuUmVnLmxhc3RJbmRleCAtIHN0YXJ0ID4gdmFsWzBdLmxlbmd0aCl7XG4gICAgICB0ZXh0TWFwLnB1c2godmFsdWUuc2xpY2Uoc3RhcnQsIHRva2VuUmVnLmxhc3RJbmRleCAtIHZhbFswXS5sZW5ndGgpKTtcbiAgICB9XG4gICAgXG4gICAgdG9rZW4gPSB7XG4gICAgICBlc2NhcGU6ICF2YWxbMl1cbiAgICAsIHBhdGg6ICh2YWxbMl0gfHwgdmFsWzFdKS50cmltKClcbiAgICAsIHBvc2l0aW9uOiB0ZXh0TWFwLmxlbmd0aFxuICAgICwgdGV4dE1hcDogdGV4dE1hcFxuICAgIH07XG4gICAgXG4gICAgdG9rZW5zLnB1c2godG9rZW4pO1xuICAgIFxuICAgIC8v5LiA5Liq5byV55So57G75Z6LKOaVsOe7hCnkvZzkuLroioLngrnlr7nosaHnmoTmlofmnKzlm74sIOi/meagt+W9k+afkOS4gOS4quW8leeUqOaUueWPmOS6huS4gOS4quWAvOWQjiwg5YW25LuW5byV55So5Y+W5b6X55qE5YC86YO95Lya5ZCM5pe25pu05pawXG4gICAgdGV4dE1hcC5wdXNoKHZhbFswXSk7XG4gICAgXG4gICAgc3RhcnQgPSB0b2tlblJlZy5sYXN0SW5kZXg7XG4gIH1cbiAgXG4gIGlmKHZhbHVlLmxlbmd0aCA+IHN0YXJ0KXtcbiAgICB0ZXh0TWFwLnB1c2godmFsdWUuc2xpY2Uoc3RhcnQsIHZhbHVlLmxlbmd0aCkpO1xuICB9XG4gIFxuICB0b2tlbnMudGV4dE1hcCA9IHRleHRNYXA7XG4gIFxuICByZXR1cm4gdG9rZW5zO1xufVxuXG5leHBvcnRzLmhhc1Rva2VuID0gaGFzVG9rZW47XG5cbmV4cG9ydHMucGFyc2VUb2tlbiA9IHBhcnNlVG9rZW47IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8vdXRpbHNcbi8vLS0tXG5cbnZhciBkb2MgPSByZXF1aXJlKCcuL2RvY3VtZW50LmpzJyk7XG5cbnZhciBrZXlQYXRoUmVnID0gLyg/OlxcLnxcXFspL2dcbiAgLCBicmEgPSAvXFxdL2dcbiAgO1xuXG4vL3BhdGgua2V5LCBwYXRoW2tleV0gLS0+IFsncGF0aCcsICdrZXknXVxuZnVuY3Rpb24gcGFyc2VLZXlQYXRoKGtleVBhdGgpe1xuICByZXR1cm4ga2V5UGF0aC5yZXBsYWNlKGJyYSwgJycpLnNwbGl0KGtleVBhdGhSZWcpO1xufVxuXG4vKipcbiAqIOWQiOW5tuWvueixoVxuICogQHN0YXRpY1xuICogQHBhcmFtIHtCb29sZWFufSBbZGVlcD1mYWxzZV0g5piv5ZCm5rex5bqm5ZCI5bm2XG4gKiBAcGFyYW0ge09iamVjdH0gdGFyZ2V0IOebruagh+WvueixoVxuICogQHBhcmFtIHtPYmplY3R9IFtvYmplY3QuLi5dIOadpea6kOWvueixoVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSDnlKjkuo7oh6rlrprkuYnlkIjlubbnmoTlm57osINcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSDlkIjlubblkI7nmoQgdGFyZ2V0IOWvueixoVxuICovXG5mdW5jdGlvbiBleHRlbmQoLyogZGVlcCwgdGFyZ2V0LCBvYmplY3QuLi4sIGNhbGxsYmFjayAqLykge1xuICB2YXIgb3B0aW9uc1xuICAgICwgbmFtZSwgc3JjLCBjb3B5LCBjb3B5SXNBcnJheSwgY2xvbmVcbiAgICAsIHRhcmdldCA9IGFyZ3VtZW50c1swXSB8fCB7fVxuICAgICwgaSA9IDFcbiAgICAsIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGhcbiAgICAsIGRlZXAgPSBmYWxzZVxuICAgICwgY2FsbGJhY2tcbiAgICA7XG5cbiAgLy8gSGFuZGxlIGEgZGVlcCBjb3B5IHNpdHVhdGlvblxuICBpZiAodHlwZW9mIHRhcmdldCA9PT0gXCJib29sZWFuXCIpIHtcbiAgICBkZWVwID0gdGFyZ2V0O1xuXG4gICAgLy8gc2tpcCB0aGUgYm9vbGVhbiBhbmQgdGhlIHRhcmdldFxuICAgIHRhcmdldCA9IGFyZ3VtZW50c1sgaSBdIHx8IHt9O1xuICAgIGkrKztcbiAgfVxuICBcbiAgaWYodXRpbHMuaXNGdW5jdGlvbihhcmd1bWVudHNbbGVuZ3RoIC0gMV0pKSB7XG4gICAgY2FsbGJhY2sgPSBhcmd1bWVudHNbbGVuZ3RoIC0gMV07XG4gICAgbGVuZ3RoLS07XG4gIH1cblxuICAvLyBIYW5kbGUgY2FzZSB3aGVuIHRhcmdldCBpcyBhIHN0cmluZyBvciBzb21ldGhpbmcgKHBvc3NpYmxlIGluIGRlZXAgY29weSlcbiAgaWYgKHR5cGVvZiB0YXJnZXQgIT09IFwib2JqZWN0XCIgJiYgIXV0aWxzLmlzRnVuY3Rpb24odGFyZ2V0KSkge1xuICAgIHRhcmdldCA9IHt9O1xuICB9XG5cbiAgZm9yICggOyBpIDwgbGVuZ3RoOyBpKysgKSB7XG4gICAgLy8gT25seSBkZWFsIHdpdGggbm9uLW51bGwvdW5kZWZpbmVkIHZhbHVlc1xuICAgIGlmICggKG9wdGlvbnMgPSBhcmd1bWVudHNbIGkgXSkgIT0gbnVsbCApIHtcbiAgICAgIC8vIEV4dGVuZCB0aGUgYmFzZSBvYmplY3RcbiAgICAgIGZvciAoIG5hbWUgaW4gb3B0aW9ucyApIHtcbiAgICAgICAgLy9hbmRyb2lkIDIuMyBicm93c2VyIGNhbiBlbnVtIHRoZSBwcm90b3R5cGUgb2YgY29uc3RydWN0b3IuLi5cbiAgICAgICAgaWYob3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShuYW1lKSAmJiBuYW1lICE9PSAncHJvdG90eXBlJyl7XG4gICAgICAgICAgc3JjID0gdGFyZ2V0WyBuYW1lIF07XG4gICAgICAgICAgY29weSA9IG9wdGlvbnNbIG5hbWUgXTtcbiAgICAgICAgICBcblxuICAgICAgICAgIC8vIFJlY3Vyc2UgaWYgd2UncmUgbWVyZ2luZyBwbGFpbiBvYmplY3RzIG9yIGFycmF5c1xuICAgICAgICAgIGlmICggZGVlcCAmJiBjb3B5ICYmICggdXRpbHMuaXNQbGFpbk9iamVjdChjb3B5KSB8fCAoY29weUlzQXJyYXkgPSB1dGlscy5pc0FycmF5KGNvcHkpKSApICkge1xuICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUHJldmVudCBuZXZlci1lbmRpbmcgbG9vcFxuICAgICAgICAgICAgaWYgKCB0YXJnZXQgPT09IGNvcHkgKSB7XG4gICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCBjb3B5SXNBcnJheSApIHtcbiAgICAgICAgICAgICAgY29weUlzQXJyYXkgPSBmYWxzZTtcbiAgICAgICAgICAgICAgY2xvbmUgPSBzcmMgJiYgdXRpbHMuaXNBcnJheShzcmMpID8gc3JjIDogW107XG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNsb25lID0gc3JjICYmIHV0aWxzLmlzUGxhaW5PYmplY3Qoc3JjKSA/IHNyYyA6IHt9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZihjYWxsYmFjaykge1xuICAgICAgICAgICAgICBjb3B5ID0gY2FsbGJhY2soY2xvbmUsIGNvcHksIG5hbWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBOZXZlciBtb3ZlIG9yaWdpbmFsIG9iamVjdHMsIGNsb25lIHRoZW1cbiAgICAgICAgICAgIHRhcmdldFsgbmFtZSBdID0gZXh0ZW5kKCBkZWVwLCBjbG9uZSwgY29weSwgY2FsbGJhY2spO1xuXG4gICAgICAgICAgICAvLyBEb24ndCBicmluZyBpbiB1bmRlZmluZWQgdmFsdWVzXG4gICAgICAgICAgfSBlbHNlIGlmICggIXV0aWxzLmlzVW5kZWZpbmVkKGNvcHkpICkge1xuXG4gICAgICAgICAgICBpZihjYWxsYmFjaykge1xuICAgICAgICAgICAgICBjb3B5ID0gY2FsbGJhY2soc3JjLCBjb3B5LCBuYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRhcmdldFsgbmFtZSBdID0gY29weTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBSZXR1cm4gdGhlIG1vZGlmaWVkIG9iamVjdFxuICByZXR1cm4gdGFyZ2V0O1xufVxuXG52YXIgY3JlYXRlID0gT2JqZWN0LmNyZWF0ZSB8fCBmdW5jdGlvbiAobykge1xuICBmdW5jdGlvbiBGKCkge31cbiAgRi5wcm90b3R5cGUgPSBvO1xuICByZXR1cm4gbmV3IEYoKTtcbn07XG5cbmZ1bmN0aW9uIHRwbFBhcnNlKHRwbCwgdGFyZ2V0KSB7XG4gIHZhciBlbDtcbiAgaWYodXRpbHMuaXNPYmplY3QodHBsKSl7XG4gICAgaWYodGFyZ2V0KXtcbiAgICAgIGVsID0gdGFyZ2V0ID0gdXRpbHMuaXNPYmplY3QodGFyZ2V0KSA/IHRhcmdldCA6IGRvYy5jcmVhdGVFbGVtZW50KHRhcmdldCk7XG4gICAgICBlbC5pbm5lckhUTUwgPSAnJzsvL+a4heepuuebruagh+WvueixoVxuICAgICAgdGFyZ2V0LmFwcGVuZENoaWxkKHRwbCk7XG4gICAgfWVsc2V7XG4gICAgICBlbCA9IHRwbDtcbiAgICB9XG4gICAgdHBsID0gZWwub3V0ZXJIVE1MO1xuICB9ZWxzZXtcbiAgICBlbCA9IHV0aWxzLmlzT2JqZWN0KHRhcmdldCkgPyB0YXJnZXQgOiBkb2MuY3JlYXRlRWxlbWVudCh0YXJnZXQgfHwgJ2RpdicpO1xuICAgIGVsLmlubmVySFRNTCA9IHRwbDtcbiAgfVxuICByZXR1cm4ge2VsOiBlbCwgdHBsOiB0cGx9O1xufVxuXG4gXG52YXIgdXRpbHMgPSB7XG4gIG5vb3A6IGZ1bmN0aW9uICgpe31cbiwgaWU6ICEhZG9jLmF0dGFjaEV2ZW50XG5cbiwgaXNPYmplY3Q6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICByZXR1cm4gdHlwZW9mIHZhbCA9PT0gJ29iamVjdCcgJiYgdmFsICE9PSBudWxsO1xuICB9XG5cbiwgaXNVbmRlZmluZWQ6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICByZXR1cm4gdHlwZW9mIHZhbCA9PT0gJ3VuZGVmaW5lZCc7XG4gIH1cblxuLCBpc0Z1bmN0aW9uOiBmdW5jdGlvbiAodmFsKXtcbiAgICByZXR1cm4gdHlwZW9mIHZhbCA9PT0gJ2Z1bmN0aW9uJztcbiAgfVxuXG4sIGlzQXJyYXk6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICBpZih1dGlscy5pZSl7XG4gICAgICAvL0lFIDkg5Y+K5Lul5LiLIElFIOi3qOeql+WPo+ajgOa1i+aVsOe7hFxuICAgICAgcmV0dXJuIHZhbCAmJiB2YWwuY29uc3RydWN0b3IgKyAnJyA9PT0gQXJyYXkgKyAnJztcbiAgICB9ZWxzZXtcbiAgICAgIHJldHVybiBBcnJheS5pc0FycmF5KHZhbCk7XG4gICAgfVxuICB9XG5cbiAgLy/nroDljZXlr7nosaHnmoTnroDmmJPliKTmlq1cbiwgaXNQbGFpbk9iamVjdDogZnVuY3Rpb24gKG8pe1xuICAgIGlmICghbyB8fCAoe30pLnRvU3RyaW5nLmNhbGwobykgIT09ICdbb2JqZWN0IE9iamVjdF0nIHx8IG8ubm9kZVR5cGUgfHwgbyA9PT0gby53aW5kb3cpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9ZWxzZXtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIC8v5Ye95pWw5YiH6Z2iLiBvcmlGbiDljp/lp4vlh73mlbAsIGZuIOWIh+mdouihpeWFheWHveaVsFxuICAvL+WJjemdoueahOWHveaVsOi/lOWbnuWAvOS8oOWFpSBicmVha0NoZWNrIOWIpOaWrSwgYnJlYWtDaGVjayDov5Tlm57lgLzkuLrnnJ/ml7bkuI3miafooYzliIfpnaLooaXlhYXnmoTlh73mlbBcbiwgYmVmb3JlRm46IGZ1bmN0aW9uIChvcmlGbiwgZm4sIGJyZWFrQ2hlY2spIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcmV0ID0gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIGlmKGJyZWFrQ2hlY2sgJiYgYnJlYWtDaGVjay5jYWxsKHRoaXMsIHJldCkpe1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgfVxuICAgICAgcmV0dXJuIG9yaUZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfVxuXG4sIGFmdGVyRm46IGZ1bmN0aW9uIChvcmlGbiwgZm4sIGJyZWFrQ2hlY2spIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcmV0ID0gb3JpRm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIGlmKGJyZWFrQ2hlY2sgJiYgYnJlYWtDaGVjay5jYWxsKHRoaXMsIHJldCkpe1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgfVxuICAgICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuICB9XG4gIFxuLCBwYXJzZUtleVBhdGg6IHBhcnNlS2V5UGF0aFxuXG4sIGRlZXBTZXQ6IGZ1bmN0aW9uIChrZXlTdHIsIHZhbHVlLCBvYmopIHtcbiAgICBpZihrZXlTdHIpe1xuICAgICAgdmFyIGNoYWluID0gcGFyc2VLZXlQYXRoKGtleVN0cilcbiAgICAgICAgLCBjdXIgPSBvYmpcbiAgICAgICAgO1xuICAgICAgY2hhaW4uZm9yRWFjaChmdW5jdGlvbihrZXksIGkpIHtcbiAgICAgICAgaWYoaSA9PT0gY2hhaW4ubGVuZ3RoIC0gMSl7XG4gICAgICAgICAgY3VyW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgaWYoY3VyICYmIGN1ci5oYXNPd25Qcm9wZXJ0eShrZXkpKXtcbiAgICAgICAgICAgIGN1ciA9IGN1cltrZXldO1xuICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgY3VyW2tleV0gPSB7fTtcbiAgICAgICAgICAgIGN1ciA9IGN1cltrZXldO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfWVsc2V7XG4gICAgICBleHRlbmQob2JqLCB2YWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH1cbiwgZGVlcEdldDogZnVuY3Rpb24gKGtleVN0ciwgb2JqKSB7XG4gICAgdmFyIGNoYWluLCBjdXIgPSBvYmosIGtleTtcbiAgICBpZihrZXlTdHIpe1xuICAgICAgY2hhaW4gPSBwYXJzZUtleVBhdGgoa2V5U3RyKTtcbiAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSBjaGFpbi5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAga2V5ID0gY2hhaW5baV07XG4gICAgICAgIGlmKGN1ciAmJiBjdXIuaGFzT3duUHJvcGVydHkoa2V5KSl7XG4gICAgICAgICAgY3VyID0gY3VyW2tleV07XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY3VyO1xuICB9XG4sIGV4dGVuZDogZXh0ZW5kXG4sIGNyZWF0ZTogY3JlYXRlXG4sIHRwbFBhcnNlOiB0cGxQYXJzZVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB1dGlsczsiXX0=
(1)
});
