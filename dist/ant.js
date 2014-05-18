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
  }
  
  var partialReg = /^>\s*(?=.+)/;
  //处理文本节点中的绑定占位符({{...}})
  function checkText(node, vm) {
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
          checkText(tn, vm);
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
        }));
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
        addWatcher(vm, extend(dir, token));
      });
    }else{
      addWatcher(vm, dir);
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
  
  //buid in bindings
  var baseBindings = [
    //if / repeat
    function(vm, token) {
      if(token.nodeName === antAttr.IF || token.nodeName === antAttr.REPEAT){
        return new Generator(vm, token);
      }
    }
  ];
  
  function addWatcher(vm, dir, callback) {
    if(dir.path) {
      return new Watcher(vm, dir, callback);
    }
  }
  
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
        }else{
          vals[key] = this.relativeVm.$getData(key)
        }
      }
      
      var newVal = this.getValue(vals)
        , dir = this.token
        ;
        
      if(newVal !== this.val || isObject(newVal)){
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
        
        this.vm.$repeat = true;
        
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

},{"./utils.js":13}],4:[function(_dereq_,module,exports){
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
        //if(val[attr]) {
          delete this.attrs[attr];
        //}
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
, init: function() {
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


dirs.partial = {
  terminal: true
, replace: true
, init: function(vm) {
    var that = this;
    var pName, ant, opts;
    pName = this.path;
    ant = vm.$root.$ant;
    opts = ant.options;
    
    ant.setPartial({
      name: pName
    , content: opts && opts.partials && opts.partials[pName]
    , target: function(el) { that.el.insertBefore(el, that.node) }
    , escape: this.escape
    , path: vm.$getKeyPath()
    });
  }
};
  
dirs.repeat = _dereq_('./repeat.js');
dirs.attr = _dereq_('./attr.js');
dirs.model = _dereq_('./model.js');

module.exports = dirs;
},{"../document.js":8,"../utils.js":13,"./attr.js":4,"./model.js":6,"./repeat.js":7}],6:[function(_dereq_,module,exports){
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
},{"../utils.js":13}],7:[function(_dereq_,module,exports){
"use strict";
 
module.exports = {
  priority: 10000
, terminal: true
, init: function(vm) {
    
  }
, update: function() {
    
  }
};
},{}],8:[function(_dereq_,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJFOlxcanVzdGFuXFxEcm9wYm94XFxjb2RlXFxhbnQuanNcXG5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwiRTovanVzdGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL2FudC5qcyIsIkU6L2p1c3Rhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy9jbGFzcy5qcyIsIkU6L2p1c3Rhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy9kaXJlY3RpdmUuanMiLCJFOi9qdXN0YW4vRHJvcGJveC9jb2RlL2FudC5qcy9zcmMvZGlyZWN0aXZlcy9hdHRyLmpzIiwiRTovanVzdGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL2RpcmVjdGl2ZXMvaW5kZXguanMiLCJFOi9qdXN0YW4vRHJvcGJveC9jb2RlL2FudC5qcy9zcmMvZGlyZWN0aXZlcy9tb2RlbC5qcyIsIkU6L2p1c3Rhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy9kaXJlY3RpdmVzL3JlcGVhdC5qcyIsIkU6L2p1c3Rhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy9kb2N1bWVudC5qcyIsIkU6L2p1c3Rhbi9Ecm9wYm94L2NvZGUvYW50LmpzL3NyYy9ldmFsLmpzIiwiRTovanVzdGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL2V2ZW50LmpzIiwiRTovanVzdGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL3BhcnNlLmpzIiwiRTovanVzdGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL3Rva2VuLmpzIiwiRTovanVzdGFuL0Ryb3Bib3gvY29kZS9hbnQuanMvc3JjL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsK0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNobEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgZG9jID0gcmVxdWlyZSgnLi9kb2N1bWVudC5qcycpXG4gICwgcGFyc2UgPSByZXF1aXJlKCcuL3BhcnNlLmpzJykucGFyc2VcbiAgLCBldmFsdWF0ZSA9IHJlcXVpcmUoJy4vZXZhbC5qcycpXG4gICwgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJylcbiAgLCBFdmVudCA9IHJlcXVpcmUoJy4vZXZlbnQuanMnKVxuICAsIENsYXNzID0gcmVxdWlyZSgnLi9jbGFzcy5qcycpXG4gICwgRGlyID0gcmVxdWlyZSgnLi9kaXJlY3RpdmUuanMnKVxuICAsIGRpcnMgPSByZXF1aXJlKCcuL2RpcmVjdGl2ZXMnKVxuICAsIHRva2VuID0gcmVxdWlyZSgnLi90b2tlbi5qcycpXG4gIDtcblxuXG52YXIgaXNPYmplY3QgPSB1dGlscy5pc09iamVjdFxuICAsIGlzVW5kZWZpbmVkID0gdXRpbHMuaXNVbmRlZmluZWRcbiAgLCBpc0Z1bmN0aW9uID0gdXRpbHMuaXNGdW5jdGlvblxuICAsIGlzQXJyYXkgPSB1dGlscy5pc0FycmF5XG4gICwgaXNQbGFpbk9iamVjdCA9IHV0aWxzLmlzUGxhaW5PYmplY3RcbiAgLCBhZnRlckZuID0gdXRpbHMuYWZ0ZXJGblxuICAsIHBhcnNlS2V5UGF0aCA9IHV0aWxzLnBhcnNlS2V5UGF0aFxuICAsIGRlZXBTZXQgPSB1dGlscy5kZWVwU2V0XG4gICwgZGVlcEdldCA9IHV0aWxzLmRlZXBHZXRcbiAgLCBleHRlbmQgPSB1dGlscy5leHRlbmRcbiAgLCBpZSA9IHV0aWxzLmllXG4gICwgdHBsUGFyc2UgPSB1dGlscy50cGxQYXJzZVxuICAsIGNyZWF0ZSA9IHV0aWxzLmNyZWF0ZVxuICA7XG5cblxuXG4vL+aehOW7uuS/rumlsCBtb2RlbFxuZnVuY3Rpb24gbW9kZWxFeHRlbmQobW9kZWwsIGRhdGEsIHZtKSB7XG4gIGJ1aWxkQXJyYXkobW9kZWwsIHZtKTtcbiAgcmV0dXJuIGV4dGVuZCh0cnVlLCBtb2RlbCwgZGF0YSwgZnVuY3Rpb24oYSwgYiwgbmFtZSkge1xuICAgIHZhciByZXM7XG4gICAgaWYobmFtZSAhPT0gJ19fYW50X18nKSB7XG4gICAgICByZXMgPSBiO1xuICAgIH1cbiAgICBcbiAgICBidWlsZEFycmF5KGEsIHZtKTtcbiAgICBcbiAgICByZXR1cm4gcmVzO1xuICB9KTtcbn1cblxuLy/kv67ppbDmlbDnu4RcbmZ1bmN0aW9uIGJ1aWxkQXJyYXkoYXJyLCB2bSkge1xuICBpZih2bSAmJiBpc0FycmF5KGFycikpe1xuICAgIGFyci5fX2FudF9fID0gdm07XG4gICAgaWYoYXJyLnB1c2ggIT09IGFycmF5TWV0aG9kcy5wdXNoKXtcbiAgICAgIGV4dGVuZChhcnIsIGFycmF5TWV0aG9kcylcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGFycjtcbn1cblxudmFyIHByZWZpeCwgYW50QXR0ciA9IHt9O1xuXG5mdW5jdGlvbiBzZXRQcmVmaXgobmV3UHJlZml4KSB7XG4gIGlmKG5ld1ByZWZpeCl7XG4gICAgcHJlZml4ID0gbmV3UHJlZml4O1xuICAgIGFudEF0dHIuSUYgPSBwcmVmaXggKyAnaWYnO1xuICAgIGFudEF0dHIuUkVQRUFUID0gcHJlZml4ICsgJ3JlcGVhdCc7XG4gICAgYW50QXR0ci5NT0RFTCA9IHByZWZpeCArICdtb2RlbCc7XG4gICAgdGhpcy5wcmVmaXggPSBwcmVmaXg7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNBbnRBdHRyKGF0dHJOYW1lKSB7XG4gIGZvcih2YXIgYXR0ciBpbiBhbnRBdHRyKXtcbiAgICBpZihhbnRBdHRyW2F0dHJdID09PSBhdHRyTmFtZSl7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4gIC8qKlxuICAgKiAjIEFudFxuICAgKiDln7rkuo4gZG9tIOeahOaooeadv+W8leaTji4g5pSv5oyB5pWw5o2u57uR5a6aXG4gICAqIEBwYXJhbSB7U3RyaW5nIHwgRWxlbWVudH0gW3RwbF0g5qih5p2/5bqU6K+l5piv5ZCI5rOV6ICM5LiU5qCH5YeG55qEIEhUTUwg5qCH562+5a2X56ym5Liy5oiW6ICF55u05o6l5piv546w5pyJIERPTSDmoJHkuK3nmoTkuIDkuKogZWxlbWVudCDlr7nosaEuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0c11cbiAgICogQHBhcmFtIHtTdHJpbmcgfCBFbGVtZW50fSBvcHRzLnRwbFxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cy5kYXRhIOa4suafk+aooeadv+eahOaVsOaNri4g6K+l6aG55aaC5p6c5Li656m6LCDnqI3lkI7lj6/ku6XnlKggYHRwbC5yZW5kZXIobW9kZWwpYCDmnaXmuLLmn5PnlJ/miJAgaHRtbC5cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRzLmxhenkg5piv5ZCm5a+5ICdpbnB1dCcg5Y+KICd0ZXh0YXJlYScg55uR5ZCsIGBjaGFuZ2VgIOS6i+S7tiwg6ICM5LiN5pivIGBpbnB1dGAg5LqL5Lu2XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzLmV2ZW50cyBcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMucGFydGlhbHNcbiAgICogQHBhcmFtIHtTdHJpbmcgfCBIVE1MRUxlbWVudH0gb3B0cy5lbFxuICAgKiBAY29uc3RydWN0b3JcbiAgICovXG4gIGZ1bmN0aW9uIEFudCh0cGwsIG9wdHMpIHtcbiAgICBpZihpc1BsYWluT2JqZWN0KHRwbCkpIHtcbiAgICAgIHRwbCA9IG9wdHMudHBsO1xuICAgIH1cbiAgICBvcHRzID0gb3B0cyB8fCB7fTtcbiAgICB2YXIgZWxcbiAgICAgICwgZGVmYXVsdHMgPSB0aGlzLmRlZmF1bHRzIHx8IHt9XG4gICAgICA7XG5cbiAgICBvcHRzID0gZXh0ZW5kKHRydWUsIHt9LCBkZWZhdWx0cywgb3B0cyk7XG5cbiAgICB2YXIgZGF0YSA9IG9wdHMuZGF0YSB8fCB7fVxuICAgICAgLCBldmVudHMgPSBvcHRzLmV2ZW50cyB8fCB7fVxuICAgICAgLCBmaWx0ZXJzID0gb3B0cy5maWx0ZXJzIHx8IHt9XG4gICAgICA7XG4gICAgXG4gICAgZWwgPSB0cGxQYXJzZSh0cGwsIG9wdHMuZWwpO1xuICAgIHRwbCA9IGVsLnRwbDtcbiAgICBlbCA9IGVsLmVsO1xuICAgIFxuICAgIC8v5bGe5oCnXG4gICAgLy8tLS0tXG4gICAgXG4gICAgdGhpcy5vcHRpb25zID0gb3B0cztcbiAgICAvKipcbiAgICAgKiAjIyMgYW50LnRwbFxuICAgICAqIOaooeadv+Wtl+espuS4slxuICAgICAqIEB0eXBlIHtTdHJpbmd9XG4gICAgICovXG4gICAgdGhpcy50cGwgPSB0cGw7XG4gICAgXG4gICAgLyoqXG4gICAgICogIyMjIGFudC5lbFxuICAgICAqIOaooeadvyBET00g5a+56LGhLlxuICAgICAqIEB0eXBlIHtIVE1MRWxlbWVudE9iamVjdH1cbiAgICAgKi9cbiAgICB0aGlzLmVsID0gZWw7XG4gICAgXG4gICAgLyoqXG4gICAgICogIyMjIGFudC5kYXRhXG4gICAgICog57uR5a6a5qih5p2/55qE5pWw5o2uLlxuICAgICAqIEB0eXBlIHtPYmplY3R9IOaVsOaNruWvueixoSwg5LiN5bqU6K+l5piv5pWw57uELlxuICAgICAqL1xuICAgIHRoaXMuZGF0YSA9IHt9O1xuICAgIC8qKlxuICAgICAqICMjIyBhbnQuaXNSZW5kZXJlZFxuICAgICAqIOivpeaooeadv+aYr+WQpuW3sue7j+e7keWumuaVsOaNrlxuICAgICAqIEB0eXBlIHtCb29sZWFufSDlnKjosIPnlKggYHJlbmRlcmAg5pa55rOV5ZCOLCDor6XlsZ7mgKflsIbkuLogYHRydWVgXG4gICAgICovXG4gICAgdGhpcy5pc1JlbmRlcmVkID0gZmFsc2U7XG4gICAgXG4gICAgLy9UT0RPIGN1c3RvbSBiaW5kaW5nXG4gICAgdGhpcy5iaW5kaW5ncyA9ICh0aGlzLmJpbmRpbmdzIHx8IFtdKS5jb25jYXQob3B0cy5iaW5kaW5ncyB8fCBbXSk7XG5cbiAgICB0aGlzLnBhcnRpYWxzID0ge307XG4gICAgdGhpcy5maWx0ZXJzID0ge307XG4gICAgXG4gICAgZm9yKHZhciBldmVudCBpbiBldmVudHMpIHtcbiAgICAgIHRoaXMub24oZXZlbnQsIGV2ZW50c1tldmVudF0pO1xuICAgIH1cblxuICAgIGZvcih2YXIgZmlsdGVyTmFtZSBpbiBmaWx0ZXJzKXtcbiAgICAgIHRoaXMuc2V0RmlsdGVyKGZpbHRlck5hbWUsIGZpbHRlcnNbZmlsdGVyTmFtZV0pO1xuICAgIH1cbiAgICBcbiAgICBidWlsZFZpZXdNb2RlbC5jYWxsKHRoaXMpO1xuICAgIFxuICAgIC8v6L+Z6YeM6ZyA6KaB5ZCI5bm25Y+v6IO95a2Y5Zyo55qEIHRoaXMuZGF0YVxuICAgIC8v6KGo5Y2V5o6n5Lu25Y+v6IO95Lya5pyJ6buY6K6k5YC8LCBgYnVpbGRWaWV3TW9kZWxgIOWQjuS8mum7mOiupOWAvOS8muW5tuWFpSBgdGhpcy5kYXRhYCDkuK1cbiAgICBkYXRhID0gZXh0ZW5kKHRoaXMuZGF0YSwgZGF0YSk7XG4gICAgXG4gICAgaWYob3B0cy5kYXRhKXtcbiAgICAgIHRoaXMucmVuZGVyKGRhdGEpO1xuICAgIH1cbiAgICB0aGlzLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuICBcbiAgLy/pnZnmgIHmlrnms5VcbiAgLy8tLS1cbiAgZXh0ZW5kKEFudCwgQ2xhc3MsIERpciwge1xuICAgIHNldFByZWZpeDogc2V0UHJlZml4XG4gICwgZG9jOiBkb2NcbiAgLCBkaXJlY3RpdmVzOiB7fVxuICAsIHV0aWxzOiB1dGlsc1xuICB9KTtcbiAgXG4gIEFudC5zZXRQcmVmaXgoJ2EtJyk7XG4gIFxuICAvL+WGhee9riBkaXJlY3RpdmVcbiAgZm9yKHZhciBkaXIgaW4gZGlycykge1xuICAgIEFudC5kaXJlY3RpdmUoZGlyLCBkaXJzW2Rpcl0pO1xuICB9XG4gICAgXG4gIC8v5a6e5L6L5pa55rOVXG4gIC8vLS0tLVxuICBleHRlbmQoQW50LnByb3RvdHlwZSwgRXZlbnQsIHtcbiAgICAvKipcbiAgICAgKiAjIyMgYW50LnJlbmRlclxuICAgICAqIOa4suafk+aooeadv1xuICAgICAqL1xuICAgIHJlbmRlcjogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgZGF0YSA9IGRhdGEgfHwgdGhpcy5kYXRhO1xuICAgICAgdGhpcy5zZXQoZGF0YSwge2lzRXh0ZW5kOiBmYWxzZX0pO1xuICAgICAgdGhpcy5pc1JlbmRlcmVkID0gdHJ1ZTtcbiAgICAgIHRoaXMudHJpZ2dlcigncmVuZGVyJyk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogIyMjIGFudC5jbG9uZVxuICAgICAqIOWkjeWItuaooeadv1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0c11cbiAgICAgKiBAcmV0dXJuIHtUZW1wbGF0ZU9iamVjdH0g5LiA5Liq5pawIGBBbnRgIOWunuS+i1xuICAgICAqL1xuICAsIGNsb25lOiBmdW5jdGlvbihvcHRzKSB7XG4gICAgICB2YXIgb3B0aW9ucyA9IGV4dGVuZCh0cnVlLCB7fSwgdGhpcy5vcHRpb25zKTtcbiAgICAgIGlmKG9wdHMgJiYgb3B0cy5kYXRhKXsgb3B0aW9ucy5kYXRhID0gbnVsbDsgfVxuICAgICAgcmV0dXJuIG5ldyB0aGlzLmNvbnN0cnVjdG9yKHRoaXMudHBsLCBleHRlbmQodHJ1ZSwgb3B0aW9ucywgb3B0cykpO1xuICAgIH1cbiAgICBcbiAgLCBnZXQ6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIGRlZXBHZXQoa2V5LCB0aGlzLmRhdGEpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiAjIyMgYW50LnNldFxuICAgICAqIOabtOaWsCBgYW50LmRhdGFgIOS4reeahOaVsOaNrlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBba2V5XSDmlbDmja7ot6/lvoQuIFxuICAgICAqIEBwYXJhbSB7QW55VHlwZXxPYmplY3R9IHZhbCDmlbDmja7lhoXlrrkuIOWmguaenOaVsOaNrui3r+W+hOiiq+ecgeeVpSwg56ys5LiA5Liq5Y+C5pWw5piv5LiA5Liq5a+56LGhLiDpgqPkuYggdmFsIOWwhuabv+aNoiBhbnQuZGF0YSDmiJbogIXlubblhaXlhbbkuK1cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdF0g5Y+C5pWw6aG5XG4gICAgICogQHBhcmFtIHtCb29sZWFufSBvcHQuc2lsZW5jZSDmmK/lkKbpnZnpnZnnmoTmm7TmlrDmlbDmja7ogIzkuI3op6blj5EgYHVwZGF0ZWAg5LqL5Lu25Y+K5pu05pawIERPTS5cbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdC5pc0V4dGVuZCDmlbDmja7orr7nva7nsbvlnosuIOaYr+WQpuWwhuaVsOaNruW5tuWFpeWOn+aVsOaNri4gXG4gICAgICAgICAgICAgIOesrOS4gOS4quWPguaVsOaYr+aVsOaNrui3r+W+hOaYr+ivpeWAvOm7mOiupOS4uiBmYWxzZSwg6ICM56ys5LiA5Liq5pWw5o2u5piv5pWw5o2u5a+56LGh55qE5pe25YCZ5YiZ6buY6K6k5Li6IHRydWVcbiAgICAgKi9cbiAgLCBzZXQ6IGZ1bmN0aW9uKGtleSwgdmFsLCBvcHQpIHtcbiAgICAgIHZhciBjaGFuZ2VkLCBpc0V4dGVuZCwgcGFyZW50LCBrZXlzLCBwYXRoO1xuICAgICAgXG4gICAgICBpZihpc1VuZGVmaW5lZChrZXkpKXsgcmV0dXJuIHRoaXM7IH1cbiAgICAgIFxuICAgICAgaWYoaXNPYmplY3Qoa2V5KSl7XG4gICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgICBvcHQgPSB2YWw7XG4gICAgICAgIG9wdCA9IG9wdCB8fCB7fTtcbiAgICAgICAgaWYob3B0LmlzRXh0ZW5kICE9PSBmYWxzZSl7XG4gICAgICAgICAgaXNFeHRlbmQgPSB0cnVlO1xuICAgICAgICAgIG1vZGVsRXh0ZW5kKHRoaXMuZGF0YSwga2V5LCB0aGlzLl92bSk7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgIGlzRXh0ZW5kID0gZmFsc2U7XG4gICAgICAgICAgdGhpcy5kYXRhID0gbW9kZWxFeHRlbmQoe30sIGtleSwgdGhpcy5fdm0pO1xuICAgICAgICB9XG4gICAgICB9ZWxzZXtcbiAgICAgICAgb3B0ID0gb3B0IHx8IHt9O1xuICAgICAgICBcbiAgICAgICAgaWYoZGVlcEdldChrZXksIHRoaXMuZGF0YSkgIT09IHZhbCkge1xuICAgICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmKGNoYW5nZWQpe1xuICAgICAgICAgIGlmKG9wdC5pc0V4dGVuZCAhPT0gdHJ1ZSl7XG4gICAgICAgICAgICBrZXlzID0gcGFyc2VLZXlQYXRoKGtleSk7XG4gICAgICAgICAgICBpZihrZXlzLmxlbmd0aCA+IDEpe1xuICAgICAgICAgICAgICBwYXRoID0ga2V5cy5wb3AoKTtcbiAgICAgICAgICAgICAgcGFyZW50ID0gZGVlcEdldChrZXlzLmpvaW4oJy4nKSwgdGhpcy5kYXRhKTtcbiAgICAgICAgICAgICAgaWYoaXNVbmRlZmluZWQocGFyZW50KSl7XG4gICAgICAgICAgICAgICAgZGVlcFNldChrZXlzLmpvaW4oJy4nKSwgcGFyZW50ID0ge30sIHRoaXMuZGF0YSk7XG4gICAgICAgICAgICAgIH1lbHNlIGlmKCFpc09iamVjdChwYXJlbnQpKXtcbiAgICAgICAgICAgICAgICB2YXIgb2xkUGFyZW50ID0gcGFyZW50O1xuICAgICAgICAgICAgICAgIGRlZXBTZXQoa2V5cy5qb2luKCcuJyksIHBhcmVudCA9IHt0b1N0cmluZzogZnVuY3Rpb24oKSB7IHJldHVybiBvbGRQYXJlbnQ7IH19LCB0aGlzLmRhdGEpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgaWYoa2V5KXtcbiAgICAgICAgICAgICAgICBwYXJlbnQgPSB0aGlzLmRhdGE7XG4gICAgICAgICAgICAgICAgcGF0aCA9IGtleTtcbiAgICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgcGFyZW50ID0gdGhpcztcbiAgICAgICAgICAgICAgICBwYXRoID0gJ2RhdGEnO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwYXJlbnRbcGF0aF0gPSBpc09iamVjdCh2YWwpID8gbW9kZWxFeHRlbmQoaXNBcnJheSh2YWwpID8gW10gOiB7fSwgdmFsLCB0aGlzLl92bS4kZ2V0Vk0oa2V5LCAhaXNBcnJheSh2YWwpKSkgOiB2YWw7XG4gICAgICAgICAgICBpc0V4dGVuZCA9IGZhbHNlO1xuICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgbW9kZWxFeHRlbmQodGhpcy5kYXRhLCBkZWVwU2V0KGtleSwgdmFsLCB7fSksIHRoaXMuX3ZtKTtcbiAgICAgICAgICAgIGlzRXh0ZW5kID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNoYW5nZWQgJiYgKCFvcHQuc2lsZW5jZSkgJiYgKGlzT2JqZWN0KGtleSkgPyB1cGRhdGUuY2FsbCh0aGlzLCBrZXksIGlzRXh0ZW5kLCBvcHQuaXNCdWJibGUpIDogdXBkYXRlLmNhbGwodGhpcywga2V5LCB2YWwsIGlzRXh0ZW5kLCBvcHQuaXNCdWJibGUpKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiAjIyMgYW50LnNldFBhcnRpYWxcbiAgICAgKiDmt7vliqDlrZDmqKHmnb9cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gaW5mbyDlrZDmqKHmnb/kv6Hmga9cbiAgICAgKiBAcGFyYW0ge1N0cmluZ3xIVE1MRWxlbWVudH0gaW5mby5jb250ZW50IOWtkOaooeadv+WGheWuuVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBbaW5mby5uYW1lXSDlrZDmqKHmnb/moIfnpLrnrKZcbiAgICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fGZ1bmN0aW9ufSBbaW5mby50YXJnZXRdIOWtkOaooeadv+eahOebruagh+iKgueCuVxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gW2luZm8uZXNjYXBlXSDmmK/lkKbovazkuYnlrZfnrKbkuLLlrZDmqKHmnb9cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gW2luZm8ucGF0aF0g5oyH5a6a5a2Q5qih5p2/5Lit5Y+Y6YeP5Zyo5pWw5o2u5Lit55qE5L2c55So5Z+fXG4gICAgICovXG4gICwgc2V0UGFydGlhbDogZnVuY3Rpb24ocGFydGlhbEluZm8pIHtcbiAgICAgIGlmKCFwYXJ0aWFsSW5mbyl7IHJldHVybjsgfVxuICAgICAgXG4gICAgICBwYXJ0aWFsSW5mbyA9IGV4dGVuZCh7fSwgdGhpcy5wYXJ0aWFsc1twYXJ0aWFsSW5mby5uYW1lXSwgcGFydGlhbEluZm8pO1xuICAgICAgXG4gICAgICB2YXIgZWxzLCBfZWxzLCB2bVxuICAgICAgICAsIG5hbWUgPSBwYXJ0aWFsSW5mby5uYW1lXG4gICAgICAgICwgdGFyZ2V0ID0gcGFydGlhbEluZm8udGFyZ2V0XG4gICAgICAgICwgcGFydGlhbCA9IHBhcnRpYWxJbmZvLmNvbnRlbnRcbiAgICAgICAgLCBwYXRoID0gcGFydGlhbEluZm8ucGF0aCB8fCAnJ1xuICAgICAgICA7XG4gICAgICBpZihuYW1lKXtcbiAgICAgICAgdGhpcy5wYXJ0aWFsc1tuYW1lXSA9IHBhcnRpYWxJbmZvO1xuICAgICAgfVxuICAgICAgaWYocGFydGlhbCkge1xuICAgICAgICB2bSA9IHRoaXMuX3ZtLiRnZXRWTShwYXRoKTtcbiAgICAgICAgXG4gICAgICAgIGlmKHR5cGVvZiBwYXJ0aWFsID09PSAnc3RyaW5nJyl7XG4gICAgICAgICAgaWYocGFydGlhbEluZm8uZXNjYXBlKXtcbiAgICAgICAgICAgIGVscyA9IFtkb2MuY3JlYXRlVGV4dE5vZGUocGFydGlhbCldO1xuICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgX2VscyA9IHRwbFBhcnNlKHBhcnRpYWwsICdkaXYnKS5lbC5jaGlsZE5vZGVzO1xuICAgICAgICAgICAgZWxzID0gW107XG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwLCBsID0gX2Vscy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgICAgICAgICBlbHMucHVzaChfZWxzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgIGVscyA9IFsocGFydGlhbCBpbnN0YW5jZW9mIEFudCkgPyBwYXJ0aWFsLmVsIDogcGFydGlhbF07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmKHRhcmdldCl7XG4gICAgICAgICAgZm9yKHZhciBpID0gMCwgbCA9IGVscy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgICAgICAgaXNGdW5jdGlvbih0YXJnZXQpID8gXG4gICAgICAgICAgICAgIHRhcmdldC5jYWxsKHRoaXMsIGVsc1tpXSkgOlxuICAgICAgICAgICAgICB0YXJnZXQuYXBwZW5kQ2hpbGQoZWxzW2ldKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRyYXZlbEVsKGVscywgdm0pO1xuICAgICAgICB0aGlzLmlzUmVuZGVyZWQgJiYgdm0uJHNldChkZWVwR2V0KHBhdGgsIHRoaXMuZGF0YSksIGZhbHNlLCB0cnVlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgLCBpbml0OiB1dGlscy5ub29wXG4gIFxuICAsIHdhdGNoOiBmdW5jdGlvbihrZXlQYXRoLCBjYWxsYmFjaykge1xuICAgICAgaWYoa2V5UGF0aCAmJiBjYWxsYmFjayl7XG4gICAgICAgIG5ldyBXYXRjaGVyKHRoaXMuX3ZtLCB7cGF0aDoga2V5UGF0aH0sIGNhbGxiYWNrKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgLCB1bndhdGNoOiBmdW5jdGlvbihrZXlQYXRoLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHZtID0gdGhpcy5fdm0uJGdldFZNKGtleVBhdGgsIHRydWUpO1xuICAgICAgaWYodm0pe1xuICAgICAgICBmb3IodmFyIGkgPSB2bS4kd2F0Y2hlcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pe1xuICAgICAgICAgIGlmKHZtLiR3YXRjaGVyc1tpXS5jYWxsYmFjayA9PT0gY2FsbGJhY2spe1xuICAgICAgICAgICAgdm0uJHdhdGNoZXJzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBcbiAgICBcbiAgLCBzZXRGaWx0ZXI6IGZ1bmN0aW9uKG5hbWUsIGZpbHRlcikge1xuICAgICAgdGhpcy5maWx0ZXJzW25hbWVdID0gZmlsdGVyLmJpbmQodGhpcyk7XG4gICAgfVxuICAsIGdldEZpbHRlcjogZnVuY3Rpb24obmFtZSkge1xuICAgICAgcmV0dXJuIHRoaXMuZmlsdGVyc1tuYW1lXVxuICAgIH1cbiAgLCByZW1vdmVGaWx0ZXI6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLmZpbHRlcnNbbmFtZV07XG4gICAgfVxuICB9KTtcbiAgXG4gIC8qKlxuICAgKiDmm7TmlrDmqKHmnb8uIFxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSDopoHmm7TmlrDnmoTmlbDmja4uIOWinumHj+aVsOaNruaIluWFqOaWsOeahOaVsOaNri5cbiAgICogQHBhcmFtIHtTdHJpbmd9IFtrZXlQYXRoXSDpnIDopoHmm7TmlrDnmoTmlbDmja7ot6/lvoQuXG4gICAqIEBwYXJhbSB7QW55VHlwZXxPYmplY3R9IFtkYXRhXSDpnIDopoHmm7TmlrDnmoTmlbDmja4uIOecgeeVpeeahOivneWwhuS9v+eUqOeOsOacieeahOaVsOaNri5cbiAgICogQHBhcmFtIHtCb29sZWFufSBbaXNFeHRlbmRdIOeVjOmdouabtOaWsOexu+Weiy5cbiAgICAgICAgICAgIOS4uiB0cnVlIOaXtiwg5piv5omp5bGV5byP5pu05pawLCDljp/mnInnmoTmlbDmja7kuI3lj5hcbiAgICAgICAgICAgIOS4uiBmYWxzZSDml7YsIOS4uuabv+aNouabtOaWsCwg5LiN5ZyoIGRhdGEg5Lit55qE5Y+Y6YePLCDlsIblnKggRE9NIOS4reiiq+a4heepui5cbiAgICovXG4gIGZ1bmN0aW9uIHVwZGF0ZSAoa2V5UGF0aCwgZGF0YSwgaXNFeHRlbmQsIGlzQnViYmxlKSB7XG4gICAgdmFyIGF0dHJzLCB2bSA9IHRoaXMuX3ZtO1xuICAgIGlmKGlzT2JqZWN0KGtleVBhdGgpKXtcbiAgICAgIGlzQnViYmxlID0gaXNFeHRlbmQ7XG4gICAgICBpc0V4dGVuZCA9IGRhdGE7XG4gICAgICBhdHRycyA9IGRhdGEgPSBrZXlQYXRoO1xuICAgIH1lbHNlIGlmKHR5cGVvZiBrZXlQYXRoID09PSAnc3RyaW5nJyl7XG4gICAgICBrZXlQYXRoID0gcGFyc2VLZXlQYXRoKGtleVBhdGgpLmpvaW4oJy4nKTtcbiAgICAgIGlmKGlzVW5kZWZpbmVkKGRhdGEpKXtcbiAgICAgICAgZGF0YSA9IHRoaXMuZ2V0KGtleVBhdGgpO1xuICAgICAgfVxuICAgICAgYXR0cnMgPSBkZWVwU2V0KGtleVBhdGgsIGRhdGEsIHt9KTtcbiAgICAgIHZtID0gdm0uJGdldFZNKGtleVBhdGgpO1xuICAgIH1lbHNle1xuICAgICAgZGF0YSA9IHRoaXMuZGF0YTtcbiAgICB9XG4gICAgXG4gICAgaWYoaXNVbmRlZmluZWQoaXNFeHRlbmQpKXsgaXNFeHRlbmQgPSBpc09iamVjdChrZXlQYXRoKTsgfVxuICAgIHZtLiRzZXQoZGF0YSwgaXNFeHRlbmQsIGlzQnViYmxlICE9PSBmYWxzZSk7XG4gICAgdGhpcy50cmlnZ2VyKCd1cGRhdGUnLCBhdHRycyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgXG4gIGZ1bmN0aW9uIGJ1aWxkVmlld01vZGVsKCkge1xuICAgIHZhciB2bSA9IG5ldyBWaWV3TW9kZWwoe1xuICAgICAgJGFudDogdGhpc1xuICAgIH0pO1xuICAgIFxuICAgIHRoaXMuX3ZtID0gdm07XG4gICAgdHJhdmVsRWwodGhpcy5lbCwgdm0pO1xuICB9XG4gIFxuICB2YXIgTk9ERVRZUEUgPSB7XG4gICAgQVRUUjogMlxuICAsIFRFWFQ6IDNcbiAgLCBDT01NRU5UOiA4XG4gIH07XG4gIFxuICAvL+mBjeWOhuWFg+e0oOWPiuWFtuWtkOWFg+e0oOeahOaJgOacieWxnuaAp+iKgueCueWPiuaWh+acrOiKgueCuVxuICBmdW5jdGlvbiB0cmF2ZWxFbChlbCwgdm0pIHtcbiAgICBpZihlbC5sZW5ndGggJiYgaXNVbmRlZmluZWQoZWwubm9kZVR5cGUpKXtcbiAgICAgIC8vbm9kZSBsaXN0XG4gICAgICBmb3IodmFyIGkgPSAwLCBsID0gZWwubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHRyYXZlbEVsKGVsW2ldLCB2bSk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIFxuICAgIGlmKGVsLm5vZGVUeXBlID09PSBOT0RFVFlQRS5DT01NRU5UKXtcbiAgICAgIC8v5rOo6YeK6IqC54K5XG4gICAgICByZXR1cm47XG4gICAgfWVsc2UgaWYoZWwubm9kZVR5cGUgPT09IE5PREVUWVBFLlRFWFQpe1xuICAgICAgLy/mlofmnKzoioLngrlcbiAgICAgIGNoZWNrVGV4dChlbCwgdm0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBcbiAgICAvL+mBh+WIsCB0ZXJtaW5hbCDkuLogdHJ1ZSDnmoQgZGlyZWN0aXZlIOWxnuaAp+S4jeWGjemBjeWOhlxuICAgIGlmKGNoZWNrQXR0cihlbCwgdm0pKXtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgXG4gICAgZm9yKHZhciBjaGlsZCA9IGVsLmZpcnN0Q2hpbGQsIG5leHQ7IGNoaWxkOyApe1xuICAgICAgbmV4dCA9IGNoaWxkLm5leHRTaWJsaW5nO1xuICAgICAgdHJhdmVsRWwoY2hpbGQsIHZtKTtcbiAgICAgIGNoaWxkID0gbmV4dDtcbiAgICB9XG4gIH1cbiAgXG4gIC8v6YGN5Y6G5bGe5oCnXG4gIGZ1bmN0aW9uIGNoZWNrQXR0cihlbCwgdm0pIHtcbiAgICB2YXIgcHJlZml4ID0gQW50LnByZWZpeFxuICAgICAgLCBkaXJzID0gZ2V0RGlyKGVsLCBBbnQuZGlyZWN0aXZlcywgcHJlZml4KVxuICAgICAgLCBkaXJcbiAgICAgICwgdGVybWluYWxQcmlvcml0eSwgdGVybWluYWxcbiAgICAgIDtcbiAgICBcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGRpcnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBkaXIgPSBkaXJzW2ldO1xuICAgICBcbiAgICAgIC8v5a+55LqOIHRlcm1pbmFsIOS4uiB0cnVlIOeahCBkaXJlY3RpdmUsIOWcqOino+aekOWujOWFtuebuOWQjOadg+mHjeeahCBkaXJlY3RpdmUg5ZCO5Lit5pat6YGN5Y6G6K+l5YWD57SgXG4gICAgICBpZih0ZXJtaW5hbFByaW9yaXR5IDwgZGlyLnByaW9yaXR5KSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgXG4gICAgICBzZXRCaW5kaW5nKHZtLCBkaXIpO1xuICAgICBcbiAgICAgIGVsLnJlbW92ZUF0dHJpYnV0ZShkaXIubm9kZS5ub2RlTmFtZSk7XG4gICAgICBcbiAgICAgIGlmKGRpci50ZXJtaW5hbCkge1xuICAgICAgICB0ZXJtaW5hbCA9IHRydWU7XG4gICAgICAgIHRlcm1pbmFsUHJpb3JpdHkgPSBkaXIucHJpb3JpdHk7XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIGlmKHRlcm1pbmFsKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgXG4gIHZhciBwYXJ0aWFsUmVnID0gL14+XFxzKig/PS4rKS87XG4gIC8v5aSE55CG5paH5pys6IqC54K55Lit55qE57uR5a6a5Y2g5L2N56ymKHt7Li4ufX0pXG4gIGZ1bmN0aW9uIGNoZWNrVGV4dChub2RlLCB2bSkge1xuICAgIGlmKHRva2VuLmhhc1Rva2VuKG5vZGUubm9kZVZhbHVlKSkge1xuICAgICAgdmFyIHRva2VucyA9IHRva2VuLnBhcnNlVG9rZW4obm9kZS5ub2RlVmFsdWUpXG4gICAgICAgICwgdGV4dE1hcCA9IHRva2Vucy50ZXh0TWFwXG4gICAgICAgICwgZWwgPSBub2RlLnBhcmVudE5vZGVcbiAgICAgICAgXG4gICAgICAgICwgdCwgZGlyXG4gICAgICAgIDtcbiAgICAgIFxuICAgICAgLy/lsIZ7e2tleX195YiG5Ymy5oiQ5Y2V54us55qE5paH5pys6IqC54K5XG4gICAgICBpZih0ZXh0TWFwLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgdGV4dE1hcC5mb3JFYWNoKGZ1bmN0aW9uKHRleHQpIHtcbiAgICAgICAgICB2YXIgdG4gPSBkb2MuY3JlYXRlVGV4dE5vZGUodGV4dCk7XG4gICAgICAgICAgZWwuaW5zZXJ0QmVmb3JlKHRuLCBub2RlKTtcbiAgICAgICAgICBjaGVja1RleHQodG4sIHZtKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGVsLnJlbW92ZUNoaWxkKG5vZGUpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIHQgPSB0b2tlbnNbMF07XG4gICAgICAgIC8v5YaF572u5ZCE5Y2g5L2N56ym5aSE55CGLiBcbiAgICAgICAgLy/lrprkuYnmlrDnmoTlj4LmlbAsIOWwhuWFtuaUvuWIsCBkaXJlY3RpdmUg5Lit5aSE55CGP1xuICAgICAgICBpZihwYXJ0aWFsUmVnLnRlc3QodC5wYXRoKSkge1xuICAgICAgICAgIHQucGF0aCA9IHQucGF0aC5yZXBsYWNlKHBhcnRpYWxSZWcsICcnKTtcbiAgICAgICAgICBkaXIgPSBjcmVhdGUoQW50LmRpcmVjdGl2ZXMucGFydGlhbCk7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgIGRpciA9IGNyZWF0ZSh0LmVzY2FwZSA/IEFudC5kaXJlY3RpdmVzLnRleHQgOiBBbnQuZGlyZWN0aXZlcy5odG1sKTtcbiAgICAgICAgfVxuICAgICAgICBzZXRCaW5kaW5nKHZtLCBleHRlbmQoZGlyLCB0LCB7XG4gICAgICAgICAgZWw6IG5vZGVcbiAgICAgICAgfSkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBcbiAgLy/ojrflj5bkuIDkuKrlhYPntKDkuIrmiYDmnInnlKggSFRNTCDlsZ7mgKflrprkuYnnmoTmjIfku6RcbiAgZnVuY3Rpb24gZ2V0RGlyKGVsLCBkaXJlY3RpdmVzLCBwcmVmaXgpIHtcbiAgICBwcmVmaXggPSBwcmVmaXggfHwgJyc7XG4gICAgZGlyZWN0aXZlcyA9IGRpcmVjdGl2ZXMgfHwge307XG4gICAgXG4gICAgdmFyIGF0dHIsIGF0dHJOYW1lLCBkaXJOYW1lXG4gICAgICAsIGRpcnMgPSBbXSwgZGlyXG4gICAgICA7XG4gICAgICBcbiAgICBmb3IodmFyIGkgPSBlbC5hdHRyaWJ1dGVzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKXtcbiAgICAgIGF0dHIgPSBlbC5hdHRyaWJ1dGVzW2ldO1xuICAgICAgYXR0ck5hbWUgPSBhdHRyLm5vZGVOYW1lO1xuICAgICAgZGlyTmFtZSA9IGF0dHJOYW1lLnNsaWNlKHByZWZpeC5sZW5ndGgpO1xuICAgICAgaWYoYXR0ck5hbWUuaW5kZXhPZihwcmVmaXgpID09PSAwICYmIChkaXJOYW1lIGluIGRpcmVjdGl2ZXMpKSB7XG4gICAgICAgIGRpciA9IGNyZWF0ZShkaXJlY3RpdmVzW2Rpck5hbWVdKTtcbiAgICAgICAgZGlyLmRpck5hbWUgPSBkaXJOYW1lXG4gICAgICB9ZWxzZSBpZih0b2tlbi5oYXNUb2tlbihhdHRyLnZhbHVlKSkge1xuICAgICAgICBkaXIgPSBjcmVhdGUoZGlyZWN0aXZlc1snYXR0ciddKTtcbiAgICAgICAgZGlyLmRpcnMgPSB0b2tlbi5wYXJzZVRva2VuKGF0dHIudmFsdWUpO1xuICAgICAgICBkaXIuZGlyTmFtZSA9IGF0dHJOYW1lLmluZGV4T2YocHJlZml4KSA9PT0gMCA/IGRpck5hbWUgOiBhdHRyTmFtZSA7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgZGlyID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGlmKGRpcikge1xuICAgICAgICBkaXJzLnB1c2goZXh0ZW5kKGRpciwge2VsOiBlbCwgbm9kZTogYXR0ciwgbm9kZU5hbWU6IGF0dHJOYW1lLCBwYXRoOiBhdHRyLnZhbHVlfSkpO1xuICAgICAgfVxuICAgIH1cbiAgICBkaXJzLnNvcnQoZnVuY3Rpb24oZDAsIGQxKSB7XG4gICAgICByZXR1cm4gZDAucHJpb3JpdHkgLSBkMS5wcmlvcml0eTtcbiAgICB9KTtcbiAgICByZXR1cm4gZGlycztcbiAgfVxuICBcbiAgZnVuY3Rpb24gc2V0QmluZGluZyh2bSwgZGlyKSB7XG4gICAgaWYoZGlyLnJlcGxhY2UpIHtcbiAgICAgIHZhciBlbCA9IGRpci5lbDtcbiAgICAgIGlmKGlzRnVuY3Rpb24oZGlyLnJlcGxhY2UpKSB7XG4gICAgICAgIGRpci5ub2RlID0gZGlyLnJlcGxhY2UoKTtcbiAgICAgIH1lbHNle1xuICAgICAgICBkaXIubm9kZSA9IGRvYy5jcmVhdGVDb21tZW50KGRpci50eXBlICsgJyA9ICcgKyBkaXIucGF0aCk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGRpci5lbCA9IGRpci5lbC5wYXJlbnROb2RlO1xuICAgICAgZGlyLmVsLnJlcGxhY2VDaGlsZChkaXIubm9kZSwgZWwpO1xuICAgIH1cbiAgICBcbiAgICBkaXIuaW5pdCh2bSk7XG4gICAgXG4gICAgaWYoZGlyLmRpcnMpIHtcbiAgICAgIGRpci5kaXJzLmZvckVhY2goZnVuY3Rpb24odG9rZW4pIHtcbiAgICAgICAgYWRkV2F0Y2hlcih2bSwgZXh0ZW5kKGRpciwgdG9rZW4pKTtcbiAgICAgIH0pO1xuICAgIH1lbHNle1xuICAgICAgYWRkV2F0Y2hlcih2bSwgZGlyKTtcbiAgICB9XG4gIH1cbiAgXG4gIGZ1bmN0aW9uIFZpZXdNb2RlbChvcHRzKSB7XG4gICAgZXh0ZW5kKHRoaXMsIHtcbiAgICAgICRrZXk6ICcnXG4gICAgLCAkcm9vdDogdGhpc1xuICAgICwgJHdhdGNoZXJzOiBbXVxuICAgICwgJGFzc2lnbm1lbnQ6IHt9XG4gICAgfSwgb3B0cyk7XG4gIH1cbiAgXG4gIFZpZXdNb2RlbC5wcm90b3R5cGUgPSB7XG4gICAgJHJvb3Q6IG51bGxcbiAgLCAkcGFyZW50OiBudWxsXG4gIFxuICAsICRhbnQ6IG51bGxcbiAgLCAka2V5OiBudWxsXG4gICwgJHJlcGVhdDogZmFsc2VcbiAgLCAkYXNzaWdubWVudDogbnVsbFxuICBcbiAgLCAkd2F0Y2hlcnM6IG51bGxcblxuICAsICR2YWx1ZTogTmFOXG4gICAgXG4gIC8v6I635Y+W5a2QIHZtXG4gIC8vc3RyaWN0OiBmYWxzZShkZWZhdWx0KeS4jeWtmOWcqOeahOivneWwhuaWsOW7uuS4gOS4qlxuICAsICRnZXRWTTogZnVuY3Rpb24ocGF0aCwgc3RyaWN0KSB7XG4gICAgICBwYXRoID0gcGF0aCArICcnO1xuICAgICAgXG4gICAgICB2YXIga2V5LCB2bVxuICAgICAgICAsIGN1ciA9IHRoaXNcbiAgICAgICAgLCBrZXlDaGFpbiA9IHV0aWxzLnBhcnNlS2V5UGF0aChwYXRoKVxuICAgICAgICA7XG4gICAgICAgIFxuICAgICAgaWYoa2V5Q2hhaW5bMF0gaW4gdGhpcy4kYXNzaWdubWVudCkge1xuICAgICAgICBjdXIgPSB0aGlzLiRhc3NpZ25tZW50W2tleUNoYWluWzBdXTtcbiAgICAgICAga2V5Q2hhaW4uc2hpZnQoKTtcbiAgICAgIH1cbiAgICAgIGlmKHBhdGgpe1xuICAgICAgICBmb3IodmFyIGkgPSAwLCBsID0ga2V5Q2hhaW4ubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgICAgICBrZXkgPSBrZXlDaGFpbltpXTtcbiAgICAgICAgICBcbiAgICAgICAgICBpZighY3VyW2tleV0pe1xuICAgICAgICAgICAgaWYoc3RyaWN0KXsgcmV0dXJuIG51bGw7IH1cbiAgICAgICAgICAgIHZtID0gbmV3IFZpZXdNb2RlbCh7XG4gICAgICAgICAgICAgICRwYXJlbnQ6IGN1clxuICAgICAgICAgICAgLCAkcm9vdDogY3VyLiRyb290XG4gICAgICAgICAgICAsICRhc3NpZ25tZW50OiBleHRlbmQoe30sIGN1ci4kYXNzaWdubWVudClcbiAgICAgICAgICAgICwgJGtleToga2V5XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY3VyW2tleV0gPSB2bTtcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgY3VyID0gY3VyW2tleV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBjdXI7XG4gICAgfVxuICAgIFxuICAsICRnZXRLZXlQYXRoOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBrZXlQYXRoID0gdGhpcy4ka2V5XG4gICAgICAgICwgY3VyID0gdGhpc1xuICAgICAgICA7XG4gICAgICB3aGlsZShjdXIgPSBjdXIuJHBhcmVudCl7XG4gICAgICAgIGlmKGN1ci4ka2V5KXtcbiAgICAgICAgICBrZXlQYXRoID0gY3VyLiRrZXkgKyAnLicgKyBrZXlQYXRoO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGtleVBhdGg7XG4gICAgfVxuICBcbiAgLy/ojrflj5blr7nosaHnmoTmn5DkuKrlgLwsIOayoeacieeahOivneafpeaJvueItuiKgueCuSwg55u05Yiw6aG25bGCLlxuICAsICRnZXREYXRhOiBmdW5jdGlvbihrZXksIGlzU3RyaWN0KSB7XG4gICAgICBpZihrZXkgPT09ICckaW5kZXgnICYmIHRoaXMuJHBhcmVudCAmJiB0aGlzLiRwYXJlbnQuJHJlcGVhdCl7XG4gICAgICAgIHJldHVybiB0aGlzLiRrZXkgKiAxO1xuICAgICAgfVxuICAgICAgdmFyIGN1clZhbCA9IGRlZXBHZXQoa2V5LCB0aGlzLiRyb290LiRhbnQuZ2V0KHRoaXMuJGdldEtleVBhdGgoKSkpO1xuICAgICAgaWYoaXNTdHJpY3QgfHwgIXRoaXMuJHBhcmVudCB8fCAhaXNVbmRlZmluZWQoY3VyVmFsKSl7XG4gICAgICAgIHJldHVybiBjdXJWYWw7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgcmV0dXJuIHRoaXMuJHBhcmVudC4kZ2V0RGF0YShrZXkpO1xuICAgICAgfVxuICAgIH1cbiAgLCAkc2V0OiBmdW5jdGlvbiAoZGF0YSwgaXNFeHRlbmQsIGlzQnViYmxlKSB7XG4gICAgICB2YXIgbWFwID0gaXNFeHRlbmQgPyBkYXRhIDogdGhpc1xuICAgICAgICAsIHBhcmVudCA9IHRoaXNcbiAgICAgICAgO1xuICAgICAgXG4gICAgICBcbiAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSB0aGlzLiR3YXRjaGVycy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgICBpZigodGhpcy4kdmFsdWUgIT09IGRhdGEpIHx8IHRoaXMuJHdhdGNoZXJzW2ldLnN0YXRlID09PSBXYXRjaGVyLlNUQVRFX1JFQURZKXtcbiAgICAgICAgICB0aGlzLiR3YXRjaGVyc1tpXS5mbigpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aGlzLiR2YWx1ZSA9IGRhdGE7XG4gICAgICBcbiAgICAgIGlmKGlzT2JqZWN0KG1hcCkpe1xuICAgICAgICBmb3IodmFyIHBhdGggaW4gbWFwKSB7XG4gICAgICAgICAgLy/kvKDlhaXnmoTmlbDmja7plK7lgLzkuI3og73lkowgdm0g5Lit55qE6Ieq5bim5bGe5oCn5ZCN55u45ZCMLlxuICAgICAgICAgIC8v5omA5Lul5LiN5o6o6I2Q5L2/55SoICckJyDkvZzkuLogSlNPTiDmlbDmja7plK7lgLznmoTlvIDlpLQuXG4gICAgICAgICAgaWYodGhpcy5oYXNPd25Qcm9wZXJ0eShwYXRoKSAmJiAoIShwYXRoIGluIFZpZXdNb2RlbC5wcm90b3R5cGUpKSAmJiAoIXRoaXMuJHJlcGVhdCB8fCBwYXRoID09PSAnbGVuZ3RoJykpe1xuICAgICAgICAgICAgdGhpc1twYXRoXS4kc2V0KGRhdGEgPyBkYXRhW3BhdGhdIDogdm9pZCgwKSwgaXNFeHRlbmQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZihpc0J1YmJsZSl7XG4gICAgICAgIHdoaWxlKHBhcmVudCA9IHBhcmVudC4kcGFyZW50KXtcbiAgICAgICAgICBmb3IodmFyIGkgPSAwLCBsID0gcGFyZW50LiR3YXRjaGVycy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgICAgICAgcGFyZW50LiR3YXRjaGVyc1tpXS5mbigpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTtcbiAgXG4gIC8vYnVpZCBpbiBiaW5kaW5nc1xuICB2YXIgYmFzZUJpbmRpbmdzID0gW1xuICAgIC8vaWYgLyByZXBlYXRcbiAgICBmdW5jdGlvbih2bSwgdG9rZW4pIHtcbiAgICAgIGlmKHRva2VuLm5vZGVOYW1lID09PSBhbnRBdHRyLklGIHx8IHRva2VuLm5vZGVOYW1lID09PSBhbnRBdHRyLlJFUEVBVCl7XG4gICAgICAgIHJldHVybiBuZXcgR2VuZXJhdG9yKHZtLCB0b2tlbik7XG4gICAgICB9XG4gICAgfVxuICBdO1xuICBcbiAgZnVuY3Rpb24gYWRkV2F0Y2hlcih2bSwgZGlyLCBjYWxsYmFjaykge1xuICAgIGlmKGRpci5wYXRoKSB7XG4gICAgICByZXR1cm4gbmV3IFdhdGNoZXIodm0sIGRpciwgY2FsbGJhY2spO1xuICAgIH1cbiAgfVxuICBcbiAgdmFyIGV4UGFyc2UgPSBmdW5jdGlvbihwYXRoKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciBhc3QgPSBwYXJzZShwYXRoLCB0aGlzLnR5cGUgJiYgdGhpcy50eXBlLnNsaWNlKHByZWZpeC5sZW5ndGgpKTtcbiAgICAgIFxuICAgIGV4dGVuZCh0aGlzLCBldmFsdWF0ZS5zdW1tYXJ5KGFzdCkpO1xuICAgIHRoaXMuX2FzdCA9IGFzdDtcbiAgfTtcbiAgXG4gIGZ1bmN0aW9uIFdhdGNoZXIocmVsYXRpdmVWbSwgdG9rZW4sIGNhbGxiYWNrKSB7XG4gICAgdGhpcy50b2tlbiA9IHRva2VuO1xuICAgIHRoaXMucmVsYXRpdmVWbSA9IHJlbGF0aXZlVm07XG4gICAgdGhpcy5hbnQgPSByZWxhdGl2ZVZtLiRyb290LiRhbnQ7XG4gICAgXG4gICAgdGhpcy5lbCA9IHRva2VuLmVsO1xuICAgIHRoaXMudmFsID0gTmFOO1xuICAgIFxuICAgIHRoaXMudXBkYXRlID0gY2FsbGJhY2sgPyBjYWxsYmFjayA6IHRva2VuLnVwZGF0ZTtcbiAgICBcbiAgICB0b2tlbi5wYXRoICYmIGV4UGFyc2UuY2FsbCh0aGlzLCB0b2tlbi5wYXRoKTtcbiAgICBcbiAgICB2YXIgcm9vdCA9IHJlbGF0aXZlVm1cbiAgICAgICwgcGF0aHNcbiAgICAgICwgcnVuID0gIXRoaXMubG9jYWxzLmxlbmd0aFxuICAgICAgO1xuICAgIFxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSB0aGlzLnBhdGhzLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICBwYXRocyA9IHV0aWxzLnBhcnNlS2V5UGF0aCh0aGlzLnBhdGhzW2ldKTtcbiAgICAgIGlmKCEocGF0aHNbMF0gaW4gcmVsYXRpdmVWbS4kYXNzaWdubWVudCkpIHtcbiAgICAgICAgcm9vdCA9IHJlbGF0aXZlVm0uJHJvb3Q7XG4gICAgICAgIHJ1biA9IHJ1biB8fCByb290ICE9PSByZWxhdGl2ZVZtO1xuICAgICAgfWVsc2V7XG4gICAgICAgIC8vaWYodGhpcy5zdGF0ZSA9PSBXYXRjaGVyLlNUQVRFX1JFQURZKSB7XG4gICAgICAgICAgcnVuID0gdHJ1ZTsvL+W8leeUqOeItue6pyBWTSDml7YsIOeri+WNs+iuoeeul1xuICAgICAgICAvL31cbiAgICAgIH1cbiAgICAgIHJvb3QuJGdldFZNKHRoaXMucGF0aHNbaV0pLiR3YXRjaGVycy5wdXNoKHRoaXMpO1xuICAgIH1cbiAgICBcbiAgICB0aGlzLnN0YXRlID0gV2F0Y2hlci5TVEFURV9SRUFEWVxuICAgIFxuICAgIC8vV2hlbiB0aGVyZSBpcyBubyB2YXJpYWJsZSBpbiBhIGJpbmRpbmcsIGV2YWx1YXRlIGl0IGltbWVkaWF0ZWx5LlxuICAgIGlmKHJ1bikge1xuICAgICAgdGhpcy5mbigpO1xuICAgIH1cbiAgfVxuICBcbiAgZXh0ZW5kKFdhdGNoZXIsIHtcbiAgICBTVEFURV9SRUFEWTogMFxuICAsIFNUQVRFX0NBTExFRDogMVxuICB9LCBDbGFzcyk7XG4gIFxuICBleHRlbmQoV2F0Y2hlci5wcm90b3R5cGUsIHtcbiAgICBmbjogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgdmFscyA9IHt9LCBrZXk7XG4gICAgICBmb3IodmFyIGkgPSAwLCBsID0gdGhpcy5sb2NhbHMubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgICAga2V5ID0gdGhpcy5sb2NhbHNbaV07XG4gICAgICAgIGlmKGtleSBpbiB0aGlzLnJlbGF0aXZlVm0uJGFzc2lnbm1lbnQpe1xuICAgICAgICAgIHZhbHNba2V5XSA9IHRoaXMucmVsYXRpdmVWbS4kYXNzaWdubWVudFtrZXldLiRnZXREYXRhKCk7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgIHZhbHNba2V5XSA9IHRoaXMucmVsYXRpdmVWbS4kZ2V0RGF0YShrZXkpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFxuICAgICAgdmFyIG5ld1ZhbCA9IHRoaXMuZ2V0VmFsdWUodmFscylcbiAgICAgICAgLCBkaXIgPSB0aGlzLnRva2VuXG4gICAgICAgIDtcbiAgICAgICAgXG4gICAgICBpZihuZXdWYWwgIT09IHRoaXMudmFsIHx8IGlzT2JqZWN0KG5ld1ZhbCkpe1xuICAgICAgICB0cnl7XG4gICAgICAgICAgdGhpcy51cGRhdGUuY2FsbCh0aGlzLnRva2VuLCBuZXdWYWwsIHRoaXMudmFsKTtcbiAgICAgICAgICB0aGlzLnZhbCA9IG5ld1ZhbDtcbiAgICAgICAgfWNhdGNoKGUpe1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRoaXMuc3RhdGUgPSBXYXRjaGVyLlNUQVRFX0NBTExFRDtcbiAgICB9XG4gICwgZ2V0VmFsdWU6IGZ1bmN0aW9uKHZhbHMpIHtcbiAgICAgIHZhciBmaWx0ZXJzID0gdGhpcy5maWx0ZXJzXG4gICAgICAgICwgYW50ID0gdGhpcy5hbnQsIHZhbFxuICAgICAgICA7XG4gICAgICBcbiAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSBmaWx0ZXJzLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICAgIGlmKCFhbnQuZmlsdGVyc1tmaWx0ZXJzW2ldXSl7XG4gICAgICAgICAgY29uc29sZS5lcnJvcignRmlsdGVyOiAnICsgZmlsdGVyc1tpXSArICcgbm90IGZvdW5kIScpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBcbiAgICAgIHRyeXtcbiAgICAgICAgdmFsID0gZXZhbHVhdGUuZXZhbCh0aGlzLl9hc3QsIHtsb2NhbHM6IHZhbHMsIGZpbHRlcnM6IGFudC5maWx0ZXJzfSk7XG4gICAgICB9Y2F0Y2goZSl7XG4gICAgICAgIHZhbCA9ICcnO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHZhbDtcbiAgICB9XG4gIH0pO1xuICBcbiAgLy8tLS1cbiAgZnVuY3Rpb24gY2FsbFJlcGVhdGVyKHZtQXJyYXksIG1ldGhvZCwgYXJncyl7XG4gICAgdmFyIHdhdGNoZXJzID0gdm1BcnJheS5fX2FudF9fLiR3YXRjaGVycztcbiAgICB2YXIgbm9GaXhWbSA9IGZhbHNlO1xuICAgIGZvcih2YXIgaSA9IDAsIGwgPSB3YXRjaGVycy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgaWYod2F0Y2hlcnNbaV0udHlwZSA9PT0gYW50QXR0ci5SRVBFQVQpe1xuICAgICAgICB3YXRjaGVyc1tpXVttZXRob2RdKGFyZ3MsIHZtQXJyYXksIG5vRml4Vm0pO1xuICAgICAgICBub0ZpeFZtID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgdm1BcnJheS5fX2FudF9fLiRnZXRWTSgnbGVuZ3RoJykuJHNldCh2bUFycmF5Lmxlbmd0aCwgZmFsc2UsIHRydWUpO1xuICAgIHZtQXJyYXkuX19hbnRfXy4kcm9vdC4kYW50LnRyaWdnZXIoJ3VwZGF0ZScpO1xuICB9XG4gIHZhciBhcnJheU1ldGhvZHMgPSB7XG4gICAgc3BsaWNlOiBhZnRlckZuKFtdLnNwbGljZSwgZnVuY3Rpb24oKSB7XG4gICAgICBjYWxsUmVwZWF0ZXIodGhpcywgJ3NwbGljZScsIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKSk7XG4gICAgfSlcbiAgLCBwdXNoOiBhZnRlckZuKFtdLnB1c2gsIGZ1bmN0aW9uKC8qaXRlbTEsIGl0ZW0yLCAuLi4qLykge1xuICAgICAgdmFyIGFyciA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgIGFyci51bnNoaWZ0KHRoaXMubGVuZ3RoIC0gYXJyLmxlbmd0aCwgMCk7XG4gICAgICBcbiAgICAgIGNhbGxSZXBlYXRlcih0aGlzLCAnc3BsaWNlJywgYXJyKTtcbiAgICB9KVxuICAsIHBvcDogYWZ0ZXJGbihbXS5wb3AsIGZ1bmN0aW9uKCkge1xuICAgICAgY2FsbFJlcGVhdGVyKHRoaXMsICdzcGxpY2UnLCBbdGhpcy5sZW5ndGgsIDFdKTtcbiAgICB9KVxuICAsIHNoaWZ0OiBhZnRlckZuKFtdLnNoaWZ0LCBmdW5jdGlvbigpIHtcbiAgICAgIGNhbGxSZXBlYXRlcih0aGlzLCAnc3BsaWNlJywgWzAsIDFdKTtcbiAgICB9KVxuICAsIHVuc2hpZnQ6IGFmdGVyRm4oW10udW5zaGlmdCwgZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYXJyID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgYXJyLnVuc2hpZnQoMCwgMCk7XG4gICAgICBcbiAgICAgIGNhbGxSZXBlYXRlcih0aGlzLCAnc3BsaWNlJywgYXJyKTtcbiAgICB9KVxuICAsIHNvcnQ6IGFmdGVyRm4oW10uc29ydCwgZnVuY3Rpb24oZm4pIHtcbiAgICAgIGNhbGxSZXBlYXRlcih0aGlzLCAnc29ydCcpO1xuICAgIH0pXG4gICwgcmV2ZXJzZTogYWZ0ZXJGbihbXS5yZXZlcnNlLCBmdW5jdGlvbigpe1xuICAgICAgY2FsbFJlcGVhdGVyKHRoaXMsICdyZXZlcnNlJyk7XG4gICAgfSlcbiAgfTtcbiAgXG4gIC8v5aSE55CG5Yqo5oCB6IqC54K5KHotcmVwZWF0LCB6LWlmKVxuICB2YXIgR2VuZXJhdG9yID0gV2F0Y2hlci5leHRlbmQoXG4gICAge1xuICAgICAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIChyZWxhdGl2ZVZtLCB0b2tlbil7XG4gICAgICAgIC8v5paH5qGj5Y+C54Wn6IqC54K5LiBcbiAgICAgICAgdmFyIGFuY2hvciA9IGRvYy5jcmVhdGVUZXh0Tm9kZSgnJylcbiAgICAgICAgICAsIGVsID0gdG9rZW4uZWxcbiAgICAgICAgICAsIHR5cGUgPSB0b2tlbi5ub2RlTmFtZVxuICAgICAgICAgIDtcblxuICAgICAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgICAgICB0aGlzLmFuY2hvciA9IGFuY2hvcjtcbiAgICAgICAgZWwucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoYW5jaG9yLCBlbCk7XG4gICAgICAgIGVsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZWwpO1xuICAgICAgICAgIFxuICAgICAgICBXYXRjaGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIFxuICAgICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUodHlwZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgIHRoaXMuZWxzID0gW107XG4gICAgICAgIHRoaXMudm0gPSByZWxhdGl2ZVZtLiRnZXRWTSh0aGlzLnBhdGhzWzBdKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMudm0uJHJlcGVhdCA9IHRydWU7XG4gICAgICAgIFxuICAgICAgfVxuICAgICwgY2FsbGJhY2s6IGZ1bmN0aW9uKGRhdGEsIG9sZCkge1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXNcbiAgICAgICAgICA7XG4gICAgICAgIGlmKHRoYXQudHlwZSA9PT0gYW50QXR0ci5SRVBFQVQpe1xuICAgICAgICAgIGlmKGRhdGEgJiYgIWlzQXJyYXkoZGF0YSkpe1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCfpnIDopoHkuIDkuKrmlbDnu4QnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgZGF0YSAmJiB0aGlzLnNwbGljZShbMCwgdGhpcy5lbHMubGVuZ3RoXS5jb25jYXQoZGF0YSksIGRhdGEpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgfVxuICAgICAgLy/nsr7noa7mjqfliLYgRE9NIOWIl+ihqFxuICAgICAgLy9hcmdzOiBbaW5kZXgsIG4vKiwgaXRlbXMuLi4qL11cbiAgICAgIC8vYXJyOiDmlbDnu4TmlbDmja5cbiAgICAgIC8vbm9GaXhWbTog5piv5ZCm5LiN6ZyA6KaB57u05oqkIHZpZXdtb2RlbCDntKLlvJVcbiAgICAsIHNwbGljZTogZnVuY3Rpb24oYXJncywgYXJyLCBub0ZpeFZtKSB7XG4gICAgICAgIHZhciBlbHMgPSB0aGlzLmVsc1xuICAgICAgICAgICwgaXRlbXMgPSBhcmdzLnNsaWNlKDIpXG4gICAgICAgICAgLCBpbmRleCA9IGFyZ3NbMF0gKiAxXG4gICAgICAgICAgLCBuID0gYXJnc1sxXSAqIDFcbiAgICAgICAgICAsIG0gPSBpdGVtcy5sZW5ndGhcbiAgICAgICAgICAsIG5ld0VscyA9IFtdXG4gICAgICAgICAgLCBmcmFnID0gZG9jLmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKVxuICAgICAgICAgICwgcG4gPSB0aGlzLmFuY2hvci5wYXJlbnROb2RlXG4gICAgICAgICAgLCBlbCwgdm1cbiAgICAgICAgICA7XG4gICAgICAgIFxuICAgICAgICBpZihpc1VuZGVmaW5lZChuKSl7XG4gICAgICAgICAgYXJnc1sxXSA9IG4gPSBlbHMubGVuZ3RoIC0gaW5kZXg7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGZvcih2YXIgaSA9IGluZGV4LCBsID0gZWxzLmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICAgICAgaWYoaSA8IGluZGV4ICsgbil7XG4gICAgICAgICAgICAvL+WIoOmZpFxuICAgICAgICAgICAgLy/lr7nkuo7mi6XmnIkgaWYg5bGe5oCn5bm25LiU5LiN5pi+56S655qE6IqC54K5LCDlhbblubbkuI3lrZjlnKjkuo4gRE9NIOagkeS4rVxuICAgICAgICAgICAgdHJ5eyBwbi5yZW1vdmVDaGlsZChlbHNbaV0pOyB9Y2F0Y2goZSl7fVxuICAgICAgICAgICAgbm9GaXhWbSB8fCBkZWxldGUgdGhpcy52bVtpXTtcbiAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgIGlmKG4gfHwgbSl7XG4gICAgICAgICAgICAgIC8v57u05oqk57Si5byVXG4gICAgICAgICAgICAgIHZhciBuZXdJID0gaSAtIChuIC0gbSlcbiAgICAgICAgICAgICAgICAsIG9sZEkgPSBpXG4gICAgICAgICAgICAgICAgO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgaWYobmV3SSA+IG9sZEkpIHtcbiAgICAgICAgICAgICAgICBuZXdJID0gbCAtIChpIC0gaW5kZXgpO1xuICAgICAgICAgICAgICAgIG9sZEkgPSBuZXdJICsgKG4gLSBtKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgZWxzW29sZEldWyckaW5kZXgnXSA9IG5ld0k7XG4gICAgICAgICAgICAgIGlmKCFub0ZpeFZtKXtcbiAgICAgICAgICAgICAgICB2bSA9IHRoaXMudm1bbmV3SV0gPSB0aGlzLnZtW29sZEldO1xuICAgICAgICAgICAgICAgIHZtLiRrZXkgPSBuZXdJICsgJyc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8v5paw5aKeXG4gICAgICAgIGZvcih2YXIgaiA9IDA7IGogPCBtOyBqKyspe1xuICAgICAgICAgIGVsID0gdGhpcy5lbC5jbG9uZU5vZGUodHJ1ZSk7XG4gICAgICAgICAgbm9GaXhWbSB8fCBkZWxldGUgdGhpcy52bVtpbmRleCArIGpdO1xuICAgICAgICAgIHZtID0gdGhpcy52bS4kZ2V0Vk0oaW5kZXggKyBqKTtcbiAgICAgICAgICBcbiAgICAgICAgICBmb3IodmFyIGEgPSAwOyBhIDwgdGhpcy5hc3NpZ25tZW50cy5sZW5ndGg7IGErKykge1xuICAgICAgICAgICAgdm0uJGFzc2lnbm1lbnRbdGhpcy5hc3NpZ25tZW50c1thXV0gPSB2bTtcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgZWxbJyRpbmRleCddID0gaW5kZXggKyBqO1xuICAgICAgICAgIGZyYWcuYXBwZW5kQ2hpbGQoZWwpO1xuICAgICAgICAgIHRyYXZlbEVsKGVsLCB2bSk7XG4gICAgICAgICAgdm0uJHNldChpdGVtc1tqXSk7XG4gICAgICAgICAgXG4gICAgICAgICAgbmV3RWxzLnB1c2goZWwpO1xuICAgICAgICAgIGlmKGFyciAmJiBpc09iamVjdChhcnJbaW5kZXggKyBqXSkpe1xuICAgICAgICAgICAgYXJyW2luZGV4ICsgal0gPSBtb2RlbEV4dGVuZChpc0FycmF5KGFycltpbmRleCArIGpdKSA/IFtdOiB7fSwgYXJyW2luZGV4ICsgal0sIHZtKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYobmV3RWxzLmxlbmd0aCl7XG4gICAgICAgICAgcG4uaW5zZXJ0QmVmb3JlKGZyYWcsIGVsc1tpbmRleCArIG5dIHx8IHRoaXMuYW5jaG9yKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy/pnIDopoHmuIXpmaTnvKnnn63lkI7lpJrlh7rnmoTpg6jliIZcbiAgICAgICAgaWYoIW5vRml4Vm0pe1xuICAgICAgICAgIGZvcih2YXIgayA9IGwgLSBuICsgbTsgayA8IGw7IGsrKyl7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy52bVtrXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmKGFyci5fX2FudF9fICE9PSB0aGlzLnZtKSB7XG4gICAgICAgICAgYXJyLl9fYW50X18gPSB0aGlzLnZtO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBhcmdzID0gYXJncy5zbGljZSgwLCAyKS5jb25jYXQobmV3RWxzKTtcbiAgICAgICAgZWxzLnNwbGljZS5hcHBseShlbHMsIGFyZ3MpO1xuICAgICAgfVxuICAgICwgcmV2ZXJzZTogZnVuY3Rpb24oYXJncywgYXJyLCBub0ZpeFZtKSB7XG4gICAgICAgIHZhciB2bXMgPSB0aGlzLnZtLCB2bVxuICAgICAgICAgICwgZWwgPSB0aGlzLmFuY2hvclxuICAgICAgICAgICwgZnJhZyA9IGRvYy5jcmVhdGVEb2N1bWVudEZyYWdtZW50KClcbiAgICAgICAgICA7XG4gICAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSB0aGlzLmVscy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgICAgIGlmKCghbm9GaXhWbSkgJiYgaSA8IDEvMil7XG4gICAgICAgICAgICB2bSA9IHZtc1tpXTtcbiAgICAgICAgICAgIHZtc1tpXSA9IHZtc1tsIC0gaSAtIDFdO1xuICAgICAgICAgICAgdm1zW2ldLiRrZXkgPSBpICsgJyc7XG4gICAgICAgICAgICB2bS4ka2V5ID0gbCAtIGkgLSAxICsgJyc7XG4gICAgICAgICAgICB2bXNbbCAtIGkgLSAxXSA9IHZtO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLmVsc1tpXVsnJGluZGV4J10gPSBsIC0gaSAtIDE7XG4gICAgICAgICAgZnJhZy5hcHBlbmRDaGlsZCh0aGlzLmVsc1tsIC0gaSAtIDFdKTtcbiAgICAgICAgfVxuICAgICAgICBlbC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShmcmFnLCBlbCk7XG4gICAgICAgIHRoaXMuZWxzLnJldmVyc2UoKTtcbiAgICAgIH1cbiAgICAsIHNvcnQ6IGZ1bmN0aW9uKGZuKXtcbiAgICAgICAgLy9UT0RPIOi/m+ihjOeyvuehrumrmOi/mOWOn+eahOaOkuW6jz9cbiAgICAgICAgdGhpcy5jYWxsYmFjayh0aGlzLnZhbClcbiAgICAgIH1cbiAgICB9XG4gIClcbiAgXG4gIEFudC5fcGFyc2UgPSBwYXJzZTtcbiAgQW50Ll9ldmFsID0gZXZhbHVhdGUuZXZhbDtcbiAgQW50LnZlcnNpb24gPSAnJVZFUlNJT04nO1xuICBcbiAgbW9kdWxlLmV4cG9ydHMgPSBBbnQ7IiwidmFyIGV4dGVuZCA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKS5leHRlbmQ7XG5cbnZhciBDbGFzcyA9IHtcbiAgLyoqIFxuICAgKiDmnoTpgKDlh73mlbDnu6fmib8uIFxuICAgKiDlpoI6IGB2YXIgQ2FyID0gQW50LmV4dGVuZCh7ZHJpdmU6IGZ1bmN0aW9uKCl7fX0pOyBuZXcgQ2FyKCk7YFxuICAgKiBAcGFyYW0ge09iamVjdH0gW3Byb3RvUHJvcHNdIOWtkOaehOmAoOWHveaVsOeahOaJqeWxleWOn+Wei+WvueixoVxuICAgKiBAcGFyYW0ge09iamVjdH0gW3N0YXRpY1Byb3BzXSDlrZDmnoTpgKDlh73mlbDnmoTmianlsZXpnZnmgIHlsZ7mgKdcbiAgICogQHJldHVybiB7RnVuY3Rpb259IOWtkOaehOmAoOWHveaVsFxuICAgKi9cbiAgZXh0ZW5kOiBmdW5jdGlvbiAocHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHtcbiAgICBwcm90b1Byb3BzID0gcHJvdG9Qcm9wcyB8fCB7fTtcbiAgICB2YXIgY29uc3RydWN0b3IgPSBwcm90b1Byb3BzLmhhc093blByb3BlcnR5KCdjb25zdHJ1Y3RvcicpID8gcHJvdG9Qcm9wcy5jb25zdHJ1Y3RvciA6IGZ1bmN0aW9uKCl7IHJldHVybiBzdXAuYXBwbHkodGhpcywgYXJndW1lbnRzKTsgfVxuICAgIHZhciBzdXAgPSB0aGlzO1xuICAgIHZhciBGbiA9IGZ1bmN0aW9uKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gY29uc3RydWN0b3I7IH07XG4gICAgXG4gICAgRm4ucHJvdG90eXBlID0gc3VwLnByb3RvdHlwZTtcbiAgICBjb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBuZXcgRm4oKTtcbiAgICBleHRlbmQoY29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTtcbiAgICBleHRlbmQoY29uc3RydWN0b3IsIHN1cCwgc3RhdGljUHJvcHMsIHtfX3N1cGVyX186IHN1cC5wcm90b3R5cGV9KTtcbiAgICBcbiAgICByZXR1cm4gY29uc3RydWN0b3I7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2xhc3M7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKVxuICA7XG5cbi8qKlxuICog5Li6IEFudCDmnoTpgKDlh73mlbDmt7vliqDmjIfku6QgKGRpcmVjdGl2ZSkuIGBBbnQuZGlyZWN0aXZlYFxuICogQHBhcmFtIHtTdHJpbmd9IGtleSDmjIfku6TlkI3np7BcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIOaMh+S7pOWPguaVsFxuICogXG4gKi9cbmZ1bmN0aW9uIGRpcmVjdGl2ZShrZXksIG9wdHMpIHtcbiAgdmFyIGRpcnMgPSB0aGlzLmRpcmVjdGl2ZXMgPSB0aGlzLmRpcmVjdGl2ZXMgfHwge307XG4gIFxuICByZXR1cm4gZGlyc1trZXldID0gbmV3IERpcmVjdGl2ZShrZXksIG9wdHMpO1xufVxuXG5leHBvcnRzLmRpcmVjdGl2ZSA9IGRpcmVjdGl2ZTtcblxuZnVuY3Rpb24gRGlyZWN0aXZlKGtleSwgb3B0cykge1xuICB1dGlscy5leHRlbmQodGhpcywge1xuICAgIHByaW9yaXR5OiAwXG4gICwgdHlwZToga2V5XG4gICwgdGVybWluYWw6IGZhbHNlXG4gICwgcmVwbGFjZTogZmFsc2VcbiAgfSwgb3B0cyk7XG59XG5cbkRpcmVjdGl2ZS5wcm90b3R5cGUgPSB7XG4gIGluaXQ6IHV0aWxzLm5vb3BcbiwgdXBkYXRlOiB1dGlscy5ub29wXG4sIHRlYXJEb3duOiB1dGlscy5ub29wXG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBhdHRyUG9zdFJlZyA9IC9cXD8kLztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIGlmKHRoaXMuZGlyTmFtZSA9PT0gdGhpcy50eXBlKSB7Ly9hdHRyIGJpbmRpbmdcbiAgICAgIHRoaXMuYXR0cnMgPSB7fTtcbiAgICB9ZWxzZSB7XG4gICAgICBpZihhdHRyUG9zdFJlZy50ZXN0KHRoaXMuZGlyTmFtZSkpIHsvLyBzb21lQXR0cj8gY29uZGl0aW9uIGJpbmRpbmdcbiAgICAgICAgdGhpcy5kaXJOYW1lID0gdGhpcy5kaXJOYW1lLnJlcGxhY2UoYXR0clBvc3RSZWcsICcnKTtcbiAgICAgICAgdGhpcy5jb25kaXRpb25hbEF0dHIgPSB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuLCB1cGRhdGU6IGZ1bmN0aW9uKHZhbCkge1xuICAgIGlmKHRoaXMuZGlyTmFtZSA9PT0gdGhpcy50eXBlKSB7XG4gICAgICBmb3IodmFyIGF0dHIgaW4gdmFsKSB7XG4gICAgICAgIHNldEF0dHIodGhpcy5lbCwgYXR0ciwgdmFsW2F0dHJdKTtcbiAgICAgICAgLy9pZih2YWxbYXR0cl0pIHtcbiAgICAgICAgICBkZWxldGUgdGhpcy5hdHRyc1thdHRyXTtcbiAgICAgICAgLy99XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZvcih2YXIgYXR0ciBpbiB0aGlzLmF0dHJzKSB7XG4gICAgICAgIHRoaXMuZWwucmVtb3ZlQXR0cmlidXRlKGF0dHIpO1xuICAgICAgfVxuICAgICAgdGhpcy5hdHRycyA9IHZhbDtcbiAgICB9ZWxzZXtcbiAgICAgIGlmKHRoaXMuY29uZGl0aW9uYWxBdHRyKSB7XG4gICAgICAgIHZhbCA/IHNldEF0dHIodGhpcy5lbCwgdGhpcy5kaXJOYW1lLCB2YWwpIDogdGhpcy5lbC5yZW1vdmVBdHRyaWJ1dGUodGhpcy5kaXJOYW1lKTtcbiAgICAgIH1lbHNle1xuICAgICAgICB0aGlzLnRleHRNYXBbdGhpcy5wb3NpdGlvbl0gPSB2YWwgJiYgKHZhbCArICcnKTtcbiAgICAgICAgc2V0QXR0cih0aGlzLmVsLCB0aGlzLmRpck5hbWUsIHRoaXMudGV4dE1hcC5qb2luKCcnKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG5cbi8vSUUg5rWP6KeI5Zmo5b6I5aSa5bGe5oCn6YCa6L+HIGBzZXRBdHRyaWJ1dGVgIOiuvue9ruWQjuaXoOaViC4gXG4vL+i/meS6m+mAmui/hyBgZWxbYXR0cl0gPSB2YWx1ZWAg6K6+572u55qE5bGe5oCn5Y206IO95aSf6YCa6L+HIGByZW1vdmVBdHRyaWJ1dGVgIOa4hemZpC5cbmZ1bmN0aW9uIHNldEF0dHIoZWwsIGF0dHIsIHZhbCl7XG4gIHRyeXtcbiAgICBpZigoKGF0dHIgaW4gZWwpIHx8IGF0dHIgPT09ICdjbGFzcycpKXtcbiAgICAgIGlmKGF0dHIgPT09ICdzdHlsZScgJiYgZWwuc3R5bGUuc2V0QXR0cmlidXRlKXtcbiAgICAgICAgZWwuc3R5bGUuc2V0QXR0cmlidXRlKCdjc3NUZXh0JywgdmFsKTtcbiAgICAgIH1lbHNlIGlmKGF0dHIgPT09ICdjbGFzcycpe1xuICAgICAgICBlbC5jbGFzc05hbWUgPSB2YWw7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgZWxbYXR0cl0gPSB0eXBlb2YgZWxbYXR0cl0gPT09ICdib29sZWFuJyA/IHRydWUgOiB2YWw7XG4gICAgICB9XG4gICAgfVxuICB9Y2F0Y2goZSl7fVxuICB0cnl7XG4gICAgLy9jaHJvbWUgc2V0YXR0cmlidXRlIHdpdGggYHt7fX1gIHdpbGwgdGhyb3cgYW4gZXJyb3JcbiAgICBlbC5zZXRBdHRyaWJ1dGUoYXR0ciwgdmFsKTtcbiAgfWNhdGNoKGUpeyBjb25zb2xlLndhcm4oZSkgfVxufSIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgZG9jID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQuanMnKVxuICAsIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKVxuICA7XG5cbnZhciBkaXJzID0ge307XG5cblxuZGlycy50ZXh0ID0ge1xuICB0ZXJtaW5hbDogdHJ1ZVxuLCByZXBsYWNlOiBmdW5jdGlvbigpIHsgcmV0dXJuIGRvYy5jcmVhdGVUZXh0Tm9kZSgnJykgfVxuLCB1cGRhdGU6IGZ1bmN0aW9uKHZhbCkge1xuICAgIHRoaXMubm9kZS5ub2RlVmFsdWUgPSB1dGlscy5pc1VuZGVmaW5lZCh2YWwpID8gJycgOiB2YWw7XG4gIH1cbn07XG5cblxuZGlycy5odG1sID0ge1xuICB0ZXJtaW5hbDogdHJ1ZVxuLCByZXBsYWNlOiB0cnVlXG4sIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMubm9kZXMgPSBbXTtcbiAgfVxuLCB1cGRhdGU6IGZ1bmN0aW9uKHZhbCkge1xuICAgIHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGVsLmlubmVySFRNTCA9IHV0aWxzLmlzVW5kZWZpbmVkKHZhbCkgPyAnJyA6IHZhbDtcbiAgICBcbiAgICB2YXIgbm9kZTtcbiAgICB3aGlsZShub2RlID0gdGhpcy5ub2Rlcy5wb3AoKSkge1xuICAgICAgbm9kZS5wYXJlbnROb2RlICYmIG5vZGUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub2RlKTtcbiAgICB9XG4gICAgXG4gICAgdmFyIG5vZGVzID0gZWwuY2hpbGROb2RlcztcbiAgICBmb3IodmFyIGkgPSAwLCBsID0gbm9kZXMubGVuZ3RoOyBpIDwgbDsgaSArKykge1xuICAgICAgdGhpcy5ub2Rlcy5wdXNoKG5vZGVzW2ldKVxuICAgICAgdGhpcy5lbC5pbnNlcnRCZWZvcmUodGhpcy5ub2Rlc1tpXSwgdGhpcy5ub2RlKTtcbiAgICB9XG4gIH1cbn07XG5cbiAgXG5kaXJzWydpZiddID0ge1xuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICB2YXIgcGFyZW50ID0gdGhpcy5wYXJlbnQgPSB0aGlzLmVsLnBhcmVudE5vZGU7XG4gICAgdGhpcy5hbmNob3IgPSBkb2MuY3JlYXRlQ29tbWVudCh0aGlzLnR5cGUgKyAnID0gJyArIHRoaXMucGF0aClcbiAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKHRoaXMuYW5jaG9yLCB0aGlzLmVsKTtcbiAgICBwYXJlbnQucmVtb3ZlQ2hpbGQodGhpcy5lbCk7XG4gIH1cbiwgdXBkYXRlOiBmdW5jdGlvbih2YWwpIHtcbiAgICBpZih2YWwpIHtcbiAgICAgIGlmKCF0aGlzLnN0YXRlKSB7IHRoaXMucGFyZW50Lmluc2VydEJlZm9yZSh0aGlzLmVsLCB0aGlzLmFuY2hvcik7IH1cbiAgICB9ZWxzZXtcbiAgICAgIGlmKHRoaXMuc3RhdGUpIHsgdGhpcy5wYXJlbnQucmVtb3ZlQ2hpbGQodGhpcy5lbCk7IH1cbiAgICB9XG4gICAgdGhpcy5zdGF0ZSA9IHZhbDtcbiAgfVxufTtcblxuXG5kaXJzLnBhcnRpYWwgPSB7XG4gIHRlcm1pbmFsOiB0cnVlXG4sIHJlcGxhY2U6IHRydWVcbiwgaW5pdDogZnVuY3Rpb24odm0pIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIHBOYW1lLCBhbnQsIG9wdHM7XG4gICAgcE5hbWUgPSB0aGlzLnBhdGg7XG4gICAgYW50ID0gdm0uJHJvb3QuJGFudDtcbiAgICBvcHRzID0gYW50Lm9wdGlvbnM7XG4gICAgXG4gICAgYW50LnNldFBhcnRpYWwoe1xuICAgICAgbmFtZTogcE5hbWVcbiAgICAsIGNvbnRlbnQ6IG9wdHMgJiYgb3B0cy5wYXJ0aWFscyAmJiBvcHRzLnBhcnRpYWxzW3BOYW1lXVxuICAgICwgdGFyZ2V0OiBmdW5jdGlvbihlbCkgeyB0aGF0LmVsLmluc2VydEJlZm9yZShlbCwgdGhhdC5ub2RlKSB9XG4gICAgLCBlc2NhcGU6IHRoaXMuZXNjYXBlXG4gICAgLCBwYXRoOiB2bS4kZ2V0S2V5UGF0aCgpXG4gICAgfSk7XG4gIH1cbn07XG4gIFxuZGlycy5yZXBlYXQgPSByZXF1aXJlKCcuL3JlcGVhdC5qcycpO1xuZGlycy5hdHRyID0gcmVxdWlyZSgnLi9hdHRyLmpzJyk7XG5kaXJzLm1vZGVsID0gcmVxdWlyZSgnLi9tb2RlbC5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGRpcnM7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICB0ZW1pbmFsOiB0cnVlXG4sIHByaW9yaXR5OiAxXG4sIGluaXQ6IGZ1bmN0aW9uKHZtKSB7XG4gICAgdmFyIGtleVBhdGggPSB0aGlzLnBhdGg7XG4gICAgXG4gICAgaWYoIWtleVBhdGgpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgXG4gICAgdmFyIGVsID0gdGhpcy5lbFxuICAgICAgLCBldiA9ICdjaGFuZ2UnXG4gICAgICAsIGF0dHIsIHZhbHVlID0gYXR0ciA9ICd2YWx1ZSdcbiAgICAgICwgYW50ID0gdm0uJHJvb3QuJGFudFxuICAgICAgLCBjdXIgPSB2bS4kZ2V0Vk0oa2V5UGF0aClcbiAgICAgICwgaXNTZXREZWZhdXQgPSB1dGlscy5pc1VuZGVmaW5lZChhbnQuZ2V0KGN1ci4kZ2V0S2V5UGF0aCgpKSkvL+eVjOmdoueahOWIneWni+WAvOS4jeS8muimhuebliBtb2RlbCDnmoTliJ3lp4vlgLxcbiAgICAgICwgY3JsZiA9IC9cXHJcXG4vZy8vSUUgOCDkuIsgdGV4dGFyZWEg5Lya6Ieq5Yqo5bCGIFxcbiDmjaLooYznrKbmjaLmiJAgXFxyXFxuLiDpnIDopoHlsIblhbbmm7/mjaLlm57mnaVcbiAgICAgICwgY2FsbGJhY2sgPSBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgICAvL+aJp+ihjOi/memHjOeahOaXtuWAmSwg5b6I5Y+v6IO9IHJlbmRlciDov5jmnKrmiafooYwuIHZtLiRnZXREYXRhKGtleVBhdGgpIOacquWumuS5iSwg5LiN6IO96L+U5Zue5paw6K6+572u55qE5YC8XG4gICAgICAgICAgdmFyIG5ld1ZhbCA9ICh2YWwgfHwgdm0uJGdldERhdGEoa2V5UGF0aCkgfHwgJycpICsgJydcbiAgICAgICAgICAgICwgdmFsID0gZWxbYXR0cl1cbiAgICAgICAgICAgIDtcbiAgICAgICAgICB2YWwgJiYgdmFsLnJlcGxhY2UgJiYgKHZhbCA9IHZhbC5yZXBsYWNlKGNybGYsICdcXG4nKSk7XG4gICAgICAgICAgaWYobmV3VmFsICE9PSB2YWwpeyBlbFthdHRyXSA9IG5ld1ZhbDsgfVxuICAgICAgICB9XG4gICAgICAsIGhhbmRsZXIgPSBmdW5jdGlvbihpc0luaXQpIHtcbiAgICAgICAgICB2YXIgdmFsID0gZWxbdmFsdWVdO1xuICAgICAgICAgIFxuICAgICAgICAgIHZhbC5yZXBsYWNlICYmICh2YWwgPSB2YWwucmVwbGFjZShjcmxmLCAnXFxuJykpO1xuICAgICAgICAgIGFudC5zZXQoY3VyLiRnZXRLZXlQYXRoKCksIHZhbCwge2lzQnViYmxlOiBpc0luaXQgIT09IHRydWV9KTtcbiAgICAgICAgfVxuICAgICAgLCBjYWxsSGFuZGxlciA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICBpZihlICYmIGUucHJvcGVydHlOYW1lICYmIGUucHJvcGVydHlOYW1lICE9PSBhdHRyKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICAgICAgICB9XG4gICAgICAsIGllID0gdXRpbHMuaWVcbiAgICAgIDtcbiAgICBcbiAgICBzd2l0Y2goZWwudGFnTmFtZSkge1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdmFsdWUgPSBhdHRyID0gJ2lubmVySFRNTCc7XG4gICAgICAgIC8vZXYgKz0gJyBibHVyJztcbiAgICAgIGNhc2UgJ0lOUFVUJzpcbiAgICAgIGNhc2UgJ1RFWFRBUkVBJzpcbiAgICAgICAgc3dpdGNoKGVsLnR5cGUpIHtcbiAgICAgICAgICBjYXNlICdjaGVja2JveCc6XG4gICAgICAgICAgICB2YWx1ZSA9IGF0dHIgPSAnY2hlY2tlZCc7XG4gICAgICAgICAgICAvL0lFNiwgSUU3IOS4i+ebkeWQrCBwcm9wZXJ0eWNoYW5nZSDkvJrmjII/XG4gICAgICAgICAgICBpZihpZSkgeyBldiArPSAnIGNsaWNrJzsgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3JhZGlvJzpcbiAgICAgICAgICAgIGF0dHIgPSAnY2hlY2tlZCc7XG4gICAgICAgICAgICBpZihpZSkgeyBldiArPSAnIGNsaWNrJzsgfVxuICAgICAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgZWwuY2hlY2tlZCA9IGVsLnZhbHVlID09PSB2bS4kZ2V0RGF0YShrZXlQYXRoKSArICcnO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlzU2V0RGVmYXV0ID0gZWwuY2hlY2tlZDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgaWYoIWFudC5vcHRpb25zLmxhenkpe1xuICAgICAgICAgICAgICBpZignb25pbnB1dCcgaW4gZWwpe1xuICAgICAgICAgICAgICAgIGV2ICs9ICcgaW5wdXQnO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vSUUg5LiL55qEIGlucHV0IOS6i+S7tuabv+S7o1xuICAgICAgICAgICAgICBpZihpZSkge1xuICAgICAgICAgICAgICAgIGV2ICs9ICcga2V5dXAgcHJvcGVydHljaGFuZ2UgY3V0JztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICBicmVhaztcbiAgICAgIGNhc2UgJ1NFTEVDVCc6XG4gICAgICAgIGlmKGVsLm11bHRpcGxlKXtcbiAgICAgICAgICBoYW5kbGVyID0gZnVuY3Rpb24oaXNJbml0KSB7XG4gICAgICAgICAgICB2YXIgdmFscyA9IFtdO1xuICAgICAgICAgICAgZm9yKHZhciBpID0gMCwgbCA9IGVsLm9wdGlvbnMubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgICAgICAgICAgaWYoZWwub3B0aW9uc1tpXS5zZWxlY3RlZCl7IHZhbHMucHVzaChlbC5vcHRpb25zW2ldLnZhbHVlKSB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhbnQuc2V0KGN1ci4kZ2V0S2V5UGF0aCgpLCB2YWxzLCB7aXNCdWJibGU6IGlzSW5pdCAhPT0gdHJ1ZX0pO1xuICAgICAgICAgIH07XG4gICAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIHZhbHMgPSB2bS4kZ2V0RGF0YShrZXlQYXRoKTtcbiAgICAgICAgICAgIGlmKHZhbHMgJiYgdmFscy5sZW5ndGgpe1xuICAgICAgICAgICAgICBmb3IodmFyIGkgPSAwLCBsID0gZWwub3B0aW9ucy5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgICAgICAgICAgIGVsLm9wdGlvbnNbaV0uc2VsZWN0ZWQgPSB2YWxzLmluZGV4T2YoZWwub3B0aW9uc1tpXS52YWx1ZSkgIT09IC0xO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICAvL2lzU2V0RGVmYXV0ID0gaXNTZXREZWZhdXQgJiYgIWhhc1Rva2VuKGVsW3ZhbHVlXSk7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgXG4gICAgdGhpcy51cGRhdGUgPSBjYWxsYmFjaztcbiAgICBcbiAgICBldi5zcGxpdCgvXFxzKy9nKS5mb3JFYWNoKGZ1bmN0aW9uKGUpe1xuICAgICAgcmVtb3ZlRXZlbnQoZWwsIGUsIGNhbGxIYW5kbGVyKTtcbiAgICAgIGFkZEV2ZW50KGVsLCBlLCBjYWxsSGFuZGxlcik7XG4gICAgfSk7XG4gICAgXG4gICAgLy/moLnmja7ooajljZXlhYPntKDnmoTliJ3lp4vljJbpu5jorqTlgLzorr7nva7lr7nlupQgbW9kZWwg55qE5YC8XG4gICAgaWYoZWxbdmFsdWVdICYmIGlzU2V0RGVmYXV0KXtcbiAgICAgICBoYW5kbGVyKHRydWUpOyBcbiAgICB9XG4gICAgICBcbiAgfVxufTtcblxuZnVuY3Rpb24gYWRkRXZlbnQoZWwsIGV2ZW50LCBoYW5kbGVyKSB7XG4gIGlmKGVsLmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgICBlbC5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBoYW5kbGVyLCBmYWxzZSk7XG4gIH1lbHNle1xuICAgIGVsLmF0dGFjaEV2ZW50KCdvbicgKyBldmVudCwgaGFuZGxlcik7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVtb3ZlRXZlbnQoZWwsIGV2ZW50LCBoYW5kbGVyKSB7XG4gIGlmKGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIpIHtcbiAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCBoYW5kbGVyKTtcbiAgfWVsc2V7XG4gICAgZWwuZGV0YWNoRXZlbnQoJ29uJyArIGV2ZW50LCBoYW5kbGVyKTtcbiAgfVxufSIsIlwidXNlIHN0cmljdFwiO1xuIFxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHByaW9yaXR5OiAxMDAwMFxuLCB0ZXJtaW5hbDogdHJ1ZVxuLCBpbml0OiBmdW5jdGlvbih2bSkge1xuICAgIFxuICB9XG4sIHVwZGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgXG4gIH1cbn07IiwiKGZ1bmN0aW9uKHJvb3Qpe1xuICBcInVzZSBzdHJpY3RcIjtcblxuICBtb2R1bGUuZXhwb3J0cyA9IHJvb3QuZG9jdW1lbnQgfHwgcmVxdWlyZSgnanNkb20nKS5qc2RvbSgpO1xuXG59KSgoZnVuY3Rpb24oKSB7cmV0dXJuIHRoaXN9KSgpKTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIG9wZXJhdG9ycyA9IHtcbiAgJ3VuYXJ5Jzoge1xuICAgICcrJzogZnVuY3Rpb24odikgeyByZXR1cm4gK3Y7IH1cbiAgLCAnLSc6IGZ1bmN0aW9uKHYpIHsgcmV0dXJuIC12OyB9XG4gICwgJyEnOiBmdW5jdGlvbih2KSB7IHJldHVybiAhdjsgfVxuICAgIFxuICAsICdbJzogZnVuY3Rpb24odil7IHJldHVybiB2OyB9XG4gICwgJ3snOiBmdW5jdGlvbih2KXtcbiAgICAgIHZhciByID0ge307XG4gICAgICBmb3IodmFyIGkgPSAwLCBsID0gdi5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgclt2W2ldWzBdXSA9IHZbaV1bMV07XG4gICAgICB9XG4gICAgICByZXR1cm4gcjtcbiAgICB9XG4gICwgJ3R5cGVvZic6IGZ1bmN0aW9uKHYpeyByZXR1cm4gdHlwZW9mIHY7IH1cbiAgLCAnbmV3JzogZnVuY3Rpb24odil7IHJldHVybiBuZXcgdiB9XG4gIH1cbiAgXG4sICdiaW5hcnknOiB7XG4gICAgJysnOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsICsgcjsgfVxuICAsICctJzogZnVuY3Rpb24obCwgcikgeyByZXR1cm4gbCAtIHI7IH1cbiAgLCAnKic6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgKiByOyB9XG4gICwgJy8nOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsIC8gcjsgfVxuICAsICclJzogZnVuY3Rpb24obCwgcikgeyByZXR1cm4gbCAlIHI7IH1cbiAgLCAnPCc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgPCByOyB9XG4gICwgJz4nOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsID4gcjsgfVxuICAsICc8PSc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgPD0gcjsgfVxuICAsICc+PSc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgPj0gcjsgfVxuICAsICc9PSc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgPT0gcjsgfVxuICAsICchPSc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgIT0gcjsgfVxuICAsICc9PT0nOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsID09PSByOyB9XG4gICwgJyE9PSc6IGZ1bmN0aW9uKGwsIHIpIHsgcmV0dXJuIGwgIT09IHI7IH1cbiAgLCAnJiYnOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsICYmIHI7IH1cbiAgLCAnfHwnOiBmdW5jdGlvbihsLCByKSB7IHJldHVybiBsIHx8IHI7IH1cbiAgICBcbiAgLCAnLic6IGZ1bmN0aW9uKGwsIHIpIHtcbiAgICAgIGlmKHIpe1xuICAgICAgICBwYXRoID0gcGF0aCArICcuJyArIHI7XG4gICAgICB9XG4gICAgICByZXR1cm4gbFtyXTtcbiAgICB9XG4gICwgJ1snOiBmdW5jdGlvbihsLCByKSB7XG4gICAgICBpZihyKXtcbiAgICAgICAgcGF0aCA9IHBhdGggKyAnLicgKyByO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGxbcl07XG4gICAgfVxuICAsICcoJzogZnVuY3Rpb24obCwgcil7IHJldHVybiBsLmFwcGx5KG51bGwsIHIpIH1cbiAgICBcbiAgLCAnfCc6IGZ1bmN0aW9uKGwsIHIpeyByZXR1cm4gci5jYWxsKG51bGwsIGwpIH0vL2ZpbHRlci4gbmFtZXxmaWx0ZXJcbiAgLCAnaW4nOiBmdW5jdGlvbihsLCByKXtcbiAgICAgIGlmKHRoaXMuYXNzaWdubWVudCkge1xuICAgICAgICAvL3JlcGVhdFxuICAgICAgICBkZWxldGUgc3VtbWFyeS5sb2NhbHNbbF07XG4gICAgICAgIHN1bW1hcnkuYXNzaWdubWVudHNbbF0gPSB0cnVlO1xuICAgICAgICByZXR1cm4gcjtcbiAgICAgIH1lbHNle1xuICAgICAgICByZXR1cm4gbCBpbiByO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBcbiwgJ3Rlcm5hcnknOiB7XG4gICAgJz8nOiBmdW5jdGlvbihmLCBzLCB0KSB7IHJldHVybiBmID8gcyA6IHQ7IH1cbiAgLCAnKCc6IGZ1bmN0aW9uKGYsIHMsIHQpIHsgcmV0dXJuIGZbc10uYXBwbHkoZiwgdCkgfVxuICBcbiAgLy9maWx0ZXIuIG5hbWUgfCBmaWx0ZXIgOiBhcmcyIDogYXJnM1xuICAsICd8JzogZnVuY3Rpb24oZiwgcywgdCl7IHJldHVybiBzLmFwcGx5KG51bGwsIFtmXS5jb25jYXQodCkpOyB9XG4gIH1cbn07XG5cbnZhciBhcmdOYW1lID0gWydmaXJzdCcsICdzZWNvbmQnLCAndGhpcmQnXVxuICAsIGNvbnRleHQsIHN1bW1hcnlcbiAgLCBwYXRoXG4gIDtcblxuLy/pgY3ljoYgYXN0XG52YXIgZXZhbHVhdGUgPSBmdW5jdGlvbih0cmVlKSB7XG4gIHZhciBhcml0eSA9IHRyZWUuYXJpdHlcbiAgICAsIHZhbHVlID0gdHJlZS52YWx1ZVxuICAgICwgYXJncyA9IFtdXG4gICAgLCBuID0gMFxuICAgICwgYXJnXG4gICAgLCByZXNcbiAgICA7XG4gIFxuICAvL+aTjeS9nOespuacgOWkmuWPquacieS4ieWFg1xuICBmb3IoOyBuIDwgMzsgbisrKXtcbiAgICBhcmcgPSB0cmVlW2FyZ05hbWVbbl1dO1xuICAgIGlmKGFyZyl7XG4gICAgICBpZihBcnJheS5pc0FycmF5KGFyZykpe1xuICAgICAgICBhcmdzW25dID0gW107XG4gICAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSBhcmcubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgICAgICBhcmdzW25dLnB1c2godHlwZW9mIGFyZ1tpXS5rZXkgPT09ICd1bmRlZmluZWQnID8gXG4gICAgICAgICAgICBldmFsdWF0ZShhcmdbaV0pIDogW2FyZ1tpXS5rZXksIGV2YWx1YXRlKGFyZ1tpXSldKTtcbiAgICAgICAgfVxuICAgICAgfWVsc2V7XG4gICAgICAgIGFyZ3Nbbl0gPSBldmFsdWF0ZShhcmcpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBcbiAgaWYoYXJpdHkgIT09ICdsaXRlcmFsJykge1xuICAgIGlmKHBhdGggJiYgdmFsdWUgIT09ICcuJyAmJiB2YWx1ZSAhPT0gJ1snKSB7XG4gICAgICBzdW1tYXJ5LnBhdGhzW3BhdGhdID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYoYXJpdHkgPT09ICduYW1lJykge1xuICAgICAgcGF0aCA9IHZhbHVlO1xuICAgIH1cbiAgfVxuICBcbiAgc3dpdGNoKGFyaXR5KXtcbiAgICBjYXNlICd1bmFyeSc6IFxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAndGVybmFyeSc6XG4gICAgICB0cnl7XG4gICAgICAgIHJlcyA9IGdldE9wZXJhdG9yKGFyaXR5LCB2YWx1ZSkuYXBwbHkodHJlZSwgYXJncyk7XG4gICAgICB9Y2F0Y2goZSl7XG4gICAgICAgIC8vY29uc29sZS5kZWJ1ZyhlKTtcbiAgICAgIH1cbiAgICBicmVhaztcbiAgICBjYXNlICdsaXRlcmFsJzpcbiAgICAgIHJlcyA9IHZhbHVlO1xuICAgIGJyZWFrO1xuICAgIGNhc2UgJ25hbWUnOlxuICAgICAgc3VtbWFyeS5sb2NhbHNbdmFsdWVdID0gdHJ1ZTtcbiAgICAgIHJlcyA9IGNvbnRleHQubG9jYWxzW3ZhbHVlXTtcbiAgICBicmVhaztcbiAgICBjYXNlICdmaWx0ZXInOlxuICAgICAgc3VtbWFyeS5maWx0ZXJzW3ZhbHVlXSA9IHRydWU7XG4gICAgICByZXMgPSBjb250ZXh0LmZpbHRlcnNbdmFsdWVdO1xuICAgIGJyZWFrO1xuICAgIGNhc2UgJ3RoaXMnOlxuICAgICAgcmVzID0gY29udGV4dC5sb2NhbHM7XG4gICAgYnJlYWs7XG4gIH1cbiAgcmV0dXJuIHJlcztcbn07XG5cbmZ1bmN0aW9uIGdldE9wZXJhdG9yKGFyaXR5LCB2YWx1ZSl7XG4gIHJldHVybiBvcGVyYXRvcnNbYXJpdHldW3ZhbHVlXSB8fCBmdW5jdGlvbigpIHsgcmV0dXJuOyB9XG59XG5cbmZ1bmN0aW9uIHJlc2V0KF9jb250ZXh0KSB7XG4gIGlmKF9jb250ZXh0KSB7XG4gICAgY29udGV4dCA9IHtsb2NhbHM6IF9jb250ZXh0LmxvY2FscyB8fCB7fSwgZmlsdGVyczogX2NvbnRleHQuZmlsdGVycyB8fCB7fX07XG4gIH1lbHNle1xuICAgIGNvbnRleHQgPSB7ZmlsdGVyczoge30sIGxvY2Fsczoge319O1xuICB9XG4gIFxuICBzdW1tYXJ5ID0ge2ZpbHRlcnM6IHt9LCBsb2NhbHM6IHt9LCBwYXRoczoge30sIGFzc2lnbm1lbnRzOiB7fX07XG4gIHBhdGggPSAnJztcbn1cblxuLy/ooajovr7lvI/msYLlgLxcbi8vdHJlZTogcGFyc2VyIOeUn+aIkOeahCBhc3Rcbi8vY29udGV4dDog6KGo6L6+5byP5omn6KGM55qE546v5aKDXG4vL2NvbnRleHQubG9jYWxzOiDlj5jph49cbi8vY29udGV4dC5maWx0ZXJzOiDov4fmu6Tlmajlh73mlbBcbmV4cG9ydHMuZXZhbCA9IGZ1bmN0aW9uKHRyZWUsIF9jb250ZXh0KSB7XG4gIHJlc2V0KF9jb250ZXh0IHx8IHt9KTtcbiAgXG4gIHJldHVybiBldmFsdWF0ZSh0cmVlKTtcbn07XG5cbi8v6KGo6L6+5byP5pGY6KaBXG5leHBvcnRzLnN1bW1hcnkgPSBmdW5jdGlvbih0cmVlKSB7XG4gIHJlc2V0KCk7XG4gIFxuICBldmFsdWF0ZSh0cmVlKTtcbiAgXG4gIGlmKHBhdGgpIHtcbiAgICBzdW1tYXJ5LnBhdGhzW3BhdGhdID0gdHJ1ZTtcbiAgfVxuICBmb3IodmFyIGtleSBpbiBzdW1tYXJ5KSB7XG4gICAgc3VtbWFyeVtrZXldID0gT2JqZWN0LmtleXMoc3VtbWFyeVtrZXldKTtcbiAgfVxuICByZXR1cm4gc3VtbWFyeTtcbn07IiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG52YXIgRXZlbnQgPSB7XG4gIC8v55uR5ZCs6Ieq5a6a5LmJ5LqL5Lu2LlxuICBvbjogZnVuY3Rpb24obmFtZSwgaGFuZGxlciwgY29udGV4dCkge1xuICAgIHZhciBjdHggPSBjb250ZXh0IHx8IHRoaXNcbiAgICAgIDtcbiAgICAgIFxuICAgIGN0eC5faGFuZGxlcnMgPSBjdHguX2hhbmRsZXJzIHx8IHt9O1xuICAgIGN0eC5faGFuZGxlcnNbbmFtZV0gPSBjdHguX2hhbmRsZXJzW25hbWVdIHx8IFtdO1xuICAgIFxuICAgIGN0eC5faGFuZGxlcnNbbmFtZV0ucHVzaCh7aGFuZGxlcjogaGFuZGxlciwgY29udGV4dDogY29udGV4dCwgY3R4OiBjdHh9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgLy/np7vpmaTnm5HlkKzkuovku7YuXG4gIG9mZjogZnVuY3Rpb24obmFtZSwgaGFuZGxlciwgY29udGV4dCkge1xuICAgIHZhciBjdHggPSBjb250ZXh0IHx8IHRoaXNcbiAgICAgICwgaGFuZGxlcnMgPSBjdHguX2hhbmRsZXJzXG4gICAgICA7XG4gICAgICBcbiAgICBpZihuYW1lICYmIGhhbmRsZXJzW25hbWVdKXtcbiAgICAgIGlmKHV0aWxzLmlzRnVuY3Rpb24oaGFuZGxlcikpe1xuICAgICAgICBmb3IodmFyIGkgPSBoYW5kbGVyc1tuYW1lXS5sZW5ndGggLSAxOyBpID49MDsgaS0tKSB7XG4gICAgICAgICAgaWYoaGFuZGxlcnNbbmFtZV1baV0uaGFuZGxlciA9PT0gaGFuZGxlcil7XG4gICAgICAgICAgICBoYW5kbGVyc1tuYW1lXS5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9ZWxzZXtcbiAgICAgICAgaGFuZGxlcnNbbmFtZV0gPSBbXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIC8v6Kem5Y+R6Ieq5a6a5LmJ5LqL5Lu2LiBcbiAgLy/or6Xmlrnms5XmsqHmnInmj5DkvpvpnZnmgIHljJbnmoQgY29udGV4dCDlj4LmlbAuIOWmguimgemdmeaAgeWMluS9v+eUqCwg5bqU6K+lOiBgRXZlbnQudHJpZ2dlci5jYWxsKGNvbnRleHQsIG5hbWUsIGRhdGEpYFxuICB0cmlnZ2VyOiBmdW5jdGlvbihuYW1lLCBkYXRhKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzXG4gICAgICAsIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSlcbiAgICAgICwgaGFuZGxlcnMgPSB0aGF0Ll9oYW5kbGVyc1xuICAgICAgO1xuICAgICAgXG4gICAgaWYoaGFuZGxlcnMgJiYgaGFuZGxlcnNbbmFtZV0pe1xuICAgICAgaGFuZGxlcnNbbmFtZV0uZm9yRWFjaChmdW5jdGlvbihlKSB7XG4gICAgICAgIGUuaGFuZGxlci5hcHBseSh0aGF0LCBhcmdzKVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50OyIsIlwidXNlIHN0cmljdFwiO1xuLy9KYXZhc2NyaXB0IGV4cHJlc3Npb24gcGFyc2VyIG1vZGlmaWVkIGZvcm0gQ3JvY2tmb3JkJ3MgVERPUCBwYXJzZXJcbnZhciBjcmVhdGUgPSBPYmplY3QuY3JlYXRlIHx8IGZ1bmN0aW9uIChvKSB7XG4gIGZ1bmN0aW9uIEYoKSB7fVxuICBGLnByb3RvdHlwZSA9IG87XG4gIHJldHVybiBuZXcgRigpO1xufTtcblxudmFyIGVycm9yID0gZnVuY3Rpb24gKG1lc3NhZ2UsIHQpIHtcbiAgICB0ID0gdCB8fCB0aGlzO1xuICAgIHQubmFtZSA9IFwiU3ludGF4RXJyb3JcIjtcbiAgICB0Lm1lc3NhZ2UgPSBtZXNzYWdlO1xuICAgIHRocm93IHQ7XG59O1xuXG52YXIgbm9vcCA9IGZ1bmN0aW9uKCkge307XG5cbnZhciB0b2tlbml6ZSA9IGZ1bmN0aW9uIChjb2RlLCBwcmVmaXgsIHN1ZmZpeCkge1xuICAgIHZhciBjOyAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgY3VycmVudCBjaGFyYWN0ZXIuXG4gICAgdmFyIGZyb207ICAgICAgICAgICAgICAgICAgIC8vIFRoZSBpbmRleCBvZiB0aGUgc3RhcnQgb2YgdGhlIHRva2VuLlxuICAgIHZhciBpID0gMDsgICAgICAgICAgICAgICAgICAvLyBUaGUgaW5kZXggb2YgdGhlIGN1cnJlbnQgY2hhcmFjdGVyLlxuICAgIHZhciBsZW5ndGggPSBjb2RlLmxlbmd0aDtcbiAgICB2YXIgbjsgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIG51bWJlciB2YWx1ZS5cbiAgICB2YXIgcTsgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIHF1b3RlIGNoYXJhY3Rlci5cbiAgICB2YXIgc3RyOyAgICAgICAgICAgICAgICAgICAgLy8gVGhlIHN0cmluZyB2YWx1ZS5cblxuICAgIHZhciByZXN1bHQgPSBbXTsgICAgICAgICAgICAvLyBBbiBhcnJheSB0byBob2xkIHRoZSByZXN1bHRzLlxuXG4gICAgLy8gTWFrZSBhIHRva2VuIG9iamVjdC5cbiAgICB2YXIgbWFrZSA9IGZ1bmN0aW9uICh0eXBlLCB2YWx1ZSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogdHlwZSxcbiAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAgIGZyb206IGZyb20sXG4gICAgICAgICAgICB0bzogaVxuICAgICAgICB9O1xuICAgIH07XG5cbi8vIEJlZ2luIHRva2VuaXphdGlvbi4gSWYgdGhlIHNvdXJjZSBzdHJpbmcgaXMgZW1wdHksIHJldHVybiBub3RoaW5nLlxuXG4gICAgaWYgKCFjb2RlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbi8vIElmIHByZWZpeCBhbmQgc3VmZml4IHN0cmluZ3MgYXJlIG5vdCBwcm92aWRlZCwgc3VwcGx5IGRlZmF1bHRzLlxuXG4gICAgaWYgKHR5cGVvZiBwcmVmaXggIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHByZWZpeCA9ICc8PistJic7XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygc3VmZml4ICE9PSAnc3RyaW5nJykge1xuICAgICAgICBzdWZmaXggPSAnPT4mOic7XG4gICAgfVxuXG5cbi8vIExvb3AgdGhyb3VnaCBjb2RlIHRleHQsIG9uZSBjaGFyYWN0ZXIgYXQgYSB0aW1lLlxuXG4gICAgYyA9IGNvZGUuY2hhckF0KGkpO1xuICAgIHdoaWxlIChjKSB7XG4gICAgICAgIGZyb20gPSBpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGMgPD0gJyAnKSB7Ly8gSWdub3JlIHdoaXRlc3BhY2UuXG4gICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICBjID0gY29kZS5jaGFyQXQoaSk7XG4gICAgICAgIH0gZWxzZSBpZiAoKGMgPj0gJ2EnICYmIGMgPD0gJ3onKSB8fCAoYyA+PSAnQScgJiYgYyA8PSAnWicpIHx8IGMgPT09ICckJyB8fCBjID09PSAnXycpIHsvLyBuYW1lLlxuICAgICAgICAgICAgc3RyID0gYztcbiAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgIGZvciAoOzspIHtcbiAgICAgICAgICAgICAgICBjID0gY29kZS5jaGFyQXQoaSk7XG4gICAgICAgICAgICAgICAgaWYgKChjID49ICdhJyAmJiBjIDw9ICd6JykgfHwgKGMgPj0gJ0EnICYmIGMgPD0gJ1onKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgKGMgPj0gJzAnICYmIGMgPD0gJzknKSB8fCBjID09PSAnXycpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RyICs9IGM7XG4gICAgICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXN1bHQucHVzaChtYWtlKCduYW1lJywgc3RyKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoYyA+PSAnMCcgJiYgYyA8PSAnOScpIHtcbiAgICAgICAgLy8gbnVtYmVyLlxuXG4gICAgICAgIC8vIEEgbnVtYmVyIGNhbm5vdCBzdGFydCB3aXRoIGEgZGVjaW1hbCBwb2ludC4gSXQgbXVzdCBzdGFydCB3aXRoIGEgZGlnaXQsXG4gICAgICAgIC8vIHBvc3NpYmx5ICcwJy5cbiAgICAgICAgICAgIHN0ciA9IGM7XG4gICAgICAgICAgICBpICs9IDE7XG5cbi8vIExvb2sgZm9yIG1vcmUgZGlnaXRzLlxuXG4gICAgICAgICAgICBmb3IgKDs7KSB7XG4gICAgICAgICAgICAgICAgYyA9IGNvZGUuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgIGlmIChjIDwgJzAnIHx8IGMgPiAnOScpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgICAgICBzdHIgKz0gYztcbiAgICAgICAgICAgIH1cblxuLy8gTG9vayBmb3IgYSBkZWNpbWFsIGZyYWN0aW9uIHBhcnQuXG5cbiAgICAgICAgICAgIGlmIChjID09PSAnLicpIHtcbiAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICAgICAgc3RyICs9IGM7XG4gICAgICAgICAgICAgICAgZm9yICg7Oykge1xuICAgICAgICAgICAgICAgICAgICBjID0gY29kZS5jaGFyQXQoaSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjIDwgJzAnIHx8IGMgPiAnOScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgc3RyICs9IGM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4vLyBMb29rIGZvciBhbiBleHBvbmVudCBwYXJ0LlxuXG4gICAgICAgICAgICBpZiAoYyA9PT0gJ2UnIHx8IGMgPT09ICdFJykge1xuICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgICAgICBzdHIgKz0gYztcbiAgICAgICAgICAgICAgICBjID0gY29kZS5jaGFyQXQoaSk7XG4gICAgICAgICAgICAgICAgaWYgKGMgPT09ICctJyB8fCBjID09PSAnKycpIHtcbiAgICAgICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgICAgICAgICBzdHIgKz0gYztcbiAgICAgICAgICAgICAgICAgICAgYyA9IGNvZGUuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoYyA8ICcwJyB8fCBjID4gJzknKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yKFwiQmFkIGV4cG9uZW50XCIsIG1ha2UoJ251bWJlcicsIHN0cikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgc3RyICs9IGM7XG4gICAgICAgICAgICAgICAgICAgIGMgPSBjb2RlLmNoYXJBdChpKTtcbiAgICAgICAgICAgICAgICB9IHdoaWxlIChjID49ICcwJyAmJiBjIDw9ICc5Jyk7XG4gICAgICAgICAgICB9XG5cbi8vIE1ha2Ugc3VyZSB0aGUgbmV4dCBjaGFyYWN0ZXIgaXMgbm90IGEgbGV0dGVyLlxuXG4gICAgICAgICAgICBpZiAoYyA+PSAnYScgJiYgYyA8PSAneicpIHtcbiAgICAgICAgICAgICAgICBzdHIgKz0gYztcbiAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICAgICAgZXJyb3IoXCJCYWQgbnVtYmVyXCIsIG1ha2UoJ251bWJlcicsIHN0cikpO1xuICAgICAgICAgICAgfVxuXG4vLyBDb252ZXJ0IHRoZSBzdHJpbmcgdmFsdWUgdG8gYSBudW1iZXIuIElmIGl0IGlzIGZpbml0ZSwgdGhlbiBpdCBpcyBhIGdvb2Rcbi8vIHRva2VuLlxuXG4gICAgICAgICAgICBuID0gK3N0cjtcbiAgICAgICAgICAgIGlmIChpc0Zpbml0ZShuKSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKG1ha2UoJ251bWJlcicsIG4pKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXJyb3IoXCJCYWQgbnVtYmVyXCIsIG1ha2UoJ251bWJlcicsIHN0cikpO1xuICAgICAgICAgICAgfVxuXG4vLyBzdHJpbmdcblxuICAgICAgICB9IGVsc2UgaWYgKGMgPT09ICdcXCcnIHx8IGMgPT09ICdcIicpIHtcbiAgICAgICAgICAgIHN0ciA9ICcnO1xuICAgICAgICAgICAgcSA9IGM7XG4gICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICBmb3IgKDs7KSB7XG4gICAgICAgICAgICAgICAgYyA9IGNvZGUuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgIGlmIChjIDwgJyAnKSB7XG4gICAgICAgICAgICAgICAgICAgIG1ha2UoJ3N0cmluZycsIHN0cik7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yKGMgPT09ICdcXG4nIHx8IGMgPT09ICdcXHInIHx8IGMgPT09ICcnID9cbiAgICAgICAgICAgICAgICAgICAgICAgIFwiVW50ZXJtaW5hdGVkIHN0cmluZy5cIiA6XG4gICAgICAgICAgICAgICAgICAgICAgICBcIkNvbnRyb2wgY2hhcmFjdGVyIGluIHN0cmluZy5cIiwgbWFrZSgnJywgc3RyKSk7XG4gICAgICAgICAgICAgICAgfVxuXG4vLyBMb29rIGZvciB0aGUgY2xvc2luZyBxdW90ZS5cblxuICAgICAgICAgICAgICAgIGlmIChjID09PSBxKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cblxuLy8gTG9vayBmb3IgZXNjYXBlbWVudC5cblxuICAgICAgICAgICAgICAgIGlmIChjID09PSAnXFxcXCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaSA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICBlcnJvcihcIlVudGVybWluYXRlZCBzdHJpbmdcIiwgbWFrZSgnc3RyaW5nJywgc3RyKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYyA9IGNvZGUuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGMpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnYic6XG4gICAgICAgICAgICAgICAgICAgICAgICBjID0gJ1xcYic7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZic6XG4gICAgICAgICAgICAgICAgICAgICAgICBjID0gJ1xcZic7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbic6XG4gICAgICAgICAgICAgICAgICAgICAgICBjID0gJ1xcbic7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncic6XG4gICAgICAgICAgICAgICAgICAgICAgICBjID0gJ1xccic7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBjID0gJ1xcdCc7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaSA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yKFwiVW50ZXJtaW5hdGVkIHN0cmluZ1wiLCBtYWtlKCdzdHJpbmcnLCBzdHIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGMgPSBwYXJzZUludChjb2RlLnN1YnN0cihpICsgMSwgNCksIDE2KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXNGaW5pdGUoYykgfHwgYyA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yKFwiVW50ZXJtaW5hdGVkIHN0cmluZ1wiLCBtYWtlKCdzdHJpbmcnLCBzdHIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaSArPSA0O1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3RyICs9IGM7XG4gICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgcmVzdWx0LnB1c2gobWFrZSgnc3RyaW5nJywgc3RyKSk7XG4gICAgICAgICAgICBjID0gY29kZS5jaGFyQXQoaSk7XG5cbi8vIGNvbW1lbnQuXG5cbiAgICAgICAgfSBlbHNlIGlmIChjID09PSAnLycgJiYgY29kZS5jaGFyQXQoaSArIDEpID09PSAnLycpIHtcbiAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgIGZvciAoOzspIHtcbiAgICAgICAgICAgICAgICBjID0gY29kZS5jaGFyQXQoaSk7XG4gICAgICAgICAgICAgICAgaWYgKGMgPT09ICdcXG4nIHx8IGMgPT09ICdcXHInIHx8IGMgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICB9XG5cbi8vIGNvbWJpbmluZ1xuXG4gICAgICAgIH0gZWxzZSBpZiAocHJlZml4LmluZGV4T2YoYykgPj0gMCkge1xuICAgICAgICAgICAgc3RyID0gYztcbiAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICAgICAgYyA9IGNvZGUuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgIGlmIChpID49IGxlbmd0aCB8fCBzdWZmaXguaW5kZXhPZihjKSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN0ciArPSBjO1xuICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKG1ha2UoJ29wZXJhdG9yJywgc3RyKSk7XG5cbi8vIHNpbmdsZS1jaGFyYWN0ZXIgb3BlcmF0b3JcblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgcmVzdWx0LnB1c2gobWFrZSgnb3BlcmF0b3InLCBjKSk7XG4gICAgICAgICAgICBjID0gY29kZS5jaGFyQXQoaSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cblxudmFyIG1ha2VfcGFyc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN5bWJvbF90YWJsZSA9IHt9O1xuICAgIHZhciB0b2tlbjtcbiAgICB2YXIgdG9rZW5zO1xuICAgIHZhciB0b2tlbl9ucjtcbiAgICB2YXIgY29udGV4dDtcbiAgICBcbiAgICB2YXIgaXRzZWxmID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgdmFyIGZpbmQgPSBmdW5jdGlvbiAobikge1xuICAgICAgbi5udWQgICAgICA9IGl0c2VsZjtcbiAgICAgIG4ubGVkICAgICAgPSBudWxsO1xuICAgICAgbi5zdGQgICAgICA9IG51bGw7XG4gICAgICBuLmxicCAgICAgID0gMDtcbiAgICAgIHJldHVybiBuO1xuICAgIH07XG5cbiAgICB2YXIgYWR2YW5jZSA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICB2YXIgYSwgbywgdCwgdjtcbiAgICAgICAgaWYgKGlkICYmIHRva2VuLmlkICE9PSBpZCkge1xuICAgICAgICAgICAgZXJyb3IoXCJFeHBlY3RlZCAnXCIgKyBpZCArIFwiJy5cIiwgdG9rZW4pO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0b2tlbl9uciA+PSB0b2tlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICB0b2tlbiA9IHN5bWJvbF90YWJsZVtcIihlbmQpXCJdO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHQgPSB0b2tlbnNbdG9rZW5fbnJdO1xuICAgICAgICB0b2tlbl9uciArPSAxO1xuICAgICAgICB2ID0gdC52YWx1ZTtcbiAgICAgICAgYSA9IHQudHlwZTtcbiAgICAgICAgaWYgKChhID09PSBcIm9wZXJhdG9yXCIgfHwgYSAhPT0gJ3N0cmluZycpICYmIHYgaW4gc3ltYm9sX3RhYmxlKSB7XG4gICAgICAgICAgICAvL3RydWUsIGZhbHNlIOetieebtOaOpemHj+S5n+S8mui/m+WFpeatpOWIhuaUr1xuICAgICAgICAgICAgbyA9IHN5bWJvbF90YWJsZVt2XTtcbiAgICAgICAgICAgIGlmICghbykge1xuICAgICAgICAgICAgICAgIGVycm9yKFwiVW5rbm93biBvcGVyYXRvci5cIiwgdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoYSA9PT0gXCJuYW1lXCIpIHtcbiAgICAgICAgICAgIG8gPSBmaW5kKHQpO1xuICAgICAgICB9IGVsc2UgaWYgKGEgPT09IFwic3RyaW5nXCIgfHwgYSA9PT0gIFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgIG8gPSBzeW1ib2xfdGFibGVbXCIobGl0ZXJhbClcIl07XG4gICAgICAgICAgICBhID0gXCJsaXRlcmFsXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlcnJvcihcIlVuZXhwZWN0ZWQgdG9rZW4uXCIsIHQpO1xuICAgICAgICB9XG4gICAgICAgIHRva2VuID0gY3JlYXRlKG8pO1xuICAgICAgICB0b2tlbi5mcm9tICA9IHQuZnJvbTtcbiAgICAgICAgdG9rZW4udG8gICAgPSB0LnRvO1xuICAgICAgICB0b2tlbi52YWx1ZSA9IHY7XG4gICAgICAgIHRva2VuLmFyaXR5ID0gYTtcbiAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgIH07XG5cbiAgICB2YXIgZXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChyYnApIHtcbiAgICAgICAgdmFyIGxlZnQ7XG4gICAgICAgIHZhciB0ID0gdG9rZW47XG4gICAgICAgIGFkdmFuY2UoKTtcbiAgICAgICAgbGVmdCA9IHQubnVkKCk7XG4gICAgICAgIHdoaWxlIChyYnAgPCB0b2tlbi5sYnApIHtcbiAgICAgICAgICAgIHQgPSB0b2tlbjtcbiAgICAgICAgICAgIGFkdmFuY2UoKTtcbiAgICAgICAgICAgIGxlZnQgPSB0LmxlZChsZWZ0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbGVmdDtcbiAgICB9O1xuXG4gICAgdmFyIG9yaWdpbmFsX3N5bWJvbCA9IHtcbiAgICAgICAgbnVkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBlcnJvcihcIlVuZGVmaW5lZC5cIiwgdGhpcyk7XG4gICAgICAgIH0sXG4gICAgICAgIGxlZDogZnVuY3Rpb24gKGxlZnQpIHtcbiAgICAgICAgICAgIGVycm9yKFwiTWlzc2luZyBvcGVyYXRvci5cIiwgdGhpcyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIHN5bWJvbCA9IGZ1bmN0aW9uIChpZCwgYnApIHtcbiAgICAgICAgdmFyIHMgPSBzeW1ib2xfdGFibGVbaWRdO1xuICAgICAgICBicCA9IGJwIHx8IDA7XG4gICAgICAgIGlmIChzKSB7XG4gICAgICAgICAgICBpZiAoYnAgPj0gcy5sYnApIHtcbiAgICAgICAgICAgICAgICBzLmxicCA9IGJwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcyA9IGNyZWF0ZShvcmlnaW5hbF9zeW1ib2wpO1xuICAgICAgICAgICAgcy5pZCA9IHMudmFsdWUgPSBpZDtcbiAgICAgICAgICAgIHMubGJwID0gYnA7XG4gICAgICAgICAgICBzeW1ib2xfdGFibGVbaWRdID0gcztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcztcbiAgICB9O1xuXG4gICAgdmFyIGNvbnN0YW50ID0gZnVuY3Rpb24gKHMsIHYsIGEpIHtcbiAgICAgICAgdmFyIHggPSBzeW1ib2wocyk7XG4gICAgICAgIHgubnVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IHN5bWJvbF90YWJsZVt0aGlzLmlkXS52YWx1ZTtcbiAgICAgICAgICAgIHRoaXMuYXJpdHkgPSBcImxpdGVyYWxcIjtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuICAgICAgICB4LnZhbHVlID0gdjtcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgfTtcbiAgICBcbiAgICB2YXIgaW5maXggPSBmdW5jdGlvbiAoaWQsIGJwLCBsZWQpIHtcbiAgICAgICAgdmFyIHMgPSBzeW1ib2woaWQsIGJwKTtcbiAgICAgICAgcy5sZWQgPSBsZWQgfHwgZnVuY3Rpb24gKGxlZnQpIHtcbiAgICAgICAgICAgIHRoaXMuZmlyc3QgPSBsZWZ0O1xuICAgICAgICAgICAgdGhpcy5zZWNvbmQgPSBleHByZXNzaW9uKGJwKTtcbiAgICAgICAgICAgIHRoaXMuYXJpdHkgPSBcImJpbmFyeVwiO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBzO1xuICAgIH07XG5cbiAgICB2YXIgaW5maXhyID0gZnVuY3Rpb24gKGlkLCBicCwgbGVkKSB7XG4gICAgICAgIHZhciBzID0gc3ltYm9sKGlkLCBicCk7XG4gICAgICAgIHMubGVkID0gbGVkIHx8IGZ1bmN0aW9uIChsZWZ0KSB7XG4gICAgICAgICAgICB0aGlzLmZpcnN0ID0gbGVmdDtcbiAgICAgICAgICAgIHRoaXMuc2Vjb25kID0gZXhwcmVzc2lvbihicCAtIDEpO1xuICAgICAgICAgICAgdGhpcy5hcml0eSA9IFwiYmluYXJ5XCI7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHM7XG4gICAgfTtcblxuICAgIHZhciBwcmVmaXggPSBmdW5jdGlvbiAoaWQsIG51ZCkge1xuICAgICAgICB2YXIgcyA9IHN5bWJvbChpZCk7XG4gICAgICAgIHMubnVkID0gbnVkIHx8IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuZmlyc3QgPSBleHByZXNzaW9uKDcwKTtcbiAgICAgICAgICAgIHRoaXMuYXJpdHkgPSBcInVuYXJ5XCI7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHM7XG4gICAgfTtcblxuICAgIHN5bWJvbChcIihlbmQpXCIpO1xuICAgIHN5bWJvbChcIihuYW1lKVwiKTtcbiAgICBzeW1ib2woXCI6XCIpO1xuICAgIHN5bWJvbChcIilcIik7XG4gICAgc3ltYm9sKFwiXVwiKTtcbiAgICBzeW1ib2woXCJ9XCIpO1xuICAgIHN5bWJvbChcIixcIik7XG5cbiAgICBjb25zdGFudChcInRydWVcIiwgdHJ1ZSk7XG4gICAgY29uc3RhbnQoXCJmYWxzZVwiLCBmYWxzZSk7XG4gICAgY29uc3RhbnQoXCJudWxsXCIsIG51bGwpO1xuICAgIFxuICAgIGNvbnN0YW50KFwiTWF0aFwiLCBNYXRoKTtcbiAgICBjb25zdGFudChcIkRhdGVcIiwgRGF0ZSk7XG5cbiAgICBzeW1ib2woXCIobGl0ZXJhbClcIikubnVkID0gaXRzZWxmO1xuXG4gICAgLy8gc3ltYm9sKFwidGhpc1wiKS5udWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIHRoaXMuYXJpdHkgPSBcInRoaXNcIjtcbiAgICAgICAgLy8gcmV0dXJuIHRoaXM7XG4gICAgLy8gfTtcblxuICAgIC8vT3BlcmF0b3IgUHJlY2VkZW5jZTpcbiAgICAvL2h0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL09wZXJhdG9ycy9PcGVyYXRvcl9QcmVjZWRlbmNlXG5cbiAgICBpbmZpeChcIj9cIiwgMjAsIGZ1bmN0aW9uIChsZWZ0KSB7XG4gICAgICAgIHRoaXMuZmlyc3QgPSBsZWZ0O1xuICAgICAgICB0aGlzLnNlY29uZCA9IGV4cHJlc3Npb24oMCk7XG4gICAgICAgIGFkdmFuY2UoXCI6XCIpO1xuICAgICAgICB0aGlzLnRoaXJkID0gZXhwcmVzc2lvbigwKTtcbiAgICAgICAgdGhpcy5hcml0eSA9IFwidGVybmFyeVwiO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9KTtcbiAgICBcbiAgICBpbmZpeHIoXCImJlwiLCAzMSk7XG4gICAgaW5maXhyKFwifHxcIiwgMzApO1xuXG4gICAgaW5maXhyKFwiPT09XCIsIDQwKTtcbiAgICBpbmZpeHIoXCIhPT1cIiwgNDApO1xuXG4gICAgaW5maXhyKFwiPT1cIiwgNDApO1xuICAgIGluZml4cihcIiE9XCIsIDQwKTtcblxuICAgIGluZml4cihcIjxcIiwgNDApO1xuICAgIGluZml4cihcIjw9XCIsIDQwKTtcbiAgICBpbmZpeHIoXCI+XCIsIDQwKTtcbiAgICBpbmZpeHIoXCI+PVwiLCA0MCk7XG4gICAgXG4gICAgaW5maXgoXCJpblwiLCA0NSwgZnVuY3Rpb24gKGxlZnQpIHtcbiAgICAgICAgdGhpcy5maXJzdCA9IGxlZnQ7XG4gICAgICAgIHRoaXMuc2Vjb25kID0gZXhwcmVzc2lvbigwKTtcbiAgICAgICAgdGhpcy5hcml0eSA9IFwiYmluYXJ5XCI7XG4gICAgICAgIGlmKGNvbnRleHQgPT09ICdyZXBlYXQnKXtcbiAgICAgICAgICAvLyBgaW5gIGF0IHJlcGVhdCBibG9ja1xuICAgICAgICAgIHRoaXMuYXNzaWdubWVudCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSk7XG5cbiAgICBpbmZpeChcIitcIiwgNTApO1xuICAgIGluZml4KFwiLVwiLCA1MCk7XG5cbiAgICBpbmZpeChcIipcIiwgNjApO1xuICAgIGluZml4KFwiL1wiLCA2MCk7XG4gICAgaW5maXgoXCIlXCIsIDYwKTtcblxuICAgIGluZml4KFwiLlwiLCA4MCwgZnVuY3Rpb24gKGxlZnQpIHtcbiAgICAgICAgdGhpcy5maXJzdCA9IGxlZnQ7XG4gICAgICAgIGlmICh0b2tlbi5hcml0eSAhPT0gXCJuYW1lXCIpIHtcbiAgICAgICAgICAgIGVycm9yKFwiRXhwZWN0ZWQgYSBwcm9wZXJ0eSBuYW1lLlwiLCB0b2tlbik7XG4gICAgICAgIH1cbiAgICAgICAgdG9rZW4uYXJpdHkgPSBcImxpdGVyYWxcIjtcbiAgICAgICAgdGhpcy5zZWNvbmQgPSB0b2tlbjtcbiAgICAgICAgdGhpcy5hcml0eSA9IFwiYmluYXJ5XCI7XG4gICAgICAgIGFkdmFuY2UoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSk7XG5cbiAgICBpbmZpeChcIltcIiwgODAsIGZ1bmN0aW9uIChsZWZ0KSB7XG4gICAgICAgIHRoaXMuZmlyc3QgPSBsZWZ0O1xuICAgICAgICB0aGlzLnNlY29uZCA9IGV4cHJlc3Npb24oMCk7XG4gICAgICAgIHRoaXMuYXJpdHkgPSBcImJpbmFyeVwiO1xuICAgICAgICBhZHZhbmNlKFwiXVwiKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSk7XG5cbiAgICBpbmZpeChcIihcIiwgODAsIGZ1bmN0aW9uIChsZWZ0KSB7XG4gICAgICAgIHZhciBhID0gW107XG4gICAgICAgIGlmIChsZWZ0LmlkID09PSBcIi5cIiB8fCBsZWZ0LmlkID09PSBcIltcIikge1xuICAgICAgICAgICAgdGhpcy5hcml0eSA9IFwidGVybmFyeVwiO1xuICAgICAgICAgICAgdGhpcy5maXJzdCA9IGxlZnQuZmlyc3Q7XG4gICAgICAgICAgICB0aGlzLnNlY29uZCA9IGxlZnQuc2Vjb25kO1xuICAgICAgICAgICAgdGhpcy50aGlyZCA9IGE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmFyaXR5ID0gXCJiaW5hcnlcIjtcbiAgICAgICAgICAgIHRoaXMuZmlyc3QgPSBsZWZ0O1xuICAgICAgICAgICAgdGhpcy5zZWNvbmQgPSBhO1xuICAgICAgICAgICAgaWYgKChsZWZ0LmFyaXR5ICE9PSBcInVuYXJ5XCIgfHwgbGVmdC5pZCAhPT0gXCJmdW5jdGlvblwiKSAmJlxuICAgICAgICAgICAgICAgICAgICBsZWZ0LmFyaXR5ICE9PSBcIm5hbWVcIiAmJiBsZWZ0LmFyaXR5ICE9PSBcImxpdGVyYWxcIiAmJiBsZWZ0LmlkICE9PSBcIihcIiAmJlxuICAgICAgICAgICAgICAgICAgICBsZWZ0LmlkICE9PSBcIiYmXCIgJiYgbGVmdC5pZCAhPT0gXCJ8fFwiICYmIGxlZnQuaWQgIT09IFwiP1wiKSB7XG4gICAgICAgICAgICAgICAgZXJyb3IoXCJFeHBlY3RlZCBhIHZhcmlhYmxlIG5hbWUuXCIsIGxlZnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0b2tlbi5pZCAhPT0gXCIpXCIpIHtcbiAgICAgICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICAgICAgYS5wdXNoKGV4cHJlc3Npb24oMCkpO1xuICAgICAgICAgICAgICAgIGlmICh0b2tlbi5pZCAhPT0gXCIsXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFkdmFuY2UoXCIsXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGFkdmFuY2UoXCIpXCIpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9KTtcblxuICAgIC8vZmlsdGVyXG4gICAgaW5maXgoXCJ8XCIsIDEwLCBmdW5jdGlvbihsZWZ0KSB7XG4gICAgICB2YXIgYTtcbiAgICAgIHRoaXMuZmlyc3QgPSBsZWZ0O1xuICAgICAgdG9rZW4uYXJpdHkgPSAnZmlsdGVyJztcbiAgICAgIHRoaXMuc2Vjb25kID0gZXhwcmVzc2lvbigxMCk7XG4gICAgICB0aGlzLmFyaXR5ID0gJ2JpbmFyeSc7XG4gICAgICBpZih0b2tlbi5pZCA9PT0gJzonKXtcbiAgICAgICAgdGhpcy5hcml0eSA9ICd0ZXJuYXJ5JztcbiAgICAgICAgdGhpcy50aGlyZCA9IGEgPSBbXTtcbiAgICAgICAgd2hpbGUodHJ1ZSl7XG4gICAgICAgICAgYWR2YW5jZSgnOicpO1xuICAgICAgICAgIGEucHVzaChleHByZXNzaW9uKDApKTtcbiAgICAgICAgICBpZih0b2tlbi5pZCAhPT0gXCI6XCIpe1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9KTtcbiAgICBcblxuICAgIHByZWZpeChcIiFcIik7XG4gICAgcHJlZml4KFwiLVwiKTtcbiAgICBwcmVmaXgoXCJ0eXBlb2ZcIik7XG5cbiAgICBwcmVmaXgoXCIoXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGUgPSBleHByZXNzaW9uKDApO1xuICAgICAgICBhZHZhbmNlKFwiKVwiKTtcbiAgICAgICAgcmV0dXJuIGU7XG4gICAgfSk7XG5cbiAgICBwcmVmaXgoXCJbXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGEgPSBbXTtcbiAgICAgICAgaWYgKHRva2VuLmlkICE9PSBcIl1cIikge1xuICAgICAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgICAgICBhLnB1c2goZXhwcmVzc2lvbigwKSk7XG4gICAgICAgICAgICAgICAgaWYgKHRva2VuLmlkICE9PSBcIixcIikge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYWR2YW5jZShcIixcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYWR2YW5jZShcIl1cIik7XG4gICAgICAgIHRoaXMuZmlyc3QgPSBhO1xuICAgICAgICB0aGlzLmFyaXR5ID0gXCJ1bmFyeVwiO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9KTtcblxuICAgIHByZWZpeChcIntcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgYSA9IFtdLCBuLCB2O1xuICAgICAgICBpZiAodG9rZW4uaWQgIT09IFwifVwiKSB7XG4gICAgICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgICAgIG4gPSB0b2tlbjtcbiAgICAgICAgICAgICAgICBpZiAobi5hcml0eSAhPT0gXCJuYW1lXCIgJiYgbi5hcml0eSAhPT0gXCJsaXRlcmFsXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3IoXCJCYWQgcHJvcGVydHkgbmFtZS5cIiwgdG9rZW4pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhZHZhbmNlKCk7XG4gICAgICAgICAgICAgICAgYWR2YW5jZShcIjpcIik7XG4gICAgICAgICAgICAgICAgdiA9IGV4cHJlc3Npb24oMCk7XG4gICAgICAgICAgICAgICAgdi5rZXkgPSBuLnZhbHVlO1xuICAgICAgICAgICAgICAgIGEucHVzaCh2KTtcbiAgICAgICAgICAgICAgICBpZiAodG9rZW4uaWQgIT09IFwiLFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhZHZhbmNlKFwiLFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBhZHZhbmNlKFwifVwiKTtcbiAgICAgICAgdGhpcy5maXJzdCA9IGE7XG4gICAgICAgIHRoaXMuYXJpdHkgPSBcInVuYXJ5XCI7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0pO1xuXG4gICAgLy9fc291cmNlOiDooajovr7lvI/ku6PnoIHlrZfnrKbkuLJcbiAgICAvL19jb250ZXh0OiDooajovr7lvI/nmoTor63lj6Xnjq/looNcbiAgICByZXR1cm4gZnVuY3Rpb24gKF9zb3VyY2UsIF9jb250ZXh0KSB7XG4gICAgICAgIHRva2VucyA9IHRva2VuaXplKF9zb3VyY2UsICc9PD4hKy0qJnwvJV4nLCAnPTw+JnwnKTtcbiAgICAgICAgdG9rZW5fbnIgPSAwO1xuICAgICAgICBjb250ZXh0ID0gX2NvbnRleHQ7XG4gICAgICAgIGFkdmFuY2UoKTtcbiAgICAgICAgdmFyIHMgPSBleHByZXNzaW9uKDApO1xuICAgICAgICBhZHZhbmNlKFwiKGVuZClcIik7XG4gICAgICAgIHJldHVybiBzO1xuICAgIH07XG59O1xuXG5leHBvcnRzLnBhcnNlID0gbWFrZV9wYXJzZSgpOyIsInZhciB0b2tlblJlZyA9IC97eyh7KFtefVxcbl0rKX18W159XFxuXSspfX0vZztcblxuLy/lrZfnrKbkuLLkuK3mmK/lkKbljIXlkKvmqKHmnb/ljaDkvY3nrKbmoIforrBcbmZ1bmN0aW9uIGhhc1Rva2VuKHN0cikge1xuICB0b2tlblJlZy5sYXN0SW5kZXggPSAwO1xuICByZXR1cm4gc3RyICYmIHRva2VuUmVnLnRlc3Qoc3RyKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VUb2tlbih2YWx1ZSkge1xuICB2YXIgdG9rZW5zID0gW11cbiAgICAsIHRleHRNYXAgPSBbXVxuICAgICwgc3RhcnQgPSAwXG4gICAgLCB2YWwsIHRva2VuXG4gICAgO1xuICBcbiAgdG9rZW5SZWcubGFzdEluZGV4ID0gMDtcbiAgXG4gIHdoaWxlKCh2YWwgPSB0b2tlblJlZy5leGVjKHZhbHVlKSkpe1xuICAgIGlmKHRva2VuUmVnLmxhc3RJbmRleCAtIHN0YXJ0ID4gdmFsWzBdLmxlbmd0aCl7XG4gICAgICB0ZXh0TWFwLnB1c2godmFsdWUuc2xpY2Uoc3RhcnQsIHRva2VuUmVnLmxhc3RJbmRleCAtIHZhbFswXS5sZW5ndGgpKTtcbiAgICB9XG4gICAgXG4gICAgdG9rZW4gPSB7XG4gICAgICBlc2NhcGU6ICF2YWxbMl1cbiAgICAsIHBhdGg6ICh2YWxbMl0gfHwgdmFsWzFdKS50cmltKClcbiAgICAsIHBvc2l0aW9uOiB0ZXh0TWFwLmxlbmd0aFxuICAgICwgdGV4dE1hcDogdGV4dE1hcFxuICAgIH07XG4gICAgXG4gICAgdG9rZW5zLnB1c2godG9rZW4pO1xuICAgIFxuICAgIC8v5LiA5Liq5byV55So57G75Z6LKOaVsOe7hCnkvZzkuLroioLngrnlr7nosaHnmoTmlofmnKzlm74sIOi/meagt+W9k+afkOS4gOS4quW8leeUqOaUueWPmOS6huS4gOS4quWAvOWQjiwg5YW25LuW5byV55So5Y+W5b6X55qE5YC86YO95Lya5ZCM5pe25pu05pawXG4gICAgdGV4dE1hcC5wdXNoKHZhbFswXSk7XG4gICAgXG4gICAgc3RhcnQgPSB0b2tlblJlZy5sYXN0SW5kZXg7XG4gIH1cbiAgXG4gIGlmKHZhbHVlLmxlbmd0aCA+IHN0YXJ0KXtcbiAgICB0ZXh0TWFwLnB1c2godmFsdWUuc2xpY2Uoc3RhcnQsIHZhbHVlLmxlbmd0aCkpO1xuICB9XG4gIFxuICB0b2tlbnMudGV4dE1hcCA9IHRleHRNYXA7XG4gIFxuICByZXR1cm4gdG9rZW5zO1xufVxuXG5leHBvcnRzLmhhc1Rva2VuID0gaGFzVG9rZW47XG5cbmV4cG9ydHMucGFyc2VUb2tlbiA9IHBhcnNlVG9rZW47IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8vdXRpbHNcbi8vLS0tXG5cbnZhciBkb2MgPSByZXF1aXJlKCcuL2RvY3VtZW50LmpzJyk7XG5cbnZhciBrZXlQYXRoUmVnID0gLyg/OlxcLnxcXFspL2dcbiAgLCBicmEgPSAvXFxdL2dcbiAgO1xuXG4vL3BhdGgua2V5LCBwYXRoW2tleV0gLS0+IFsncGF0aCcsICdrZXknXVxuZnVuY3Rpb24gcGFyc2VLZXlQYXRoKGtleVBhdGgpe1xuICByZXR1cm4ga2V5UGF0aC5yZXBsYWNlKGJyYSwgJycpLnNwbGl0KGtleVBhdGhSZWcpO1xufVxuXG4vKipcbiAqIOWQiOW5tuWvueixoVxuICogQHN0YXRpY1xuICogQHBhcmFtIHtCb29sZWFufSBbZGVlcD1mYWxzZV0g5piv5ZCm5rex5bqm5ZCI5bm2XG4gKiBAcGFyYW0ge09iamVjdH0gdGFyZ2V0IOebruagh+WvueixoVxuICogQHBhcmFtIHtPYmplY3R9IFtvYmplY3QuLi5dIOadpea6kOWvueixoVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSDnlKjkuo7oh6rlrprkuYnlkIjlubbnmoTlm57osINcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSDlkIjlubblkI7nmoQgdGFyZ2V0IOWvueixoVxuICovXG5mdW5jdGlvbiBleHRlbmQoLyogZGVlcCwgdGFyZ2V0LCBvYmplY3QuLi4sIGNhbGxsYmFjayAqLykge1xuICB2YXIgb3B0aW9uc1xuICAgICwgbmFtZSwgc3JjLCBjb3B5LCBjb3B5SXNBcnJheSwgY2xvbmVcbiAgICAsIHRhcmdldCA9IGFyZ3VtZW50c1swXSB8fCB7fVxuICAgICwgaSA9IDFcbiAgICAsIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGhcbiAgICAsIGRlZXAgPSBmYWxzZVxuICAgICwgY2FsbGJhY2tcbiAgICA7XG5cbiAgLy8gSGFuZGxlIGEgZGVlcCBjb3B5IHNpdHVhdGlvblxuICBpZiAodHlwZW9mIHRhcmdldCA9PT0gXCJib29sZWFuXCIpIHtcbiAgICBkZWVwID0gdGFyZ2V0O1xuXG4gICAgLy8gc2tpcCB0aGUgYm9vbGVhbiBhbmQgdGhlIHRhcmdldFxuICAgIHRhcmdldCA9IGFyZ3VtZW50c1sgaSBdIHx8IHt9O1xuICAgIGkrKztcbiAgfVxuICBcbiAgaWYodXRpbHMuaXNGdW5jdGlvbihhcmd1bWVudHNbbGVuZ3RoIC0gMV0pKSB7XG4gICAgY2FsbGJhY2sgPSBhcmd1bWVudHNbbGVuZ3RoIC0gMV07XG4gICAgbGVuZ3RoLS07XG4gIH1cblxuICAvLyBIYW5kbGUgY2FzZSB3aGVuIHRhcmdldCBpcyBhIHN0cmluZyBvciBzb21ldGhpbmcgKHBvc3NpYmxlIGluIGRlZXAgY29weSlcbiAgaWYgKHR5cGVvZiB0YXJnZXQgIT09IFwib2JqZWN0XCIgJiYgIXV0aWxzLmlzRnVuY3Rpb24odGFyZ2V0KSkge1xuICAgIHRhcmdldCA9IHt9O1xuICB9XG5cbiAgZm9yICggOyBpIDwgbGVuZ3RoOyBpKysgKSB7XG4gICAgLy8gT25seSBkZWFsIHdpdGggbm9uLW51bGwvdW5kZWZpbmVkIHZhbHVlc1xuICAgIGlmICggKG9wdGlvbnMgPSBhcmd1bWVudHNbIGkgXSkgIT0gbnVsbCApIHtcbiAgICAgIC8vIEV4dGVuZCB0aGUgYmFzZSBvYmplY3RcbiAgICAgIGZvciAoIG5hbWUgaW4gb3B0aW9ucyApIHtcbiAgICAgICAgLy9hbmRyb2lkIDIuMyBicm93c2VyIGNhbiBlbnVtIHRoZSBwcm90b3R5cGUgb2YgY29uc3RydWN0b3IuLi5cbiAgICAgICAgaWYob3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShuYW1lKSAmJiBuYW1lICE9PSAncHJvdG90eXBlJyl7XG4gICAgICAgICAgc3JjID0gdGFyZ2V0WyBuYW1lIF07XG4gICAgICAgICAgY29weSA9IG9wdGlvbnNbIG5hbWUgXTtcbiAgICAgICAgICBcblxuICAgICAgICAgIC8vIFJlY3Vyc2UgaWYgd2UncmUgbWVyZ2luZyBwbGFpbiBvYmplY3RzIG9yIGFycmF5c1xuICAgICAgICAgIGlmICggZGVlcCAmJiBjb3B5ICYmICggdXRpbHMuaXNQbGFpbk9iamVjdChjb3B5KSB8fCAoY29weUlzQXJyYXkgPSB1dGlscy5pc0FycmF5KGNvcHkpKSApICkge1xuICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUHJldmVudCBuZXZlci1lbmRpbmcgbG9vcFxuICAgICAgICAgICAgaWYgKCB0YXJnZXQgPT09IGNvcHkgKSB7XG4gICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCBjb3B5SXNBcnJheSApIHtcbiAgICAgICAgICAgICAgY29weUlzQXJyYXkgPSBmYWxzZTtcbiAgICAgICAgICAgICAgY2xvbmUgPSBzcmMgJiYgdXRpbHMuaXNBcnJheShzcmMpID8gc3JjIDogW107XG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNsb25lID0gc3JjICYmIHV0aWxzLmlzUGxhaW5PYmplY3Qoc3JjKSA/IHNyYyA6IHt9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZihjYWxsYmFjaykge1xuICAgICAgICAgICAgICBjb3B5ID0gY2FsbGJhY2soY2xvbmUsIGNvcHksIG5hbWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBOZXZlciBtb3ZlIG9yaWdpbmFsIG9iamVjdHMsIGNsb25lIHRoZW1cbiAgICAgICAgICAgIHRhcmdldFsgbmFtZSBdID0gZXh0ZW5kKCBkZWVwLCBjbG9uZSwgY29weSwgY2FsbGJhY2spO1xuXG4gICAgICAgICAgICAvLyBEb24ndCBicmluZyBpbiB1bmRlZmluZWQgdmFsdWVzXG4gICAgICAgICAgfSBlbHNlIGlmICggIXV0aWxzLmlzVW5kZWZpbmVkKGNvcHkpICkge1xuXG4gICAgICAgICAgICBpZihjYWxsYmFjaykge1xuICAgICAgICAgICAgICBjb3B5ID0gY2FsbGJhY2soc3JjLCBjb3B5LCBuYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRhcmdldFsgbmFtZSBdID0gY29weTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBSZXR1cm4gdGhlIG1vZGlmaWVkIG9iamVjdFxuICByZXR1cm4gdGFyZ2V0O1xufVxuXG52YXIgY3JlYXRlID0gT2JqZWN0LmNyZWF0ZSB8fCBmdW5jdGlvbiAobykge1xuICBmdW5jdGlvbiBGKCkge31cbiAgRi5wcm90b3R5cGUgPSBvO1xuICByZXR1cm4gbmV3IEYoKTtcbn07XG5cbmZ1bmN0aW9uIHRwbFBhcnNlKHRwbCwgdGFyZ2V0KSB7XG4gIHZhciBlbDtcbiAgaWYodXRpbHMuaXNPYmplY3QodHBsKSl7XG4gICAgaWYodGFyZ2V0KXtcbiAgICAgIGVsID0gdGFyZ2V0ID0gdXRpbHMuaXNPYmplY3QodGFyZ2V0KSA/IHRhcmdldCA6IGRvYy5jcmVhdGVFbGVtZW50KHRhcmdldCk7XG4gICAgICBlbC5pbm5lckhUTUwgPSAnJzsvL+a4heepuuebruagh+WvueixoVxuICAgICAgdGFyZ2V0LmFwcGVuZENoaWxkKHRwbCk7XG4gICAgfWVsc2V7XG4gICAgICBlbCA9IHRwbDtcbiAgICB9XG4gICAgdHBsID0gZWwub3V0ZXJIVE1MO1xuICB9ZWxzZXtcbiAgICBlbCA9IHV0aWxzLmlzT2JqZWN0KHRhcmdldCkgPyB0YXJnZXQgOiBkb2MuY3JlYXRlRWxlbWVudCh0YXJnZXQgfHwgJ2RpdicpO1xuICAgIGVsLmlubmVySFRNTCA9IHRwbDtcbiAgfVxuICByZXR1cm4ge2VsOiBlbCwgdHBsOiB0cGx9O1xufVxuXG4gXG52YXIgdXRpbHMgPSB7XG4gIG5vb3A6IGZ1bmN0aW9uICgpe31cbiwgaWU6ICEhZG9jLmF0dGFjaEV2ZW50XG5cbiwgaXNPYmplY3Q6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICByZXR1cm4gdHlwZW9mIHZhbCA9PT0gJ29iamVjdCcgJiYgdmFsICE9PSBudWxsO1xuICB9XG5cbiwgaXNVbmRlZmluZWQ6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICByZXR1cm4gdHlwZW9mIHZhbCA9PT0gJ3VuZGVmaW5lZCc7XG4gIH1cblxuLCBpc0Z1bmN0aW9uOiBmdW5jdGlvbiAodmFsKXtcbiAgICByZXR1cm4gdHlwZW9mIHZhbCA9PT0gJ2Z1bmN0aW9uJztcbiAgfVxuXG4sIGlzQXJyYXk6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICBpZih1dGlscy5pZSl7XG4gICAgICAvL0lFIDkg5Y+K5Lul5LiLIElFIOi3qOeql+WPo+ajgOa1i+aVsOe7hFxuICAgICAgcmV0dXJuIHZhbCAmJiB2YWwuY29uc3RydWN0b3IgKyAnJyA9PT0gQXJyYXkgKyAnJztcbiAgICB9ZWxzZXtcbiAgICAgIHJldHVybiBBcnJheS5pc0FycmF5KHZhbCk7XG4gICAgfVxuICB9XG5cbiAgLy/nroDljZXlr7nosaHnmoTnroDmmJPliKTmlq1cbiwgaXNQbGFpbk9iamVjdDogZnVuY3Rpb24gKG8pe1xuICAgIGlmICghbyB8fCAoe30pLnRvU3RyaW5nLmNhbGwobykgIT09ICdbb2JqZWN0IE9iamVjdF0nIHx8IG8ubm9kZVR5cGUgfHwgbyA9PT0gby53aW5kb3cpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9ZWxzZXtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIC8v5Ye95pWw5YiH6Z2iLiBvcmlGbiDljp/lp4vlh73mlbAsIGZuIOWIh+mdouihpeWFheWHveaVsFxuICAvL+WJjemdoueahOWHveaVsOi/lOWbnuWAvOS8oOWFpSBicmVha0NoZWNrIOWIpOaWrSwgYnJlYWtDaGVjayDov5Tlm57lgLzkuLrnnJ/ml7bkuI3miafooYzliIfpnaLooaXlhYXnmoTlh73mlbBcbiwgYmVmb3JlRm46IGZ1bmN0aW9uIChvcmlGbiwgZm4sIGJyZWFrQ2hlY2spIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcmV0ID0gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIGlmKGJyZWFrQ2hlY2sgJiYgYnJlYWtDaGVjay5jYWxsKHRoaXMsIHJldCkpe1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgfVxuICAgICAgcmV0dXJuIG9yaUZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfVxuXG4sIGFmdGVyRm46IGZ1bmN0aW9uIChvcmlGbiwgZm4sIGJyZWFrQ2hlY2spIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcmV0ID0gb3JpRm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIGlmKGJyZWFrQ2hlY2sgJiYgYnJlYWtDaGVjay5jYWxsKHRoaXMsIHJldCkpe1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgfVxuICAgICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuICB9XG4gIFxuLCBwYXJzZUtleVBhdGg6IHBhcnNlS2V5UGF0aFxuXG4sIGRlZXBTZXQ6IGZ1bmN0aW9uIChrZXlTdHIsIHZhbHVlLCBvYmopIHtcbiAgICBpZihrZXlTdHIpe1xuICAgICAgdmFyIGNoYWluID0gcGFyc2VLZXlQYXRoKGtleVN0cilcbiAgICAgICAgLCBjdXIgPSBvYmpcbiAgICAgICAgO1xuICAgICAgY2hhaW4uZm9yRWFjaChmdW5jdGlvbihrZXksIGkpIHtcbiAgICAgICAgaWYoaSA9PT0gY2hhaW4ubGVuZ3RoIC0gMSl7XG4gICAgICAgICAgY3VyW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgaWYoY3VyICYmIGN1ci5oYXNPd25Qcm9wZXJ0eShrZXkpKXtcbiAgICAgICAgICAgIGN1ciA9IGN1cltrZXldO1xuICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgY3VyW2tleV0gPSB7fTtcbiAgICAgICAgICAgIGN1ciA9IGN1cltrZXldO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfWVsc2V7XG4gICAgICBleHRlbmQob2JqLCB2YWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH1cbiwgZGVlcEdldDogZnVuY3Rpb24gKGtleVN0ciwgb2JqKSB7XG4gICAgdmFyIGNoYWluLCBjdXIgPSBvYmosIGtleTtcbiAgICBpZihrZXlTdHIpe1xuICAgICAgY2hhaW4gPSBwYXJzZUtleVBhdGgoa2V5U3RyKTtcbiAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSBjaGFpbi5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAga2V5ID0gY2hhaW5baV07XG4gICAgICAgIGlmKGN1ciAmJiBjdXIuaGFzT3duUHJvcGVydHkoa2V5KSl7XG4gICAgICAgICAgY3VyID0gY3VyW2tleV07XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY3VyO1xuICB9XG4sIGV4dGVuZDogZXh0ZW5kXG4sIGNyZWF0ZTogY3JlYXRlXG4sIHRwbFBhcnNlOiB0cGxQYXJzZVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB1dGlsczsiXX0=
(1)
});
