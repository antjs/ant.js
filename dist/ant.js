!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Ant=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
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
    , partials = opts.partials || {}
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
  
  this.filters = filters;
  this.partials = partials;
  
  this._partialInfo = {};
  
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
   */
, setPartial: function(partialInfo) {
    if(!partialInfo){ return; }
    
    partialInfo = extend({}, this._partialInfo[partialInfo.name], partialInfo);
    
    var els, _els, vm
      , name = partialInfo.name
      , target = partialInfo.target
      , partial = partialInfo.content || this.partials[name]
      , path = partialInfo.path || ''
      ;
      
    if(name){
      this._partialInfo[name] = partialInfo;
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
      
      vm.$build(els, partialInfo.context);
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
function travelEl(el, vm, context) {
  context = create(context || {});
  context.assignment = create(context.assignment || {});
  
  if(el.nodeType === NODETYPE.FRAGMENT) {
    el = el.childNodes;
  }
  
  if(('length' in el) && isUndefined(el.nodeType)){
    //node list
    //对于 nodelist 如果其中有包含 {{text}} 直接量的表达式, 文本节点会被分割, 其节点数量可能会动态增加
    for(var i = 0; i < el.length; i++) {
      travelEl(el[i], vm, context);
    }
    return;
  }
  
  if(el.nodeType === NODETYPE.COMMENT){
    //注释节点
    return;
  }else if(el.nodeType === NODETYPE.TEXT){
    //文本节点
    checkText(el, vm, context);
    return;
  }
  
  if(checkAttr(el, vm, context)){
    return;
  }
  
  //template
  //meta element has content, too.
  if(el.content && el.content.nodeType) {
    travelEl(el.content, vm, context);
    el.parentNode && el.parentNode.replaceChild(el.content, el);
    return;
  }
  
  for(var child = el.firstChild, next; child; ){
    next = child.nextSibling;
    travelEl(child, vm, context);
    child = next;
  }
}

//遍历属性
function checkAttr(el, vm, context) {
  var prefix = Ant.prefix
    , dirs = Ant.directive.getDir(el, Ant.directives, prefix)
    , dir
    , terminalPriority, terminal
    ;
  
  for (var i = 0, l = dirs.length; i < l; i++) {
    dir = dirs[i];
    dir.context = context;
    dir.assignment = context.assignment;
   
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
function checkText(node, vm, context) {
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
        checkText(tn, vm, context);
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
      , context: context
      , assignment: context.assignment
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
  var that = this
    , ast = {}
    , summary
    ;
    
  try{
    ast = parse(path, this.token.type);
  }catch(e) {
    e.message = 'SyntaxError in "' + path + '" | ' + e.message;
    console.error(e);
  }
  
  summary = evaluate.summary(ast);
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
    if(isUndefined(val) || val === null) {
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

, $$sPaths: null
, $ant: null
, $key: null

, $watchers: null

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
, $build: function(el, context) {
    travelEl(el, this, context || {});
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

},{"./class.js":2,"./directive.js":3,"./directives":5,"./document.js":9,"./eval.js":10,"./event.js":11,"./parse.js":12,"./token.js":13,"./utils.js":14}],2:[function(_dereq_,module,exports){
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
},{"./utils.js":14}],3:[function(_dereq_,module,exports){
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

},{"./document.js":9,"./token.js":13,"./utils.js":14}],4:[function(_dereq_,module,exports){
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

dirs.partial = _dereq_('./partial.js');
dirs.repeat = _dereq_('./repeat.js');
dirs.attr = _dereq_('./attr.js');
dirs.model = _dereq_('./model.js');

module.exports = dirs;
},{"../document.js":9,"../utils.js":14,"./attr.js":4,"./model.js":6,"./partial.js":7,"./repeat.js":8}],6:[function(_dereq_,module,exports){
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
},{"../token.js":13,"../utils.js":14}],7:[function(_dereq_,module,exports){
"use strict";

var doc = _dereq_('../document.js')
  , utils = _dereq_('../utils.js')
  ;
  
module.exports = {
  terminal: true
, replace: true
, link: function(vm) {
    var that = this
      , ant
      ;

    ant = vm.$root.$ant;
    
    this.pName = this.path;
    this.vm = vm;
    this.path = '';
    
    ant.setPartial({
      name: this.pName
    , target: function(el) { that.el.insertBefore(el, that.node) }
    , escape: this.escape
    , context: this
    });
  }
};
},{"../document.js":9,"../utils.js":14}],8:[function(_dereq_,module,exports){
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
      
      if(this.el.content && !el.content) {
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
      vm.$build(el, {assignment: assignment});
      
      vm['$index'] && vm['$index'].$update(vm.$key);
      
      newAnchors.push(anchor);
      
      for(var node = anchor; node; node = node.nextSibling) {
        if(node.nodeType == 1){ node['$index'] = index + j; }
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

},{"../document.js":9,"../utils.js":14}],9:[function(_dereq_,module,exports){
(function(root){
  "use strict";

  module.exports = root.document || _dereq_('jsdom').jsdom();

})((function() {return this})());
},{}],10:[function(_dereq_,module,exports){
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
        res = null;
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
},{}],11:[function(_dereq_,module,exports){
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
},{"./utils.js":14}],12:[function(_dereq_,module,exports){
"use strict";
//Javascript expression parser modified form Crockford's TDOP parser
var create = Object.create || function (o) {
	function F() {}
	F.prototype = o;
	return new F();
};

var source;

var error = function (message, t) {
	t = t || this;
  var msg = message += " But found '" + t.value + "'" + (t.from ? " at " + t.from : "") + " in '" + source + "'";
  var e = new Error(msg);
	e.name = t.name = "SyntaxError";
	t.message = message;
  throw e;
};

var tokenize = function (code, prefix, suffix) {
	var c; // The current character.
	var from; // The index of the start of the token.
	var i = 0; // The index of the current character.
	var length = code.length;
	var n; // The number value.
	var q; // The quote character.
	var str; // The string value.

	var result = []; // An array to hold the results.

	// Make a token object.
	var make = function (type, value) {
		return {
			type : type,
			value : value,
			from : from,
			to : i
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

		if (c <= ' ') { // Ignore whitespace.
			i += 1;
			c = code.charAt(i);
		} else if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '$' || c === '_') { // name.
			str = c;
			i += 1;
			for (; ; ) {
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
			for (; ; ) {
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
				for (; ; ) {
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
			for (; ; ) {
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
			for (; ; ) {
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
		n.nud = itself;
		n.led = null;
		n.std = null;
		n.lbp = 0;
		return n;
	};

	var advance = function (id) {
		var a,
		o,
		t,
		v;
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
		} else if (a === "string" || a === "number") {
			o = symbol_table["(literal)"];
			a = "literal";
		} else {
			error("Unexpected token.", t);
		}
		token = create(o);
		token.from = t.from;
		token.to = t.to;
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
		nud : function () {
			error("Undefined.", this);
		},
		led : function (left) {
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
		if (context === 'repeat') {
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
	infix("|", 10, function (left) {
		var a;
		this.first = left;
		token.arity = 'filter';
		this.second = expression(10);
		this.arity = 'binary';
		if (token.id === ':') {
			this.arity = 'ternary';
			this.third = a = [];
			while (true) {
				advance(':');
				a.push(expression(0));
				if (token.id !== ":") {
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
		var a = [],
		n,
		v;
		if (token.id !== "}") {
			while (true) {
				n = token;
				if (n.arity !== "name" && n.arity !== "literal") {
					error("Bad property name: ", token);
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
    source = _source;
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

},{}],13:[function(_dereq_,module,exports){
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
},{}],14:[function(_dereq_,module,exports){
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
},{"./document.js":9}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJFOlxcemh1emhhblxcRHJvcGJveFxcY29kZVxcYW50LmpzXFxub2RlX21vZHVsZXNcXGJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3Nlci1wYWNrXFxfcHJlbHVkZS5qcyIsIkU6L3podXpoYW4vRHJvcGJveC9jb2RlL2FudC5qcy9zcmMvYW50LmpzIiwiRTovemh1emhhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy9jbGFzcy5qcyIsIkU6L3podXpoYW4vRHJvcGJveC9jb2RlL2FudC5qcy9zcmMvZGlyZWN0aXZlLmpzIiwiRTovemh1emhhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy9kaXJlY3RpdmVzL2F0dHIuanMiLCJFOi96aHV6aGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL2RpcmVjdGl2ZXMvaW5kZXguanMiLCJFOi96aHV6aGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL2RpcmVjdGl2ZXMvbW9kZWwuanMiLCJFOi96aHV6aGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL2RpcmVjdGl2ZXMvcGFydGlhbC5qcyIsIkU6L3podXpoYW4vRHJvcGJveC9jb2RlL2FudC5qcy9zcmMvZGlyZWN0aXZlcy9yZXBlYXQuanMiLCJFOi96aHV6aGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL2RvY3VtZW50LmpzIiwiRTovemh1emhhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy9ldmFsLmpzIiwiRTovemh1emhhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy9ldmVudC5qcyIsIkU6L3podXpoYW4vRHJvcGJveC9jb2RlL2FudC5qcy9zcmMvcGFyc2UuanMiLCJFOi96aHV6aGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL3Rva2VuLmpzIiwiRTovemh1emhhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy91dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3dUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgZG9jID0gcmVxdWlyZSgnLi9kb2N1bWVudC5qcycpXG4gICwgcGFyc2UgPSByZXF1aXJlKCcuL3BhcnNlLmpzJykucGFyc2VcbiAgLCBldmFsdWF0ZSA9IHJlcXVpcmUoJy4vZXZhbC5qcycpXG4gICwgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJylcbiAgLCBFdmVudCA9IHJlcXVpcmUoJy4vZXZlbnQuanMnKVxuICAsIENsYXNzID0gcmVxdWlyZSgnLi9jbGFzcy5qcycpXG4gICwgRGlyID0gcmVxdWlyZSgnLi9kaXJlY3RpdmUuanMnKVxuICAsIGRpcnMgPSByZXF1aXJlKCcuL2RpcmVjdGl2ZXMnKVxuICAsIHRva2VuID0gcmVxdWlyZSgnLi90b2tlbi5qcycpXG4gIDtcblxuXG52YXIgaXNPYmplY3QgPSB1dGlscy5pc09iamVjdFxuICAsIGlzVW5kZWZpbmVkID0gdXRpbHMuaXNVbmRlZmluZWRcbiAgLCBpc0Z1bmN0aW9uID0gdXRpbHMuaXNGdW5jdGlvblxuICAsIGlzQXJyYXkgPSB1dGlscy5pc0FycmF5XG4gICwgaXNQbGFpbk9iamVjdCA9IHV0aWxzLmlzUGxhaW5PYmplY3RcbiAgLCBwYXJzZUtleVBhdGggPSB1dGlscy5wYXJzZUtleVBhdGhcbiAgLCBkZWVwU2V0ID0gdXRpbHMuZGVlcFNldFxuICAsIGRlZXBHZXQgPSB1dGlscy5kZWVwR2V0XG4gICwgZXh0ZW5kID0gdXRpbHMuZXh0ZW5kXG4gICwgdHBsUGFyc2UgPSB1dGlscy50cGxQYXJzZVxuICAsIGNyZWF0ZSA9IHV0aWxzLmNyZWF0ZVxuICA7XG5cblxuZnVuY3Rpb24gc2V0UHJlZml4KG5ld1ByZWZpeCkge1xuICBpZihuZXdQcmVmaXgpe1xuICAgIHRoaXMucHJlZml4ID0gbmV3UHJlZml4O1xuICB9XG59XG5cblxuLyoqXG4gKiAjIEFudFxuICog5Z+65LqOIGRvbSDnmoTmqKHmnb/lvJXmk44uIOaUr+aMgeaVsOaNrue7keWumlxuICogQHBhcmFtIHtTdHJpbmcgfCBFbGVtZW50fSBbdHBsXSDmqKHmnb/lupTor6XmmK/lkIjms5XogIzkuJTmoIflh4bnmoQgSFRNTCDmoIfnrb7lrZfnrKbkuLLmiJbogIXnm7TmjqXmmK/njrDmnIkgRE9NIOagkeS4reeahOS4gOS4qiBlbGVtZW50IOWvueixoS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0c11cbiAqIEBwYXJhbSB7U3RyaW5nIHwgRWxlbWVudH0gb3B0cy50cGxcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzLmRhdGEg5riy5p+T5qih5p2/55qE5pWw5o2uLiDor6XpobnlpoLmnpzkuLrnqbosIOeojeWQjuWPr+S7peeUqCBgdHBsLnJlbmRlcihtb2RlbClgIOadpea4suafk+eUn+aIkCBodG1sLlxuICogQHBhcmFtIHtCb29sZWFufSBvcHRzLmxhenkg5piv5ZCm5a+5ICdpbnB1dCcg5Y+KICd0ZXh0YXJlYScg55uR5ZCsIGBjaGFuZ2VgIOS6i+S7tiwg6ICM5LiN5pivIGBpbnB1dGAg5LqL5Lu2XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cy5ldmVudHMgXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cy5wYXJ0aWFsc1xuICogQHBhcmFtIHtTdHJpbmcgfCBIVE1MRUxlbWVudH0gb3B0cy5lbFxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIEFudCh0cGwsIG9wdHMpIHtcbiAgaWYoaXNQbGFpbk9iamVjdCh0cGwpKSB7XG4gICAgb3B0cyA9IHRwbDtcbiAgICB0cGwgPSBvcHRzLnRwbDtcbiAgfVxuICBvcHRzID0gb3B0cyB8fCB7fTtcbiAgdmFyIGVsLCB0aGF0ID0gdGhpc1xuICAgICwgZGVmYXVsdHMgPSB0aGlzLmRlZmF1bHRzIHx8IHt9XG4gICAgO1xuXG4gIG9wdHMgPSBleHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBvcHRzKTtcblxuICB2YXIgZGF0YSA9IG9wdHMuZGF0YSB8fCB7fVxuICAgICwgZXZlbnRzID0gb3B0cy5ldmVudHMgfHwge31cbiAgICAsIGZpbHRlcnMgPSBvcHRzLmZpbHRlcnMgfHwge31cbiAgICAsIHdhdGNoZXJzID0gb3B0cy53YXRjaGVycyB8fCB7fVxuICAgICwgcGFydGlhbHMgPSBvcHRzLnBhcnRpYWxzIHx8IHt9XG4gICAgO1xuICBcbiAgZWwgPSB0cGxQYXJzZSh0cGwsIG9wdHMuZWwpO1xuICB0cGwgPSBlbC50cGw7XG4gIGVsID0gZWwuZWw7XG4gIFxuICAvL+WxnuaAp1xuICAvLy0tLS1cbiAgXG4gIHRoaXMub3B0aW9ucyA9IG9wdHM7XG4gIC8qKlxuICAgKiAjIyMgYW50LnRwbFxuICAgKiDmqKHmnb/lrZfnrKbkuLJcbiAgICogQHR5cGUge1N0cmluZ31cbiAgICovXG4gIHRoaXMudHBsID0gdHBsO1xuICBcbiAgLyoqXG4gICAqICMjIyBhbnQuZWxcbiAgICog5qih5p2/IERPTSDlr7nosaEuXG4gICAqIEB0eXBlIHtIVE1MRWxlbWVudE9iamVjdH1cbiAgICovXG4gIHRoaXMuZWwgPSBlbDtcbiAgXG4gIC8qKlxuICAgKiAjIyMgYW50LmRhdGFcbiAgICog57uR5a6a5qih5p2/55qE5pWw5o2uLlxuICAgKiBAdHlwZSB7T2JqZWN0fSDmlbDmja7lr7nosaEsIOS4jeW6lOivpeaYr+aVsOe7hC5cbiAgICovXG4gIHRoaXMuZGF0YSA9IHt9O1xuICBcbiAgdGhpcy5maWx0ZXJzID0gZmlsdGVycztcbiAgdGhpcy5wYXJ0aWFscyA9IHBhcnRpYWxzO1xuICBcbiAgdGhpcy5fcGFydGlhbEluZm8gPSB7fTtcbiAgXG4gIGZvcih2YXIgZXZlbnQgaW4gZXZlbnRzKSB7XG4gICAgdGhpcy5vbihldmVudCwgZXZlbnRzW2V2ZW50XSk7XG4gIH1cbiAgXG4gIGJ1aWxkVmlld01vZGVsLmNhbGwodGhpcyk7XG4gIFxuICBmb3IodmFyIGtleVBhdGggaW4gd2F0Y2hlcnMpIHtcbiAgICB0aGlzLndhdGNoKGtleVBhdGgsIHdhdGNoZXJzW2tleVBhdGhdLmJpbmQodGhpcykpO1xuICB9XG4gIFxuICAvL+i/memHjOmcgOimgeWQiOW5tuWPr+iDveWtmOWcqOeahCB0aGlzLmRhdGFcbiAgLy/ooajljZXmjqfku7blj6/og73kvJrmnInpu5jorqTlgLwsIGBidWlsZFZpZXdNb2RlbGAg5ZCO5Lya6buY6K6k5YC85Lya5bm25YWlIGB0aGlzLmRhdGFgIOS4rVxuICBkYXRhID0gZXh0ZW5kKHRoaXMuZGF0YSwgZGF0YSk7XG4gIFxuICBpZihvcHRzLmRhdGEpe1xuICAgIHRoaXMucmVuZGVyKGRhdGEpO1xuICB9XG59XG5cbi8v6Z2Z5oCB5pa55rOV5Y+K5bGe5oCnXG4vLy0tLVxuZXh0ZW5kKEFudCwgQ2xhc3MsIERpciwge1xuICBzZXRQcmVmaXg6IHNldFByZWZpeFxuLCBkb2M6IGRvY1xuLCBkaXJlY3RpdmVzOiB7fVxuLCB1dGlsczogdXRpbHNcbn0pO1xuXG5BbnQuc2V0UHJlZml4KCdhLScpO1xuXG4vL+WGhee9riBkaXJlY3RpdmVcbmZvcih2YXIgZGlyIGluIGRpcnMpIHtcbiAgQW50LmRpcmVjdGl2ZShkaXIsIGRpcnNbZGlyXSk7XG59XG5cbi8v5a6e5L6L5pa55rOVXG4vLy0tLS1cbmV4dGVuZChBbnQucHJvdG90eXBlLCBFdmVudCwge1xuICAvKipcbiAgICogIyMjIGFudC5yZW5kZXJcbiAgICog5riy5p+T5qih5p2/XG4gICAqL1xuICByZW5kZXI6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICBkYXRhID0gZGF0YSB8fCB0aGlzLmRhdGE7XG4gICAgdGhpcy5zZXQoZGF0YSwge2lzRXh0ZW5kOiBmYWxzZX0pO1xuICAgIHRoaXMudHJpZ2dlcigncmVuZGVyJyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgLyoqXG4gICAqICMjIyBhbnQuY2xvbmVcbiAgICog5aSN5Yi25qih5p2/XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0c11cbiAgICogQHJldHVybiB7VGVtcGxhdGVPYmplY3R9IOS4gOS4quaWsCBgQW50YCDlrp7kvotcbiAgICovXG4sIGNsb25lOiBmdW5jdGlvbihvcHRzKSB7XG4gICAgdmFyIG9wdGlvbnMgPSBleHRlbmQodHJ1ZSwge30sIHRoaXMub3B0aW9ucyk7XG4gICAgaWYob3B0cyAmJiBvcHRzLmRhdGEpeyBvcHRpb25zLmRhdGEgPSBudWxsOyB9XG4gICAgcmV0dXJuIG5ldyB0aGlzLmNvbnN0cnVjdG9yKHRoaXMudHBsLCBleHRlbmQodHJ1ZSwgb3B0aW9ucywgb3B0cykpO1xuICB9XG4gIFxuLCBnZXQ6IGZ1bmN0aW9uKGtleSkge1xuICAgIHJldHVybiBkZWVwR2V0KGtleSwgdGhpcy5kYXRhKTtcbiAgfVxuICBcbiAgLyoqXG4gICAqICMjIyBhbnQuc2V0XG4gICAqIOabtOaWsCBgYW50LmRhdGFgIOS4reeahOaVsOaNrlxuICAgKiBAcGFyYW0ge1N0cmluZ30gW2tleV0g5pWw5o2u6Lev5b6ELiBcbiAgICogQHBhcmFtIHtBbnlUeXBlfE9iamVjdH0gdmFsIOaVsOaNruWGheWuuS4g5aaC5p6c5pWw5o2u6Lev5b6E6KKr55yB55WlLCDnrKzkuIDkuKrlj4LmlbDmmK/kuIDkuKrlr7nosaEuIOmCo+S5iCB2YWwg5bCG5pu/5o2iIGFudC5kYXRhIOaIluiAheW5tuWFpeWFtuS4rVxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdF0g5Y+C5pWw6aG5XG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0LnNpbGVuY2Ug5piv5ZCm6Z2Z6Z2Z55qE5pu05paw5pWw5o2u6ICM5LiN6Kem5Y+RIGB1cGRhdGVgIOS6i+S7tuWPiuabtOaWsCBET00uXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0LmlzRXh0ZW5kIOaVsOaNruiuvue9ruexu+Weiy4g5piv5ZCm5bCG5pWw5o2u5bm25YWl5Y6f5pWw5o2uLiBcbiAgICAgICAgICAgIOesrOS4gOS4quWPguaVsOaYr+aVsOaNrui3r+W+hOaYr+ivpeWAvOm7mOiupOS4uiBmYWxzZSwg6ICM56ys5LiA5Liq5pWw5o2u5piv5pWw5o2u5a+56LGh55qE5pe25YCZ5YiZ6buY6K6k5Li6IHRydWVcbiAgICovXG4sIHNldDogZnVuY3Rpb24oa2V5LCB2YWwsIG9wdCkge1xuICAgIHZhciBjaGFuZ2VkLCBpc0V4dGVuZCwgcGFyZW50LCBrZXlzLCBwYXRoO1xuICAgIFxuICAgIGlmKGlzVW5kZWZpbmVkKGtleSkpeyByZXR1cm4gdGhpczsgfVxuICAgIFxuICAgIGlmKGlzT2JqZWN0KGtleSkpe1xuICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgICBvcHQgPSB2YWw7XG4gICAgICBvcHQgPSBvcHQgfHwge307XG4gICAgICBpZihvcHQuaXNFeHRlbmQgIT09IGZhbHNlKXtcbiAgICAgICAgaXNFeHRlbmQgPSB0cnVlO1xuICAgICAgICAvL21vZGVsRXh0ZW5kKHRoaXMuZGF0YSwga2V5LCB0aGlzLl92bSk7XG4gICAgICAgIGV4dGVuZCh0cnVlLCB0aGlzLmRhdGEsIGtleSk7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgaXNFeHRlbmQgPSBmYWxzZTtcbiAgICAgICAgLy90aGlzLmRhdGEgPSBtb2RlbEV4dGVuZCh7fSwga2V5LCB0aGlzLl92bSk7XG4gICAgICAgIHRoaXMuZGF0YSA9IGV4dGVuZCh0cnVlLCB7fSwga2V5KTtcbiAgICAgIH1cbiAgICB9ZWxzZXtcbiAgICAgIG9wdCA9IG9wdCB8fCB7fTtcbiAgICAgIFxuICAgICAgaWYoZGVlcEdldChrZXksIHRoaXMuZGF0YSkgIT09IHZhbCkge1xuICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmKGNoYW5nZWQpe1xuICAgICAgICBpZihvcHQuaXNFeHRlbmQgIT09IHRydWUpe1xuICAgICAgICAgIGtleXMgPSBwYXJzZUtleVBhdGgoa2V5KTtcbiAgICAgICAgICBpZihrZXlzLmxlbmd0aCA+IDEpe1xuICAgICAgICAgICAgcGF0aCA9IGtleXMucG9wKCk7XG4gICAgICAgICAgICBwYXJlbnQgPSBkZWVwR2V0KGtleXMuam9pbignLicpLCB0aGlzLmRhdGEpO1xuICAgICAgICAgICAgaWYoaXNVbmRlZmluZWQocGFyZW50KSl7XG4gICAgICAgICAgICAgIGRlZXBTZXQoa2V5cy5qb2luKCcuJyksIHBhcmVudCA9IHt9LCB0aGlzLmRhdGEpO1xuICAgICAgICAgICAgfWVsc2UgaWYoIWlzT2JqZWN0KHBhcmVudCkpe1xuICAgICAgICAgICAgICB2YXIgb2xkUGFyZW50ID0gcGFyZW50O1xuICAgICAgICAgICAgICBkZWVwU2V0KGtleXMuam9pbignLicpLCBwYXJlbnQgPSB7dG9TdHJpbmc6IGZ1bmN0aW9uKCkgeyByZXR1cm4gb2xkUGFyZW50OyB9fSwgdGhpcy5kYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgIGlmKGtleSl7XG4gICAgICAgICAgICAgIHBhcmVudCA9IHRoaXMuZGF0YTtcbiAgICAgICAgICAgICAgcGF0aCA9IGtleTtcbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICBwYXJlbnQgPSB0aGlzO1xuICAgICAgICAgICAgICBwYXRoID0gJ2RhdGEnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBwYXJlbnRbcGF0aF0gPSBpc09iamVjdCh2YWwpID8gZXh0ZW5kKHRydWUsIGlzQXJyYXkodmFsKSA/IFtdIDoge30sIHZhbCkgOiB2YWw7XG4gICAgICAgICAgLy9wYXJlbnRbcGF0aF0gPSB2YWw7XG4gICAgICAgICAgaXNFeHRlbmQgPSBmYWxzZTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgLy9tb2RlbEV4dGVuZCh0aGlzLmRhdGEsIGRlZXBTZXQoa2V5LCB2YWwsIHt9KSwgdGhpcy5fdm0pO1xuICAgICAgICAgIGV4dGVuZCh0cnVlLCB0aGlzLmRhdGEsIGRlZXBTZXQoa2V5LCB2YWwsIHt9KSk7XG4gICAgICAgICAgaXNFeHRlbmQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGNoYW5nZWQgJiYgKCFvcHQuc2lsZW5jZSkgJiYgKGlzT2JqZWN0KGtleSkgPyB1cGRhdGUuY2FsbCh0aGlzLCBrZXksIGlzRXh0ZW5kLCBvcHQuaXNCdWJibGUpIDogdXBkYXRlLmNhbGwodGhpcywga2V5LCB2YWwsIGlzRXh0ZW5kLCBvcHQuaXNCdWJibGUpKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICAvKipcbiAgICogIyMjIGFudC5zZXRQYXJ0aWFsXG4gICAqIOa3u+WKoOWtkOaooeadv1xuICAgKiBAcGFyYW0ge09iamVjdH0gaW5mbyDlrZDmqKHmnb/kv6Hmga9cbiAgICogQHBhcmFtIHtTdHJpbmd8SFRNTEVsZW1lbnR9IGluZm8uY29udGVudCDlrZDmqKHmnb/lhoXlrrlcbiAgICogQHBhcmFtIHtTdHJpbmd9IFtpbmZvLm5hbWVdIOWtkOaooeadv+agh+ekuuesplxuICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fGZ1bmN0aW9ufSBbaW5mby50YXJnZXRdIOWtkOaooeadv+eahOebruagh+iKgueCuVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtpbmZvLmVzY2FwZV0g5piv5ZCm6L2s5LmJ5a2X56ym5Liy5a2Q5qih5p2/XG4gICAqL1xuLCBzZXRQYXJ0aWFsOiBmdW5jdGlvbihwYXJ0aWFsSW5mbykge1xuICAgIGlmKCFwYXJ0aWFsSW5mbyl7IHJldHVybjsgfVxuICAgIFxuICAgIHBhcnRpYWxJbmZvID0gZXh0ZW5kKHt9LCB0aGlzLl9wYXJ0aWFsSW5mb1twYXJ0aWFsSW5mby5uYW1lXSwgcGFydGlhbEluZm8pO1xuICAgIFxuICAgIHZhciBlbHMsIF9lbHMsIHZtXG4gICAgICAsIG5hbWUgPSBwYXJ0aWFsSW5mby5uYW1lXG4gICAgICAsIHRhcmdldCA9IHBhcnRpYWxJbmZvLnRhcmdldFxuICAgICAgLCBwYXJ0aWFsID0gcGFydGlhbEluZm8uY29udGVudCB8fCB0aGlzLnBhcnRpYWxzW25hbWVdXG4gICAgICAsIHBhdGggPSBwYXJ0aWFsSW5mby5wYXRoIHx8ICcnXG4gICAgICA7XG4gICAgICBcbiAgICBpZihuYW1lKXtcbiAgICAgIHRoaXMuX3BhcnRpYWxJbmZvW25hbWVdID0gcGFydGlhbEluZm87XG4gICAgfVxuICAgIGlmKHBhcnRpYWwpIHtcbiAgICAgIHZtID0gdGhpcy5fdm0uJGdldFZNKHBhdGgpO1xuICAgICAgXG4gICAgICBpZih0eXBlb2YgcGFydGlhbCA9PT0gJ3N0cmluZycpe1xuICAgICAgICBpZihwYXJ0aWFsSW5mby5lc2NhcGUpe1xuICAgICAgICAgIGVscyA9IFtkb2MuY3JlYXRlVGV4dE5vZGUocGFydGlhbCldO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICBfZWxzID0gdHBsUGFyc2UocGFydGlhbCwgJ2RpdicpLmVsLmNoaWxkTm9kZXM7XG4gICAgICAgICAgZWxzID0gW107XG4gICAgICAgICAgZm9yKHZhciBpID0gMCwgbCA9IF9lbHMubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgICAgICAgIGVscy5wdXNoKF9lbHNbaV0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfWVsc2V7XG4gICAgICAgIGVscyA9IFsocGFydGlhbCBpbnN0YW5jZW9mIEFudCkgPyBwYXJ0aWFsLmVsIDogcGFydGlhbF07XG4gICAgICB9XG4gICAgICBcbiAgICAgIGlmKHRhcmdldCl7XG4gICAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSBlbHMubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgICAgICBpc0Z1bmN0aW9uKHRhcmdldCkgPyBcbiAgICAgICAgICAgIHRhcmdldC5jYWxsKHRoaXMsIGVsc1tpXSkgOlxuICAgICAgICAgICAgdGFyZ2V0LmFwcGVuZENoaWxkKGVsc1tpXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFxuICAgICAgdm0uJGJ1aWxkKGVscywgcGFydGlhbEluZm8uY29udGV4dCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiwgd2F0Y2g6IGZ1bmN0aW9uKGtleVBhdGgsIGNhbGxiYWNrKSB7XG4gICAgaWYoY2FsbGJhY2spe1xuICAgICAgYWRkV2F0Y2hlcih0aGlzLl92bSwge3BhdGg6IGtleVBhdGgsIHVwZGF0ZTogY2FsbGJhY2t9KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiwgdW53YXRjaDogZnVuY3Rpb24oa2V5UGF0aCwgY2FsbGJhY2spIHtcbiAgICB2YXIgdm0gPSB0aGlzLl92bS4kZ2V0Vk0oa2V5UGF0aCwge3N0cmljdDogdHJ1ZX0pO1xuICAgIGlmKHZtKXtcbiAgICAgIGZvcih2YXIgaSA9IHZtLiR3YXRjaGVycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSl7XG4gICAgICAgIGlmKHZtLiR3YXRjaGVyc1tpXS50b2tlbi51cGRhdGUgPT09IGNhbGxiYWNrKXtcbiAgICAgICAgICB2bS4kd2F0Y2hlcnMuc3BsaWNlKGksIDEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG59KTtcblxuLyoqXG4gKiDmm7TmlrDmqKHmnb8uIFxuICogQHBhcmFtIHtPYmplY3R9IGRhdGEg6KaB5pu05paw55qE5pWw5o2uLiDlop7ph4/mlbDmja7miJblhajmlrDnmoTmlbDmja4uXG4gKiBAcGFyYW0ge1N0cmluZ30gW2tleVBhdGhdIOmcgOimgeabtOaWsOeahOaVsOaNrui3r+W+hC5cbiAqIEBwYXJhbSB7QW55VHlwZXxPYmplY3R9IFtkYXRhXSDpnIDopoHmm7TmlrDnmoTmlbDmja4uIOecgeeVpeeahOivneWwhuS9v+eUqOeOsOacieeahOaVsOaNri5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW2lzRXh0ZW5kXSDnlYzpnaLmm7TmlrDnsbvlnosuXG4gICAgICAgICAg5Li6IHRydWUg5pe2LCDmmK/mianlsZXlvI/mm7TmlrAsIOWOn+acieeahOaVsOaNruS4jeWPmFxuICAgICAgICAgIOS4uiBmYWxzZSDml7YsIOS4uuabv+aNouabtOaWsCwg5LiN5ZyoIGRhdGEg5Lit55qE5Y+Y6YePLCDlsIblnKggRE9NIOS4reiiq+a4heepui5cbiAqL1xuZnVuY3Rpb24gdXBkYXRlIChrZXlQYXRoLCBkYXRhLCBpc0V4dGVuZCwgaXNCdWJibGUpIHtcbiAgdmFyIGF0dHJzLCB2bSA9IHRoaXMuX3ZtO1xuICBpZihpc09iamVjdChrZXlQYXRoKSl7XG4gICAgaXNCdWJibGUgPSBpc0V4dGVuZDtcbiAgICBpc0V4dGVuZCA9IGRhdGE7XG4gICAgYXR0cnMgPSBkYXRhID0ga2V5UGF0aDtcbiAgfWVsc2UgaWYodHlwZW9mIGtleVBhdGggPT09ICdzdHJpbmcnKXtcbiAgICBrZXlQYXRoID0gcGFyc2VLZXlQYXRoKGtleVBhdGgpLmpvaW4oJy4nKTtcbiAgICBpZihpc1VuZGVmaW5lZChkYXRhKSl7XG4gICAgICBkYXRhID0gdGhpcy5nZXQoa2V5UGF0aCk7XG4gICAgfVxuICAgIGF0dHJzID0gZGVlcFNldChrZXlQYXRoLCBkYXRhLCB7fSk7XG4gICAgdm0gPSB2bS4kZ2V0Vk0oa2V5UGF0aCk7XG4gIH1lbHNle1xuICAgIGRhdGEgPSB0aGlzLmRhdGE7XG4gIH1cbiAgXG4gIGlmKGlzVW5kZWZpbmVkKGlzRXh0ZW5kKSl7IGlzRXh0ZW5kID0gaXNPYmplY3Qoa2V5UGF0aCk7IH1cbiAgdm0uJHVwZGF0ZShkYXRhLCBpc0V4dGVuZCwgaXNCdWJibGUgIT09IGZhbHNlKTtcbiAgcmV0dXJuIHRoaXM7XG59XG5cbmZ1bmN0aW9uIGJ1aWxkVmlld01vZGVsKCkge1xuICB2YXIgdm0gPSBuZXcgVmlld01vZGVsKHtcbiAgICAkYW50OiB0aGlzXG4gIH0pO1xuICBcbiAgdGhpcy5fdm0gPSB2bTtcbiAgdm0uJGJ1aWxkKHRoaXMuZWwpO1xufVxuXG52YXIgTk9ERVRZUEUgPSB7XG4gIEFUVFI6IDJcbiwgVEVYVDogM1xuLCBDT01NRU5UOiA4XG4sIEZSQUdNRU5UOiAxMVxufTtcblxuLy/pgY3ljoblhYPntKDlj4rlhbblrZDlhYPntKDnmoTmiYDmnInlsZ7mgKfoioLngrnlj4rmlofmnKzoioLngrlcbmZ1bmN0aW9uIHRyYXZlbEVsKGVsLCB2bSwgY29udGV4dCkge1xuICBjb250ZXh0ID0gY3JlYXRlKGNvbnRleHQgfHwge30pO1xuICBjb250ZXh0LmFzc2lnbm1lbnQgPSBjcmVhdGUoY29udGV4dC5hc3NpZ25tZW50IHx8IHt9KTtcbiAgXG4gIGlmKGVsLm5vZGVUeXBlID09PSBOT0RFVFlQRS5GUkFHTUVOVCkge1xuICAgIGVsID0gZWwuY2hpbGROb2RlcztcbiAgfVxuICBcbiAgaWYoKCdsZW5ndGgnIGluIGVsKSAmJiBpc1VuZGVmaW5lZChlbC5ub2RlVHlwZSkpe1xuICAgIC8vbm9kZSBsaXN0XG4gICAgLy/lr7nkuo4gbm9kZWxpc3Qg5aaC5p6c5YW25Lit5pyJ5YyF5ZCrIHt7dGV4dH19IOebtOaOpemHj+eahOihqOi+vuW8jywg5paH5pys6IqC54K55Lya6KKr5YiG5YmyLCDlhbboioLngrnmlbDph4/lj6/og73kvJrliqjmgIHlop7liqBcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgZWwubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRyYXZlbEVsKGVsW2ldLCB2bSwgY29udGV4dCk7XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuICBcbiAgaWYoZWwubm9kZVR5cGUgPT09IE5PREVUWVBFLkNPTU1FTlQpe1xuICAgIC8v5rOo6YeK6IqC54K5XG4gICAgcmV0dXJuO1xuICB9ZWxzZSBpZihlbC5ub2RlVHlwZSA9PT0gTk9ERVRZUEUuVEVYVCl7XG4gICAgLy/mlofmnKzoioLngrlcbiAgICBjaGVja1RleHQoZWwsIHZtLCBjb250ZXh0KTtcbiAgICByZXR1cm47XG4gIH1cbiAgXG4gIGlmKGNoZWNrQXR0cihlbCwgdm0sIGNvbnRleHQpKXtcbiAgICByZXR1cm47XG4gIH1cbiAgXG4gIC8vdGVtcGxhdGVcbiAgLy9tZXRhIGVsZW1lbnQgaGFzIGNvbnRlbnQsIHRvby5cbiAgaWYoZWwuY29udGVudCAmJiBlbC5jb250ZW50Lm5vZGVUeXBlKSB7XG4gICAgdHJhdmVsRWwoZWwuY29udGVudCwgdm0sIGNvbnRleHQpO1xuICAgIGVsLnBhcmVudE5vZGUgJiYgZWwucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQoZWwuY29udGVudCwgZWwpO1xuICAgIHJldHVybjtcbiAgfVxuICBcbiAgZm9yKHZhciBjaGlsZCA9IGVsLmZpcnN0Q2hpbGQsIG5leHQ7IGNoaWxkOyApe1xuICAgIG5leHQgPSBjaGlsZC5uZXh0U2libGluZztcbiAgICB0cmF2ZWxFbChjaGlsZCwgdm0sIGNvbnRleHQpO1xuICAgIGNoaWxkID0gbmV4dDtcbiAgfVxufVxuXG4vL+mBjeWOhuWxnuaAp1xuZnVuY3Rpb24gY2hlY2tBdHRyKGVsLCB2bSwgY29udGV4dCkge1xuICB2YXIgcHJlZml4ID0gQW50LnByZWZpeFxuICAgICwgZGlycyA9IEFudC5kaXJlY3RpdmUuZ2V0RGlyKGVsLCBBbnQuZGlyZWN0aXZlcywgcHJlZml4KVxuICAgICwgZGlyXG4gICAgLCB0ZXJtaW5hbFByaW9yaXR5LCB0ZXJtaW5hbFxuICAgIDtcbiAgXG4gIGZvciAodmFyIGkgPSAwLCBsID0gZGlycy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBkaXIgPSBkaXJzW2ldO1xuICAgIGRpci5jb250ZXh0ID0gY29udGV4dDtcbiAgICBkaXIuYXNzaWdubWVudCA9IGNvbnRleHQuYXNzaWdubWVudDtcbiAgIFxuICAgIC8v5a+55LqOIHRlcm1pbmFsIOS4uiB0cnVlIOeahCBkaXJlY3RpdmUsIOWcqOino+aekOWujOWFtuebuOWQjOadg+mHjeeahCBkaXJlY3RpdmUg5ZCO5Lit5pat6YGN5Y6G6K+l5YWD57SgXG4gICAgaWYodGVybWluYWxQcmlvcml0eSA+IGRpci5wcmlvcml0eSkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIFxuICAgIGVsLnJlbW92ZUF0dHJpYnV0ZShkaXIubm9kZU5hbWUpO1xuICAgIFxuICAgIHNldEJpbmRpbmcodm0sIGRpcik7XG4gICBcbiAgICBpZihkaXIudGVybWluYWwpIHtcbiAgICAgIHRlcm1pbmFsID0gdHJ1ZTtcbiAgICAgIHRlcm1pbmFsUHJpb3JpdHkgPSBkaXIucHJpb3JpdHk7XG4gICAgfVxuICB9XG4gIFxuICBpZih0ZXJtaW5hbCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG59XG5cbnZhciBwYXJ0aWFsUmVnID0gL14+XFxzKig/PS4rKS87XG4vL+WkhOeQhuaWh+acrOiKgueCueS4reeahOe7keWumuWNoOS9jeespih7ey4uLn19KVxuZnVuY3Rpb24gY2hlY2tUZXh0KG5vZGUsIHZtLCBjb250ZXh0KSB7XG4gIGlmKHRva2VuLmhhc1Rva2VuKG5vZGUubm9kZVZhbHVlKSkge1xuICAgIHZhciB0b2tlbnMgPSB0b2tlbi5wYXJzZVRva2VuKG5vZGUubm9kZVZhbHVlKVxuICAgICAgLCB0ZXh0TWFwID0gdG9rZW5zLnRleHRNYXBcbiAgICAgICwgZWwgPSBub2RlLnBhcmVudE5vZGVcbiAgICAgIFxuICAgICAgLCB0LCBkaXJcbiAgICAgIDtcbiAgICBcbiAgICAvL+Wwhnt7a2V5fX3liIblibLmiJDljZXni6znmoTmlofmnKzoioLngrlcbiAgICBpZih0ZXh0TWFwLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRleHRNYXAuZm9yRWFjaChmdW5jdGlvbih0ZXh0KSB7XG4gICAgICAgIHZhciB0biA9IGRvYy5jcmVhdGVUZXh0Tm9kZSh0ZXh0KTtcbiAgICAgICAgZWwuaW5zZXJ0QmVmb3JlKHRuLCBub2RlKTtcbiAgICAgICAgY2hlY2tUZXh0KHRuLCB2bSwgY29udGV4dCk7XG4gICAgICB9KTtcbiAgICAgIGVsLnJlbW92ZUNoaWxkKG5vZGUpO1xuICAgIH1lbHNle1xuICAgICAgdCA9IHRva2Vuc1swXTtcbiAgICAgIC8v5YaF572u5ZCE5Y2g5L2N56ym5aSE55CGLiBcbiAgICAgIC8v5a6a5LmJ5paw55qE5Y+C5pWwLCDlsIblhbbmlL7liLAgZGlyZWN0aXZlIOS4reWkhOeQhj9cbiAgICAgIGlmKHBhcnRpYWxSZWcudGVzdCh0LnBhdGgpKSB7XG4gICAgICAgIHQucGF0aCA9IHQucGF0aC5yZXBsYWNlKHBhcnRpYWxSZWcsICcnKTtcbiAgICAgICAgZGlyID0gY3JlYXRlKEFudC5kaXJlY3RpdmVzLnBhcnRpYWwpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIGRpciA9IGNyZWF0ZSh0LmVzY2FwZSA/IEFudC5kaXJlY3RpdmVzLnRleHQgOiBBbnQuZGlyZWN0aXZlcy5odG1sKTtcbiAgICAgIH1cbiAgICAgIHNldEJpbmRpbmcodm0sIGV4dGVuZChkaXIsIHQsIHtcbiAgICAgICAgZWw6IG5vZGVcbiAgICAgICwgY29udGV4dDogY29udGV4dFxuICAgICAgLCBhc3NpZ25tZW50OiBjb250ZXh0LmFzc2lnbm1lbnRcbiAgICAgIH0pKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gc2V0QmluZGluZyh2bSwgZGlyKSB7XG4gIGlmKGRpci5yZXBsYWNlKSB7XG4gICAgdmFyIGVsID0gZGlyLmVsO1xuICAgIGlmKGlzRnVuY3Rpb24oZGlyLnJlcGxhY2UpKSB7XG4gICAgICBkaXIubm9kZSA9IGRpci5yZXBsYWNlKCk7XG4gICAgfWVsc2UgaWYoZGlyLnJlcGxhY2Upe1xuICAgICAgLy9kaXIubm9kZSA9IGRvYy5jcmVhdGVDb21tZW50KGRpci50eXBlICsgJyA9ICcgKyBkaXIucGF0aCk7XG4gICAgICBkaXIubm9kZSA9IGRvYy5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgfVxuICAgIFxuICAgIGRpci5lbCA9IGRpci5lbC5wYXJlbnROb2RlO1xuICAgIGRpci5lbC5yZXBsYWNlQ2hpbGQoZGlyLm5vZGUsIGVsKTtcbiAgfVxuICBcbiAgZGlyLmxpbmsodm0pO1xuICBcbiAgaWYoZGlyLmRpcnMpIHtcbiAgICBkaXIuZGlycy5mb3JFYWNoKGZ1bmN0aW9uKGQpIHtcbiAgICAgIGFkZFdhdGNoZXIodm0sIGV4dGVuZChjcmVhdGUoZGlyKSwgZCkpO1xuICAgIH0pO1xuICB9ZWxzZXtcbiAgICBhZGRXYXRjaGVyKHZtLCBkaXIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGFkZFdhdGNoZXIodm0sIGRpcikge1xuICBpZihkaXIucGF0aCkge1xuICAgIHJldHVybiBuZXcgV2F0Y2hlcih2bSwgZGlyKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBleFBhcnNlKHBhdGgpIHtcbiAgdmFyIHRoYXQgPSB0aGlzXG4gICAgLCBhc3QgPSB7fVxuICAgICwgc3VtbWFyeVxuICAgIDtcbiAgICBcbiAgdHJ5e1xuICAgIGFzdCA9IHBhcnNlKHBhdGgsIHRoaXMudG9rZW4udHlwZSk7XG4gIH1jYXRjaChlKSB7XG4gICAgZS5tZXNzYWdlID0gJ1N5bnRheEVycm9yIGluIFwiJyArIHBhdGggKyAnXCIgfCAnICsgZS5tZXNzYWdlO1xuICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gIH1cbiAgXG4gIHN1bW1hcnkgPSBldmFsdWF0ZS5zdW1tYXJ5KGFzdCk7XG4gIGV4dGVuZCh0aGlzLnRva2VuLCBzdW1tYXJ5KTtcbiAgZXh0ZW5kKHRoaXMsIHN1bW1hcnkpO1xuICB0aGlzLmFzdCA9IGFzdDtcbn07XG5cbmZ1bmN0aW9uIFdhdGNoZXIocmVsYXRpdmVWbSwgdG9rZW4pIHtcbiAgdmFyIGFzcyA9IHRva2VuLmFzc2lnbm1lbnQ7XG4gIFxuICB0aGlzLnRva2VuID0gdG9rZW47XG4gIHRoaXMucmVsYXRpdmVWbSA9IHJlbGF0aXZlVm07XG4gIHRoaXMuYW50ID0gcmVsYXRpdmVWbS4kcm9vdC4kYW50O1xuICBcbiAgdGhpcy52YWwgPSBOYU47XG4gIFxuICB0aGlzLnN0YXRlID0gV2F0Y2hlci5TVEFURV9SRUFEWTtcbiAgXG4gIGV4UGFyc2UuY2FsbCh0aGlzLCB0b2tlbi5wYXRoKTtcbiAgXG4gIHJlbGF0aXZlVm0uJCRzUGF0aHMgPSByZWxhdGl2ZVZtLiQkc1BhdGhzIHx8IFtdO1xuICBcbiAgZm9yKHZhciBpID0gMCwgbCA9IHRoaXMucGF0aHMubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICByZWxhdGl2ZVZtLiRnZXRWTSh0aGlzLnBhdGhzW2ldLCB7YXNzaWdubWVudDogYXNzLCBzUGF0aHM6IHJlbGF0aXZlVm0uJCRzUGF0aHN9KS4kd2F0Y2hlcnMucHVzaCh0aGlzKTtcbiAgfVxuICBcbiAgLy/msqHmnInlj5jph4/nmoTooajovr7lvI9cbiAgaWYoIXRoaXMubG9jYWxzLmxlbmd0aCkge1xuICAgIHRoaXMuZm4oKTtcbiAgfVxufVxuXG5leHRlbmQoV2F0Y2hlciwge1xuICBTVEFURV9SRUFEWTogMFxuLCBTVEFURV9DQUxMRUQ6IDFcbn0sIENsYXNzKTtcblxuZnVuY3Rpb24gd2F0Y2hlclVwZGF0ZSAodmFsKSB7XG4gIHRyeXtcbiAgICB0aGlzLnRva2VuLnVwZGF0ZSh2YWwsIHRoaXMudmFsKTtcbiAgICB0aGlzLnZhbCA9IHZhbDtcbiAgfWNhdGNoKGUpe1xuICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gIH1cbn1cblxuZXh0ZW5kKFdhdGNoZXIucHJvdG90eXBlLCB7XG4gIGZuOiBmdW5jdGlvbigpIHtcbiAgICB2YXIga2V5XG4gICAgICAsIHRoYXQgPSB0aGlzXG4gICAgICAsIGRpciA9IHRoaXMudG9rZW5cbiAgICAgICwgbmV3VmFsXG4gICAgICAsIHZhbHMgPSB7fVxuICAgICAgO1xuICAgICAgXG4gICAgZm9yKHZhciBpID0gMCwgbCA9IHRoaXMubG9jYWxzLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICBrZXkgPSB0aGlzLmxvY2Fsc1tpXTtcbiAgICAgIHZhbHNba2V5XSA9IHRoaXMucmVsYXRpdmVWbS4kZ2V0Vk0oa2V5LCB7YXNzaWdubWVudDogZGlyLmFzc2lnbm1lbnR9KS4kZ2V0RGF0YSgpO1xuICAgICAgXG4gICAgICBpZihkaXIuYXNzaWdubWVudCAmJiBkaXIuYXNzaWdubWVudFtrZXldICYmIHRoaXMucGF0aHMuaW5kZXhPZihrZXkgKyAnLiRpbmRleCcpID49IDApIHtcbiAgICAgICAgdmFsc1trZXldID0gZXh0ZW5kKHsnJGluZGV4JzogZGlyLmFzc2lnbm1lbnRba2V5XVsnJGtleSddICogMX0sIHZhbHNba2V5XSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICBuZXdWYWwgPSB0aGlzLmdldFZhbHVlKHZhbHMpO1xuICAgIFxuICAgIGlmKG5ld1ZhbCAmJiBuZXdWYWwudGhlbikge1xuICAgICAgLy9hIHByb21pc2VcbiAgICAgIG5ld1ZhbC50aGVuKGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICB3YXRjaGVyVXBkYXRlLmNhbGwodGhhdCwgdmFsKTtcbiAgICAgIH0pO1xuICAgIH1lbHNle1xuICAgICAgd2F0Y2hlclVwZGF0ZS5jYWxsKHRoaXMsIG5ld1ZhbCk7XG4gICAgfVxuXG4gICAgdGhpcy5zdGF0ZSA9IFdhdGNoZXIuU1RBVEVfQ0FMTEVEO1xuICB9XG4sIGdldFZhbHVlOiBmdW5jdGlvbih2YWxzKSB7XG4gICAgdmFyIGRpciA9IHRoaXMudG9rZW5cbiAgICAgICwgdmFsXG4gICAgICAsIGZpbHRlcnMgPSBleHRlbmQoe30sIHRoaXMuYW50LmZpbHRlcnMsIGZ1bmN0aW9uKGEsIGIpIHsgIHJldHVybiBiLmJpbmQoZGlyKTsgfSlcbiAgICAgIDtcbiAgICBcbiAgICB0cnl7XG4gICAgICB2YWwgPSBldmFsdWF0ZS5ldmFsKHRoaXMuYXN0LCB7bG9jYWxzOiB2YWxzLCBmaWx0ZXJzOiBmaWx0ZXJzfSk7XG4gICAgfWNhdGNoKGUpe1xuICAgICAgdmFsID0gJyc7XG4gICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgIH1cbiAgICBpZihpc1VuZGVmaW5lZCh2YWwpIHx8IHZhbCA9PT0gbnVsbCkge1xuICAgICAgdmFsID0gJyc7XG4gICAgfVxuICAgIHJldHVybiB2YWw7XG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBWaWV3TW9kZWwob3B0cykge1xuICBleHRlbmQodGhpcywge1xuICAgICRrZXk6ICcnXG4gICwgJHJvb3Q6IHRoaXNcbiAgLCAkd2F0Y2hlcnM6IFtdXG4gIH0sIG9wdHMpO1xufVxuXG5WaWV3TW9kZWwucHJvdG90eXBlID0ge1xuICAkcm9vdDogbnVsbFxuLCAkcGFyZW50OiBudWxsXG5cbiwgJCRzUGF0aHM6IG51bGxcbiwgJGFudDogbnVsbFxuLCAka2V5OiBudWxsXG5cbiwgJHdhdGNoZXJzOiBudWxsXG5cbiwgJHZhbHVlOiBOYU5cbiAgXG4vL+iOt+WPliB2bSDkuI3lrZjlnKjnmoTor53lsIbmlrDlu7rkuIDkuKouXG4vL29wdHMuc3RyaWN0ICDkuI3oh6rliqjmlrDlu7ogdm1cbi8vb3B0cy5zY29wZVxuLCAkZ2V0Vk06IGZ1bmN0aW9uKHBhdGgsIG9wdHMpIHtcbiAgICBwYXRoID0gcGF0aCArICcnO1xuICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgIFxuICAgIHZhciBrZXlcbiAgICAgICwgY3VyID0gb3B0cy5zY29wZSB8fCB0aGlzLiRyb290XG4gICAgICAsIGFzc2lnbm1lbnQgPSBvcHRzLmFzc2lnbm1lbnQgfHwge31cbiAgICAgICwga2V5Q2hhaW4gPSB1dGlscy5wYXJzZUtleVBhdGgocGF0aClcbiAgICAgICwgc1BhdGhzID0gb3B0cy5zUGF0aHMgfHwgW11cbiAgICAgICwgdXBkYXRlLCBzaGlmdFNjb3BlXG4gICAgICA7XG4gICAgXG4gICAgZm9yKHZhciBrZXkgaW4gYXNzaWdubWVudCkge1xuICAgICAgc2hpZnRTY29wZSA9IHRydWU7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgICBcbiAgICBpZihrZXlDaGFpblswXSBpbiBhc3NpZ25tZW50KSB7XG4gICAgICBjdXIgPSBhc3NpZ25tZW50W2tleUNoYWluWzBdXTtcbiAgICAgIGtleUNoYWluLnNoaWZ0KCk7XG4gICAgICBpZihjdXIgIT09IHRoaXMpIHtcbiAgICAgICAgdXBkYXRlID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9ZWxzZXtcbiAgICAgIHVwZGF0ZSA9IHNoaWZ0U2NvcGU7XG4gICAgfVxuICAgIGlmKHBhdGgpe1xuICAgICAgZm9yKHZhciBpID0gMCwgbCA9IGtleUNoYWluLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICAgIGtleSA9IGtleUNoYWluW2ldO1xuICAgICAgICBcbiAgICAgICAgaWYoIWN1cltrZXldKXtcbiAgICAgICAgICBpZihvcHRzLnN0cmljdCl7IHJldHVybiBudWxsOyB9XG4gICAgICAgICAgY3VyW2tleV0gPSBuZXcgVmlld01vZGVsKHtcbiAgICAgICAgICAgICRwYXJlbnQ6IGN1clxuICAgICAgICAgICwgJHJvb3Q6IGN1ci4kcm9vdFxuICAgICAgICAgICwgJGtleToga2V5XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGN1ciA9IGN1cltrZXldO1xuICAgICAgfVxuICAgIH1cbiAgICBpZih1cGRhdGUpIHtcbiAgICAgIHNQYXRocy5wdXNoKGN1ci4kZ2V0S2V5UGF0aCgpKTtcbiAgICB9XG4gICAgcmV0dXJuIGN1cjtcbiAgfVxuICBcbiwgJGdldEtleVBhdGg6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBrZXlQYXRoID0gdGhpcy4ka2V5XG4gICAgICAsIGN1ciA9IHRoaXNcbiAgICAgIDtcbiAgICB3aGlsZShjdXIgPSBjdXIuJHBhcmVudCl7XG4gICAgICBpZihjdXIuJGtleSl7XG4gICAgICAgIGtleVBhdGggPSBjdXIuJGtleSArICcuJyArIGtleVBhdGg7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBrZXlQYXRoO1xuICB9XG5cbiwgJGdldERhdGE6IGZ1bmN0aW9uKGtleSkge1xuICAgIHZhciBjdXJWYWwgPSBkZWVwR2V0KGtleSwgdGhpcy4kcm9vdC4kYW50LmdldCh0aGlzLiRnZXRLZXlQYXRoKCkpKTtcbiAgICByZXR1cm4gY3VyVmFsO1xuICB9XG5cbiwgJHVwZGF0ZTogZnVuY3Rpb24gKGRhdGEsIGlzRXh0ZW5kLCBpc0J1YmJsZSkge1xuICAgIHZhciBtYXAgPSBpc0V4dGVuZCA/IGRhdGEgOiB0aGlzXG4gICAgICAsIHBhcmVudCA9IHRoaXNcbiAgICAgIDtcbiAgICBcbiAgICBmb3IodmFyIGkgPSAwLCBsID0gdGhpcy4kd2F0Y2hlcnMubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgIGlmKCh0aGlzLiR2YWx1ZSAhPT0gZGF0YSkgfHwgdGhpcy4kd2F0Y2hlcnNbaV0uc3RhdGUgPT09IFdhdGNoZXIuU1RBVEVfUkVBRFkpe1xuICAgICAgICB0aGlzLiR3YXRjaGVyc1tpXS5mbigpO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLiR2YWx1ZSA9IGRhdGE7XG4gICAgXG4gICAgaWYoaXNPYmplY3QobWFwKSl7XG4gICAgICBmb3IodmFyIHBhdGggaW4gbWFwKSB7XG4gICAgICAgIC8v5Lyg5YWl55qE5pWw5o2u6ZSu5YC85LiN6IO95ZKMIHZtIOS4reeahOiHquW4puWxnuaAp+WQjeebuOWQjC5cbiAgICAgICAgLy/miYDku6XkuI3mjqjojZDkvb/nlKggJyQnIOS9nOS4uiBKU09OIOaVsOaNrumUruWAvOeahOW8gOWktC5cbiAgICAgICAgaWYodGhpcy5oYXNPd25Qcm9wZXJ0eShwYXRoKSAmJiAoIShwYXRoIGluIFZpZXdNb2RlbC5wcm90b3R5cGUpKSl7XG4gICAgICAgICAgdGhpc1twYXRoXS4kdXBkYXRlKGRhdGEgPyBkYXRhW3BhdGhdIDogdm9pZCgwKSwgaXNFeHRlbmQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYoaXNCdWJibGUpe1xuICAgICAgd2hpbGUocGFyZW50ID0gcGFyZW50LiRwYXJlbnQpe1xuICAgICAgICBmb3IodmFyIGkgPSAwLCBsID0gcGFyZW50LiR3YXRjaGVycy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgICAgIHBhcmVudC4kd2F0Y2hlcnNbaV0uZm4oKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuLCAkYnVpbGQ6IGZ1bmN0aW9uKGVsLCBjb250ZXh0KSB7XG4gICAgdHJhdmVsRWwoZWwsIHRoaXMsIGNvbnRleHQgfHwge30pO1xuICAgIHZhciBhbnQgPSB0aGlzLiRyb290LiRhbnQ7XG4gICAgXG4gICAgLy/mlrDliqDlhaXmqKHmnb/lkI7mm7TmlrBcbiAgICB0aGlzLiR1cGRhdGUoYW50LmdldCh0aGlzLiRnZXRLZXlQYXRoKCkpLCB0cnVlKTtcbiAgICBcbiAgICAvL+W8leeUqOeItue6p+S9nOeUqOWfn+WPmOmHj+aXtiwg6Ieq5Yqo6L+Q566XXG4gICAgaWYodGhpcy4kJHNQYXRocykge1xuICAgICAgZm9yKHZhciBpID0gMCwgbCA9IHRoaXMuJCRzUGF0aHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHRoaXMuJGdldFZNKHRoaXMuJCRzUGF0aHNbaV0pLiR1cGRhdGUoYW50LmdldCh0aGlzLiQkc1BhdGhzW2ldKSwgdHJ1ZSk7XG4gICAgICB9XG4gICAgICB0aGlzLiQkc1BhdGhzID0gbnVsbDtcbiAgICB9XG4gIH1cbn07XG5cbkFudC52ZXJzaW9uID0gJyVWRVJTSU9OJztcblxubW9kdWxlLmV4cG9ydHMgPSBBbnQ7XG4iLCJ2YXIgZXh0ZW5kID0gcmVxdWlyZSgnLi91dGlscy5qcycpLmV4dGVuZDtcblxudmFyIENsYXNzID0ge1xuICAvKiogXG4gICAqIOaehOmAoOWHveaVsOe7p+aJvy4gXG4gICAqIOWmgjogYHZhciBDYXIgPSBBbnQuZXh0ZW5kKHtkcml2ZTogZnVuY3Rpb24oKXt9fSk7IG5ldyBDYXIoKTtgXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbcHJvdG9Qcm9wc10g5a2Q5p6E6YCg5Ye95pWw55qE5omp5bGV5Y6f5Z6L5a+56LGhXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbc3RhdGljUHJvcHNdIOWtkOaehOmAoOWHveaVsOeahOaJqeWxlemdmeaAgeWxnuaAp1xuICAgKiBAcmV0dXJuIHtGdW5jdGlvbn0g5a2Q5p6E6YCg5Ye95pWwXG4gICAqL1xuICBleHRlbmQ6IGZ1bmN0aW9uIChwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykge1xuICAgIHByb3RvUHJvcHMgPSBwcm90b1Byb3BzIHx8IHt9O1xuICAgIHZhciBjb25zdHJ1Y3RvciA9IHByb3RvUHJvcHMuaGFzT3duUHJvcGVydHkoJ2NvbnN0cnVjdG9yJykgPyBwcm90b1Byb3BzLmNvbnN0cnVjdG9yIDogZnVuY3Rpb24oKXsgcmV0dXJuIHN1cC5hcHBseSh0aGlzLCBhcmd1bWVudHMpOyB9XG4gICAgdmFyIHN1cCA9IHRoaXM7XG4gICAgdmFyIEZuID0gZnVuY3Rpb24oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBjb25zdHJ1Y3RvcjsgfTtcbiAgICBcbiAgICBGbi5wcm90b3R5cGUgPSBzdXAucHJvdG90eXBlO1xuICAgIGNvbnN0cnVjdG9yLnByb3RvdHlwZSA9IG5ldyBGbigpO1xuICAgIGV4dGVuZChjb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpO1xuICAgIGV4dGVuZChjb25zdHJ1Y3Rvciwgc3VwLCBzdGF0aWNQcm9wcywge19fc3VwZXJfXzogc3VwLnByb3RvdHlwZX0pO1xuICAgIFxuICAgIHJldHVybiBjb25zdHJ1Y3RvcjtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDbGFzczsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpXG4gICwgdG9rZW4gPSByZXF1aXJlKCcuL3Rva2VuLmpzJylcbiAgLCBkb2MgPSByZXF1aXJlKCcuL2RvY3VtZW50LmpzJylcbiAgO1xuXG4vKipcbiAqIOS4uiBBbnQg5p6E6YCg5Ye95pWw5re75Yqg5oyH5LukIChkaXJlY3RpdmUpLiBgQW50LmRpcmVjdGl2ZWBcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXkgZGlyZWN0aXZlIOWQjeensFxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRzXSBkaXJlY3RpdmUg5Y+C5pWwXG4gKiBAcGFyYW0ge051bWJlcn0gb3B0cy5wcmlvcml0eT0wIGRpcmVjdGl2ZSDkvJjlhYjnuqcuIOWQjOS4gOS4quWFg+e0oOS4iueahOaMh+S7pOaMieeFp+S8mOWFiOe6p+mhuuW6j+aJp+ihjC4gXG4gKiBAcGFyYW0ge0Jvb2xlYW59IG9wdHMudGVybWluYWw9ZmFsc2Ug5omn6KGM6K+lIGRpcmVjdGl2ZSDlkI4sIOaYr+WQpue7iOatouWQjue7rSBkaXJlY3RpdmUg5omn6KGMLlxuICogICB0ZXJtaW5hbCDkuLrnnJ/ml7YsIOS4juivpSBkaXJlY3RpdmUg5LyY5YWI57qn55u45ZCM55qEIGRpcmVjdGl2ZSDku43kvJrnu6fnu63miafooYwsIOi+g+S9juS8mOWFiOe6p+eahOaJjeS8muiiq+W/veeVpS5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0cy5hbmNob3IgYW5jaG9yIOS4uiB0cnVlIOaXtiwg5Lya5Zyo5oyH5Luk6IqC54K55YmN5ZCO5ZCE5Lqn55Sf5LiA5Liq56m655m955qE5qCH6K6w6IqC54K5LiDliIbliKvlr7nlupQgYGFuY2hvcnMuc3RhcnRgIOWSjCBgYW5jaG9ycy5lbmRgXG4gKi9cbmZ1bmN0aW9uIGRpcmVjdGl2ZShrZXksIG9wdHMpIHtcbiAgdmFyIGRpcnMgPSB0aGlzLmRpcmVjdGl2ZXMgPSB0aGlzLmRpcmVjdGl2ZXMgfHwge307XG4gIFxuICByZXR1cm4gZGlyc1trZXldID0gbmV3IERpcmVjdGl2ZShrZXksIG9wdHMpO1xufVxuXG5mdW5jdGlvbiBEaXJlY3RpdmUoa2V5LCBvcHRzKSB7XG4gIHRoaXMudHlwZSA9IGtleTtcbiAgdXRpbHMuZXh0ZW5kKHRoaXMsIG9wdHMpO1xufVxuXG5EaXJlY3RpdmUucHJvdG90eXBlID0ge1xuICBwcmlvcml0eTogMFxuLCBsaW5rOiB1dGlscy5ub29wXG4sIHVwZGF0ZTogdXRpbHMubm9vcFxuLCB0ZWFyRG93bjogdXRpbHMubm9vcFxuLCB0ZXJtaW5hbDogZmFsc2VcbiwgcmVwbGFjZTogZmFsc2VcblxuLCBhbmNob3I6IGZhbHNlXG4sIGFuY2hvcnM6IG51bGxcblxuICAvL+W9kyBhbmNob3Ig5Li6IHRydWUg5pe2LCDojrflj5bkuKTkuKrplJrngrnkuYvpl7TnmoTmiYDmnInoioLngrkuXG4sIGdldE5vZGVzOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgbm9kZXMgPSBbXSwgbm9kZSA9IHRoaXMuYW5jaG9ycy5zdGFydC5uZXh0U2libGluZztcbiAgICBpZih0aGlzLmFuY2hvciAmJiBub2RlKSB7XG4gICAgICB3aGlsZShub2RlICE9PSB0aGlzLmFuY2hvcnMuZW5kKXtcbiAgICAgICAgbm9kZXMucHVzaChub2RlKTtcbiAgICAgICAgbm9kZSA9IG5vZGUubmV4dFNpYmxpbmc7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHJldHVybiBub2RlcztcbiAgICB9ZWxzZXtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxufTtcblxuLy/ojrflj5bkuIDkuKrlhYPntKDkuIrmiYDmnInnlKggSFRNTCDlsZ7mgKflrprkuYnnmoTmjIfku6RcbmZ1bmN0aW9uIGdldERpcihlbCwgZGlyZWN0aXZlcywgcHJlZml4KSB7XG4gIHByZWZpeCA9IHByZWZpeCB8fCAnJztcbiAgZGlyZWN0aXZlcyA9IGRpcmVjdGl2ZXMgfHwge307XG4gIFxuICB2YXIgYXR0ciwgYXR0ck5hbWUsIGRpck5hbWVcbiAgICAsIGRpcnMgPSBbXSwgZGlyLCBhbmNob3JzID0ge31cbiAgICAsIHBhcmVudCA9IGVsLnBhcmVudE5vZGVcbiAgICA7XG4gICAgXG4gIGZvcih2YXIgaSA9IGVsLmF0dHJpYnV0ZXMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pe1xuICAgIGF0dHIgPSBlbC5hdHRyaWJ1dGVzW2ldO1xuICAgIGF0dHJOYW1lID0gYXR0ci5ub2RlTmFtZTtcbiAgICBkaXJOYW1lID0gYXR0ck5hbWUuc2xpY2UocHJlZml4Lmxlbmd0aCk7XG4gICAgaWYoYXR0ck5hbWUuaW5kZXhPZihwcmVmaXgpID09PSAwICYmIChkaXJOYW1lIGluIGRpcmVjdGl2ZXMpKSB7XG4gICAgICBkaXIgPSB1dGlscy5jcmVhdGUoZGlyZWN0aXZlc1tkaXJOYW1lXSk7XG4gICAgICBkaXIuZGlyTmFtZSA9IGRpck5hbWVcbiAgICB9ZWxzZSBpZih0b2tlbi5oYXNUb2tlbihhdHRyLnZhbHVlKSkge1xuICAgICAgZGlyID0gdXRpbHMuY3JlYXRlKGRpcmVjdGl2ZXNbJ2F0dHInXSk7XG4gICAgICBkaXIuZGlycyA9IHRva2VuLnBhcnNlVG9rZW4oYXR0ci52YWx1ZSk7XG4gICAgICBkaXIuZGlyTmFtZSA9IGF0dHJOYW1lLmluZGV4T2YocHJlZml4KSA9PT0gMCA/IGRpck5hbWUgOiBhdHRyTmFtZSA7XG4gICAgfWVsc2V7XG4gICAgICBkaXIgPSBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgaWYoZGlyKSB7XG4gICAgICBpZihkaXIuYW5jaG9yICYmICFhbmNob3JzLnN0YXJ0KSB7XG4gICAgICAgIC8v5ZCM5LiA5Liq5YWD57Sg5LiK55qEIGRpcmVjdGl2ZSDlhbHkuqvlkIzkuIDlr7nplJrngrlcbiAgICAgICAgYW5jaG9ycy5zdGFydCA9IGRvYy5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICAgIHBhcmVudC5pbnNlcnRCZWZvcmUoYW5jaG9ycy5zdGFydCwgZWwpO1xuICAgICAgICBcbiAgICAgICAgYW5jaG9ycy5lbmQgPSBkb2MuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgICAgICBpZihlbC5uZXh0U2libGluZykge1xuICAgICAgICAgIHBhcmVudC5pbnNlcnRCZWZvcmUoYW5jaG9ycy5lbmQsIGVsLm5leHRTaWJsaW5nKTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgcGFyZW50LmFwcGVuZENoaWxkKGFuY2hvcnMuZW5kKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZGlycy5wdXNoKHV0aWxzLmV4dGVuZChkaXIsIHtlbDogZWwsIG5vZGU6IGF0dHIsIG5vZGVOYW1lOiBhdHRyTmFtZSwgcGF0aDogYXR0ci52YWx1ZSwgYW5jaG9yczogZGlyLmFuY2hvciA/IGFuY2hvcnMgOiBudWxsfSkpO1xuICAgIH1cbiAgfVxuICBkaXJzLnNvcnQoZnVuY3Rpb24oZDAsIGQxKSB7XG4gICAgcmV0dXJuIGQxLnByaW9yaXR5IC0gZDAucHJpb3JpdHk7XG4gIH0pO1xuICByZXR1cm4gZGlycztcbn1cblxuZGlyZWN0aXZlLmdldERpciA9IGdldERpcjtcblxuZXhwb3J0cy5kaXJlY3RpdmUgPSBkaXJlY3RpdmU7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGF0dHJQb3N0UmVnID0gL1xcPyQvO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgbGluazogZnVuY3Rpb24oKSB7XG4gICAgaWYodGhpcy5kaXJOYW1lID09PSB0aGlzLnR5cGUpIHsvL2F0dHIgYmluZGluZ1xuICAgICAgdGhpcy5hdHRycyA9IHt9O1xuICAgIH1lbHNlIHtcbiAgICAgIGlmKGF0dHJQb3N0UmVnLnRlc3QodGhpcy5kaXJOYW1lKSkgey8vIHNvbWVBdHRyPyBjb25kaXRpb24gYmluZGluZ1xuICAgICAgICB0aGlzLmRpck5hbWUgPSB0aGlzLmRpck5hbWUucmVwbGFjZShhdHRyUG9zdFJlZywgJycpO1xuICAgICAgICB0aGlzLmNvbmRpdGlvbmFsQXR0ciA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICB9XG4sIHVwZGF0ZTogZnVuY3Rpb24odmFsKSB7XG4gICAgdmFyIGVsID0gdGhpcy5lbDtcbiAgICBpZih0aGlzLmRpck5hbWUgPT09IHRoaXMudHlwZSkge1xuICAgICAgZm9yKHZhciBhdHRyIGluIHZhbCkge1xuICAgICAgICBzZXRBdHRyKGVsLCBhdHRyLCB2YWxbYXR0cl0pO1xuICAgICAgICAvL2lmKHZhbFthdHRyXSkge1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLmF0dHJzW2F0dHJdO1xuICAgICAgICAvL31cbiAgICAgIH1cbiAgICAgIFxuICAgICAgZm9yKHZhciBhdHRyIGluIHRoaXMuYXR0cnMpIHtcbiAgICAgICAgcmVtb3ZlQXR0cihlbCwgYXR0cik7XG4gICAgICB9XG4gICAgICB0aGlzLmF0dHJzID0gdmFsO1xuICAgIH1lbHNle1xuICAgICAgaWYodGhpcy5jb25kaXRpb25hbEF0dHIpIHtcbiAgICAgICAgdmFsID8gc2V0QXR0cihlbCwgdGhpcy5kaXJOYW1lLCB2YWwpIDogcmVtb3ZlQXR0cihlbCwgdGhpcy5kaXJOYW1lKTtcbiAgICAgIH1lbHNle1xuICAgICAgICB0aGlzLnRleHRNYXBbdGhpcy5wb3NpdGlvbl0gPSB2YWwgJiYgKHZhbCArICcnKTtcbiAgICAgICAgc2V0QXR0cihlbCwgdGhpcy5kaXJOYW1lLCB0aGlzLnRleHRNYXAuam9pbignJykpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuXG4vL0lFIOa1j+iniOWZqOW+iOWkmuWxnuaAp+mAmui/hyBgc2V0QXR0cmlidXRlYCDorr7nva7lkI7ml6DmlYguIFxuLy/ov5nkupvpgJrov4cgYGVsW2F0dHJdID0gdmFsdWVgIOiuvue9rueahOWxnuaAp+WNtOiDveWkn+mAmui/hyBgcmVtb3ZlQXR0cmlidXRlYCDmuIXpmaQuXG5mdW5jdGlvbiBzZXRBdHRyKGVsLCBhdHRyLCB2YWwpe1xuICB0cnl7XG4gICAgaWYoKChhdHRyIGluIGVsKSB8fCBhdHRyID09PSAnY2xhc3MnKSl7XG4gICAgICBpZihhdHRyID09PSAnc3R5bGUnICYmIGVsLnN0eWxlLnNldEF0dHJpYnV0ZSl7XG4gICAgICAgIGVsLnN0eWxlLnNldEF0dHJpYnV0ZSgnY3NzVGV4dCcsIHZhbCk7XG4gICAgICB9ZWxzZSBpZihhdHRyID09PSAnY2xhc3MnKXtcbiAgICAgICAgZWwuY2xhc3NOYW1lID0gdmFsO1xuICAgICAgfWVsc2V7XG4gICAgICAgIGVsW2F0dHJdID0gdHlwZW9mIGVsW2F0dHJdID09PSAnYm9vbGVhbicgPyB0cnVlIDogdmFsO1xuICAgICAgfVxuICAgIH1cbiAgfWNhdGNoKGUpe31cbiAgdHJ5e1xuICAgIC8vY2hyb21lIHNldGF0dHJpYnV0ZSB3aXRoIGB7e319YCB3aWxsIHRocm93IGFuIGVycm9yXG4gICAgZWwuc2V0QXR0cmlidXRlKGF0dHIsIHZhbCk7XG4gIH1jYXRjaChlKXsgY29uc29sZS53YXJuKGUpIH1cbn1cblxuZnVuY3Rpb24gcmVtb3ZlQXR0cihlbCwgYXR0cikge1xuICBlbC5yZW1vdmVBdHRyaWJ1dGUoYXR0cik7XG4gIGRlbGV0ZSBlbFthdHRyXTtcbn0iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGRvYyA9IHJlcXVpcmUoJy4uL2RvY3VtZW50LmpzJylcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJylcbiAgO1xuXG52YXIgZGlycyA9IHt9O1xuXG5cbmRpcnMudGV4dCA9IHtcbiAgdGVybWluYWw6IHRydWVcbiwgcmVwbGFjZTogdHJ1ZVxuLCB1cGRhdGU6IGZ1bmN0aW9uKHZhbCkge1xuICAgIHRoaXMubm9kZS5ub2RlVmFsdWUgPSB1dGlscy5pc1VuZGVmaW5lZCh2YWwpID8gJycgOiB2YWw7XG4gIH1cbn07XG5cblxuZGlycy5odG1sID0ge1xuICB0ZXJtaW5hbDogdHJ1ZVxuLCByZXBsYWNlOiB0cnVlXG4sIGxpbms6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMubm9kZXMgPSBbXTtcbiAgfVxuLCB1cGRhdGU6IGZ1bmN0aW9uKHZhbCkge1xuICAgIHZhciBlbCA9IGRvYy5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBlbC5pbm5lckhUTUwgPSB1dGlscy5pc1VuZGVmaW5lZCh2YWwpID8gJycgOiB2YWw7XG4gICAgXG4gICAgdmFyIG5vZGU7XG4gICAgd2hpbGUobm9kZSA9IHRoaXMubm9kZXMucG9wKCkpIHtcbiAgICAgIG5vZGUucGFyZW50Tm9kZSAmJiBub2RlLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm9kZSk7XG4gICAgfVxuICAgIFxuICAgIHZhciBub2RlcyA9IGVsLmNoaWxkTm9kZXM7XG4gICAgd2hpbGUobm9kZSA9IG5vZGVzWzBdKSB7XG4gICAgICB0aGlzLm5vZGVzLnB1c2gobm9kZSk7XG4gICAgICB0aGlzLmVsLmluc2VydEJlZm9yZShub2RlLCB0aGlzLm5vZGUpO1xuICAgIH1cbiAgfVxufTtcblxuICBcbmRpcnNbJ2lmJ10gPSB7XG4gIGFuY2hvcjogdHJ1ZVxuLCBsaW5rOiBmdW5jdGlvbigpIHtcbiAgICBpZih0aGlzLmVsLmNvbnRlbnQpIHtcbiAgICAgIHRoaXMuZnJhZyA9IHRoaXMuZWwuY29udGVudDtcbiAgICAgIHRoaXMuZWwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLmVsKTtcbiAgICB9ZWxzZXtcbiAgICAgIHRoaXMuZnJhZyA9IGRvYy5jcmVhdGVEb2N1bWVudEZyYWdtZW50KClcbiAgICAgIHRoaXMuaGlkZSgpO1xuICAgIH1cbiAgfVxuLCB1cGRhdGU6IGZ1bmN0aW9uKHZhbCkge1xuICAgIGlmKHZhbCkge1xuICAgICAgaWYoIXRoaXMuc3RhdGUpIHsgdGhpcy5zaG93KCkgfVxuICAgIH1lbHNle1xuICAgICAgaWYodGhpcy5zdGF0ZSkgeyB0aGlzLmhpZGUoKTsgfVxuICAgIH1cbiAgICB0aGlzLnN0YXRlID0gdmFsO1xuICB9XG4gIFxuLCBzaG93OiBmdW5jdGlvbigpIHtcbiAgICB2YXIgYW5jaG9yID0gdGhpcy5hbmNob3JzLmVuZDtcbiAgICBcbiAgICBhbmNob3IucGFyZW50Tm9kZSAmJiBhbmNob3IucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5mcmFnLCBhbmNob3IpO1xuICB9XG4sIGhpZGU6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBub2RlcyA9IHRoaXMuZ2V0Tm9kZXMoKTtcbiAgICBcbiAgICBpZihub2Rlcykge1xuICAgICAgZm9yKHZhciBpID0gMCwgbCA9IG5vZGVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB0aGlzLmZyYWcuYXBwZW5kQ2hpbGQobm9kZXNbaV0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuZGlycy50ZW1wbGF0ZSA9IHtcbiAgcHJpb3JpdHk6IDEwMDAwXG4sIGxpbms6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBub2RlcyA9IHRoaXMuZWwuY2hpbGROb2Rlc1xuICAgICAgLCBmcmFnID0gZG9jLmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKVxuICAgICAgO1xuXG4gICAgd2hpbGUobm9kZXNbMF0pIHtcbiAgICAgIGZyYWcuYXBwZW5kQ2hpbGQobm9kZXNbMF0pO1xuICAgIH1cbiAgICBcbiAgICB0aGlzLmVsLmNvbnRlbnQgPSBmcmFnO1xuICAgIFxuICAgIC8vdGhpcy5lbC5zZXRBdHRyaWJ1dGUodGhpcy5ub2RlTmFtZSwgJycpO1xuICB9XG59O1xuXG5kaXJzLnBhcnRpYWwgPSByZXF1aXJlKCcuL3BhcnRpYWwuanMnKTtcbmRpcnMucmVwZWF0ID0gcmVxdWlyZSgnLi9yZXBlYXQuanMnKTtcbmRpcnMuYXR0ciA9IHJlcXVpcmUoJy4vYXR0ci5qcycpO1xuZGlycy5tb2RlbCA9IHJlcXVpcmUoJy4vbW9kZWwuanMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBkaXJzOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpXG4gICwgaGFzVG9rZW4gPSByZXF1aXJlKCcuLi90b2tlbi5qcycpLmhhc1Rva2VuXG4gIDtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHRlbWluYWw6IHRydWVcbiwgcHJpb3JpdHk6IDFcbiwgbGluazogZnVuY3Rpb24odm0pIHtcbiAgICB2YXIga2V5UGF0aCA9IHRoaXMucGF0aDtcbiAgICBcbiAgICBpZigha2V5UGF0aCkgeyByZXR1cm4gZmFsc2U7IH1cbiAgICBcbiAgICB2YXIgZWwgPSB0aGlzLmVsXG4gICAgICAsIGV2ID0gJ2NoYW5nZSdcbiAgICAgICwgYXR0ciwgdmFsdWUgPSBhdHRyID0gJ3ZhbHVlJ1xuICAgICAgLCBhbnQgPSB2bS4kcm9vdC4kYW50XG4gICAgICAsIGN1ciA9IHZtLiRnZXRWTShrZXlQYXRoLCB7YXNzaWdubWVudDogdGhpcy5hc3NpZ25tZW50fSlcbiAgICAgICwgaXNTZXREZWZhdXQgPSB1dGlscy5pc1VuZGVmaW5lZChhbnQuZ2V0KGN1ci4kZ2V0S2V5UGF0aCgpKSkvL+eVjOmdoueahOWIneWni+WAvOS4jeS8muimhuebliBtb2RlbCDnmoTliJ3lp4vlgLxcbiAgICAgICwgY3JsZiA9IC9cXHJcXG4vZy8vSUUgOCDkuIsgdGV4dGFyZWEg5Lya6Ieq5Yqo5bCGIFxcbiDmjaLooYznrKbmjaLmiJAgXFxyXFxuLiDpnIDopoHlsIblhbbmm7/mjaLlm57mnaVcbiAgICAgICwgY2FsbGJhY2sgPSBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgICAvL+aJp+ihjOi/memHjOeahOaXtuWAmSwg5b6I5Y+v6IO9IHJlbmRlciDov5jmnKrmiafooYwuIHZtLiRnZXREYXRhKGtleVBhdGgpIOacquWumuS5iSwg5LiN6IO96L+U5Zue5paw6K6+572u55qE5YC8XG4gICAgICAgICAgdmFyIG5ld1ZhbCA9ICh2YWwgfHwgdm0uJGdldERhdGEoa2V5UGF0aCkgfHwgJycpICsgJydcbiAgICAgICAgICAgICwgdmFsID0gZWxbYXR0cl1cbiAgICAgICAgICAgIDtcbiAgICAgICAgICB2YWwgJiYgdmFsLnJlcGxhY2UgJiYgKHZhbCA9IHZhbC5yZXBsYWNlKGNybGYsICdcXG4nKSk7XG4gICAgICAgICAgaWYobmV3VmFsICE9PSB2YWwpeyBlbFthdHRyXSA9IG5ld1ZhbDsgfVxuICAgICAgICB9XG4gICAgICAsIGhhbmRsZXIgPSBmdW5jdGlvbihpc0luaXQpIHtcbiAgICAgICAgICB2YXIgdmFsID0gZWxbdmFsdWVdO1xuICAgICAgICAgIFxuICAgICAgICAgIHZhbC5yZXBsYWNlICYmICh2YWwgPSB2YWwucmVwbGFjZShjcmxmLCAnXFxuJykpO1xuICAgICAgICAgIGFudC5zZXQoY3VyLiRnZXRLZXlQYXRoKCksIHZhbCwge2lzQnViYmxlOiBpc0luaXQgIT09IHRydWV9KTtcbiAgICAgICAgfVxuICAgICAgLCBjYWxsSGFuZGxlciA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICBpZihlICYmIGUucHJvcGVydHlOYW1lICYmIGUucHJvcGVydHlOYW1lICE9PSBhdHRyKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICAgICAgICB9XG4gICAgICAsIGllID0gdXRpbHMuaWVcbiAgICAgIDtcbiAgICBcbiAgICBzd2l0Y2goZWwudGFnTmFtZSkge1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdmFsdWUgPSBhdHRyID0gJ2lubmVySFRNTCc7XG4gICAgICAgIC8vZXYgKz0gJyBibHVyJztcbiAgICAgIGNhc2UgJ0lOUFVUJzpcbiAgICAgIGNhc2UgJ1RFWFRBUkVBJzpcbiAgICAgICAgc3dpdGNoKGVsLnR5cGUpIHtcbiAgICAgICAgICBjYXNlICdjaGVja2JveCc6XG4gICAgICAgICAgICB2YWx1ZSA9IGF0dHIgPSAnY2hlY2tlZCc7XG4gICAgICAgICAgICAvL0lFNiwgSUU3IOS4i+ebkeWQrCBwcm9wZXJ0eWNoYW5nZSDkvJrmjII/XG4gICAgICAgICAgICBpZihpZSkgeyBldiArPSAnIGNsaWNrJzsgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3JhZGlvJzpcbiAgICAgICAgICAgIGF0dHIgPSAnY2hlY2tlZCc7XG4gICAgICAgICAgICBpZihpZSkgeyBldiArPSAnIGNsaWNrJzsgfVxuICAgICAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgZWwuY2hlY2tlZCA9IGVsLnZhbHVlID09PSB2bS4kZ2V0RGF0YShrZXlQYXRoKSArICcnO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlzU2V0RGVmYXV0ID0gZWwuY2hlY2tlZDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgaWYoIWFudC5vcHRpb25zLmxhenkpe1xuICAgICAgICAgICAgICBpZignb25pbnB1dCcgaW4gZWwpe1xuICAgICAgICAgICAgICAgIGV2ICs9ICcgaW5wdXQnO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vSUUg5LiL55qEIGlucHV0IOS6i+S7tuabv+S7o1xuICAgICAgICAgICAgICBpZihpZSkge1xuICAgICAgICAgICAgICAgIGV2ICs9ICcga2V5dXAgcHJvcGVydHljaGFuZ2UgY3V0JztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICBicmVhaztcbiAgICAgIGNhc2UgJ1NFTEVDVCc6XG4gICAgICAgIGlmKGVsLm11bHRpcGxlKXtcbiAgICAgICAgICBoYW5kbGVyID0gZnVuY3Rpb24oaXNJbml0KSB7XG4gICAgICAgICAgICB2YXIgdmFscyA9IFtdO1xuICAgICAgICAgICAgZm9yKHZhciBpID0gMCwgbCA9IGVsLm9wdGlvbnMubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgICAgICAgICAgaWYoZWwub3B0aW9uc1tpXS5zZWxlY3RlZCl7IHZhbHMucHVzaChlbC5vcHRpb25zW2ldLnZhbHVlKSB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhbnQuc2V0KGN1ci4kZ2V0S2V5UGF0aCgpLCB2YWxzLCB7aXNCdWJibGU6IGlzSW5pdCAhPT0gdHJ1ZX0pO1xuICAgICAgICAgIH07XG4gICAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIHZhbHMgPSB2bS4kZ2V0RGF0YShrZXlQYXRoKTtcbiAgICAgICAgICAgIGlmKHZhbHMgJiYgdmFscy5sZW5ndGgpe1xuICAgICAgICAgICAgICBmb3IodmFyIGkgPSAwLCBsID0gZWwub3B0aW9ucy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgICAgICAgICAgIGVsLm9wdGlvbnNbaV0uc2VsZWN0ZWQgPSB2YWxzLmluZGV4T2YoZWwub3B0aW9uc1tpXS52YWx1ZSkgIT09IC0xO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBpc1NldERlZmF1dCA9IGlzU2V0RGVmYXV0ICYmICFoYXNUb2tlbihlbFt2YWx1ZV0pO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIFxuICAgIHRoaXMudXBkYXRlID0gY2FsbGJhY2s7XG4gICAgXG4gICAgZXYuc3BsaXQoL1xccysvZykuZm9yRWFjaChmdW5jdGlvbihlKXtcbiAgICAgIHJlbW92ZUV2ZW50KGVsLCBlLCBjYWxsSGFuZGxlcik7XG4gICAgICBhZGRFdmVudChlbCwgZSwgY2FsbEhhbmRsZXIpO1xuICAgIH0pO1xuICAgIFxuICAgIC8v5qC55o2u6KGo5Y2V5YWD57Sg55qE5Yid5aeL5YyW6buY6K6k5YC86K6+572u5a+55bqUIG1vZGVsIOeahOWAvFxuICAgIGlmKGVsW3ZhbHVlXSAmJiBpc1NldERlZmF1dCl7XG4gICAgICAgaGFuZGxlcih0cnVlKTsgXG4gICAgfVxuICAgICAgXG4gIH1cbn07XG5cbmZ1bmN0aW9uIGFkZEV2ZW50KGVsLCBldmVudCwgaGFuZGxlcikge1xuICBpZihlbC5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgZWwuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgaGFuZGxlciwgZmFsc2UpO1xuICB9ZWxzZXtcbiAgICBlbC5hdHRhY2hFdmVudCgnb24nICsgZXZlbnQsIGhhbmRsZXIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUV2ZW50KGVsLCBldmVudCwgaGFuZGxlcikge1xuICBpZihlbC5yZW1vdmVFdmVudExpc3RlbmVyKSB7XG4gICAgZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudCwgaGFuZGxlcik7XG4gIH1lbHNle1xuICAgIGVsLmRldGFjaEV2ZW50KCdvbicgKyBldmVudCwgaGFuZGxlcik7XG4gIH1cbn0iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGRvYyA9IHJlcXVpcmUoJy4uL2RvY3VtZW50LmpzJylcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJylcbiAgO1xuICBcbm1vZHVsZS5leHBvcnRzID0ge1xuICB0ZXJtaW5hbDogdHJ1ZVxuLCByZXBsYWNlOiB0cnVlXG4sIGxpbms6IGZ1bmN0aW9uKHZtKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzXG4gICAgICAsIGFudFxuICAgICAgO1xuXG4gICAgYW50ID0gdm0uJHJvb3QuJGFudDtcbiAgICBcbiAgICB0aGlzLnBOYW1lID0gdGhpcy5wYXRoO1xuICAgIHRoaXMudm0gPSB2bTtcbiAgICB0aGlzLnBhdGggPSAnJztcbiAgICBcbiAgICBhbnQuc2V0UGFydGlhbCh7XG4gICAgICBuYW1lOiB0aGlzLnBOYW1lXG4gICAgLCB0YXJnZXQ6IGZ1bmN0aW9uKGVsKSB7IHRoYXQuZWwuaW5zZXJ0QmVmb3JlKGVsLCB0aGF0Lm5vZGUpIH1cbiAgICAsIGVzY2FwZTogdGhpcy5lc2NhcGVcbiAgICAsIGNvbnRleHQ6IHRoaXNcbiAgICB9KTtcbiAgfVxufTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGRvYyA9IHJlcXVpcmUoJy4uL2RvY3VtZW50LmpzJylcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJylcbiAgLCBhZnRlckZuID0gdXRpbHMuYWZ0ZXJGblxuICA7XG4gXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgcHJpb3JpdHk6IDEwMDBcbiwgYW5jaG9yOiB0cnVlXG4sIHRlcm1pbmFsOiB0cnVlXG4sIGxpbms6IGZ1bmN0aW9uKHZtKSB7XG5cbiAgICB0aGlzLl9hbmNob3JzID0gW107XG4gICAgdGhpcy5yZWxhdGl2ZVZtID0gdm07XG4gICAgXG4gICAgdGhpcy5lbC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMuZWwpO1xuICAgIFxuICAgIC8vVE9ETzogY2FjaGUgdm1cbiAgfVxuLCB1cGRhdGU6IGZ1bmN0aW9uKHZhbCwgb2xkKSB7XG4gICAgaWYoIXRoaXMudm0pIHtcbiAgICAgIHRoaXMudm0gPSB0aGlzLnJlbGF0aXZlVm0uJGdldFZNKHRoaXMucGF0aHNbMF0sIHthc3NpZ25tZW50OiB0aGlzLmFzc2lnbm1lbnR9KTtcbiAgICB9XG4gICAgdmFyIGZpeFZtXG4gICAgICAsIHdhdGNoZXJzID0gdGhpcy52bS4kd2F0Y2hlcnNcbiAgICAgIDtcbiAgICBpZih2YWwgJiYgdmFsICE9PSBvbGQpIHtcbiAgICAgIGlmKHV0aWxzLmlzQXJyYXkodmFsKSkge1xuICAgICAgICBpZih2YWwuc3BsaWNlICE9PSBhcnJheU1ldGhvZHMuc3BsaWNlKSB7XG4gICAgICAgICAgdXRpbHMuZXh0ZW5kKHZhbCwgYXJyYXlNZXRob2RzKTtcbiAgICAgICAgICB2YWwuX192bV9fID0gdGhpcy52bTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgZm9yKHZhciBpID0gMCwgbCA9IHdhdGNoZXJzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgIGlmKHdhdGNoZXJzW2ldLnRva2VuLnR5cGUgPT09ICdyZXBlYXQnKXtcbiAgICAgICAgICAgIGZpeFZtID0gd2F0Y2hlcnNbaV0udG9rZW4gPT09IHRoaXM7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMuc3BsaWNlKFswLCB0aGlzLl9hbmNob3JzLmxlbmd0aF0uY29uY2F0KHZhbCksIHZhbCwgZml4Vm0pO1xuICAgICAgfWVsc2V7XG4gICAgICAgIGNvbnNvbGUud2Fybign6ZyA6KaB5LiA5Liq5pWw57uEJyk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIFxuICAvL+iOt+WPluW9k+asoemBjeWOhueahOaJgOacieiKgueCuVxuLCBnZXRSZXBlYXROb2RlczogZnVuY3Rpb24oaW5kZXgsIGZuKSB7XG4gICAgdmFyIGFuY2hvciA9IHRoaXMuX2FuY2hvcnNbaW5kZXhdXG4gICAgICAsIGVuZEFuY2hvciA9IHRoaXMuX2FuY2hvcnNbaW5kZXggKyAxXVxuICAgICAgLCBub2RlcyA9IFtdXG4gICAgICA7XG4gICAgIFxuICAgIGZuID0gZm4gfHwgdXRpbHMubm9vcDtcbiAgICAgXG4gICAgZm9yKHZhciBub2RlID0gYW5jaG9yLCBuZXh0OyBub2RlICYmIG5vZGUgIT09ICBlbmRBbmNob3IgJiYgbm9kZSAhPT0gdGhpcy5hbmNob3JzLmVuZDsgbm9kZSA9IG5leHQpIHtcbiAgICAgIG5leHQgPSBub2RlLm5leHRTaWJsaW5nO1xuICAgICAgbm9kZXMucHVzaChub2RlKTtcbiAgICAgIGZuLmNhbGwobm9kZSk7XG4gICAgfVxuICAgIHJldHVybiBub2RlcztcbiAgfVxuICAvL+eyvuehruaOp+WItiBET00g5YiX6KGoXG4gIC8vYXJnczogW2luZGV4LCBuLyosIGl0ZW1zLi4uKi9dXG4gIC8vYXJyOiDmlbDnu4TmlbDmja5cbiAgLy9maXhWbTog5piv5ZCm57u05oqkIHZpZXdtb2RlbCDntKLlvJVcbiwgc3BsaWNlOiBmdW5jdGlvbihhcmdzLCBhcnIsIGZpeFZtKSB7XG4gICAgdmFyIGFuY2hvcnMgPSB0aGlzLl9hbmNob3JzXG4gICAgICAsIG5ld0FuY2hvcnMgPSBbXVxuICAgICAgLCBpdGVtcyA9IGFyZ3Muc2xpY2UoMilcbiAgICAgICwgaW5kZXggPSBhcmdzWzBdICogMVxuICAgICAgLCBuID0gYXJnc1sxXSAqIDFcbiAgICAgICwgbSA9IGl0ZW1zLmxlbmd0aFxuICAgICAgLCBwbiA9IHRoaXMuYW5jaG9ycy5zdGFydC5wYXJlbnROb2RlXG4gICAgICAsIHZtXG4gICAgICA7XG4gICAgXG4gICAgaWYodXRpbHMuaXNVbmRlZmluZWQobikpe1xuICAgICAgYXJnc1sxXSA9IG4gPSBhbmNob3JzLmxlbmd0aCAtIGluZGV4O1xuICAgIH1cbiAgICBcbiAgICBmb3IodmFyIGkgPSBpbmRleCwgbCA9IGFuY2hvcnMubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgIGlmKGkgPCBpbmRleCArIG4pe1xuICAgICAgICAvL+WIoOmZpFxuICAgICAgICAvL+WvueS6juaLpeaciSBpZiDlsZ7mgKflubbkuJTkuI3mmL7npLrnmoToioLngrksIOWFtuW5tuS4jeWtmOWcqOS6jiBET00g5qCR5LitXG4gICAgICAgIHRyeXsgXG4gICAgICAgICAgdGhpcy5nZXRSZXBlYXROb2RlcyhpLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBuLnJlbW92ZUNoaWxkKHRoaXMpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1jYXRjaChlKXt9XG4gICAgICAgIGZpeFZtICYmIGRlbGV0ZSB0aGlzLnZtW2ldO1xuICAgICAgfWVsc2V7XG4gICAgICAgIGlmKG4gfHwgbSl7XG4gICAgICAgICAgLy/nu7TmiqTntKLlvJVcbiAgICAgICAgICB2YXIgbmV3SSA9IGkgLSAobiAtIG0pXG4gICAgICAgICAgICAsIG9sZEkgPSBpXG4gICAgICAgICAgICA7XG4gICAgICAgICAgXG4gICAgICAgICAgaWYobmV3SSA+IG9sZEkpIHtcbiAgICAgICAgICAgIG5ld0kgPSBsIC0gKGkgLSBpbmRleCk7XG4gICAgICAgICAgICBvbGRJID0gbmV3SSArIChuIC0gbSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIHRoaXMuZ2V0UmVwZWF0Tm9kZXMob2xkSSwgZnVuY3Rpb24oKSB7dGhpc1snJGluZGV4J10gPSBuZXdJfSk7XG4gICAgICAgICAgXG4gICAgICAgICAgaWYoZml4Vm0pe1xuICAgICAgICAgICAgdm0gPSB0aGlzLnZtW25ld0ldID0gdGhpcy52bVtvbGRJXTtcbiAgICAgICAgICAgIHZtLiRrZXkgPSBuZXdJICsgJyc7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZtWyckaW5kZXgnXSAmJiB2bVsnJGluZGV4J10uJHVwZGF0ZSh2bS4ka2V5KTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLy/mlrDlop5cbiAgICB2YXIgYXNzaWdubWVudCwgZWwsIGFuY2hvclxuICAgICAgLCBmcmFnID0gZG9jLmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKVxuICAgICAgO1xuICAgIGZvcih2YXIgaiA9IDA7IGogPCBtOyBqKyspe1xuICAgICAgZWwgPSB0aGlzLmVsLmNsb25lTm9kZSh0cnVlKTtcbiAgICAgIGFuY2hvciA9IGRvYy5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICBcbiAgICAgIGlmKHRoaXMuZWwuY29udGVudCAmJiAhZWwuY29udGVudCkge1xuICAgICAgICBlbC5jb250ZW50ID0gdGhpcy5lbC5jb250ZW50LmNsb25lTm9kZSh0cnVlKTtcbiAgICAgIH1cbiAgICAgIGZpeFZtICYmIGRlbGV0ZSB0aGlzLnZtW2luZGV4ICsgal07XG4gICAgICB2bSA9IHRoaXMudm0uJGdldFZNKGluZGV4ICsgaiwge3Njb3BlOiB0aGlzLnZtLCBhc3NpZ25tZW50OiB0aGlzLmFzc2lnbm1lbnR9KTtcbiAgICAgIFxuICAgICAgYXNzaWdubWVudCA9IHV0aWxzLmNyZWF0ZSh0aGlzLmFzc2lnbm1lbnQpO1xuICAgICAgZm9yKHZhciBhID0gMDsgYSA8IHRoaXMuYXNzaWdubWVudHMubGVuZ3RoOyBhKyspIHtcbiAgICAgICAgYXNzaWdubWVudFt0aGlzLmFzc2lnbm1lbnRzW2FdXSA9IHZtO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmcmFnLmFwcGVuZENoaWxkKGFuY2hvcik7XG4gICAgICBmcmFnLmFwcGVuZENoaWxkKGVsKTtcbiAgICAgIHZtLiRidWlsZChlbCwge2Fzc2lnbm1lbnQ6IGFzc2lnbm1lbnR9KTtcbiAgICAgIFxuICAgICAgdm1bJyRpbmRleCddICYmIHZtWyckaW5kZXgnXS4kdXBkYXRlKHZtLiRrZXkpO1xuICAgICAgXG4gICAgICBuZXdBbmNob3JzLnB1c2goYW5jaG9yKTtcbiAgICAgIFxuICAgICAgZm9yKHZhciBub2RlID0gYW5jaG9yOyBub2RlOyBub2RlID0gbm9kZS5uZXh0U2libGluZykge1xuICAgICAgICBpZihub2RlLm5vZGVUeXBlID09IDEpeyBub2RlWyckaW5kZXgnXSA9IGluZGV4ICsgajsgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZihuZXdBbmNob3JzLmxlbmd0aCl7XG4gICAgICBwbi5pbnNlcnRCZWZvcmUoZnJhZywgYW5jaG9yc1tpbmRleCArIG5dIHx8IHRoaXMuYW5jaG9ycy5lbmQpO1xuICAgIH1cbiAgICBcbiAgICAvL+mcgOimgea4hemZpOe8qeefreWQjuWkmuWHuueahOmDqOWIhlxuICAgIGlmKGZpeFZtKXtcbiAgICAgIGZvcih2YXIgayA9IGwgLSBuICsgbTsgayA8IGw7IGsrKyl7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnZtW2tdO1xuICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBpZihhcnIuX192bV9fICE9PSB0aGlzLnZtKSB7XG4gICAgICBhcnIuX192bV9fID0gdGhpcy52bTtcbiAgICB9XG4gICAgXG4gICAgYXJncyA9IGFyZ3Muc2xpY2UoMCwgMikuY29uY2F0KG5ld0FuY2hvcnMpO1xuICAgIGFuY2hvcnMuc3BsaWNlLmFwcGx5KGFuY2hvcnMsIGFyZ3MpO1xuICB9XG4sIHJldmVyc2U6IGZ1bmN0aW9uKGFyZ3MsIGFyciwgZml4Vm0pIHtcbiAgICB2YXIgdm1zID0gdGhpcy52bSwgdm1cbiAgICAgICwgYW5jaG9yID0gdGhpcy5hbmNob3JzLmVuZFxuICAgICAgLCBmcmFnID0gZG9jLmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKVxuICAgICAgO1xuICAgIGZvcih2YXIgaSA9IDAsIGwgPSB0aGlzLl9hbmNob3JzLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICBpZihmaXhWbSAmJiBpIDwgMS8yKXtcbiAgICAgICAgdm0gPSB2bXNbaV07XG4gICAgICAgIHZtc1tpXSA9IHZtc1tsIC0gaSAtIDFdO1xuICAgICAgICB2bXNbaV0uJGtleSA9IGkgKyAnJztcbiAgICAgICAgdm0uJGtleSA9IGwgLSBpIC0gMSArICcnO1xuICAgICAgICB2bXNbbCAtIGkgLSAxXSA9IHZtO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmaXhWbSAmJiB2bVsnJGluZGV4J10gJiYgdm1bJyRpbmRleCddLiR1cGRhdGUodm0uJGtleSk7XG4gICAgICBcbiAgICAgIHRoaXMuZ2V0UmVwZWF0Tm9kZXMobCAtIGkgLSAxLCBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpc1snJGluZGV4J10gPSBpO1xuICAgICAgICBmcmFnLmFwcGVuZENoaWxkKHRoaXMpXG4gICAgICB9KTtcbiAgICB9XG4gICAgYW5jaG9yLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGZyYWcsIGFuY2hvcik7XG4gICAgdGhpcy5fYW5jaG9ycy5yZXZlcnNlKCk7XG4gIH1cbiwgc29ydDogZnVuY3Rpb24oZm4pe1xuICAgIC8vVE9ETyDov5vooYznsr7noa7pq5jov5jljp/nmoTmjpLluo8/XG4gICAgdGhpcy51cGRhdGUodGhpcy52bS4kdmFsdWUpO1xuICB9XG59O1xuXG5cbmZ1bmN0aW9uIGNhbGxSZXBlYXRlcih2bUFycmF5LCBtZXRob2QsIGFyZ3Mpe1xuICB2YXIgd2F0Y2hlcnMgPSB2bUFycmF5Ll9fdm1fXy4kd2F0Y2hlcnM7XG4gIHZhciBmaXhWbSA9IHRydWU7XG4gIGZvcih2YXIgaSA9IDAsIGwgPSB3YXRjaGVycy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgIGlmKHdhdGNoZXJzW2ldLnRva2VuLnR5cGUgPT09ICdyZXBlYXQnKXtcbiAgICAgIHdhdGNoZXJzW2ldLnRva2VuW21ldGhvZF0oYXJncywgdm1BcnJheSwgZml4Vm0pO1xuICAgICAgZml4Vm0gPSBmYWxzZTtcbiAgICB9XG4gIH1cbiAgdm1BcnJheS5fX3ZtX18ubGVuZ3RoICYmIHZtQXJyYXkuX192bV9fLmxlbmd0aC4kdXBkYXRlKHZtQXJyYXkubGVuZ3RoLCBmYWxzZSwgdHJ1ZSk7XG59XG52YXIgYXJyYXlNZXRob2RzID0ge1xuICBzcGxpY2U6IGFmdGVyRm4oW10uc3BsaWNlLCBmdW5jdGlvbigpIHtcbiAgICBjYWxsUmVwZWF0ZXIodGhpcywgJ3NwbGljZScsIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKSk7XG4gIH0pXG4sIHB1c2g6IGFmdGVyRm4oW10ucHVzaCwgZnVuY3Rpb24oLyppdGVtMSwgaXRlbTIsIC4uLiovKSB7XG4gICAgdmFyIGFyciA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICBhcnIudW5zaGlmdCh0aGlzLmxlbmd0aCAtIGFyci5sZW5ndGgsIDApO1xuICAgIFxuICAgIGNhbGxSZXBlYXRlcih0aGlzLCAnc3BsaWNlJywgYXJyKTtcbiAgfSlcbiwgcG9wOiBhZnRlckZuKFtdLnBvcCwgZnVuY3Rpb24oKSB7XG4gICAgY2FsbFJlcGVhdGVyKHRoaXMsICdzcGxpY2UnLCBbdGhpcy5sZW5ndGgsIDFdKTtcbiAgfSlcbiwgc2hpZnQ6IGFmdGVyRm4oW10uc2hpZnQsIGZ1bmN0aW9uKCkge1xuICAgIGNhbGxSZXBlYXRlcih0aGlzLCAnc3BsaWNlJywgWzAsIDFdKTtcbiAgfSlcbiwgdW5zaGlmdDogYWZ0ZXJGbihbXS51bnNoaWZ0LCBmdW5jdGlvbigpIHtcbiAgICB2YXIgYXJyID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgIGFyci51bnNoaWZ0KDAsIDApO1xuICAgIFxuICAgIGNhbGxSZXBlYXRlcih0aGlzLCAnc3BsaWNlJywgYXJyKTtcbiAgfSlcbiwgc29ydDogYWZ0ZXJGbihbXS5zb3J0LCBmdW5jdGlvbihmbikge1xuICAgIGNhbGxSZXBlYXRlcih0aGlzLCAnc29ydCcpO1xuICB9KVxuLCByZXZlcnNlOiBhZnRlckZuKFtdLnJldmVyc2UsIGZ1bmN0aW9uKCl7XG4gICAgY2FsbFJlcGVhdGVyKHRoaXMsICdyZXZlcnNlJyk7XG4gIH0pXG59O1xuIiwiKGZ1bmN0aW9uKHJvb3Qpe1xuICBcInVzZSBzdHJpY3RcIjtcblxuICBtb2R1bGUuZXhwb3J0cyA9IHJvb3QuZG9jdW1lbnQgfHwgcmVxdWlyZSgnanNkb20nKS5qc2RvbSgpO1xuXG59KSgoZnVuY3Rpb24oKSB7cmV0dXJuIHRoaXN9KSgpKTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIG9wZXJhdG9ycyA9IHtcbiAgJ3VuYXJ5Jzoge1xuICAgICcrJzogZnVuY3Rpb24odikgeyByZXR1cm4gK3Y7IH1cbiAgLCAnLSc6IGZ1bmN0aW9uKHYpIHsgcmV0dXJuIC12OyB9XG4gICwgJyEnOiBmdW5jdGlvbih2KSB7IHJldHVybiAhdjsgfVxuICAgIFxuICAsICdbJzogZnVuY3Rpb24odil7IHJldHVybiB2OyB9XG4gICwgJ3snOiBmdW5jdGlvbih2KXtcbiAgICAgIHZhciByID0ge307XG4gICAgICBmb3IodmFyIGkgPSAwLCBsID0gdi5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgclt2W2ldWzBdXSA9IHZbaV1bMV07XG4gICAgICB9XG4gICAgICByZXR1cm4gcjtcbiAgICB9XG4gICwgJ3R5cGVvZic6IGZ1bmN0aW9uKHYpeyByZXR1cm4gdHlwZW9mIHY7IH1cbiAgLCAnbmV3JzogZnVuY3Rpb24odil7IHJldHVybiBuZXcgdiB9XG4gIH1cbiAgXG4sICdiaW5hcnknOiB7XG4gICAgJysnOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsICsgcjsgfVxuICAsICctJzogZnVuY3Rpb24obCwgcikgeyByZXR1cm4gbCAtIHI7IH1cbiAgLCAnKic6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgKiByOyB9XG4gICwgJy8nOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsIC8gcjsgfVxuICAsICclJzogZnVuY3Rpb24obCwgcikgeyByZXR1cm4gbCAlIHI7IH1cbiAgLCAnPCc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgPCByOyB9XG4gICwgJz4nOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsID4gcjsgfVxuICAsICc8PSc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgPD0gcjsgfVxuICAsICc+PSc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgPj0gcjsgfVxuICAsICc9PSc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgPT0gcjsgfVxuICAsICchPSc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgIT0gcjsgfVxuICAsICc9PT0nOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsID09PSByOyB9XG4gICwgJyE9PSc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgIT09IHI7IH1cbiAgLCAnJiYnOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsICYmIHI7IH1cbiAgLCAnfHwnOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsIHx8IHI7IH1cbiAgICBcbiAgLCAnLic6IGZ1bmN0aW9uKGwsIHIpIHtcbiAgICAgIGlmKHIpe1xuICAgICAgICBwYXRoID0gcGF0aCArICcuJyArIHI7XG4gICAgICB9XG4gICAgICByZXR1cm4gbFtyXTtcbiAgICB9XG4gICwgJ1snOiBmdW5jdGlvbihsLCByKSB7XG4gICAgICBpZih0eXBlb2YgciAhPT0gJ3VuZGVmaW5lZCcpe1xuICAgICAgICBwYXRoID0gcGF0aCArICcuJyArIHI7XG4gICAgICB9XG4gICAgICByZXR1cm4gbFtyXTtcbiAgICB9XG4gICwgJygnOiBmdW5jdGlvbihsLCByKXsgcmV0dXJuIGwuYXBwbHkobnVsbCwgcikgfVxuICAgIFxuICAsICd8JzogZnVuY3Rpb24obCwgcil7IHJldHVybiByLmNhbGwobnVsbCwgbCkgfS8vZmlsdGVyLiBuYW1lfGZpbHRlclxuICAsICdpbic6IGZ1bmN0aW9uKGwsIHIpe1xuICAgICAgaWYodGhpcy5hc3NpZ25tZW50KSB7XG4gICAgICAgIC8vcmVwZWF0XG4gICAgICAgIHJldHVybiByO1xuICAgICAgfWVsc2V7XG4gICAgICAgIHJldHVybiBsIGluIHI7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIFxuLCAndGVybmFyeSc6IHtcbiAgICAnPyc6IGZ1bmN0aW9uKGYsIHMsIHQpIHsgcmV0dXJuIGYgPyBzIDogdDsgfVxuICAsICcoJzogZnVuY3Rpb24oZiwgcywgdCkgeyByZXR1cm4gZltzXS5hcHBseShmLCB0KSB9XG4gIFxuICAvL2ZpbHRlci4gbmFtZSB8IGZpbHRlciA6IGFyZzIgOiBhcmczXG4gICwgJ3wnOiBmdW5jdGlvbihmLCBzLCB0KXsgcmV0dXJuIHMuYXBwbHkobnVsbCwgW2ZdLmNvbmNhdCh0KSk7IH1cbiAgfVxufTtcblxudmFyIGFyZ05hbWUgPSBbJ2ZpcnN0JywgJ3NlY29uZCcsICd0aGlyZCddXG4gICwgY29udGV4dCwgc3VtbWFyeVxuICAsIHBhdGhcbiAgO1xuXG4vL+mBjeWOhiBhc3RcbnZhciBldmFsdWF0ZSA9IGZ1bmN0aW9uKHRyZWUpIHtcbiAgdmFyIGFyaXR5ID0gdHJlZS5hcml0eVxuICAgICwgdmFsdWUgPSB0cmVlLnZhbHVlXG4gICAgLCBhcmdzID0gW11cbiAgICAsIG4gPSAwXG4gICAgLCBhcmdcbiAgICAsIHJlc1xuICAgIDtcbiAgXG4gIC8v5pON5L2c56ym5pyA5aSa5Y+q5pyJ5LiJ5YWDXG4gIGZvcig7IG4gPCAzOyBuKyspe1xuICAgIGFyZyA9IHRyZWVbYXJnTmFtZVtuXV07XG4gICAgaWYoYXJnKXtcbiAgICAgIGlmKEFycmF5LmlzQXJyYXkoYXJnKSl7XG4gICAgICAgIGFyZ3Nbbl0gPSBbXTtcbiAgICAgICAgZm9yKHZhciBpID0gMCwgbCA9IGFyZy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgICAgIGFyZ3Nbbl0ucHVzaCh0eXBlb2YgYXJnW2ldLmtleSA9PT0gJ3VuZGVmaW5lZCcgPyBcbiAgICAgICAgICAgIGV2YWx1YXRlKGFyZ1tpXSkgOiBbYXJnW2ldLmtleSwgZXZhbHVhdGUoYXJnW2ldKV0pO1xuICAgICAgICB9XG4gICAgICB9ZWxzZXtcbiAgICAgICAgYXJnc1tuXSA9IGV2YWx1YXRlKGFyZyk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIFxuICBpZihhcml0eSAhPT0gJ2xpdGVyYWwnKSB7XG4gICAgaWYocGF0aCAmJiB2YWx1ZSAhPT0gJy4nICYmIHZhbHVlICE9PSAnWycpIHtcbiAgICAgIHN1bW1hcnkucGF0aHNbcGF0aF0gPSB0cnVlO1xuICAgIH1cbiAgICBpZihhcml0eSA9PT0gJ25hbWUnKSB7XG4gICAgICBwYXRoID0gdmFsdWU7XG4gICAgfVxuICB9XG4gIFxuICBzd2l0Y2goYXJpdHkpe1xuICAgIGNhc2UgJ3VuYXJ5JzogXG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICd0ZXJuYXJ5JzpcbiAgICAgIHRyeXtcbiAgICAgICAgcmVzID0gZ2V0T3BlcmF0b3IoYXJpdHksIHZhbHVlKS5hcHBseSh0cmVlLCBhcmdzKTtcbiAgICAgIH1jYXRjaChlKXtcbiAgICAgICAgLy9jb25zb2xlLmRlYnVnKGUpO1xuICAgICAgICByZXMgPSBudWxsO1xuICAgICAgfVxuICAgIGJyZWFrO1xuICAgIGNhc2UgJ2xpdGVyYWwnOlxuICAgICAgcmVzID0gdmFsdWU7XG4gICAgYnJlYWs7XG4gICAgY2FzZSAnYXNzaWdubWVudCc6XG4gICAgICBzdW1tYXJ5LmFzc2lnbm1lbnRzW3ZhbHVlXSA9IHRydWU7XG4gICAgYnJlYWs7XG4gICAgY2FzZSAnbmFtZSc6XG4gICAgICBzdW1tYXJ5LmxvY2Fsc1t2YWx1ZV0gPSB0cnVlO1xuICAgICAgcmVzID0gY29udGV4dC5sb2NhbHNbdmFsdWVdO1xuICAgIGJyZWFrO1xuICAgIGNhc2UgJ2ZpbHRlcic6XG4gICAgICBzdW1tYXJ5LmZpbHRlcnNbdmFsdWVdID0gdHJ1ZTtcbiAgICAgIHJlcyA9IGNvbnRleHQuZmlsdGVyc1t2YWx1ZV07XG4gICAgYnJlYWs7XG4gICAgY2FzZSAndGhpcyc6XG4gICAgICByZXMgPSBjb250ZXh0LmxvY2FscztcbiAgICBicmVhaztcbiAgfVxuICByZXR1cm4gcmVzO1xufTtcblxuZnVuY3Rpb24gZ2V0T3BlcmF0b3IoYXJpdHksIHZhbHVlKXtcbiAgcmV0dXJuIG9wZXJhdG9yc1thcml0eV1bdmFsdWVdIHx8IGZ1bmN0aW9uKCkgeyByZXR1cm47IH1cbn1cblxuZnVuY3Rpb24gcmVzZXQoX2NvbnRleHQpIHtcbiAgaWYoX2NvbnRleHQpIHtcbiAgICBjb250ZXh0ID0ge2xvY2FsczogX2NvbnRleHQubG9jYWxzIHx8IHt9LCBmaWx0ZXJzOiBfY29udGV4dC5maWx0ZXJzIHx8IHt9fTtcbiAgfWVsc2V7XG4gICAgY29udGV4dCA9IHtmaWx0ZXJzOiB7fSwgbG9jYWxzOiB7fX07XG4gIH1cbiAgXG4gIHN1bW1hcnkgPSB7ZmlsdGVyczoge30sIGxvY2Fsczoge30sIHBhdGhzOiB7fSwgYXNzaWdubWVudHM6IHt9fTtcbiAgcGF0aCA9ICcnO1xufVxuXG4vL+ihqOi+vuW8j+axguWAvFxuLy90cmVlOiBwYXJzZXIg55Sf5oiQ55qEIGFzdFxuLy9jb250ZXh0OiDooajovr7lvI/miafooYznmoTnjq/looNcbi8vY29udGV4dC5sb2NhbHM6IOWPmOmHj1xuLy9jb250ZXh0LmZpbHRlcnM6IOi/h+a7pOWZqOWHveaVsFxuZXhwb3J0cy5ldmFsID0gZnVuY3Rpb24odHJlZSwgX2NvbnRleHQpIHtcbiAgcmVzZXQoX2NvbnRleHQgfHwge30pO1xuICBcbiAgcmV0dXJuIGV2YWx1YXRlKHRyZWUpO1xufTtcblxuLy/ooajovr7lvI/mkZjopoFcbi8vcmV0dXJuOiB7ZmlsdGVyczpbXSwgbG9jYWxzOltdLCBwYXRoczogW10sIGFzc2lnbm1lbnRzOiBbXX1cbmV4cG9ydHMuc3VtbWFyeSA9IGZ1bmN0aW9uKHRyZWUpIHtcbiAgcmVzZXQoKTtcbiAgXG4gIGV2YWx1YXRlKHRyZWUpO1xuICBcbiAgaWYocGF0aCkge1xuICAgIHN1bW1hcnkucGF0aHNbcGF0aF0gPSB0cnVlO1xuICB9XG4gIGZvcih2YXIga2V5IGluIHN1bW1hcnkpIHtcbiAgICBzdW1tYXJ5W2tleV0gPSBPYmplY3Qua2V5cyhzdW1tYXJ5W2tleV0pO1xuICB9XG4gIHJldHVybiBzdW1tYXJ5O1xufTsiLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbnZhciBFdmVudCA9IHtcbiAgLy/nm5HlkKzoh6rlrprkuYnkuovku7YuXG4gIG9uOiBmdW5jdGlvbihuYW1lLCBoYW5kbGVyLCBjb250ZXh0KSB7XG4gICAgdmFyIGN0eCA9IGNvbnRleHQgfHwgdGhpc1xuICAgICAgO1xuICAgICAgXG4gICAgY3R4Ll9oYW5kbGVycyA9IGN0eC5faGFuZGxlcnMgfHwge307XG4gICAgY3R4Ll9oYW5kbGVyc1tuYW1lXSA9IGN0eC5faGFuZGxlcnNbbmFtZV0gfHwgW107XG4gICAgXG4gICAgY3R4Ll9oYW5kbGVyc1tuYW1lXS5wdXNoKHtoYW5kbGVyOiBoYW5kbGVyLCBjb250ZXh0OiBjb250ZXh0LCBjdHg6IGN0eH0pO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICAvL+enu+mZpOebkeWQrOS6i+S7ti5cbiAgb2ZmOiBmdW5jdGlvbihuYW1lLCBoYW5kbGVyLCBjb250ZXh0KSB7XG4gICAgdmFyIGN0eCA9IGNvbnRleHQgfHwgdGhpc1xuICAgICAgLCBoYW5kbGVycyA9IGN0eC5faGFuZGxlcnNcbiAgICAgIDtcbiAgICAgIFxuICAgIGlmKG5hbWUgJiYgaGFuZGxlcnNbbmFtZV0pe1xuICAgICAgaWYodXRpbHMuaXNGdW5jdGlvbihoYW5kbGVyKSl7XG4gICAgICAgIGZvcih2YXIgaSA9IGhhbmRsZXJzW25hbWVdLmxlbmd0aCAtIDE7IGkgPj0wOyBpLS0pIHtcbiAgICAgICAgICBpZihoYW5kbGVyc1tuYW1lXVtpXS5oYW5kbGVyID09PSBoYW5kbGVyKXtcbiAgICAgICAgICAgIGhhbmRsZXJzW25hbWVdLnNwbGljZShpLCAxKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1lbHNle1xuICAgICAgICBoYW5kbGVyc1tuYW1lXSA9IFtdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgLy/op6blj5Hoh6rlrprkuYnkuovku7YuIFxuICAvL+ivpeaWueazleayoeacieaPkOS+m+mdmeaAgeWMlueahCBjb250ZXh0IOWPguaVsC4g5aaC6KaB6Z2Z5oCB5YyW5L2/55SoLCDlupTor6U6IGBFdmVudC50cmlnZ2VyLmNhbGwoY29udGV4dCwgbmFtZSwgZGF0YSlgXG4gIHRyaWdnZXI6IGZ1bmN0aW9uKG5hbWUsIGRhdGEpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXNcbiAgICAgICwgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKVxuICAgICAgLCBoYW5kbGVycyA9IHRoYXQuX2hhbmRsZXJzXG4gICAgICA7XG4gICAgICBcbiAgICBpZihoYW5kbGVycyAmJiBoYW5kbGVyc1tuYW1lXSl7XG4gICAgICBoYW5kbGVyc1tuYW1lXS5mb3JFYWNoKGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5oYW5kbGVyLmFwcGx5KHRoYXQsIGFyZ3MpXG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRXZlbnQ7IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbi8vSmF2YXNjcmlwdCBleHByZXNzaW9uIHBhcnNlciBtb2RpZmllZCBmb3JtIENyb2NrZm9yZCdzIFRET1AgcGFyc2VyXHJcbnZhciBjcmVhdGUgPSBPYmplY3QuY3JlYXRlIHx8IGZ1bmN0aW9uIChvKSB7XHJcblx0ZnVuY3Rpb24gRigpIHt9XHJcblx0Ri5wcm90b3R5cGUgPSBvO1xyXG5cdHJldHVybiBuZXcgRigpO1xyXG59O1xuXHJcbnZhciBzb3VyY2U7XG5cclxudmFyIGVycm9yID0gZnVuY3Rpb24gKG1lc3NhZ2UsIHQpIHtcclxuXHR0ID0gdCB8fCB0aGlzO1xuICB2YXIgbXNnID0gbWVzc2FnZSArPSBcIiBCdXQgZm91bmQgJ1wiICsgdC52YWx1ZSArIFwiJ1wiICsgKHQuZnJvbSA/IFwiIGF0IFwiICsgdC5mcm9tIDogXCJcIikgKyBcIiBpbiAnXCIgKyBzb3VyY2UgKyBcIidcIjtcbiAgdmFyIGUgPSBuZXcgRXJyb3IobXNnKTtcclxuXHRlLm5hbWUgPSB0Lm5hbWUgPSBcIlN5bnRheEVycm9yXCI7XHJcblx0dC5tZXNzYWdlID0gbWVzc2FnZTtcclxuICB0aHJvdyBlO1xyXG59O1xyXG5cclxudmFyIHRva2VuaXplID0gZnVuY3Rpb24gKGNvZGUsIHByZWZpeCwgc3VmZml4KSB7XHJcblx0dmFyIGM7IC8vIFRoZSBjdXJyZW50IGNoYXJhY3Rlci5cclxuXHR2YXIgZnJvbTsgLy8gVGhlIGluZGV4IG9mIHRoZSBzdGFydCBvZiB0aGUgdG9rZW4uXHJcblx0dmFyIGkgPSAwOyAvLyBUaGUgaW5kZXggb2YgdGhlIGN1cnJlbnQgY2hhcmFjdGVyLlxyXG5cdHZhciBsZW5ndGggPSBjb2RlLmxlbmd0aDtcclxuXHR2YXIgbjsgLy8gVGhlIG51bWJlciB2YWx1ZS5cclxuXHR2YXIgcTsgLy8gVGhlIHF1b3RlIGNoYXJhY3Rlci5cclxuXHR2YXIgc3RyOyAvLyBUaGUgc3RyaW5nIHZhbHVlLlxyXG5cclxuXHR2YXIgcmVzdWx0ID0gW107IC8vIEFuIGFycmF5IHRvIGhvbGQgdGhlIHJlc3VsdHMuXHJcblxyXG5cdC8vIE1ha2UgYSB0b2tlbiBvYmplY3QuXHJcblx0dmFyIG1ha2UgPSBmdW5jdGlvbiAodHlwZSwgdmFsdWUpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHR5cGUgOiB0eXBlLFxyXG5cdFx0XHR2YWx1ZSA6IHZhbHVlLFxyXG5cdFx0XHRmcm9tIDogZnJvbSxcclxuXHRcdFx0dG8gOiBpXHJcblx0XHR9O1xyXG5cdH07XHJcblxyXG5cdC8vIEJlZ2luIHRva2VuaXphdGlvbi4gSWYgdGhlIHNvdXJjZSBzdHJpbmcgaXMgZW1wdHksIHJldHVybiBub3RoaW5nLlxyXG5cdGlmICghY29kZSkge1xyXG5cdFx0cmV0dXJuO1xyXG5cdH1cclxuXHJcblx0Ly8gSWYgcHJlZml4IGFuZCBzdWZmaXggc3RyaW5ncyBhcmUgbm90IHByb3ZpZGVkLCBzdXBwbHkgZGVmYXVsdHMuXHJcblx0aWYgKHR5cGVvZiBwcmVmaXggIT09ICdzdHJpbmcnKSB7XHJcblx0XHRwcmVmaXggPSAnPD4rLSYnO1xyXG5cdH1cclxuXHRpZiAodHlwZW9mIHN1ZmZpeCAhPT0gJ3N0cmluZycpIHtcclxuXHRcdHN1ZmZpeCA9ICc9PiY6JztcclxuXHR9XHJcblxyXG5cdC8vIExvb3AgdGhyb3VnaCBjb2RlIHRleHQsIG9uZSBjaGFyYWN0ZXIgYXQgYSB0aW1lLlxyXG5cdGMgPSBjb2RlLmNoYXJBdChpKTtcclxuXHR3aGlsZSAoYykge1xyXG5cdFx0ZnJvbSA9IGk7XHJcblxyXG5cdFx0aWYgKGMgPD0gJyAnKSB7IC8vIElnbm9yZSB3aGl0ZXNwYWNlLlxyXG5cdFx0XHRpICs9IDE7XHJcblx0XHRcdGMgPSBjb2RlLmNoYXJBdChpKTtcclxuXHRcdH0gZWxzZSBpZiAoKGMgPj0gJ2EnICYmIGMgPD0gJ3onKSB8fCAoYyA+PSAnQScgJiYgYyA8PSAnWicpIHx8IGMgPT09ICckJyB8fCBjID09PSAnXycpIHsgLy8gbmFtZS5cclxuXHRcdFx0c3RyID0gYztcclxuXHRcdFx0aSArPSAxO1xyXG5cdFx0XHRmb3IgKDsgOyApIHtcclxuXHRcdFx0XHRjID0gY29kZS5jaGFyQXQoaSk7XHJcblx0XHRcdFx0aWYgKChjID49ICdhJyAmJiBjIDw9ICd6JykgfHwgKGMgPj0gJ0EnICYmIGMgPD0gJ1onKSB8fFxyXG5cdFx0XHRcdFx0KGMgPj0gJzAnICYmIGMgPD0gJzknKSB8fCBjID09PSAnXycpIHtcclxuXHRcdFx0XHRcdHN0ciArPSBjO1xyXG5cdFx0XHRcdFx0aSArPSAxO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0cmVzdWx0LnB1c2gobWFrZSgnbmFtZScsIHN0cikpO1xyXG5cdFx0fSBlbHNlIGlmIChjID49ICcwJyAmJiBjIDw9ICc5Jykge1xyXG5cdFx0XHQvLyBudW1iZXIuXHJcblxyXG5cdFx0XHQvLyBBIG51bWJlciBjYW5ub3Qgc3RhcnQgd2l0aCBhIGRlY2ltYWwgcG9pbnQuIEl0IG11c3Qgc3RhcnQgd2l0aCBhIGRpZ2l0LFxyXG5cdFx0XHQvLyBwb3NzaWJseSAnMCcuXHJcblx0XHRcdHN0ciA9IGM7XHJcblx0XHRcdGkgKz0gMTtcclxuXHJcblx0XHRcdC8vIExvb2sgZm9yIG1vcmUgZGlnaXRzLlxyXG5cdFx0XHRmb3IgKDsgOyApIHtcclxuXHRcdFx0XHRjID0gY29kZS5jaGFyQXQoaSk7XHJcblx0XHRcdFx0aWYgKGMgPCAnMCcgfHwgYyA+ICc5Jykge1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGkgKz0gMTtcclxuXHRcdFx0XHRzdHIgKz0gYztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gTG9vayBmb3IgYSBkZWNpbWFsIGZyYWN0aW9uIHBhcnQuXHJcblx0XHRcdGlmIChjID09PSAnLicpIHtcclxuXHRcdFx0XHRpICs9IDE7XHJcblx0XHRcdFx0c3RyICs9IGM7XHJcblx0XHRcdFx0Zm9yICg7IDsgKSB7XHJcblx0XHRcdFx0XHRjID0gY29kZS5jaGFyQXQoaSk7XHJcblx0XHRcdFx0XHRpZiAoYyA8ICcwJyB8fCBjID4gJzknKSB7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0aSArPSAxO1xyXG5cdFx0XHRcdFx0c3RyICs9IGM7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBMb29rIGZvciBhbiBleHBvbmVudCBwYXJ0LlxyXG5cdFx0XHRpZiAoYyA9PT0gJ2UnIHx8IGMgPT09ICdFJykge1xyXG5cdFx0XHRcdGkgKz0gMTtcclxuXHRcdFx0XHRzdHIgKz0gYztcclxuXHRcdFx0XHRjID0gY29kZS5jaGFyQXQoaSk7XHJcblx0XHRcdFx0aWYgKGMgPT09ICctJyB8fCBjID09PSAnKycpIHtcclxuXHRcdFx0XHRcdGkgKz0gMTtcclxuXHRcdFx0XHRcdHN0ciArPSBjO1xyXG5cdFx0XHRcdFx0YyA9IGNvZGUuY2hhckF0KGkpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZiAoYyA8ICcwJyB8fCBjID4gJzknKSB7XHJcblx0XHRcdFx0XHRlcnJvcihcIkJhZCBleHBvbmVudFwiLCBtYWtlKCdudW1iZXInLCBzdHIpKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZG8ge1xyXG5cdFx0XHRcdFx0aSArPSAxO1xyXG5cdFx0XHRcdFx0c3RyICs9IGM7XHJcblx0XHRcdFx0XHRjID0gY29kZS5jaGFyQXQoaSk7XHJcblx0XHRcdFx0fSB3aGlsZSAoYyA+PSAnMCcgJiYgYyA8PSAnOScpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBNYWtlIHN1cmUgdGhlIG5leHQgY2hhcmFjdGVyIGlzIG5vdCBhIGxldHRlci5cclxuXHJcblx0XHRcdGlmIChjID49ICdhJyAmJiBjIDw9ICd6Jykge1xyXG5cdFx0XHRcdHN0ciArPSBjO1xyXG5cdFx0XHRcdGkgKz0gMTtcclxuXHRcdFx0XHRlcnJvcihcIkJhZCBudW1iZXJcIiwgbWFrZSgnbnVtYmVyJywgc3RyKSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENvbnZlcnQgdGhlIHN0cmluZyB2YWx1ZSB0byBhIG51bWJlci4gSWYgaXQgaXMgZmluaXRlLCB0aGVuIGl0IGlzIGEgZ29vZFxyXG5cdFx0XHQvLyB0b2tlbi5cclxuXHJcblx0XHRcdG4gPSArc3RyO1xyXG5cdFx0XHRpZiAoaXNGaW5pdGUobikpIHtcclxuXHRcdFx0XHRyZXN1bHQucHVzaChtYWtlKCdudW1iZXInLCBuKSk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0ZXJyb3IoXCJCYWQgbnVtYmVyXCIsIG1ha2UoJ251bWJlcicsIHN0cikpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBzdHJpbmdcclxuXHJcblx0XHR9IGVsc2UgaWYgKGMgPT09ICdcXCcnIHx8IGMgPT09ICdcIicpIHtcclxuXHRcdFx0c3RyID0gJyc7XHJcblx0XHRcdHEgPSBjO1xyXG5cdFx0XHRpICs9IDE7XHJcblx0XHRcdGZvciAoOyA7ICkge1xyXG5cdFx0XHRcdGMgPSBjb2RlLmNoYXJBdChpKTtcclxuXHRcdFx0XHRpZiAoYyA8ICcgJykge1xyXG5cdFx0XHRcdFx0bWFrZSgnc3RyaW5nJywgc3RyKTtcclxuXHRcdFx0XHRcdGVycm9yKGMgPT09ICdcXG4nIHx8IGMgPT09ICdcXHInIHx8IGMgPT09ICcnID9cclxuXHRcdFx0XHRcdFx0XCJVbnRlcm1pbmF0ZWQgc3RyaW5nLlwiIDpcclxuXHRcdFx0XHRcdFx0XCJDb250cm9sIGNoYXJhY3RlciBpbiBzdHJpbmcuXCIsIG1ha2UoJycsIHN0cikpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gTG9vayBmb3IgdGhlIGNsb3NpbmcgcXVvdGUuXHJcblxyXG5cdFx0XHRcdGlmIChjID09PSBxKSB7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIExvb2sgZm9yIGVzY2FwZW1lbnQuXHJcblxyXG5cdFx0XHRcdGlmIChjID09PSAnXFxcXCcpIHtcclxuXHRcdFx0XHRcdGkgKz0gMTtcclxuXHRcdFx0XHRcdGlmIChpID49IGxlbmd0aCkge1xyXG5cdFx0XHRcdFx0XHRlcnJvcihcIlVudGVybWluYXRlZCBzdHJpbmdcIiwgbWFrZSgnc3RyaW5nJywgc3RyKSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRjID0gY29kZS5jaGFyQXQoaSk7XHJcblx0XHRcdFx0XHRzd2l0Y2ggKGMpIHtcclxuXHRcdFx0XHRcdGNhc2UgJ2InOlxyXG5cdFx0XHRcdFx0XHRjID0gJ1xcYic7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSAnZic6XHJcblx0XHRcdFx0XHRcdGMgPSAnXFxmJztcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlICduJzpcclxuXHRcdFx0XHRcdFx0YyA9ICdcXG4nO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgJ3InOlxyXG5cdFx0XHRcdFx0XHRjID0gJ1xccic7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSAndCc6XHJcblx0XHRcdFx0XHRcdGMgPSAnXFx0JztcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlICd1JzpcclxuXHRcdFx0XHRcdFx0aWYgKGkgPj0gbGVuZ3RoKSB7XHJcblx0XHRcdFx0XHRcdFx0ZXJyb3IoXCJVbnRlcm1pbmF0ZWQgc3RyaW5nXCIsIG1ha2UoJ3N0cmluZycsIHN0cikpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdGMgPSBwYXJzZUludChjb2RlLnN1YnN0cihpICsgMSwgNCksIDE2KTtcclxuXHRcdFx0XHRcdFx0aWYgKCFpc0Zpbml0ZShjKSB8fCBjIDwgMCkge1xyXG5cdFx0XHRcdFx0XHRcdGVycm9yKFwiVW50ZXJtaW5hdGVkIHN0cmluZ1wiLCBtYWtlKCdzdHJpbmcnLCBzdHIpKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRjID0gU3RyaW5nLmZyb21DaGFyQ29kZShjKTtcclxuXHRcdFx0XHRcdFx0aSArPSA0O1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0c3RyICs9IGM7XHJcblx0XHRcdFx0aSArPSAxO1xyXG5cdFx0XHR9XHJcblx0XHRcdGkgKz0gMTtcclxuXHRcdFx0cmVzdWx0LnB1c2gobWFrZSgnc3RyaW5nJywgc3RyKSk7XHJcblx0XHRcdGMgPSBjb2RlLmNoYXJBdChpKTtcclxuXHJcblx0XHRcdC8vIGNvbW1lbnQuXHJcblxyXG5cdFx0fSBlbHNlIGlmIChjID09PSAnLycgJiYgY29kZS5jaGFyQXQoaSArIDEpID09PSAnLycpIHtcclxuXHRcdFx0aSArPSAxO1xyXG5cdFx0XHRmb3IgKDsgOyApIHtcclxuXHRcdFx0XHRjID0gY29kZS5jaGFyQXQoaSk7XHJcblx0XHRcdFx0aWYgKGMgPT09ICdcXG4nIHx8IGMgPT09ICdcXHInIHx8IGMgPT09ICcnKSB7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aSArPSAxO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBjb21iaW5pbmdcclxuXHJcblx0XHR9IGVsc2UgaWYgKHByZWZpeC5pbmRleE9mKGMpID49IDApIHtcclxuXHRcdFx0c3RyID0gYztcclxuXHRcdFx0aSArPSAxO1xyXG5cdFx0XHR3aGlsZSAodHJ1ZSkge1xyXG5cdFx0XHRcdGMgPSBjb2RlLmNoYXJBdChpKTtcclxuXHRcdFx0XHRpZiAoaSA+PSBsZW5ndGggfHwgc3VmZml4LmluZGV4T2YoYykgPCAwKSB7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0c3RyICs9IGM7XHJcblx0XHRcdFx0aSArPSAxO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJlc3VsdC5wdXNoKG1ha2UoJ29wZXJhdG9yJywgc3RyKSk7XHJcblxyXG5cdFx0XHQvLyBzaW5nbGUtY2hhcmFjdGVyIG9wZXJhdG9yXHJcblxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0aSArPSAxO1xyXG5cdFx0XHRyZXN1bHQucHVzaChtYWtlKCdvcGVyYXRvcicsIGMpKTtcclxuXHRcdFx0YyA9IGNvZGUuY2hhckF0KGkpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRyZXR1cm4gcmVzdWx0O1xyXG59O1xyXG5cclxudmFyIG1ha2VfcGFyc2UgPSBmdW5jdGlvbiAoKSB7XHJcblx0dmFyIHN5bWJvbF90YWJsZSA9IHt9O1xyXG5cdHZhciB0b2tlbjtcclxuXHR2YXIgdG9rZW5zO1xyXG5cdHZhciB0b2tlbl9ucjtcclxuXHR2YXIgY29udGV4dDtcclxuXHJcblx0dmFyIGl0c2VsZiA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH07XHJcblxyXG5cdHZhciBmaW5kID0gZnVuY3Rpb24gKG4pIHtcclxuXHRcdG4ubnVkID0gaXRzZWxmO1xyXG5cdFx0bi5sZWQgPSBudWxsO1xyXG5cdFx0bi5zdGQgPSBudWxsO1xyXG5cdFx0bi5sYnAgPSAwO1xyXG5cdFx0cmV0dXJuIG47XHJcblx0fTtcclxuXHJcblx0dmFyIGFkdmFuY2UgPSBmdW5jdGlvbiAoaWQpIHtcclxuXHRcdHZhciBhLFxyXG5cdFx0byxcclxuXHRcdHQsXHJcblx0XHR2O1xyXG5cdFx0aWYgKGlkICYmIHRva2VuLmlkICE9PSBpZCkge1xyXG5cdFx0XHRlcnJvcihcIkV4cGVjdGVkICdcIiArIGlkICsgXCInLlwiLCB0b2tlbik7XHJcblx0XHR9XHJcblx0XHRpZiAodG9rZW5fbnIgPj0gdG9rZW5zLmxlbmd0aCkge1xyXG5cdFx0XHR0b2tlbiA9IHN5bWJvbF90YWJsZVtcIihlbmQpXCJdO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHR0ID0gdG9rZW5zW3Rva2VuX25yXTtcclxuXHRcdHRva2VuX25yICs9IDE7XHJcblx0XHR2ID0gdC52YWx1ZTtcclxuXHRcdGEgPSB0LnR5cGU7XHJcblx0XHRpZiAoKGEgPT09IFwib3BlcmF0b3JcIiB8fCBhICE9PSAnc3RyaW5nJykgJiYgdiBpbiBzeW1ib2xfdGFibGUpIHtcclxuXHRcdFx0Ly90cnVlLCBmYWxzZSDnrYnnm7TmjqXph4/kuZ/kvJrov5vlhaXmraTliIbmlK9cclxuXHRcdFx0byA9IHN5bWJvbF90YWJsZVt2XTtcclxuXHRcdFx0aWYgKCFvKSB7XHJcblx0XHRcdFx0ZXJyb3IoXCJVbmtub3duIG9wZXJhdG9yLlwiLCB0KTtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIGlmIChhID09PSBcIm5hbWVcIikge1xyXG5cdFx0XHRvID0gZmluZCh0KTtcclxuXHRcdH0gZWxzZSBpZiAoYSA9PT0gXCJzdHJpbmdcIiB8fCBhID09PSBcIm51bWJlclwiKSB7XHJcblx0XHRcdG8gPSBzeW1ib2xfdGFibGVbXCIobGl0ZXJhbClcIl07XHJcblx0XHRcdGEgPSBcImxpdGVyYWxcIjtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGVycm9yKFwiVW5leHBlY3RlZCB0b2tlbi5cIiwgdCk7XHJcblx0XHR9XHJcblx0XHR0b2tlbiA9IGNyZWF0ZShvKTtcclxuXHRcdHRva2VuLmZyb20gPSB0LmZyb207XHJcblx0XHR0b2tlbi50byA9IHQudG87XHJcblx0XHR0b2tlbi52YWx1ZSA9IHY7XHJcblx0XHR0b2tlbi5hcml0eSA9IGE7XHJcblx0XHRyZXR1cm4gdG9rZW47XHJcblx0fTtcclxuXHJcblx0dmFyIGV4cHJlc3Npb24gPSBmdW5jdGlvbiAocmJwKSB7XHJcblx0XHR2YXIgbGVmdDtcclxuXHRcdHZhciB0ID0gdG9rZW47XHJcblx0XHRhZHZhbmNlKCk7XHJcblx0XHRsZWZ0ID0gdC5udWQoKTtcclxuXHRcdHdoaWxlIChyYnAgPCB0b2tlbi5sYnApIHtcclxuXHRcdFx0dCA9IHRva2VuO1xyXG5cdFx0XHRhZHZhbmNlKCk7XHJcblx0XHRcdGxlZnQgPSB0LmxlZChsZWZ0KTtcclxuXHRcdH1cclxuXHRcdHJldHVybiBsZWZ0O1xyXG5cdH07XHJcblxyXG5cdHZhciBvcmlnaW5hbF9zeW1ib2wgPSB7XHJcblx0XHRudWQgOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdGVycm9yKFwiVW5kZWZpbmVkLlwiLCB0aGlzKTtcclxuXHRcdH0sXHJcblx0XHRsZWQgOiBmdW5jdGlvbiAobGVmdCkge1xyXG5cdFx0XHRlcnJvcihcIk1pc3Npbmcgb3BlcmF0b3IuXCIsIHRoaXMpO1xyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHZhciBzeW1ib2wgPSBmdW5jdGlvbiAoaWQsIGJwKSB7XHJcblx0XHR2YXIgcyA9IHN5bWJvbF90YWJsZVtpZF07XHJcblx0XHRicCA9IGJwIHx8IDA7XHJcblx0XHRpZiAocykge1xyXG5cdFx0XHRpZiAoYnAgPj0gcy5sYnApIHtcclxuXHRcdFx0XHRzLmxicCA9IGJwO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRzID0gY3JlYXRlKG9yaWdpbmFsX3N5bWJvbCk7XHJcblx0XHRcdHMuaWQgPSBzLnZhbHVlID0gaWQ7XHJcblx0XHRcdHMubGJwID0gYnA7XHJcblx0XHRcdHN5bWJvbF90YWJsZVtpZF0gPSBzO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHM7XHJcblx0fTtcclxuXHJcblx0dmFyIGNvbnN0YW50ID0gZnVuY3Rpb24gKHMsIHYsIGEpIHtcclxuXHRcdHZhciB4ID0gc3ltYm9sKHMpO1xyXG5cdFx0eC5udWQgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHRoaXMudmFsdWUgPSBzeW1ib2xfdGFibGVbdGhpcy5pZF0udmFsdWU7XHJcblx0XHRcdHRoaXMuYXJpdHkgPSBcImxpdGVyYWxcIjtcclxuXHRcdFx0cmV0dXJuIHRoaXM7XHJcblx0XHR9O1xyXG5cdFx0eC52YWx1ZSA9IHY7XHJcblx0XHRyZXR1cm4geDtcclxuXHR9O1xyXG5cclxuXHR2YXIgaW5maXggPSBmdW5jdGlvbiAoaWQsIGJwLCBsZWQpIHtcclxuXHRcdHZhciBzID0gc3ltYm9sKGlkLCBicCk7XHJcblx0XHRzLmxlZCA9IGxlZCB8fCBmdW5jdGlvbiAobGVmdCkge1xyXG5cdFx0XHR0aGlzLmZpcnN0ID0gbGVmdDtcclxuXHRcdFx0dGhpcy5zZWNvbmQgPSBleHByZXNzaW9uKGJwKTtcclxuXHRcdFx0dGhpcy5hcml0eSA9IFwiYmluYXJ5XCI7XHJcblx0XHRcdHJldHVybiB0aGlzO1xyXG5cdFx0fTtcclxuXHRcdHJldHVybiBzO1xyXG5cdH07XHJcblxyXG5cdHZhciBpbmZpeHIgPSBmdW5jdGlvbiAoaWQsIGJwLCBsZWQpIHtcclxuXHRcdHZhciBzID0gc3ltYm9sKGlkLCBicCk7XHJcblx0XHRzLmxlZCA9IGxlZCB8fCBmdW5jdGlvbiAobGVmdCkge1xyXG5cdFx0XHR0aGlzLmZpcnN0ID0gbGVmdDtcclxuXHRcdFx0dGhpcy5zZWNvbmQgPSBleHByZXNzaW9uKGJwIC0gMSk7XHJcblx0XHRcdHRoaXMuYXJpdHkgPSBcImJpbmFyeVwiO1xyXG5cdFx0XHRyZXR1cm4gdGhpcztcclxuXHRcdH07XHJcblx0XHRyZXR1cm4gcztcclxuXHR9O1xyXG5cclxuXHR2YXIgcHJlZml4ID0gZnVuY3Rpb24gKGlkLCBudWQpIHtcclxuXHRcdHZhciBzID0gc3ltYm9sKGlkKTtcclxuXHRcdHMubnVkID0gbnVkIHx8IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0dGhpcy5maXJzdCA9IGV4cHJlc3Npb24oNzApO1xyXG5cdFx0XHR0aGlzLmFyaXR5ID0gXCJ1bmFyeVwiO1xyXG5cdFx0XHRyZXR1cm4gdGhpcztcclxuXHRcdH07XHJcblx0XHRyZXR1cm4gcztcclxuXHR9O1xyXG5cclxuXHRzeW1ib2woXCIoZW5kKVwiKTtcclxuXHRzeW1ib2woXCIobmFtZSlcIik7XHJcblx0c3ltYm9sKFwiOlwiKTtcclxuXHRzeW1ib2woXCIpXCIpO1xyXG5cdHN5bWJvbChcIl1cIik7XHJcblx0c3ltYm9sKFwifVwiKTtcclxuXHRzeW1ib2woXCIsXCIpO1xyXG5cclxuXHRjb25zdGFudChcInRydWVcIiwgdHJ1ZSk7XHJcblx0Y29uc3RhbnQoXCJmYWxzZVwiLCBmYWxzZSk7XHJcblx0Y29uc3RhbnQoXCJudWxsXCIsIG51bGwpO1xyXG5cclxuXHRjb25zdGFudChcIk1hdGhcIiwgTWF0aCk7XHJcblx0Y29uc3RhbnQoXCJEYXRlXCIsIERhdGUpO1xyXG5cclxuXHRzeW1ib2woXCIobGl0ZXJhbClcIikubnVkID0gaXRzZWxmO1xyXG5cclxuXHQvLyBzeW1ib2woXCJ0aGlzXCIpLm51ZCA9IGZ1bmN0aW9uICgpIHtcclxuXHQvLyB0aGlzLmFyaXR5ID0gXCJ0aGlzXCI7XHJcblx0Ly8gcmV0dXJuIHRoaXM7XHJcblx0Ly8gfTtcclxuXHJcblx0Ly9PcGVyYXRvciBQcmVjZWRlbmNlOlxyXG5cdC8vaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvT3BlcmF0b3JzL09wZXJhdG9yX1ByZWNlZGVuY2VcclxuXHJcblx0aW5maXgoXCI/XCIsIDIwLCBmdW5jdGlvbiAobGVmdCkge1xyXG5cdFx0dGhpcy5maXJzdCA9IGxlZnQ7XHJcblx0XHR0aGlzLnNlY29uZCA9IGV4cHJlc3Npb24oMCk7XHJcblx0XHRhZHZhbmNlKFwiOlwiKTtcclxuXHRcdHRoaXMudGhpcmQgPSBleHByZXNzaW9uKDApO1xyXG5cdFx0dGhpcy5hcml0eSA9IFwidGVybmFyeVwiO1xyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSk7XHJcblxyXG5cdGluZml4cihcIiYmXCIsIDMxKTtcclxuXHRpbmZpeHIoXCJ8fFwiLCAzMCk7XHJcblxyXG5cdGluZml4cihcIj09PVwiLCA0MCk7XHJcblx0aW5maXhyKFwiIT09XCIsIDQwKTtcclxuXHJcblx0aW5maXhyKFwiPT1cIiwgNDApO1xyXG5cdGluZml4cihcIiE9XCIsIDQwKTtcclxuXHJcblx0aW5maXhyKFwiPFwiLCA0MCk7XHJcblx0aW5maXhyKFwiPD1cIiwgNDApO1xyXG5cdGluZml4cihcIj5cIiwgNDApO1xyXG5cdGluZml4cihcIj49XCIsIDQwKTtcclxuXHJcblx0aW5maXgoXCJpblwiLCA0NSwgZnVuY3Rpb24gKGxlZnQpIHtcclxuXHRcdHRoaXMuZmlyc3QgPSBsZWZ0O1xyXG5cdFx0dGhpcy5zZWNvbmQgPSBleHByZXNzaW9uKDApO1xyXG5cdFx0dGhpcy5hcml0eSA9IFwiYmluYXJ5XCI7XHJcblx0XHRpZiAoY29udGV4dCA9PT0gJ3JlcGVhdCcpIHtcclxuXHRcdFx0Ly8gYGluYCBhdCByZXBlYXQgYmxvY2tcclxuXHRcdFx0bGVmdC5hcml0eSA9ICdhc3NpZ25tZW50JztcclxuXHRcdFx0dGhpcy5hc3NpZ25tZW50ID0gdHJ1ZTtcclxuXHRcdH1cclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0pO1xyXG5cclxuXHRpbmZpeChcIitcIiwgNTApO1xyXG5cdGluZml4KFwiLVwiLCA1MCk7XHJcblxyXG5cdGluZml4KFwiKlwiLCA2MCk7XHJcblx0aW5maXgoXCIvXCIsIDYwKTtcclxuXHRpbmZpeChcIiVcIiwgNjApO1xyXG5cclxuXHRpbmZpeChcIi5cIiwgODAsIGZ1bmN0aW9uIChsZWZ0KSB7XHJcblx0XHR0aGlzLmZpcnN0ID0gbGVmdDtcclxuXHRcdGlmICh0b2tlbi5hcml0eSAhPT0gXCJuYW1lXCIpIHtcclxuXHRcdFx0ZXJyb3IoXCJFeHBlY3RlZCBhIHByb3BlcnR5IG5hbWUuXCIsIHRva2VuKTtcclxuXHRcdH1cclxuXHRcdHRva2VuLmFyaXR5ID0gXCJsaXRlcmFsXCI7XHJcblx0XHR0aGlzLnNlY29uZCA9IHRva2VuO1xyXG5cdFx0dGhpcy5hcml0eSA9IFwiYmluYXJ5XCI7XHJcblx0XHRhZHZhbmNlKCk7XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9KTtcclxuXHJcblx0aW5maXgoXCJbXCIsIDgwLCBmdW5jdGlvbiAobGVmdCkge1xyXG5cdFx0dGhpcy5maXJzdCA9IGxlZnQ7XHJcblx0XHR0aGlzLnNlY29uZCA9IGV4cHJlc3Npb24oMCk7XHJcblx0XHR0aGlzLmFyaXR5ID0gXCJiaW5hcnlcIjtcclxuXHRcdGFkdmFuY2UoXCJdXCIpO1xyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSk7XHJcblxyXG5cdGluZml4KFwiKFwiLCA4MCwgZnVuY3Rpb24gKGxlZnQpIHtcclxuXHRcdHZhciBhID0gW107XHJcblx0XHRpZiAobGVmdC5pZCA9PT0gXCIuXCIgfHwgbGVmdC5pZCA9PT0gXCJbXCIpIHtcclxuXHRcdFx0dGhpcy5hcml0eSA9IFwidGVybmFyeVwiO1xyXG5cdFx0XHR0aGlzLmZpcnN0ID0gbGVmdC5maXJzdDtcclxuXHRcdFx0dGhpcy5zZWNvbmQgPSBsZWZ0LnNlY29uZDtcclxuXHRcdFx0dGhpcy50aGlyZCA9IGE7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLmFyaXR5ID0gXCJiaW5hcnlcIjtcclxuXHRcdFx0dGhpcy5maXJzdCA9IGxlZnQ7XHJcblx0XHRcdHRoaXMuc2Vjb25kID0gYTtcclxuXHRcdFx0aWYgKChsZWZ0LmFyaXR5ICE9PSBcInVuYXJ5XCIgfHwgbGVmdC5pZCAhPT0gXCJmdW5jdGlvblwiKSAmJlxyXG5cdFx0XHRcdGxlZnQuYXJpdHkgIT09IFwibmFtZVwiICYmIGxlZnQuYXJpdHkgIT09IFwibGl0ZXJhbFwiICYmIGxlZnQuaWQgIT09IFwiKFwiICYmXHJcblx0XHRcdFx0bGVmdC5pZCAhPT0gXCImJlwiICYmIGxlZnQuaWQgIT09IFwifHxcIiAmJiBsZWZ0LmlkICE9PSBcIj9cIikge1xyXG5cdFx0XHRcdGVycm9yKFwiRXhwZWN0ZWQgYSB2YXJpYWJsZSBuYW1lLlwiLCBsZWZ0KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0aWYgKHRva2VuLmlkICE9PSBcIilcIikge1xyXG5cdFx0XHR3aGlsZSAodHJ1ZSkge1xyXG5cdFx0XHRcdGEucHVzaChleHByZXNzaW9uKDApKTtcclxuXHRcdFx0XHRpZiAodG9rZW4uaWQgIT09IFwiLFwiKSB7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0YWR2YW5jZShcIixcIik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGFkdmFuY2UoXCIpXCIpO1xyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSk7XHJcblxyXG5cdC8vZmlsdGVyXHJcblx0aW5maXgoXCJ8XCIsIDEwLCBmdW5jdGlvbiAobGVmdCkge1xyXG5cdFx0dmFyIGE7XHJcblx0XHR0aGlzLmZpcnN0ID0gbGVmdDtcclxuXHRcdHRva2VuLmFyaXR5ID0gJ2ZpbHRlcic7XHJcblx0XHR0aGlzLnNlY29uZCA9IGV4cHJlc3Npb24oMTApO1xyXG5cdFx0dGhpcy5hcml0eSA9ICdiaW5hcnknO1xyXG5cdFx0aWYgKHRva2VuLmlkID09PSAnOicpIHtcclxuXHRcdFx0dGhpcy5hcml0eSA9ICd0ZXJuYXJ5JztcclxuXHRcdFx0dGhpcy50aGlyZCA9IGEgPSBbXTtcclxuXHRcdFx0d2hpbGUgKHRydWUpIHtcclxuXHRcdFx0XHRhZHZhbmNlKCc6Jyk7XHJcblx0XHRcdFx0YS5wdXNoKGV4cHJlc3Npb24oMCkpO1xyXG5cdFx0XHRcdGlmICh0b2tlbi5pZCAhPT0gXCI6XCIpIHtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSk7XHJcblxyXG5cdHByZWZpeChcIiFcIik7XHJcblx0cHJlZml4KFwiLVwiKTtcclxuXHRwcmVmaXgoXCJ0eXBlb2ZcIik7XHJcblxyXG5cdHByZWZpeChcIihcIiwgZnVuY3Rpb24gKCkge1xyXG5cdFx0dmFyIGUgPSBleHByZXNzaW9uKDApO1xyXG5cdFx0YWR2YW5jZShcIilcIik7XHJcblx0XHRyZXR1cm4gZTtcclxuXHR9KTtcclxuXHJcblx0cHJlZml4KFwiW1wiLCBmdW5jdGlvbiAoKSB7XHJcblx0XHR2YXIgYSA9IFtdO1xyXG5cdFx0aWYgKHRva2VuLmlkICE9PSBcIl1cIikge1xyXG5cdFx0XHR3aGlsZSAodHJ1ZSkge1xyXG5cdFx0XHRcdGEucHVzaChleHByZXNzaW9uKDApKTtcclxuXHRcdFx0XHRpZiAodG9rZW4uaWQgIT09IFwiLFwiKSB7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0YWR2YW5jZShcIixcIik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGFkdmFuY2UoXCJdXCIpO1xyXG5cdFx0dGhpcy5maXJzdCA9IGE7XHJcblx0XHR0aGlzLmFyaXR5ID0gXCJ1bmFyeVwiO1xyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSk7XHJcblxyXG5cdHByZWZpeChcIntcIiwgZnVuY3Rpb24gKCkge1xyXG5cdFx0dmFyIGEgPSBbXSxcclxuXHRcdG4sXHJcblx0XHR2O1xyXG5cdFx0aWYgKHRva2VuLmlkICE9PSBcIn1cIikge1xyXG5cdFx0XHR3aGlsZSAodHJ1ZSkge1xyXG5cdFx0XHRcdG4gPSB0b2tlbjtcclxuXHRcdFx0XHRpZiAobi5hcml0eSAhPT0gXCJuYW1lXCIgJiYgbi5hcml0eSAhPT0gXCJsaXRlcmFsXCIpIHtcclxuXHRcdFx0XHRcdGVycm9yKFwiQmFkIHByb3BlcnR5IG5hbWU6IFwiLCB0b2tlbik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGFkdmFuY2UoKTtcclxuXHRcdFx0XHRhZHZhbmNlKFwiOlwiKTtcclxuXHRcdFx0XHR2ID0gZXhwcmVzc2lvbigwKTtcclxuXHRcdFx0XHR2LmtleSA9IG4udmFsdWU7XHJcblx0XHRcdFx0YS5wdXNoKHYpO1xyXG5cdFx0XHRcdGlmICh0b2tlbi5pZCAhPT0gXCIsXCIpIHtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRhZHZhbmNlKFwiLFwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0YWR2YW5jZShcIn1cIik7XHJcblx0XHR0aGlzLmZpcnN0ID0gYTtcclxuXHRcdHRoaXMuYXJpdHkgPSBcInVuYXJ5XCI7XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9KTtcclxuXHJcblx0Ly9fc291cmNlOiDooajovr7lvI/ku6PnoIHlrZfnrKbkuLJcclxuXHQvL19jb250ZXh0OiDooajovr7lvI/nmoTor63lj6Xnjq/looNcclxuXHRyZXR1cm4gZnVuY3Rpb24gKF9zb3VyY2UsIF9jb250ZXh0KSB7XG4gICAgc291cmNlID0gX3NvdXJjZTtcclxuXHRcdHRva2VucyA9IHRva2VuaXplKF9zb3VyY2UsICc9PD4hKy0qJnwvJV4nLCAnPTw+JnwnKTtcclxuXHRcdHRva2VuX25yID0gMDtcclxuXHRcdGNvbnRleHQgPSBfY29udGV4dDtcclxuXHRcdGFkdmFuY2UoKTtcclxuXHRcdHZhciBzID0gZXhwcmVzc2lvbigwKTtcclxuXHRcdGFkdmFuY2UoXCIoZW5kKVwiKTtcclxuXHRcdHJldHVybiBzO1xyXG5cdH07XHJcbn07XHJcblxyXG5leHBvcnRzLnBhcnNlID0gbWFrZV9wYXJzZSgpO1xyXG4iLCJ2YXIgdG9rZW5SZWcgPSAve3soeyhbXn1cXG5dKyl9fFtefVxcbl0rKX19L2c7XG5cbi8v5a2X56ym5Liy5Lit5piv5ZCm5YyF5ZCr5qih5p2/5Y2g5L2N56ym5qCH6K6wXG5mdW5jdGlvbiBoYXNUb2tlbihzdHIpIHtcbiAgdG9rZW5SZWcubGFzdEluZGV4ID0gMDtcbiAgcmV0dXJuIHN0ciAmJiB0b2tlblJlZy50ZXN0KHN0cik7XG59XG5cbmZ1bmN0aW9uIHBhcnNlVG9rZW4odmFsdWUpIHtcbiAgdmFyIHRva2VucyA9IFtdXG4gICAgLCB0ZXh0TWFwID0gW11cbiAgICAsIHN0YXJ0ID0gMFxuICAgICwgdmFsLCB0b2tlblxuICAgIDtcbiAgXG4gIHRva2VuUmVnLmxhc3RJbmRleCA9IDA7XG4gIFxuICB3aGlsZSgodmFsID0gdG9rZW5SZWcuZXhlYyh2YWx1ZSkpKXtcbiAgICBpZih0b2tlblJlZy5sYXN0SW5kZXggLSBzdGFydCA+IHZhbFswXS5sZW5ndGgpe1xuICAgICAgdGV4dE1hcC5wdXNoKHZhbHVlLnNsaWNlKHN0YXJ0LCB0b2tlblJlZy5sYXN0SW5kZXggLSB2YWxbMF0ubGVuZ3RoKSk7XG4gICAgfVxuICAgIFxuICAgIHRva2VuID0ge1xuICAgICAgZXNjYXBlOiAhdmFsWzJdXG4gICAgLCBwYXRoOiAodmFsWzJdIHx8IHZhbFsxXSkudHJpbSgpXG4gICAgLCBwb3NpdGlvbjogdGV4dE1hcC5sZW5ndGhcbiAgICAsIHRleHRNYXA6IHRleHRNYXBcbiAgICB9O1xuICAgIFxuICAgIHRva2Vucy5wdXNoKHRva2VuKTtcbiAgICBcbiAgICAvL+S4gOS4quW8leeUqOexu+WeiyjmlbDnu4Qp5L2c5Li66IqC54K55a+56LGh55qE5paH5pys5Zu+LCDov5nmoLflvZPmn5DkuIDkuKrlvJXnlKjmlLnlj5jkuobkuIDkuKrlgLzlkI4sIOWFtuS7luW8leeUqOWPluW+l+eahOWAvOmDveS8muWQjOaXtuabtOaWsFxuICAgIHRleHRNYXAucHVzaCh2YWxbMF0pO1xuICAgIFxuICAgIHN0YXJ0ID0gdG9rZW5SZWcubGFzdEluZGV4O1xuICB9XG4gIFxuICBpZih2YWx1ZS5sZW5ndGggPiBzdGFydCl7XG4gICAgdGV4dE1hcC5wdXNoKHZhbHVlLnNsaWNlKHN0YXJ0LCB2YWx1ZS5sZW5ndGgpKTtcbiAgfVxuICBcbiAgdG9rZW5zLnRleHRNYXAgPSB0ZXh0TWFwO1xuICBcbiAgcmV0dXJuIHRva2Vucztcbn1cblxuZXhwb3J0cy5oYXNUb2tlbiA9IGhhc1Rva2VuO1xuXG5leHBvcnRzLnBhcnNlVG9rZW4gPSBwYXJzZVRva2VuOyIsIlwidXNlIHN0cmljdFwiO1xuXG4vL3V0aWxzXG4vLy0tLVxuXG52YXIgZG9jID0gcmVxdWlyZSgnLi9kb2N1bWVudC5qcycpO1xuXG52YXIga2V5UGF0aFJlZyA9IC8oPzpcXC58XFxbKS9nXG4gICwgYnJhID0gL1xcXS9nXG4gIDtcblxuLy9wYXRoLmtleSwgcGF0aFtrZXldIC0tPiBbJ3BhdGgnLCAna2V5J11cbmZ1bmN0aW9uIHBhcnNlS2V5UGF0aChrZXlQYXRoKXtcbiAgcmV0dXJuIGtleVBhdGgucmVwbGFjZShicmEsICcnKS5zcGxpdChrZXlQYXRoUmVnKTtcbn1cblxuLyoqXG4gKiDlkIjlubblr7nosaFcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW2RlZXA9ZmFsc2VdIOaYr+WQpua3seW6puWQiOW5tlxuICogQHBhcmFtIHtPYmplY3R9IHRhcmdldCDnm67moIflr7nosaFcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb2JqZWN0Li4uXSDmnaXmupDlr7nosaFcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10g55So5LqO6Ieq5a6a5LmJ5ZCI5bm255qE5Zue6LCDXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn0g5ZCI5bm25ZCO55qEIHRhcmdldCDlr7nosaFcbiAqL1xuZnVuY3Rpb24gZXh0ZW5kKC8qIGRlZXAsIHRhcmdldCwgb2JqZWN0Li4uLCBjYWxsbGJhY2sgKi8pIHtcbiAgdmFyIG9wdGlvbnNcbiAgICAsIG5hbWUsIHNyYywgY29weSwgY29weUlzQXJyYXksIGNsb25lXG4gICAgLCB0YXJnZXQgPSBhcmd1bWVudHNbMF0gfHwge31cbiAgICAsIGkgPSAxXG4gICAgLCBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoXG4gICAgLCBkZWVwID0gZmFsc2VcbiAgICAsIGNhbGxiYWNrXG4gICAgO1xuXG4gIC8vIEhhbmRsZSBhIGRlZXAgY29weSBzaXR1YXRpb25cbiAgaWYgKHR5cGVvZiB0YXJnZXQgPT09IFwiYm9vbGVhblwiKSB7XG4gICAgZGVlcCA9IHRhcmdldDtcblxuICAgIC8vIHNraXAgdGhlIGJvb2xlYW4gYW5kIHRoZSB0YXJnZXRcbiAgICB0YXJnZXQgPSBhcmd1bWVudHNbIGkgXSB8fCB7fTtcbiAgICBpKys7XG4gIH1cbiAgXG4gIGlmKHV0aWxzLmlzRnVuY3Rpb24oYXJndW1lbnRzW2xlbmd0aCAtIDFdKSkge1xuICAgIGNhbGxiYWNrID0gYXJndW1lbnRzW2xlbmd0aCAtIDFdO1xuICAgIGxlbmd0aC0tO1xuICB9XG5cbiAgLy8gSGFuZGxlIGNhc2Ugd2hlbiB0YXJnZXQgaXMgYSBzdHJpbmcgb3Igc29tZXRoaW5nIChwb3NzaWJsZSBpbiBkZWVwIGNvcHkpXG4gIGlmICh0eXBlb2YgdGFyZ2V0ICE9PSBcIm9iamVjdFwiICYmICF1dGlscy5pc0Z1bmN0aW9uKHRhcmdldCkpIHtcbiAgICB0YXJnZXQgPSB7fTtcbiAgfVxuXG4gIGZvciAoIDsgaSA8IGxlbmd0aDsgaSsrICkge1xuICAgIC8vIE9ubHkgZGVhbCB3aXRoIG5vbi1udWxsL3VuZGVmaW5lZCB2YWx1ZXNcbiAgICBpZiAoIChvcHRpb25zID0gYXJndW1lbnRzWyBpIF0pICE9IG51bGwgKSB7XG4gICAgICAvLyBFeHRlbmQgdGhlIGJhc2Ugb2JqZWN0XG4gICAgICBmb3IgKCBuYW1lIGluIG9wdGlvbnMgKSB7XG4gICAgICAgIC8vYW5kcm9pZCAyLjMgYnJvd3NlciBjYW4gZW51bSB0aGUgcHJvdG90eXBlIG9mIGNvbnN0cnVjdG9yLi4uXG4gICAgICAgIGlmKG9wdGlvbnMuaGFzT3duUHJvcGVydHkobmFtZSkgJiYgbmFtZSAhPT0gJ3Byb3RvdHlwZScpe1xuICAgICAgICAgIHNyYyA9IHRhcmdldFsgbmFtZSBdO1xuICAgICAgICAgIGNvcHkgPSBvcHRpb25zWyBuYW1lIF07XG4gICAgICAgICAgXG5cbiAgICAgICAgICAvLyBSZWN1cnNlIGlmIHdlJ3JlIG1lcmdpbmcgcGxhaW4gb2JqZWN0cyBvciBhcnJheXNcbiAgICAgICAgICBpZiAoIGRlZXAgJiYgY29weSAmJiAoIHV0aWxzLmlzUGxhaW5PYmplY3QoY29weSkgfHwgKGNvcHlJc0FycmF5ID0gdXRpbHMuaXNBcnJheShjb3B5KSkgKSApIHtcbiAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFByZXZlbnQgbmV2ZXItZW5kaW5nIGxvb3BcbiAgICAgICAgICAgIGlmICggdGFyZ2V0ID09PSBjb3B5ICkge1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICggY29weUlzQXJyYXkgKSB7XG4gICAgICAgICAgICAgIGNvcHlJc0FycmF5ID0gZmFsc2U7XG4gICAgICAgICAgICAgIGNsb25lID0gc3JjICYmIHV0aWxzLmlzQXJyYXkoc3JjKSA/IHNyYyA6IFtdO1xuXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjbG9uZSA9IHNyYyAmJiB1dGlscy5pc1BsYWluT2JqZWN0KHNyYykgPyBzcmMgOiB7fTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYoY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgY29weSA9IGNhbGxiYWNrKGNsb25lLCBjb3B5LCBuYW1lKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTmV2ZXIgbW92ZSBvcmlnaW5hbCBvYmplY3RzLCBjbG9uZSB0aGVtXG4gICAgICAgICAgICB0YXJnZXRbIG5hbWUgXSA9IGV4dGVuZCggZGVlcCwgY2xvbmUsIGNvcHksIGNhbGxiYWNrKTtcblxuICAgICAgICAgICAgLy8gRG9uJ3QgYnJpbmcgaW4gdW5kZWZpbmVkIHZhbHVlc1xuICAgICAgICAgIH0gZWxzZSBpZiAoICF1dGlscy5pc1VuZGVmaW5lZChjb3B5KSApIHtcblxuICAgICAgICAgICAgaWYoY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgY29weSA9IGNhbGxiYWNrKHNyYywgY29weSwgbmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0YXJnZXRbIG5hbWUgXSA9IGNvcHk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gUmV0dXJuIHRoZSBtb2RpZmllZCBvYmplY3RcbiAgcmV0dXJuIHRhcmdldDtcbn1cblxudmFyIGNyZWF0ZSA9IE9iamVjdC5jcmVhdGUgfHwgZnVuY3Rpb24gKG8pIHtcbiAgZnVuY3Rpb24gRigpIHt9XG4gIEYucHJvdG90eXBlID0gbztcbiAgcmV0dXJuIG5ldyBGKCk7XG59O1xuXG5mdW5jdGlvbiB0cGxQYXJzZSh0cGwsIHRhcmdldCkge1xuICB2YXIgZWw7XG4gIGlmKHV0aWxzLmlzT2JqZWN0KHRwbCkpe1xuICAgIGlmKHRhcmdldCl7XG4gICAgICBlbCA9IHRhcmdldCA9IHV0aWxzLmlzT2JqZWN0KHRhcmdldCkgPyB0YXJnZXQgOiBkb2MuY3JlYXRlRWxlbWVudCh0YXJnZXQpO1xuICAgICAgZWwuaW5uZXJIVE1MID0gJyc7Ly/muIXnqbrnm67moIflr7nosaFcbiAgICAgIHRhcmdldC5hcHBlbmRDaGlsZCh0cGwpO1xuICAgIH1lbHNle1xuICAgICAgZWwgPSB0cGw7XG4gICAgfVxuICAgIHRwbCA9IGVsLm91dGVySFRNTDtcbiAgfWVsc2V7XG4gICAgZWwgPSB1dGlscy5pc09iamVjdCh0YXJnZXQpID8gdGFyZ2V0IDogZG9jLmNyZWF0ZUVsZW1lbnQodGFyZ2V0IHx8ICdkaXYnKTtcbiAgICBlbC5pbm5lckhUTUwgPSB0cGw7XG4gIH1cbiAgcmV0dXJuIHtlbDogZWwsIHRwbDogdHBsfTtcbn1cblxuIFxudmFyIHV0aWxzID0ge1xuICBub29wOiBmdW5jdGlvbiAoKXt9XG4sIGllOiAhIWRvYy5hdHRhY2hFdmVudFxuXG4sIGlzT2JqZWN0OiBmdW5jdGlvbiAodmFsKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWwgPT09ICdvYmplY3QnICYmIHZhbCAhPT0gbnVsbDtcbiAgfVxuXG4sIGlzVW5kZWZpbmVkOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWwgPT09ICd1bmRlZmluZWQnO1xuICB9XG5cbiwgaXNGdW5jdGlvbjogZnVuY3Rpb24gKHZhbCl7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWwgPT09ICdmdW5jdGlvbic7XG4gIH1cblxuLCBpc0FycmF5OiBmdW5jdGlvbiAodmFsKSB7XG4gICAgaWYodXRpbHMuaWUpe1xuICAgICAgLy9JRSA5IOWPiuS7peS4iyBJRSDot6jnqpflj6Pmo4DmtYvmlbDnu4RcbiAgICAgIHJldHVybiB2YWwgJiYgdmFsLmNvbnN0cnVjdG9yICsgJycgPT09IEFycmF5ICsgJyc7XG4gICAgfWVsc2V7XG4gICAgICByZXR1cm4gQXJyYXkuaXNBcnJheSh2YWwpO1xuICAgIH1cbiAgfVxuXG4gIC8v566A5Y2V5a+56LGh55qE566A5piT5Yik5patXG4sIGlzUGxhaW5PYmplY3Q6IGZ1bmN0aW9uIChvKXtcbiAgICBpZiAoIW8gfHwgKHt9KS50b1N0cmluZy5jYWxsKG8pICE9PSAnW29iamVjdCBPYmplY3RdJyB8fCBvLm5vZGVUeXBlIHx8IG8gPT09IG8ud2luZG93KSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfWVsc2V7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICAvL+WHveaVsOWIh+mdoi4gb3JpRm4g5Y6f5aeL5Ye95pWwLCBmbiDliIfpnaLooaXlhYXlh73mlbBcbiAgLy/liY3pnaLnmoTlh73mlbDov5Tlm57lgLzkvKDlhaUgYnJlYWtDaGVjayDliKTmlq0sIGJyZWFrQ2hlY2sg6L+U5Zue5YC85Li655yf5pe25LiN5omn6KGM5YiH6Z2i6KGl5YWF55qE5Ye95pWwXG4sIGJlZm9yZUZuOiBmdW5jdGlvbiAob3JpRm4sIGZuLCBicmVha0NoZWNrKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHJldCA9IGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICBpZihicmVha0NoZWNrICYmIGJyZWFrQ2hlY2suY2FsbCh0aGlzLCByZXQpKXtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvcmlGbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH1cblxuLCBhZnRlckZuOiBmdW5jdGlvbiAob3JpRm4sIGZuLCBicmVha0NoZWNrKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHJldCA9IG9yaUZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICBpZihicmVha0NoZWNrICYmIGJyZWFrQ2hlY2suY2FsbCh0aGlzLCByZXQpKXtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgIH1cbiAgICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICByZXR1cm4gcmV0O1xuICAgIH1cbiAgfVxuICBcbiwgcGFyc2VLZXlQYXRoOiBwYXJzZUtleVBhdGhcblxuLCBkZWVwU2V0OiBmdW5jdGlvbiAoa2V5U3RyLCB2YWx1ZSwgb2JqKSB7XG4gICAgaWYoa2V5U3RyKXtcbiAgICAgIHZhciBjaGFpbiA9IHBhcnNlS2V5UGF0aChrZXlTdHIpXG4gICAgICAgICwgY3VyID0gb2JqXG4gICAgICAgIDtcbiAgICAgIGNoYWluLmZvckVhY2goZnVuY3Rpb24oa2V5LCBpKSB7XG4gICAgICAgIGlmKGkgPT09IGNoYWluLmxlbmd0aCAtIDEpe1xuICAgICAgICAgIGN1cltrZXldID0gdmFsdWU7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgIGlmKGN1ciAmJiBjdXIuaGFzT3duUHJvcGVydHkoa2V5KSl7XG4gICAgICAgICAgICBjdXIgPSBjdXJba2V5XTtcbiAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgIGN1cltrZXldID0ge307XG4gICAgICAgICAgICBjdXIgPSBjdXJba2V5XTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1lbHNle1xuICAgICAgZXh0ZW5kKG9iaiwgdmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9XG4sIGRlZXBHZXQ6IGZ1bmN0aW9uIChrZXlTdHIsIG9iaikge1xuICAgIHZhciBjaGFpbiwgY3VyID0gb2JqLCBrZXk7XG4gICAgaWYoa2V5U3RyKXtcbiAgICAgIGNoYWluID0gcGFyc2VLZXlQYXRoKGtleVN0cik7XG4gICAgICBmb3IodmFyIGkgPSAwLCBsID0gY2hhaW4ubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGtleSA9IGNoYWluW2ldO1xuICAgICAgICBpZihjdXIgJiYgY3VyLmhhc093blByb3BlcnR5KGtleSkpe1xuICAgICAgICAgIGN1ciA9IGN1cltrZXldO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGN1cjtcbiAgfVxuLCBleHRlbmQ6IGV4dGVuZFxuLCBjcmVhdGU6IGNyZWF0ZVxuLCB0cGxQYXJzZTogdHBsUGFyc2Vcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gdXRpbHM7Il19
(1)
});
