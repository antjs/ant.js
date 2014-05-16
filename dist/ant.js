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
     
      //对于 terminal 为 true 的 directive, 在解析完其相同权重的 directive 后中断遍历该元素
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
  }
  
  function checkText(node, vm) {
    if(token.hasToken(node.nodeValue)) {
      var tokens = token.parseToken(node.nodeValue)
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
        dirs.push(extend(dir, {el: el, node: attr, nodeName: attrName, path: attr.value}));
      }
    }
    dirs.sort(function(d0, d1) {
      return d0.priority - d1.priority;
    });
    return dirs;
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
        new Watcher(vm, extend(dir, token));
      });
    }else{
      new Watcher(vm, dir);
    }
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
  , tearDown: utils.noop
  }, opts);
}

},{"./utils.js":12}],4:[function(_dereq_,module,exports){
"use strict";

var attrPostReg = /\?$/;

module.exports = {
  init: function() {
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
      if(this.conditionalAttr) {
        val ? setAttr(this.el, this.dirName, val) : this.el.removeAttribute(this.dirName);
      }else{
        this.textMap[this.position] = val && (val + '');
        setAttr(this.el, this.dirName, this.textMap.join(''));
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
  init: function() {
    var parent = this.parent = this.el.parentNode;
    this.anchor = doc.createComment(this.type + ' = ' + this.path)
    parent.insertBefore(this.anchor, this.el);
    parent.removeChild(this.el);
  }
, update: function(val) {
    if(val) {
      if(!this.state) { this.parent.insertBefore(this.el, this.anchor); }
    }else{
      if(this.state) { this.parent.removeChild(this.el); }
    }
    this.state = val;
  }
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
},{"./document.js":7}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJFOlxcanVzdGFuXFxEcm9wYm94XFxjb2RlXFxhbnQuanNcXG5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwiRTovanVzdGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL2FudC5qcyIsIkU6L2p1c3Rhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy9jbGFzcy5qcyIsIkU6L2p1c3Rhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy9kaXJlY3RpdmUuanMiLCJFOi9qdXN0YW4vRHJvcGJveC9jb2RlL2FudC5qcy9zcmMvZGlyZWN0aXZlcy9hdHRyLmpzIiwiRTovanVzdGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL2RpcmVjdGl2ZXMvaW5kZXguanMiLCJFOi9qdXN0YW4vRHJvcGJveC9jb2RlL2FudC5qcy9zcmMvZGlyZWN0aXZlcy9tb2RlbC5qcyIsIkU6L2p1c3Rhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy9kb2N1bWVudC5qcyIsIkU6L2p1c3Rhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy9ldmFsLmpzIiwiRTovanVzdGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL2V2ZW50LmpzIiwiRTovanVzdGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL3BhcnNlLmpzIiwiRTovanVzdGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL3Rva2VuLmpzIiwiRTovanVzdGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeGdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNobEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgZG9jID0gcmVxdWlyZSgnLi9kb2N1bWVudC5qcycpXG4gICwgcGFyc2UgPSByZXF1aXJlKCcuL3BhcnNlLmpzJykucGFyc2VcbiAgLCBldmFsdWF0ZSA9IHJlcXVpcmUoJy4vZXZhbC5qcycpXG4gICwgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJylcbiAgLCBFdmVudCA9IHJlcXVpcmUoJy4vZXZlbnQuanMnKVxuICAsIENsYXNzID0gcmVxdWlyZSgnLi9jbGFzcy5qcycpXG4gICwgRGlyID0gcmVxdWlyZSgnLi9kaXJlY3RpdmUuanMnKVxuICAsIGRpcnMgPSByZXF1aXJlKCcuL2RpcmVjdGl2ZXMnKVxuICAsIHRva2VuID0gcmVxdWlyZSgnLi90b2tlbi5qcycpXG4gIDtcblxuXG52YXIgaXNPYmplY3QgPSB1dGlscy5pc09iamVjdFxuICAsIGlzVW5kZWZpbmVkID0gdXRpbHMuaXNVbmRlZmluZWRcbiAgLCBpc0Z1bmN0aW9uID0gdXRpbHMuaXNGdW5jdGlvblxuICAsIGlzQXJyYXkgPSB1dGlscy5pc0FycmF5XG4gICwgaXNQbGFpbk9iamVjdCA9IHV0aWxzLmlzUGxhaW5PYmplY3RcbiAgLCBhZnRlckZuID0gdXRpbHMuYWZ0ZXJGblxuICAsIHBhcnNlS2V5UGF0aCA9IHV0aWxzLnBhcnNlS2V5UGF0aFxuICAsIGRlZXBTZXQgPSB1dGlscy5kZWVwU2V0XG4gICwgZGVlcEdldCA9IHV0aWxzLmRlZXBHZXRcbiAgLCBleHRlbmQgPSB1dGlscy5leHRlbmRcbiAgLCBpZSA9IHV0aWxzLmllXG4gICwgdHBsUGFyc2UgPSB1dGlscy50cGxQYXJzZVxuICAsIGNyZWF0ZSA9IHV0aWxzLmNyZWF0ZVxuICA7XG5cblxuXG4vL+aehOW7uuS/rumlsCBtb2RlbFxuZnVuY3Rpb24gbW9kZWxFeHRlbmQobW9kZWwsIGRhdGEsIHZtKSB7XG4gIGJ1aWxkQXJyYXkobW9kZWwsIHZtKTtcbiAgcmV0dXJuIGV4dGVuZCh0cnVlLCBtb2RlbCwgZGF0YSwgZnVuY3Rpb24oYSwgYiwgbmFtZSkge1xuICAgIHZhciByZXM7XG4gICAgaWYobmFtZSAhPT0gJ19fYW50X18nKSB7XG4gICAgICByZXMgPSBiO1xuICAgIH1cbiAgICBcbiAgICBidWlsZEFycmF5KGEsIHZtKTtcbiAgICBcbiAgICByZXR1cm4gcmVzO1xuICB9KTtcbn1cblxuLy/kv67ppbDmlbDnu4RcbmZ1bmN0aW9uIGJ1aWxkQXJyYXkoYXJyLCB2bSkge1xuICBpZih2bSAmJiBpc0FycmF5KGFycikpe1xuICAgIGFyci5fX2FudF9fID0gdm07XG4gICAgaWYoYXJyLnB1c2ggIT09IGFycmF5TWV0aG9kcy5wdXNoKXtcbiAgICAgIGV4dGVuZChhcnIsIGFycmF5TWV0aG9kcylcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGFycjtcbn1cblxudmFyIHByZWZpeCwgYW50QXR0ciA9IHt9O1xuXG5mdW5jdGlvbiBzZXRQcmVmaXgobmV3UHJlZml4KSB7XG4gIGlmKG5ld1ByZWZpeCl7XG4gICAgcHJlZml4ID0gbmV3UHJlZml4O1xuICAgIGFudEF0dHIuSUYgPSBwcmVmaXggKyAnaWYnO1xuICAgIGFudEF0dHIuUkVQRUFUID0gcHJlZml4ICsgJ3JlcGVhdCc7XG4gICAgYW50QXR0ci5NT0RFTCA9IHByZWZpeCArICdtb2RlbCc7XG4gICAgdGhpcy5wcmVmaXggPSBwcmVmaXg7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNBbnRBdHRyKGF0dHJOYW1lKSB7XG4gIGZvcih2YXIgYXR0ciBpbiBhbnRBdHRyKXtcbiAgICBpZihhbnRBdHRyW2F0dHJdID09PSBhdHRyTmFtZSl7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4gIC8qKlxuICAgKiAjIEFudFxuICAgKiDln7rkuo4gZG9tIOeahOaooeadv+W8leaTji4g5pSv5oyB5pWw5o2u57uR5a6aXG4gICAqIEBwYXJhbSB7U3RyaW5nIHwgRWxlbWVudH0gW3RwbF0g5qih5p2/5bqU6K+l5piv5ZCI5rOV6ICM5LiU5qCH5YeG55qEIEhUTUwg5qCH562+5a2X56ym5Liy5oiW6ICF55u05o6l5piv546w5pyJIERPTSDmoJHkuK3nmoTkuIDkuKogZWxlbWVudCDlr7nosaEuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0c11cbiAgICogQHBhcmFtIHtTdHJpbmcgfCBFbGVtZW50fSBvcHRzLnRwbFxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cy5kYXRhIOa4suafk+aooeadv+eahOaVsOaNri4g6K+l6aG55aaC5p6c5Li656m6LCDnqI3lkI7lj6/ku6XnlKggYHRwbC5yZW5kZXIobW9kZWwpYCDmnaXmuLLmn5PnlJ/miJAgaHRtbC5cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRzLmxhenkg5piv5ZCm5a+5ICdpbnB1dCcg5Y+KICd0ZXh0YXJlYScg55uR5ZCsIGBjaGFuZ2VgIOS6i+S7tiwg6ICM5LiN5pivIGBpbnB1dGAg5LqL5Lu2XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzLmV2ZW50cyBcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMucGFydGlhbHNcbiAgICogQHBhcmFtIHtTdHJpbmcgfCBIVE1MRUxlbWVudH0gb3B0cy5lbFxuICAgKiBAY29uc3RydWN0b3JcbiAgICovXG4gIGZ1bmN0aW9uIEFudCh0cGwsIG9wdHMpIHtcbiAgICBpZihpc1BsYWluT2JqZWN0KHRwbCkpIHtcbiAgICAgIHRwbCA9IG9wdHMudHBsO1xuICAgIH1cbiAgICBvcHRzID0gb3B0cyB8fCB7fTtcbiAgICB2YXIgZWxcbiAgICAgICwgZGVmYXVsdHMgPSB0aGlzLmRlZmF1bHRzIHx8IHt9XG4gICAgICA7XG5cbiAgICBvcHRzID0gZXh0ZW5kKHRydWUsIHt9LCBkZWZhdWx0cywgb3B0cyk7XG5cbiAgICB2YXIgZGF0YSA9IG9wdHMuZGF0YSB8fCB7fVxuICAgICAgLCBldmVudHMgPSBvcHRzLmV2ZW50cyB8fCB7fVxuICAgICAgLCBmaWx0ZXJzID0gb3B0cy5maWx0ZXJzIHx8IHt9XG4gICAgICA7XG4gICAgXG4gICAgZWwgPSB0cGxQYXJzZSh0cGwsIG9wdHMuZWwpO1xuICAgIHRwbCA9IGVsLnRwbDtcbiAgICBlbCA9IGVsLmVsO1xuICAgIFxuICAgIC8v5bGe5oCnXG4gICAgLy8tLS0tXG4gICAgXG4gICAgdGhpcy5vcHRpb25zID0gb3B0cztcbiAgICAvKipcbiAgICAgKiAjIyMgYW50LnRwbFxuICAgICAqIOaooeadv+Wtl+espuS4slxuICAgICAqIEB0eXBlIHtTdHJpbmd9XG4gICAgICovXG4gICAgdGhpcy50cGwgPSB0cGw7XG4gICAgXG4gICAgLyoqXG4gICAgICogIyMjIGFudC5lbFxuICAgICAqIOaooeadvyBET00g5a+56LGhLlxuICAgICAqIEB0eXBlIHtIVE1MRWxlbWVudE9iamVjdH1cbiAgICAgKi9cbiAgICB0aGlzLmVsID0gZWw7XG4gICAgXG4gICAgLyoqXG4gICAgICogIyMjIGFudC5kYXRhXG4gICAgICog57uR5a6a5qih5p2/55qE5pWw5o2uLlxuICAgICAqIEB0eXBlIHtPYmplY3R9IOaVsOaNruWvueixoSwg5LiN5bqU6K+l5piv5pWw57uELlxuICAgICAqL1xuICAgIHRoaXMuZGF0YSA9IHt9O1xuICAgIC8qKlxuICAgICAqICMjIyBhbnQuaXNSZW5kZXJlZFxuICAgICAqIOivpeaooeadv+aYr+WQpuW3sue7j+e7keWumuaVsOaNrlxuICAgICAqIEB0eXBlIHtCb29sZWFufSDlnKjosIPnlKggYHJlbmRlcmAg5pa55rOV5ZCOLCDor6XlsZ7mgKflsIbkuLogYHRydWVgXG4gICAgICovXG4gICAgdGhpcy5pc1JlbmRlcmVkID0gZmFsc2U7XG4gICAgXG4gICAgLy9UT0RPIGN1c3RvbSBiaW5kaW5nXG4gICAgdGhpcy5iaW5kaW5ncyA9ICh0aGlzLmJpbmRpbmdzIHx8IFtdKS5jb25jYXQob3B0cy5iaW5kaW5ncyB8fCBbXSk7XG5cbiAgICB0aGlzLnBhcnRpYWxzID0ge307XG4gICAgdGhpcy5maWx0ZXJzID0ge307XG4gICAgXG4gICAgZm9yKHZhciBldmVudCBpbiBldmVudHMpIHtcbiAgICAgIHRoaXMub24oZXZlbnQsIGV2ZW50c1tldmVudF0pO1xuICAgIH1cblxuICAgIGZvcih2YXIgZmlsdGVyTmFtZSBpbiBmaWx0ZXJzKXtcbiAgICAgIHRoaXMuc2V0RmlsdGVyKGZpbHRlck5hbWUsIGZpbHRlcnNbZmlsdGVyTmFtZV0pO1xuICAgIH1cbiAgICBcbiAgICBidWlsZFZpZXdNb2RlbC5jYWxsKHRoaXMpO1xuICAgIFxuICAgIC8v6L+Z6YeM6ZyA6KaB5ZCI5bm25Y+v6IO95a2Y5Zyo55qEIHRoaXMuZGF0YVxuICAgIC8v6KGo5Y2V5o6n5Lu25Y+v6IO95Lya5pyJ6buY6K6k5YC8LCBgYnVpbGRWaWV3TW9kZWxgIOWQjuS8mum7mOiupOWAvOS8muW5tuWFpSBgdGhpcy5kYXRhYCDkuK1cbiAgICBkYXRhID0gZXh0ZW5kKHRoaXMuZGF0YSwgZGF0YSk7XG4gICAgXG4gICAgaWYob3B0cy5kYXRhKXtcbiAgICAgIHRoaXMucmVuZGVyKGRhdGEpO1xuICAgIH1cbiAgICB0aGlzLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuICBcbiAgLy/pnZnmgIHmlrnms5VcbiAgLy8tLS1cbiAgZXh0ZW5kKEFudCwgQ2xhc3MsIERpciwge1xuICAgIHNldFByZWZpeDogc2V0UHJlZml4XG4gICwgZG9jOiBkb2NcbiAgLCBkaXJlY3RpdmVzOiB7fVxuICAsIHV0aWxzOiB1dGlsc1xuICB9KTtcbiAgXG4gIEFudC5zZXRQcmVmaXgoJ2EtJyk7XG4gIFxuICAvL+WGhee9riBkaXJlY3RpdmVcbiAgZm9yKHZhciBkaXIgaW4gZGlycykge1xuICAgIEFudC5kaXJlY3RpdmUoZGlyLCBkaXJzW2Rpcl0pO1xuICB9XG4gICAgXG4gIC8v5a6e5L6L5pa55rOVXG4gIC8vLS0tLVxuICBleHRlbmQoQW50LnByb3RvdHlwZSwgRXZlbnQsIHtcbiAgICAvKipcbiAgICAgKiAjIyMgYW50LnJlbmRlclxuICAgICAqIOa4suafk+aooeadv1xuICAgICAqL1xuICAgIHJlbmRlcjogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgZGF0YSA9IGRhdGEgfHwgdGhpcy5kYXRhO1xuICAgICAgdGhpcy5zZXQoZGF0YSwge2lzRXh0ZW5kOiBmYWxzZX0pO1xuICAgICAgdGhpcy5pc1JlbmRlcmVkID0gdHJ1ZTtcbiAgICAgIHRoaXMudHJpZ2dlcigncmVuZGVyJyk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogIyMjIGFudC5jbG9uZVxuICAgICAqIOWkjeWItuaooeadv1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0c11cbiAgICAgKiBAcmV0dXJuIHtUZW1wbGF0ZU9iamVjdH0g5LiA5Liq5pawIGBBbnRgIOWunuS+i1xuICAgICAqL1xuICAsIGNsb25lOiBmdW5jdGlvbihvcHRzKSB7XG4gICAgICB2YXIgb3B0aW9ucyA9IGV4dGVuZCh0cnVlLCB7fSwgdGhpcy5vcHRpb25zKTtcbiAgICAgIGlmKG9wdHMgJiYgb3B0cy5kYXRhKXsgb3B0aW9ucy5kYXRhID0gbnVsbDsgfVxuICAgICAgcmV0dXJuIG5ldyB0aGlzLmNvbnN0cnVjdG9yKHRoaXMudHBsLCBleHRlbmQodHJ1ZSwgb3B0aW9ucywgb3B0cykpO1xuICAgIH1cbiAgICBcbiAgLCBnZXQ6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIGRlZXBHZXQoa2V5LCB0aGlzLmRhdGEpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiAjIyMgYW50LnNldFxuICAgICAqIOabtOaWsCBgYW50LmRhdGFgIOS4reeahOaVsOaNrlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBba2V5XSDmlbDmja7ot6/lvoQuIFxuICAgICAqIEBwYXJhbSB7QW55VHlwZXxPYmplY3R9IHZhbCDmlbDmja7lhoXlrrkuIOWmguaenOaVsOaNrui3r+W+hOiiq+ecgeeVpSwg56ys5LiA5Liq5Y+C5pWw5piv5LiA5Liq5a+56LGhLiDpgqPkuYggdmFsIOWwhuabv+aNoiBhbnQuZGF0YSDmiJbogIXlubblhaXlhbbkuK1cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdF0g5Y+C5pWw6aG5XG4gICAgICogQHBhcmFtIHtCb29sZWFufSBvcHQuc2lsZW5jZSDmmK/lkKbpnZnpnZnnmoTmm7TmlrDmlbDmja7ogIzkuI3op6blj5EgYHVwZGF0ZWAg5LqL5Lu25Y+K5pu05pawIERPTS5cbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdC5pc0V4dGVuZCDmlbDmja7orr7nva7nsbvlnosuIOaYr+WQpuWwhuaVsOaNruW5tuWFpeWOn+aVsOaNri4gXG4gICAgICAgICAgICAgIOesrOS4gOS4quWPguaVsOaYr+aVsOaNrui3r+W+hOaYr+ivpeWAvOm7mOiupOS4uiBmYWxzZSwg6ICM56ys5LiA5Liq5pWw5o2u5piv5pWw5o2u5a+56LGh55qE5pe25YCZ5YiZ6buY6K6k5Li6IHRydWVcbiAgICAgKi9cbiAgLCBzZXQ6IGZ1bmN0aW9uKGtleSwgdmFsLCBvcHQpIHtcbiAgICAgIHZhciBjaGFuZ2VkLCBpc0V4dGVuZCwgcGFyZW50LCBrZXlzLCBwYXRoO1xuICAgICAgXG4gICAgICBpZihpc1VuZGVmaW5lZChrZXkpKXsgcmV0dXJuIHRoaXM7IH1cbiAgICAgIFxuICAgICAgaWYoaXNPYmplY3Qoa2V5KSl7XG4gICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgICBvcHQgPSB2YWw7XG4gICAgICAgIG9wdCA9IG9wdCB8fCB7fTtcbiAgICAgICAgaWYob3B0LmlzRXh0ZW5kICE9PSBmYWxzZSl7XG4gICAgICAgICAgaXNFeHRlbmQgPSB0cnVlO1xuICAgICAgICAgIG1vZGVsRXh0ZW5kKHRoaXMuZGF0YSwga2V5LCB0aGlzLl92bSk7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgIGlzRXh0ZW5kID0gZmFsc2U7XG4gICAgICAgICAgdGhpcy5kYXRhID0gbW9kZWxFeHRlbmQoe30sIGtleSwgdGhpcy5fdm0pO1xuICAgICAgICB9XG4gICAgICB9ZWxzZXtcbiAgICAgICAgb3B0ID0gb3B0IHx8IHt9O1xuICAgICAgICBcbiAgICAgICAgaWYoZGVlcEdldChrZXksIHRoaXMuZGF0YSkgIT09IHZhbCkge1xuICAgICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmKGNoYW5nZWQpe1xuICAgICAgICAgIGlmKG9wdC5pc0V4dGVuZCAhPT0gdHJ1ZSl7XG4gICAgICAgICAgICBrZXlzID0gcGFyc2VLZXlQYXRoKGtleSk7XG4gICAgICAgICAgICBpZihrZXlzLmxlbmd0aCA+IDEpe1xuICAgICAgICAgICAgICBwYXRoID0ga2V5cy5wb3AoKTtcbiAgICAgICAgICAgICAgcGFyZW50ID0gZGVlcEdldChrZXlzLmpvaW4oJy4nKSwgdGhpcy5kYXRhKTtcbiAgICAgICAgICAgICAgaWYoaXNVbmRlZmluZWQocGFyZW50KSl7XG4gICAgICAgICAgICAgICAgZGVlcFNldChrZXlzLmpvaW4oJy4nKSwgcGFyZW50ID0ge30sIHRoaXMuZGF0YSk7XG4gICAgICAgICAgICAgIH1lbHNlIGlmKCFpc09iamVjdChwYXJlbnQpKXtcbiAgICAgICAgICAgICAgICB2YXIgb2xkUGFyZW50ID0gcGFyZW50O1xuICAgICAgICAgICAgICAgIGRlZXBTZXQoa2V5cy5qb2luKCcuJyksIHBhcmVudCA9IHt0b1N0cmluZzogZnVuY3Rpb24oKSB7IHJldHVybiBvbGRQYXJlbnQ7IH19LCB0aGlzLmRhdGEpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgaWYoa2V5KXtcbiAgICAgICAgICAgICAgICBwYXJlbnQgPSB0aGlzLmRhdGE7XG4gICAgICAgICAgICAgICAgcGF0aCA9IGtleTtcbiAgICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgcGFyZW50ID0gdGhpcztcbiAgICAgICAgICAgICAgICBwYXRoID0gJ2RhdGEnO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwYXJlbnRbcGF0aF0gPSBpc09iamVjdCh2YWwpID8gbW9kZWxFeHRlbmQoaXNBcnJheSh2YWwpID8gW10gOiB7fSwgdmFsLCB0aGlzLl92bS4kZ2V0Vk0oa2V5LCAhaXNBcnJheSh2YWwpKSkgOiB2YWw7XG4gICAgICAgICAgICBpc0V4dGVuZCA9IGZhbHNlO1xuICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgbW9kZWxFeHRlbmQodGhpcy5kYXRhLCBkZWVwU2V0KGtleSwgdmFsLCB7fSksIHRoaXMuX3ZtKTtcbiAgICAgICAgICAgIGlzRXh0ZW5kID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNoYW5nZWQgJiYgKCFvcHQuc2lsZW5jZSkgJiYgKGlzT2JqZWN0KGtleSkgPyB1cGRhdGUuY2FsbCh0aGlzLCBrZXksIGlzRXh0ZW5kLCBvcHQuaXNCdWJibGUpIDogdXBkYXRlLmNhbGwodGhpcywga2V5LCB2YWwsIGlzRXh0ZW5kLCBvcHQuaXNCdWJibGUpKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiAjIyMgYW50LnNldFBhcnRpYWxcbiAgICAgKiDmt7vliqDlrZDmqKHmnb9cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gaW5mbyDlrZDmqKHmnb/kv6Hmga9cbiAgICAgKiBAcGFyYW0ge1N0cmluZ3xIVE1MRWxlbWVudH0gaW5mby5jb250ZW50IOWtkOaooeadv+WGheWuuVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBbaW5mby5uYW1lXSDlrZDmqKHmnb/moIfnpLrnrKZcbiAgICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fGZ1bmN0aW9ufSBbaW5mby50YXJnZXRdIOWtkOaooeadv+eahOebruagh+iKgueCuVxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gW2luZm8uZXNjYXBlXSDmmK/lkKbovazkuYnlrZfnrKbkuLLlrZDmqKHmnb9cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gW2luZm8ucGF0aF0g5oyH5a6a5a2Q5qih5p2/5Lit5Y+Y6YeP5Zyo5pWw5o2u5Lit55qE5L2c55So5Z+fXG4gICAgICovXG4gICwgc2V0UGFydGlhbDogZnVuY3Rpb24ocGFydGlhbEluZm8pIHtcbiAgICAgIGlmKCFwYXJ0aWFsSW5mbyl7IHJldHVybjsgfVxuICAgICAgXG4gICAgICBwYXJ0aWFsSW5mbyA9IGV4dGVuZCh7fSwgdGhpcy5wYXJ0aWFsc1twYXJ0aWFsSW5mby5uYW1lXSwgcGFydGlhbEluZm8pO1xuICAgICAgXG4gICAgICB2YXIgZWxzLCBfZWxzLCB2bVxuICAgICAgICAsIG5hbWUgPSBwYXJ0aWFsSW5mby5uYW1lXG4gICAgICAgICwgdGFyZ2V0ID0gcGFydGlhbEluZm8udGFyZ2V0XG4gICAgICAgICwgcGFydGlhbCA9IHBhcnRpYWxJbmZvLmNvbnRlbnRcbiAgICAgICAgLCBwYXRoID0gcGFydGlhbEluZm8ucGF0aCB8fCAnJ1xuICAgICAgICA7XG4gICAgICBpZihuYW1lKXtcbiAgICAgICAgdGhpcy5wYXJ0aWFsc1tuYW1lXSA9IHBhcnRpYWxJbmZvO1xuICAgICAgfVxuICAgICAgaWYocGFydGlhbCkge1xuICAgICAgICB2bSA9IHRoaXMuX3ZtLiRnZXRWTShwYXRoKTtcbiAgICAgICAgXG4gICAgICAgIGlmKHR5cGVvZiBwYXJ0aWFsID09PSAnc3RyaW5nJyl7XG4gICAgICAgICAgaWYocGFydGlhbEluZm8uZXNjYXBlKXtcbiAgICAgICAgICAgIGVscyA9IFtkb2MuY3JlYXRlVGV4dE5vZGUocGFydGlhbCldO1xuICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgX2VscyA9IHRwbFBhcnNlKHBhcnRpYWwsICdkaXYnKS5lbC5jaGlsZE5vZGVzO1xuICAgICAgICAgICAgZWxzID0gW107XG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwLCBsID0gX2Vscy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgICAgICAgICBlbHMucHVzaChfZWxzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgIGVscyA9IFsocGFydGlhbCBpbnN0YW5jZW9mIEFudCkgPyBwYXJ0aWFsLmVsIDogcGFydGlhbF07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmKHRhcmdldCl7XG4gICAgICAgICAgZm9yKHZhciBpID0gMCwgbCA9IGVscy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgICAgICAgaXNGdW5jdGlvbih0YXJnZXQpID8gXG4gICAgICAgICAgICAgIHRhcmdldC5jYWxsKHRoaXMsIGVsc1tpXSkgOlxuICAgICAgICAgICAgICB0YXJnZXQuYXBwZW5kQ2hpbGQoZWxzW2ldKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRyYXZlbEVsKGVscywgdm0pO1xuICAgICAgICB0aGlzLmlzUmVuZGVyZWQgJiYgdm0uJHNldChkZWVwR2V0KHBhdGgsIHRoaXMuZGF0YSksIGZhbHNlLCB0cnVlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgLCBpbml0OiB1dGlscy5ub29wXG4gIFxuICAsIHdhdGNoOiBmdW5jdGlvbihrZXlQYXRoLCBjYWxsYmFjaykge1xuICAgICAgaWYoa2V5UGF0aCAmJiBjYWxsYmFjayl7XG4gICAgICAgIG5ldyBXYXRjaGVyKHRoaXMuX3ZtLCB7cGF0aDoga2V5UGF0aH0sIGNhbGxiYWNrKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgLCB1bndhdGNoOiBmdW5jdGlvbihrZXlQYXRoLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHZtID0gdGhpcy5fdm0uJGdldFZNKGtleVBhdGgsIHRydWUpO1xuICAgICAgaWYodm0pe1xuICAgICAgICBmb3IodmFyIGkgPSB2bS4kd2F0Y2hlcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pe1xuICAgICAgICAgIGlmKHZtLiR3YXRjaGVyc1tpXS5jYWxsYmFjayA9PT0gY2FsbGJhY2spe1xuICAgICAgICAgICAgdm0uJHdhdGNoZXJzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBcbiAgICBcbiAgLCBzZXRGaWx0ZXI6IGZ1bmN0aW9uKG5hbWUsIGZpbHRlcikge1xuICAgICAgdGhpcy5maWx0ZXJzW25hbWVdID0gZmlsdGVyLmJpbmQodGhpcyk7XG4gICAgfVxuICAsIGdldEZpbHRlcjogZnVuY3Rpb24obmFtZSkge1xuICAgICAgcmV0dXJuIHRoaXMuZmlsdGVyc1tuYW1lXVxuICAgIH1cbiAgLCByZW1vdmVGaWx0ZXI6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLmZpbHRlcnNbbmFtZV07XG4gICAgfVxuICB9KTtcbiAgXG4gIC8qKlxuICAgKiDmm7TmlrDmqKHmnb8uIFxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSDopoHmm7TmlrDnmoTmlbDmja4uIOWinumHj+aVsOaNruaIluWFqOaWsOeahOaVsOaNri5cbiAgICogQHBhcmFtIHtTdHJpbmd9IFtrZXlQYXRoXSDpnIDopoHmm7TmlrDnmoTmlbDmja7ot6/lvoQuXG4gICAqIEBwYXJhbSB7QW55VHlwZXxPYmplY3R9IFtkYXRhXSDpnIDopoHmm7TmlrDnmoTmlbDmja4uIOecgeeVpeeahOivneWwhuS9v+eUqOeOsOacieeahOaVsOaNri5cbiAgICogQHBhcmFtIHtCb29sZWFufSBbaXNFeHRlbmRdIOeVjOmdouabtOaWsOexu+Weiy5cbiAgICAgICAgICAgIOS4uiB0cnVlIOaXtiwg5piv5omp5bGV5byP5pu05pawLCDljp/mnInnmoTmlbDmja7kuI3lj5hcbiAgICAgICAgICAgIOS4uiBmYWxzZSDml7YsIOS4uuabv+aNouabtOaWsCwg5LiN5ZyoIGRhdGEg5Lit55qE5Y+Y6YePLCDlsIblnKggRE9NIOS4reiiq+a4heepui5cbiAgICovXG4gIGZ1bmN0aW9uIHVwZGF0ZSAoa2V5UGF0aCwgZGF0YSwgaXNFeHRlbmQsIGlzQnViYmxlKSB7XG4gICAgdmFyIGF0dHJzLCB2bSA9IHRoaXMuX3ZtO1xuICAgIGlmKGlzT2JqZWN0KGtleVBhdGgpKXtcbiAgICAgIGlzQnViYmxlID0gaXNFeHRlbmQ7XG4gICAgICBpc0V4dGVuZCA9IGRhdGE7XG4gICAgICBhdHRycyA9IGRhdGEgPSBrZXlQYXRoO1xuICAgIH1lbHNlIGlmKHR5cGVvZiBrZXlQYXRoID09PSAnc3RyaW5nJyl7XG4gICAgICBrZXlQYXRoID0gcGFyc2VLZXlQYXRoKGtleVBhdGgpLmpvaW4oJy4nKTtcbiAgICAgIGlmKGlzVW5kZWZpbmVkKGRhdGEpKXtcbiAgICAgICAgZGF0YSA9IHRoaXMuZ2V0KGtleVBhdGgpO1xuICAgICAgfVxuICAgICAgYXR0cnMgPSBkZWVwU2V0KGtleVBhdGgsIGRhdGEsIHt9KTtcbiAgICAgIHZtID0gdm0uJGdldFZNKGtleVBhdGgpO1xuICAgIH1lbHNle1xuICAgICAgZGF0YSA9IHRoaXMuZGF0YTtcbiAgICB9XG4gICAgXG4gICAgaWYoaXNVbmRlZmluZWQoaXNFeHRlbmQpKXsgaXNFeHRlbmQgPSBpc09iamVjdChrZXlQYXRoKTsgfVxuICAgIHZtLiRzZXQoZGF0YSwgaXNFeHRlbmQsIGlzQnViYmxlICE9PSBmYWxzZSk7XG4gICAgdGhpcy50cmlnZ2VyKCd1cGRhdGUnLCBhdHRycyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgXG4gIGZ1bmN0aW9uIGJ1aWxkVmlld01vZGVsKCkge1xuICAgIHZhciB2bSA9IG5ldyBWaWV3TW9kZWwoe1xuICAgICAgJGFudDogdGhpc1xuICAgIH0pO1xuICAgIFxuICAgIHRoaXMuX3ZtID0gdm07XG4gICAgdHJhdmVsRWwodGhpcy5lbCwgdm0pO1xuICB9XG4gIFxuICB2YXIgTk9ERVRZUEUgPSB7XG4gICAgQVRUUjogMlxuICAsIFRFWFQ6IDNcbiAgLCBDT01NRU5UOiA4XG4gIH07XG4gIFxuICAvL+mBjeWOhuWFg+e0oOWPiuWFtuWtkOWFg+e0oOeahOaJgOacieWxnuaAp+iKgueCueWPiuaWh+acrOiKgueCuVxuICBmdW5jdGlvbiB0cmF2ZWxFbChlbCwgdm0pIHtcbiAgICBpZihlbC5sZW5ndGggJiYgaXNVbmRlZmluZWQoZWwubm9kZVR5cGUpKXtcbiAgICAgIC8vbm9kZSBsaXN0XG4gICAgICBmb3IodmFyIGkgPSAwLCBsID0gZWwubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHRyYXZlbEVsKGVsW2ldLCB2bSk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIFxuICAgIGlmKGVsLm5vZGVUeXBlID09PSBOT0RFVFlQRS5DT01NRU5UKXtcbiAgICAgIC8v5rOo6YeK6IqC54K5XG4gICAgICByZXR1cm47XG4gICAgfWVsc2UgaWYoZWwubm9kZVR5cGUgPT09IE5PREVUWVBFLlRFWFQpe1xuICAgICAgLy/mlofmnKzoioLngrlcbiAgICAgIGNoZWNrVGV4dChlbCwgdm0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBcbiAgICAvL+mBh+WIsCB0ZXJtaW5hbCDkuLogdHJ1ZSDnmoQgZGlyZWN0aXZlIOWxnuaAp+S4jeWGjemBjeWOhlxuICAgIGlmKGNoZWNrQXR0cihlbCwgdm0pKXtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgXG4gICAgZm9yKHZhciBjaGlsZCA9IGVsLmZpcnN0Q2hpbGQsIG5leHQ7IGNoaWxkOyApe1xuICAgICAgbmV4dCA9IGNoaWxkLm5leHRTaWJsaW5nO1xuICAgICAgdHJhdmVsRWwoY2hpbGQsIHZtKTtcbiAgICAgIGNoaWxkID0gbmV4dDtcbiAgICB9XG4gIH1cbiAgXG4gIC8v6YGN5Y6G5bGe5oCnXG4gIGZ1bmN0aW9uIGNoZWNrQXR0cihlbCwgdm0pIHtcbiAgICB2YXIgcmVwZWF0QXR0ciA9IGVsLmdldEF0dHJpYnV0ZU5vZGUoYW50QXR0ci5SRVBFQVQpXG4gICAgICAsIGlmQXR0ciA9IGVsLmdldEF0dHJpYnV0ZU5vZGUoYW50QXR0ci5JRilcbiAgICAgICwgYXR0ciwgZ2VuID0gcmVwZWF0QXR0ciB8fCBpZkF0dHJcbiAgICAgIDtcbiAgICBcbiAgICB2YXIgcHJlZml4ID0gQW50LnByZWZpeFxuICAgICAgLCBkaXJzID0gZ2V0RGlyKGVsLCBBbnQuZGlyZWN0aXZlcywgcHJlZml4KVxuICAgICAgLCBkaXJcbiAgICAgICwgdGVybWluYWxQcmlvcml0eSwgdGVybWluYWxcbiAgICAgIDtcbiAgICBcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGRpcnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBkaXIgPSBkaXJzW2ldO1xuICAgICBcbiAgICAgIC8v5a+55LqOIHRlcm1pbmFsIOS4uiB0cnVlIOeahCBkaXJlY3RpdmUsIOWcqOino+aekOWujOWFtuebuOWQjOadg+mHjeeahCBkaXJlY3RpdmUg5ZCO5Lit5pat6YGN5Y6G6K+l5YWD57SgXG4gICAgICBpZih0ZXJtaW5hbFByaW9yaXR5IDwgZGlyLnByaW9yaXR5KSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgXG4gICAgICBzZXRCaW5kaW5nKHZtLCBkaXIpO1xuICAgICBcbiAgICAgIGVsLnJlbW92ZUF0dHJpYnV0ZShkaXIubm9kZS5ub2RlTmFtZSk7XG4gICAgICBcbiAgICAgIGlmKGRpci50ZXJtaW5hbCkge1xuICAgICAgICB0ZXJtaW5hbCA9IHRydWU7XG4gICAgICAgIHRlcm1pbmFsUHJpb3JpdHkgPSBkaXIucHJpb3JpdHk7XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIGlmKHRlcm1pbmFsKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgXG4gICAgLy8gcmV0dXJuO1xuICAgIC8vIGlmKGdlbil7XG4gICAgICAvLyBjaGVja0JpbmRpbmcodm0sIGdlbiwgZWwpO1xuICAgICAgLy8gcmV0dXJuIHRydWU7XG4gICAgLy8gfVxuICB9XG4gIFxuICBmdW5jdGlvbiBjaGVja1RleHQobm9kZSwgdm0pIHtcbiAgICBpZih0b2tlbi5oYXNUb2tlbihub2RlLm5vZGVWYWx1ZSkpIHtcbiAgICAgIHZhciB0b2tlbnMgPSB0b2tlbi5wYXJzZVRva2VuKG5vZGUubm9kZVZhbHVlKVxuICAgICAgICAsIHRleHRNYXAgPSB0b2tlbnMudGV4dE1hcFxuICAgICAgICAsIGVsID0gbm9kZS5wYXJlbnROb2RlXG4gICAgICAgIDtcbiAgICAgIFxuICAgICAgLy/lsIZ7e2tleX195YiG5Ymy5oiQ5Y2V54us55qE5paH5pys6IqC54K5XG4gICAgICBpZih0ZXh0TWFwLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgdGV4dE1hcC5mb3JFYWNoKGZ1bmN0aW9uKHRleHQpIHtcbiAgICAgICAgICB2YXIgdG4gPSBkb2MuY3JlYXRlVGV4dE5vZGUodGV4dCk7XG4gICAgICAgICAgZWwuaW5zZXJ0QmVmb3JlKHRuLCBub2RlKTtcbiAgICAgICAgICBjaGVja1RleHQodG4sIHZtKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGVsLnJlbW92ZUNoaWxkKG5vZGUpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIHRva2Vucy5mb3JFYWNoKGZ1bmN0aW9uKHRva2VuKSB7XG4gICAgICAgICAgc2V0QmluZGluZyh2bSwgZXh0ZW5kKHRva2VuLCB0b2tlbi5lc2NhcGUgPyBBbnQuZGlyZWN0aXZlcy50ZXh0IDogQW50LmRpcmVjdGl2ZXMuaHRtbCwge1xuICAgICAgICAgICAgZWw6IG5vZGVcbiAgICAgICAgICB9KSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBcbiAgLy/ojrflj5bkuIDkuKrlhYPntKDkuIrmiYDmnInnlKggSFRNTCDlsZ7mgKflrprkuYnnmoTmjIfku6RcbiAgZnVuY3Rpb24gZ2V0RGlyKGVsLCBkaXJlY3RpdmVzLCBwcmVmaXgpIHtcbiAgICBwcmVmaXggPSBwcmVmaXggfHwgJyc7XG4gICAgZGlyZWN0aXZlcyA9IGRpcmVjdGl2ZXMgfHwge307XG4gICAgXG4gICAgdmFyIGF0dHIsIGF0dHJOYW1lLCBkaXJOYW1lXG4gICAgICAsIGRpcnMgPSBbXSwgZGlyXG4gICAgICA7XG4gICAgICBcbiAgICBmb3IodmFyIGkgPSBlbC5hdHRyaWJ1dGVzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKXtcbiAgICAgIGF0dHIgPSBlbC5hdHRyaWJ1dGVzW2ldO1xuICAgICAgYXR0ck5hbWUgPSBhdHRyLm5vZGVOYW1lO1xuICAgICAgZGlyTmFtZSA9IGF0dHJOYW1lLnNsaWNlKHByZWZpeC5sZW5ndGgpO1xuICAgICAgaWYoYXR0ck5hbWUuaW5kZXhPZihwcmVmaXgpID09PSAwICYmIChkaXJOYW1lIGluIGRpcmVjdGl2ZXMpKSB7XG4gICAgICAgIGRpciA9IGNyZWF0ZShkaXJlY3RpdmVzW2Rpck5hbWVdKTtcbiAgICAgICAgZGlyLmRpck5hbWUgPSBkaXJOYW1lXG4gICAgICB9ZWxzZSBpZih0b2tlbi5oYXNUb2tlbihhdHRyLnZhbHVlKSkge1xuICAgICAgICBkaXIgPSBjcmVhdGUoZGlyZWN0aXZlc1snYXR0ciddKTtcbiAgICAgICAgZGlyLmRpcnMgPSB0b2tlbi5wYXJzZVRva2VuKGF0dHIudmFsdWUpO1xuICAgICAgICBkaXIuZGlyTmFtZSA9IGF0dHJOYW1lLmluZGV4T2YocHJlZml4KSA9PT0gMCA/IGRpck5hbWUgOiBhdHRyTmFtZSA7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgZGlyID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGlmKGRpcikge1xuICAgICAgICBkaXJzLnB1c2goZXh0ZW5kKGRpciwge2VsOiBlbCwgbm9kZTogYXR0ciwgbm9kZU5hbWU6IGF0dHJOYW1lLCBwYXRoOiBhdHRyLnZhbHVlfSkpO1xuICAgICAgfVxuICAgIH1cbiAgICBkaXJzLnNvcnQoZnVuY3Rpb24oZDAsIGQxKSB7XG4gICAgICByZXR1cm4gZDAucHJpb3JpdHkgLSBkMS5wcmlvcml0eTtcbiAgICB9KTtcbiAgICByZXR1cm4gZGlycztcbiAgfVxuICBcblxuICBmdW5jdGlvbiBzZXRCaW5kaW5nKHZtLCBkaXIpIHtcbiAgICBpZihkaXIucmVwbGFjZSkge1xuICAgICAgdmFyIGVsID0gZGlyLmVsO1xuICAgICAgaWYoaXNGdW5jdGlvbihkaXIucmVwbGFjZSkpIHtcbiAgICAgICAgZGlyLm5vZGUgPSBkaXIucmVwbGFjZSgpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIGRpci5ub2RlID0gZG9jLmNyZWF0ZUNvbW1lbnQoZGlyLnR5cGUgKyAnID0gJyArIGRpci5wYXRoKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZGlyLmVsID0gZGlyLmVsLnBhcmVudE5vZGU7XG4gICAgICBkaXIuZWwucmVwbGFjZUNoaWxkKGRpci5ub2RlLCBlbCk7XG4gICAgfVxuICAgIFxuICAgIGRpci5pbml0KHZtKTtcbiAgICBcbiAgICBpZihkaXIuZGlycykge1xuICAgICAgZGlyLmRpcnMuZm9yRWFjaChmdW5jdGlvbih0b2tlbikge1xuICAgICAgICBuZXcgV2F0Y2hlcih2bSwgZXh0ZW5kKGRpciwgdG9rZW4pKTtcbiAgICAgIH0pO1xuICAgIH1lbHNle1xuICAgICAgbmV3IFdhdGNoZXIodm0sIGRpcik7XG4gICAgfVxuICB9XG4gIFxuICBmdW5jdGlvbiBWaWV3TW9kZWwob3B0cykge1xuICAgIGV4dGVuZCh0aGlzLCB7XG4gICAgICAka2V5OiAnJ1xuICAgICwgJHJvb3Q6IHRoaXNcbiAgICAsICR3YXRjaGVyczogW11cbiAgICAsICRhc3NpZ25tZW50OiB7fVxuICAgIH0sIG9wdHMpO1xuICB9XG4gIFxuICBWaWV3TW9kZWwucHJvdG90eXBlID0ge1xuICAgICRyb290OiBudWxsXG4gICwgJHBhcmVudDogbnVsbFxuICBcbiAgLCAkYW50OiBudWxsXG4gICwgJGtleTogbnVsbFxuICAsICRyZXBlYXQ6IGZhbHNlXG4gICwgJGFzc2lnbm1lbnQ6IG51bGxcbiAgXG4gICwgJHdhdGNoZXJzOiBudWxsXG5cbiAgLCAkdmFsdWU6IE5hTlxuICAgIFxuICAvL+iOt+WPluWtkCB2bVxuICAvL3N0cmljdDogZmFsc2UoZGVmYXVsdCnkuI3lrZjlnKjnmoTor53lsIbmlrDlu7rkuIDkuKpcbiAgLCAkZ2V0Vk06IGZ1bmN0aW9uKHBhdGgsIHN0cmljdCkge1xuICAgICAgcGF0aCA9IHBhdGggKyAnJztcbiAgICAgIFxuICAgICAgdmFyIGtleSwgdm1cbiAgICAgICAgLCBjdXIgPSB0aGlzXG4gICAgICAgICwga2V5Q2hhaW4gPSB1dGlscy5wYXJzZUtleVBhdGgocGF0aClcbiAgICAgICAgO1xuICAgICAgICBcbiAgICAgIGlmKGtleUNoYWluWzBdIGluIHRoaXMuJGFzc2lnbm1lbnQpIHtcbiAgICAgICAgY3VyID0gdGhpcy4kYXNzaWdubWVudFtrZXlDaGFpblswXV07XG4gICAgICAgIGtleUNoYWluLnNoaWZ0KCk7XG4gICAgICB9XG4gICAgICBpZihwYXRoKXtcbiAgICAgICAgZm9yKHZhciBpID0gMCwgbCA9IGtleUNoYWluLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICAgICAga2V5ID0ga2V5Q2hhaW5baV07XG4gICAgICAgICAgXG4gICAgICAgICAgaWYoIWN1cltrZXldKXtcbiAgICAgICAgICAgIGlmKHN0cmljdCl7IHJldHVybiBudWxsOyB9XG4gICAgICAgICAgICB2bSA9IG5ldyBWaWV3TW9kZWwoe1xuICAgICAgICAgICAgICAkcGFyZW50OiBjdXJcbiAgICAgICAgICAgICwgJHJvb3Q6IGN1ci4kcm9vdFxuICAgICAgICAgICAgLCAkYXNzaWdubWVudDogZXh0ZW5kKHt9LCBjdXIuJGFzc2lnbm1lbnQpXG4gICAgICAgICAgICAsICRrZXk6IGtleVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGN1cltrZXldID0gdm07XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIGN1ciA9IGN1cltrZXldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gY3VyO1xuICAgIH1cbiAgICBcbiAgLCAkZ2V0S2V5UGF0aDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIga2V5UGF0aCA9IHRoaXMuJGtleVxuICAgICAgICAsIGN1ciA9IHRoaXNcbiAgICAgICAgO1xuICAgICAgd2hpbGUoY3VyID0gY3VyLiRwYXJlbnQpe1xuICAgICAgICBpZihjdXIuJGtleSl7XG4gICAgICAgICAga2V5UGF0aCA9IGN1ci4ka2V5ICsgJy4nICsga2V5UGF0aDtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBrZXlQYXRoO1xuICAgIH1cbiAgXG4gIC8v6I635Y+W5a+56LGh55qE5p+Q5Liq5YC8LCDmsqHmnInnmoTor53mn6Xmib7niLboioLngrksIOebtOWIsOmhtuWxgi5cbiAgLCAkZ2V0RGF0YTogZnVuY3Rpb24oa2V5LCBpc1N0cmljdCkge1xuICAgICAgaWYoa2V5ID09PSAnJGluZGV4JyAmJiB0aGlzLiRwYXJlbnQgJiYgdGhpcy4kcGFyZW50LiRyZXBlYXQpe1xuICAgICAgICByZXR1cm4gdGhpcy4ka2V5ICogMTtcbiAgICAgIH1cbiAgICAgIHZhciBjdXJWYWwgPSBkZWVwR2V0KGtleSwgdGhpcy4kcm9vdC4kYW50LmdldCh0aGlzLiRnZXRLZXlQYXRoKCkpKTtcbiAgICAgIGlmKGlzU3RyaWN0IHx8ICF0aGlzLiRwYXJlbnQgfHwgIWlzVW5kZWZpbmVkKGN1clZhbCkpe1xuICAgICAgICByZXR1cm4gY3VyVmFsO1xuICAgICAgfWVsc2V7XG4gICAgICAgIHJldHVybiB0aGlzLiRwYXJlbnQuJGdldERhdGEoa2V5KTtcbiAgICAgIH1cbiAgICB9XG4gICwgJHNldDogZnVuY3Rpb24gKGRhdGEsIGlzRXh0ZW5kLCBpc0J1YmJsZSkge1xuICAgICAgdmFyIG1hcCA9IGlzRXh0ZW5kID8gZGF0YSA6IHRoaXNcbiAgICAgICAgLCBwYXJlbnQgPSB0aGlzXG4gICAgICAgIDtcbiAgICAgIFxuICAgICAgXG4gICAgICBmb3IodmFyIGkgPSAwLCBsID0gdGhpcy4kd2F0Y2hlcnMubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgICAgaWYoKHRoaXMuJHZhbHVlICE9PSBkYXRhKSB8fCB0aGlzLiR3YXRjaGVyc1tpXS5zdGF0ZSA9PT0gV2F0Y2hlci5TVEFURV9SRUFEWSl7XG4gICAgICAgICAgdGhpcy4kd2F0Y2hlcnNbaV0uZm4oKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdGhpcy4kdmFsdWUgPSBkYXRhO1xuICAgICAgXG4gICAgICBpZihpc09iamVjdChtYXApKXtcbiAgICAgICAgZm9yKHZhciBwYXRoIGluIG1hcCkge1xuICAgICAgICAgIC8v5Lyg5YWl55qE5pWw5o2u6ZSu5YC85LiN6IO95ZKMIHZtIOS4reeahOiHquW4puWxnuaAp+WQjeebuOWQjC5cbiAgICAgICAgICAvL+aJgOS7peS4jeaOqOiNkOS9v+eUqCAnJCcg5L2c5Li6IEpTT04g5pWw5o2u6ZSu5YC855qE5byA5aS0LlxuICAgICAgICAgIGlmKHRoaXMuaGFzT3duUHJvcGVydHkocGF0aCkgJiYgKCEocGF0aCBpbiBWaWV3TW9kZWwucHJvdG90eXBlKSkgJiYgKCF0aGlzLiRyZXBlYXQgfHwgcGF0aCA9PT0gJ2xlbmd0aCcpKXtcbiAgICAgICAgICAgIHRoaXNbcGF0aF0uJHNldChkYXRhID8gZGF0YVtwYXRoXSA6IHZvaWQoMCksIGlzRXh0ZW5kKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYoaXNCdWJibGUpe1xuICAgICAgICB3aGlsZShwYXJlbnQgPSBwYXJlbnQuJHBhcmVudCl7XG4gICAgICAgICAgZm9yKHZhciBpID0gMCwgbCA9IHBhcmVudC4kd2F0Y2hlcnMubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgICAgICAgIHBhcmVudC4kd2F0Y2hlcnNbaV0uZm4oKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07XG4gIFxuICBcbiAgdmFyIHBlcnRpYWxSZWcgPSAvXj5cXHMqKD89LispLztcbiAgXG4gIC8vYnVpZCBpbiBiaW5kaW5nc1xuICB2YXIgYmFzZUJpbmRpbmdzID0gW1xuICAgIC8v5bGA6YOo5qih5p2/LiB7ez4gYW5vdGhlcmFudH19XG4gICAgZnVuY3Rpb24odm0sIHRva2VuKSB7XG4gICAgICB2YXIgcE5hbWUsIGFudCwgb3B0cywgbm9kZTtcbiAgICAgIGlmKHRva2VuLm5vZGVOYW1lID09PSAnI3RleHQnICYmIHBlcnRpYWxSZWcudGVzdCh0b2tlbi5wYXRoKSl7XG4gICAgICAgIHBOYW1lID0gdG9rZW4ucGF0aC5yZXBsYWNlKHBlcnRpYWxSZWcsICcnKTtcbiAgICAgICAgYW50ID0gdm0uJHJvb3QuJGFudDtcbiAgICAgICAgb3B0cyA9IGFudC5vcHRpb25zO1xuICAgICAgICBub2RlID0gZG9jLmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICAgICAgdG9rZW4uZWwuaW5zZXJ0QmVmb3JlKG5vZGUsIHRva2VuLm5vZGUpO1xuICAgICAgICB0b2tlbi5lbC5yZW1vdmVDaGlsZCh0b2tlbi5ub2RlKTtcbiAgICAgICAgXG4gICAgICAgIGFudC5zZXRQYXJ0aWFsKHtcbiAgICAgICAgICBuYW1lOiBwTmFtZVxuICAgICAgICAsIGNvbnRlbnQ6IG9wdHMgJiYgb3B0cy5wYXJ0aWFscyAmJiBvcHRzLnBhcnRpYWxzW3BOYW1lXVxuICAgICAgICAsIHRhcmdldDogZnVuY3Rpb24oZWwpIHsgdG9rZW4uZWwuaW5zZXJ0QmVmb3JlKGVsLCBub2RlKSB9XG4gICAgICAgICwgZXNjYXBlOiB0b2tlbi5lc2NhcGVcbiAgICAgICAgLCBwYXRoOiB2bS4kZ2V0S2V5UGF0aCgpXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8vaWYgLyByZXBlYXRcbiAgLCBmdW5jdGlvbih2bSwgdG9rZW4pIHtcbiAgICAgIGlmKHRva2VuLm5vZGVOYW1lID09PSBhbnRBdHRyLklGIHx8IHRva2VuLm5vZGVOYW1lID09PSBhbnRBdHRyLlJFUEVBVCl7XG4gICAgICAgIHJldHVybiBuZXcgR2VuZXJhdG9yKHZtLCB0b2tlbik7XG4gICAgICB9XG4gICAgfVxuICBdO1xuICBcbiAgdmFyIGV4UGFyc2UgPSBmdW5jdGlvbihwYXRoKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciBhc3QgPSBwYXJzZShwYXRoLCB0aGlzLnR5cGUgJiYgdGhpcy50eXBlLnNsaWNlKHByZWZpeC5sZW5ndGgpKTtcbiAgICAgIFxuICAgIGV4dGVuZCh0aGlzLCBldmFsdWF0ZS5zdW1tYXJ5KGFzdCkpO1xuICAgIHRoaXMuX2FzdCA9IGFzdDtcbiAgfTtcbiAgXG4gIGZ1bmN0aW9uIFdhdGNoZXIocmVsYXRpdmVWbSwgdG9rZW4sIGNhbGxiYWNrKSB7XG4gICAgdGhpcy50b2tlbiA9IHRva2VuO1xuICAgIHRoaXMucmVsYXRpdmVWbSA9IHJlbGF0aXZlVm07XG4gICAgdGhpcy5hbnQgPSByZWxhdGl2ZVZtLiRyb290LiRhbnQ7XG4gICAgXG4gICAgdGhpcy5lbCA9IHRva2VuLmVsO1xuICAgIHRoaXMudmFsID0gTmFOO1xuICAgIFxuICAgIHRoaXMudXBkYXRlID0gY2FsbGJhY2sgPyBjYWxsYmFjayA6IHRva2VuLnVwZGF0ZTtcbiAgICBcbiAgICB0b2tlbi5wYXRoICYmIGV4UGFyc2UuY2FsbCh0aGlzLCB0b2tlbi5wYXRoKTtcbiAgICBcbiAgICB2YXIgcm9vdCA9IHJlbGF0aXZlVm1cbiAgICAgICwgcGF0aHNcbiAgICAgICwgcnVuID0gIXRoaXMubG9jYWxzLmxlbmd0aFxuICAgICAgO1xuICAgIFxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSB0aGlzLnBhdGhzLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICBwYXRocyA9IHV0aWxzLnBhcnNlS2V5UGF0aCh0aGlzLnBhdGhzW2ldKTtcbiAgICAgIGlmKCEocGF0aHNbMF0gaW4gcmVsYXRpdmVWbS4kYXNzaWdubWVudCkpIHtcbiAgICAgICAgcm9vdCA9IHJlbGF0aXZlVm0uJHJvb3Q7XG4gICAgICAgIHJ1biA9IHJ1biB8fCByb290ICE9PSByZWxhdGl2ZVZtO1xuICAgICAgfWVsc2V7XG4gICAgICAgIC8vaWYodGhpcy5zdGF0ZSA9PSBXYXRjaGVyLlNUQVRFX1JFQURZKSB7XG4gICAgICAgICAgcnVuID0gdHJ1ZTsvL+W8leeUqOeItue6pyBWTSDml7YsIOeri+WNs+iuoeeul1xuICAgICAgICAvL31cbiAgICAgIH1cbiAgICAgIHJvb3QuJGdldFZNKHRoaXMucGF0aHNbaV0pLiR3YXRjaGVycy5wdXNoKHRoaXMpO1xuICAgIH1cbiAgICBcbiAgICB0aGlzLnN0YXRlID0gV2F0Y2hlci5TVEFURV9SRUFEWVxuICAgIFxuICAgIC8vV2hlbiB0aGVyZSBpcyBubyB2YXJpYWJsZSBpbiBhIGJpbmRpbmcsIGV2YWx1YXRlIGl0IGltbWVkaWF0ZWx5LlxuICAgIGlmKHJ1bikge1xuICAgICAgdGhpcy5mbigpO1xuICAgIH1cbiAgfVxuICBcbiAgZXh0ZW5kKFdhdGNoZXIsIHtcbiAgICBTVEFURV9SRUFEWTogMFxuICAsIFNUQVRFX0NBTExFRDogMVxuICB9LCBDbGFzcyk7XG4gIFxuICBleHRlbmQoV2F0Y2hlci5wcm90b3R5cGUsIHtcbiAgICBmbjogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgdmFscyA9IHt9LCBrZXk7XG4gICAgICBmb3IodmFyIGkgPSAwLCBsID0gdGhpcy5sb2NhbHMubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgICAga2V5ID0gdGhpcy5sb2NhbHNbaV07XG4gICAgICAgIGlmKGtleSBpbiB0aGlzLnJlbGF0aXZlVm0uJGFzc2lnbm1lbnQpe1xuICAgICAgICAgIHZhbHNba2V5XSA9IHRoaXMucmVsYXRpdmVWbS4kYXNzaWdubWVudFtrZXldLiRnZXREYXRhKCk7XG4gICAgICAgIC8vIH1lbHNlIGlmKGtleSA9PT0gJy4nKXtcbiAgICAgICAgICAvLyB2YWxzID0gdGhpcy5yZWxhdGl2ZVZtLiRnZXREYXRhKCk7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgIHZhbHNba2V5XSA9IHRoaXMucmVsYXRpdmVWbS4kZ2V0RGF0YShrZXkpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFxuICAgICAgdmFyIG5ld1ZhbCA9IHRoaXMuZ2V0VmFsdWUodmFscylcbiAgICAgICAgLCBkaXIgPSB0aGlzLnRva2VuXG4gICAgICAgIDtcbiAgICAgICAgXG4gICAgICBpZihuZXdWYWwgIT09IHRoaXMudmFsKXtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgIHRoaXMudXBkYXRlLmNhbGwodGhpcy50b2tlbiwgbmV3VmFsLCB0aGlzLnZhbCk7XG4gICAgICAgICAgdGhpcy52YWwgPSBuZXdWYWw7XG4gICAgICAgIH1jYXRjaChlKXtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aGlzLnN0YXRlID0gV2F0Y2hlci5TVEFURV9DQUxMRUQ7XG4gICAgfVxuICAsIGdldFZhbHVlOiBmdW5jdGlvbih2YWxzKSB7XG4gICAgICB2YXIgZmlsdGVycyA9IHRoaXMuZmlsdGVyc1xuICAgICAgICAsIGFudCA9IHRoaXMuYW50LCB2YWxcbiAgICAgICAgO1xuICAgICAgXG4gICAgICBmb3IodmFyIGkgPSAwLCBsID0gZmlsdGVycy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgICBpZighYW50LmZpbHRlcnNbZmlsdGVyc1tpXV0pe1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZpbHRlcjogJyArIGZpbHRlcnNbaV0gKyAnIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgXG4gICAgICB0cnl7XG4gICAgICAgIHZhbCA9IGV2YWx1YXRlLmV2YWwodGhpcy5fYXN0LCB7bG9jYWxzOiB2YWxzLCBmaWx0ZXJzOiBhbnQuZmlsdGVyc30pO1xuICAgICAgfWNhdGNoKGUpe1xuICAgICAgICB2YWwgPSAnJztcbiAgICAgIH1cbiAgICAgIHJldHVybiB2YWw7XG4gICAgfVxuICB9KTtcbiAgXG4gIC8vLS0tXG4gIGZ1bmN0aW9uIGNhbGxSZXBlYXRlcih2bUFycmF5LCBtZXRob2QsIGFyZ3Mpe1xuICAgIHZhciB3YXRjaGVycyA9IHZtQXJyYXkuX19hbnRfXy4kd2F0Y2hlcnM7XG4gICAgdmFyIG5vRml4Vm0gPSBmYWxzZTtcbiAgICBmb3IodmFyIGkgPSAwLCBsID0gd2F0Y2hlcnMubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgIGlmKHdhdGNoZXJzW2ldLnR5cGUgPT09IGFudEF0dHIuUkVQRUFUKXtcbiAgICAgICAgd2F0Y2hlcnNbaV1bbWV0aG9kXShhcmdzLCB2bUFycmF5LCBub0ZpeFZtKTtcbiAgICAgICAgbm9GaXhWbSA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHZtQXJyYXkuX19hbnRfXy4kZ2V0Vk0oJ2xlbmd0aCcpLiRzZXQodm1BcnJheS5sZW5ndGgsIGZhbHNlLCB0cnVlKTtcbiAgICB2bUFycmF5Ll9fYW50X18uJHJvb3QuJGFudC50cmlnZ2VyKCd1cGRhdGUnKTtcbiAgfVxuICB2YXIgYXJyYXlNZXRob2RzID0ge1xuICAgIHNwbGljZTogYWZ0ZXJGbihbXS5zcGxpY2UsIGZ1bmN0aW9uKCkge1xuICAgICAgY2FsbFJlcGVhdGVyKHRoaXMsICdzcGxpY2UnLCBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xuICAgIH0pXG4gICwgcHVzaDogYWZ0ZXJGbihbXS5wdXNoLCBmdW5jdGlvbigvKml0ZW0xLCBpdGVtMiwgLi4uKi8pIHtcbiAgICAgIHZhciBhcnIgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICBhcnIudW5zaGlmdCh0aGlzLmxlbmd0aCAtIGFyci5sZW5ndGgsIDApO1xuICAgICAgXG4gICAgICBjYWxsUmVwZWF0ZXIodGhpcywgJ3NwbGljZScsIGFycik7XG4gICAgfSlcbiAgLCBwb3A6IGFmdGVyRm4oW10ucG9wLCBmdW5jdGlvbigpIHtcbiAgICAgIGNhbGxSZXBlYXRlcih0aGlzLCAnc3BsaWNlJywgW3RoaXMubGVuZ3RoLCAxXSk7XG4gICAgfSlcbiAgLCBzaGlmdDogYWZ0ZXJGbihbXS5zaGlmdCwgZnVuY3Rpb24oKSB7XG4gICAgICBjYWxsUmVwZWF0ZXIodGhpcywgJ3NwbGljZScsIFswLCAxXSk7XG4gICAgfSlcbiAgLCB1bnNoaWZ0OiBhZnRlckZuKFtdLnVuc2hpZnQsIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFyciA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgIGFyci51bnNoaWZ0KDAsIDApO1xuICAgICAgXG4gICAgICBjYWxsUmVwZWF0ZXIodGhpcywgJ3NwbGljZScsIGFycik7XG4gICAgfSlcbiAgLCBzb3J0OiBhZnRlckZuKFtdLnNvcnQsIGZ1bmN0aW9uKGZuKSB7XG4gICAgICBjYWxsUmVwZWF0ZXIodGhpcywgJ3NvcnQnKTtcbiAgICB9KVxuICAsIHJldmVyc2U6IGFmdGVyRm4oW10ucmV2ZXJzZSwgZnVuY3Rpb24oKXtcbiAgICAgIGNhbGxSZXBlYXRlcih0aGlzLCAncmV2ZXJzZScpO1xuICAgIH0pXG4gIH07XG4gIFxuICAvL+WkhOeQhuWKqOaAgeiKgueCuSh6LXJlcGVhdCwgei1pZilcbiAgdmFyIEdlbmVyYXRvciA9IFdhdGNoZXIuZXh0ZW5kKFxuICAgIHtcbiAgICAgIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiAocmVsYXRpdmVWbSwgdG9rZW4pe1xuICAgICAgICAvL+aWh+aho+WPgueFp+iKgueCuS4gXG4gICAgICAgIHZhciBhbmNob3IgPSBkb2MuY3JlYXRlVGV4dE5vZGUoJycpXG4gICAgICAgICAgLCBlbCA9IHRva2VuLmVsXG4gICAgICAgICAgLCB0eXBlID0gdG9rZW4ubm9kZU5hbWVcbiAgICAgICAgICA7XG5cbiAgICAgICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICAgICAgdGhpcy5hbmNob3IgPSBhbmNob3I7XG4gICAgICAgIGVsLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGFuY2hvciwgZWwpO1xuICAgICAgICBlbC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGVsKTtcbiAgICAgICAgICBcbiAgICAgICAgV2F0Y2hlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICBcbiAgICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKHR5cGUpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICB0aGlzLmVscyA9IFtdO1xuICAgICAgICB0aGlzLnZtID0gcmVsYXRpdmVWbS4kZ2V0Vk0odGhpcy5wYXRoc1swXSk7XG4gICAgICAgIFxuICAgICAgICBpZih0eXBlID09PSBhbnRBdHRyLklGKXtcbiAgICAgICAgICAvL2lmIOWxnuaAp+S4jeeUqOWIh+aNouS9nOeUqOWfn1xuICAgICAgICAgIHRyYXZlbEVsKHRoaXMuZWwsIHJlbGF0aXZlVm0pO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICB0aGlzLnZtLiRyZXBlYXQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgfVxuICAgICwgY2FsbGJhY2s6IGZ1bmN0aW9uKGRhdGEsIG9sZCkge1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXNcbiAgICAgICAgICA7XG4gICAgICAgIGlmKHRoYXQudHlwZSA9PT0gYW50QXR0ci5SRVBFQVQpe1xuICAgICAgICAgIGlmKGRhdGEgJiYgIWlzQXJyYXkoZGF0YSkpe1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCfpnIDopoHkuIDkuKrmlbDnu4QnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgZGF0YSAmJiB0aGlzLnNwbGljZShbMCwgdGhpcy5lbHMubGVuZ3RoXS5jb25jYXQoZGF0YSksIGRhdGEpO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICBpZihkYXRhKSB7XG4gICAgICAgICAgICBpZighdGhhdC5sYXN0SWZTdGF0ZSkge1xuICAgICAgICAgICAgICB0aGF0LmFuY2hvci5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGF0LmVsLCB0aGF0LmFuY2hvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICBpZih0aGF0Lmxhc3RJZlN0YXRlKSB7XG4gICAgICAgICAgICAgIHRoYXQuZWwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGF0LmVsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgdGhhdC5sYXN0SWZTdGF0ZSA9IGRhdGE7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICB9XG4gICAgICAvL+eyvuehruaOp+WItiBET00g5YiX6KGoXG4gICAgICAvL2FyZ3M6IFtpbmRleCwgbi8qLCBpdGVtcy4uLiovXVxuICAgICAgLy9hcnI6IOaVsOe7hOaVsOaNrlxuICAgICAgLy9ub0ZpeFZtOiDmmK/lkKbkuI3pnIDopoHnu7TmiqQgdmlld21vZGVsIOe0ouW8lVxuICAgICwgc3BsaWNlOiBmdW5jdGlvbihhcmdzLCBhcnIsIG5vRml4Vm0pIHtcbiAgICAgICAgdmFyIGVscyA9IHRoaXMuZWxzXG4gICAgICAgICAgLCBpdGVtcyA9IGFyZ3Muc2xpY2UoMilcbiAgICAgICAgICAsIGluZGV4ID0gYXJnc1swXSAqIDFcbiAgICAgICAgICAsIG4gPSBhcmdzWzFdICogMVxuICAgICAgICAgICwgbSA9IGl0ZW1zLmxlbmd0aFxuICAgICAgICAgICwgbmV3RWxzID0gW11cbiAgICAgICAgICAsIGZyYWcgPSBkb2MuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpXG4gICAgICAgICAgLCBwbiA9IHRoaXMuYW5jaG9yLnBhcmVudE5vZGVcbiAgICAgICAgICAsIGVsLCB2bVxuICAgICAgICAgIDtcbiAgICAgICAgXG4gICAgICAgIGlmKGlzVW5kZWZpbmVkKG4pKXtcbiAgICAgICAgICBhcmdzWzFdID0gbiA9IGVscy5sZW5ndGggLSBpbmRleDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgZm9yKHZhciBpID0gaW5kZXgsIGwgPSBlbHMubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgICAgICBpZihpIDwgaW5kZXggKyBuKXtcbiAgICAgICAgICAgIC8v5Yig6ZmkXG4gICAgICAgICAgICAvL+WvueS6juaLpeaciSBpZiDlsZ7mgKflubbkuJTkuI3mmL7npLrnmoToioLngrksIOWFtuW5tuS4jeWtmOWcqOS6jiBET00g5qCR5LitXG4gICAgICAgICAgICB0cnl7IHBuLnJlbW92ZUNoaWxkKGVsc1tpXSk7IH1jYXRjaChlKXt9XG4gICAgICAgICAgICBub0ZpeFZtIHx8IGRlbGV0ZSB0aGlzLnZtW2ldO1xuICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgaWYobiB8fCBtKXtcbiAgICAgICAgICAgICAgLy/nu7TmiqTntKLlvJVcbiAgICAgICAgICAgICAgdmFyIG5ld0kgPSBpIC0gKG4gLSBtKVxuICAgICAgICAgICAgICAgICwgb2xkSSA9IGlcbiAgICAgICAgICAgICAgICA7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICBpZihuZXdJID4gb2xkSSkge1xuICAgICAgICAgICAgICAgIG5ld0kgPSBsIC0gKGkgLSBpbmRleCk7XG4gICAgICAgICAgICAgICAgb2xkSSA9IG5ld0kgKyAobiAtIG0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICBlbHNbb2xkSV1bJyRpbmRleCddID0gbmV3STtcbiAgICAgICAgICAgICAgaWYoIW5vRml4Vm0pe1xuICAgICAgICAgICAgICAgIHZtID0gdGhpcy52bVtuZXdJXSA9IHRoaXMudm1bb2xkSV07XG4gICAgICAgICAgICAgICAgdm0uJGtleSA9IG5ld0kgKyAnJztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy/mlrDlop5cbiAgICAgICAgZm9yKHZhciBqID0gMDsgaiA8IG07IGorKyl7XG4gICAgICAgICAgZWwgPSB0aGlzLmVsLmNsb25lTm9kZSh0cnVlKTtcbiAgICAgICAgICBub0ZpeFZtIHx8IGRlbGV0ZSB0aGlzLnZtW2luZGV4ICsgal07XG4gICAgICAgICAgdm0gPSB0aGlzLnZtLiRnZXRWTShpbmRleCArIGopO1xuICAgICAgICAgIFxuICAgICAgICAgIGZvcih2YXIgYSA9IDA7IGEgPCB0aGlzLmFzc2lnbm1lbnRzLmxlbmd0aDsgYSsrKSB7XG4gICAgICAgICAgICB2bS4kYXNzaWdubWVudFt0aGlzLmFzc2lnbm1lbnRzW2FdXSA9IHZtO1xuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICBlbFsnJGluZGV4J10gPSBpbmRleCArIGo7XG4gICAgICAgICAgZnJhZy5hcHBlbmRDaGlsZChlbCk7XG4gICAgICAgICAgdHJhdmVsRWwoZWwsIHZtKTtcbiAgICAgICAgICB2bS4kc2V0KGl0ZW1zW2pdKTtcbiAgICAgICAgICBcbiAgICAgICAgICBuZXdFbHMucHVzaChlbCk7XG4gICAgICAgICAgaWYoYXJyICYmIGlzT2JqZWN0KGFycltpbmRleCArIGpdKSl7XG4gICAgICAgICAgICBhcnJbaW5kZXggKyBqXSA9IG1vZGVsRXh0ZW5kKGlzQXJyYXkoYXJyW2luZGV4ICsgal0pID8gW106IHt9LCBhcnJbaW5kZXggKyBqXSwgdm0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZihuZXdFbHMubGVuZ3RoKXtcbiAgICAgICAgICBwbi5pbnNlcnRCZWZvcmUoZnJhZywgZWxzW2luZGV4ICsgbl0gfHwgdGhpcy5hbmNob3IpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvL+mcgOimgea4hemZpOe8qeefreWQjuWkmuWHuueahOmDqOWIhlxuICAgICAgICBpZighbm9GaXhWbSl7XG4gICAgICAgICAgZm9yKHZhciBrID0gbCAtIG4gKyBtOyBrIDwgbDsgaysrKXtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnZtW2tdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYoYXJyLl9fYW50X18gIT09IHRoaXMudm0pIHtcbiAgICAgICAgICBhcnIuX19hbnRfXyA9IHRoaXMudm07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGFyZ3MgPSBhcmdzLnNsaWNlKDAsIDIpLmNvbmNhdChuZXdFbHMpO1xuICAgICAgICBlbHMuc3BsaWNlLmFwcGx5KGVscywgYXJncyk7XG4gICAgICB9XG4gICAgLCByZXZlcnNlOiBmdW5jdGlvbihhcmdzLCBhcnIsIG5vRml4Vm0pIHtcbiAgICAgICAgdmFyIHZtcyA9IHRoaXMudm0sIHZtXG4gICAgICAgICAgLCBlbCA9IHRoaXMuYW5jaG9yXG4gICAgICAgICAgLCBmcmFnID0gZG9jLmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKVxuICAgICAgICAgIDtcbiAgICAgICAgZm9yKHZhciBpID0gMCwgbCA9IHRoaXMuZWxzLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICAgICAgaWYoKCFub0ZpeFZtKSAmJiBpIDwgMS8yKXtcbiAgICAgICAgICAgIHZtID0gdm1zW2ldO1xuICAgICAgICAgICAgdm1zW2ldID0gdm1zW2wgLSBpIC0gMV07XG4gICAgICAgICAgICB2bXNbaV0uJGtleSA9IGkgKyAnJztcbiAgICAgICAgICAgIHZtLiRrZXkgPSBsIC0gaSAtIDEgKyAnJztcbiAgICAgICAgICAgIHZtc1tsIC0gaSAtIDFdID0gdm07XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuZWxzW2ldWyckaW5kZXgnXSA9IGwgLSBpIC0gMTtcbiAgICAgICAgICBmcmFnLmFwcGVuZENoaWxkKHRoaXMuZWxzW2wgLSBpIC0gMV0pO1xuICAgICAgICB9XG4gICAgICAgIGVsLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGZyYWcsIGVsKTtcbiAgICAgICAgdGhpcy5lbHMucmV2ZXJzZSgpO1xuICAgICAgfVxuICAgICwgc29ydDogZnVuY3Rpb24oZm4pe1xuICAgICAgICAvL1RPRE8g6L+b6KGM57K+56Gu6auY6L+Y5Y6f55qE5o6S5bqPP1xuICAgICAgICB0aGlzLmNhbGxiYWNrKHRoaXMudmFsKVxuICAgICAgfVxuICAgIH1cbiAgKVxuICBcbiAgQW50Ll9wYXJzZSA9IHBhcnNlO1xuICBBbnQuX2V2YWwgPSBldmFsdWF0ZS5ldmFsO1xuICBBbnQudmVyc2lvbiA9ICclVkVSU0lPTic7XG4gIFxuICBtb2R1bGUuZXhwb3J0cyA9IEFudDsiLCJ2YXIgZXh0ZW5kID0gcmVxdWlyZSgnLi91dGlscy5qcycpLmV4dGVuZDtcblxudmFyIENsYXNzID0ge1xuICAvKiogXG4gICAqIOaehOmAoOWHveaVsOe7p+aJvy4gXG4gICAqIOWmgjogYHZhciBDYXIgPSBBbnQuZXh0ZW5kKHtkcml2ZTogZnVuY3Rpb24oKXt9fSk7IG5ldyBDYXIoKTtgXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbcHJvdG9Qcm9wc10g5a2Q5p6E6YCg5Ye95pWw55qE5omp5bGV5Y6f5Z6L5a+56LGhXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbc3RhdGljUHJvcHNdIOWtkOaehOmAoOWHveaVsOeahOaJqeWxlemdmeaAgeWxnuaAp1xuICAgKiBAcmV0dXJuIHtGdW5jdGlvbn0g5a2Q5p6E6YCg5Ye95pWwXG4gICAqL1xuICBleHRlbmQ6IGZ1bmN0aW9uIChwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykge1xuICAgIHByb3RvUHJvcHMgPSBwcm90b1Byb3BzIHx8IHt9O1xuICAgIHZhciBjb25zdHJ1Y3RvciA9IHByb3RvUHJvcHMuaGFzT3duUHJvcGVydHkoJ2NvbnN0cnVjdG9yJykgPyBwcm90b1Byb3BzLmNvbnN0cnVjdG9yIDogZnVuY3Rpb24oKXsgcmV0dXJuIHN1cC5hcHBseSh0aGlzLCBhcmd1bWVudHMpOyB9XG4gICAgdmFyIHN1cCA9IHRoaXM7XG4gICAgdmFyIEZuID0gZnVuY3Rpb24oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBjb25zdHJ1Y3RvcjsgfTtcbiAgICBcbiAgICBGbi5wcm90b3R5cGUgPSBzdXAucHJvdG90eXBlO1xuICAgIGNvbnN0cnVjdG9yLnByb3RvdHlwZSA9IG5ldyBGbigpO1xuICAgIGV4dGVuZChjb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpO1xuICAgIGV4dGVuZChjb25zdHJ1Y3Rvciwgc3VwLCBzdGF0aWNQcm9wcywge19fc3VwZXJfXzogc3VwLnByb3RvdHlwZX0pO1xuICAgIFxuICAgIHJldHVybiBjb25zdHJ1Y3RvcjtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDbGFzczsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpXG4gIDtcblxuLy/kuLogQW50IOaehOmAoOWHveaVsOa3u+WKoOaMh+S7pCAoZGlyZWN0aXZlKS4gYEFudC5kaXJlY3RpdmVgXG5mdW5jdGlvbiBkaXJlY3RpdmUoa2V5LCBvcHRzKSB7XG4gIHZhciBkaXJzID0gdGhpcy5kaXJlY3RpdmVzID0gdGhpcy5kaXJlY3RpdmVzIHx8IHt9O1xuICBcbiAgcmV0dXJuIGRpcnNba2V5XSA9IG5ldyBEaXJlY3RpdmUoa2V5LCBvcHRzKTtcbn1cblxuZXhwb3J0cy5kaXJlY3RpdmUgPSBkaXJlY3RpdmU7XG5cbmZ1bmN0aW9uIERpcmVjdGl2ZShrZXksIG9wdHMpIHtcbiAgdXRpbHMuZXh0ZW5kKHRoaXMsIHtcbiAgICBwcmlvcml0eTogMFxuICAsIHR5cGU6IGtleVxuICAsIHRlcm1pbmFsOiBmYWxzZVxuICAsIHJlcGxhY2U6IGZhbHNlXG4gICwgdXBkYXRlOiB1dGlscy5ub29wXG4gICwgaW5pdDogdXRpbHMubm9vcFxuICAsIHRlYXJEb3duOiB1dGlscy5ub29wXG4gIH0sIG9wdHMpO1xufVxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBhdHRyUG9zdFJlZyA9IC9cXD8kLztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIGlmKHRoaXMuZGlyTmFtZSA9PT0gdGhpcy50eXBlKSB7Ly9hdHRyIGJpbmRpbmdcbiAgICAgIHRoaXMuYXR0cnMgPSB7fTtcbiAgICB9ZWxzZSB7XG4gICAgICBpZihhdHRyUG9zdFJlZy50ZXN0KHRoaXMuZGlyTmFtZSkpIHsvLyBzb21lQXR0cj8gY29uZGl0aW9uIGJpbmRpbmdcbiAgICAgICAgdGhpcy5kaXJOYW1lID0gdGhpcy5kaXJOYW1lLnJlcGxhY2UoYXR0clBvc3RSZWcsICcnKTtcbiAgICAgICAgdGhpcy5jb25kaXRpb25hbEF0dHIgPSB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuLCB1cGRhdGU6IGZ1bmN0aW9uKHZhbCkge1xuICAgIGlmKHRoaXMuZGlyTmFtZSA9PT0gdGhpcy50eXBlKSB7XG4gICAgICBmb3IodmFyIGF0dHIgaW4gdmFsKSB7XG4gICAgICAgIHNldEF0dHIodGhpcy5lbCwgYXR0ciwgdmFsW2F0dHJdKTtcbiAgICAgICAgaWYodmFsW2F0dHJdKSB7XG4gICAgICAgICAgZGVsZXRlIHRoaXMuYXR0cnNbYXR0cl07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvcih2YXIgYXR0ciBpbiB0aGlzLmF0dHJzKSB7XG4gICAgICAgIHRoaXMuZWwucmVtb3ZlQXR0cmlidXRlKGF0dHIpO1xuICAgICAgfVxuICAgICAgdGhpcy5hdHRycyA9IHZhbDtcbiAgICB9ZWxzZXtcbiAgICAgIGlmKHRoaXMuY29uZGl0aW9uYWxBdHRyKSB7XG4gICAgICAgIHZhbCA/IHNldEF0dHIodGhpcy5lbCwgdGhpcy5kaXJOYW1lLCB2YWwpIDogdGhpcy5lbC5yZW1vdmVBdHRyaWJ1dGUodGhpcy5kaXJOYW1lKTtcbiAgICAgIH1lbHNle1xuICAgICAgICB0aGlzLnRleHRNYXBbdGhpcy5wb3NpdGlvbl0gPSB2YWwgJiYgKHZhbCArICcnKTtcbiAgICAgICAgc2V0QXR0cih0aGlzLmVsLCB0aGlzLmRpck5hbWUsIHRoaXMudGV4dE1hcC5qb2luKCcnKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG5cbi8vSUUg5rWP6KeI5Zmo5b6I5aSa5bGe5oCn6YCa6L+HIGBzZXRBdHRyaWJ1dGVgIOiuvue9ruWQjuaXoOaViC4gXG4vL+i/meS6m+mAmui/hyBgZWxbYXR0cl0gPSB2YWx1ZWAg6K6+572u55qE5bGe5oCn5Y206IO95aSf6YCa6L+HIGByZW1vdmVBdHRyaWJ1dGVgIOa4hemZpC5cbmZ1bmN0aW9uIHNldEF0dHIoZWwsIGF0dHIsIHZhbCl7XG4gIHRyeXtcbiAgICBpZigoKGF0dHIgaW4gZWwpIHx8IGF0dHIgPT09ICdjbGFzcycpKXtcbiAgICAgIGlmKGF0dHIgPT09ICdzdHlsZScgJiYgZWwuc3R5bGUuc2V0QXR0cmlidXRlKXtcbiAgICAgICAgZWwuc3R5bGUuc2V0QXR0cmlidXRlKCdjc3NUZXh0JywgdmFsKTtcbiAgICAgIH1lbHNlIGlmKGF0dHIgPT09ICdjbGFzcycpe1xuICAgICAgICBlbC5jbGFzc05hbWUgPSB2YWw7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgZWxbYXR0cl0gPSB0eXBlb2YgZWxbYXR0cl0gPT09ICdib29sZWFuJyA/IHRydWUgOiB2YWw7XG4gICAgICB9XG4gICAgfVxuICB9Y2F0Y2goZSl7fVxuICB0cnl7XG4gICAgLy9jaHJvbWUgc2V0YXR0cmlidXRlIHdpdGggYHt7fX1gIHdpbGwgdGhyb3cgYW4gZXJyb3JcbiAgICBlbC5zZXRBdHRyaWJ1dGUoYXR0ciwgdmFsKTtcbiAgfWNhdGNoKGUpeyBjb25zb2xlLndhcm4oZSkgfVxufSIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgZG9jID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQuanMnKTtcblxudmFyIGRpcnMgPSB7fTtcblxuXG5kaXJzLnRleHQgPSB7XG4gIHRlcm1pbmFsOiB0cnVlXG4sIHJlcGxhY2U6IGZ1bmN0aW9uKCkgeyByZXR1cm4gZG9jLmNyZWF0ZVRleHROb2RlKCcnKSB9XG4sIHVwZGF0ZTogZnVuY3Rpb24odmFsKSB7XG4gICAgdGhpcy5ub2RlLm5vZGVWYWx1ZSA9IHZhbDtcbiAgfVxufTtcblxuXG5kaXJzLmh0bWwgPSB7XG4gIHRlcm1pbmFsOiB0cnVlXG4sIHJlcGxhY2U6IHRydWVcbiwgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5ub2RlcyA9IFtdO1xuICB9XG4sIHVwZGF0ZTogZnVuY3Rpb24odmFsKSB7XG4gICAgdmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZWwuaW5uZXJIVE1MID0gdmFsO1xuICAgIFxuICAgIHZhciBub2RlO1xuICAgIHdoaWxlKG5vZGUgPSB0aGlzLm5vZGVzLnBvcCgpKSB7XG4gICAgICBub2RlLnBhcmVudE5vZGUgJiYgbm9kZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKG5vZGUpO1xuICAgIH1cbiAgICBcbiAgICB2YXIgbm9kZXMgPSBlbC5jaGlsZE5vZGVzO1xuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBub2Rlcy5sZW5ndGg7IGkgPCBsOyBpICsrKSB7XG4gICAgICB0aGlzLm5vZGVzLnB1c2gobm9kZXNbaV0pXG4gICAgICB0aGlzLmVsLmluc2VydEJlZm9yZSh0aGlzLm5vZGVzW2ldLCB0aGlzLm5vZGUpO1xuICAgIH1cbiAgfVxufTtcbiAgXG4gIFxuZGlycy5yZXBlYXQgPSB7XG4gIHByaW9yaXR5OiAxMDAwMFxuLCB0ZXJtaW5hbDogdHJ1ZVxufTtcbiAgXG5kaXJzWydpZiddID0ge1xuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICB2YXIgcGFyZW50ID0gdGhpcy5wYXJlbnQgPSB0aGlzLmVsLnBhcmVudE5vZGU7XG4gICAgdGhpcy5hbmNob3IgPSBkb2MuY3JlYXRlQ29tbWVudCh0aGlzLnR5cGUgKyAnID0gJyArIHRoaXMucGF0aClcbiAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKHRoaXMuYW5jaG9yLCB0aGlzLmVsKTtcbiAgICBwYXJlbnQucmVtb3ZlQ2hpbGQodGhpcy5lbCk7XG4gIH1cbiwgdXBkYXRlOiBmdW5jdGlvbih2YWwpIHtcbiAgICBpZih2YWwpIHtcbiAgICAgIGlmKCF0aGlzLnN0YXRlKSB7IHRoaXMucGFyZW50Lmluc2VydEJlZm9yZSh0aGlzLmVsLCB0aGlzLmFuY2hvcik7IH1cbiAgICB9ZWxzZXtcbiAgICAgIGlmKHRoaXMuc3RhdGUpIHsgdGhpcy5wYXJlbnQucmVtb3ZlQ2hpbGQodGhpcy5lbCk7IH1cbiAgICB9XG4gICAgdGhpcy5zdGF0ZSA9IHZhbDtcbiAgfVxufTtcbiAgXG5kaXJzLmF0dHIgPSByZXF1aXJlKCcuL2F0dHIuanMnKTtcbmRpcnMubW9kZWwgPSByZXF1aXJlKCcuL21vZGVsLmpzJylcbiAgXG5kaXJzLnBhcnRpYWwgPSB7XG4gIHRlcm1pbmFsOiB0cnVlXG4sIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIDtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBkaXJzOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgdGVtaW5hbDogdHJ1ZVxuLCBwcmlvcml0eTogMVxuLCBpbml0OiBmdW5jdGlvbih2bSkge1xuICAgIHZhciBrZXlQYXRoID0gdGhpcy5wYXRoO1xuICAgIFxuICAgIGlmKCFrZXlQYXRoKSB7IHJldHVybiBmYWxzZTsgfVxuICAgIFxuICAgIHZhciBlbCA9IHRoaXMuZWxcbiAgICAgICwgZXYgPSAnY2hhbmdlJ1xuICAgICAgLCBhdHRyLCB2YWx1ZSA9IGF0dHIgPSAndmFsdWUnXG4gICAgICAsIGFudCA9IHZtLiRyb290LiRhbnRcbiAgICAgICwgY3VyID0gdm0uJGdldFZNKGtleVBhdGgpXG4gICAgICAsIGlzU2V0RGVmYXV0ID0gdXRpbHMuaXNVbmRlZmluZWQoYW50LmdldChjdXIuJGdldEtleVBhdGgoKSkpLy/nlYzpnaLnmoTliJ3lp4vlgLzkuI3kvJropobnm5YgbW9kZWwg55qE5Yid5aeL5YC8XG4gICAgICAsIGNybGYgPSAvXFxyXFxuL2cvL0lFIDgg5LiLIHRleHRhcmVhIOS8muiHquWKqOWwhiBcXG4g5o2i6KGM56ym5o2i5oiQIFxcclxcbi4g6ZyA6KaB5bCG5YW25pu/5o2i5Zue5p2lXG4gICAgICAsIGNhbGxiYWNrID0gZnVuY3Rpb24odmFsKSB7XG4gICAgICAgICAgLy/miafooYzov5nph4znmoTml7blgJksIOW+iOWPr+iDvSByZW5kZXIg6L+Y5pyq5omn6KGMLiB2bS4kZ2V0RGF0YShrZXlQYXRoKSDmnKrlrprkuYksIOS4jeiDvei/lOWbnuaWsOiuvue9rueahOWAvFxuICAgICAgICAgIHZhciBuZXdWYWwgPSAodmFsIHx8IHZtLiRnZXREYXRhKGtleVBhdGgpIHx8ICcnKSArICcnXG4gICAgICAgICAgICAsIHZhbCA9IGVsW2F0dHJdXG4gICAgICAgICAgICA7XG4gICAgICAgICAgdmFsICYmIHZhbC5yZXBsYWNlICYmICh2YWwgPSB2YWwucmVwbGFjZShjcmxmLCAnXFxuJykpO1xuICAgICAgICAgIGlmKG5ld1ZhbCAhPT0gdmFsKXsgZWxbYXR0cl0gPSBuZXdWYWw7IH1cbiAgICAgICAgfVxuICAgICAgLCBoYW5kbGVyID0gZnVuY3Rpb24oaXNJbml0KSB7XG4gICAgICAgICAgdmFyIHZhbCA9IGVsW3ZhbHVlXTtcbiAgICAgICAgICBcbiAgICAgICAgICB2YWwucmVwbGFjZSAmJiAodmFsID0gdmFsLnJlcGxhY2UoY3JsZiwgJ1xcbicpKTtcbiAgICAgICAgICBhbnQuc2V0KGN1ci4kZ2V0S2V5UGF0aCgpLCB2YWwsIHtpc0J1YmJsZTogaXNJbml0ICE9PSB0cnVlfSk7XG4gICAgICAgIH1cbiAgICAgICwgY2FsbEhhbmRsZXIgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgaWYoZSAmJiBlLnByb3BlcnR5TmFtZSAmJiBlLnByb3BlcnR5TmFtZSAhPT0gYXR0cikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbiAgICAgICAgfVxuICAgICAgLCBpZSA9IHV0aWxzLmllXG4gICAgICA7XG4gICAgXG4gICAgc3dpdGNoKGVsLnRhZ05hbWUpIHtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHZhbHVlID0gYXR0ciA9ICdpbm5lckhUTUwnO1xuICAgICAgICAvL2V2ICs9ICcgYmx1cic7XG4gICAgICBjYXNlICdJTlBVVCc6XG4gICAgICBjYXNlICdURVhUQVJFQSc6XG4gICAgICAgIHN3aXRjaChlbC50eXBlKSB7XG4gICAgICAgICAgY2FzZSAnY2hlY2tib3gnOlxuICAgICAgICAgICAgdmFsdWUgPSBhdHRyID0gJ2NoZWNrZWQnO1xuICAgICAgICAgICAgLy9JRTYsIElFNyDkuIvnm5HlkKwgcHJvcGVydHljaGFuZ2Ug5Lya5oyCP1xuICAgICAgICAgICAgaWYoaWUpIHsgZXYgKz0gJyBjbGljayc7IH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdyYWRpbyc6XG4gICAgICAgICAgICBhdHRyID0gJ2NoZWNrZWQnO1xuICAgICAgICAgICAgaWYoaWUpIHsgZXYgKz0gJyBjbGljayc7IH1cbiAgICAgICAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIGVsLmNoZWNrZWQgPSBlbC52YWx1ZSA9PT0gdm0uJGdldERhdGEoa2V5UGF0aCkgKyAnJztcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpc1NldERlZmF1dCA9IGVsLmNoZWNrZWQ7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIGlmKCFhbnQub3B0aW9ucy5sYXp5KXtcbiAgICAgICAgICAgICAgaWYoJ29uaW5wdXQnIGluIGVsKXtcbiAgICAgICAgICAgICAgICBldiArPSAnIGlucHV0JztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvL0lFIOS4i+eahCBpbnB1dCDkuovku7bmm7/ku6NcbiAgICAgICAgICAgICAgaWYoaWUpIHtcbiAgICAgICAgICAgICAgICBldiArPSAnIGtleXVwIHByb3BlcnR5Y2hhbmdlIGN1dCc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdTRUxFQ1QnOlxuICAgICAgICBpZihlbC5tdWx0aXBsZSl7XG4gICAgICAgICAgaGFuZGxlciA9IGZ1bmN0aW9uKGlzSW5pdCkge1xuICAgICAgICAgICAgdmFyIHZhbHMgPSBbXTtcbiAgICAgICAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSBlbC5vcHRpb25zLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICAgICAgICAgIGlmKGVsLm9wdGlvbnNbaV0uc2VsZWN0ZWQpeyB2YWxzLnB1c2goZWwub3B0aW9uc1tpXS52YWx1ZSkgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYW50LnNldChjdXIuJGdldEtleVBhdGgoKSwgdmFscywge2lzQnViYmxlOiBpc0luaXQgIT09IHRydWV9KTtcbiAgICAgICAgICB9O1xuICAgICAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciB2YWxzID0gdm0uJGdldERhdGEoa2V5UGF0aCk7XG4gICAgICAgICAgICBpZih2YWxzICYmIHZhbHMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgZm9yKHZhciBpID0gMCwgbCA9IGVsLm9wdGlvbnMubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgICAgICAgICAgICBlbC5vcHRpb25zW2ldLnNlbGVjdGVkID0gdmFscy5pbmRleE9mKGVsLm9wdGlvbnNbaV0udmFsdWUpICE9PSAtMTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgLy9pc1NldERlZmF1dCA9IGlzU2V0RGVmYXV0ICYmICFoYXNUb2tlbihlbFt2YWx1ZV0pO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIFxuICAgIHRoaXMudXBkYXRlID0gY2FsbGJhY2s7XG4gICAgXG4gICAgZXYuc3BsaXQoL1xccysvZykuZm9yRWFjaChmdW5jdGlvbihlKXtcbiAgICAgIHJlbW92ZUV2ZW50KGVsLCBlLCBjYWxsSGFuZGxlcik7XG4gICAgICBhZGRFdmVudChlbCwgZSwgY2FsbEhhbmRsZXIpO1xuICAgIH0pO1xuICAgIFxuICAgIC8v5qC55o2u6KGo5Y2V5YWD57Sg55qE5Yid5aeL5YyW6buY6K6k5YC86K6+572u5a+55bqUIG1vZGVsIOeahOWAvFxuICAgIGlmKGVsW3ZhbHVlXSAmJiBpc1NldERlZmF1dCl7XG4gICAgICAgaGFuZGxlcih0cnVlKTsgXG4gICAgfVxuICAgICAgXG4gIH1cbn07XG5cbmZ1bmN0aW9uIGFkZEV2ZW50KGVsLCBldmVudCwgaGFuZGxlcikge1xuICBpZihlbC5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgZWwuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgaGFuZGxlciwgZmFsc2UpO1xuICB9ZWxzZXtcbiAgICBlbC5hdHRhY2hFdmVudCgnb24nICsgZXZlbnQsIGhhbmRsZXIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUV2ZW50KGVsLCBldmVudCwgaGFuZGxlcikge1xuICBpZihlbC5yZW1vdmVFdmVudExpc3RlbmVyKSB7XG4gICAgZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudCwgaGFuZGxlcik7XG4gIH1lbHNle1xuICAgIGVsLmRldGFjaEV2ZW50KCdvbicgKyBldmVudCwgaGFuZGxlcik7XG4gIH1cbn0iLCIoZnVuY3Rpb24ocm9vdCl7XG4gIFwidXNlIHN0cmljdFwiO1xuXG4gIG1vZHVsZS5leHBvcnRzID0gcm9vdC5kb2N1bWVudCB8fCByZXF1aXJlKCdqc2RvbScpLmpzZG9tKCk7XG5cbn0pKChmdW5jdGlvbigpIHtyZXR1cm4gdGhpc30pKCkpOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgb3BlcmF0b3JzID0ge1xuICAndW5hcnknOiB7XG4gICAgJysnOiBmdW5jdGlvbih2KSB7IHJldHVybiArdjsgfVxuICAsICctJzogZnVuY3Rpb24odikgeyByZXR1cm4gLXY7IH1cbiAgLCAnISc6IGZ1bmN0aW9uKHYpIHsgcmV0dXJuICF2OyB9XG4gICAgXG4gICwgJ1snOiBmdW5jdGlvbih2KXsgcmV0dXJuIHY7IH1cbiAgLCAneyc6IGZ1bmN0aW9uKHYpe1xuICAgICAgdmFyIHIgPSB7fTtcbiAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSB2Lmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICByW3ZbaV1bMF1dID0gdltpXVsxXTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByO1xuICAgIH1cbiAgLCAndHlwZW9mJzogZnVuY3Rpb24odil7IHJldHVybiB0eXBlb2YgdjsgfVxuICAsICduZXcnOiBmdW5jdGlvbih2KXsgcmV0dXJuIG5ldyB2IH1cbiAgfVxuICBcbiwgJ2JpbmFyeSc6IHtcbiAgICAnKyc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgKyByOyB9XG4gICwgJy0nOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsIC0gcjsgfVxuICAsICcqJzogZnVuY3Rpb24obCwgcikgeyByZXR1cm4gbCAqIHI7IH1cbiAgLCAnLyc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgLyByOyB9XG4gICwgJyUnOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsICUgcjsgfVxuICAsICc8JzogZnVuY3Rpb24obCwgcikgeyByZXR1cm4gbCA8IHI7IH1cbiAgLCAnPic6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgPiByOyB9XG4gICwgJzw9JzogZnVuY3Rpb24obCwgcikgeyByZXR1cm4gbCA8PSByOyB9XG4gICwgJz49JzogZnVuY3Rpb24obCwgcikgeyByZXR1cm4gbCA+PSByOyB9XG4gICwgJz09JzogZnVuY3Rpb24obCwgcikgeyByZXR1cm4gbCA9PSByOyB9XG4gICwgJyE9JzogZnVuY3Rpb24obCwgcikgeyByZXR1cm4gbCAhPSByOyB9XG4gICwgJz09PSc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgPT09IHI7IH1cbiAgLCAnIT09JzogZnVuY3Rpb24obCwgcikgeyByZXR1cm4gbCAhPT0gcjsgfVxuICAsICcmJic6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgJiYgcjsgfVxuICAsICd8fCc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgfHwgcjsgfVxuICAgIFxuICAsICcuJzogZnVuY3Rpb24obCwgcikge1xuICAgICAgaWYocil7XG4gICAgICAgIHBhdGggPSBwYXRoICsgJy4nICsgcjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBsW3JdO1xuICAgIH1cbiAgLCAnWyc6IGZ1bmN0aW9uKGwsIHIpIHtcbiAgICAgIGlmKHIpe1xuICAgICAgICBwYXRoID0gcGF0aCArICcuJyArIHI7XG4gICAgICB9XG4gICAgICByZXR1cm4gbFtyXTtcbiAgICB9XG4gICwgJygnOiBmdW5jdGlvbihsLCByKXsgcmV0dXJuIGwuYXBwbHkobnVsbCwgcikgfVxuICAgIFxuICAsICd8JzogZnVuY3Rpb24obCwgcil7IHJldHVybiByLmNhbGwobnVsbCwgbCkgfS8vZmlsdGVyLiBuYW1lfGZpbHRlclxuICAsICdpbic6IGZ1bmN0aW9uKGwsIHIpe1xuICAgICAgaWYodGhpcy5hc3NpZ25tZW50KSB7XG4gICAgICAgIC8vcmVwZWF0XG4gICAgICAgIGRlbGV0ZSBzdW1tYXJ5LmxvY2Fsc1tsXTtcbiAgICAgICAgc3VtbWFyeS5hc3NpZ25tZW50c1tsXSA9IHRydWU7XG4gICAgICAgIHJldHVybiByO1xuICAgICAgfWVsc2V7XG4gICAgICAgIHJldHVybiBsIGluIHI7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIFxuLCAndGVybmFyeSc6IHtcbiAgICAnPyc6IGZ1bmN0aW9uKGYsIHMsIHQpIHsgcmV0dXJuIGYgPyBzIDogdDsgfVxuICAsICcoJzogZnVuY3Rpb24oZiwgcywgdCkgeyByZXR1cm4gZltzXS5hcHBseShmLCB0KSB9XG4gIFxuICAvL2ZpbHRlci4gbmFtZSB8IGZpbHRlciA6IGFyZzIgOiBhcmczXG4gICwgJ3wnOiBmdW5jdGlvbihmLCBzLCB0KXsgcmV0dXJuIHMuYXBwbHkobnVsbCwgW2ZdLmNvbmNhdCh0KSk7IH1cbiAgfVxufTtcblxudmFyIGFyZ05hbWUgPSBbJ2ZpcnN0JywgJ3NlY29uZCcsICd0aGlyZCddXG4gICwgY29udGV4dCwgc3VtbWFyeVxuICAsIHBhdGhcbiAgO1xuXG4vL+mBjeWOhiBhc3RcbnZhciBldmFsdWF0ZSA9IGZ1bmN0aW9uKHRyZWUpIHtcbiAgdmFyIGFyaXR5ID0gdHJlZS5hcml0eVxuICAgICwgdmFsdWUgPSB0cmVlLnZhbHVlXG4gICAgLCBhcmdzID0gW11cbiAgICAsIG4gPSAwXG4gICAgLCBhcmdcbiAgICAsIHJlc1xuICAgIDtcbiAgXG4gIC8v5pON5L2c56ym5pyA5aSa5Y+q5pyJ5LiJ5YWDXG4gIGZvcig7IG4gPCAzOyBuKyspe1xuICAgIGFyZyA9IHRyZWVbYXJnTmFtZVtuXV07XG4gICAgaWYoYXJnKXtcbiAgICAgIGlmKEFycmF5LmlzQXJyYXkoYXJnKSl7XG4gICAgICAgIGFyZ3Nbbl0gPSBbXTtcbiAgICAgICAgZm9yKHZhciBpID0gMCwgbCA9IGFyZy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgICAgIGFyZ3Nbbl0ucHVzaCh0eXBlb2YgYXJnW2ldLmtleSA9PT0gJ3VuZGVmaW5lZCcgPyBcbiAgICAgICAgICAgIGV2YWx1YXRlKGFyZ1tpXSkgOiBbYXJnW2ldLmtleSwgZXZhbHVhdGUoYXJnW2ldKV0pO1xuICAgICAgICB9XG4gICAgICB9ZWxzZXtcbiAgICAgICAgYXJnc1tuXSA9IGV2YWx1YXRlKGFyZyk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIFxuICBpZihhcml0eSAhPT0gJ2xpdGVyYWwnKSB7XG4gICAgaWYocGF0aCAmJiB2YWx1ZSAhPT0gJy4nICYmIHZhbHVlICE9PSAnWycpIHtcbiAgICAgIHN1bW1hcnkucGF0aHNbcGF0aF0gPSB0cnVlO1xuICAgIH1cbiAgICBpZihhcml0eSA9PT0gJ25hbWUnKSB7XG4gICAgICBwYXRoID0gdmFsdWU7XG4gICAgfVxuICB9XG4gIFxuICBzd2l0Y2goYXJpdHkpe1xuICAgIGNhc2UgJ3VuYXJ5JzogXG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICd0ZXJuYXJ5JzpcbiAgICAgIHRyeXtcbiAgICAgICAgcmVzID0gZ2V0T3BlcmF0b3IoYXJpdHksIHZhbHVlKS5hcHBseSh0cmVlLCBhcmdzKTtcbiAgICAgIH1jYXRjaChlKXtcbiAgICAgICAgLy9jb25zb2xlLmRlYnVnKGUpO1xuICAgICAgfVxuICAgIGJyZWFrO1xuICAgIGNhc2UgJ2xpdGVyYWwnOlxuICAgICAgcmVzID0gdmFsdWU7XG4gICAgYnJlYWs7XG4gICAgY2FzZSAnbmFtZSc6XG4gICAgICBzdW1tYXJ5LmxvY2Fsc1t2YWx1ZV0gPSB0cnVlO1xuICAgICAgcmVzID0gY29udGV4dC5sb2NhbHNbdmFsdWVdO1xuICAgIGJyZWFrO1xuICAgIGNhc2UgJ2ZpbHRlcic6XG4gICAgICBzdW1tYXJ5LmZpbHRlcnNbdmFsdWVdID0gdHJ1ZTtcbiAgICAgIHJlcyA9IGNvbnRleHQuZmlsdGVyc1t2YWx1ZV07XG4gICAgYnJlYWs7XG4gICAgY2FzZSAndGhpcyc6XG4gICAgICByZXMgPSBjb250ZXh0LmxvY2FscztcbiAgICBicmVhaztcbiAgfVxuICByZXR1cm4gcmVzO1xufTtcblxuZnVuY3Rpb24gZ2V0T3BlcmF0b3IoYXJpdHksIHZhbHVlKXtcbiAgcmV0dXJuIG9wZXJhdG9yc1thcml0eV1bdmFsdWVdIHx8IGZ1bmN0aW9uKCkgeyByZXR1cm47IH1cbn1cblxuZnVuY3Rpb24gcmVzZXQoX2NvbnRleHQpIHtcbiAgaWYoX2NvbnRleHQpIHtcbiAgICBjb250ZXh0ID0ge2xvY2FsczogX2NvbnRleHQubG9jYWxzIHx8IHt9LCBmaWx0ZXJzOiBfY29udGV4dC5maWx0ZXJzIHx8IHt9fTtcbiAgfWVsc2V7XG4gICAgY29udGV4dCA9IHtmaWx0ZXJzOiB7fSwgbG9jYWxzOiB7fX07XG4gIH1cbiAgXG4gIHN1bW1hcnkgPSB7ZmlsdGVyczoge30sIGxvY2Fsczoge30sIHBhdGhzOiB7fSwgYXNzaWdubWVudHM6IHt9fTtcbiAgcGF0aCA9ICcnO1xufVxuXG4vL+ihqOi+vuW8j+axguWAvFxuLy90cmVlOiBwYXJzZXIg55Sf5oiQ55qEIGFzdFxuLy9jb250ZXh0OiDooajovr7lvI/miafooYznmoTnjq/looNcbi8vY29udGV4dC5sb2NhbHM6IOWPmOmHj1xuLy9jb250ZXh0LmZpbHRlcnM6IOi/h+a7pOWZqOWHveaVsFxuZXhwb3J0cy5ldmFsID0gZnVuY3Rpb24odHJlZSwgX2NvbnRleHQpIHtcbiAgcmVzZXQoX2NvbnRleHQgfHwge30pO1xuICBcbiAgcmV0dXJuIGV2YWx1YXRlKHRyZWUpO1xufTtcblxuLy/ooajovr7lvI/mkZjopoFcbmV4cG9ydHMuc3VtbWFyeSA9IGZ1bmN0aW9uKHRyZWUpIHtcbiAgcmVzZXQoKTtcbiAgXG4gIGV2YWx1YXRlKHRyZWUpO1xuICBcbiAgaWYocGF0aCkge1xuICAgIHN1bW1hcnkucGF0aHNbcGF0aF0gPSB0cnVlO1xuICB9XG4gIGZvcih2YXIga2V5IGluIHN1bW1hcnkpIHtcbiAgICBzdW1tYXJ5W2tleV0gPSBPYmplY3Qua2V5cyhzdW1tYXJ5W2tleV0pO1xuICB9XG4gIHJldHVybiBzdW1tYXJ5O1xufTsiLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbnZhciBFdmVudCA9IHtcbiAgLy/nm5HlkKzoh6rlrprkuYnkuovku7YuXG4gIG9uOiBmdW5jdGlvbihuYW1lLCBoYW5kbGVyLCBjb250ZXh0KSB7XG4gICAgdmFyIGN0eCA9IGNvbnRleHQgfHwgdGhpc1xuICAgICAgO1xuICAgICAgXG4gICAgY3R4Ll9oYW5kbGVycyA9IGN0eC5faGFuZGxlcnMgfHwge307XG4gICAgY3R4Ll9oYW5kbGVyc1tuYW1lXSA9IGN0eC5faGFuZGxlcnNbbmFtZV0gfHwgW107XG4gICAgXG4gICAgY3R4Ll9oYW5kbGVyc1tuYW1lXS5wdXNoKHtoYW5kbGVyOiBoYW5kbGVyLCBjb250ZXh0OiBjb250ZXh0LCBjdHg6IGN0eH0pO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICAvL+enu+mZpOebkeWQrOS6i+S7ti5cbiAgb2ZmOiBmdW5jdGlvbihuYW1lLCBoYW5kbGVyLCBjb250ZXh0KSB7XG4gICAgdmFyIGN0eCA9IGNvbnRleHQgfHwgdGhpc1xuICAgICAgLCBoYW5kbGVycyA9IGN0eC5faGFuZGxlcnNcbiAgICAgIDtcbiAgICAgIFxuICAgIGlmKG5hbWUgJiYgaGFuZGxlcnNbbmFtZV0pe1xuICAgICAgaWYodXRpbHMuaXNGdW5jdGlvbihoYW5kbGVyKSl7XG4gICAgICAgIGZvcih2YXIgaSA9IGhhbmRsZXJzW25hbWVdLmxlbmd0aCAtIDE7IGkgPj0wOyBpLS0pIHtcbiAgICAgICAgICBpZihoYW5kbGVyc1tuYW1lXVtpXS5oYW5kbGVyID09PSBoYW5kbGVyKXtcbiAgICAgICAgICAgIGhhbmRsZXJzW25hbWVdLnNwbGljZShpLCAxKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1lbHNle1xuICAgICAgICBoYW5kbGVyc1tuYW1lXSA9IFtdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgLy/op6blj5Hoh6rlrprkuYnkuovku7YuIFxuICAvL+ivpeaWueazleayoeacieaPkOS+m+mdmeaAgeWMlueahCBjb250ZXh0IOWPguaVsC4g5aaC6KaB6Z2Z5oCB5YyW5L2/55SoLCDlupTor6U6IGBFdmVudC50cmlnZ2VyLmNhbGwoY29udGV4dCwgbmFtZSwgZGF0YSlgXG4gIHRyaWdnZXI6IGZ1bmN0aW9uKG5hbWUsIGRhdGEpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXNcbiAgICAgICwgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKVxuICAgICAgLCBoYW5kbGVycyA9IHRoYXQuX2hhbmRsZXJzXG4gICAgICA7XG4gICAgICBcbiAgICBpZihoYW5kbGVycyAmJiBoYW5kbGVyc1tuYW1lXSl7XG4gICAgICBoYW5kbGVyc1tuYW1lXS5mb3JFYWNoKGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5oYW5kbGVyLmFwcGx5KHRoYXQsIGFyZ3MpXG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRXZlbnQ7IiwiXCJ1c2Ugc3RyaWN0XCI7XG4vL0phdmFzY3JpcHQgZXhwcmVzc2lvbiBwYXJzZXIgbW9kaWZpZWQgZm9ybSBDcm9ja2ZvcmQncyBURE9QIHBhcnNlclxudmFyIGNyZWF0ZSA9IE9iamVjdC5jcmVhdGUgfHwgZnVuY3Rpb24gKG8pIHtcbiAgZnVuY3Rpb24gRigpIHt9XG4gIEYucHJvdG90eXBlID0gbztcbiAgcmV0dXJuIG5ldyBGKCk7XG59O1xuXG52YXIgZXJyb3IgPSBmdW5jdGlvbiAobWVzc2FnZSwgdCkge1xuICAgIHQgPSB0IHx8IHRoaXM7XG4gICAgdC5uYW1lID0gXCJTeW50YXhFcnJvclwiO1xuICAgIHQubWVzc2FnZSA9IG1lc3NhZ2U7XG4gICAgdGhyb3cgdDtcbn07XG5cbnZhciBub29wID0gZnVuY3Rpb24oKSB7fTtcblxudmFyIHRva2VuaXplID0gZnVuY3Rpb24gKGNvZGUsIHByZWZpeCwgc3VmZml4KSB7XG4gICAgdmFyIGM7ICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZSBjdXJyZW50IGNoYXJhY3Rlci5cbiAgICB2YXIgZnJvbTsgICAgICAgICAgICAgICAgICAgLy8gVGhlIGluZGV4IG9mIHRoZSBzdGFydCBvZiB0aGUgdG9rZW4uXG4gICAgdmFyIGkgPSAwOyAgICAgICAgICAgICAgICAgIC8vIFRoZSBpbmRleCBvZiB0aGUgY3VycmVudCBjaGFyYWN0ZXIuXG4gICAgdmFyIGxlbmd0aCA9IGNvZGUubGVuZ3RoO1xuICAgIHZhciBuOyAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgbnVtYmVyIHZhbHVlLlxuICAgIHZhciBxOyAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgcXVvdGUgY2hhcmFjdGVyLlxuICAgIHZhciBzdHI7ICAgICAgICAgICAgICAgICAgICAvLyBUaGUgc3RyaW5nIHZhbHVlLlxuXG4gICAgdmFyIHJlc3VsdCA9IFtdOyAgICAgICAgICAgIC8vIEFuIGFycmF5IHRvIGhvbGQgdGhlIHJlc3VsdHMuXG5cbiAgICAvLyBNYWtlIGEgdG9rZW4gb2JqZWN0LlxuICAgIHZhciBtYWtlID0gZnVuY3Rpb24gKHR5cGUsIHZhbHVlKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiB0eXBlLFxuICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgZnJvbTogZnJvbSxcbiAgICAgICAgICAgIHRvOiBpXG4gICAgICAgIH07XG4gICAgfTtcblxuLy8gQmVnaW4gdG9rZW5pemF0aW9uLiBJZiB0aGUgc291cmNlIHN0cmluZyBpcyBlbXB0eSwgcmV0dXJuIG5vdGhpbmcuXG5cbiAgICBpZiAoIWNvZGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuLy8gSWYgcHJlZml4IGFuZCBzdWZmaXggc3RyaW5ncyBhcmUgbm90IHByb3ZpZGVkLCBzdXBwbHkgZGVmYXVsdHMuXG5cbiAgICBpZiAodHlwZW9mIHByZWZpeCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgcHJlZml4ID0gJzw+Ky0mJztcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBzdWZmaXggIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHN1ZmZpeCA9ICc9PiY6JztcbiAgICB9XG5cblxuLy8gTG9vcCB0aHJvdWdoIGNvZGUgdGV4dCwgb25lIGNoYXJhY3RlciBhdCBhIHRpbWUuXG5cbiAgICBjID0gY29kZS5jaGFyQXQoaSk7XG4gICAgd2hpbGUgKGMpIHtcbiAgICAgICAgZnJvbSA9IGk7XG4gICAgICAgIFxuICAgICAgICBpZiAoYyA8PSAnICcpIHsvLyBJZ25vcmUgd2hpdGVzcGFjZS5cbiAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgIGMgPSBjb2RlLmNoYXJBdChpKTtcbiAgICAgICAgfSBlbHNlIGlmICgoYyA+PSAnYScgJiYgYyA8PSAneicpIHx8IChjID49ICdBJyAmJiBjIDw9ICdaJykgfHwgYyA9PT0gJyQnIHx8IGMgPT09ICdfJykgey8vIG5hbWUuXG4gICAgICAgICAgICBzdHIgPSBjO1xuICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgZm9yICg7Oykge1xuICAgICAgICAgICAgICAgIGMgPSBjb2RlLmNoYXJBdChpKTtcbiAgICAgICAgICAgICAgICBpZiAoKGMgPj0gJ2EnICYmIGMgPD0gJ3onKSB8fCAoYyA+PSAnQScgJiYgYyA8PSAnWicpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAoYyA+PSAnMCcgJiYgYyA8PSAnOScpIHx8IGMgPT09ICdfJykge1xuICAgICAgICAgICAgICAgICAgICBzdHIgKz0gYztcbiAgICAgICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKG1ha2UoJ25hbWUnLCBzdHIpKTtcbiAgICAgICAgfSBlbHNlIGlmIChjID49ICcwJyAmJiBjIDw9ICc5Jykge1xuICAgICAgICAvLyBudW1iZXIuXG5cbiAgICAgICAgLy8gQSBudW1iZXIgY2Fubm90IHN0YXJ0IHdpdGggYSBkZWNpbWFsIHBvaW50LiBJdCBtdXN0IHN0YXJ0IHdpdGggYSBkaWdpdCxcbiAgICAgICAgLy8gcG9zc2libHkgJzAnLlxuICAgICAgICAgICAgc3RyID0gYztcbiAgICAgICAgICAgIGkgKz0gMTtcblxuLy8gTG9vayBmb3IgbW9yZSBkaWdpdHMuXG5cbiAgICAgICAgICAgIGZvciAoOzspIHtcbiAgICAgICAgICAgICAgICBjID0gY29kZS5jaGFyQXQoaSk7XG4gICAgICAgICAgICAgICAgaWYgKGMgPCAnMCcgfHwgYyA+ICc5Jykge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgICAgIHN0ciArPSBjO1xuICAgICAgICAgICAgfVxuXG4vLyBMb29rIGZvciBhIGRlY2ltYWwgZnJhY3Rpb24gcGFydC5cblxuICAgICAgICAgICAgaWYgKGMgPT09ICcuJykge1xuICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgICAgICBzdHIgKz0gYztcbiAgICAgICAgICAgICAgICBmb3IgKDs7KSB7XG4gICAgICAgICAgICAgICAgICAgIGMgPSBjb2RlLmNoYXJBdChpKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGMgPCAnMCcgfHwgYyA+ICc5Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgICAgICAgICBzdHIgKz0gYztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbi8vIExvb2sgZm9yIGFuIGV4cG9uZW50IHBhcnQuXG5cbiAgICAgICAgICAgIGlmIChjID09PSAnZScgfHwgYyA9PT0gJ0UnKSB7XG4gICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgICAgIHN0ciArPSBjO1xuICAgICAgICAgICAgICAgIGMgPSBjb2RlLmNoYXJBdChpKTtcbiAgICAgICAgICAgICAgICBpZiAoYyA9PT0gJy0nIHx8IGMgPT09ICcrJykge1xuICAgICAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIHN0ciArPSBjO1xuICAgICAgICAgICAgICAgICAgICBjID0gY29kZS5jaGFyQXQoaSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjIDwgJzAnIHx8IGMgPiAnOScpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3IoXCJCYWQgZXhwb25lbnRcIiwgbWFrZSgnbnVtYmVyJywgc3RyKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgICAgICAgICBzdHIgKz0gYztcbiAgICAgICAgICAgICAgICAgICAgYyA9IGNvZGUuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgIH0gd2hpbGUgKGMgPj0gJzAnICYmIGMgPD0gJzknKTtcbiAgICAgICAgICAgIH1cblxuLy8gTWFrZSBzdXJlIHRoZSBuZXh0IGNoYXJhY3RlciBpcyBub3QgYSBsZXR0ZXIuXG5cbiAgICAgICAgICAgIGlmIChjID49ICdhJyAmJiBjIDw9ICd6Jykge1xuICAgICAgICAgICAgICAgIHN0ciArPSBjO1xuICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgICAgICBlcnJvcihcIkJhZCBudW1iZXJcIiwgbWFrZSgnbnVtYmVyJywgc3RyKSk7XG4gICAgICAgICAgICB9XG5cbi8vIENvbnZlcnQgdGhlIHN0cmluZyB2YWx1ZSB0byBhIG51bWJlci4gSWYgaXQgaXMgZmluaXRlLCB0aGVuIGl0IGlzIGEgZ29vZFxuLy8gdG9rZW4uXG5cbiAgICAgICAgICAgIG4gPSArc3RyO1xuICAgICAgICAgICAgaWYgKGlzRmluaXRlKG4pKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnB1c2gobWFrZSgnbnVtYmVyJywgbikpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBlcnJvcihcIkJhZCBudW1iZXJcIiwgbWFrZSgnbnVtYmVyJywgc3RyKSk7XG4gICAgICAgICAgICB9XG5cbi8vIHN0cmluZ1xuXG4gICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJ1xcJycgfHwgYyA9PT0gJ1wiJykge1xuICAgICAgICAgICAgc3RyID0gJyc7XG4gICAgICAgICAgICBxID0gYztcbiAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgIGZvciAoOzspIHtcbiAgICAgICAgICAgICAgICBjID0gY29kZS5jaGFyQXQoaSk7XG4gICAgICAgICAgICAgICAgaWYgKGMgPCAnICcpIHtcbiAgICAgICAgICAgICAgICAgICAgbWFrZSgnc3RyaW5nJywgc3RyKTtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3IoYyA9PT0gJ1xcbicgfHwgYyA9PT0gJ1xccicgfHwgYyA9PT0gJycgP1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJVbnRlcm1pbmF0ZWQgc3RyaW5nLlwiIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiQ29udHJvbCBjaGFyYWN0ZXIgaW4gc3RyaW5nLlwiLCBtYWtlKCcnLCBzdHIpKTtcbiAgICAgICAgICAgICAgICB9XG5cbi8vIExvb2sgZm9yIHRoZSBjbG9zaW5nIHF1b3RlLlxuXG4gICAgICAgICAgICAgICAgaWYgKGMgPT09IHEpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuXG4vLyBMb29rIGZvciBlc2NhcGVtZW50LlxuXG4gICAgICAgICAgICAgICAgaWYgKGMgPT09ICdcXFxcJykge1xuICAgICAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgIGVycm9yKFwiVW50ZXJtaW5hdGVkIHN0cmluZ1wiLCBtYWtlKCdzdHJpbmcnLCBzdHIpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjID0gY29kZS5jaGFyQXQoaSk7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoYykge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdiJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGMgPSAnXFxiJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdmJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGMgPSAnXFxmJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICduJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGMgPSAnXFxuJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdyJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGMgPSAnXFxyJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICd0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGMgPSAnXFx0JztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICd1JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IoXCJVbnRlcm1pbmF0ZWQgc3RyaW5nXCIsIG1ha2UoJ3N0cmluZycsIHN0cikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYyA9IHBhcnNlSW50KGNvZGUuc3Vic3RyKGkgKyAxLCA0KSwgMTYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpc0Zpbml0ZShjKSB8fCBjIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IoXCJVbnRlcm1pbmF0ZWQgc3RyaW5nXCIsIG1ha2UoJ3N0cmluZycsIHN0cikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYyA9IFN0cmluZy5mcm9tQ2hhckNvZGUoYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpICs9IDQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdHIgKz0gYztcbiAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICByZXN1bHQucHVzaChtYWtlKCdzdHJpbmcnLCBzdHIpKTtcbiAgICAgICAgICAgIGMgPSBjb2RlLmNoYXJBdChpKTtcblxuLy8gY29tbWVudC5cblxuICAgICAgICB9IGVsc2UgaWYgKGMgPT09ICcvJyAmJiBjb2RlLmNoYXJBdChpICsgMSkgPT09ICcvJykge1xuICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgZm9yICg7Oykge1xuICAgICAgICAgICAgICAgIGMgPSBjb2RlLmNoYXJBdChpKTtcbiAgICAgICAgICAgICAgICBpZiAoYyA9PT0gJ1xcbicgfHwgYyA9PT0gJ1xccicgfHwgYyA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgIH1cblxuLy8gY29tYmluaW5nXG5cbiAgICAgICAgfSBlbHNlIGlmIChwcmVmaXguaW5kZXhPZihjKSA+PSAwKSB7XG4gICAgICAgICAgICBzdHIgPSBjO1xuICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgICAgICBjID0gY29kZS5jaGFyQXQoaSk7XG4gICAgICAgICAgICAgICAgaWYgKGkgPj0gbGVuZ3RoIHx8IHN1ZmZpeC5pbmRleE9mKGMpIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3RyICs9IGM7XG4gICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzdWx0LnB1c2gobWFrZSgnb3BlcmF0b3InLCBzdHIpKTtcblxuLy8gc2luZ2xlLWNoYXJhY3RlciBvcGVyYXRvclxuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICByZXN1bHQucHVzaChtYWtlKCdvcGVyYXRvcicsIGMpKTtcbiAgICAgICAgICAgIGMgPSBjb2RlLmNoYXJBdChpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuXG52YXIgbWFrZV9wYXJzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3ltYm9sX3RhYmxlID0ge307XG4gICAgdmFyIHRva2VuO1xuICAgIHZhciB0b2tlbnM7XG4gICAgdmFyIHRva2VuX25yO1xuICAgIHZhciBjb250ZXh0O1xuICAgIFxuICAgIHZhciBpdHNlbGYgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICB2YXIgZmluZCA9IGZ1bmN0aW9uIChuKSB7XG4gICAgICBuLm51ZCAgICAgID0gaXRzZWxmO1xuICAgICAgbi5sZWQgICAgICA9IG51bGw7XG4gICAgICBuLnN0ZCAgICAgID0gbnVsbDtcbiAgICAgIG4ubGJwICAgICAgPSAwO1xuICAgICAgcmV0dXJuIG47XG4gICAgfTtcblxuICAgIHZhciBhZHZhbmNlID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgIHZhciBhLCBvLCB0LCB2O1xuICAgICAgICBpZiAoaWQgJiYgdG9rZW4uaWQgIT09IGlkKSB7XG4gICAgICAgICAgICBlcnJvcihcIkV4cGVjdGVkICdcIiArIGlkICsgXCInLlwiLCB0b2tlbik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRva2VuX25yID49IHRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRva2VuID0gc3ltYm9sX3RhYmxlW1wiKGVuZClcIl07XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdCA9IHRva2Vuc1t0b2tlbl9ucl07XG4gICAgICAgIHRva2VuX25yICs9IDE7XG4gICAgICAgIHYgPSB0LnZhbHVlO1xuICAgICAgICBhID0gdC50eXBlO1xuICAgICAgICBpZiAoKGEgPT09IFwib3BlcmF0b3JcIiB8fCBhICE9PSAnc3RyaW5nJykgJiYgdiBpbiBzeW1ib2xfdGFibGUpIHtcbiAgICAgICAgICAgIC8vdHJ1ZSwgZmFsc2Ug562J55u05o6l6YeP5Lmf5Lya6L+b5YWl5q2k5YiG5pSvXG4gICAgICAgICAgICBvID0gc3ltYm9sX3RhYmxlW3ZdO1xuICAgICAgICAgICAgaWYgKCFvKSB7XG4gICAgICAgICAgICAgICAgZXJyb3IoXCJVbmtub3duIG9wZXJhdG9yLlwiLCB0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChhID09PSBcIm5hbWVcIikge1xuICAgICAgICAgICAgbyA9IGZpbmQodCk7XG4gICAgICAgIH0gZWxzZSBpZiAoYSA9PT0gXCJzdHJpbmdcIiB8fCBhID09PSAgXCJudW1iZXJcIikge1xuICAgICAgICAgICAgbyA9IHN5bWJvbF90YWJsZVtcIihsaXRlcmFsKVwiXTtcbiAgICAgICAgICAgIGEgPSBcImxpdGVyYWxcIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVycm9yKFwiVW5leHBlY3RlZCB0b2tlbi5cIiwgdCk7XG4gICAgICAgIH1cbiAgICAgICAgdG9rZW4gPSBjcmVhdGUobyk7XG4gICAgICAgIHRva2VuLmZyb20gID0gdC5mcm9tO1xuICAgICAgICB0b2tlbi50byAgICA9IHQudG87XG4gICAgICAgIHRva2VuLnZhbHVlID0gdjtcbiAgICAgICAgdG9rZW4uYXJpdHkgPSBhO1xuICAgICAgICByZXR1cm4gdG9rZW47XG4gICAgfTtcblxuICAgIHZhciBleHByZXNzaW9uID0gZnVuY3Rpb24gKHJicCkge1xuICAgICAgICB2YXIgbGVmdDtcbiAgICAgICAgdmFyIHQgPSB0b2tlbjtcbiAgICAgICAgYWR2YW5jZSgpO1xuICAgICAgICBsZWZ0ID0gdC5udWQoKTtcbiAgICAgICAgd2hpbGUgKHJicCA8IHRva2VuLmxicCkge1xuICAgICAgICAgICAgdCA9IHRva2VuO1xuICAgICAgICAgICAgYWR2YW5jZSgpO1xuICAgICAgICAgICAgbGVmdCA9IHQubGVkKGxlZnQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsZWZ0O1xuICAgIH07XG5cbiAgICB2YXIgb3JpZ2luYWxfc3ltYm9sID0ge1xuICAgICAgICBudWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGVycm9yKFwiVW5kZWZpbmVkLlwiLCB0aGlzKTtcbiAgICAgICAgfSxcbiAgICAgICAgbGVkOiBmdW5jdGlvbiAobGVmdCkge1xuICAgICAgICAgICAgZXJyb3IoXCJNaXNzaW5nIG9wZXJhdG9yLlwiLCB0aGlzKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgc3ltYm9sID0gZnVuY3Rpb24gKGlkLCBicCkge1xuICAgICAgICB2YXIgcyA9IHN5bWJvbF90YWJsZVtpZF07XG4gICAgICAgIGJwID0gYnAgfHwgMDtcbiAgICAgICAgaWYgKHMpIHtcbiAgICAgICAgICAgIGlmIChicCA+PSBzLmxicCkge1xuICAgICAgICAgICAgICAgIHMubGJwID0gYnA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzID0gY3JlYXRlKG9yaWdpbmFsX3N5bWJvbCk7XG4gICAgICAgICAgICBzLmlkID0gcy52YWx1ZSA9IGlkO1xuICAgICAgICAgICAgcy5sYnAgPSBicDtcbiAgICAgICAgICAgIHN5bWJvbF90YWJsZVtpZF0gPSBzO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzO1xuICAgIH07XG5cbiAgICB2YXIgY29uc3RhbnQgPSBmdW5jdGlvbiAocywgdiwgYSkge1xuICAgICAgICB2YXIgeCA9IHN5bWJvbChzKTtcbiAgICAgICAgeC5udWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gc3ltYm9sX3RhYmxlW3RoaXMuaWRdLnZhbHVlO1xuICAgICAgICAgICAgdGhpcy5hcml0eSA9IFwibGl0ZXJhbFwiO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH07XG4gICAgICAgIHgudmFsdWUgPSB2O1xuICAgICAgICByZXR1cm4geDtcbiAgICB9O1xuICAgIFxuICAgIHZhciBpbmZpeCA9IGZ1bmN0aW9uIChpZCwgYnAsIGxlZCkge1xuICAgICAgICB2YXIgcyA9IHN5bWJvbChpZCwgYnApO1xuICAgICAgICBzLmxlZCA9IGxlZCB8fCBmdW5jdGlvbiAobGVmdCkge1xuICAgICAgICAgICAgdGhpcy5maXJzdCA9IGxlZnQ7XG4gICAgICAgICAgICB0aGlzLnNlY29uZCA9IGV4cHJlc3Npb24oYnApO1xuICAgICAgICAgICAgdGhpcy5hcml0eSA9IFwiYmluYXJ5XCI7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHM7XG4gICAgfTtcblxuICAgIHZhciBpbmZpeHIgPSBmdW5jdGlvbiAoaWQsIGJwLCBsZWQpIHtcbiAgICAgICAgdmFyIHMgPSBzeW1ib2woaWQsIGJwKTtcbiAgICAgICAgcy5sZWQgPSBsZWQgfHwgZnVuY3Rpb24gKGxlZnQpIHtcbiAgICAgICAgICAgIHRoaXMuZmlyc3QgPSBsZWZ0O1xuICAgICAgICAgICAgdGhpcy5zZWNvbmQgPSBleHByZXNzaW9uKGJwIC0gMSk7XG4gICAgICAgICAgICB0aGlzLmFyaXR5ID0gXCJiaW5hcnlcIjtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gcztcbiAgICB9O1xuXG4gICAgdmFyIHByZWZpeCA9IGZ1bmN0aW9uIChpZCwgbnVkKSB7XG4gICAgICAgIHZhciBzID0gc3ltYm9sKGlkKTtcbiAgICAgICAgcy5udWQgPSBudWQgfHwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5maXJzdCA9IGV4cHJlc3Npb24oNzApO1xuICAgICAgICAgICAgdGhpcy5hcml0eSA9IFwidW5hcnlcIjtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gcztcbiAgICB9O1xuXG4gICAgc3ltYm9sKFwiKGVuZClcIik7XG4gICAgc3ltYm9sKFwiKG5hbWUpXCIpO1xuICAgIHN5bWJvbChcIjpcIik7XG4gICAgc3ltYm9sKFwiKVwiKTtcbiAgICBzeW1ib2woXCJdXCIpO1xuICAgIHN5bWJvbChcIn1cIik7XG4gICAgc3ltYm9sKFwiLFwiKTtcblxuICAgIGNvbnN0YW50KFwidHJ1ZVwiLCB0cnVlKTtcbiAgICBjb25zdGFudChcImZhbHNlXCIsIGZhbHNlKTtcbiAgICBjb25zdGFudChcIm51bGxcIiwgbnVsbCk7XG4gICAgXG4gICAgY29uc3RhbnQoXCJNYXRoXCIsIE1hdGgpO1xuICAgIGNvbnN0YW50KFwiRGF0ZVwiLCBEYXRlKTtcblxuICAgIHN5bWJvbChcIihsaXRlcmFsKVwiKS5udWQgPSBpdHNlbGY7XG5cbiAgICAvLyBzeW1ib2woXCJ0aGlzXCIpLm51ZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gdGhpcy5hcml0eSA9IFwidGhpc1wiO1xuICAgICAgICAvLyByZXR1cm4gdGhpcztcbiAgICAvLyB9O1xuXG4gICAgLy9PcGVyYXRvciBQcmVjZWRlbmNlOlxuICAgIC8vaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvT3BlcmF0b3JzL09wZXJhdG9yX1ByZWNlZGVuY2VcblxuICAgIGluZml4KFwiP1wiLCAyMCwgZnVuY3Rpb24gKGxlZnQpIHtcbiAgICAgICAgdGhpcy5maXJzdCA9IGxlZnQ7XG4gICAgICAgIHRoaXMuc2Vjb25kID0gZXhwcmVzc2lvbigwKTtcbiAgICAgICAgYWR2YW5jZShcIjpcIik7XG4gICAgICAgIHRoaXMudGhpcmQgPSBleHByZXNzaW9uKDApO1xuICAgICAgICB0aGlzLmFyaXR5ID0gXCJ0ZXJuYXJ5XCI7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0pO1xuICAgIFxuICAgIGluZml4cihcIiYmXCIsIDMxKTtcbiAgICBpbmZpeHIoXCJ8fFwiLCAzMCk7XG5cbiAgICBpbmZpeHIoXCI9PT1cIiwgNDApO1xuICAgIGluZml4cihcIiE9PVwiLCA0MCk7XG5cbiAgICBpbmZpeHIoXCI9PVwiLCA0MCk7XG4gICAgaW5maXhyKFwiIT1cIiwgNDApO1xuXG4gICAgaW5maXhyKFwiPFwiLCA0MCk7XG4gICAgaW5maXhyKFwiPD1cIiwgNDApO1xuICAgIGluZml4cihcIj5cIiwgNDApO1xuICAgIGluZml4cihcIj49XCIsIDQwKTtcbiAgICBcbiAgICBpbmZpeChcImluXCIsIDQ1LCBmdW5jdGlvbiAobGVmdCkge1xuICAgICAgICB0aGlzLmZpcnN0ID0gbGVmdDtcbiAgICAgICAgdGhpcy5zZWNvbmQgPSBleHByZXNzaW9uKDApO1xuICAgICAgICB0aGlzLmFyaXR5ID0gXCJiaW5hcnlcIjtcbiAgICAgICAgaWYoY29udGV4dCA9PT0gJ3JlcGVhdCcpe1xuICAgICAgICAgIC8vIGBpbmAgYXQgcmVwZWF0IGJsb2NrXG4gICAgICAgICAgdGhpcy5hc3NpZ25tZW50ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9KTtcblxuICAgIGluZml4KFwiK1wiLCA1MCk7XG4gICAgaW5maXgoXCItXCIsIDUwKTtcblxuICAgIGluZml4KFwiKlwiLCA2MCk7XG4gICAgaW5maXgoXCIvXCIsIDYwKTtcbiAgICBpbmZpeChcIiVcIiwgNjApO1xuXG4gICAgaW5maXgoXCIuXCIsIDgwLCBmdW5jdGlvbiAobGVmdCkge1xuICAgICAgICB0aGlzLmZpcnN0ID0gbGVmdDtcbiAgICAgICAgaWYgKHRva2VuLmFyaXR5ICE9PSBcIm5hbWVcIikge1xuICAgICAgICAgICAgZXJyb3IoXCJFeHBlY3RlZCBhIHByb3BlcnR5IG5hbWUuXCIsIHRva2VuKTtcbiAgICAgICAgfVxuICAgICAgICB0b2tlbi5hcml0eSA9IFwibGl0ZXJhbFwiO1xuICAgICAgICB0aGlzLnNlY29uZCA9IHRva2VuO1xuICAgICAgICB0aGlzLmFyaXR5ID0gXCJiaW5hcnlcIjtcbiAgICAgICAgYWR2YW5jZSgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9KTtcblxuICAgIGluZml4KFwiW1wiLCA4MCwgZnVuY3Rpb24gKGxlZnQpIHtcbiAgICAgICAgdGhpcy5maXJzdCA9IGxlZnQ7XG4gICAgICAgIHRoaXMuc2Vjb25kID0gZXhwcmVzc2lvbigwKTtcbiAgICAgICAgdGhpcy5hcml0eSA9IFwiYmluYXJ5XCI7XG4gICAgICAgIGFkdmFuY2UoXCJdXCIpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9KTtcblxuICAgIGluZml4KFwiKFwiLCA4MCwgZnVuY3Rpb24gKGxlZnQpIHtcbiAgICAgICAgdmFyIGEgPSBbXTtcbiAgICAgICAgaWYgKGxlZnQuaWQgPT09IFwiLlwiIHx8IGxlZnQuaWQgPT09IFwiW1wiKSB7XG4gICAgICAgICAgICB0aGlzLmFyaXR5ID0gXCJ0ZXJuYXJ5XCI7XG4gICAgICAgICAgICB0aGlzLmZpcnN0ID0gbGVmdC5maXJzdDtcbiAgICAgICAgICAgIHRoaXMuc2Vjb25kID0gbGVmdC5zZWNvbmQ7XG4gICAgICAgICAgICB0aGlzLnRoaXJkID0gYTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuYXJpdHkgPSBcImJpbmFyeVwiO1xuICAgICAgICAgICAgdGhpcy5maXJzdCA9IGxlZnQ7XG4gICAgICAgICAgICB0aGlzLnNlY29uZCA9IGE7XG4gICAgICAgICAgICBpZiAoKGxlZnQuYXJpdHkgIT09IFwidW5hcnlcIiB8fCBsZWZ0LmlkICE9PSBcImZ1bmN0aW9uXCIpICYmXG4gICAgICAgICAgICAgICAgICAgIGxlZnQuYXJpdHkgIT09IFwibmFtZVwiICYmIGxlZnQuYXJpdHkgIT09IFwibGl0ZXJhbFwiICYmIGxlZnQuaWQgIT09IFwiKFwiICYmXG4gICAgICAgICAgICAgICAgICAgIGxlZnQuaWQgIT09IFwiJiZcIiAmJiBsZWZ0LmlkICE9PSBcInx8XCIgJiYgbGVmdC5pZCAhPT0gXCI/XCIpIHtcbiAgICAgICAgICAgICAgICBlcnJvcihcIkV4cGVjdGVkIGEgdmFyaWFibGUgbmFtZS5cIiwgbGVmdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRva2VuLmlkICE9PSBcIilcIikge1xuICAgICAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgICAgICBhLnB1c2goZXhwcmVzc2lvbigwKSk7XG4gICAgICAgICAgICAgICAgaWYgKHRva2VuLmlkICE9PSBcIixcIikge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYWR2YW5jZShcIixcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYWR2YW5jZShcIilcIik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0pO1xuXG4gICAgLy9maWx0ZXJcbiAgICBpbmZpeChcInxcIiwgMTAsIGZ1bmN0aW9uKGxlZnQpIHtcbiAgICAgIHZhciBhO1xuICAgICAgdGhpcy5maXJzdCA9IGxlZnQ7XG4gICAgICB0b2tlbi5hcml0eSA9ICdmaWx0ZXInO1xuICAgICAgdGhpcy5zZWNvbmQgPSBleHByZXNzaW9uKDEwKTtcbiAgICAgIHRoaXMuYXJpdHkgPSAnYmluYXJ5JztcbiAgICAgIGlmKHRva2VuLmlkID09PSAnOicpe1xuICAgICAgICB0aGlzLmFyaXR5ID0gJ3Rlcm5hcnknO1xuICAgICAgICB0aGlzLnRoaXJkID0gYSA9IFtdO1xuICAgICAgICB3aGlsZSh0cnVlKXtcbiAgICAgICAgICBhZHZhbmNlKCc6Jyk7XG4gICAgICAgICAgYS5wdXNoKGV4cHJlc3Npb24oMCkpO1xuICAgICAgICAgIGlmKHRva2VuLmlkICE9PSBcIjpcIil7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0pO1xuICAgIFxuXG4gICAgcHJlZml4KFwiIVwiKTtcbiAgICBwcmVmaXgoXCItXCIpO1xuICAgIHByZWZpeChcInR5cGVvZlwiKTtcblxuICAgIHByZWZpeChcIihcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZSA9IGV4cHJlc3Npb24oMCk7XG4gICAgICAgIGFkdmFuY2UoXCIpXCIpO1xuICAgICAgICByZXR1cm4gZTtcbiAgICB9KTtcblxuICAgIHByZWZpeChcIltcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgYSA9IFtdO1xuICAgICAgICBpZiAodG9rZW4uaWQgIT09IFwiXVwiKSB7XG4gICAgICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgICAgIGEucHVzaChleHByZXNzaW9uKDApKTtcbiAgICAgICAgICAgICAgICBpZiAodG9rZW4uaWQgIT09IFwiLFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhZHZhbmNlKFwiLFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBhZHZhbmNlKFwiXVwiKTtcbiAgICAgICAgdGhpcy5maXJzdCA9IGE7XG4gICAgICAgIHRoaXMuYXJpdHkgPSBcInVuYXJ5XCI7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0pO1xuXG4gICAgcHJlZml4KFwie1wiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBhID0gW10sIG4sIHY7XG4gICAgICAgIGlmICh0b2tlbi5pZCAhPT0gXCJ9XCIpIHtcbiAgICAgICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICAgICAgbiA9IHRva2VuO1xuICAgICAgICAgICAgICAgIGlmIChuLmFyaXR5ICE9PSBcIm5hbWVcIiAmJiBuLmFyaXR5ICE9PSBcImxpdGVyYWxcIikge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcihcIkJhZCBwcm9wZXJ0eSBuYW1lLlwiLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFkdmFuY2UoKTtcbiAgICAgICAgICAgICAgICBhZHZhbmNlKFwiOlwiKTtcbiAgICAgICAgICAgICAgICB2ID0gZXhwcmVzc2lvbigwKTtcbiAgICAgICAgICAgICAgICB2LmtleSA9IG4udmFsdWU7XG4gICAgICAgICAgICAgICAgYS5wdXNoKHYpO1xuICAgICAgICAgICAgICAgIGlmICh0b2tlbi5pZCAhPT0gXCIsXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFkdmFuY2UoXCIsXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGFkdmFuY2UoXCJ9XCIpO1xuICAgICAgICB0aGlzLmZpcnN0ID0gYTtcbiAgICAgICAgdGhpcy5hcml0eSA9IFwidW5hcnlcIjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSk7XG5cbiAgICAvL19zb3VyY2U6IOihqOi+vuW8j+S7o+eggeWtl+espuS4slxuICAgIC8vX2NvbnRleHQ6IOihqOi+vuW8j+eahOivreWPpeeOr+Wig1xuICAgIHJldHVybiBmdW5jdGlvbiAoX3NvdXJjZSwgX2NvbnRleHQpIHtcbiAgICAgICAgdG9rZW5zID0gdG9rZW5pemUoX3NvdXJjZSwgJz08PiErLSomfC8lXicsICc9PD4mfCcpO1xuICAgICAgICB0b2tlbl9uciA9IDA7XG4gICAgICAgIGNvbnRleHQgPSBfY29udGV4dDtcbiAgICAgICAgYWR2YW5jZSgpO1xuICAgICAgICB2YXIgcyA9IGV4cHJlc3Npb24oMCk7XG4gICAgICAgIGFkdmFuY2UoXCIoZW5kKVwiKTtcbiAgICAgICAgcmV0dXJuIHM7XG4gICAgfTtcbn07XG5cbmV4cG9ydHMucGFyc2UgPSBtYWtlX3BhcnNlKCk7IiwidmFyIHRva2VuUmVnID0gL3t7KHsoW159XFxuXSspfXxbXn1cXG5dKyl9fS9nO1xuXG4vL+Wtl+espuS4suS4reaYr+WQpuWMheWQq+aooeadv+WNoOS9jeespuagh+iusFxuZnVuY3Rpb24gaGFzVG9rZW4oc3RyKSB7XG4gIHRva2VuUmVnLmxhc3RJbmRleCA9IDA7XG4gIHJldHVybiBzdHIgJiYgdG9rZW5SZWcudGVzdChzdHIpO1xufVxuXG5mdW5jdGlvbiBwYXJzZVRva2VuKHZhbHVlKSB7XG4gIHZhciB0b2tlbnMgPSBbXVxuICAgICwgdGV4dE1hcCA9IFtdXG4gICAgLCBzdGFydCA9IDBcbiAgICAsIHZhbCwgdG9rZW5cbiAgICA7XG4gIFxuICB0b2tlblJlZy5sYXN0SW5kZXggPSAwO1xuICBcbiAgd2hpbGUoKHZhbCA9IHRva2VuUmVnLmV4ZWModmFsdWUpKSl7XG4gICAgaWYodG9rZW5SZWcubGFzdEluZGV4IC0gc3RhcnQgPiB2YWxbMF0ubGVuZ3RoKXtcbiAgICAgIHRleHRNYXAucHVzaCh2YWx1ZS5zbGljZShzdGFydCwgdG9rZW5SZWcubGFzdEluZGV4IC0gdmFsWzBdLmxlbmd0aCkpO1xuICAgIH1cbiAgICBcbiAgICB0b2tlbiA9IHtcbiAgICAgIGVzY2FwZTogIXZhbFsyXVxuICAgICwgcGF0aDogKHZhbFsyXSB8fCB2YWxbMV0pLnRyaW0oKVxuICAgICwgcG9zaXRpb246IHRleHRNYXAubGVuZ3RoXG4gICAgLCB0ZXh0TWFwOiB0ZXh0TWFwXG4gICAgfTtcbiAgICBcbiAgICB0b2tlbnMucHVzaCh0b2tlbik7XG4gICAgXG4gICAgLy/kuIDkuKrlvJXnlKjnsbvlnoso5pWw57uEKeS9nOS4uuiKgueCueWvueixoeeahOaWh+acrOWbviwg6L+Z5qC35b2T5p+Q5LiA5Liq5byV55So5pS55Y+Y5LqG5LiA5Liq5YC85ZCOLCDlhbbku5blvJXnlKjlj5blvpfnmoTlgLzpg73kvJrlkIzml7bmm7TmlrBcbiAgICB0ZXh0TWFwLnB1c2godmFsWzBdKTtcbiAgICBcbiAgICBzdGFydCA9IHRva2VuUmVnLmxhc3RJbmRleDtcbiAgfVxuICBcbiAgaWYodmFsdWUubGVuZ3RoID4gc3RhcnQpe1xuICAgIHRleHRNYXAucHVzaCh2YWx1ZS5zbGljZShzdGFydCwgdmFsdWUubGVuZ3RoKSk7XG4gIH1cbiAgXG4gIHRva2Vucy50ZXh0TWFwID0gdGV4dE1hcDtcbiAgXG4gIHJldHVybiB0b2tlbnM7XG59XG5cbmV4cG9ydHMuaGFzVG9rZW4gPSBoYXNUb2tlbjtcblxuZXhwb3J0cy5wYXJzZVRva2VuID0gcGFyc2VUb2tlbjsiLCJcInVzZSBzdHJpY3RcIjtcblxuLy91dGlsc1xuLy8tLS1cblxudmFyIGRvYyA9IHJlcXVpcmUoJy4vZG9jdW1lbnQuanMnKTtcblxudmFyIGtleVBhdGhSZWcgPSAvKD86XFwufFxcWykvZ1xuICAsIGJyYSA9IC9cXF0vZ1xuICA7XG5cbi8vcGF0aC5rZXksIHBhdGhba2V5XSAtLT4gWydwYXRoJywgJ2tleSddXG5mdW5jdGlvbiBwYXJzZUtleVBhdGgoa2V5UGF0aCl7XG4gIHJldHVybiBrZXlQYXRoLnJlcGxhY2UoYnJhLCAnJykuc3BsaXQoa2V5UGF0aFJlZyk7XG59XG5cbi8qKlxuICog5ZCI5bm25a+56LGhXG4gKiBAc3RhdGljXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtkZWVwPWZhbHNlXSDmmK/lkKbmt7HluqblkIjlubZcbiAqIEBwYXJhbSB7T2JqZWN0fSB0YXJnZXQg55uu5qCH5a+56LGhXG4gKiBAcGFyYW0ge09iamVjdH0gW29iamVjdC4uLl0g5p2l5rqQ5a+56LGhXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIOeUqOS6juiHquWumuS5ieWQiOW5tueahOWbnuiwg1xuICogQHJldHVybiB7RnVuY3Rpb259IOWQiOW5tuWQjueahCB0YXJnZXQg5a+56LGhXG4gKi9cbmZ1bmN0aW9uIGV4dGVuZCgvKiBkZWVwLCB0YXJnZXQsIG9iamVjdC4uLiwgY2FsbGxiYWNrICovKSB7XG4gIHZhciBvcHRpb25zXG4gICAgLCBuYW1lLCBzcmMsIGNvcHksIGNvcHlJc0FycmF5LCBjbG9uZVxuICAgICwgdGFyZ2V0ID0gYXJndW1lbnRzWzBdIHx8IHt9XG4gICAgLCBpID0gMVxuICAgICwgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aFxuICAgICwgZGVlcCA9IGZhbHNlXG4gICAgLCBjYWxsYmFja1xuICAgIDtcblxuICAvLyBIYW5kbGUgYSBkZWVwIGNvcHkgc2l0dWF0aW9uXG4gIGlmICh0eXBlb2YgdGFyZ2V0ID09PSBcImJvb2xlYW5cIikge1xuICAgIGRlZXAgPSB0YXJnZXQ7XG5cbiAgICAvLyBza2lwIHRoZSBib29sZWFuIGFuZCB0aGUgdGFyZ2V0XG4gICAgdGFyZ2V0ID0gYXJndW1lbnRzWyBpIF0gfHwge307XG4gICAgaSsrO1xuICB9XG4gIFxuICBpZih1dGlscy5pc0Z1bmN0aW9uKGFyZ3VtZW50c1tsZW5ndGggLSAxXSkpIHtcbiAgICBjYWxsYmFjayA9IGFyZ3VtZW50c1tsZW5ndGggLSAxXTtcbiAgICBsZW5ndGgtLTtcbiAgfVxuXG4gIC8vIEhhbmRsZSBjYXNlIHdoZW4gdGFyZ2V0IGlzIGEgc3RyaW5nIG9yIHNvbWV0aGluZyAocG9zc2libGUgaW4gZGVlcCBjb3B5KVxuICBpZiAodHlwZW9mIHRhcmdldCAhPT0gXCJvYmplY3RcIiAmJiAhdXRpbHMuaXNGdW5jdGlvbih0YXJnZXQpKSB7XG4gICAgdGFyZ2V0ID0ge307XG4gIH1cblxuICBmb3IgKCA7IGkgPCBsZW5ndGg7IGkrKyApIHtcbiAgICAvLyBPbmx5IGRlYWwgd2l0aCBub24tbnVsbC91bmRlZmluZWQgdmFsdWVzXG4gICAgaWYgKCAob3B0aW9ucyA9IGFyZ3VtZW50c1sgaSBdKSAhPSBudWxsICkge1xuICAgICAgLy8gRXh0ZW5kIHRoZSBiYXNlIG9iamVjdFxuICAgICAgZm9yICggbmFtZSBpbiBvcHRpb25zICkge1xuICAgICAgICAvL2FuZHJvaWQgMi4zIGJyb3dzZXIgY2FuIGVudW0gdGhlIHByb3RvdHlwZSBvZiBjb25zdHJ1Y3Rvci4uLlxuICAgICAgICBpZihvcHRpb25zLmhhc093blByb3BlcnR5KG5hbWUpICYmIG5hbWUgIT09ICdwcm90b3R5cGUnKXtcbiAgICAgICAgICBzcmMgPSB0YXJnZXRbIG5hbWUgXTtcbiAgICAgICAgICBjb3B5ID0gb3B0aW9uc1sgbmFtZSBdO1xuICAgICAgICAgIFxuXG4gICAgICAgICAgLy8gUmVjdXJzZSBpZiB3ZSdyZSBtZXJnaW5nIHBsYWluIG9iamVjdHMgb3IgYXJyYXlzXG4gICAgICAgICAgaWYgKCBkZWVwICYmIGNvcHkgJiYgKCB1dGlscy5pc1BsYWluT2JqZWN0KGNvcHkpIHx8IChjb3B5SXNBcnJheSA9IHV0aWxzLmlzQXJyYXkoY29weSkpICkgKSB7XG4gICAgICAgICAgXG4gICAgICAgICAgICAvLyBQcmV2ZW50IG5ldmVyLWVuZGluZyBsb29wXG4gICAgICAgICAgICBpZiAoIHRhcmdldCA9PT0gY29weSApIHtcbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIGNvcHlJc0FycmF5ICkge1xuICAgICAgICAgICAgICBjb3B5SXNBcnJheSA9IGZhbHNlO1xuICAgICAgICAgICAgICBjbG9uZSA9IHNyYyAmJiB1dGlscy5pc0FycmF5KHNyYykgPyBzcmMgOiBbXTtcblxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY2xvbmUgPSBzcmMgJiYgdXRpbHMuaXNQbGFpbk9iamVjdChzcmMpID8gc3JjIDoge307XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgIGNvcHkgPSBjYWxsYmFjayhjbG9uZSwgY29weSwgbmFtZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE5ldmVyIG1vdmUgb3JpZ2luYWwgb2JqZWN0cywgY2xvbmUgdGhlbVxuICAgICAgICAgICAgdGFyZ2V0WyBuYW1lIF0gPSBleHRlbmQoIGRlZXAsIGNsb25lLCBjb3B5LCBjYWxsYmFjayk7XG5cbiAgICAgICAgICAgIC8vIERvbid0IGJyaW5nIGluIHVuZGVmaW5lZCB2YWx1ZXNcbiAgICAgICAgICB9IGVsc2UgaWYgKCAhdXRpbHMuaXNVbmRlZmluZWQoY29weSkgKSB7XG5cbiAgICAgICAgICAgIGlmKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgIGNvcHkgPSBjYWxsYmFjayhzcmMsIGNvcHksIG5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGFyZ2V0WyBuYW1lIF0gPSBjb3B5O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFJldHVybiB0aGUgbW9kaWZpZWQgb2JqZWN0XG4gIHJldHVybiB0YXJnZXQ7XG59XG5cbnZhciBjcmVhdGUgPSBPYmplY3QuY3JlYXRlIHx8IGZ1bmN0aW9uIChvKSB7XG4gIGZ1bmN0aW9uIEYoKSB7fVxuICBGLnByb3RvdHlwZSA9IG87XG4gIHJldHVybiBuZXcgRigpO1xufTtcblxuZnVuY3Rpb24gdHBsUGFyc2UodHBsLCB0YXJnZXQpIHtcbiAgdmFyIGVsO1xuICBpZih1dGlscy5pc09iamVjdCh0cGwpKXtcbiAgICBpZih0YXJnZXQpe1xuICAgICAgZWwgPSB0YXJnZXQgPSB1dGlscy5pc09iamVjdCh0YXJnZXQpID8gdGFyZ2V0IDogZG9jLmNyZWF0ZUVsZW1lbnQodGFyZ2V0KTtcbiAgICAgIGVsLmlubmVySFRNTCA9ICcnOy8v5riF56m655uu5qCH5a+56LGhXG4gICAgICB0YXJnZXQuYXBwZW5kQ2hpbGQodHBsKTtcbiAgICB9ZWxzZXtcbiAgICAgIGVsID0gdHBsO1xuICAgIH1cbiAgICB0cGwgPSBlbC5vdXRlckhUTUw7XG4gIH1lbHNle1xuICAgIGVsID0gdXRpbHMuaXNPYmplY3QodGFyZ2V0KSA/IHRhcmdldCA6IGRvYy5jcmVhdGVFbGVtZW50KHRhcmdldCB8fCAnZGl2Jyk7XG4gICAgZWwuaW5uZXJIVE1MID0gdHBsO1xuICB9XG4gIHJldHVybiB7ZWw6IGVsLCB0cGw6IHRwbH07XG59XG5cbiBcbnZhciB1dGlscyA9IHtcbiAgbm9vcDogZnVuY3Rpb24gKCl7fVxuLCBpZTogISFkb2MuYXR0YWNoRXZlbnRcblxuLCBpc09iamVjdDogZnVuY3Rpb24gKHZhbCkge1xuICAgIHJldHVybiB0eXBlb2YgdmFsID09PSAnb2JqZWN0JyAmJiB2YWwgIT09IG51bGw7XG4gIH1cblxuLCBpc1VuZGVmaW5lZDogZnVuY3Rpb24gKHZhbCkge1xuICAgIHJldHVybiB0eXBlb2YgdmFsID09PSAndW5kZWZpbmVkJztcbiAgfVxuXG4sIGlzRnVuY3Rpb246IGZ1bmN0aW9uICh2YWwpe1xuICAgIHJldHVybiB0eXBlb2YgdmFsID09PSAnZnVuY3Rpb24nO1xuICB9XG5cbiwgaXNBcnJheTogZnVuY3Rpb24gKHZhbCkge1xuICAgIGlmKHV0aWxzLmllKXtcbiAgICAgIC8vSUUgOSDlj4rku6XkuIsgSUUg6Leo56qX5Y+j5qOA5rWL5pWw57uEXG4gICAgICByZXR1cm4gdmFsICYmIHZhbC5jb25zdHJ1Y3RvciArICcnID09PSBBcnJheSArICcnO1xuICAgIH1lbHNle1xuICAgICAgcmV0dXJuIEFycmF5LmlzQXJyYXkodmFsKTtcbiAgICB9XG4gIH1cblxuICAvL+eugOWNleWvueixoeeahOeugOaYk+WIpOaWrVxuLCBpc1BsYWluT2JqZWN0OiBmdW5jdGlvbiAobyl7XG4gICAgaWYgKCFvIHx8ICh7fSkudG9TdHJpbmcuY2FsbChvKSAhPT0gJ1tvYmplY3QgT2JqZWN0XScgfHwgby5ub2RlVHlwZSB8fCBvID09PSBvLndpbmRvdykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1lbHNle1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgLy/lh73mlbDliIfpnaIuIG9yaUZuIOWOn+Wni+WHveaVsCwgZm4g5YiH6Z2i6KGl5YWF5Ye95pWwXG4gIC8v5YmN6Z2i55qE5Ye95pWw6L+U5Zue5YC85Lyg5YWlIGJyZWFrQ2hlY2sg5Yik5patLCBicmVha0NoZWNrIOi/lOWbnuWAvOS4uuecn+aXtuS4jeaJp+ihjOWIh+mdouihpeWFheeahOWHveaVsFxuLCBiZWZvcmVGbjogZnVuY3Rpb24gKG9yaUZuLCBmbiwgYnJlYWtDaGVjaykge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciByZXQgPSBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgaWYoYnJlYWtDaGVjayAmJiBicmVha0NoZWNrLmNhbGwodGhpcywgcmV0KSl7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gb3JpRm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG5cbiwgYWZ0ZXJGbjogZnVuY3Rpb24gKG9yaUZuLCBmbiwgYnJlYWtDaGVjaykge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciByZXQgPSBvcmlGbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgaWYoYnJlYWtDaGVjayAmJiBicmVha0NoZWNrLmNhbGwodGhpcywgcmV0KSl7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgICB9XG4gICAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG4gIH1cbiAgXG4sIHBhcnNlS2V5UGF0aDogcGFyc2VLZXlQYXRoXG5cbiwgZGVlcFNldDogZnVuY3Rpb24gKGtleVN0ciwgdmFsdWUsIG9iaikge1xuICAgIGlmKGtleVN0cil7XG4gICAgICB2YXIgY2hhaW4gPSBwYXJzZUtleVBhdGgoa2V5U3RyKVxuICAgICAgICAsIGN1ciA9IG9ialxuICAgICAgICA7XG4gICAgICBjaGFpbi5mb3JFYWNoKGZ1bmN0aW9uKGtleSwgaSkge1xuICAgICAgICBpZihpID09PSBjaGFpbi5sZW5ndGggLSAxKXtcbiAgICAgICAgICBjdXJba2V5XSA9IHZhbHVlO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICBpZihjdXIgJiYgY3VyLmhhc093blByb3BlcnR5KGtleSkpe1xuICAgICAgICAgICAgY3VyID0gY3VyW2tleV07XG4gICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICBjdXJba2V5XSA9IHt9O1xuICAgICAgICAgICAgY3VyID0gY3VyW2tleV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9ZWxzZXtcbiAgICAgIGV4dGVuZChvYmosIHZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuLCBkZWVwR2V0OiBmdW5jdGlvbiAoa2V5U3RyLCBvYmopIHtcbiAgICB2YXIgY2hhaW4sIGN1ciA9IG9iaiwga2V5O1xuICAgIGlmKGtleVN0cil7XG4gICAgICBjaGFpbiA9IHBhcnNlS2V5UGF0aChrZXlTdHIpO1xuICAgICAgZm9yKHZhciBpID0gMCwgbCA9IGNoYWluLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICBrZXkgPSBjaGFpbltpXTtcbiAgICAgICAgaWYoY3VyICYmIGN1ci5oYXNPd25Qcm9wZXJ0eShrZXkpKXtcbiAgICAgICAgICBjdXIgPSBjdXJba2V5XTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjdXI7XG4gIH1cbiwgZXh0ZW5kOiBleHRlbmRcbiwgY3JlYXRlOiBjcmVhdGVcbiwgdHBsUGFyc2U6IHRwbFBhcnNlXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHV0aWxzOyJdfQ==
(1)
});
