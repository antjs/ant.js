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
  , beforeFn = utils.beforeFn
  , afterFn = utils.afterFn
  , parseKeyPath = utils.parseKeyPath
  , deepSet = utils.deepSet
  , deepGet = utils.deepGet
  , extend = utils.extend
  , ie = utils.ie
  , tplParse = utils.tplParse
  ;



//构建修饰 model
function modelExtend(model, data, vm) {
  buildArray(model, vm);
  return extend(true, model, data, function(a, b, name) {
    var res;
    if(name !== '__ant__') {
      res = b;
    }
    
    buildArray(a, vm);
    
    return res;
  });
}

//修饰数组
function buildArray(arr, vm) {
  if(vm && isArray(arr)){
    arr.__ant__ = vm;
    if(arr.push !== arrayMethods.push){
      extend(arr, arrayMethods)
    }
  }
  return arr;
}

var prefix, antAttr = {};

function setPrefix(newPrefix) {
  if(newPrefix){
    prefix = newPrefix;
    antAttr.IF = prefix + 'if';
    antAttr.REPEAT = prefix + 'repeat';
    antAttr.MODEL = prefix + 'model';
    this.prefix = prefix;
  }
}

function isAntAttr(attrName) {
  for(var attr in antAttr){
    if(antAttr[attr] === attrName){
      return true;
    }
  }
  return false;
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
    
    //TODO custom binding
    this.bindings = (this.bindings || []).concat(opts.bindings || []);

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
    this.init.apply(this, arguments);
  }
  
  //静态方法
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
          modelExtend(this.data, key, this._vm);
        }else{
          isExtend = false;
          this.data = modelExtend({}, key, this._vm);
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
            parent[path] = isObject(val) ? modelExtend(isArray(val) ? [] : {}, val, this._vm.$getVM(key, !isArray(val))) : val;
            isExtend = false;
          }else{
            modelExtend(this.data, deepSet(key, val, {}), this._vm);
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
        
        travelEl(els, vm);
        this.isRendered && vm.$set(deepGet(path, this.data), false, true);
      }
      return this;
    }
  , init: utils.noop
  
  , watch: function(keyPath, callback) {
      if(keyPath && callback){
        new Watcher(this._vm, {path: keyPath}, callback);
      }
      return this;
    }
  , unwatch: function(keyPath, callback) {
      var vm = this._vm.$getVM(keyPath, true);
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
    vm.$set(data, isExtend, isBubble !== false);
    this.trigger('update', attrs);
    return this;
  }
  
  function buildViewModel() {
    var vm = new ViewModel({
      $ant: this
    });
    
    this._vm = vm;
    travelEl(this.el, vm);
  }
  
  var NODETYPE = {
    ATTR: 2
  , TEXT: 3
  , COMMENT: 8
  };
  
  //遍历元素及其子元素的所有属性节点及文本节点
  function travelEl(el, vm) {
    if(el.length && isUndefined(el.nodeType)){
      //node list
      for(var i = 0, l = el.length; i < l; i++) {
        travelEl(el[i], vm);
      }
      return;
    }
    
    if(el.nodeType === NODETYPE.COMMENT){
      //注释节点
      return;
    }else if(el.nodeType === NODETYPE.TEXT){
      //文本节点
      checkText(el, vm);
      return;
    }
    
    //遇到 terminal 为 true 的 directive 属性不再遍历
    if(checkAttr(el, vm)){
      return;
    }
    
    for(var child = el.firstChild, next; child; ){
      next = child.nextSibling;
      travelEl(child, vm);
      child = next;
    }
  }
  
  //遍历属性
  function checkAttr(el, vm) {
    var repeatAttr = el.getAttributeNode(antAttr.REPEAT)
      , ifAttr = el.getAttributeNode(antAttr.IF)
      , attr, gen = repeatAttr || ifAttr
      ;
    
    var prefix = Ant.prefix
      , dirs = getDir(el, Ant.directives, prefix)
      , dir
      , terminalPriority, terminal
      ;
    
    for (var i = 0, l = dirs.length; i < l; i++) {
      dir = dirs[i];
     
      //对于 terminal 为 true 的 directive, 在解析完其相同权重的 directive 后中断解析
      if(terminalPriority < dir.priority) {
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
    
    // return;
    // if(gen){
      // checkBinding(vm, gen, el);
      // return true;
    // }
    
    // for(var i = el.attributes.length - 1; i >= 0; i--){
      // attr = el.attributes[i];
      // checkBinding(vm, attr, el);
      // //replace prefix and postfix attribute. a-style={{value}}, disabled?={{value}}
      // if(attr.nodeName.indexOf(prefix) === 0 || attrPostReg.test(attr.nodeName)){
        // el.removeAttribute(attr.nodeName);
      // }
    // }
  }
  
  function checkText(node, vm) {
    if(token.hasToken(node.nodeValue)) {
      var tokens = token.parseToken(node)
        , textMap = tokens.textMap
        , el = node.parentNode
        ;
      
      //将{{key}}分割成单独的文本节点
      if(textMap.length > 1) {
        textMap.forEach(function(text) {
          var tn = doc.createTextNode(text);
          el.insertBefore(tn, node);
          checkText(tn, vm);
        });
        el.removeChild(node);
      }else{
        tokens.forEach(function(token) {
          setBinding(vm, extend(token, token.escape ? Ant.directives.text : Ant.directives.html, {
            el: node
          }));
        });
      }
    }
  }
  
  //获取一个元素上所有用 HTML 属性定义的指令
  function getDir(el, directives, prefix) {
    prefix = prefix || '';
    directives = directives || {};
    
    var attr, attrName, dirName
      , dirs = [], dir
      ;
      
    for(var i = el.attributes.length - 1; i >= 0; i--){
      attr = el.attributes[i];
      attrName = attr.nodeName;
      dirName = attrName.slice(prefix.length);
      if(attrName.indexOf(prefix) === 0 && (dirName in directives)) {
        dir = extend({}, directives[dirName]);
        dir.dirName = dirName
      }else if(token.hasToken(attr.value)) {
        dir = extend({}, directives['attr']);
        dir.dirs = token.parseToken(attr);
        dir.dirName = attrName.indexOf(prefix) === 0 ? dirName : attrName ;
      }else{
        dir = false;
      }
      
      if(token.hasToken(attrName)) {
        //TODO 属性名
      }
      if(dir) {
        dirs.push(extend({el: el, node: attr, nodeName: attrName, path: attr.value}, dir));
      }
    }
    dirs.sort(function(d0, d1) {
      return d0.priority - d1.priority;
    });
    return dirs;
  }
  

  //el: 该节点的所属元素. 
  function checkBinding(vm, dir) {
    var node = dir.node
      , el = dir.el
      ;
      
    var hasTokenName = token.hasToken(node.nodeName)
      , hasTokenValue = token.hasToken(node.nodeValue)
      ;
      
    if(hasTokenValue || hasTokenName){
      var tokens = token.parseTokens(node, el, hasTokenName)
        , textMap = tokens.textMap
        , valTokens
        ;
      //如果绑定内容是在文本中, 则将{{key}}分割成单独的文本节点
      if(node.nodeType === NODETYPE.TEXT && textMap.length > 1){
        textMap.forEach(function(text) {
          var tn = doc.createTextNode(text);
          el.insertBefore(tn, node);
          checkText(tn, vm);
        });
        el.removeChild(node);
      }else{
        //<tag {{attr}}={{value}} />
        if(hasTokenName && hasTokenValue){
          valTokens = token.parseTokens(node, el);
          valTokens.forEach(function(token){
            token.baseTokens = tokens;
            addBinding(vm, token);
          });
        }
        
        setBinding(vm, dir, tokens);
      }
    }
  }
  
  function setBinding(vm, dir) {
    if(dir.replace) {
      var el = dir.el;
      if(isFunction(dir.replace)) {
        dir.node = dir.replace();
      }else{
        dir.node = doc.createComment(dir.type + ' = ' + dir.path);
      }
      
      dir.el = dir.el.parentNode;
      dir.el.replaceChild(dir.node, el);
    }
    
    dir.init(vm);
    
    if(dir.dirs) {
      dir.dirs.forEach(function(token) {
        new Watcher(vm, extend({}, dir, token));
      });
    }else{
      new Watcher(vm, dir);
    }
  }
  
  function addBinding(vm, dir) {
    var binding = getBinding(vm.$root.$ant.bindings);
    binding(vm, dir);
  }
  
  function getBinding(bindings) {
    bindings = baseBindings.concat(bindings);
    var binding = bindings[0];
    for(var i = 1, l = bindings.length; i < l; i++){
      binding = beforeFn(binding, bindings[i], function(ret) {
        return (ret instanceof Watcher) || ret === false;
      })
    }
    return binding;
  }
  
  function ViewModel(opts) {
    extend(this, {
      $key: ''
    , $root: this
    , $watchers: []
    , $assignment: {}
    }, opts);
  }
  
  ViewModel.prototype = {
    $root: null
  , $parent: null
  
  , $ant: null
  , $key: null
  , $repeat: false
  , $assignment: null
  
  , $watchers: null

  , $value: NaN
    
  //获取子 vm
  //strict: false(default)不存在的话将新建一个
  , $getVM: function(path, strict) {
      path = path + '';
      
      var key, vm
        , cur = this
        , keyChain = utils.parseKeyPath(path)
        ;
        
      if(keyChain[0] in this.$assignment) {
        cur = this.$assignment[keyChain[0]];
        keyChain.shift();
      }
      if(path){
        for(var i = 0, l = keyChain.length; i < l; i++){
          key = keyChain[i];
          
          if(!cur[key]){
            if(strict){ return null; }
            vm = new ViewModel({
              $parent: cur
            , $root: cur.$root
            , $assignment: extend({}, cur.$assignment)
            , $key: key
            });
            
            cur[key] = vm;
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
  
  //获取对象的某个值, 没有的话查找父节点, 直到顶层.
  , $getData: function(key, isStrict) {
      if(key === '$index' && this.$parent && this.$parent.$repeat){
        return this.$key * 1;
      }
      var curVal = deepGet(key, this.$root.$ant.get(this.$getKeyPath()));
      if(isStrict || !this.$parent || !isUndefined(curVal)){
        return curVal;
      }else{
        return this.$parent.$getData(key);
      }
    }
  , $set: function (data, isExtend, isBubble) {
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
          if(this.hasOwnProperty(path) && (!(path in ViewModel.prototype)) && (!this.$repeat || path === 'length')){
            this[path].$set(data ? data[path] : void(0), isExtend);
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
  };
  
  
  var pertialReg = /^>\s*(?=.+)/;
  
  //buid in bindings
  var baseBindings = [
    //局部模板. {{> anotherant}}
    function(vm, token) {
      var pName, ant, opts, node;
      if(token.nodeName === '#text' && pertialReg.test(token.path)){
        pName = token.path.replace(pertialReg, '');
        ant = vm.$root.$ant;
        opts = ant.options;
        node = doc.createTextNode('');
        token.el.insertBefore(node, token.node);
        token.el.removeChild(token.node);
        
        ant.setPartial({
          name: pName
        , content: opts && opts.partials && opts.partials[pName]
        , target: function(el) { token.el.insertBefore(el, node) }
        , escape: token.escape
        , path: vm.$getKeyPath()
        });
        return false;
      }
    }
    
    //if / repeat
  , function(vm, token) {
      if(token.nodeName === antAttr.IF || token.nodeName === antAttr.REPEAT){
        return new Generator(vm, token);
      }
    }
  ];
  
  var exParse = function(path) {
    var that = this;
    var ast = parse(path, this.type && this.type.slice(prefix.length));
      
    extend(this, evaluate.summary(ast));
    this._ast = ast;
  };
  
  function Watcher(relativeVm, token, callback) {
    this.token = token;
    this.relativeVm = relativeVm;
    this.ant = relativeVm.$root.$ant;
    
    this.el = token.el;
    this.val = NaN;
    
    this.update = callback ? callback : token.update;
    
    token.path && exParse.call(this, token.path);
    
    var root = relativeVm
      , paths
      , run = !this.locals.length
      ;
    
    for(var i = 0, l = this.paths.length; i < l; i++){
      paths = utils.parseKeyPath(this.paths[i]);
      if(!(paths[0] in relativeVm.$assignment)) {
        root = relativeVm.$root;
        run = run || root !== relativeVm;
      }else{
        //if(this.state == Watcher.STATE_READY) {
          run = true;//引用父级 VM 时, 立即计算
        //}
      }
      root.$getVM(this.paths[i]).$watchers.push(this);
    }
    
    this.state = Watcher.STATE_READY
    
    //When there is no variable in a binding, evaluate it immediately.
    if(run) {
      this.fn();
    }
  }
  
  extend(Watcher, {
    STATE_READY: 0
  , STATE_CALLED: 1
  }, Class);
  
  extend(Watcher.prototype, {
    fn: function() {
      var vals = {}, key;
      for(var i = 0, l = this.locals.length; i < l; i++){
        key = this.locals[i];
        if(key in this.relativeVm.$assignment){
          vals[key] = this.relativeVm.$assignment[key].$getData();
        // }else if(key === '.'){
          // vals = this.relativeVm.$getData();
        }else{
          vals[key] = this.relativeVm.$getData(key)
        }
      }
      
      var newVal = this.getValue(vals)
        , dir = this.token
        ;
        
      if(newVal !== this.val){
        try{
          this.update.call(this.token, newVal, this.val);
          this.val = newVal;
        }catch(e){
          console.error(e);
        }
      }
      this.state = Watcher.STATE_CALLED;
    }
    //update the DOMs
  , callback: function(newVal) {
      var token = this.token
        , pos = token.position
        , node = token.node
        , el = token.el
        , textMap = token.textMap
        , nodeName = token.nodeName
        , isAttrName = token.isAttrName
        , val
        ;
      if(newVal + '' !== textMap[pos] + '') {
        
        textMap[pos] = newVal && (newVal + '');
        val = textMap.join('');
        
        if(nodeName === '#text') {
          
        }else{
          //{{}} token in attribute value, which nodeName is dynamic
          //baseTokens is about attribute name
          if(token.baseTokens){
            nodeName = token.nodeName = token.baseTokens.textMap.join('');
          }

          if(!isAttrName){
            node.nodeValue = val;
          }

          //conditional attribute just only consider attr's value
          if(token.condiAttr && !isAttrName){
            if(newVal){
             // delete node._hide_;
            }else{
              el.removeAttribute(nodeName);
             // node._hide_ = true;
              return;
            }
          }
          //if(!node._hide_){
            if(isAttrName){
              if(nodeName){
                el.removeAttribute(nodeName);
              }
              nodeName = token.nodeName = val;
              val = node.nodeValue;
            }
            if(nodeName){
              setAttr(el, nodeName, val);
            }
          // }else{
          //   console.log('skip..')
          // }
        }
      }
    }
  , getValue: function(vals) {
      var filters = this.filters
        , ant = this.ant, val
        ;
      
      for(var i = 0, l = filters.length; i < l; i++){
        if(!ant.filters[filters[i]]){
          console.error('Filter: ' + filters[i] + ' not found!');
        }
      }
      
      try{
        val = evaluate.eval(this._ast, {locals: vals, filters: ant.filters});
      }catch(e){
        val = '';
      }
      return val;
    }
  });
  
  //---
  function callRepeater(vmArray, method, args){
    var watchers = vmArray.__ant__.$watchers;
    var noFixVm = false;
    for(var i = 0, l = watchers.length; i < l; i++){
      if(watchers[i].type === antAttr.REPEAT){
        watchers[i][method](args, vmArray, noFixVm);
        noFixVm = true;
      }
    }
    vmArray.__ant__.$getVM('length').$set(vmArray.length, false, true);
    vmArray.__ant__.$root.$ant.trigger('update');
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
  
  //处理动态节点(z-repeat, z-if)
  var Generator = Watcher.extend(
    {
      constructor: function (relativeVm, token){
        //文档参照节点. 
        var anchor = doc.createTextNode('')
          , el = token.el
          , type = token.nodeName
          ;

        this.type = type;
        this.anchor = anchor;
        el.parentNode.insertBefore(anchor, el);
        el.parentNode.removeChild(el);
          
        Watcher.apply(this, arguments);
        
        el.removeAttribute(type);
                
        this.els = [];
        this.vm = relativeVm.$getVM(this.paths[0]);
        
        if(type === antAttr.IF){
          //if 属性不用切换作用域
          travelEl(this.el, relativeVm);
        }else{
          this.vm.$repeat = true;
        }
        
      }
    , callback: function(data, old) {
        var that = this
          ;
        if(that.type === antAttr.REPEAT){
          if(data && !isArray(data)){
            console.warn('需要一个数组');
            return;
          }
          data && this.splice([0, this.els.length].concat(data), data);
        }else{
          if(data) {
            if(!that.lastIfState) {
              that.anchor.parentNode.insertBefore(that.el, that.anchor);
            }
          }else{
            if(that.lastIfState) {
              that.el.parentNode.removeChild(that.el);
            }
          }
          that.lastIfState = data;
        }
        
      }
      //精确控制 DOM 列表
      //args: [index, n/*, items...*/]
      //arr: 数组数据
      //noFixVm: 是否不需要维护 viewmodel 索引
    , splice: function(args, arr, noFixVm) {
        var els = this.els
          , items = args.slice(2)
          , index = args[0] * 1
          , n = args[1] * 1
          , m = items.length
          , newEls = []
          , frag = doc.createDocumentFragment()
          , pn = this.anchor.parentNode
          , el, vm
          ;
        
        if(isUndefined(n)){
          args[1] = n = els.length - index;
        }
        
        for(var i = index, l = els.length; i < l; i++){
          if(i < index + n){
            //删除
            //对于拥有 if 属性并且不显示的节点, 其并不存在于 DOM 树中
            try{ pn.removeChild(els[i]); }catch(e){}
            noFixVm || delete this.vm[i];
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
              if(!noFixVm){
                vm = this.vm[newI] = this.vm[oldI];
                vm.$key = newI + '';
              }
            }else{
              break;
            }
          }
        }
        
        //新增
        for(var j = 0; j < m; j++){
          el = this.el.cloneNode(true);
          noFixVm || delete this.vm[index + j];
          vm = this.vm.$getVM(index + j);
          
          for(var a = 0; a < this.assignments.length; a++) {
            vm.$assignment[this.assignments[a]] = vm;
          }
          
          el['$index'] = index + j;
          frag.appendChild(el);
          travelEl(el, vm);
          vm.$set(items[j]);
          
          newEls.push(el);
          if(arr && isObject(arr[index + j])){
            arr[index + j] = modelExtend(isArray(arr[index + j]) ? []: {}, arr[index + j], vm);
          }
        }
        if(newEls.length){
          pn.insertBefore(frag, els[index + n] || this.anchor);
        }
        
        //需要清除缩短后多出的部分
        if(!noFixVm){
          for(var k = l - n + m; k < l; k++){
            delete this.vm[k];
          }
        }
        
        if(arr.__ant__ !== this.vm) {
          arr.__ant__ = this.vm;
        }
        
        args = args.slice(0, 2).concat(newEls);
        els.splice.apply(els, args);
      }
    , reverse: function(args, arr, noFixVm) {
        var vms = this.vm, vm
          , el = this.anchor
          , frag = doc.createDocumentFragment()
          ;
        for(var i = 0, l = this.els.length; i < l; i++){
          if((!noFixVm) && i < 1/2){
            vm = vms[i];
            vms[i] = vms[l - i - 1];
            vms[i].$key = i + '';
            vm.$key = l - i - 1 + '';
            vms[l - i - 1] = vm;
          }
          this.els[i]['$index'] = l - i - 1;
          frag.appendChild(this.els[l - i - 1]);
        }
        el.parentNode.insertBefore(frag, el);
        this.els.reverse();
      }
    , sort: function(fn){
        //TODO 进行精确高还原的排序?
        this.callback(this.val)
      }
    }
  )
  
  Ant._parse = parse;
  Ant._eval = evaluate.eval;
  Ant.version = '0.2.3';
  
  module.exports = Ant;
},{"./class.js":2,"./directive.js":3,"./directives":5,"./document.js":7,"./eval.js":8,"./event.js":9,"./parse.js":10,"./token.js":11,"./utils.js":12}],2:[function(_dereq_,module,exports){
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
},{"./utils.js":12}],3:[function(_dereq_,module,exports){
"use strict";

var utils = _dereq_('./utils.js')
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
  }, opts);
}

},{"./utils.js":12}],4:[function(_dereq_,module,exports){
"use strict";

module.exports = {
  init: function() {
    if(this.dirName === this.type) {
      this.attrs = {};
    }
  }
, update: function(val) {
    if(this.dirName === this.type) {
      
      for(var attr in val) {
        setAttr(this.el, attr, val[attr]);
        if(val[attr]) {
          delete this.attrs[attr];
        }
      }
      for(var attr in this.attrs) {
        this.el.removeAttribute(attr);
      }
      this.attrs = val;
    }else{
      this.textMap[this.position] = val && (val + '');
      val = this.textMap.join('');
      setAttr(this.el, this.dirName, val);
    }
  }
};

  // update: function(newVal) {
    // var isAttrName = this.isAttrName
      // , nodeName = this.dirName
      // , node = this.node
      // , el = this.el
      // , val
      // ;
    
    // this.textMap[this.position] = newVal && (newVal + '');
    // val = this.textMap.join('');
    
    // //{{}} token in attribute value, which nodeName is dynamic
    // //baseTokens is about attribute name
    // if(this.baseTokens){
      // nodeName = this.nodeName = this.baseTokens.textMap.join('');
    // }

    // if(!isAttrName){
      // node.nodeValue = val;
    // }

    // //conditional attribute just only consider attr's value
    // if(this.condiAttr && !isAttrName){
      // if(newVal){
       // // delete node._hide_;
      // }else{
        // el.removeAttribute(nodeName);
       // // node._hide_ = true;
        // return;
      // }
    // }
    // //if(!node._hide_){
      // if(isAttrName){
        // if(nodeName){
          // el.removeAttribute(nodeName);
        // }
        // nodeName = this.nodeName = val;
        // val = node.nodeValue;
      // }
      // if(nodeName){
        // setAttr(el, nodeName, val);
      // }
    // // }else{
    // //   console.log('skip..')
    // // }
    
  // }


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

var doc = _dereq_('../document.js');

var dirs = {};


dirs.text = {
  terminal: true
, replace: function() { return doc.createTextNode('') }
, update: function(val) {
    this.node.nodeValue = val;
  }
};


dirs.html = {
  terminal: true
, replace: true
, init: function() {
    this.nodes = [];
  }
, update: function(val) {
    var el = document.createElement('div');
    el.innerHTML = val;
    
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
  
  
dirs.repeat = {
  priority: 10000
, terminal: true
};
  
dirs['if'] = {
  
};
  
dirs.attr = _dereq_('./attr.js');
dirs.model = _dereq_('./model.js')
  
dirs.partial = {
  terminal: true
, init: function() {
    ;
  }
};

module.exports = dirs;
},{"../document.js":7,"./attr.js":4,"./model.js":6}],6:[function(_dereq_,module,exports){
"use strict";

var utils = _dereq_('../utils.js');

module.exports = {
  teminal: true
, priority: 1
, init: function(vm) {
    var keyPath = this.path;
    
    if(!keyPath) { return false; }
    
    var el = this.el
      , ev = 'change'
      , attr, value = attr = 'value'
      , ant = vm.$root.$ant
      , cur = vm.$getVM(keyPath)
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
        //isSetDefaut = isSetDefaut && !hasToken(el[value]);
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
},{"../utils.js":12}],7:[function(_dereq_,module,exports){
(function(root){
  "use strict";

  module.exports = root.document || _dereq_('jsdom').jsdom();

})((function() {return this})());
},{}],8:[function(_dereq_,module,exports){
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
        delete summary.locals[l];
        summary.assignments[l] = true;
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
},{}],9:[function(_dereq_,module,exports){
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
},{"./utils.js":12}],10:[function(_dereq_,module,exports){
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
},{}],11:[function(_dereq_,module,exports){
var tokenReg = /{{({([^}\n]+)}|[^}\n]+)}}/g;
var attrPostReg = /\?$/;

//字符串中是否包含模板占位符标记
function hasToken(str) {
  tokenReg.lastIndex = 0;
  return str && tokenReg.test(str);
}

function parseToken(node, parseNodeName) {
  var tokens = []
    , textMap = []
    , start = 0
    , value = node.nodeValue
    , nodeName = node.nodeName
    , condiAttr, isAttrName
    , val, token
    ;
  
  // if(node.nodeType === NODETYPE.ATTR){
    // //attribute with prefix.
    // if(nodeName.indexOf(prefix) === 0 && !isAntAttr(nodeName)){
      // nodeName = node.nodeName.slice(prefix.length);
    // }
    
    // if(attrPostReg.test(nodeName)){
      // //attribute with postfix
      // //attr?={{condition}}
      // nodeName = nodeName.slice(0, nodeName.length - 1);
      // condiAttr = true;
    // }
    // if(parseNodeName){
      // value = nodeName;//属性名
      // isAttrName = true;
    // }
  // }
  
  tokenReg.lastIndex = 0;
  
  while((val = tokenReg.exec(value))){
    if(tokenReg.lastIndex - start > val[0].length){
      textMap.push(value.slice(start, tokenReg.lastIndex - val[0].length));
    }
    
    token = {
      escape: !val[2]
    , path: (val[2] || val[1]).trim()
    , position: textMap.length
    , node: node
    , nodeName: nodeName
    , textMap: textMap
    };
    if(condiAttr){ token.condiAttr = true; }
    if(isAttrName){ token.isAttrName = true; }
    
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
},{}],12:[function(_dereq_,module,exports){
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
, tplParse: tplParse
};

module.exports = utils;
},{"./document.js":7}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJFOlxcanVzdGFuXFxEcm9wYm94XFxjb2RlXFxhbnQuanNcXG5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwiRTovanVzdGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL2FudC5qcyIsIkU6L2p1c3Rhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy9jbGFzcy5qcyIsIkU6L2p1c3Rhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy9kaXJlY3RpdmUuanMiLCJFOi9qdXN0YW4vRHJvcGJveC9jb2RlL2FudC5qcy9zcmMvZGlyZWN0aXZlcy9hdHRyLmpzIiwiRTovanVzdGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL2RpcmVjdGl2ZXMvaW5kZXguanMiLCJFOi9qdXN0YW4vRHJvcGJveC9jb2RlL2FudC5qcy9zcmMvZGlyZWN0aXZlcy9tb2RlbC5qcyIsIkU6L2p1c3Rhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy9kb2N1bWVudC5qcyIsIkU6L2p1c3Rhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy9ldmFsLmpzIiwiRTovanVzdGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL2V2ZW50LmpzIiwiRTovanVzdGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL3BhcnNlLmpzIiwiRTovanVzdGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL3Rva2VuLmpzIiwiRTovanVzdGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNobEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGRvYyA9IHJlcXVpcmUoJy4vZG9jdW1lbnQuanMnKVxuICAsIHBhcnNlID0gcmVxdWlyZSgnLi9wYXJzZS5qcycpLnBhcnNlXG4gICwgZXZhbHVhdGUgPSByZXF1aXJlKCcuL2V2YWwuanMnKVxuICAsIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpXG4gICwgRXZlbnQgPSByZXF1aXJlKCcuL2V2ZW50LmpzJylcbiAgLCBDbGFzcyA9IHJlcXVpcmUoJy4vY2xhc3MuanMnKVxuICAsIERpciA9IHJlcXVpcmUoJy4vZGlyZWN0aXZlLmpzJylcbiAgLCBkaXJzID0gcmVxdWlyZSgnLi9kaXJlY3RpdmVzJylcbiAgLCB0b2tlbiA9IHJlcXVpcmUoJy4vdG9rZW4uanMnKVxuICA7XG5cblxudmFyIGlzT2JqZWN0ID0gdXRpbHMuaXNPYmplY3RcbiAgLCBpc1VuZGVmaW5lZCA9IHV0aWxzLmlzVW5kZWZpbmVkXG4gICwgaXNGdW5jdGlvbiA9IHV0aWxzLmlzRnVuY3Rpb25cbiAgLCBpc0FycmF5ID0gdXRpbHMuaXNBcnJheVxuICAsIGlzUGxhaW5PYmplY3QgPSB1dGlscy5pc1BsYWluT2JqZWN0XG4gICwgYmVmb3JlRm4gPSB1dGlscy5iZWZvcmVGblxuICAsIGFmdGVyRm4gPSB1dGlscy5hZnRlckZuXG4gICwgcGFyc2VLZXlQYXRoID0gdXRpbHMucGFyc2VLZXlQYXRoXG4gICwgZGVlcFNldCA9IHV0aWxzLmRlZXBTZXRcbiAgLCBkZWVwR2V0ID0gdXRpbHMuZGVlcEdldFxuICAsIGV4dGVuZCA9IHV0aWxzLmV4dGVuZFxuICAsIGllID0gdXRpbHMuaWVcbiAgLCB0cGxQYXJzZSA9IHV0aWxzLnRwbFBhcnNlXG4gIDtcblxuXG5cbi8v5p6E5bu65L+u6aWwIG1vZGVsXG5mdW5jdGlvbiBtb2RlbEV4dGVuZChtb2RlbCwgZGF0YSwgdm0pIHtcbiAgYnVpbGRBcnJheShtb2RlbCwgdm0pO1xuICByZXR1cm4gZXh0ZW5kKHRydWUsIG1vZGVsLCBkYXRhLCBmdW5jdGlvbihhLCBiLCBuYW1lKSB7XG4gICAgdmFyIHJlcztcbiAgICBpZihuYW1lICE9PSAnX19hbnRfXycpIHtcbiAgICAgIHJlcyA9IGI7XG4gICAgfVxuICAgIFxuICAgIGJ1aWxkQXJyYXkoYSwgdm0pO1xuICAgIFxuICAgIHJldHVybiByZXM7XG4gIH0pO1xufVxuXG4vL+S/rumlsOaVsOe7hFxuZnVuY3Rpb24gYnVpbGRBcnJheShhcnIsIHZtKSB7XG4gIGlmKHZtICYmIGlzQXJyYXkoYXJyKSl7XG4gICAgYXJyLl9fYW50X18gPSB2bTtcbiAgICBpZihhcnIucHVzaCAhPT0gYXJyYXlNZXRob2RzLnB1c2gpe1xuICAgICAgZXh0ZW5kKGFyciwgYXJyYXlNZXRob2RzKVxuICAgIH1cbiAgfVxuICByZXR1cm4gYXJyO1xufVxuXG52YXIgcHJlZml4LCBhbnRBdHRyID0ge307XG5cbmZ1bmN0aW9uIHNldFByZWZpeChuZXdQcmVmaXgpIHtcbiAgaWYobmV3UHJlZml4KXtcbiAgICBwcmVmaXggPSBuZXdQcmVmaXg7XG4gICAgYW50QXR0ci5JRiA9IHByZWZpeCArICdpZic7XG4gICAgYW50QXR0ci5SRVBFQVQgPSBwcmVmaXggKyAncmVwZWF0JztcbiAgICBhbnRBdHRyLk1PREVMID0gcHJlZml4ICsgJ21vZGVsJztcbiAgICB0aGlzLnByZWZpeCA9IHByZWZpeDtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0FudEF0dHIoYXR0ck5hbWUpIHtcbiAgZm9yKHZhciBhdHRyIGluIGFudEF0dHIpe1xuICAgIGlmKGFudEF0dHJbYXR0cl0gPT09IGF0dHJOYW1lKXtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbiAgLyoqXG4gICAqICMgQW50XG4gICAqIOWfuuS6jiBkb20g55qE5qih5p2/5byV5pOOLiDmlK/mjIHmlbDmja7nu5HlrppcbiAgICogQHBhcmFtIHtTdHJpbmcgfCBFbGVtZW50fSBbdHBsXSDmqKHmnb/lupTor6XmmK/lkIjms5XogIzkuJTmoIflh4bnmoQgSFRNTCDmoIfnrb7lrZfnrKbkuLLmiJbogIXnm7TmjqXmmK/njrDmnIkgRE9NIOagkeS4reeahOS4gOS4qiBlbGVtZW50IOWvueixoS5cbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRzXVxuICAgKiBAcGFyYW0ge1N0cmluZyB8IEVsZW1lbnR9IG9wdHMudHBsXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzLmRhdGEg5riy5p+T5qih5p2/55qE5pWw5o2uLiDor6XpobnlpoLmnpzkuLrnqbosIOeojeWQjuWPr+S7peeUqCBgdHBsLnJlbmRlcihtb2RlbClgIOadpea4suafk+eUn+aIkCBodG1sLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdHMubGF6eSDmmK/lkKblr7kgJ2lucHV0JyDlj4ogJ3RleHRhcmVhJyDnm5HlkKwgYGNoYW5nZWAg5LqL5Lu2LCDogIzkuI3mmK8gYGlucHV0YCDkuovku7ZcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMuZXZlbnRzIFxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cy5wYXJ0aWFsc1xuICAgKiBAcGFyYW0ge1N0cmluZyB8IEhUTUxFTGVtZW50fSBvcHRzLmVsXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKi9cbiAgZnVuY3Rpb24gQW50KHRwbCwgb3B0cykge1xuICAgIGlmKGlzUGxhaW5PYmplY3QodHBsKSkge1xuICAgICAgdHBsID0gb3B0cy50cGw7XG4gICAgfVxuICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgIHZhciBlbFxuICAgICAgLCBkZWZhdWx0cyA9IHRoaXMuZGVmYXVsdHMgfHwge31cbiAgICAgIDtcblxuICAgIG9wdHMgPSBleHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBvcHRzKTtcblxuICAgIHZhciBkYXRhID0gb3B0cy5kYXRhIHx8IHt9XG4gICAgICAsIGV2ZW50cyA9IG9wdHMuZXZlbnRzIHx8IHt9XG4gICAgICAsIGZpbHRlcnMgPSBvcHRzLmZpbHRlcnMgfHwge31cbiAgICAgIDtcbiAgICBcbiAgICBlbCA9IHRwbFBhcnNlKHRwbCwgb3B0cy5lbCk7XG4gICAgdHBsID0gZWwudHBsO1xuICAgIGVsID0gZWwuZWw7XG4gICAgXG4gICAgLy/lsZ7mgKdcbiAgICAvLy0tLS1cbiAgICBcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRzO1xuICAgIC8qKlxuICAgICAqICMjIyBhbnQudHBsXG4gICAgICog5qih5p2/5a2X56ym5LiyXG4gICAgICogQHR5cGUge1N0cmluZ31cbiAgICAgKi9cbiAgICB0aGlzLnRwbCA9IHRwbDtcbiAgICBcbiAgICAvKipcbiAgICAgKiAjIyMgYW50LmVsXG4gICAgICog5qih5p2/IERPTSDlr7nosaEuXG4gICAgICogQHR5cGUge0hUTUxFbGVtZW50T2JqZWN0fVxuICAgICAqL1xuICAgIHRoaXMuZWwgPSBlbDtcbiAgICBcbiAgICAvKipcbiAgICAgKiAjIyMgYW50LmRhdGFcbiAgICAgKiDnu5HlrprmqKHmnb/nmoTmlbDmja4uXG4gICAgICogQHR5cGUge09iamVjdH0g5pWw5o2u5a+56LGhLCDkuI3lupTor6XmmK/mlbDnu4QuXG4gICAgICovXG4gICAgdGhpcy5kYXRhID0ge307XG4gICAgLyoqXG4gICAgICogIyMjIGFudC5pc1JlbmRlcmVkXG4gICAgICog6K+l5qih5p2/5piv5ZCm5bey57uP57uR5a6a5pWw5o2uXG4gICAgICogQHR5cGUge0Jvb2xlYW59IOWcqOiwg+eUqCBgcmVuZGVyYCDmlrnms5XlkI4sIOivpeWxnuaAp+WwhuS4uiBgdHJ1ZWBcbiAgICAgKi9cbiAgICB0aGlzLmlzUmVuZGVyZWQgPSBmYWxzZTtcbiAgICBcbiAgICAvL1RPRE8gY3VzdG9tIGJpbmRpbmdcbiAgICB0aGlzLmJpbmRpbmdzID0gKHRoaXMuYmluZGluZ3MgfHwgW10pLmNvbmNhdChvcHRzLmJpbmRpbmdzIHx8IFtdKTtcblxuICAgIHRoaXMucGFydGlhbHMgPSB7fTtcbiAgICB0aGlzLmZpbHRlcnMgPSB7fTtcbiAgICBcbiAgICBmb3IodmFyIGV2ZW50IGluIGV2ZW50cykge1xuICAgICAgdGhpcy5vbihldmVudCwgZXZlbnRzW2V2ZW50XSk7XG4gICAgfVxuXG4gICAgZm9yKHZhciBmaWx0ZXJOYW1lIGluIGZpbHRlcnMpe1xuICAgICAgdGhpcy5zZXRGaWx0ZXIoZmlsdGVyTmFtZSwgZmlsdGVyc1tmaWx0ZXJOYW1lXSk7XG4gICAgfVxuICAgIFxuICAgIGJ1aWxkVmlld01vZGVsLmNhbGwodGhpcyk7XG4gICAgXG4gICAgLy/ov5nph4zpnIDopoHlkIjlubblj6/og73lrZjlnKjnmoQgdGhpcy5kYXRhXG4gICAgLy/ooajljZXmjqfku7blj6/og73kvJrmnInpu5jorqTlgLwsIGBidWlsZFZpZXdNb2RlbGAg5ZCO5Lya6buY6K6k5YC85Lya5bm25YWlIGB0aGlzLmRhdGFgIOS4rVxuICAgIGRhdGEgPSBleHRlbmQodGhpcy5kYXRhLCBkYXRhKTtcbiAgICBcbiAgICBpZihvcHRzLmRhdGEpe1xuICAgICAgdGhpcy5yZW5kZXIoZGF0YSk7XG4gICAgfVxuICAgIHRoaXMuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG4gIFxuICAvL+mdmeaAgeaWueazlVxuICAvLy0tLVxuICBleHRlbmQoQW50LCBDbGFzcywgRGlyLCB7XG4gICAgc2V0UHJlZml4OiBzZXRQcmVmaXhcbiAgLCBkb2M6IGRvY1xuICAsIGRpcmVjdGl2ZXM6IHt9XG4gICwgdXRpbHM6IHV0aWxzXG4gIH0pO1xuICBcbiAgQW50LnNldFByZWZpeCgnYS0nKTtcbiAgXG4gIC8v5YaF572uIGRpcmVjdGl2ZVxuICBmb3IodmFyIGRpciBpbiBkaXJzKSB7XG4gICAgQW50LmRpcmVjdGl2ZShkaXIsIGRpcnNbZGlyXSk7XG4gIH1cbiAgICBcbiAgLy/lrp7kvovmlrnms5VcbiAgLy8tLS0tXG4gIGV4dGVuZChBbnQucHJvdG90eXBlLCBFdmVudCwge1xuICAgIC8qKlxuICAgICAqICMjIyBhbnQucmVuZGVyXG4gICAgICog5riy5p+T5qih5p2/XG4gICAgICovXG4gICAgcmVuZGVyOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICBkYXRhID0gZGF0YSB8fCB0aGlzLmRhdGE7XG4gICAgICB0aGlzLnNldChkYXRhLCB7aXNFeHRlbmQ6IGZhbHNlfSk7XG4gICAgICB0aGlzLmlzUmVuZGVyZWQgPSB0cnVlO1xuICAgICAgdGhpcy50cmlnZ2VyKCdyZW5kZXInKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiAjIyMgYW50LmNsb25lXG4gICAgICog5aSN5Yi25qih5p2/XG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRzXVxuICAgICAqIEByZXR1cm4ge1RlbXBsYXRlT2JqZWN0fSDkuIDkuKrmlrAgYEFudGAg5a6e5L6LXG4gICAgICovXG4gICwgY2xvbmU6IGZ1bmN0aW9uKG9wdHMpIHtcbiAgICAgIHZhciBvcHRpb25zID0gZXh0ZW5kKHRydWUsIHt9LCB0aGlzLm9wdGlvbnMpO1xuICAgICAgaWYob3B0cyAmJiBvcHRzLmRhdGEpeyBvcHRpb25zLmRhdGEgPSBudWxsOyB9XG4gICAgICByZXR1cm4gbmV3IHRoaXMuY29uc3RydWN0b3IodGhpcy50cGwsIGV4dGVuZCh0cnVlLCBvcHRpb25zLCBvcHRzKSk7XG4gICAgfVxuICAgIFxuICAsIGdldDogZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gZGVlcEdldChrZXksIHRoaXMuZGF0YSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqICMjIyBhbnQuc2V0XG4gICAgICog5pu05pawIGBhbnQuZGF0YWAg5Lit55qE5pWw5o2uXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IFtrZXldIOaVsOaNrui3r+W+hC4gXG4gICAgICogQHBhcmFtIHtBbnlUeXBlfE9iamVjdH0gdmFsIOaVsOaNruWGheWuuS4g5aaC5p6c5pWw5o2u6Lev5b6E6KKr55yB55WlLCDnrKzkuIDkuKrlj4LmlbDmmK/kuIDkuKrlr7nosaEuIOmCo+S5iCB2YWwg5bCG5pu/5o2iIGFudC5kYXRhIOaIluiAheW5tuWFpeWFtuS4rVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0XSDlj4LmlbDpoblcbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdC5zaWxlbmNlIOaYr+WQpumdmemdmeeahOabtOaWsOaVsOaNruiAjOS4jeinpuWPkSBgdXBkYXRlYCDkuovku7blj4rmm7TmlrAgRE9NLlxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0LmlzRXh0ZW5kIOaVsOaNruiuvue9ruexu+Weiy4g5piv5ZCm5bCG5pWw5o2u5bm25YWl5Y6f5pWw5o2uLiBcbiAgICAgICAgICAgICAg56ys5LiA5Liq5Y+C5pWw5piv5pWw5o2u6Lev5b6E5piv6K+l5YC86buY6K6k5Li6IGZhbHNlLCDogIznrKzkuIDkuKrmlbDmja7mmK/mlbDmja7lr7nosaHnmoTml7blgJnliJnpu5jorqTkuLogdHJ1ZVxuICAgICAqL1xuICAsIHNldDogZnVuY3Rpb24oa2V5LCB2YWwsIG9wdCkge1xuICAgICAgdmFyIGNoYW5nZWQsIGlzRXh0ZW5kLCBwYXJlbnQsIGtleXMsIHBhdGg7XG4gICAgICBcbiAgICAgIGlmKGlzVW5kZWZpbmVkKGtleSkpeyByZXR1cm4gdGhpczsgfVxuICAgICAgXG4gICAgICBpZihpc09iamVjdChrZXkpKXtcbiAgICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgICAgIG9wdCA9IHZhbDtcbiAgICAgICAgb3B0ID0gb3B0IHx8IHt9O1xuICAgICAgICBpZihvcHQuaXNFeHRlbmQgIT09IGZhbHNlKXtcbiAgICAgICAgICBpc0V4dGVuZCA9IHRydWU7XG4gICAgICAgICAgbW9kZWxFeHRlbmQodGhpcy5kYXRhLCBrZXksIHRoaXMuX3ZtKTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgaXNFeHRlbmQgPSBmYWxzZTtcbiAgICAgICAgICB0aGlzLmRhdGEgPSBtb2RlbEV4dGVuZCh7fSwga2V5LCB0aGlzLl92bSk7XG4gICAgICAgIH1cbiAgICAgIH1lbHNle1xuICAgICAgICBvcHQgPSBvcHQgfHwge307XG4gICAgICAgIFxuICAgICAgICBpZihkZWVwR2V0KGtleSwgdGhpcy5kYXRhKSAhPT0gdmFsKSB7XG4gICAgICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYoY2hhbmdlZCl7XG4gICAgICAgICAgaWYob3B0LmlzRXh0ZW5kICE9PSB0cnVlKXtcbiAgICAgICAgICAgIGtleXMgPSBwYXJzZUtleVBhdGgoa2V5KTtcbiAgICAgICAgICAgIGlmKGtleXMubGVuZ3RoID4gMSl7XG4gICAgICAgICAgICAgIHBhdGggPSBrZXlzLnBvcCgpO1xuICAgICAgICAgICAgICBwYXJlbnQgPSBkZWVwR2V0KGtleXMuam9pbignLicpLCB0aGlzLmRhdGEpO1xuICAgICAgICAgICAgICBpZihpc1VuZGVmaW5lZChwYXJlbnQpKXtcbiAgICAgICAgICAgICAgICBkZWVwU2V0KGtleXMuam9pbignLicpLCBwYXJlbnQgPSB7fSwgdGhpcy5kYXRhKTtcbiAgICAgICAgICAgICAgfWVsc2UgaWYoIWlzT2JqZWN0KHBhcmVudCkpe1xuICAgICAgICAgICAgICAgIHZhciBvbGRQYXJlbnQgPSBwYXJlbnQ7XG4gICAgICAgICAgICAgICAgZGVlcFNldChrZXlzLmpvaW4oJy4nKSwgcGFyZW50ID0ge3RvU3RyaW5nOiBmdW5jdGlvbigpIHsgcmV0dXJuIG9sZFBhcmVudDsgfX0sIHRoaXMuZGF0YSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICBpZihrZXkpe1xuICAgICAgICAgICAgICAgIHBhcmVudCA9IHRoaXMuZGF0YTtcbiAgICAgICAgICAgICAgICBwYXRoID0ga2V5O1xuICAgICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICBwYXJlbnQgPSB0aGlzO1xuICAgICAgICAgICAgICAgIHBhdGggPSAnZGF0YSc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBhcmVudFtwYXRoXSA9IGlzT2JqZWN0KHZhbCkgPyBtb2RlbEV4dGVuZChpc0FycmF5KHZhbCkgPyBbXSA6IHt9LCB2YWwsIHRoaXMuX3ZtLiRnZXRWTShrZXksICFpc0FycmF5KHZhbCkpKSA6IHZhbDtcbiAgICAgICAgICAgIGlzRXh0ZW5kID0gZmFsc2U7XG4gICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICBtb2RlbEV4dGVuZCh0aGlzLmRhdGEsIGRlZXBTZXQoa2V5LCB2YWwsIHt9KSwgdGhpcy5fdm0pO1xuICAgICAgICAgICAgaXNFeHRlbmQgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY2hhbmdlZCAmJiAoIW9wdC5zaWxlbmNlKSAmJiAoaXNPYmplY3Qoa2V5KSA/IHVwZGF0ZS5jYWxsKHRoaXMsIGtleSwgaXNFeHRlbmQsIG9wdC5pc0J1YmJsZSkgOiB1cGRhdGUuY2FsbCh0aGlzLCBrZXksIHZhbCwgaXNFeHRlbmQsIG9wdC5pc0J1YmJsZSkpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqICMjIyBhbnQuc2V0UGFydGlhbFxuICAgICAqIOa3u+WKoOWtkOaooeadv1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBpbmZvIOWtkOaooeadv+S/oeaBr1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfEhUTUxFbGVtZW50fSBpbmZvLmNvbnRlbnQg5a2Q5qih5p2/5YaF5a65XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IFtpbmZvLm5hbWVdIOWtkOaooeadv+agh+ekuuesplxuICAgICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR8ZnVuY3Rpb259IFtpbmZvLnRhcmdldF0g5a2Q5qih5p2/55qE55uu5qCH6IqC54K5XG4gICAgICogQHBhcmFtIHtCb29sZWFufSBbaW5mby5lc2NhcGVdIOaYr+WQpui9rOS5ieWtl+espuS4suWtkOaooeadv1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBbaW5mby5wYXRoXSDmjIflrprlrZDmqKHmnb/kuK3lj5jph4/lnKjmlbDmja7kuK3nmoTkvZznlKjln59cbiAgICAgKi9cbiAgLCBzZXRQYXJ0aWFsOiBmdW5jdGlvbihwYXJ0aWFsSW5mbykge1xuICAgICAgaWYoIXBhcnRpYWxJbmZvKXsgcmV0dXJuOyB9XG4gICAgICBcbiAgICAgIHBhcnRpYWxJbmZvID0gZXh0ZW5kKHt9LCB0aGlzLnBhcnRpYWxzW3BhcnRpYWxJbmZvLm5hbWVdLCBwYXJ0aWFsSW5mbyk7XG4gICAgICBcbiAgICAgIHZhciBlbHMsIF9lbHMsIHZtXG4gICAgICAgICwgbmFtZSA9IHBhcnRpYWxJbmZvLm5hbWVcbiAgICAgICAgLCB0YXJnZXQgPSBwYXJ0aWFsSW5mby50YXJnZXRcbiAgICAgICAgLCBwYXJ0aWFsID0gcGFydGlhbEluZm8uY29udGVudFxuICAgICAgICAsIHBhdGggPSBwYXJ0aWFsSW5mby5wYXRoIHx8ICcnXG4gICAgICAgIDtcbiAgICAgIGlmKG5hbWUpe1xuICAgICAgICB0aGlzLnBhcnRpYWxzW25hbWVdID0gcGFydGlhbEluZm87XG4gICAgICB9XG4gICAgICBpZihwYXJ0aWFsKSB7XG4gICAgICAgIHZtID0gdGhpcy5fdm0uJGdldFZNKHBhdGgpO1xuICAgICAgICBcbiAgICAgICAgaWYodHlwZW9mIHBhcnRpYWwgPT09ICdzdHJpbmcnKXtcbiAgICAgICAgICBpZihwYXJ0aWFsSW5mby5lc2NhcGUpe1xuICAgICAgICAgICAgZWxzID0gW2RvYy5jcmVhdGVUZXh0Tm9kZShwYXJ0aWFsKV07XG4gICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICBfZWxzID0gdHBsUGFyc2UocGFydGlhbCwgJ2RpdicpLmVsLmNoaWxkTm9kZXM7XG4gICAgICAgICAgICBlbHMgPSBbXTtcbiAgICAgICAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSBfZWxzLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICAgICAgICAgIGVscy5wdXNoKF9lbHNbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgZWxzID0gWyhwYXJ0aWFsIGluc3RhbmNlb2YgQW50KSA/IHBhcnRpYWwuZWwgOiBwYXJ0aWFsXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYodGFyZ2V0KXtcbiAgICAgICAgICBmb3IodmFyIGkgPSAwLCBsID0gZWxzLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICAgICAgICBpc0Z1bmN0aW9uKHRhcmdldCkgPyBcbiAgICAgICAgICAgICAgdGFyZ2V0LmNhbGwodGhpcywgZWxzW2ldKSA6XG4gICAgICAgICAgICAgIHRhcmdldC5hcHBlbmRDaGlsZChlbHNbaV0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdHJhdmVsRWwoZWxzLCB2bSk7XG4gICAgICAgIHRoaXMuaXNSZW5kZXJlZCAmJiB2bS4kc2V0KGRlZXBHZXQocGF0aCwgdGhpcy5kYXRhKSwgZmFsc2UsIHRydWUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAsIGluaXQ6IHV0aWxzLm5vb3BcbiAgXG4gICwgd2F0Y2g6IGZ1bmN0aW9uKGtleVBhdGgsIGNhbGxiYWNrKSB7XG4gICAgICBpZihrZXlQYXRoICYmIGNhbGxiYWNrKXtcbiAgICAgICAgbmV3IFdhdGNoZXIodGhpcy5fdm0sIHtwYXRoOiBrZXlQYXRofSwgY2FsbGJhY2spO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAsIHVud2F0Y2g6IGZ1bmN0aW9uKGtleVBhdGgsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgdm0gPSB0aGlzLl92bS4kZ2V0Vk0oa2V5UGF0aCwgdHJ1ZSk7XG4gICAgICBpZih2bSl7XG4gICAgICAgIGZvcih2YXIgaSA9IHZtLiR3YXRjaGVycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSl7XG4gICAgICAgICAgaWYodm0uJHdhdGNoZXJzW2ldLmNhbGxiYWNrID09PSBjYWxsYmFjayl7XG4gICAgICAgICAgICB2bS4kd2F0Y2hlcnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIFxuICAgIFxuICAsIHNldEZpbHRlcjogZnVuY3Rpb24obmFtZSwgZmlsdGVyKSB7XG4gICAgICB0aGlzLmZpbHRlcnNbbmFtZV0gPSBmaWx0ZXIuYmluZCh0aGlzKTtcbiAgICB9XG4gICwgZ2V0RmlsdGVyOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgICByZXR1cm4gdGhpcy5maWx0ZXJzW25hbWVdXG4gICAgfVxuICAsIHJlbW92ZUZpbHRlcjogZnVuY3Rpb24obmFtZSkge1xuICAgICAgZGVsZXRlIHRoaXMuZmlsdGVyc1tuYW1lXTtcbiAgICB9XG4gIH0pO1xuICBcbiAgLyoqXG4gICAqIOabtOaWsOaooeadvy4gXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIOimgeabtOaWsOeahOaVsOaNri4g5aKe6YeP5pWw5o2u5oiW5YWo5paw55qE5pWw5o2uLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gW2tleVBhdGhdIOmcgOimgeabtOaWsOeahOaVsOaNrui3r+W+hC5cbiAgICogQHBhcmFtIHtBbnlUeXBlfE9iamVjdH0gW2RhdGFdIOmcgOimgeabtOaWsOeahOaVsOaNri4g55yB55Wl55qE6K+d5bCG5L2/55So546w5pyJ55qE5pWw5o2uLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtpc0V4dGVuZF0g55WM6Z2i5pu05paw57G75Z6LLlxuICAgICAgICAgICAg5Li6IHRydWUg5pe2LCDmmK/mianlsZXlvI/mm7TmlrAsIOWOn+acieeahOaVsOaNruS4jeWPmFxuICAgICAgICAgICAg5Li6IGZhbHNlIOaXtiwg5Li65pu/5o2i5pu05pawLCDkuI3lnKggZGF0YSDkuK3nmoTlj5jph48sIOWwhuWcqCBET00g5Lit6KKr5riF56m6LlxuICAgKi9cbiAgZnVuY3Rpb24gdXBkYXRlIChrZXlQYXRoLCBkYXRhLCBpc0V4dGVuZCwgaXNCdWJibGUpIHtcbiAgICB2YXIgYXR0cnMsIHZtID0gdGhpcy5fdm07XG4gICAgaWYoaXNPYmplY3Qoa2V5UGF0aCkpe1xuICAgICAgaXNCdWJibGUgPSBpc0V4dGVuZDtcbiAgICAgIGlzRXh0ZW5kID0gZGF0YTtcbiAgICAgIGF0dHJzID0gZGF0YSA9IGtleVBhdGg7XG4gICAgfWVsc2UgaWYodHlwZW9mIGtleVBhdGggPT09ICdzdHJpbmcnKXtcbiAgICAgIGtleVBhdGggPSBwYXJzZUtleVBhdGgoa2V5UGF0aCkuam9pbignLicpO1xuICAgICAgaWYoaXNVbmRlZmluZWQoZGF0YSkpe1xuICAgICAgICBkYXRhID0gdGhpcy5nZXQoa2V5UGF0aCk7XG4gICAgICB9XG4gICAgICBhdHRycyA9IGRlZXBTZXQoa2V5UGF0aCwgZGF0YSwge30pO1xuICAgICAgdm0gPSB2bS4kZ2V0Vk0oa2V5UGF0aCk7XG4gICAgfWVsc2V7XG4gICAgICBkYXRhID0gdGhpcy5kYXRhO1xuICAgIH1cbiAgICBcbiAgICBpZihpc1VuZGVmaW5lZChpc0V4dGVuZCkpeyBpc0V4dGVuZCA9IGlzT2JqZWN0KGtleVBhdGgpOyB9XG4gICAgdm0uJHNldChkYXRhLCBpc0V4dGVuZCwgaXNCdWJibGUgIT09IGZhbHNlKTtcbiAgICB0aGlzLnRyaWdnZXIoJ3VwZGF0ZScsIGF0dHJzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICBcbiAgZnVuY3Rpb24gYnVpbGRWaWV3TW9kZWwoKSB7XG4gICAgdmFyIHZtID0gbmV3IFZpZXdNb2RlbCh7XG4gICAgICAkYW50OiB0aGlzXG4gICAgfSk7XG4gICAgXG4gICAgdGhpcy5fdm0gPSB2bTtcbiAgICB0cmF2ZWxFbCh0aGlzLmVsLCB2bSk7XG4gIH1cbiAgXG4gIHZhciBOT0RFVFlQRSA9IHtcbiAgICBBVFRSOiAyXG4gICwgVEVYVDogM1xuICAsIENPTU1FTlQ6IDhcbiAgfTtcbiAgXG4gIC8v6YGN5Y6G5YWD57Sg5Y+K5YW25a2Q5YWD57Sg55qE5omA5pyJ5bGe5oCn6IqC54K55Y+K5paH5pys6IqC54K5XG4gIGZ1bmN0aW9uIHRyYXZlbEVsKGVsLCB2bSkge1xuICAgIGlmKGVsLmxlbmd0aCAmJiBpc1VuZGVmaW5lZChlbC5ub2RlVHlwZSkpe1xuICAgICAgLy9ub2RlIGxpc3RcbiAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSBlbC5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdHJhdmVsRWwoZWxbaV0sIHZtKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgXG4gICAgaWYoZWwubm9kZVR5cGUgPT09IE5PREVUWVBFLkNPTU1FTlQpe1xuICAgICAgLy/ms6jph4roioLngrlcbiAgICAgIHJldHVybjtcbiAgICB9ZWxzZSBpZihlbC5ub2RlVHlwZSA9PT0gTk9ERVRZUEUuVEVYVCl7XG4gICAgICAvL+aWh+acrOiKgueCuVxuICAgICAgY2hlY2tUZXh0KGVsLCB2bSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIFxuICAgIC8v6YGH5YiwIHRlcm1pbmFsIOS4uiB0cnVlIOeahCBkaXJlY3RpdmUg5bGe5oCn5LiN5YaN6YGN5Y6GXG4gICAgaWYoY2hlY2tBdHRyKGVsLCB2bSkpe1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBcbiAgICBmb3IodmFyIGNoaWxkID0gZWwuZmlyc3RDaGlsZCwgbmV4dDsgY2hpbGQ7ICl7XG4gICAgICBuZXh0ID0gY2hpbGQubmV4dFNpYmxpbmc7XG4gICAgICB0cmF2ZWxFbChjaGlsZCwgdm0pO1xuICAgICAgY2hpbGQgPSBuZXh0O1xuICAgIH1cbiAgfVxuICBcbiAgLy/pgY3ljoblsZ7mgKdcbiAgZnVuY3Rpb24gY2hlY2tBdHRyKGVsLCB2bSkge1xuICAgIHZhciByZXBlYXRBdHRyID0gZWwuZ2V0QXR0cmlidXRlTm9kZShhbnRBdHRyLlJFUEVBVClcbiAgICAgICwgaWZBdHRyID0gZWwuZ2V0QXR0cmlidXRlTm9kZShhbnRBdHRyLklGKVxuICAgICAgLCBhdHRyLCBnZW4gPSByZXBlYXRBdHRyIHx8IGlmQXR0clxuICAgICAgO1xuICAgIFxuICAgIHZhciBwcmVmaXggPSBBbnQucHJlZml4XG4gICAgICAsIGRpcnMgPSBnZXREaXIoZWwsIEFudC5kaXJlY3RpdmVzLCBwcmVmaXgpXG4gICAgICAsIGRpclxuICAgICAgLCB0ZXJtaW5hbFByaW9yaXR5LCB0ZXJtaW5hbFxuICAgICAgO1xuICAgIFxuICAgIGZvciAodmFyIGkgPSAwLCBsID0gZGlycy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGRpciA9IGRpcnNbaV07XG4gICAgIFxuICAgICAgLy/lr7nkuo4gdGVybWluYWwg5Li6IHRydWUg55qEIGRpcmVjdGl2ZSwg5Zyo6Kej5p6Q5a6M5YW255u45ZCM5p2D6YeN55qEIGRpcmVjdGl2ZSDlkI7kuK3mlq3op6PmnpBcbiAgICAgIGlmKHRlcm1pbmFsUHJpb3JpdHkgPCBkaXIucHJpb3JpdHkpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHNldEJpbmRpbmcodm0sIGRpcik7XG4gICAgIFxuICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKGRpci5ub2RlLm5vZGVOYW1lKTtcbiAgICAgIFxuICAgICAgaWYoZGlyLnRlcm1pbmFsKSB7XG4gICAgICAgIHRlcm1pbmFsID0gdHJ1ZTtcbiAgICAgICAgdGVybWluYWxQcmlvcml0eSA9IGRpci5wcmlvcml0eTtcbiAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgaWYodGVybWluYWwpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBcbiAgICAvLyByZXR1cm47XG4gICAgLy8gaWYoZ2VuKXtcbiAgICAgIC8vIGNoZWNrQmluZGluZyh2bSwgZ2VuLCBlbCk7XG4gICAgICAvLyByZXR1cm4gdHJ1ZTtcbiAgICAvLyB9XG4gICAgXG4gICAgLy8gZm9yKHZhciBpID0gZWwuYXR0cmlidXRlcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSl7XG4gICAgICAvLyBhdHRyID0gZWwuYXR0cmlidXRlc1tpXTtcbiAgICAgIC8vIGNoZWNrQmluZGluZyh2bSwgYXR0ciwgZWwpO1xuICAgICAgLy8gLy9yZXBsYWNlIHByZWZpeCBhbmQgcG9zdGZpeCBhdHRyaWJ1dGUuIGEtc3R5bGU9e3t2YWx1ZX19LCBkaXNhYmxlZD89e3t2YWx1ZX19XG4gICAgICAvLyBpZihhdHRyLm5vZGVOYW1lLmluZGV4T2YocHJlZml4KSA9PT0gMCB8fCBhdHRyUG9zdFJlZy50ZXN0KGF0dHIubm9kZU5hbWUpKXtcbiAgICAgICAgLy8gZWwucmVtb3ZlQXR0cmlidXRlKGF0dHIubm9kZU5hbWUpO1xuICAgICAgLy8gfVxuICAgIC8vIH1cbiAgfVxuICBcbiAgZnVuY3Rpb24gY2hlY2tUZXh0KG5vZGUsIHZtKSB7XG4gICAgaWYodG9rZW4uaGFzVG9rZW4obm9kZS5ub2RlVmFsdWUpKSB7XG4gICAgICB2YXIgdG9rZW5zID0gdG9rZW4ucGFyc2VUb2tlbihub2RlKVxuICAgICAgICAsIHRleHRNYXAgPSB0b2tlbnMudGV4dE1hcFxuICAgICAgICAsIGVsID0gbm9kZS5wYXJlbnROb2RlXG4gICAgICAgIDtcbiAgICAgIFxuICAgICAgLy/lsIZ7e2tleX195YiG5Ymy5oiQ5Y2V54us55qE5paH5pys6IqC54K5XG4gICAgICBpZih0ZXh0TWFwLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgdGV4dE1hcC5mb3JFYWNoKGZ1bmN0aW9uKHRleHQpIHtcbiAgICAgICAgICB2YXIgdG4gPSBkb2MuY3JlYXRlVGV4dE5vZGUodGV4dCk7XG4gICAgICAgICAgZWwuaW5zZXJ0QmVmb3JlKHRuLCBub2RlKTtcbiAgICAgICAgICBjaGVja1RleHQodG4sIHZtKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGVsLnJlbW92ZUNoaWxkKG5vZGUpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIHRva2Vucy5mb3JFYWNoKGZ1bmN0aW9uKHRva2VuKSB7XG4gICAgICAgICAgc2V0QmluZGluZyh2bSwgZXh0ZW5kKHRva2VuLCB0b2tlbi5lc2NhcGUgPyBBbnQuZGlyZWN0aXZlcy50ZXh0IDogQW50LmRpcmVjdGl2ZXMuaHRtbCwge1xuICAgICAgICAgICAgZWw6IG5vZGVcbiAgICAgICAgICB9KSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBcbiAgLy/ojrflj5bkuIDkuKrlhYPntKDkuIrmiYDmnInnlKggSFRNTCDlsZ7mgKflrprkuYnnmoTmjIfku6RcbiAgZnVuY3Rpb24gZ2V0RGlyKGVsLCBkaXJlY3RpdmVzLCBwcmVmaXgpIHtcbiAgICBwcmVmaXggPSBwcmVmaXggfHwgJyc7XG4gICAgZGlyZWN0aXZlcyA9IGRpcmVjdGl2ZXMgfHwge307XG4gICAgXG4gICAgdmFyIGF0dHIsIGF0dHJOYW1lLCBkaXJOYW1lXG4gICAgICAsIGRpcnMgPSBbXSwgZGlyXG4gICAgICA7XG4gICAgICBcbiAgICBmb3IodmFyIGkgPSBlbC5hdHRyaWJ1dGVzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKXtcbiAgICAgIGF0dHIgPSBlbC5hdHRyaWJ1dGVzW2ldO1xuICAgICAgYXR0ck5hbWUgPSBhdHRyLm5vZGVOYW1lO1xuICAgICAgZGlyTmFtZSA9IGF0dHJOYW1lLnNsaWNlKHByZWZpeC5sZW5ndGgpO1xuICAgICAgaWYoYXR0ck5hbWUuaW5kZXhPZihwcmVmaXgpID09PSAwICYmIChkaXJOYW1lIGluIGRpcmVjdGl2ZXMpKSB7XG4gICAgICAgIGRpciA9IGV4dGVuZCh7fSwgZGlyZWN0aXZlc1tkaXJOYW1lXSk7XG4gICAgICAgIGRpci5kaXJOYW1lID0gZGlyTmFtZVxuICAgICAgfWVsc2UgaWYodG9rZW4uaGFzVG9rZW4oYXR0ci52YWx1ZSkpIHtcbiAgICAgICAgZGlyID0gZXh0ZW5kKHt9LCBkaXJlY3RpdmVzWydhdHRyJ10pO1xuICAgICAgICBkaXIuZGlycyA9IHRva2VuLnBhcnNlVG9rZW4oYXR0cik7XG4gICAgICAgIGRpci5kaXJOYW1lID0gYXR0ck5hbWUuaW5kZXhPZihwcmVmaXgpID09PSAwID8gZGlyTmFtZSA6IGF0dHJOYW1lIDtcbiAgICAgIH1lbHNle1xuICAgICAgICBkaXIgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgaWYodG9rZW4uaGFzVG9rZW4oYXR0ck5hbWUpKSB7XG4gICAgICAgIC8vVE9ETyDlsZ7mgKflkI1cbiAgICAgIH1cbiAgICAgIGlmKGRpcikge1xuICAgICAgICBkaXJzLnB1c2goZXh0ZW5kKHtlbDogZWwsIG5vZGU6IGF0dHIsIG5vZGVOYW1lOiBhdHRyTmFtZSwgcGF0aDogYXR0ci52YWx1ZX0sIGRpcikpO1xuICAgICAgfVxuICAgIH1cbiAgICBkaXJzLnNvcnQoZnVuY3Rpb24oZDAsIGQxKSB7XG4gICAgICByZXR1cm4gZDAucHJpb3JpdHkgLSBkMS5wcmlvcml0eTtcbiAgICB9KTtcbiAgICByZXR1cm4gZGlycztcbiAgfVxuICBcblxuICAvL2VsOiDor6XoioLngrnnmoTmiYDlsZ7lhYPntKAuIFxuICBmdW5jdGlvbiBjaGVja0JpbmRpbmcodm0sIGRpcikge1xuICAgIHZhciBub2RlID0gZGlyLm5vZGVcbiAgICAgICwgZWwgPSBkaXIuZWxcbiAgICAgIDtcbiAgICAgIFxuICAgIHZhciBoYXNUb2tlbk5hbWUgPSB0b2tlbi5oYXNUb2tlbihub2RlLm5vZGVOYW1lKVxuICAgICAgLCBoYXNUb2tlblZhbHVlID0gdG9rZW4uaGFzVG9rZW4obm9kZS5ub2RlVmFsdWUpXG4gICAgICA7XG4gICAgICBcbiAgICBpZihoYXNUb2tlblZhbHVlIHx8IGhhc1Rva2VuTmFtZSl7XG4gICAgICB2YXIgdG9rZW5zID0gdG9rZW4ucGFyc2VUb2tlbnMobm9kZSwgZWwsIGhhc1Rva2VuTmFtZSlcbiAgICAgICAgLCB0ZXh0TWFwID0gdG9rZW5zLnRleHRNYXBcbiAgICAgICAgLCB2YWxUb2tlbnNcbiAgICAgICAgO1xuICAgICAgLy/lpoLmnpznu5HlrprlhoXlrrnmmK/lnKjmlofmnKzkuK0sIOWImeWwhnt7a2V5fX3liIblibLmiJDljZXni6znmoTmlofmnKzoioLngrlcbiAgICAgIGlmKG5vZGUubm9kZVR5cGUgPT09IE5PREVUWVBFLlRFWFQgJiYgdGV4dE1hcC5sZW5ndGggPiAxKXtcbiAgICAgICAgdGV4dE1hcC5mb3JFYWNoKGZ1bmN0aW9uKHRleHQpIHtcbiAgICAgICAgICB2YXIgdG4gPSBkb2MuY3JlYXRlVGV4dE5vZGUodGV4dCk7XG4gICAgICAgICAgZWwuaW5zZXJ0QmVmb3JlKHRuLCBub2RlKTtcbiAgICAgICAgICBjaGVja1RleHQodG4sIHZtKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGVsLnJlbW92ZUNoaWxkKG5vZGUpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIC8vPHRhZyB7e2F0dHJ9fT17e3ZhbHVlfX0gLz5cbiAgICAgICAgaWYoaGFzVG9rZW5OYW1lICYmIGhhc1Rva2VuVmFsdWUpe1xuICAgICAgICAgIHZhbFRva2VucyA9IHRva2VuLnBhcnNlVG9rZW5zKG5vZGUsIGVsKTtcbiAgICAgICAgICB2YWxUb2tlbnMuZm9yRWFjaChmdW5jdGlvbih0b2tlbil7XG4gICAgICAgICAgICB0b2tlbi5iYXNlVG9rZW5zID0gdG9rZW5zO1xuICAgICAgICAgICAgYWRkQmluZGluZyh2bSwgdG9rZW4pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBzZXRCaW5kaW5nKHZtLCBkaXIsIHRva2Vucyk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIFxuICBmdW5jdGlvbiBzZXRCaW5kaW5nKHZtLCBkaXIpIHtcbiAgICBpZihkaXIucmVwbGFjZSkge1xuICAgICAgdmFyIGVsID0gZGlyLmVsO1xuICAgICAgaWYoaXNGdW5jdGlvbihkaXIucmVwbGFjZSkpIHtcbiAgICAgICAgZGlyLm5vZGUgPSBkaXIucmVwbGFjZSgpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIGRpci5ub2RlID0gZG9jLmNyZWF0ZUNvbW1lbnQoZGlyLnR5cGUgKyAnID0gJyArIGRpci5wYXRoKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZGlyLmVsID0gZGlyLmVsLnBhcmVudE5vZGU7XG4gICAgICBkaXIuZWwucmVwbGFjZUNoaWxkKGRpci5ub2RlLCBlbCk7XG4gICAgfVxuICAgIFxuICAgIGRpci5pbml0KHZtKTtcbiAgICBcbiAgICBpZihkaXIuZGlycykge1xuICAgICAgZGlyLmRpcnMuZm9yRWFjaChmdW5jdGlvbih0b2tlbikge1xuICAgICAgICBuZXcgV2F0Y2hlcih2bSwgZXh0ZW5kKHt9LCBkaXIsIHRva2VuKSk7XG4gICAgICB9KTtcbiAgICB9ZWxzZXtcbiAgICAgIG5ldyBXYXRjaGVyKHZtLCBkaXIpO1xuICAgIH1cbiAgfVxuICBcbiAgZnVuY3Rpb24gYWRkQmluZGluZyh2bSwgZGlyKSB7XG4gICAgdmFyIGJpbmRpbmcgPSBnZXRCaW5kaW5nKHZtLiRyb290LiRhbnQuYmluZGluZ3MpO1xuICAgIGJpbmRpbmcodm0sIGRpcik7XG4gIH1cbiAgXG4gIGZ1bmN0aW9uIGdldEJpbmRpbmcoYmluZGluZ3MpIHtcbiAgICBiaW5kaW5ncyA9IGJhc2VCaW5kaW5ncy5jb25jYXQoYmluZGluZ3MpO1xuICAgIHZhciBiaW5kaW5nID0gYmluZGluZ3NbMF07XG4gICAgZm9yKHZhciBpID0gMSwgbCA9IGJpbmRpbmdzLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICBiaW5kaW5nID0gYmVmb3JlRm4oYmluZGluZywgYmluZGluZ3NbaV0sIGZ1bmN0aW9uKHJldCkge1xuICAgICAgICByZXR1cm4gKHJldCBpbnN0YW5jZW9mIFdhdGNoZXIpIHx8IHJldCA9PT0gZmFsc2U7XG4gICAgICB9KVxuICAgIH1cbiAgICByZXR1cm4gYmluZGluZztcbiAgfVxuICBcbiAgZnVuY3Rpb24gVmlld01vZGVsKG9wdHMpIHtcbiAgICBleHRlbmQodGhpcywge1xuICAgICAgJGtleTogJydcbiAgICAsICRyb290OiB0aGlzXG4gICAgLCAkd2F0Y2hlcnM6IFtdXG4gICAgLCAkYXNzaWdubWVudDoge31cbiAgICB9LCBvcHRzKTtcbiAgfVxuICBcbiAgVmlld01vZGVsLnByb3RvdHlwZSA9IHtcbiAgICAkcm9vdDogbnVsbFxuICAsICRwYXJlbnQ6IG51bGxcbiAgXG4gICwgJGFudDogbnVsbFxuICAsICRrZXk6IG51bGxcbiAgLCAkcmVwZWF0OiBmYWxzZVxuICAsICRhc3NpZ25tZW50OiBudWxsXG4gIFxuICAsICR3YXRjaGVyczogbnVsbFxuXG4gICwgJHZhbHVlOiBOYU5cbiAgICBcbiAgLy/ojrflj5blrZAgdm1cbiAgLy9zdHJpY3Q6IGZhbHNlKGRlZmF1bHQp5LiN5a2Y5Zyo55qE6K+d5bCG5paw5bu65LiA5LiqXG4gICwgJGdldFZNOiBmdW5jdGlvbihwYXRoLCBzdHJpY3QpIHtcbiAgICAgIHBhdGggPSBwYXRoICsgJyc7XG4gICAgICBcbiAgICAgIHZhciBrZXksIHZtXG4gICAgICAgICwgY3VyID0gdGhpc1xuICAgICAgICAsIGtleUNoYWluID0gdXRpbHMucGFyc2VLZXlQYXRoKHBhdGgpXG4gICAgICAgIDtcbiAgICAgICAgXG4gICAgICBpZihrZXlDaGFpblswXSBpbiB0aGlzLiRhc3NpZ25tZW50KSB7XG4gICAgICAgIGN1ciA9IHRoaXMuJGFzc2lnbm1lbnRba2V5Q2hhaW5bMF1dO1xuICAgICAgICBrZXlDaGFpbi5zaGlmdCgpO1xuICAgICAgfVxuICAgICAgaWYocGF0aCl7XG4gICAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSBrZXlDaGFpbi5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgICAgIGtleSA9IGtleUNoYWluW2ldO1xuICAgICAgICAgIFxuICAgICAgICAgIGlmKCFjdXJba2V5XSl7XG4gICAgICAgICAgICBpZihzdHJpY3QpeyByZXR1cm4gbnVsbDsgfVxuICAgICAgICAgICAgdm0gPSBuZXcgVmlld01vZGVsKHtcbiAgICAgICAgICAgICAgJHBhcmVudDogY3VyXG4gICAgICAgICAgICAsICRyb290OiBjdXIuJHJvb3RcbiAgICAgICAgICAgICwgJGFzc2lnbm1lbnQ6IGV4dGVuZCh7fSwgY3VyLiRhc3NpZ25tZW50KVxuICAgICAgICAgICAgLCAka2V5OiBrZXlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjdXJba2V5XSA9IHZtO1xuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICBjdXIgPSBjdXJba2V5XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGN1cjtcbiAgICB9XG4gICAgXG4gICwgJGdldEtleVBhdGg6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGtleVBhdGggPSB0aGlzLiRrZXlcbiAgICAgICAgLCBjdXIgPSB0aGlzXG4gICAgICAgIDtcbiAgICAgIHdoaWxlKGN1ciA9IGN1ci4kcGFyZW50KXtcbiAgICAgICAgaWYoY3VyLiRrZXkpe1xuICAgICAgICAgIGtleVBhdGggPSBjdXIuJGtleSArICcuJyArIGtleVBhdGg7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4ga2V5UGF0aDtcbiAgICB9XG4gIFxuICAvL+iOt+WPluWvueixoeeahOafkOS4quWAvCwg5rKh5pyJ55qE6K+d5p+l5om+54i26IqC54K5LCDnm7TliLDpobblsYIuXG4gICwgJGdldERhdGE6IGZ1bmN0aW9uKGtleSwgaXNTdHJpY3QpIHtcbiAgICAgIGlmKGtleSA9PT0gJyRpbmRleCcgJiYgdGhpcy4kcGFyZW50ICYmIHRoaXMuJHBhcmVudC4kcmVwZWF0KXtcbiAgICAgICAgcmV0dXJuIHRoaXMuJGtleSAqIDE7XG4gICAgICB9XG4gICAgICB2YXIgY3VyVmFsID0gZGVlcEdldChrZXksIHRoaXMuJHJvb3QuJGFudC5nZXQodGhpcy4kZ2V0S2V5UGF0aCgpKSk7XG4gICAgICBpZihpc1N0cmljdCB8fCAhdGhpcy4kcGFyZW50IHx8ICFpc1VuZGVmaW5lZChjdXJWYWwpKXtcbiAgICAgICAgcmV0dXJuIGN1clZhbDtcbiAgICAgIH1lbHNle1xuICAgICAgICByZXR1cm4gdGhpcy4kcGFyZW50LiRnZXREYXRhKGtleSk7XG4gICAgICB9XG4gICAgfVxuICAsICRzZXQ6IGZ1bmN0aW9uIChkYXRhLCBpc0V4dGVuZCwgaXNCdWJibGUpIHtcbiAgICAgIHZhciBtYXAgPSBpc0V4dGVuZCA/IGRhdGEgOiB0aGlzXG4gICAgICAgICwgcGFyZW50ID0gdGhpc1xuICAgICAgICA7XG4gICAgICBcbiAgICAgIFxuICAgICAgZm9yKHZhciBpID0gMCwgbCA9IHRoaXMuJHdhdGNoZXJzLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICAgIGlmKCh0aGlzLiR2YWx1ZSAhPT0gZGF0YSkgfHwgdGhpcy4kd2F0Y2hlcnNbaV0uc3RhdGUgPT09IFdhdGNoZXIuU1RBVEVfUkVBRFkpe1xuICAgICAgICAgIHRoaXMuJHdhdGNoZXJzW2ldLmZuKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRoaXMuJHZhbHVlID0gZGF0YTtcbiAgICAgIFxuICAgICAgaWYoaXNPYmplY3QobWFwKSl7XG4gICAgICAgIGZvcih2YXIgcGF0aCBpbiBtYXApIHtcbiAgICAgICAgICAvL+S8oOWFpeeahOaVsOaNrumUruWAvOS4jeiDveWSjCB2bSDkuK3nmoToh6rluKblsZ7mgKflkI3nm7jlkIwuXG4gICAgICAgICAgLy/miYDku6XkuI3mjqjojZDkvb/nlKggJyQnIOS9nOS4uiBKU09OIOaVsOaNrumUruWAvOeahOW8gOWktC5cbiAgICAgICAgICBpZih0aGlzLmhhc093blByb3BlcnR5KHBhdGgpICYmICghKHBhdGggaW4gVmlld01vZGVsLnByb3RvdHlwZSkpICYmICghdGhpcy4kcmVwZWF0IHx8IHBhdGggPT09ICdsZW5ndGgnKSl7XG4gICAgICAgICAgICB0aGlzW3BhdGhdLiRzZXQoZGF0YSA/IGRhdGFbcGF0aF0gOiB2b2lkKDApLCBpc0V4dGVuZCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmKGlzQnViYmxlKXtcbiAgICAgICAgd2hpbGUocGFyZW50ID0gcGFyZW50LiRwYXJlbnQpe1xuICAgICAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSBwYXJlbnQuJHdhdGNoZXJzLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICAgICAgICBwYXJlbnQuJHdhdGNoZXJzW2ldLmZuKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9O1xuICBcbiAgXG4gIHZhciBwZXJ0aWFsUmVnID0gL14+XFxzKig/PS4rKS87XG4gIFxuICAvL2J1aWQgaW4gYmluZGluZ3NcbiAgdmFyIGJhc2VCaW5kaW5ncyA9IFtcbiAgICAvL+WxgOmDqOaooeadvy4ge3s+IGFub3RoZXJhbnR9fVxuICAgIGZ1bmN0aW9uKHZtLCB0b2tlbikge1xuICAgICAgdmFyIHBOYW1lLCBhbnQsIG9wdHMsIG5vZGU7XG4gICAgICBpZih0b2tlbi5ub2RlTmFtZSA9PT0gJyN0ZXh0JyAmJiBwZXJ0aWFsUmVnLnRlc3QodG9rZW4ucGF0aCkpe1xuICAgICAgICBwTmFtZSA9IHRva2VuLnBhdGgucmVwbGFjZShwZXJ0aWFsUmVnLCAnJyk7XG4gICAgICAgIGFudCA9IHZtLiRyb290LiRhbnQ7XG4gICAgICAgIG9wdHMgPSBhbnQub3B0aW9ucztcbiAgICAgICAgbm9kZSA9IGRvYy5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICAgIHRva2VuLmVsLmluc2VydEJlZm9yZShub2RlLCB0b2tlbi5ub2RlKTtcbiAgICAgICAgdG9rZW4uZWwucmVtb3ZlQ2hpbGQodG9rZW4ubm9kZSk7XG4gICAgICAgIFxuICAgICAgICBhbnQuc2V0UGFydGlhbCh7XG4gICAgICAgICAgbmFtZTogcE5hbWVcbiAgICAgICAgLCBjb250ZW50OiBvcHRzICYmIG9wdHMucGFydGlhbHMgJiYgb3B0cy5wYXJ0aWFsc1twTmFtZV1cbiAgICAgICAgLCB0YXJnZXQ6IGZ1bmN0aW9uKGVsKSB7IHRva2VuLmVsLmluc2VydEJlZm9yZShlbCwgbm9kZSkgfVxuICAgICAgICAsIGVzY2FwZTogdG9rZW4uZXNjYXBlXG4gICAgICAgICwgcGF0aDogdm0uJGdldEtleVBhdGgoKVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvL2lmIC8gcmVwZWF0XG4gICwgZnVuY3Rpb24odm0sIHRva2VuKSB7XG4gICAgICBpZih0b2tlbi5ub2RlTmFtZSA9PT0gYW50QXR0ci5JRiB8fCB0b2tlbi5ub2RlTmFtZSA9PT0gYW50QXR0ci5SRVBFQVQpe1xuICAgICAgICByZXR1cm4gbmV3IEdlbmVyYXRvcih2bSwgdG9rZW4pO1xuICAgICAgfVxuICAgIH1cbiAgXTtcbiAgXG4gIHZhciBleFBhcnNlID0gZnVuY3Rpb24ocGF0aCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB2YXIgYXN0ID0gcGFyc2UocGF0aCwgdGhpcy50eXBlICYmIHRoaXMudHlwZS5zbGljZShwcmVmaXgubGVuZ3RoKSk7XG4gICAgICBcbiAgICBleHRlbmQodGhpcywgZXZhbHVhdGUuc3VtbWFyeShhc3QpKTtcbiAgICB0aGlzLl9hc3QgPSBhc3Q7XG4gIH07XG4gIFxuICBmdW5jdGlvbiBXYXRjaGVyKHJlbGF0aXZlVm0sIHRva2VuLCBjYWxsYmFjaykge1xuICAgIHRoaXMudG9rZW4gPSB0b2tlbjtcbiAgICB0aGlzLnJlbGF0aXZlVm0gPSByZWxhdGl2ZVZtO1xuICAgIHRoaXMuYW50ID0gcmVsYXRpdmVWbS4kcm9vdC4kYW50O1xuICAgIFxuICAgIHRoaXMuZWwgPSB0b2tlbi5lbDtcbiAgICB0aGlzLnZhbCA9IE5hTjtcbiAgICBcbiAgICB0aGlzLnVwZGF0ZSA9IGNhbGxiYWNrID8gY2FsbGJhY2sgOiB0b2tlbi51cGRhdGU7XG4gICAgXG4gICAgdG9rZW4ucGF0aCAmJiBleFBhcnNlLmNhbGwodGhpcywgdG9rZW4ucGF0aCk7XG4gICAgXG4gICAgdmFyIHJvb3QgPSByZWxhdGl2ZVZtXG4gICAgICAsIHBhdGhzXG4gICAgICAsIHJ1biA9ICF0aGlzLmxvY2Fscy5sZW5ndGhcbiAgICAgIDtcbiAgICBcbiAgICBmb3IodmFyIGkgPSAwLCBsID0gdGhpcy5wYXRocy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgcGF0aHMgPSB1dGlscy5wYXJzZUtleVBhdGgodGhpcy5wYXRoc1tpXSk7XG4gICAgICBpZighKHBhdGhzWzBdIGluIHJlbGF0aXZlVm0uJGFzc2lnbm1lbnQpKSB7XG4gICAgICAgIHJvb3QgPSByZWxhdGl2ZVZtLiRyb290O1xuICAgICAgICBydW4gPSBydW4gfHwgcm9vdCAhPT0gcmVsYXRpdmVWbTtcbiAgICAgIH1lbHNle1xuICAgICAgICAvL2lmKHRoaXMuc3RhdGUgPT0gV2F0Y2hlci5TVEFURV9SRUFEWSkge1xuICAgICAgICAgIHJ1biA9IHRydWU7Ly/lvJXnlKjniLbnuqcgVk0g5pe2LCDnq4vljbPorqHnrpdcbiAgICAgICAgLy99XG4gICAgICB9XG4gICAgICByb290LiRnZXRWTSh0aGlzLnBhdGhzW2ldKS4kd2F0Y2hlcnMucHVzaCh0aGlzKTtcbiAgICB9XG4gICAgXG4gICAgdGhpcy5zdGF0ZSA9IFdhdGNoZXIuU1RBVEVfUkVBRFlcbiAgICBcbiAgICAvL1doZW4gdGhlcmUgaXMgbm8gdmFyaWFibGUgaW4gYSBiaW5kaW5nLCBldmFsdWF0ZSBpdCBpbW1lZGlhdGVseS5cbiAgICBpZihydW4pIHtcbiAgICAgIHRoaXMuZm4oKTtcbiAgICB9XG4gIH1cbiAgXG4gIGV4dGVuZChXYXRjaGVyLCB7XG4gICAgU1RBVEVfUkVBRFk6IDBcbiAgLCBTVEFURV9DQUxMRUQ6IDFcbiAgfSwgQ2xhc3MpO1xuICBcbiAgZXh0ZW5kKFdhdGNoZXIucHJvdG90eXBlLCB7XG4gICAgZm46IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHZhbHMgPSB7fSwga2V5O1xuICAgICAgZm9yKHZhciBpID0gMCwgbCA9IHRoaXMubG9jYWxzLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICAgIGtleSA9IHRoaXMubG9jYWxzW2ldO1xuICAgICAgICBpZihrZXkgaW4gdGhpcy5yZWxhdGl2ZVZtLiRhc3NpZ25tZW50KXtcbiAgICAgICAgICB2YWxzW2tleV0gPSB0aGlzLnJlbGF0aXZlVm0uJGFzc2lnbm1lbnRba2V5XS4kZ2V0RGF0YSgpO1xuICAgICAgICAvLyB9ZWxzZSBpZihrZXkgPT09ICcuJyl7XG4gICAgICAgICAgLy8gdmFscyA9IHRoaXMucmVsYXRpdmVWbS4kZ2V0RGF0YSgpO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICB2YWxzW2tleV0gPSB0aGlzLnJlbGF0aXZlVm0uJGdldERhdGEoa2V5KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBcbiAgICAgIHZhciBuZXdWYWwgPSB0aGlzLmdldFZhbHVlKHZhbHMpXG4gICAgICAgICwgZGlyID0gdGhpcy50b2tlblxuICAgICAgICA7XG4gICAgICAgIFxuICAgICAgaWYobmV3VmFsICE9PSB0aGlzLnZhbCl7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICB0aGlzLnVwZGF0ZS5jYWxsKHRoaXMudG9rZW4sIG5ld1ZhbCwgdGhpcy52YWwpO1xuICAgICAgICAgIHRoaXMudmFsID0gbmV3VmFsO1xuICAgICAgICB9Y2F0Y2goZSl7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdGhpcy5zdGF0ZSA9IFdhdGNoZXIuU1RBVEVfQ0FMTEVEO1xuICAgIH1cbiAgICAvL3VwZGF0ZSB0aGUgRE9Nc1xuICAsIGNhbGxiYWNrOiBmdW5jdGlvbihuZXdWYWwpIHtcbiAgICAgIHZhciB0b2tlbiA9IHRoaXMudG9rZW5cbiAgICAgICAgLCBwb3MgPSB0b2tlbi5wb3NpdGlvblxuICAgICAgICAsIG5vZGUgPSB0b2tlbi5ub2RlXG4gICAgICAgICwgZWwgPSB0b2tlbi5lbFxuICAgICAgICAsIHRleHRNYXAgPSB0b2tlbi50ZXh0TWFwXG4gICAgICAgICwgbm9kZU5hbWUgPSB0b2tlbi5ub2RlTmFtZVxuICAgICAgICAsIGlzQXR0ck5hbWUgPSB0b2tlbi5pc0F0dHJOYW1lXG4gICAgICAgICwgdmFsXG4gICAgICAgIDtcbiAgICAgIGlmKG5ld1ZhbCArICcnICE9PSB0ZXh0TWFwW3Bvc10gKyAnJykge1xuICAgICAgICBcbiAgICAgICAgdGV4dE1hcFtwb3NdID0gbmV3VmFsICYmIChuZXdWYWwgKyAnJyk7XG4gICAgICAgIHZhbCA9IHRleHRNYXAuam9pbignJyk7XG4gICAgICAgIFxuICAgICAgICBpZihub2RlTmFtZSA9PT0gJyN0ZXh0Jykge1xuICAgICAgICAgIFxuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAvL3t7fX0gdG9rZW4gaW4gYXR0cmlidXRlIHZhbHVlLCB3aGljaCBub2RlTmFtZSBpcyBkeW5hbWljXG4gICAgICAgICAgLy9iYXNlVG9rZW5zIGlzIGFib3V0IGF0dHJpYnV0ZSBuYW1lXG4gICAgICAgICAgaWYodG9rZW4uYmFzZVRva2Vucyl7XG4gICAgICAgICAgICBub2RlTmFtZSA9IHRva2VuLm5vZGVOYW1lID0gdG9rZW4uYmFzZVRva2Vucy50ZXh0TWFwLmpvaW4oJycpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmKCFpc0F0dHJOYW1lKXtcbiAgICAgICAgICAgIG5vZGUubm9kZVZhbHVlID0gdmFsO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vY29uZGl0aW9uYWwgYXR0cmlidXRlIGp1c3Qgb25seSBjb25zaWRlciBhdHRyJ3MgdmFsdWVcbiAgICAgICAgICBpZih0b2tlbi5jb25kaUF0dHIgJiYgIWlzQXR0ck5hbWUpe1xuICAgICAgICAgICAgaWYobmV3VmFsKXtcbiAgICAgICAgICAgICAvLyBkZWxldGUgbm9kZS5faGlkZV87XG4gICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKG5vZGVOYW1lKTtcbiAgICAgICAgICAgICAvLyBub2RlLl9oaWRlXyA9IHRydWU7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy9pZighbm9kZS5faGlkZV8pe1xuICAgICAgICAgICAgaWYoaXNBdHRyTmFtZSl7XG4gICAgICAgICAgICAgIGlmKG5vZGVOYW1lKXtcbiAgICAgICAgICAgICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUobm9kZU5hbWUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIG5vZGVOYW1lID0gdG9rZW4ubm9kZU5hbWUgPSB2YWw7XG4gICAgICAgICAgICAgIHZhbCA9IG5vZGUubm9kZVZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYobm9kZU5hbWUpe1xuICAgICAgICAgICAgICBzZXRBdHRyKGVsLCBub2RlTmFtZSwgdmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAvLyB9ZWxzZXtcbiAgICAgICAgICAvLyAgIGNvbnNvbGUubG9nKCdza2lwLi4nKVxuICAgICAgICAgIC8vIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgLCBnZXRWYWx1ZTogZnVuY3Rpb24odmFscykge1xuICAgICAgdmFyIGZpbHRlcnMgPSB0aGlzLmZpbHRlcnNcbiAgICAgICAgLCBhbnQgPSB0aGlzLmFudCwgdmFsXG4gICAgICAgIDtcbiAgICAgIFxuICAgICAgZm9yKHZhciBpID0gMCwgbCA9IGZpbHRlcnMubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgICAgaWYoIWFudC5maWx0ZXJzW2ZpbHRlcnNbaV1dKXtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdGaWx0ZXI6ICcgKyBmaWx0ZXJzW2ldICsgJyBub3QgZm91bmQhJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFxuICAgICAgdHJ5e1xuICAgICAgICB2YWwgPSBldmFsdWF0ZS5ldmFsKHRoaXMuX2FzdCwge2xvY2FsczogdmFscywgZmlsdGVyczogYW50LmZpbHRlcnN9KTtcbiAgICAgIH1jYXRjaChlKXtcbiAgICAgICAgdmFsID0gJyc7XG4gICAgICB9XG4gICAgICByZXR1cm4gdmFsO1xuICAgIH1cbiAgfSk7XG4gIFxuICAvLy0tLVxuICBmdW5jdGlvbiBjYWxsUmVwZWF0ZXIodm1BcnJheSwgbWV0aG9kLCBhcmdzKXtcbiAgICB2YXIgd2F0Y2hlcnMgPSB2bUFycmF5Ll9fYW50X18uJHdhdGNoZXJzO1xuICAgIHZhciBub0ZpeFZtID0gZmFsc2U7XG4gICAgZm9yKHZhciBpID0gMCwgbCA9IHdhdGNoZXJzLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICBpZih3YXRjaGVyc1tpXS50eXBlID09PSBhbnRBdHRyLlJFUEVBVCl7XG4gICAgICAgIHdhdGNoZXJzW2ldW21ldGhvZF0oYXJncywgdm1BcnJheSwgbm9GaXhWbSk7XG4gICAgICAgIG5vRml4Vm0gPSB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICB2bUFycmF5Ll9fYW50X18uJGdldFZNKCdsZW5ndGgnKS4kc2V0KHZtQXJyYXkubGVuZ3RoLCBmYWxzZSwgdHJ1ZSk7XG4gICAgdm1BcnJheS5fX2FudF9fLiRyb290LiRhbnQudHJpZ2dlcigndXBkYXRlJyk7XG4gIH1cbiAgdmFyIGFycmF5TWV0aG9kcyA9IHtcbiAgICBzcGxpY2U6IGFmdGVyRm4oW10uc3BsaWNlLCBmdW5jdGlvbigpIHtcbiAgICAgIGNhbGxSZXBlYXRlcih0aGlzLCAnc3BsaWNlJywgW10uc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcbiAgICB9KVxuICAsIHB1c2g6IGFmdGVyRm4oW10ucHVzaCwgZnVuY3Rpb24oLyppdGVtMSwgaXRlbTIsIC4uLiovKSB7XG4gICAgICB2YXIgYXJyID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgYXJyLnVuc2hpZnQodGhpcy5sZW5ndGggLSBhcnIubGVuZ3RoLCAwKTtcbiAgICAgIFxuICAgICAgY2FsbFJlcGVhdGVyKHRoaXMsICdzcGxpY2UnLCBhcnIpO1xuICAgIH0pXG4gICwgcG9wOiBhZnRlckZuKFtdLnBvcCwgZnVuY3Rpb24oKSB7XG4gICAgICBjYWxsUmVwZWF0ZXIodGhpcywgJ3NwbGljZScsIFt0aGlzLmxlbmd0aCwgMV0pO1xuICAgIH0pXG4gICwgc2hpZnQ6IGFmdGVyRm4oW10uc2hpZnQsIGZ1bmN0aW9uKCkge1xuICAgICAgY2FsbFJlcGVhdGVyKHRoaXMsICdzcGxpY2UnLCBbMCwgMV0pO1xuICAgIH0pXG4gICwgdW5zaGlmdDogYWZ0ZXJGbihbXS51bnNoaWZ0LCBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBhcnIgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICBhcnIudW5zaGlmdCgwLCAwKTtcbiAgICAgIFxuICAgICAgY2FsbFJlcGVhdGVyKHRoaXMsICdzcGxpY2UnLCBhcnIpO1xuICAgIH0pXG4gICwgc29ydDogYWZ0ZXJGbihbXS5zb3J0LCBmdW5jdGlvbihmbikge1xuICAgICAgY2FsbFJlcGVhdGVyKHRoaXMsICdzb3J0Jyk7XG4gICAgfSlcbiAgLCByZXZlcnNlOiBhZnRlckZuKFtdLnJldmVyc2UsIGZ1bmN0aW9uKCl7XG4gICAgICBjYWxsUmVwZWF0ZXIodGhpcywgJ3JldmVyc2UnKTtcbiAgICB9KVxuICB9O1xuICBcbiAgLy/lpITnkIbliqjmgIHoioLngrkoei1yZXBlYXQsIHotaWYpXG4gIHZhciBHZW5lcmF0b3IgPSBXYXRjaGVyLmV4dGVuZChcbiAgICB7XG4gICAgICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gKHJlbGF0aXZlVm0sIHRva2VuKXtcbiAgICAgICAgLy/mlofmoaPlj4LnhafoioLngrkuIFxuICAgICAgICB2YXIgYW5jaG9yID0gZG9jLmNyZWF0ZVRleHROb2RlKCcnKVxuICAgICAgICAgICwgZWwgPSB0b2tlbi5lbFxuICAgICAgICAgICwgdHlwZSA9IHRva2VuLm5vZGVOYW1lXG4gICAgICAgICAgO1xuXG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGU7XG4gICAgICAgIHRoaXMuYW5jaG9yID0gYW5jaG9yO1xuICAgICAgICBlbC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShhbmNob3IsIGVsKTtcbiAgICAgICAgZWwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChlbCk7XG4gICAgICAgICAgXG4gICAgICAgIFdhdGNoZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgXG4gICAgICAgIGVsLnJlbW92ZUF0dHJpYnV0ZSh0eXBlKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgdGhpcy5lbHMgPSBbXTtcbiAgICAgICAgdGhpcy52bSA9IHJlbGF0aXZlVm0uJGdldFZNKHRoaXMucGF0aHNbMF0pO1xuICAgICAgICBcbiAgICAgICAgaWYodHlwZSA9PT0gYW50QXR0ci5JRil7XG4gICAgICAgICAgLy9pZiDlsZ7mgKfkuI3nlKjliIfmjaLkvZznlKjln59cbiAgICAgICAgICB0cmF2ZWxFbCh0aGlzLmVsLCByZWxhdGl2ZVZtKTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgdGhpcy52bS4kcmVwZWF0ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgIH1cbiAgICAsIGNhbGxiYWNrOiBmdW5jdGlvbihkYXRhLCBvbGQpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzXG4gICAgICAgICAgO1xuICAgICAgICBpZih0aGF0LnR5cGUgPT09IGFudEF0dHIuUkVQRUFUKXtcbiAgICAgICAgICBpZihkYXRhICYmICFpc0FycmF5KGRhdGEpKXtcbiAgICAgICAgICAgIGNvbnNvbGUud2Fybign6ZyA6KaB5LiA5Liq5pWw57uEJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGRhdGEgJiYgdGhpcy5zcGxpY2UoWzAsIHRoaXMuZWxzLmxlbmd0aF0uY29uY2F0KGRhdGEpLCBkYXRhKTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgaWYoZGF0YSkge1xuICAgICAgICAgICAgaWYoIXRoYXQubGFzdElmU3RhdGUpIHtcbiAgICAgICAgICAgICAgdGhhdC5hbmNob3IucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhhdC5lbCwgdGhhdC5hbmNob3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgaWYodGhhdC5sYXN0SWZTdGF0ZSkge1xuICAgICAgICAgICAgICB0aGF0LmVsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhhdC5lbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoYXQubGFzdElmU3RhdGUgPSBkYXRhO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgfVxuICAgICAgLy/nsr7noa7mjqfliLYgRE9NIOWIl+ihqFxuICAgICAgLy9hcmdzOiBbaW5kZXgsIG4vKiwgaXRlbXMuLi4qL11cbiAgICAgIC8vYXJyOiDmlbDnu4TmlbDmja5cbiAgICAgIC8vbm9GaXhWbTog5piv5ZCm5LiN6ZyA6KaB57u05oqkIHZpZXdtb2RlbCDntKLlvJVcbiAgICAsIHNwbGljZTogZnVuY3Rpb24oYXJncywgYXJyLCBub0ZpeFZtKSB7XG4gICAgICAgIHZhciBlbHMgPSB0aGlzLmVsc1xuICAgICAgICAgICwgaXRlbXMgPSBhcmdzLnNsaWNlKDIpXG4gICAgICAgICAgLCBpbmRleCA9IGFyZ3NbMF0gKiAxXG4gICAgICAgICAgLCBuID0gYXJnc1sxXSAqIDFcbiAgICAgICAgICAsIG0gPSBpdGVtcy5sZW5ndGhcbiAgICAgICAgICAsIG5ld0VscyA9IFtdXG4gICAgICAgICAgLCBmcmFnID0gZG9jLmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKVxuICAgICAgICAgICwgcG4gPSB0aGlzLmFuY2hvci5wYXJlbnROb2RlXG4gICAgICAgICAgLCBlbCwgdm1cbiAgICAgICAgICA7XG4gICAgICAgIFxuICAgICAgICBpZihpc1VuZGVmaW5lZChuKSl7XG4gICAgICAgICAgYXJnc1sxXSA9IG4gPSBlbHMubGVuZ3RoIC0gaW5kZXg7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGZvcih2YXIgaSA9IGluZGV4LCBsID0gZWxzLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICAgICAgaWYoaSA8IGluZGV4ICsgbil7XG4gICAgICAgICAgICAvL+WIoOmZpFxuICAgICAgICAgICAgLy/lr7nkuo7mi6XmnIkgaWYg5bGe5oCn5bm25LiU5LiN5pi+56S655qE6IqC54K5LCDlhbblubbkuI3lrZjlnKjkuo4gRE9NIOagkeS4rVxuICAgICAgICAgICAgdHJ5eyBwbi5yZW1vdmVDaGlsZChlbHNbaV0pOyB9Y2F0Y2goZSl7fVxuICAgICAgICAgICAgbm9GaXhWbSB8fCBkZWxldGUgdGhpcy52bVtpXTtcbiAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgIGlmKG4gfHwgbSl7XG4gICAgICAgICAgICAgIC8v57u05oqk57Si5byVXG4gICAgICAgICAgICAgIHZhciBuZXdJID0gaSAtIChuIC0gbSlcbiAgICAgICAgICAgICAgICAsIG9sZEkgPSBpXG4gICAgICAgICAgICAgICAgO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgaWYobmV3SSA+IG9sZEkpIHtcbiAgICAgICAgICAgICAgICBuZXdJID0gbCAtIChpIC0gaW5kZXgpO1xuICAgICAgICAgICAgICAgIG9sZEkgPSBuZXdJICsgKG4gLSBtKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgZWxzW29sZEldWyckaW5kZXgnXSA9IG5ld0k7XG4gICAgICAgICAgICAgIGlmKCFub0ZpeFZtKXtcbiAgICAgICAgICAgICAgICB2bSA9IHRoaXMudm1bbmV3SV0gPSB0aGlzLnZtW29sZEldO1xuICAgICAgICAgICAgICAgIHZtLiRrZXkgPSBuZXdJICsgJyc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8v5paw5aKeXG4gICAgICAgIGZvcih2YXIgaiA9IDA7IGogPCBtOyBqKyspe1xuICAgICAgICAgIGVsID0gdGhpcy5lbC5jbG9uZU5vZGUodHJ1ZSk7XG4gICAgICAgICAgbm9GaXhWbSB8fCBkZWxldGUgdGhpcy52bVtpbmRleCArIGpdO1xuICAgICAgICAgIHZtID0gdGhpcy52bS4kZ2V0Vk0oaW5kZXggKyBqKTtcbiAgICAgICAgICBcbiAgICAgICAgICBmb3IodmFyIGEgPSAwOyBhIDwgdGhpcy5hc3NpZ25tZW50cy5sZW5ndGg7IGErKykge1xuICAgICAgICAgICAgdm0uJGFzc2lnbm1lbnRbdGhpcy5hc3NpZ25tZW50c1thXV0gPSB2bTtcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgZWxbJyRpbmRleCddID0gaW5kZXggKyBqO1xuICAgICAgICAgIGZyYWcuYXBwZW5kQ2hpbGQoZWwpO1xuICAgICAgICAgIHRyYXZlbEVsKGVsLCB2bSk7XG4gICAgICAgICAgdm0uJHNldChpdGVtc1tqXSk7XG4gICAgICAgICAgXG4gICAgICAgICAgbmV3RWxzLnB1c2goZWwpO1xuICAgICAgICAgIGlmKGFyciAmJiBpc09iamVjdChhcnJbaW5kZXggKyBqXSkpe1xuICAgICAgICAgICAgYXJyW2luZGV4ICsgal0gPSBtb2RlbEV4dGVuZChpc0FycmF5KGFycltpbmRleCArIGpdKSA/IFtdOiB7fSwgYXJyW2luZGV4ICsgal0sIHZtKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYobmV3RWxzLmxlbmd0aCl7XG4gICAgICAgICAgcG4uaW5zZXJ0QmVmb3JlKGZyYWcsIGVsc1tpbmRleCArIG5dIHx8IHRoaXMuYW5jaG9yKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy/pnIDopoHmuIXpmaTnvKnnn63lkI7lpJrlh7rnmoTpg6jliIZcbiAgICAgICAgaWYoIW5vRml4Vm0pe1xuICAgICAgICAgIGZvcih2YXIgayA9IGwgLSBuICsgbTsgayA8IGw7IGsrKyl7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy52bVtrXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmKGFyci5fX2FudF9fICE9PSB0aGlzLnZtKSB7XG4gICAgICAgICAgYXJyLl9fYW50X18gPSB0aGlzLnZtO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBhcmdzID0gYXJncy5zbGljZSgwLCAyKS5jb25jYXQobmV3RWxzKTtcbiAgICAgICAgZWxzLnNwbGljZS5hcHBseShlbHMsIGFyZ3MpO1xuICAgICAgfVxuICAgICwgcmV2ZXJzZTogZnVuY3Rpb24oYXJncywgYXJyLCBub0ZpeFZtKSB7XG4gICAgICAgIHZhciB2bXMgPSB0aGlzLnZtLCB2bVxuICAgICAgICAgICwgZWwgPSB0aGlzLmFuY2hvclxuICAgICAgICAgICwgZnJhZyA9IGRvYy5jcmVhdGVEb2N1bWVudEZyYWdtZW50KClcbiAgICAgICAgICA7XG4gICAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSB0aGlzLmVscy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgICAgIGlmKCghbm9GaXhWbSkgJiYgaSA8IDEvMil7XG4gICAgICAgICAgICB2bSA9IHZtc1tpXTtcbiAgICAgICAgICAgIHZtc1tpXSA9IHZtc1tsIC0gaSAtIDFdO1xuICAgICAgICAgICAgdm1zW2ldLiRrZXkgPSBpICsgJyc7XG4gICAgICAgICAgICB2bS4ka2V5ID0gbCAtIGkgLSAxICsgJyc7XG4gICAgICAgICAgICB2bXNbbCAtIGkgLSAxXSA9IHZtO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLmVsc1tpXVsnJGluZGV4J10gPSBsIC0gaSAtIDE7XG4gICAgICAgICAgZnJhZy5hcHBlbmRDaGlsZCh0aGlzLmVsc1tsIC0gaSAtIDFdKTtcbiAgICAgICAgfVxuICAgICAgICBlbC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShmcmFnLCBlbCk7XG4gICAgICAgIHRoaXMuZWxzLnJldmVyc2UoKTtcbiAgICAgIH1cbiAgICAsIHNvcnQ6IGZ1bmN0aW9uKGZuKXtcbiAgICAgICAgLy9UT0RPIOi/m+ihjOeyvuehrumrmOi/mOWOn+eahOaOkuW6jz9cbiAgICAgICAgdGhpcy5jYWxsYmFjayh0aGlzLnZhbClcbiAgICAgIH1cbiAgICB9XG4gIClcbiAgXG4gIEFudC5fcGFyc2UgPSBwYXJzZTtcbiAgQW50Ll9ldmFsID0gZXZhbHVhdGUuZXZhbDtcbiAgQW50LnZlcnNpb24gPSAnJVZFUlNJT04nO1xuICBcbiAgbW9kdWxlLmV4cG9ydHMgPSBBbnQ7IiwidmFyIGV4dGVuZCA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKS5leHRlbmQ7XG5cbnZhciBDbGFzcyA9IHtcbiAgLyoqIFxuICAgKiDmnoTpgKDlh73mlbDnu6fmib8uIFxuICAgKiDlpoI6IGB2YXIgQ2FyID0gQW50LmV4dGVuZCh7ZHJpdmU6IGZ1bmN0aW9uKCl7fX0pOyBuZXcgQ2FyKCk7YFxuICAgKiBAcGFyYW0ge09iamVjdH0gW3Byb3RvUHJvcHNdIOWtkOaehOmAoOWHveaVsOeahOaJqeWxleWOn+Wei+WvueixoVxuICAgKiBAcGFyYW0ge09iamVjdH0gW3N0YXRpY1Byb3BzXSDlrZDmnoTpgKDlh73mlbDnmoTmianlsZXpnZnmgIHlsZ7mgKdcbiAgICogQHJldHVybiB7RnVuY3Rpb259IOWtkOaehOmAoOWHveaVsFxuICAgKi9cbiAgZXh0ZW5kOiBmdW5jdGlvbiAocHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHtcbiAgICBwcm90b1Byb3BzID0gcHJvdG9Qcm9wcyB8fCB7fTtcbiAgICB2YXIgY29uc3RydWN0b3IgPSBwcm90b1Byb3BzLmhhc093blByb3BlcnR5KCdjb25zdHJ1Y3RvcicpID8gcHJvdG9Qcm9wcy5jb25zdHJ1Y3RvciA6IGZ1bmN0aW9uKCl7IHJldHVybiBzdXAuYXBwbHkodGhpcywgYXJndW1lbnRzKTsgfVxuICAgIHZhciBzdXAgPSB0aGlzO1xuICAgIHZhciBGbiA9IGZ1bmN0aW9uKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gY29uc3RydWN0b3I7IH07XG4gICAgXG4gICAgRm4ucHJvdG90eXBlID0gc3VwLnByb3RvdHlwZTtcbiAgICBjb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBuZXcgRm4oKTtcbiAgICBleHRlbmQoY29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTtcbiAgICBleHRlbmQoY29uc3RydWN0b3IsIHN1cCwgc3RhdGljUHJvcHMsIHtfX3N1cGVyX186IHN1cC5wcm90b3R5cGV9KTtcbiAgICBcbiAgICByZXR1cm4gY29uc3RydWN0b3I7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2xhc3M7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKVxuICA7XG5cbi8v5Li6IEFudCDmnoTpgKDlh73mlbDmt7vliqDmjIfku6QgKGRpcmVjdGl2ZSkuIGBBbnQuZGlyZWN0aXZlYFxuZnVuY3Rpb24gZGlyZWN0aXZlKGtleSwgb3B0cykge1xuICB2YXIgZGlycyA9IHRoaXMuZGlyZWN0aXZlcyA9IHRoaXMuZGlyZWN0aXZlcyB8fCB7fTtcbiAgXG4gIHJldHVybiBkaXJzW2tleV0gPSBuZXcgRGlyZWN0aXZlKGtleSwgb3B0cyk7XG59XG5cbmV4cG9ydHMuZGlyZWN0aXZlID0gZGlyZWN0aXZlO1xuXG5mdW5jdGlvbiBEaXJlY3RpdmUoa2V5LCBvcHRzKSB7XG4gIHV0aWxzLmV4dGVuZCh0aGlzLCB7XG4gICAgcHJpb3JpdHk6IDBcbiAgLCB0eXBlOiBrZXlcbiAgLCB0ZXJtaW5hbDogZmFsc2VcbiAgLCByZXBsYWNlOiBmYWxzZVxuICAsIHVwZGF0ZTogdXRpbHMubm9vcFxuICAsIGluaXQ6IHV0aWxzLm5vb3BcbiAgfSwgb3B0cyk7XG59XG4iLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIGlmKHRoaXMuZGlyTmFtZSA9PT0gdGhpcy50eXBlKSB7XG4gICAgICB0aGlzLmF0dHJzID0ge307XG4gICAgfVxuICB9XG4sIHVwZGF0ZTogZnVuY3Rpb24odmFsKSB7XG4gICAgaWYodGhpcy5kaXJOYW1lID09PSB0aGlzLnR5cGUpIHtcbiAgICAgIFxuICAgICAgZm9yKHZhciBhdHRyIGluIHZhbCkge1xuICAgICAgICBzZXRBdHRyKHRoaXMuZWwsIGF0dHIsIHZhbFthdHRyXSk7XG4gICAgICAgIGlmKHZhbFthdHRyXSkge1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLmF0dHJzW2F0dHJdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IodmFyIGF0dHIgaW4gdGhpcy5hdHRycykge1xuICAgICAgICB0aGlzLmVsLnJlbW92ZUF0dHJpYnV0ZShhdHRyKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuYXR0cnMgPSB2YWw7XG4gICAgfWVsc2V7XG4gICAgICB0aGlzLnRleHRNYXBbdGhpcy5wb3NpdGlvbl0gPSB2YWwgJiYgKHZhbCArICcnKTtcbiAgICAgIHZhbCA9IHRoaXMudGV4dE1hcC5qb2luKCcnKTtcbiAgICAgIHNldEF0dHIodGhpcy5lbCwgdGhpcy5kaXJOYW1lLCB2YWwpO1xuICAgIH1cbiAgfVxufTtcblxuICAvLyB1cGRhdGU6IGZ1bmN0aW9uKG5ld1ZhbCkge1xuICAgIC8vIHZhciBpc0F0dHJOYW1lID0gdGhpcy5pc0F0dHJOYW1lXG4gICAgICAvLyAsIG5vZGVOYW1lID0gdGhpcy5kaXJOYW1lXG4gICAgICAvLyAsIG5vZGUgPSB0aGlzLm5vZGVcbiAgICAgIC8vICwgZWwgPSB0aGlzLmVsXG4gICAgICAvLyAsIHZhbFxuICAgICAgLy8gO1xuICAgIFxuICAgIC8vIHRoaXMudGV4dE1hcFt0aGlzLnBvc2l0aW9uXSA9IG5ld1ZhbCAmJiAobmV3VmFsICsgJycpO1xuICAgIC8vIHZhbCA9IHRoaXMudGV4dE1hcC5qb2luKCcnKTtcbiAgICBcbiAgICAvLyAvL3t7fX0gdG9rZW4gaW4gYXR0cmlidXRlIHZhbHVlLCB3aGljaCBub2RlTmFtZSBpcyBkeW5hbWljXG4gICAgLy8gLy9iYXNlVG9rZW5zIGlzIGFib3V0IGF0dHJpYnV0ZSBuYW1lXG4gICAgLy8gaWYodGhpcy5iYXNlVG9rZW5zKXtcbiAgICAgIC8vIG5vZGVOYW1lID0gdGhpcy5ub2RlTmFtZSA9IHRoaXMuYmFzZVRva2Vucy50ZXh0TWFwLmpvaW4oJycpO1xuICAgIC8vIH1cblxuICAgIC8vIGlmKCFpc0F0dHJOYW1lKXtcbiAgICAgIC8vIG5vZGUubm9kZVZhbHVlID0gdmFsO1xuICAgIC8vIH1cblxuICAgIC8vIC8vY29uZGl0aW9uYWwgYXR0cmlidXRlIGp1c3Qgb25seSBjb25zaWRlciBhdHRyJ3MgdmFsdWVcbiAgICAvLyBpZih0aGlzLmNvbmRpQXR0ciAmJiAhaXNBdHRyTmFtZSl7XG4gICAgICAvLyBpZihuZXdWYWwpe1xuICAgICAgIC8vIC8vIGRlbGV0ZSBub2RlLl9oaWRlXztcbiAgICAgIC8vIH1lbHNle1xuICAgICAgICAvLyBlbC5yZW1vdmVBdHRyaWJ1dGUobm9kZU5hbWUpO1xuICAgICAgIC8vIC8vIG5vZGUuX2hpZGVfID0gdHJ1ZTtcbiAgICAgICAgLy8gcmV0dXJuO1xuICAgICAgLy8gfVxuICAgIC8vIH1cbiAgICAvLyAvL2lmKCFub2RlLl9oaWRlXyl7XG4gICAgICAvLyBpZihpc0F0dHJOYW1lKXtcbiAgICAgICAgLy8gaWYobm9kZU5hbWUpe1xuICAgICAgICAgIC8vIGVsLnJlbW92ZUF0dHJpYnV0ZShub2RlTmFtZSk7XG4gICAgICAgIC8vIH1cbiAgICAgICAgLy8gbm9kZU5hbWUgPSB0aGlzLm5vZGVOYW1lID0gdmFsO1xuICAgICAgICAvLyB2YWwgPSBub2RlLm5vZGVWYWx1ZTtcbiAgICAgIC8vIH1cbiAgICAgIC8vIGlmKG5vZGVOYW1lKXtcbiAgICAgICAgLy8gc2V0QXR0cihlbCwgbm9kZU5hbWUsIHZhbCk7XG4gICAgICAvLyB9XG4gICAgLy8gLy8gfWVsc2V7XG4gICAgLy8gLy8gICBjb25zb2xlLmxvZygnc2tpcC4uJylcbiAgICAvLyAvLyB9XG4gICAgXG4gIC8vIH1cblxuXG4vL0lFIOa1j+iniOWZqOW+iOWkmuWxnuaAp+mAmui/hyBgc2V0QXR0cmlidXRlYCDorr7nva7lkI7ml6DmlYguIFxuLy/ov5nkupvpgJrov4cgYGVsW2F0dHJdID0gdmFsdWVgIOiuvue9rueahOWxnuaAp+WNtOiDveWkn+mAmui/hyBgcmVtb3ZlQXR0cmlidXRlYCDmuIXpmaQuXG5mdW5jdGlvbiBzZXRBdHRyKGVsLCBhdHRyLCB2YWwpe1xuICB0cnl7XG4gICAgaWYoKChhdHRyIGluIGVsKSB8fCBhdHRyID09PSAnY2xhc3MnKSl7XG4gICAgICBpZihhdHRyID09PSAnc3R5bGUnICYmIGVsLnN0eWxlLnNldEF0dHJpYnV0ZSl7XG4gICAgICAgIGVsLnN0eWxlLnNldEF0dHJpYnV0ZSgnY3NzVGV4dCcsIHZhbCk7XG4gICAgICB9ZWxzZSBpZihhdHRyID09PSAnY2xhc3MnKXtcbiAgICAgICAgZWwuY2xhc3NOYW1lID0gdmFsO1xuICAgICAgfWVsc2V7XG4gICAgICAgIGVsW2F0dHJdID0gdHlwZW9mIGVsW2F0dHJdID09PSAnYm9vbGVhbicgPyB0cnVlIDogdmFsO1xuICAgICAgfVxuICAgIH1cbiAgfWNhdGNoKGUpe31cbiAgdHJ5e1xuICAgIC8vY2hyb21lIHNldGF0dHJpYnV0ZSB3aXRoIGB7e319YCB3aWxsIHRocm93IGFuIGVycm9yXG4gICAgZWwuc2V0QXR0cmlidXRlKGF0dHIsIHZhbCk7XG4gIH1jYXRjaChlKXsgY29uc29sZS53YXJuKGUpIH1cbn0iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGRvYyA9IHJlcXVpcmUoJy4uL2RvY3VtZW50LmpzJyk7XG5cbnZhciBkaXJzID0ge307XG5cblxuZGlycy50ZXh0ID0ge1xuICB0ZXJtaW5hbDogdHJ1ZVxuLCByZXBsYWNlOiBmdW5jdGlvbigpIHsgcmV0dXJuIGRvYy5jcmVhdGVUZXh0Tm9kZSgnJykgfVxuLCB1cGRhdGU6IGZ1bmN0aW9uKHZhbCkge1xuICAgIHRoaXMubm9kZS5ub2RlVmFsdWUgPSB2YWw7XG4gIH1cbn07XG5cblxuZGlycy5odG1sID0ge1xuICB0ZXJtaW5hbDogdHJ1ZVxuLCByZXBsYWNlOiB0cnVlXG4sIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMubm9kZXMgPSBbXTtcbiAgfVxuLCB1cGRhdGU6IGZ1bmN0aW9uKHZhbCkge1xuICAgIHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGVsLmlubmVySFRNTCA9IHZhbDtcbiAgICBcbiAgICB2YXIgbm9kZTtcbiAgICB3aGlsZShub2RlID0gdGhpcy5ub2Rlcy5wb3AoKSkge1xuICAgICAgbm9kZS5wYXJlbnROb2RlICYmIG5vZGUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub2RlKTtcbiAgICB9XG4gICAgXG4gICAgdmFyIG5vZGVzID0gZWwuY2hpbGROb2RlcztcbiAgICBmb3IodmFyIGkgPSAwLCBsID0gbm9kZXMubGVuZ3RoOyBpIDwgbDsgaSArKykge1xuICAgICAgdGhpcy5ub2Rlcy5wdXNoKG5vZGVzW2ldKVxuICAgICAgdGhpcy5lbC5pbnNlcnRCZWZvcmUodGhpcy5ub2Rlc1tpXSwgdGhpcy5ub2RlKTtcbiAgICB9XG4gIH1cbn07XG4gIFxuICBcbmRpcnMucmVwZWF0ID0ge1xuICBwcmlvcml0eTogMTAwMDBcbiwgdGVybWluYWw6IHRydWVcbn07XG4gIFxuZGlyc1snaWYnXSA9IHtcbiAgXG59O1xuICBcbmRpcnMuYXR0ciA9IHJlcXVpcmUoJy4vYXR0ci5qcycpO1xuZGlycy5tb2RlbCA9IHJlcXVpcmUoJy4vbW9kZWwuanMnKVxuICBcbmRpcnMucGFydGlhbCA9IHtcbiAgdGVybWluYWw6IHRydWVcbiwgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGRpcnM7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICB0ZW1pbmFsOiB0cnVlXG4sIHByaW9yaXR5OiAxXG4sIGluaXQ6IGZ1bmN0aW9uKHZtKSB7XG4gICAgdmFyIGtleVBhdGggPSB0aGlzLnBhdGg7XG4gICAgXG4gICAgaWYoIWtleVBhdGgpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgXG4gICAgdmFyIGVsID0gdGhpcy5lbFxuICAgICAgLCBldiA9ICdjaGFuZ2UnXG4gICAgICAsIGF0dHIsIHZhbHVlID0gYXR0ciA9ICd2YWx1ZSdcbiAgICAgICwgYW50ID0gdm0uJHJvb3QuJGFudFxuICAgICAgLCBjdXIgPSB2bS4kZ2V0Vk0oa2V5UGF0aClcbiAgICAgICwgaXNTZXREZWZhdXQgPSB1dGlscy5pc1VuZGVmaW5lZChhbnQuZ2V0KGN1ci4kZ2V0S2V5UGF0aCgpKSkvL+eVjOmdoueahOWIneWni+WAvOS4jeS8muimhuebliBtb2RlbCDnmoTliJ3lp4vlgLxcbiAgICAgICwgY3JsZiA9IC9cXHJcXG4vZy8vSUUgOCDkuIsgdGV4dGFyZWEg5Lya6Ieq5Yqo5bCGIFxcbiDmjaLooYznrKbmjaLmiJAgXFxyXFxuLiDpnIDopoHlsIblhbbmm7/mjaLlm57mnaVcbiAgICAgICwgY2FsbGJhY2sgPSBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgICAvL+aJp+ihjOi/memHjOeahOaXtuWAmSwg5b6I5Y+v6IO9IHJlbmRlciDov5jmnKrmiafooYwuIHZtLiRnZXREYXRhKGtleVBhdGgpIOacquWumuS5iSwg5LiN6IO96L+U5Zue5paw6K6+572u55qE5YC8XG4gICAgICAgICAgdmFyIG5ld1ZhbCA9ICh2YWwgfHwgdm0uJGdldERhdGEoa2V5UGF0aCkgfHwgJycpICsgJydcbiAgICAgICAgICAgICwgdmFsID0gZWxbYXR0cl1cbiAgICAgICAgICAgIDtcbiAgICAgICAgICB2YWwgJiYgdmFsLnJlcGxhY2UgJiYgKHZhbCA9IHZhbC5yZXBsYWNlKGNybGYsICdcXG4nKSk7XG4gICAgICAgICAgaWYobmV3VmFsICE9PSB2YWwpeyBlbFthdHRyXSA9IG5ld1ZhbDsgfVxuICAgICAgICB9XG4gICAgICAsIGhhbmRsZXIgPSBmdW5jdGlvbihpc0luaXQpIHtcbiAgICAgICAgICB2YXIgdmFsID0gZWxbdmFsdWVdO1xuICAgICAgICAgIFxuICAgICAgICAgIHZhbC5yZXBsYWNlICYmICh2YWwgPSB2YWwucmVwbGFjZShjcmxmLCAnXFxuJykpO1xuICAgICAgICAgIGFudC5zZXQoY3VyLiRnZXRLZXlQYXRoKCksIHZhbCwge2lzQnViYmxlOiBpc0luaXQgIT09IHRydWV9KTtcbiAgICAgICAgfVxuICAgICAgLCBjYWxsSGFuZGxlciA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICBpZihlICYmIGUucHJvcGVydHlOYW1lICYmIGUucHJvcGVydHlOYW1lICE9PSBhdHRyKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICAgICAgICB9XG4gICAgICAsIGllID0gdXRpbHMuaWVcbiAgICAgIDtcbiAgICBcbiAgICBzd2l0Y2goZWwudGFnTmFtZSkge1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdmFsdWUgPSBhdHRyID0gJ2lubmVySFRNTCc7XG4gICAgICAgIC8vZXYgKz0gJyBibHVyJztcbiAgICAgIGNhc2UgJ0lOUFVUJzpcbiAgICAgIGNhc2UgJ1RFWFRBUkVBJzpcbiAgICAgICAgc3dpdGNoKGVsLnR5cGUpIHtcbiAgICAgICAgICBjYXNlICdjaGVja2JveCc6XG4gICAgICAgICAgICB2YWx1ZSA9IGF0dHIgPSAnY2hlY2tlZCc7XG4gICAgICAgICAgICAvL0lFNiwgSUU3IOS4i+ebkeWQrCBwcm9wZXJ0eWNoYW5nZSDkvJrmjII/XG4gICAgICAgICAgICBpZihpZSkgeyBldiArPSAnIGNsaWNrJzsgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3JhZGlvJzpcbiAgICAgICAgICAgIGF0dHIgPSAnY2hlY2tlZCc7XG4gICAgICAgICAgICBpZihpZSkgeyBldiArPSAnIGNsaWNrJzsgfVxuICAgICAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgZWwuY2hlY2tlZCA9IGVsLnZhbHVlID09PSB2bS4kZ2V0RGF0YShrZXlQYXRoKSArICcnO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlzU2V0RGVmYXV0ID0gZWwuY2hlY2tlZDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgaWYoIWFudC5vcHRpb25zLmxhenkpe1xuICAgICAgICAgICAgICBpZignb25pbnB1dCcgaW4gZWwpe1xuICAgICAgICAgICAgICAgIGV2ICs9ICcgaW5wdXQnO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vSUUg5LiL55qEIGlucHV0IOS6i+S7tuabv+S7o1xuICAgICAgICAgICAgICBpZihpZSkge1xuICAgICAgICAgICAgICAgIGV2ICs9ICcga2V5dXAgcHJvcGVydHljaGFuZ2UgY3V0JztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICBicmVhaztcbiAgICAgIGNhc2UgJ1NFTEVDVCc6XG4gICAgICAgIGlmKGVsLm11bHRpcGxlKXtcbiAgICAgICAgICBoYW5kbGVyID0gZnVuY3Rpb24oaXNJbml0KSB7XG4gICAgICAgICAgICB2YXIgdmFscyA9IFtdO1xuICAgICAgICAgICAgZm9yKHZhciBpID0gMCwgbCA9IGVsLm9wdGlvbnMubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgICAgICAgICAgaWYoZWwub3B0aW9uc1tpXS5zZWxlY3RlZCl7IHZhbHMucHVzaChlbC5vcHRpb25zW2ldLnZhbHVlKSB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhbnQuc2V0KGN1ci4kZ2V0S2V5UGF0aCgpLCB2YWxzLCB7aXNCdWJibGU6IGlzSW5pdCAhPT0gdHJ1ZX0pO1xuICAgICAgICAgIH07XG4gICAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIHZhbHMgPSB2bS4kZ2V0RGF0YShrZXlQYXRoKTtcbiAgICAgICAgICAgIGlmKHZhbHMgJiYgdmFscy5sZW5ndGgpe1xuICAgICAgICAgICAgICBmb3IodmFyIGkgPSAwLCBsID0gZWwub3B0aW9ucy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgICAgICAgICAgIGVsLm9wdGlvbnNbaV0uc2VsZWN0ZWQgPSB2YWxzLmluZGV4T2YoZWwub3B0aW9uc1tpXS52YWx1ZSkgIT09IC0xO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICAvL2lzU2V0RGVmYXV0ID0gaXNTZXREZWZhdXQgJiYgIWhhc1Rva2VuKGVsW3ZhbHVlXSk7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgXG4gICAgdGhpcy51cGRhdGUgPSBjYWxsYmFjaztcbiAgICBcbiAgICBldi5zcGxpdCgvXFxzKy9nKS5mb3JFYWNoKGZ1bmN0aW9uKGUpe1xuICAgICAgcmVtb3ZlRXZlbnQoZWwsIGUsIGNhbGxIYW5kbGVyKTtcbiAgICAgIGFkZEV2ZW50KGVsLCBlLCBjYWxsSGFuZGxlcik7XG4gICAgfSk7XG4gICAgXG4gICAgLy/moLnmja7ooajljZXlhYPntKDnmoTliJ3lp4vljJbpu5jorqTlgLzorr7nva7lr7nlupQgbW9kZWwg55qE5YC8XG4gICAgaWYoZWxbdmFsdWVdICYmIGlzU2V0RGVmYXV0KXtcbiAgICAgICBoYW5kbGVyKHRydWUpOyBcbiAgICB9XG4gICAgICBcbiAgfVxufTtcblxuZnVuY3Rpb24gYWRkRXZlbnQoZWwsIGV2ZW50LCBoYW5kbGVyKSB7XG4gIGlmKGVsLmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgICBlbC5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBoYW5kbGVyLCBmYWxzZSk7XG4gIH1lbHNle1xuICAgIGVsLmF0dGFjaEV2ZW50KCdvbicgKyBldmVudCwgaGFuZGxlcik7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVtb3ZlRXZlbnQoZWwsIGV2ZW50LCBoYW5kbGVyKSB7XG4gIGlmKGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIpIHtcbiAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCBoYW5kbGVyKTtcbiAgfWVsc2V7XG4gICAgZWwuZGV0YWNoRXZlbnQoJ29uJyArIGV2ZW50LCBoYW5kbGVyKTtcbiAgfVxufSIsIihmdW5jdGlvbihyb290KXtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgbW9kdWxlLmV4cG9ydHMgPSByb290LmRvY3VtZW50IHx8IHJlcXVpcmUoJ2pzZG9tJykuanNkb20oKTtcblxufSkoKGZ1bmN0aW9uKCkge3JldHVybiB0aGlzfSkoKSk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBvcGVyYXRvcnMgPSB7XG4gICd1bmFyeSc6IHtcbiAgICAnKyc6IGZ1bmN0aW9uKHYpIHsgcmV0dXJuICt2OyB9XG4gICwgJy0nOiBmdW5jdGlvbih2KSB7IHJldHVybiAtdjsgfVxuICAsICchJzogZnVuY3Rpb24odikgeyByZXR1cm4gIXY7IH1cbiAgICBcbiAgLCAnWyc6IGZ1bmN0aW9uKHYpeyByZXR1cm4gdjsgfVxuICAsICd7JzogZnVuY3Rpb24odil7XG4gICAgICB2YXIgciA9IHt9O1xuICAgICAgZm9yKHZhciBpID0gMCwgbCA9IHYubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHJbdltpXVswXV0gPSB2W2ldWzFdO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHI7XG4gICAgfVxuICAsICd0eXBlb2YnOiBmdW5jdGlvbih2KXsgcmV0dXJuIHR5cGVvZiB2OyB9XG4gICwgJ25ldyc6IGZ1bmN0aW9uKHYpeyByZXR1cm4gbmV3IHYgfVxuICB9XG4gIFxuLCAnYmluYXJ5Jzoge1xuICAgICcrJzogZnVuY3Rpb24obCwgcikgeyByZXR1cm4gbCArIHI7IH1cbiAgLCAnLSc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgLSByOyB9XG4gICwgJyonOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsICogcjsgfVxuICAsICcvJzogZnVuY3Rpb24obCwgcikgeyByZXR1cm4gbCAvIHI7IH1cbiAgLCAnJSc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgJSByOyB9XG4gICwgJzwnOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsIDwgcjsgfVxuICAsICc+JzogZnVuY3Rpb24obCwgcikgeyByZXR1cm4gbCA+IHI7IH1cbiAgLCAnPD0nOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsIDw9IHI7IH1cbiAgLCAnPj0nOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsID49IHI7IH1cbiAgLCAnPT0nOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsID09IHI7IH1cbiAgLCAnIT0nOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsICE9IHI7IH1cbiAgLCAnPT09JzogZnVuY3Rpb24obCwgcikgeyByZXR1cm4gbCA9PT0gcjsgfVxuICAsICchPT0nOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsICE9PSByOyB9XG4gICwgJyYmJzogZnVuY3Rpb24obCwgcikgeyByZXR1cm4gbCAmJiByOyB9XG4gICwgJ3x8JzogZnVuY3Rpb24obCwgcikgeyByZXR1cm4gbCB8fCByOyB9XG4gICAgXG4gICwgJy4nOiBmdW5jdGlvbihsLCByKSB7XG4gICAgICBpZihyKXtcbiAgICAgICAgcGF0aCA9IHBhdGggKyAnLicgKyByO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGxbcl07XG4gICAgfVxuICAsICdbJzogZnVuY3Rpb24obCwgcikge1xuICAgICAgaWYocil7XG4gICAgICAgIHBhdGggPSBwYXRoICsgJy4nICsgcjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBsW3JdO1xuICAgIH1cbiAgLCAnKCc6IGZ1bmN0aW9uKGwsIHIpeyByZXR1cm4gbC5hcHBseShudWxsLCByKSB9XG4gICAgXG4gICwgJ3wnOiBmdW5jdGlvbihsLCByKXsgcmV0dXJuIHIuY2FsbChudWxsLCBsKSB9Ly9maWx0ZXIuIG5hbWV8ZmlsdGVyXG4gICwgJ2luJzogZnVuY3Rpb24obCwgcil7XG4gICAgICBpZih0aGlzLmFzc2lnbm1lbnQpIHtcbiAgICAgICAgLy9yZXBlYXRcbiAgICAgICAgZGVsZXRlIHN1bW1hcnkubG9jYWxzW2xdO1xuICAgICAgICBzdW1tYXJ5LmFzc2lnbm1lbnRzW2xdID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIHI7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgcmV0dXJuIGwgaW4gcjtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgXG4sICd0ZXJuYXJ5Jzoge1xuICAgICc/JzogZnVuY3Rpb24oZiwgcywgdCkgeyByZXR1cm4gZiA/IHMgOiB0OyB9XG4gICwgJygnOiBmdW5jdGlvbihmLCBzLCB0KSB7IHJldHVybiBmW3NdLmFwcGx5KGYsIHQpIH1cbiAgXG4gIC8vZmlsdGVyLiBuYW1lIHwgZmlsdGVyIDogYXJnMiA6IGFyZzNcbiAgLCAnfCc6IGZ1bmN0aW9uKGYsIHMsIHQpeyByZXR1cm4gcy5hcHBseShudWxsLCBbZl0uY29uY2F0KHQpKTsgfVxuICB9XG59O1xuXG52YXIgYXJnTmFtZSA9IFsnZmlyc3QnLCAnc2Vjb25kJywgJ3RoaXJkJ11cbiAgLCBjb250ZXh0LCBzdW1tYXJ5XG4gICwgcGF0aFxuICA7XG5cbi8v6YGN5Y6GIGFzdFxudmFyIGV2YWx1YXRlID0gZnVuY3Rpb24odHJlZSkge1xuICB2YXIgYXJpdHkgPSB0cmVlLmFyaXR5XG4gICAgLCB2YWx1ZSA9IHRyZWUudmFsdWVcbiAgICAsIGFyZ3MgPSBbXVxuICAgICwgbiA9IDBcbiAgICAsIGFyZ1xuICAgICwgcmVzXG4gICAgO1xuICBcbiAgLy/mk43kvZznrKbmnIDlpJrlj6rmnInkuInlhYNcbiAgZm9yKDsgbiA8IDM7IG4rKyl7XG4gICAgYXJnID0gdHJlZVthcmdOYW1lW25dXTtcbiAgICBpZihhcmcpe1xuICAgICAgaWYoQXJyYXkuaXNBcnJheShhcmcpKXtcbiAgICAgICAgYXJnc1tuXSA9IFtdO1xuICAgICAgICBmb3IodmFyIGkgPSAwLCBsID0gYXJnLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICAgICAgYXJnc1tuXS5wdXNoKHR5cGVvZiBhcmdbaV0ua2V5ID09PSAndW5kZWZpbmVkJyA/IFxuICAgICAgICAgICAgZXZhbHVhdGUoYXJnW2ldKSA6IFthcmdbaV0ua2V5LCBldmFsdWF0ZShhcmdbaV0pXSk7XG4gICAgICAgIH1cbiAgICAgIH1lbHNle1xuICAgICAgICBhcmdzW25dID0gZXZhbHVhdGUoYXJnKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgXG4gIGlmKGFyaXR5ICE9PSAnbGl0ZXJhbCcpIHtcbiAgICBpZihwYXRoICYmIHZhbHVlICE9PSAnLicgJiYgdmFsdWUgIT09ICdbJykge1xuICAgICAgc3VtbWFyeS5wYXRoc1twYXRoXSA9IHRydWU7XG4gICAgfVxuICAgIGlmKGFyaXR5ID09PSAnbmFtZScpIHtcbiAgICAgIHBhdGggPSB2YWx1ZTtcbiAgICB9XG4gIH1cbiAgXG4gIHN3aXRjaChhcml0eSl7XG4gICAgY2FzZSAndW5hcnknOiBcbiAgICBjYXNlICdiaW5hcnknOlxuICAgIGNhc2UgJ3Rlcm5hcnknOlxuICAgICAgdHJ5e1xuICAgICAgICByZXMgPSBnZXRPcGVyYXRvcihhcml0eSwgdmFsdWUpLmFwcGx5KHRyZWUsIGFyZ3MpO1xuICAgICAgfWNhdGNoKGUpe1xuICAgICAgICAvL2NvbnNvbGUuZGVidWcoZSk7XG4gICAgICB9XG4gICAgYnJlYWs7XG4gICAgY2FzZSAnbGl0ZXJhbCc6XG4gICAgICByZXMgPSB2YWx1ZTtcbiAgICBicmVhaztcbiAgICBjYXNlICduYW1lJzpcbiAgICAgIHN1bW1hcnkubG9jYWxzW3ZhbHVlXSA9IHRydWU7XG4gICAgICByZXMgPSBjb250ZXh0LmxvY2Fsc1t2YWx1ZV07XG4gICAgYnJlYWs7XG4gICAgY2FzZSAnZmlsdGVyJzpcbiAgICAgIHN1bW1hcnkuZmlsdGVyc1t2YWx1ZV0gPSB0cnVlO1xuICAgICAgcmVzID0gY29udGV4dC5maWx0ZXJzW3ZhbHVlXTtcbiAgICBicmVhaztcbiAgICBjYXNlICd0aGlzJzpcbiAgICAgIHJlcyA9IGNvbnRleHQubG9jYWxzO1xuICAgIGJyZWFrO1xuICB9XG4gIHJldHVybiByZXM7XG59O1xuXG5mdW5jdGlvbiBnZXRPcGVyYXRvcihhcml0eSwgdmFsdWUpe1xuICByZXR1cm4gb3BlcmF0b3JzW2FyaXR5XVt2YWx1ZV0gfHwgZnVuY3Rpb24oKSB7IHJldHVybjsgfVxufVxuXG5mdW5jdGlvbiByZXNldChfY29udGV4dCkge1xuICBpZihfY29udGV4dCkge1xuICAgIGNvbnRleHQgPSB7bG9jYWxzOiBfY29udGV4dC5sb2NhbHMgfHwge30sIGZpbHRlcnM6IF9jb250ZXh0LmZpbHRlcnMgfHwge319O1xuICB9ZWxzZXtcbiAgICBjb250ZXh0ID0ge2ZpbHRlcnM6IHt9LCBsb2NhbHM6IHt9fTtcbiAgfVxuICBcbiAgc3VtbWFyeSA9IHtmaWx0ZXJzOiB7fSwgbG9jYWxzOiB7fSwgcGF0aHM6IHt9LCBhc3NpZ25tZW50czoge319O1xuICBwYXRoID0gJyc7XG59XG5cbi8v6KGo6L6+5byP5rGC5YC8XG4vL3RyZWU6IHBhcnNlciDnlJ/miJDnmoQgYXN0XG4vL2NvbnRleHQ6IOihqOi+vuW8j+aJp+ihjOeahOeOr+Wig1xuLy9jb250ZXh0LmxvY2Fsczog5Y+Y6YePXG4vL2NvbnRleHQuZmlsdGVyczog6L+H5ruk5Zmo5Ye95pWwXG5leHBvcnRzLmV2YWwgPSBmdW5jdGlvbih0cmVlLCBfY29udGV4dCkge1xuICByZXNldChfY29udGV4dCB8fCB7fSk7XG4gIFxuICByZXR1cm4gZXZhbHVhdGUodHJlZSk7XG59O1xuXG4vL+ihqOi+vuW8j+aRmOimgVxuZXhwb3J0cy5zdW1tYXJ5ID0gZnVuY3Rpb24odHJlZSkge1xuICByZXNldCgpO1xuICBcbiAgZXZhbHVhdGUodHJlZSk7XG4gIFxuICBpZihwYXRoKSB7XG4gICAgc3VtbWFyeS5wYXRoc1twYXRoXSA9IHRydWU7XG4gIH1cbiAgZm9yKHZhciBrZXkgaW4gc3VtbWFyeSkge1xuICAgIHN1bW1hcnlba2V5XSA9IE9iamVjdC5rZXlzKHN1bW1hcnlba2V5XSk7XG4gIH1cbiAgcmV0dXJuIHN1bW1hcnk7XG59OyIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxudmFyIEV2ZW50ID0ge1xuICAvL+ebkeWQrOiHquWumuS5ieS6i+S7ti5cbiAgb246IGZ1bmN0aW9uKG5hbWUsIGhhbmRsZXIsIGNvbnRleHQpIHtcbiAgICB2YXIgY3R4ID0gY29udGV4dCB8fCB0aGlzXG4gICAgICA7XG4gICAgICBcbiAgICBjdHguX2hhbmRsZXJzID0gY3R4Ll9oYW5kbGVycyB8fCB7fTtcbiAgICBjdHguX2hhbmRsZXJzW25hbWVdID0gY3R4Ll9oYW5kbGVyc1tuYW1lXSB8fCBbXTtcbiAgICBcbiAgICBjdHguX2hhbmRsZXJzW25hbWVdLnB1c2goe2hhbmRsZXI6IGhhbmRsZXIsIGNvbnRleHQ6IGNvbnRleHQsIGN0eDogY3R4fSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIC8v56e76Zmk55uR5ZCs5LqL5Lu2LlxuICBvZmY6IGZ1bmN0aW9uKG5hbWUsIGhhbmRsZXIsIGNvbnRleHQpIHtcbiAgICB2YXIgY3R4ID0gY29udGV4dCB8fCB0aGlzXG4gICAgICAsIGhhbmRsZXJzID0gY3R4Ll9oYW5kbGVyc1xuICAgICAgO1xuICAgICAgXG4gICAgaWYobmFtZSAmJiBoYW5kbGVyc1tuYW1lXSl7XG4gICAgICBpZih1dGlscy5pc0Z1bmN0aW9uKGhhbmRsZXIpKXtcbiAgICAgICAgZm9yKHZhciBpID0gaGFuZGxlcnNbbmFtZV0ubGVuZ3RoIC0gMTsgaSA+PTA7IGktLSkge1xuICAgICAgICAgIGlmKGhhbmRsZXJzW25hbWVdW2ldLmhhbmRsZXIgPT09IGhhbmRsZXIpe1xuICAgICAgICAgICAgaGFuZGxlcnNbbmFtZV0uc3BsaWNlKGksIDEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfWVsc2V7XG4gICAgICAgIGhhbmRsZXJzW25hbWVdID0gW107XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICAvL+inpuWPkeiHquWumuS5ieS6i+S7ti4gXG4gIC8v6K+l5pa55rOV5rKh5pyJ5o+Q5L6b6Z2Z5oCB5YyW55qEIGNvbnRleHQg5Y+C5pWwLiDlpoLopoHpnZnmgIHljJbkvb/nlKgsIOW6lOivpTogYEV2ZW50LnRyaWdnZXIuY2FsbChjb250ZXh0LCBuYW1lLCBkYXRhKWBcbiAgdHJpZ2dlcjogZnVuY3Rpb24obmFtZSwgZGF0YSkge1xuICAgIHZhciB0aGF0ID0gdGhpc1xuICAgICAgLCBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpXG4gICAgICAsIGhhbmRsZXJzID0gdGhhdC5faGFuZGxlcnNcbiAgICAgIDtcbiAgICAgIFxuICAgIGlmKGhhbmRsZXJzICYmIGhhbmRsZXJzW25hbWVdKXtcbiAgICAgIGhhbmRsZXJzW25hbWVdLmZvckVhY2goZnVuY3Rpb24oZSkge1xuICAgICAgICBlLmhhbmRsZXIuYXBwbHkodGhhdCwgYXJncylcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFdmVudDsiLCJcInVzZSBzdHJpY3RcIjtcbi8vSmF2YXNjcmlwdCBleHByZXNzaW9uIHBhcnNlciBtb2RpZmllZCBmb3JtIENyb2NrZm9yZCdzIFRET1AgcGFyc2VyXG52YXIgY3JlYXRlID0gT2JqZWN0LmNyZWF0ZSB8fCBmdW5jdGlvbiAobykge1xuICBmdW5jdGlvbiBGKCkge31cbiAgRi5wcm90b3R5cGUgPSBvO1xuICByZXR1cm4gbmV3IEYoKTtcbn07XG5cbnZhciBlcnJvciA9IGZ1bmN0aW9uIChtZXNzYWdlLCB0KSB7XG4gICAgdCA9IHQgfHwgdGhpcztcbiAgICB0Lm5hbWUgPSBcIlN5bnRheEVycm9yXCI7XG4gICAgdC5tZXNzYWdlID0gbWVzc2FnZTtcbiAgICB0aHJvdyB0O1xufTtcblxudmFyIG5vb3AgPSBmdW5jdGlvbigpIHt9O1xuXG52YXIgdG9rZW5pemUgPSBmdW5jdGlvbiAoY29kZSwgcHJlZml4LCBzdWZmaXgpIHtcbiAgICB2YXIgYzsgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIGN1cnJlbnQgY2hhcmFjdGVyLlxuICAgIHZhciBmcm9tOyAgICAgICAgICAgICAgICAgICAvLyBUaGUgaW5kZXggb2YgdGhlIHN0YXJ0IG9mIHRoZSB0b2tlbi5cbiAgICB2YXIgaSA9IDA7ICAgICAgICAgICAgICAgICAgLy8gVGhlIGluZGV4IG9mIHRoZSBjdXJyZW50IGNoYXJhY3Rlci5cbiAgICB2YXIgbGVuZ3RoID0gY29kZS5sZW5ndGg7XG4gICAgdmFyIG47ICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZSBudW1iZXIgdmFsdWUuXG4gICAgdmFyIHE7ICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZSBxdW90ZSBjaGFyYWN0ZXIuXG4gICAgdmFyIHN0cjsgICAgICAgICAgICAgICAgICAgIC8vIFRoZSBzdHJpbmcgdmFsdWUuXG5cbiAgICB2YXIgcmVzdWx0ID0gW107ICAgICAgICAgICAgLy8gQW4gYXJyYXkgdG8gaG9sZCB0aGUgcmVzdWx0cy5cblxuICAgIC8vIE1ha2UgYSB0b2tlbiBvYmplY3QuXG4gICAgdmFyIG1ha2UgPSBmdW5jdGlvbiAodHlwZSwgdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICBmcm9tOiBmcm9tLFxuICAgICAgICAgICAgdG86IGlcbiAgICAgICAgfTtcbiAgICB9O1xuXG4vLyBCZWdpbiB0b2tlbml6YXRpb24uIElmIHRoZSBzb3VyY2Ugc3RyaW5nIGlzIGVtcHR5LCByZXR1cm4gbm90aGluZy5cblxuICAgIGlmICghY29kZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4vLyBJZiBwcmVmaXggYW5kIHN1ZmZpeCBzdHJpbmdzIGFyZSBub3QgcHJvdmlkZWQsIHN1cHBseSBkZWZhdWx0cy5cblxuICAgIGlmICh0eXBlb2YgcHJlZml4ICE9PSAnc3RyaW5nJykge1xuICAgICAgICBwcmVmaXggPSAnPD4rLSYnO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHN1ZmZpeCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgc3VmZml4ID0gJz0+JjonO1xuICAgIH1cblxuXG4vLyBMb29wIHRocm91Z2ggY29kZSB0ZXh0LCBvbmUgY2hhcmFjdGVyIGF0IGEgdGltZS5cblxuICAgIGMgPSBjb2RlLmNoYXJBdChpKTtcbiAgICB3aGlsZSAoYykge1xuICAgICAgICBmcm9tID0gaTtcbiAgICAgICAgXG4gICAgICAgIGlmIChjIDw9ICcgJykgey8vIElnbm9yZSB3aGl0ZXNwYWNlLlxuICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgYyA9IGNvZGUuY2hhckF0KGkpO1xuICAgICAgICB9IGVsc2UgaWYgKChjID49ICdhJyAmJiBjIDw9ICd6JykgfHwgKGMgPj0gJ0EnICYmIGMgPD0gJ1onKSB8fCBjID09PSAnJCcgfHwgYyA9PT0gJ18nKSB7Ly8gbmFtZS5cbiAgICAgICAgICAgIHN0ciA9IGM7XG4gICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICBmb3IgKDs7KSB7XG4gICAgICAgICAgICAgICAgYyA9IGNvZGUuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgIGlmICgoYyA+PSAnYScgJiYgYyA8PSAneicpIHx8IChjID49ICdBJyAmJiBjIDw9ICdaJykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIChjID49ICcwJyAmJiBjIDw9ICc5JykgfHwgYyA9PT0gJ18nKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0ciArPSBjO1xuICAgICAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzdWx0LnB1c2gobWFrZSgnbmFtZScsIHN0cikpO1xuICAgICAgICB9IGVsc2UgaWYgKGMgPj0gJzAnICYmIGMgPD0gJzknKSB7XG4gICAgICAgIC8vIG51bWJlci5cblxuICAgICAgICAvLyBBIG51bWJlciBjYW5ub3Qgc3RhcnQgd2l0aCBhIGRlY2ltYWwgcG9pbnQuIEl0IG11c3Qgc3RhcnQgd2l0aCBhIGRpZ2l0LFxuICAgICAgICAvLyBwb3NzaWJseSAnMCcuXG4gICAgICAgICAgICBzdHIgPSBjO1xuICAgICAgICAgICAgaSArPSAxO1xuXG4vLyBMb29rIGZvciBtb3JlIGRpZ2l0cy5cblxuICAgICAgICAgICAgZm9yICg7Oykge1xuICAgICAgICAgICAgICAgIGMgPSBjb2RlLmNoYXJBdChpKTtcbiAgICAgICAgICAgICAgICBpZiAoYyA8ICcwJyB8fCBjID4gJzknKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICAgICAgc3RyICs9IGM7XG4gICAgICAgICAgICB9XG5cbi8vIExvb2sgZm9yIGEgZGVjaW1hbCBmcmFjdGlvbiBwYXJ0LlxuXG4gICAgICAgICAgICBpZiAoYyA9PT0gJy4nKSB7XG4gICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgICAgIHN0ciArPSBjO1xuICAgICAgICAgICAgICAgIGZvciAoOzspIHtcbiAgICAgICAgICAgICAgICAgICAgYyA9IGNvZGUuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYyA8ICcwJyB8fCBjID4gJzknKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIHN0ciArPSBjO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuLy8gTG9vayBmb3IgYW4gZXhwb25lbnQgcGFydC5cblxuICAgICAgICAgICAgaWYgKGMgPT09ICdlJyB8fCBjID09PSAnRScpIHtcbiAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICAgICAgc3RyICs9IGM7XG4gICAgICAgICAgICAgICAgYyA9IGNvZGUuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgIGlmIChjID09PSAnLScgfHwgYyA9PT0gJysnKSB7XG4gICAgICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgc3RyICs9IGM7XG4gICAgICAgICAgICAgICAgICAgIGMgPSBjb2RlLmNoYXJBdChpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGMgPCAnMCcgfHwgYyA+ICc5Jykge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcihcIkJhZCBleHBvbmVudFwiLCBtYWtlKCdudW1iZXInLCBzdHIpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIHN0ciArPSBjO1xuICAgICAgICAgICAgICAgICAgICBjID0gY29kZS5jaGFyQXQoaSk7XG4gICAgICAgICAgICAgICAgfSB3aGlsZSAoYyA+PSAnMCcgJiYgYyA8PSAnOScpO1xuICAgICAgICAgICAgfVxuXG4vLyBNYWtlIHN1cmUgdGhlIG5leHQgY2hhcmFjdGVyIGlzIG5vdCBhIGxldHRlci5cblxuICAgICAgICAgICAgaWYgKGMgPj0gJ2EnICYmIGMgPD0gJ3onKSB7XG4gICAgICAgICAgICAgICAgc3RyICs9IGM7XG4gICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgICAgIGVycm9yKFwiQmFkIG51bWJlclwiLCBtYWtlKCdudW1iZXInLCBzdHIpKTtcbiAgICAgICAgICAgIH1cblxuLy8gQ29udmVydCB0aGUgc3RyaW5nIHZhbHVlIHRvIGEgbnVtYmVyLiBJZiBpdCBpcyBmaW5pdGUsIHRoZW4gaXQgaXMgYSBnb29kXG4vLyB0b2tlbi5cblxuICAgICAgICAgICAgbiA9ICtzdHI7XG4gICAgICAgICAgICBpZiAoaXNGaW5pdGUobikpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaChtYWtlKCdudW1iZXInLCBuKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGVycm9yKFwiQmFkIG51bWJlclwiLCBtYWtlKCdudW1iZXInLCBzdHIpKTtcbiAgICAgICAgICAgIH1cblxuLy8gc3RyaW5nXG5cbiAgICAgICAgfSBlbHNlIGlmIChjID09PSAnXFwnJyB8fCBjID09PSAnXCInKSB7XG4gICAgICAgICAgICBzdHIgPSAnJztcbiAgICAgICAgICAgIHEgPSBjO1xuICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgZm9yICg7Oykge1xuICAgICAgICAgICAgICAgIGMgPSBjb2RlLmNoYXJBdChpKTtcbiAgICAgICAgICAgICAgICBpZiAoYyA8ICcgJykge1xuICAgICAgICAgICAgICAgICAgICBtYWtlKCdzdHJpbmcnLCBzdHIpO1xuICAgICAgICAgICAgICAgICAgICBlcnJvcihjID09PSAnXFxuJyB8fCBjID09PSAnXFxyJyB8fCBjID09PSAnJyA/XG4gICAgICAgICAgICAgICAgICAgICAgICBcIlVudGVybWluYXRlZCBzdHJpbmcuXCIgOlxuICAgICAgICAgICAgICAgICAgICAgICAgXCJDb250cm9sIGNoYXJhY3RlciBpbiBzdHJpbmcuXCIsIG1ha2UoJycsIHN0cikpO1xuICAgICAgICAgICAgICAgIH1cblxuLy8gTG9vayBmb3IgdGhlIGNsb3NpbmcgcXVvdGUuXG5cbiAgICAgICAgICAgICAgICBpZiAoYyA9PT0gcSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG5cbi8vIExvb2sgZm9yIGVzY2FwZW1lbnQuXG5cbiAgICAgICAgICAgICAgICBpZiAoYyA9PT0gJ1xcXFwnKSB7XG4gICAgICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgZXJyb3IoXCJVbnRlcm1pbmF0ZWQgc3RyaW5nXCIsIG1ha2UoJ3N0cmluZycsIHN0cikpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGMgPSBjb2RlLmNoYXJBdChpKTtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChjKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2InOlxuICAgICAgICAgICAgICAgICAgICAgICAgYyA9ICdcXGInO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2YnOlxuICAgICAgICAgICAgICAgICAgICAgICAgYyA9ICdcXGYnO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ24nOlxuICAgICAgICAgICAgICAgICAgICAgICAgYyA9ICdcXG4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3InOlxuICAgICAgICAgICAgICAgICAgICAgICAgYyA9ICdcXHInO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3QnOlxuICAgICAgICAgICAgICAgICAgICAgICAgYyA9ICdcXHQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3UnOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGkgPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcihcIlVudGVybWluYXRlZCBzdHJpbmdcIiwgbWFrZSgnc3RyaW5nJywgc3RyKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjID0gcGFyc2VJbnQoY29kZS5zdWJzdHIoaSArIDEsIDQpLCAxNik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzRmluaXRlKGMpIHx8IGMgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcihcIlVudGVybWluYXRlZCBzdHJpbmdcIiwgbWFrZSgnc3RyaW5nJywgc3RyKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjID0gU3RyaW5nLmZyb21DaGFyQ29kZShjKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGkgKz0gNDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN0ciArPSBjO1xuICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKG1ha2UoJ3N0cmluZycsIHN0cikpO1xuICAgICAgICAgICAgYyA9IGNvZGUuY2hhckF0KGkpO1xuXG4vLyBjb21tZW50LlxuXG4gICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJy8nICYmIGNvZGUuY2hhckF0KGkgKyAxKSA9PT0gJy8nKSB7XG4gICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICBmb3IgKDs7KSB7XG4gICAgICAgICAgICAgICAgYyA9IGNvZGUuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgIGlmIChjID09PSAnXFxuJyB8fCBjID09PSAnXFxyJyB8fCBjID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgfVxuXG4vLyBjb21iaW5pbmdcblxuICAgICAgICB9IGVsc2UgaWYgKHByZWZpeC5pbmRleE9mKGMpID49IDApIHtcbiAgICAgICAgICAgIHN0ciA9IGM7XG4gICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgICAgIGMgPSBjb2RlLmNoYXJBdChpKTtcbiAgICAgICAgICAgICAgICBpZiAoaSA+PSBsZW5ndGggfHwgc3VmZml4LmluZGV4T2YoYykgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdHIgKz0gYztcbiAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXN1bHQucHVzaChtYWtlKCdvcGVyYXRvcicsIHN0cikpO1xuXG4vLyBzaW5nbGUtY2hhcmFjdGVyIG9wZXJhdG9yXG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKG1ha2UoJ29wZXJhdG9yJywgYykpO1xuICAgICAgICAgICAgYyA9IGNvZGUuY2hhckF0KGkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5cbnZhciBtYWtlX3BhcnNlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzeW1ib2xfdGFibGUgPSB7fTtcbiAgICB2YXIgdG9rZW47XG4gICAgdmFyIHRva2VucztcbiAgICB2YXIgdG9rZW5fbnI7XG4gICAgdmFyIGNvbnRleHQ7XG4gICAgXG4gICAgdmFyIGl0c2VsZiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIHZhciBmaW5kID0gZnVuY3Rpb24gKG4pIHtcbiAgICAgIG4ubnVkICAgICAgPSBpdHNlbGY7XG4gICAgICBuLmxlZCAgICAgID0gbnVsbDtcbiAgICAgIG4uc3RkICAgICAgPSBudWxsO1xuICAgICAgbi5sYnAgICAgICA9IDA7XG4gICAgICByZXR1cm4gbjtcbiAgICB9O1xuXG4gICAgdmFyIGFkdmFuY2UgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgdmFyIGEsIG8sIHQsIHY7XG4gICAgICAgIGlmIChpZCAmJiB0b2tlbi5pZCAhPT0gaWQpIHtcbiAgICAgICAgICAgIGVycm9yKFwiRXhwZWN0ZWQgJ1wiICsgaWQgKyBcIicuXCIsIHRva2VuKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodG9rZW5fbnIgPj0gdG9rZW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgdG9rZW4gPSBzeW1ib2xfdGFibGVbXCIoZW5kKVwiXTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0ID0gdG9rZW5zW3Rva2VuX25yXTtcbiAgICAgICAgdG9rZW5fbnIgKz0gMTtcbiAgICAgICAgdiA9IHQudmFsdWU7XG4gICAgICAgIGEgPSB0LnR5cGU7XG4gICAgICAgIGlmICgoYSA9PT0gXCJvcGVyYXRvclwiIHx8IGEgIT09ICdzdHJpbmcnKSAmJiB2IGluIHN5bWJvbF90YWJsZSkge1xuICAgICAgICAgICAgLy90cnVlLCBmYWxzZSDnrYnnm7TmjqXph4/kuZ/kvJrov5vlhaXmraTliIbmlK9cbiAgICAgICAgICAgIG8gPSBzeW1ib2xfdGFibGVbdl07XG4gICAgICAgICAgICBpZiAoIW8pIHtcbiAgICAgICAgICAgICAgICBlcnJvcihcIlVua25vd24gb3BlcmF0b3IuXCIsIHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGEgPT09IFwibmFtZVwiKSB7XG4gICAgICAgICAgICBvID0gZmluZCh0KTtcbiAgICAgICAgfSBlbHNlIGlmIChhID09PSBcInN0cmluZ1wiIHx8IGEgPT09ICBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICBvID0gc3ltYm9sX3RhYmxlW1wiKGxpdGVyYWwpXCJdO1xuICAgICAgICAgICAgYSA9IFwibGl0ZXJhbFwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXJyb3IoXCJVbmV4cGVjdGVkIHRva2VuLlwiLCB0KTtcbiAgICAgICAgfVxuICAgICAgICB0b2tlbiA9IGNyZWF0ZShvKTtcbiAgICAgICAgdG9rZW4uZnJvbSAgPSB0LmZyb207XG4gICAgICAgIHRva2VuLnRvICAgID0gdC50bztcbiAgICAgICAgdG9rZW4udmFsdWUgPSB2O1xuICAgICAgICB0b2tlbi5hcml0eSA9IGE7XG4gICAgICAgIHJldHVybiB0b2tlbjtcbiAgICB9O1xuXG4gICAgdmFyIGV4cHJlc3Npb24gPSBmdW5jdGlvbiAocmJwKSB7XG4gICAgICAgIHZhciBsZWZ0O1xuICAgICAgICB2YXIgdCA9IHRva2VuO1xuICAgICAgICBhZHZhbmNlKCk7XG4gICAgICAgIGxlZnQgPSB0Lm51ZCgpO1xuICAgICAgICB3aGlsZSAocmJwIDwgdG9rZW4ubGJwKSB7XG4gICAgICAgICAgICB0ID0gdG9rZW47XG4gICAgICAgICAgICBhZHZhbmNlKCk7XG4gICAgICAgICAgICBsZWZ0ID0gdC5sZWQobGVmdCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxlZnQ7XG4gICAgfTtcblxuICAgIHZhciBvcmlnaW5hbF9zeW1ib2wgPSB7XG4gICAgICAgIG51ZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZXJyb3IoXCJVbmRlZmluZWQuXCIsIHRoaXMpO1xuICAgICAgICB9LFxuICAgICAgICBsZWQ6IGZ1bmN0aW9uIChsZWZ0KSB7XG4gICAgICAgICAgICBlcnJvcihcIk1pc3Npbmcgb3BlcmF0b3IuXCIsIHRoaXMpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBzeW1ib2wgPSBmdW5jdGlvbiAoaWQsIGJwKSB7XG4gICAgICAgIHZhciBzID0gc3ltYm9sX3RhYmxlW2lkXTtcbiAgICAgICAgYnAgPSBicCB8fCAwO1xuICAgICAgICBpZiAocykge1xuICAgICAgICAgICAgaWYgKGJwID49IHMubGJwKSB7XG4gICAgICAgICAgICAgICAgcy5sYnAgPSBicDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHMgPSBjcmVhdGUob3JpZ2luYWxfc3ltYm9sKTtcbiAgICAgICAgICAgIHMuaWQgPSBzLnZhbHVlID0gaWQ7XG4gICAgICAgICAgICBzLmxicCA9IGJwO1xuICAgICAgICAgICAgc3ltYm9sX3RhYmxlW2lkXSA9IHM7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHM7XG4gICAgfTtcblxuICAgIHZhciBjb25zdGFudCA9IGZ1bmN0aW9uIChzLCB2LCBhKSB7XG4gICAgICAgIHZhciB4ID0gc3ltYm9sKHMpO1xuICAgICAgICB4Lm51ZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSBzeW1ib2xfdGFibGVbdGhpcy5pZF0udmFsdWU7XG4gICAgICAgICAgICB0aGlzLmFyaXR5ID0gXCJsaXRlcmFsXCI7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfTtcbiAgICAgICAgeC52YWx1ZSA9IHY7XG4gICAgICAgIHJldHVybiB4O1xuICAgIH07XG4gICAgXG4gICAgdmFyIGluZml4ID0gZnVuY3Rpb24gKGlkLCBicCwgbGVkKSB7XG4gICAgICAgIHZhciBzID0gc3ltYm9sKGlkLCBicCk7XG4gICAgICAgIHMubGVkID0gbGVkIHx8IGZ1bmN0aW9uIChsZWZ0KSB7XG4gICAgICAgICAgICB0aGlzLmZpcnN0ID0gbGVmdDtcbiAgICAgICAgICAgIHRoaXMuc2Vjb25kID0gZXhwcmVzc2lvbihicCk7XG4gICAgICAgICAgICB0aGlzLmFyaXR5ID0gXCJiaW5hcnlcIjtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gcztcbiAgICB9O1xuXG4gICAgdmFyIGluZml4ciA9IGZ1bmN0aW9uIChpZCwgYnAsIGxlZCkge1xuICAgICAgICB2YXIgcyA9IHN5bWJvbChpZCwgYnApO1xuICAgICAgICBzLmxlZCA9IGxlZCB8fCBmdW5jdGlvbiAobGVmdCkge1xuICAgICAgICAgICAgdGhpcy5maXJzdCA9IGxlZnQ7XG4gICAgICAgICAgICB0aGlzLnNlY29uZCA9IGV4cHJlc3Npb24oYnAgLSAxKTtcbiAgICAgICAgICAgIHRoaXMuYXJpdHkgPSBcImJpbmFyeVwiO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBzO1xuICAgIH07XG5cbiAgICB2YXIgcHJlZml4ID0gZnVuY3Rpb24gKGlkLCBudWQpIHtcbiAgICAgICAgdmFyIHMgPSBzeW1ib2woaWQpO1xuICAgICAgICBzLm51ZCA9IG51ZCB8fCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmZpcnN0ID0gZXhwcmVzc2lvbig3MCk7XG4gICAgICAgICAgICB0aGlzLmFyaXR5ID0gXCJ1bmFyeVwiO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBzO1xuICAgIH07XG5cbiAgICBzeW1ib2woXCIoZW5kKVwiKTtcbiAgICBzeW1ib2woXCIobmFtZSlcIik7XG4gICAgc3ltYm9sKFwiOlwiKTtcbiAgICBzeW1ib2woXCIpXCIpO1xuICAgIHN5bWJvbChcIl1cIik7XG4gICAgc3ltYm9sKFwifVwiKTtcbiAgICBzeW1ib2woXCIsXCIpO1xuXG4gICAgY29uc3RhbnQoXCJ0cnVlXCIsIHRydWUpO1xuICAgIGNvbnN0YW50KFwiZmFsc2VcIiwgZmFsc2UpO1xuICAgIGNvbnN0YW50KFwibnVsbFwiLCBudWxsKTtcbiAgICBcbiAgICBjb25zdGFudChcIk1hdGhcIiwgTWF0aCk7XG4gICAgY29uc3RhbnQoXCJEYXRlXCIsIERhdGUpO1xuXG4gICAgc3ltYm9sKFwiKGxpdGVyYWwpXCIpLm51ZCA9IGl0c2VsZjtcblxuICAgIC8vIHN5bWJvbChcInRoaXNcIikubnVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyB0aGlzLmFyaXR5ID0gXCJ0aGlzXCI7XG4gICAgICAgIC8vIHJldHVybiB0aGlzO1xuICAgIC8vIH07XG5cbiAgICAvL09wZXJhdG9yIFByZWNlZGVuY2U6XG4gICAgLy9odHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9PcGVyYXRvcnMvT3BlcmF0b3JfUHJlY2VkZW5jZVxuXG4gICAgaW5maXgoXCI/XCIsIDIwLCBmdW5jdGlvbiAobGVmdCkge1xuICAgICAgICB0aGlzLmZpcnN0ID0gbGVmdDtcbiAgICAgICAgdGhpcy5zZWNvbmQgPSBleHByZXNzaW9uKDApO1xuICAgICAgICBhZHZhbmNlKFwiOlwiKTtcbiAgICAgICAgdGhpcy50aGlyZCA9IGV4cHJlc3Npb24oMCk7XG4gICAgICAgIHRoaXMuYXJpdHkgPSBcInRlcm5hcnlcIjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSk7XG4gICAgXG4gICAgaW5maXhyKFwiJiZcIiwgMzEpO1xuICAgIGluZml4cihcInx8XCIsIDMwKTtcblxuICAgIGluZml4cihcIj09PVwiLCA0MCk7XG4gICAgaW5maXhyKFwiIT09XCIsIDQwKTtcblxuICAgIGluZml4cihcIj09XCIsIDQwKTtcbiAgICBpbmZpeHIoXCIhPVwiLCA0MCk7XG5cbiAgICBpbmZpeHIoXCI8XCIsIDQwKTtcbiAgICBpbmZpeHIoXCI8PVwiLCA0MCk7XG4gICAgaW5maXhyKFwiPlwiLCA0MCk7XG4gICAgaW5maXhyKFwiPj1cIiwgNDApO1xuICAgIFxuICAgIGluZml4KFwiaW5cIiwgNDUsIGZ1bmN0aW9uIChsZWZ0KSB7XG4gICAgICAgIHRoaXMuZmlyc3QgPSBsZWZ0O1xuICAgICAgICB0aGlzLnNlY29uZCA9IGV4cHJlc3Npb24oMCk7XG4gICAgICAgIHRoaXMuYXJpdHkgPSBcImJpbmFyeVwiO1xuICAgICAgICBpZihjb250ZXh0ID09PSAncmVwZWF0Jyl7XG4gICAgICAgICAgLy8gYGluYCBhdCByZXBlYXQgYmxvY2tcbiAgICAgICAgICB0aGlzLmFzc2lnbm1lbnQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0pO1xuXG4gICAgaW5maXgoXCIrXCIsIDUwKTtcbiAgICBpbmZpeChcIi1cIiwgNTApO1xuXG4gICAgaW5maXgoXCIqXCIsIDYwKTtcbiAgICBpbmZpeChcIi9cIiwgNjApO1xuICAgIGluZml4KFwiJVwiLCA2MCk7XG5cbiAgICBpbmZpeChcIi5cIiwgODAsIGZ1bmN0aW9uIChsZWZ0KSB7XG4gICAgICAgIHRoaXMuZmlyc3QgPSBsZWZ0O1xuICAgICAgICBpZiAodG9rZW4uYXJpdHkgIT09IFwibmFtZVwiKSB7XG4gICAgICAgICAgICBlcnJvcihcIkV4cGVjdGVkIGEgcHJvcGVydHkgbmFtZS5cIiwgdG9rZW4pO1xuICAgICAgICB9XG4gICAgICAgIHRva2VuLmFyaXR5ID0gXCJsaXRlcmFsXCI7XG4gICAgICAgIHRoaXMuc2Vjb25kID0gdG9rZW47XG4gICAgICAgIHRoaXMuYXJpdHkgPSBcImJpbmFyeVwiO1xuICAgICAgICBhZHZhbmNlKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0pO1xuXG4gICAgaW5maXgoXCJbXCIsIDgwLCBmdW5jdGlvbiAobGVmdCkge1xuICAgICAgICB0aGlzLmZpcnN0ID0gbGVmdDtcbiAgICAgICAgdGhpcy5zZWNvbmQgPSBleHByZXNzaW9uKDApO1xuICAgICAgICB0aGlzLmFyaXR5ID0gXCJiaW5hcnlcIjtcbiAgICAgICAgYWR2YW5jZShcIl1cIik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0pO1xuXG4gICAgaW5maXgoXCIoXCIsIDgwLCBmdW5jdGlvbiAobGVmdCkge1xuICAgICAgICB2YXIgYSA9IFtdO1xuICAgICAgICBpZiAobGVmdC5pZCA9PT0gXCIuXCIgfHwgbGVmdC5pZCA9PT0gXCJbXCIpIHtcbiAgICAgICAgICAgIHRoaXMuYXJpdHkgPSBcInRlcm5hcnlcIjtcbiAgICAgICAgICAgIHRoaXMuZmlyc3QgPSBsZWZ0LmZpcnN0O1xuICAgICAgICAgICAgdGhpcy5zZWNvbmQgPSBsZWZ0LnNlY29uZDtcbiAgICAgICAgICAgIHRoaXMudGhpcmQgPSBhO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5hcml0eSA9IFwiYmluYXJ5XCI7XG4gICAgICAgICAgICB0aGlzLmZpcnN0ID0gbGVmdDtcbiAgICAgICAgICAgIHRoaXMuc2Vjb25kID0gYTtcbiAgICAgICAgICAgIGlmICgobGVmdC5hcml0eSAhPT0gXCJ1bmFyeVwiIHx8IGxlZnQuaWQgIT09IFwiZnVuY3Rpb25cIikgJiZcbiAgICAgICAgICAgICAgICAgICAgbGVmdC5hcml0eSAhPT0gXCJuYW1lXCIgJiYgbGVmdC5hcml0eSAhPT0gXCJsaXRlcmFsXCIgJiYgbGVmdC5pZCAhPT0gXCIoXCIgJiZcbiAgICAgICAgICAgICAgICAgICAgbGVmdC5pZCAhPT0gXCImJlwiICYmIGxlZnQuaWQgIT09IFwifHxcIiAmJiBsZWZ0LmlkICE9PSBcIj9cIikge1xuICAgICAgICAgICAgICAgIGVycm9yKFwiRXhwZWN0ZWQgYSB2YXJpYWJsZSBuYW1lLlwiLCBsZWZ0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodG9rZW4uaWQgIT09IFwiKVwiKSB7XG4gICAgICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgICAgIGEucHVzaChleHByZXNzaW9uKDApKTtcbiAgICAgICAgICAgICAgICBpZiAodG9rZW4uaWQgIT09IFwiLFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhZHZhbmNlKFwiLFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBhZHZhbmNlKFwiKVwiKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSk7XG5cbiAgICAvL2ZpbHRlclxuICAgIGluZml4KFwifFwiLCAxMCwgZnVuY3Rpb24obGVmdCkge1xuICAgICAgdmFyIGE7XG4gICAgICB0aGlzLmZpcnN0ID0gbGVmdDtcbiAgICAgIHRva2VuLmFyaXR5ID0gJ2ZpbHRlcic7XG4gICAgICB0aGlzLnNlY29uZCA9IGV4cHJlc3Npb24oMTApO1xuICAgICAgdGhpcy5hcml0eSA9ICdiaW5hcnknO1xuICAgICAgaWYodG9rZW4uaWQgPT09ICc6Jyl7XG4gICAgICAgIHRoaXMuYXJpdHkgPSAndGVybmFyeSc7XG4gICAgICAgIHRoaXMudGhpcmQgPSBhID0gW107XG4gICAgICAgIHdoaWxlKHRydWUpe1xuICAgICAgICAgIGFkdmFuY2UoJzonKTtcbiAgICAgICAgICBhLnB1c2goZXhwcmVzc2lvbigwKSk7XG4gICAgICAgICAgaWYodG9rZW4uaWQgIT09IFwiOlwiKXtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSk7XG4gICAgXG5cbiAgICBwcmVmaXgoXCIhXCIpO1xuICAgIHByZWZpeChcIi1cIik7XG4gICAgcHJlZml4KFwidHlwZW9mXCIpO1xuXG4gICAgcHJlZml4KFwiKFwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBlID0gZXhwcmVzc2lvbigwKTtcbiAgICAgICAgYWR2YW5jZShcIilcIik7XG4gICAgICAgIHJldHVybiBlO1xuICAgIH0pO1xuXG4gICAgcHJlZml4KFwiW1wiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBhID0gW107XG4gICAgICAgIGlmICh0b2tlbi5pZCAhPT0gXCJdXCIpIHtcbiAgICAgICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICAgICAgYS5wdXNoKGV4cHJlc3Npb24oMCkpO1xuICAgICAgICAgICAgICAgIGlmICh0b2tlbi5pZCAhPT0gXCIsXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFkdmFuY2UoXCIsXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGFkdmFuY2UoXCJdXCIpO1xuICAgICAgICB0aGlzLmZpcnN0ID0gYTtcbiAgICAgICAgdGhpcy5hcml0eSA9IFwidW5hcnlcIjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSk7XG5cbiAgICBwcmVmaXgoXCJ7XCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGEgPSBbXSwgbiwgdjtcbiAgICAgICAgaWYgKHRva2VuLmlkICE9PSBcIn1cIikge1xuICAgICAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgICAgICBuID0gdG9rZW47XG4gICAgICAgICAgICAgICAgaWYgKG4uYXJpdHkgIT09IFwibmFtZVwiICYmIG4uYXJpdHkgIT09IFwibGl0ZXJhbFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yKFwiQmFkIHByb3BlcnR5IG5hbWUuXCIsIHRva2VuKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYWR2YW5jZSgpO1xuICAgICAgICAgICAgICAgIGFkdmFuY2UoXCI6XCIpO1xuICAgICAgICAgICAgICAgIHYgPSBleHByZXNzaW9uKDApO1xuICAgICAgICAgICAgICAgIHYua2V5ID0gbi52YWx1ZTtcbiAgICAgICAgICAgICAgICBhLnB1c2godik7XG4gICAgICAgICAgICAgICAgaWYgKHRva2VuLmlkICE9PSBcIixcIikge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYWR2YW5jZShcIixcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYWR2YW5jZShcIn1cIik7XG4gICAgICAgIHRoaXMuZmlyc3QgPSBhO1xuICAgICAgICB0aGlzLmFyaXR5ID0gXCJ1bmFyeVwiO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9KTtcblxuICAgIC8vX3NvdXJjZTog6KGo6L6+5byP5Luj56CB5a2X56ym5LiyXG4gICAgLy9fY29udGV4dDog6KGo6L6+5byP55qE6K+t5Y+l546v5aKDXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChfc291cmNlLCBfY29udGV4dCkge1xuICAgICAgICB0b2tlbnMgPSB0b2tlbml6ZShfc291cmNlLCAnPTw+ISstKiZ8LyVeJywgJz08PiZ8Jyk7XG4gICAgICAgIHRva2VuX25yID0gMDtcbiAgICAgICAgY29udGV4dCA9IF9jb250ZXh0O1xuICAgICAgICBhZHZhbmNlKCk7XG4gICAgICAgIHZhciBzID0gZXhwcmVzc2lvbigwKTtcbiAgICAgICAgYWR2YW5jZShcIihlbmQpXCIpO1xuICAgICAgICByZXR1cm4gcztcbiAgICB9O1xufTtcblxuZXhwb3J0cy5wYXJzZSA9IG1ha2VfcGFyc2UoKTsiLCJ2YXIgdG9rZW5SZWcgPSAve3soeyhbXn1cXG5dKyl9fFtefVxcbl0rKX19L2c7XG52YXIgYXR0clBvc3RSZWcgPSAvXFw/JC87XG5cbi8v5a2X56ym5Liy5Lit5piv5ZCm5YyF5ZCr5qih5p2/5Y2g5L2N56ym5qCH6K6wXG5mdW5jdGlvbiBoYXNUb2tlbihzdHIpIHtcbiAgdG9rZW5SZWcubGFzdEluZGV4ID0gMDtcbiAgcmV0dXJuIHN0ciAmJiB0b2tlblJlZy50ZXN0KHN0cik7XG59XG5cbmZ1bmN0aW9uIHBhcnNlVG9rZW4obm9kZSwgcGFyc2VOb2RlTmFtZSkge1xuICB2YXIgdG9rZW5zID0gW11cbiAgICAsIHRleHRNYXAgPSBbXVxuICAgICwgc3RhcnQgPSAwXG4gICAgLCB2YWx1ZSA9IG5vZGUubm9kZVZhbHVlXG4gICAgLCBub2RlTmFtZSA9IG5vZGUubm9kZU5hbWVcbiAgICAsIGNvbmRpQXR0ciwgaXNBdHRyTmFtZVxuICAgICwgdmFsLCB0b2tlblxuICAgIDtcbiAgXG4gIC8vIGlmKG5vZGUubm9kZVR5cGUgPT09IE5PREVUWVBFLkFUVFIpe1xuICAgIC8vIC8vYXR0cmlidXRlIHdpdGggcHJlZml4LlxuICAgIC8vIGlmKG5vZGVOYW1lLmluZGV4T2YocHJlZml4KSA9PT0gMCAmJiAhaXNBbnRBdHRyKG5vZGVOYW1lKSl7XG4gICAgICAvLyBub2RlTmFtZSA9IG5vZGUubm9kZU5hbWUuc2xpY2UocHJlZml4Lmxlbmd0aCk7XG4gICAgLy8gfVxuICAgIFxuICAgIC8vIGlmKGF0dHJQb3N0UmVnLnRlc3Qobm9kZU5hbWUpKXtcbiAgICAgIC8vIC8vYXR0cmlidXRlIHdpdGggcG9zdGZpeFxuICAgICAgLy8gLy9hdHRyPz17e2NvbmRpdGlvbn19XG4gICAgICAvLyBub2RlTmFtZSA9IG5vZGVOYW1lLnNsaWNlKDAsIG5vZGVOYW1lLmxlbmd0aCAtIDEpO1xuICAgICAgLy8gY29uZGlBdHRyID0gdHJ1ZTtcbiAgICAvLyB9XG4gICAgLy8gaWYocGFyc2VOb2RlTmFtZSl7XG4gICAgICAvLyB2YWx1ZSA9IG5vZGVOYW1lOy8v5bGe5oCn5ZCNXG4gICAgICAvLyBpc0F0dHJOYW1lID0gdHJ1ZTtcbiAgICAvLyB9XG4gIC8vIH1cbiAgXG4gIHRva2VuUmVnLmxhc3RJbmRleCA9IDA7XG4gIFxuICB3aGlsZSgodmFsID0gdG9rZW5SZWcuZXhlYyh2YWx1ZSkpKXtcbiAgICBpZih0b2tlblJlZy5sYXN0SW5kZXggLSBzdGFydCA+IHZhbFswXS5sZW5ndGgpe1xuICAgICAgdGV4dE1hcC5wdXNoKHZhbHVlLnNsaWNlKHN0YXJ0LCB0b2tlblJlZy5sYXN0SW5kZXggLSB2YWxbMF0ubGVuZ3RoKSk7XG4gICAgfVxuICAgIFxuICAgIHRva2VuID0ge1xuICAgICAgZXNjYXBlOiAhdmFsWzJdXG4gICAgLCBwYXRoOiAodmFsWzJdIHx8IHZhbFsxXSkudHJpbSgpXG4gICAgLCBwb3NpdGlvbjogdGV4dE1hcC5sZW5ndGhcbiAgICAsIG5vZGU6IG5vZGVcbiAgICAsIG5vZGVOYW1lOiBub2RlTmFtZVxuICAgICwgdGV4dE1hcDogdGV4dE1hcFxuICAgIH07XG4gICAgaWYoY29uZGlBdHRyKXsgdG9rZW4uY29uZGlBdHRyID0gdHJ1ZTsgfVxuICAgIGlmKGlzQXR0ck5hbWUpeyB0b2tlbi5pc0F0dHJOYW1lID0gdHJ1ZTsgfVxuICAgIFxuICAgIHRva2Vucy5wdXNoKHRva2VuKTtcbiAgICBcbiAgICAvL+S4gOS4quW8leeUqOexu+WeiyjmlbDnu4Qp5L2c5Li66IqC54K55a+56LGh55qE5paH5pys5Zu+LCDov5nmoLflvZPmn5DkuIDkuKrlvJXnlKjmlLnlj5jkuobkuIDkuKrlgLzlkI4sIOWFtuS7luW8leeUqOWPluW+l+eahOWAvOmDveS8muWQjOaXtuabtOaWsFxuICAgIHRleHRNYXAucHVzaCh2YWxbMF0pO1xuICAgIFxuICAgIHN0YXJ0ID0gdG9rZW5SZWcubGFzdEluZGV4O1xuICB9XG4gIFxuICBpZih2YWx1ZS5sZW5ndGggPiBzdGFydCl7XG4gICAgdGV4dE1hcC5wdXNoKHZhbHVlLnNsaWNlKHN0YXJ0LCB2YWx1ZS5sZW5ndGgpKTtcbiAgfVxuICBcbiAgdG9rZW5zLnRleHRNYXAgPSB0ZXh0TWFwO1xuICBcbiAgcmV0dXJuIHRva2Vucztcbn1cblxuZXhwb3J0cy5oYXNUb2tlbiA9IGhhc1Rva2VuO1xuXG5leHBvcnRzLnBhcnNlVG9rZW4gPSBwYXJzZVRva2VuOyIsIlwidXNlIHN0cmljdFwiO1xuXG4vL3V0aWxzXG4vLy0tLVxuXG52YXIgZG9jID0gcmVxdWlyZSgnLi9kb2N1bWVudC5qcycpO1xuXG52YXIga2V5UGF0aFJlZyA9IC8oPzpcXC58XFxbKS9nXG4gICwgYnJhID0gL1xcXS9nXG4gIDtcblxuLy9wYXRoLmtleSwgcGF0aFtrZXldIC0tPiBbJ3BhdGgnLCAna2V5J11cbmZ1bmN0aW9uIHBhcnNlS2V5UGF0aChrZXlQYXRoKXtcbiAgcmV0dXJuIGtleVBhdGgucmVwbGFjZShicmEsICcnKS5zcGxpdChrZXlQYXRoUmVnKTtcbn1cblxuLyoqXG4gKiDlkIjlubblr7nosaFcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW2RlZXA9ZmFsc2VdIOaYr+WQpua3seW6puWQiOW5tlxuICogQHBhcmFtIHtPYmplY3R9IHRhcmdldCDnm67moIflr7nosaFcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb2JqZWN0Li4uXSDmnaXmupDlr7nosaFcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10g55So5LqO6Ieq5a6a5LmJ5ZCI5bm255qE5Zue6LCDXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn0g5ZCI5bm25ZCO55qEIHRhcmdldCDlr7nosaFcbiAqL1xuZnVuY3Rpb24gZXh0ZW5kKC8qIGRlZXAsIHRhcmdldCwgb2JqZWN0Li4uLCBjYWxsbGJhY2sgKi8pIHtcbiAgdmFyIG9wdGlvbnNcbiAgICAsIG5hbWUsIHNyYywgY29weSwgY29weUlzQXJyYXksIGNsb25lXG4gICAgLCB0YXJnZXQgPSBhcmd1bWVudHNbMF0gfHwge31cbiAgICAsIGkgPSAxXG4gICAgLCBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoXG4gICAgLCBkZWVwID0gZmFsc2VcbiAgICAsIGNhbGxiYWNrXG4gICAgO1xuXG4gIC8vIEhhbmRsZSBhIGRlZXAgY29weSBzaXR1YXRpb25cbiAgaWYgKHR5cGVvZiB0YXJnZXQgPT09IFwiYm9vbGVhblwiKSB7XG4gICAgZGVlcCA9IHRhcmdldDtcblxuICAgIC8vIHNraXAgdGhlIGJvb2xlYW4gYW5kIHRoZSB0YXJnZXRcbiAgICB0YXJnZXQgPSBhcmd1bWVudHNbIGkgXSB8fCB7fTtcbiAgICBpKys7XG4gIH1cbiAgXG4gIGlmKHV0aWxzLmlzRnVuY3Rpb24oYXJndW1lbnRzW2xlbmd0aCAtIDFdKSkge1xuICAgIGNhbGxiYWNrID0gYXJndW1lbnRzW2xlbmd0aCAtIDFdO1xuICAgIGxlbmd0aC0tO1xuICB9XG5cbiAgLy8gSGFuZGxlIGNhc2Ugd2hlbiB0YXJnZXQgaXMgYSBzdHJpbmcgb3Igc29tZXRoaW5nIChwb3NzaWJsZSBpbiBkZWVwIGNvcHkpXG4gIGlmICh0eXBlb2YgdGFyZ2V0ICE9PSBcIm9iamVjdFwiICYmICF1dGlscy5pc0Z1bmN0aW9uKHRhcmdldCkpIHtcbiAgICB0YXJnZXQgPSB7fTtcbiAgfVxuXG4gIGZvciAoIDsgaSA8IGxlbmd0aDsgaSsrICkge1xuICAgIC8vIE9ubHkgZGVhbCB3aXRoIG5vbi1udWxsL3VuZGVmaW5lZCB2YWx1ZXNcbiAgICBpZiAoIChvcHRpb25zID0gYXJndW1lbnRzWyBpIF0pICE9IG51bGwgKSB7XG4gICAgICAvLyBFeHRlbmQgdGhlIGJhc2Ugb2JqZWN0XG4gICAgICBmb3IgKCBuYW1lIGluIG9wdGlvbnMgKSB7XG4gICAgICAgIC8vYW5kcm9pZCAyLjMgYnJvd3NlciBjYW4gZW51bSB0aGUgcHJvdG90eXBlIG9mIGNvbnN0cnVjdG9yLi4uXG4gICAgICAgIGlmKG9wdGlvbnMuaGFzT3duUHJvcGVydHkobmFtZSkgJiYgbmFtZSAhPT0gJ3Byb3RvdHlwZScpe1xuICAgICAgICAgIHNyYyA9IHRhcmdldFsgbmFtZSBdO1xuICAgICAgICAgIGNvcHkgPSBvcHRpb25zWyBuYW1lIF07XG4gICAgICAgICAgXG5cbiAgICAgICAgICAvLyBSZWN1cnNlIGlmIHdlJ3JlIG1lcmdpbmcgcGxhaW4gb2JqZWN0cyBvciBhcnJheXNcbiAgICAgICAgICBpZiAoIGRlZXAgJiYgY29weSAmJiAoIHV0aWxzLmlzUGxhaW5PYmplY3QoY29weSkgfHwgKGNvcHlJc0FycmF5ID0gdXRpbHMuaXNBcnJheShjb3B5KSkgKSApIHtcbiAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFByZXZlbnQgbmV2ZXItZW5kaW5nIGxvb3BcbiAgICAgICAgICAgIGlmICggdGFyZ2V0ID09PSBjb3B5ICkge1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICggY29weUlzQXJyYXkgKSB7XG4gICAgICAgICAgICAgIGNvcHlJc0FycmF5ID0gZmFsc2U7XG4gICAgICAgICAgICAgIGNsb25lID0gc3JjICYmIHV0aWxzLmlzQXJyYXkoc3JjKSA/IHNyYyA6IFtdO1xuXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjbG9uZSA9IHNyYyAmJiB1dGlscy5pc1BsYWluT2JqZWN0KHNyYykgPyBzcmMgOiB7fTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYoY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgY29weSA9IGNhbGxiYWNrKGNsb25lLCBjb3B5LCBuYW1lKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTmV2ZXIgbW92ZSBvcmlnaW5hbCBvYmplY3RzLCBjbG9uZSB0aGVtXG4gICAgICAgICAgICB0YXJnZXRbIG5hbWUgXSA9IGV4dGVuZCggZGVlcCwgY2xvbmUsIGNvcHksIGNhbGxiYWNrKTtcblxuICAgICAgICAgICAgLy8gRG9uJ3QgYnJpbmcgaW4gdW5kZWZpbmVkIHZhbHVlc1xuICAgICAgICAgIH0gZWxzZSBpZiAoICF1dGlscy5pc1VuZGVmaW5lZChjb3B5KSApIHtcblxuICAgICAgICAgICAgaWYoY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgY29weSA9IGNhbGxiYWNrKHNyYywgY29weSwgbmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0YXJnZXRbIG5hbWUgXSA9IGNvcHk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gUmV0dXJuIHRoZSBtb2RpZmllZCBvYmplY3RcbiAgcmV0dXJuIHRhcmdldDtcbn1cblxuXG5mdW5jdGlvbiB0cGxQYXJzZSh0cGwsIHRhcmdldCkge1xuICB2YXIgZWw7XG4gIGlmKHV0aWxzLmlzT2JqZWN0KHRwbCkpe1xuICAgIGlmKHRhcmdldCl7XG4gICAgICBlbCA9IHRhcmdldCA9IHV0aWxzLmlzT2JqZWN0KHRhcmdldCkgPyB0YXJnZXQgOiBkb2MuY3JlYXRlRWxlbWVudCh0YXJnZXQpO1xuICAgICAgZWwuaW5uZXJIVE1MID0gJyc7Ly/muIXnqbrnm67moIflr7nosaFcbiAgICAgIHRhcmdldC5hcHBlbmRDaGlsZCh0cGwpO1xuICAgIH1lbHNle1xuICAgICAgZWwgPSB0cGw7XG4gICAgfVxuICAgIHRwbCA9IGVsLm91dGVySFRNTDtcbiAgfWVsc2V7XG4gICAgZWwgPSB1dGlscy5pc09iamVjdCh0YXJnZXQpID8gdGFyZ2V0IDogZG9jLmNyZWF0ZUVsZW1lbnQodGFyZ2V0IHx8ICdkaXYnKTtcbiAgICBlbC5pbm5lckhUTUwgPSB0cGw7XG4gIH1cbiAgcmV0dXJuIHtlbDogZWwsIHRwbDogdHBsfTtcbn1cblxuIFxudmFyIHV0aWxzID0ge1xuICBub29wOiBmdW5jdGlvbiAoKXt9XG4sIGllOiAhIWRvYy5hdHRhY2hFdmVudFxuXG4sIGlzT2JqZWN0OiBmdW5jdGlvbiAodmFsKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWwgPT09ICdvYmplY3QnICYmIHZhbCAhPT0gbnVsbDtcbiAgfVxuXG4sIGlzVW5kZWZpbmVkOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWwgPT09ICd1bmRlZmluZWQnO1xuICB9XG5cbiwgaXNGdW5jdGlvbjogZnVuY3Rpb24gKHZhbCl7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWwgPT09ICdmdW5jdGlvbic7XG4gIH1cblxuLCBpc0FycmF5OiBmdW5jdGlvbiAodmFsKSB7XG4gICAgaWYodXRpbHMuaWUpe1xuICAgICAgLy9JRSA5IOWPiuS7peS4iyBJRSDot6jnqpflj6Pmo4DmtYvmlbDnu4RcbiAgICAgIHJldHVybiB2YWwgJiYgdmFsLmNvbnN0cnVjdG9yICsgJycgPT09IEFycmF5ICsgJyc7XG4gICAgfWVsc2V7XG4gICAgICByZXR1cm4gQXJyYXkuaXNBcnJheSh2YWwpO1xuICAgIH1cbiAgfVxuXG4gIC8v566A5Y2V5a+56LGh55qE566A5piT5Yik5patXG4sIGlzUGxhaW5PYmplY3Q6IGZ1bmN0aW9uIChvKXtcbiAgICBpZiAoIW8gfHwgKHt9KS50b1N0cmluZy5jYWxsKG8pICE9PSAnW29iamVjdCBPYmplY3RdJyB8fCBvLm5vZGVUeXBlIHx8IG8gPT09IG8ud2luZG93KSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfWVsc2V7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICAvL+WHveaVsOWIh+mdoi4gb3JpRm4g5Y6f5aeL5Ye95pWwLCBmbiDliIfpnaLooaXlhYXlh73mlbBcbiAgLy/liY3pnaLnmoTlh73mlbDov5Tlm57lgLzkvKDlhaUgYnJlYWtDaGVjayDliKTmlq0sIGJyZWFrQ2hlY2sg6L+U5Zue5YC85Li655yf5pe25LiN5omn6KGM5YiH6Z2i6KGl5YWF55qE5Ye95pWwXG4sIGJlZm9yZUZuOiBmdW5jdGlvbiAob3JpRm4sIGZuLCBicmVha0NoZWNrKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHJldCA9IGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICBpZihicmVha0NoZWNrICYmIGJyZWFrQ2hlY2suY2FsbCh0aGlzLCByZXQpKXtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvcmlGbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH1cblxuLCBhZnRlckZuOiBmdW5jdGlvbiAob3JpRm4sIGZuLCBicmVha0NoZWNrKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHJldCA9IG9yaUZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICBpZihicmVha0NoZWNrICYmIGJyZWFrQ2hlY2suY2FsbCh0aGlzLCByZXQpKXtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgIH1cbiAgICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICByZXR1cm4gcmV0O1xuICAgIH1cbiAgfVxuICBcbiwgcGFyc2VLZXlQYXRoOiBwYXJzZUtleVBhdGhcblxuLCBkZWVwU2V0OiBmdW5jdGlvbiAoa2V5U3RyLCB2YWx1ZSwgb2JqKSB7XG4gICAgaWYoa2V5U3RyKXtcbiAgICAgIHZhciBjaGFpbiA9IHBhcnNlS2V5UGF0aChrZXlTdHIpXG4gICAgICAgICwgY3VyID0gb2JqXG4gICAgICAgIDtcbiAgICAgIGNoYWluLmZvckVhY2goZnVuY3Rpb24oa2V5LCBpKSB7XG4gICAgICAgIGlmKGkgPT09IGNoYWluLmxlbmd0aCAtIDEpe1xuICAgICAgICAgIGN1cltrZXldID0gdmFsdWU7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgIGlmKGN1ciAmJiBjdXIuaGFzT3duUHJvcGVydHkoa2V5KSl7XG4gICAgICAgICAgICBjdXIgPSBjdXJba2V5XTtcbiAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgIGN1cltrZXldID0ge307XG4gICAgICAgICAgICBjdXIgPSBjdXJba2V5XTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1lbHNle1xuICAgICAgZXh0ZW5kKG9iaiwgdmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9XG4sIGRlZXBHZXQ6IGZ1bmN0aW9uIChrZXlTdHIsIG9iaikge1xuICAgIHZhciBjaGFpbiwgY3VyID0gb2JqLCBrZXk7XG4gICAgaWYoa2V5U3RyKXtcbiAgICAgIGNoYWluID0gcGFyc2VLZXlQYXRoKGtleVN0cik7XG4gICAgICBmb3IodmFyIGkgPSAwLCBsID0gY2hhaW4ubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGtleSA9IGNoYWluW2ldO1xuICAgICAgICBpZihjdXIgJiYgY3VyLmhhc093blByb3BlcnR5KGtleSkpe1xuICAgICAgICAgIGN1ciA9IGN1cltrZXldO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGN1cjtcbiAgfVxuLCBleHRlbmQ6IGV4dGVuZFxuLCB0cGxQYXJzZTogdHBsUGFyc2Vcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gdXRpbHM7Il19
(1)
});
