//ES5 shim for Ant.js

if(!Array.prototype.forEach){
  Array.prototype.forEach = function(fn, scope) {
    for(var i = 0, len = this.length; i < len; ++i) {
      if (i in this) {
        fn.call(scope, this[i], i, this);
      }
    }
  };
}

if(!Array.isArray){
  Array.isArray = function(val) {//是否数组
    return ({}).toString.call(val) === '[object Array]'
  }
}

if(!String.prototype.trim) {
  String.prototype.trim = function() {
    return this.replace(/^\s+|\s+$/g,'');
  };
}

if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function (obj, start) {
    for (var i = (start || 0); i < this.length; i++) {
      if (this[i] === obj) {
        return i;
      }
    }
    return -1;
  }
}
;/***
 *          .o.                       .           o8o          
 *         .888.                    .o8           `"'          
 *        .8"888.     ooo. .oo.   .o888oo        oooo  .oooo.o 
 *       .8' `888.    `888P"Y88b    888          `888 d88(  "8 
 *      .88ooo8888.    888   888    888           888 `"Y88b.  
 *     .8'     `888.   888   888    888 . .o.     888 o.  )88b 
 *    o88o     o8888o o888o o888o   "888" Y8P     888 8""888P' 
 *                                                888          
 *                                            .o. 88P          
 *                                            `Y888P           
 */               

 
(function(Ant) {
  var root = this;
  if(typeof module === 'object' && module){
    var doc = root.document || require('jsdom').jsdom();
    module.exports = Ant(doc);//NodeJs
  }else{
    Ant = Ant(root.document);
    if(typeof define === 'function'){
      define(function() {
        return Ant;
      });
    }
    if(!root.Ant){
      root.Ant = Ant;
    }
  }
})(function(doc) {
"use strict";


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
      if(isFunction(handler)){
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

function extend(obj) {
  var length = arguments.length, opts, src, copy;
  obj = obj || {};
  for(var i = 1; i < length; i++) {
    if((opts = arguments[i]) !== null) {
      for(var key in opts) {
        obj[key] = opts[key]
      }
    }
  }
  return obj;
}

var Class = {
  /** 
   * 构造函数继承. 
   * 如: `var Car = Ant.extend({drive: function(){}}); new Car();`
   * @param {Object} [protoProps] 子构造函数的扩展原型对象
   * @param {Object} [staticProps] 子构造函数的扩展静态属性
   * @param {Function} [constructor] 子构造函数
   * @return {Function} 子构造函数
   */
  extend: function (protoProps, staticProps, constructor) {
    if(isFunction(staticProps)){
      constructor = staticProps;
      staticProps = {};
    }
    if(isFunction(protoProps)){
      constructor = protoProps;
      protoProps = {};
    }
    var sup = this;
    constructor = constructor || function(){ return sup.apply(this, arguments); };
    var Fn = function() { this.constructor = constructor; };
    
    Fn.prototype = sup.prototype;
    constructor.prototype = new Fn();
    extend(constructor.prototype, protoProps, {__super__: sup});
    extend(constructor, sup, staticProps);
    
    return constructor;
  }
};

var prefix, antAttr = {};

function setPrefix(newPrefix) {
  if(newPrefix){
    prefix = newPrefix;
    antAttr.IF = prefix + 'if';
    antAttr.REPEAT = prefix + 'repeat';
    antAttr.MODEL = prefix + 'model';
    Ant.PREFIX = prefix;
  }
}

function isAntAttr(attrName) {
  return attrName === antAttr.IF || attrName === antAttr.REPEAT || attrName === antAttr.MODEL;
}

setPrefix('a-');
  
  /**
   * # Ant
   * 基于 dom 的模板引擎. 支持数据绑定
   * @param {String | Object} tpl 模板应该是合法而且标准的 HTML 标签字符串或者直接是现有 DOM 树中的一个 element 对象.
   * @param {Object} [opts]
   * @param {Object} opts.data 渲染模板的数据. 该项如果为空, 稍后可以用 `tpl.render(model)` 来渲染生成 html.
   * @param {Boolean} opts.lazy 是否对 'input' 及 'textarea' 监听 `change` 事件, 而不是 `input` 事件
   * @param {Object} opts.events 
   * @param {Object} opts.partials
   * @param {String | HTMLELement} opts.el
   * @constructor
   */
  function Ant(tpl, opts) {
    opts = opts || {};
    var el
      , data = opts.data || {}
      , events = opts.events || {}
      , filters = opts.filters || {}
      ;
    
    el = tplParse(tpl, opts.el);
    tpl = el.tpl;
    el = el.el;
    
    //属性
    //----
    
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
    
    /**
     * ### ant.isLazy
     * 是否使用的是延时的 view -> model 同步方式.
     * @type {Boolean}
     */
    this.isLazy = !!opts.lazy;
    
    this.options = opts;
    
    //TODO
    this.bindings = (this.bindings || []).concat(opts.bindings || []);

    this._partials = {};
    this._filters = {};
    
    for(var event in events) {
      this.on(event, events[event]);
    }

    for(var filterName in filters){
      this.setFilter(filterName, filters[filterName]);
    }
    
    this.trigger('beforeInit');
    buildViewModel(this);
    this.trigger('build');
    
    //这里需要合并可能存在的 this.data
    //表单控件可能会有默认值, `buildViewModel` 后会默认值会并入 `this.data` 中
    data = extend(this.data, data);
    
    if(opts.data){
      this.render(data);
    }
    this.init.apply(this, arguments);
    this.trigger('afterInit');
  }
  
  extend(Ant, Class, {
    setPrefix: setPrefix
  , Event: Event
  , doc: doc
  });
  
  //方法
  //----
  extend(Ant.prototype, Event, {
    /**
     * ### ant.update
     * 更新模板. 
     * @param {Object} data 要更新的数据. 增量数据或全新的数据.
     * @param {String} [keyPath] 需要更新的数据路径.
     * @param {AnyType|Object} [data] 需要更新的数据. 省略的话将使用现有的数据.
     * @param {Boolean} [isExtend] 界面更新类型.
              为 true 时, 是扩展式更新, 原有的数据不变
              为 false 时, 为替换更新, 不在 data 中的变量, 将在 DOM 中被清空.
     */
    update: function(keyPath, data, isExtend) {
      var attrs, vm = this.vm;
      if(isObject(keyPath)){
        isExtend = data;
        attrs = data = keyPath;
      }else if(typeof keyPath === 'string'){
        keyPath = parseKeyPath(keyPath).join('.');
        if(isUndefined(data)){
          data = this.get(keyPath);
        }
        attrs = deepSet(keyPath, data, {});
        vm = vm.$$getChild(keyPath);
      }else{
        data = this.data;
      }
      
      if(isUndefined(isExtend)){ isExtend = isObject(keyPath); }
      vm.$$render(data, isExtend);
      this.trigger('update', attrs);
      return this;
    }
    /**
     * ### ant.render
     * 渲染模板
     */
  , render: function(data) {
      data && this.set(data, {isExtend: false, silence: true});
      this.vm.$$render(this.data, false);
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
      var options = modelExtend({}, this.options);
      if(opts && opts.data){ options.data = null; }
      return new this.constructor(this.tpl, modelExtend(options, opts));
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
          modelExtend(this.data, key, this.vm);
        }else{
          isExtend = false;
          this.data = modelExtend({}, key, this.vm);
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
            parent[path] = isObject(val) ? modelExtend(Array.isArray(val) ? [] : {}, val, this.vm.$$getChild(key, !Array.isArray(val))) : val;
            isExtend = false;
          }else{
            modelExtend(this.data, deepSet(key, val, {}), this.vm);
            isExtend = true;
          }
        }
      }
      changed && (!opt.silence) && (isObject(key) ? this.update(key, isExtend) : this.update(key, val, isExtend));
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
      
      partialInfo = extend({}, this._partials[partialInfo.name], partialInfo);
      
      var els, _els, vm
        , name = partialInfo.name
        , target = partialInfo.target
        , partial = partialInfo.content
        , path = partialInfo.path || ''
        ;
      if(name){
        this._partials[name] = partialInfo;
      }
      if(partial) {
        vm = this.vm.$$getChild(path);
        
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
        
        travelEls(els, vm);
        this.isRendered && vm.$$render(deepGet(path, this.data));
      }
      return this;
    }
    /**
     * 数据预处理.
     * @param {Object} data
     * @return {Object}
     */
  , parse: function(data) {
      return data;
    }
  , init: noop
  
    //TODO 
  , watch: function(keyPath, callback) {
      var that = this
        , vm = this.vm.$$getChild(keyPath)
        , watcher = new Watcher(vm, vm, {}, function(vals) {
            return vals[keyPath];
          })
      ;
      watcher.addKey(keyPath);
      watcher.callback = callback;
      watcher.update = function(newVal) {
        callback.call(that, newVal, that.val);
        that.val = newVal;
      };
      vm.$watchers.push(watcher);
    }
  , unwatch: function(keyPath, callback) {
    
    }
    
    
  , setFilter: function(name, filter) {
      this._filters[name] = filter;
    }
  , getFilter: function(name) {
      return this._filters[name]
    }
  , removeFilter: function(name) {
      delete this._filters[name];
    }
  });
  
  function tplParse(tpl, target) {
    var el;
    if(isObject(tpl)){
      if(target){
        el = target = isObject(target) ? target : doc.createElement(target);
        el.innerHTML = '';//清空目标对象
        target.appendChild(tpl);
      }else{
        el = tpl;
      }
      tpl = el.outerHTML;
    }else{
      el = isObject(target) ? target : doc.createElement(target || 'div');
      el.innerHTML = tpl;
    }
    return {el: el, tpl: tpl};
  }
  
  function buildViewModel(ant) {
    var vm = new ViewModel();
    vm.$$root = vm;
    vm.$$ant = ant;
    ant.vm = vm;
    travelEls(ant.el, vm);
  }
  
  function travelEls(els, vm) {
    if(els.nodeType && !els.length){
      travelEl(els, vm);
    }else{
      for(var i = 0, l = els.length; i < l; i++) {
        travelEl(els[i], vm);
      }
    }
  }
  
  //遍历元素及其子元素的所有属性节点及文本节点
  function travelEl(el, vm) {
    if(el.nodeType === 8){
      //注释节点
      return;
    }else if(el.nodeType === 3){
      //文本节点
      checkBinding(vm, el, el.parentNode);
      return;
    }
    
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
      , modelAttr = el.getAttributeNode(antAttr.MODEL)
      , attr, gen = repeatAttr || ifAttr
      ;
    
    if(gen){
      checkBinding(vm, gen, el);
      return true;
    }
    
    if(modelAttr){
      checkBinding(vm, modelAttr, el);
    }
    
    for(var i = el.attributes.length - 1; i >= 0; i--){
      attr = el.attributes[i];
      checkBinding(vm, attr, el);
      if(attr.nodeName.indexOf(prefix) === 0){
        el.removeAttribute(attr.nodeName);
      }
    }
  }
  
  function checkBinding(vm, node, el) {
    if(isToken(node.nodeValue) || isToken(node.nodeName)){
      var tokens = parseTokens(node, el)
        , textMap = tokens.textMap
        ;
      //如果绑定内容是在文本中, 则将其分割成单独的文本节点
      if(tokens.type === 'text' && textMap.length > 1){
        textMap.forEach(function(text) {
          var tn = doc.createTextNode(text);
          el.insertBefore(tn, node);
          checkBinding(vm, tn, el);
        });
        el.removeChild(node);
      }else{
        tokens.forEach(function(token){
          addWatcher(vm, token, tokens);
        });
      }
    }
  }
  
  var isIE = !!doc.attachEvent;
  
  function ViewModel() {
    this.$$path = '';
    this.$watchers = [];
  }
  
  ViewModel.prototype = {
    $$root: null
  , $$parent: null
  , $$ant: null
  , $$path: null
  
  , $watchers: null
    
  //获取子 vm, 不存在的话将新建一个.
  , $$getChild: function(path, strict) {
      var key, vm
        , cur = this
        , keyChain
        ;
        
      path = path + '';
      if(path){
        keyChain = path.split(/(?!^)\.(?!$)/);
        for(var i = 0, l = keyChain.length; i < l; i++){
          key = keyChain[i];
          
          if(!cur[key]){
            if(strict){ return null; }
            vm = new ViewModel();
            vm.$$parent = cur;
            vm.$$root = cur.$$root || cur;
            vm.$$path = key;
            cur[key] = vm;
          }
          
          cur = cur[key];
        }
      }
      return cur;
    }
    
  , $$getKeyPath: function() {
      var keyPath = this.$$path
        , cur = this
        ;
      while(cur = cur.$$parent){
        if(cur.$$path){
          keyPath = cur.$$path + '.' + keyPath;
        }else{
          break;
        }
      }
      return keyPath;
    }
  
  //获取对象的某个值, 没有的话查找父节点, 直到顶层.
  , $$getData: function(key, isStrict) {
      var curVal = deepGet(key, this.$$root.$$ant.get(this.$$getKeyPath()));
      if(isStrict || !this.$$parent || !isUndefined(curVal)){
        return curVal;
      }else{
        return this.$$parent.$$getData(key);
      }
    }
  , $$render: function (data, isExtend) {
      var map = isExtend ? data : this;
      
      for(var i = 0, l = this.$watchers.length; i < l; i++){
        this.$watchers[i].fn(isExtend);
      }
      
      if(isObject(map)){
        for(var path in map) {
          if(this.hasOwnProperty(path) && (!(path in ViewModel.prototype))){
          //传入的数据键值不能和 vm 中的自带属性名相同.
          //所以不推荐使用 '$$' 作为 JSON 数据键值的开头.
            this[path].$$render(data ? data[path] : void(0), isExtend);
          }
        }
      }
    }
  };
  
  //清空 vm 中某个元素及其子元素的 watcher, reperter, conditioner
  function clearWatchers(vm, el){
    var watchers = vm.$watchers
      , watcher
      ;
    
    if(!el){ return }
    
    for(var i = watchers.length - 1; i >= 0; i--){
      watcher = watchers[i];
      if(watcher.el && el.contains(watcher.el)){
        watchers.splice(i, 1);
      }
    }
    
    for(var key in vm){
      if(!(key in ViewModel.prototype)){
        clearWatchers(vm[key], el);
      }
    }
  }
  
  //data -> model -> viewModel
  //深度合并对象.
  function modelExtend(model, data, vm){
    var src, copy, clone;
    for(var key in data){
      src = model[key];
      copy = data[key];
      if(model === copy || key === '__ant__'){ continue; }
      if(isPlainObject(copy) || Array.isArray(copy)){
        if(Array.isArray(copy)){
          clone = src && Array.isArray(src) ? src : [];
        }else{
          clone = src || {};
        }
        model[key] = modelExtend(clone, copy, vm && vm.$$getChild(key));
      }else{
        model[key] = copy;
      }
    }
    
    if(vm){
      if(Array.isArray(model)){
        model.__ant__ = vm;
        if(model.push !== arrayMethods.push){
          modelExtend(model, arrayMethods)
        }
      }
    }
    return model;
  }
  
  var tokenReg = /{{({([^{}\n]+)}|[^{}\n]+)}}/g;
  
  //字符串中是否包含模板占位符标记
  function isToken(str) {
    tokenReg.lastIndex = 0;
    return str && tokenReg.test(str);
  }
  
  function parseTokens(node, el) {
    var tokens = []
      , val, type
      , textMap = []
      , start = 0
      , text = node.nodeValue
      , nodeName = node.nodeName
      ;
    
    if(node.nodeType === 3){//文本节点
      type = 'text';
    }else if(node.nodeType === 2){//属性节点
      type = 'attr';
      if(nodeName.indexOf(prefix) === 0 && !isAntAttr(nodeName)){
        nodeName = node.nodeName.slice(prefix.length);
      }
      if(isToken(nodeName)){
        text = nodeName;//属性名
      }
    }
    
    tokenReg.lastIndex = 0;
    
    while((val = tokenReg.exec(text))){
      if(tokenReg.lastIndex - start > val[0].length){
        textMap.push(text.slice(start, tokenReg.lastIndex - val[0].length));
      }
      
      tokens.push({
        escape: !val[2]
        //key.value
      , path: (val[2] || val[1]).trim()
      , position: textMap.length
      , el: el
      , node: node
      , nodeName: nodeName
      , type: type
      , textMap: textMap
      });
      
      //一个引用类型(数组)作为节点对象的文本图, 这样当某一个引用改变了一个值后, 其他引用取得的值都会同时更新
      textMap.push(val[0]);
      
      start = tokenReg.lastIndex;
    }
    
    if(text.length > start){
      textMap.push(text.slice(start, text.length));
    }
    
    tokens.type = type;
    tokens.textMap = textMap;
    
    return tokens;
  }
  
  
  function addWatcher(vm, token, tokens) {
    var binding = getBinding(vm.$$root.$$ant.bindings);
    var watcher = binding(vm, token);
    if(watcher){
      watcher.vm.$watchers.push(watcher);
    }
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
  
  var invertedReg = /^\^/;
  var pertialReg = /^>\s*(?=.+)/;
  var filterReg = /\s*\|(?!\|)\s*/;
  
  //core bindings
  var baseBindings = [
    //single keypath
    function (vm, token) {
      var childVm = token.path === '.' ? vm : vm.$$getChild(token.path);
      
      var watcher = new Watcher(childVm, vm, token, function(vals) {
        return vals[token.path];
      });
      watcher.addKey(token.path);
      return watcher;
    }
    
    // {{data: str}}
  , function(vm, token) {
      var tokenStr = token.path
        , pair = tokenStr.split(':')
        ;
        
      if(pair.length === 2){
        var path = pair[0].trim()
          , _path = path.replace(invertedReg, '')
          , value = pair[1].trim()
          , watcher = new Watcher(vm.$$getChild(_path), vm, token, function(vals) {
              var val = vals[_path];
              return (invertedReg.test(path) ? !val : val) ? value : '';
            })
          ;
        watcher.addKey(_path);
        return watcher;
      }
    }
    //filter. {{path | filter0 | filter1}}
  , function(vm, token){
      var path = token.path
        , filters  = path.split(/\s*\|(?!\|)\s*/)
        , ant = vm.$$root.$$ant
        , watcher, childVm
        ;
      
      if(filters.length > 1){
        path = filters.shift();
        childVm = path === '.' ? vm : vm.$$getChild(path);
        watcher = new Watcher(childVm, vm, token, function(vals){
          var val = vals[path]
            
          for(var i = 0, l = filters.length; i < l; i++){
            val = ant._filters[filters[i]].call(ant, val);
          }
          return val;
        })
        
        watcher.addKey(path);
        return watcher;
      }
    }
    
    //局部模板. {{> anotherant}}
  , function(vm, token) {
      var pName, ant, opts, node;
      if(token.type === 'text' && pertialReg.test(token.path)){
        pName = token.path.replace(pertialReg, '');
        ant = vm.$$root.$$ant;
        opts = ant.options;
        node = doc.createTextNode('');
        token.el.insertBefore(node, token.node);
        token.el.removeChild(token.node);
        
        ant.setPartial({
          name: pName
        , content: opts && opts.partials && opts.partials[pName]
        , target: function(el) { token.el.insertBefore(el, node) }
        , escape: token.escape
        , path: vm.$$getKeyPath()
        });
        return false;
      }
    }
    
    //if / repeat
  , function(vm, token) {
      var nodeName = token.nodeName
        , path = token.path
        , child
        ;
        
      switch(nodeName){
        case antAttr.IF:
          path = path.replace(invertedReg, '');
        case antAttr.REPEAT:
          child = vm.$$getChild(path);
          var watcher = new Generator(child, vm, token, function(vals) {
            return vals[path];
          });
          
          watcher.addKey(path);
          return watcher;
          break;
      }
    }
    
    //model 双向绑定
  , function (vm, token) {
      var keyPath = token.path
        , el = token.el
        ;
      
      if(token.nodeName === antAttr.MODEL){
      
        if(!keyPath){ return false; }
        
        var ant = vm.$$root.$$ant
          , cur = keyPath === '.' ? vm : vm.$$getChild(keyPath)
          , ev = 'change'
          , attr, value = attr = 'value'
          , isSetDefaut = isUndefined(ant.get(cur.$$getKeyPath()))//界面的初始值不会覆盖 model 的初始值
          , crlf = /\r\n/g//IE 8 下 textarea 会自动将 \n 换行符换成 \r\n. 需要将其替换回来
          , update = function(val) {
              //执行这里的时候, 很可能 render 还未执行. vm.$$getData(keyPath) 未定义, 不能返回新设置的值
              var newVal = val || vm.$$getData(keyPath) || ''
                , val = el[attr]
                ;
              val && val.replace && (val = val.replace(crlf, '\n'));
              if(newVal !== val){ el[attr] = newVal; }
            }
          , handler = function() {
              var val = el[value];
              
              val.replace && (val = val.replace(crlf, '\n'));
              ant.set(cur.$$getKeyPath(), val);
            }
          ;
        
        switch(el.tagName) {
          default:
            value = attr = 'innerHTML';
            ev += ' blur';
          case 'INPUT':
          case 'TEXTAREA':
            switch(el.type) {
              case 'checkbox':
                value = attr = 'checked';
                //IE6, IE7 下监听 propertychange 会挂?
                if(isIE) { ev += ' click'; }
              break;
              case 'radio':
                attr = 'checked';
                if(isIE) { ev += ' click'; }
                update = function() {
                  el.checked = el.value === vm.$$getData(keyPath);
                };
                isSetDefaut = el.checked;
              break;
              default:
                if(!ant.isLazy){
                  if('oninput' in el){
                    ev += ' input';
                  }
                  //IE 下的 input 事件替代
                  if(isIE) {
                    ev += ' keyup propertychange cut';
                  }
                }
              break;
            }
          break;
          case 'SELECT':
            if(el.multiple){
              handler = function() {
                var vals = [];
                for(var i = 0, l = el.options.length; i < l; i++){
                  if(el.options[i].selected){ vals.push(el.options[i].value) }
                }
                ant.set(cur.$$getKeyPath(), vals);
              };
              update = function(){
                var vals = vm.$$getData(keyPath);
                if(vals && vals.length){
                  for(var i = 0, l = el.options.length; i < l; i++){
                    el.options[i].selected = vals.indexOf(el.options[i].value) !== -1;
                  }
                }
              };
            }
            isSetDefaut = isSetDefaut && !isToken(el[value]);
          break;
        }
        
        ev.split(/\s+/g).forEach(function(e){
          removeEvent(el, e, handler);
          addEvent(el, e, handler);
        });
        
        el.removeAttribute(antAttr.MODEL);
        
        var watcher = new Watcher(vm, cur, token, function(vals) {
          return vals[keyPath];
        });
        watcher.update = update;
        watcher.addKey(keyPath);
        
        //根据表单元素的初始化默认值设置对应 model 的值
        if(el[value] && isSetDefaut){
           handler(); 
        }
        
        return watcher;
      }
    }
  ];
  
  function Watcher(vm, relativeVm, token, fn) {
    this.token = token;
    this.relativeVm = relativeVm;
    this.vm = vm;
    this.val = null;
    this.fn = function(isExtend) {
      var vals = {}, key;
      for(var i = 0, l = this.keys.length; i < l; i++){
        key = this.keys[i];
        vals[key] = relativeVm.$$getData(key === '.' ? '' : key);
      }
      var newVal = fn(vals);
      if(newVal !== this.val){
        try{
          this.update(newVal, isExtend);
          this.val = newVal;
        }catch(e){
          console.warn(e);
        }
      }
      this.state = Watcher.STATE_CALLED;
    };
    this.keys = [];
    this.el = token.el;
    this.state = Watcher.STATE_READY
  }
  
  extend(Watcher, {
    STATE_READY: 0
  , STATE_CALLED: 1
  }, Class);
  
  extend(Watcher.prototype, {
    addKey: function(key) {
      this.keys.push(key);
    }
  , update: function(newVal) {
      var token = this.token
        , pos = token.position
        , node = token.node
        , el = token.el
        , type = token.type
        , textMap = token.textMap
        , attrName = token.nodeName
        , isAttrNameTpl = isToken(node.nodeName)
        , val
        ;
      if(newVal + '' !== textMap[pos] + '') {
        
        //模板内容被外部程序修改
        if((isAttrNameTpl ? attrName : node.nodeValue) !== textMap.join('') && token.escape) {
          //什么都不做?
          console.warn('模板内容被修改!');
          return;
        }

        textMap[pos] = newVal && (newVal + '');
        val = textMap.join('');
        
        if(!token.escape && type === 'text') {
          //没有转义的 HTML 代码
          var div = doc.createElement('div')
            , nodes
            ;
          
          token.unescapeNodes = token.unescapeNodes || [];
          
          div.innerHTML = val;
          nodes = div.childNodes;
          
          token.unescapeNodes.forEach(function(_node) {
            _node.parentNode && _node.parentNode.removeChild(_node);
          });
          token.unescapeNodes = [];
          for(var i = 0, l = nodes.length; i < l; i++){
            token.unescapeNodes.push(nodes[i]);
            node.parentNode.insertBefore(nodes[i], node);
            i--;
            l--;
          }
          
          node.nodeValue = '';
        }else{
          if(!isAttrNameTpl){
            node.nodeValue = val;
          }
          if(type !== 'text'){
            if(isAttrNameTpl){
              if(attrName){
                el.removeAttribute(attrName)
              }
              val && setAttr(el, val, node.nodeValue);
              token.nodeName = val;
            }else{
              setAttr(el, attrName, val);
            }
          }
        }
      }
    }
  });
  
  //IE 浏览器很多属性通过 `setAttribute` 设置后无效. 
  //这些通过 `el[attr] = value` 设置的属性却能够通过 `removeAttribute` 清除.
  function setAttr(el, attr, val){
    try{
      if(((attr in el) || attr === 'class')&& isIE){
        if(attr === 'style' && el.style.setAttribute){
          el.style.setAttribute('cssText', val);
        }else if(attr === 'class'){
          el.className = val;
        }else{
          el[attr] = typeof el[attr] === 'boolean' ? true : val;
        }
      }else{
        el.setAttribute(attr, val);
      }
    }catch(e){}
  }
  
  
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
    vmArray.__ant__.$$root.$$ant.trigger('update');
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
      update: function(data, isExtend) {
        var that = this
          , data = this.relativeVm.$$getData(this.path.replace(invertedReg, ''))
          ;
        if(that.type === antAttr.REPEAT){
          if(data && !Array.isArray(data)){
            console.warn('需要一个数组');
            return;
          }
          if(this.state === 0 || !isExtend){
            data && this.splice([0, this.els.length].concat(data));
          }
        }else{
          if(invertedReg.test(this.path)){ data = !data; }
          if(data) {
            if(!that.lastIfState) {
              that.relateEl.parentNode.insertBefore(that.el, that.relateEl);
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
          , pn = this.relateEl.parentNode
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
              var j = i - (n - m);
              els[i][prefix + 'index'] = j;
              if(!noFixVm){
                vm = this.vm[j] = this.vm[i];
                vm.$$path = j + '';
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
          vm = this.vm.$$getChild(index + j)
          //clearWatchers(vm, els[index + j]);
          el[prefix + 'index'] = index + j;
          frag.appendChild(el);
          travelEl(el, vm);
          vm.$$render(items[j]);
          
          newEls.push(el);
          if(arr && isObject(arr[index + j])){
            arr[index + j] = modelExtend(Array.isArray(arr[index + j]) ? []: {}, arr[index + j], vm);
          }
        }
        if(newEls.length){
          pn.insertBefore(frag, els[index + n] || this.relateEl);
        }
        
        //需要清除缩短后多出的部分
        if(!noFixVm){
          for(var k = l - n + m; k < l; k++){
            delete this.vm[k];
          }
        }
        
        args = args.slice(0, 2).concat(newEls);
        els.splice.apply(els, args);
        
        if(n !== m){
          this.vm.$$getChild('length').$$render(els.length);
        }
      }
    , reverse: function(args, arr, noFixVm) {
        var vms = this.vm, vm
          , el = this.relateEl
          , frag = doc.createDocumentFragment()
          ;
        for(var i = 0, l = this.els.length; i < l; i++){
          if((!noFixVm) && i < 1/2){
            vm = vms[i];
            vms[i] = vms[l - i - 1];
            vms[i].$$path = i + '';
            vm.$$path = l - i - 1 + '';
            vms[l - i - 1] = vm;
          }
          this.els[i][prefix + 'index'] = l - i - 1;
          frag.appendChild(this.els[l - i - 1]);
        }
        el.parentNode.insertBefore(frag, el);
        this.els.reverse();
      }
    , sort: function(fn){
        //TODO 进行精确高还原的排序?
        this.update()
      }
    }
  , function (vm, relativeVm, token){
      //文档参照节点. 
      var relateEl = doc.createTextNode('')
        , el = token.el
        , type = token.nodeName
        ;
        
      this.__super__.apply(this, arguments);
      
      this.path = token.path;
      
      el.removeAttribute(type);
      
      this.type = type;
      
      this.relateEl = relateEl;
      
      this.els = [];
      
      if(type === antAttr.IF){
        //if 属性不用切换作用域
        travelEl(this.el, relativeVm);
      }
      
      el.parentNode.insertBefore(relateEl, el);
      el.parentNode.removeChild(el);
    }
  )
  
  //---
  
  function noop(){}

  function isObject(val) {
    return typeof val === 'object' && val !== null;
  }
  
  function isUndefined(val) {
    return typeof val === 'undefined';
  }
  
  function isFunction(val){
    return typeof val === 'function';
  }
  
  //简单对象的简易判断
  function isPlainObject(o){
    if (!o || ({}).toString.call(o) !== '[object Object]' || o.nodeType || o === o.window) {
      return false;
    }else{
      return true;
    }
  }
  
  //函数切面
  //前面的函数返回值传入 breakCheck 判断, breakCheck 返回值为真时不执行后面的函数
  function beforeFn(oriFn, fn, breakCheck) {
    return function() {
      var ret = fn.apply(this, arguments);
      if(breakCheck && breakCheck.call(this, ret)){
        return ret;
      }
      return oriFn.apply(this, arguments);
    };
  }

  function afterFn(oriFn, fn, breakCheck) {
    return function() {
      var ret = oriFn.apply(this, arguments);
      if(breakCheck && breakCheck.call(this, ret)){
        return ret;
      }
      fn.apply(this, arguments);
      return ret;
    }
  }
  
  var keyPathReg = /(?:\.|\[)/g
    , bra = /\]/g
    ;
    
  function parseKeyPath(keyPath){
    return keyPath.replace(bra, '').split(keyPathReg);
  }
  function deepSet(keyStr, value, obj) {
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
  function deepGet(keyStr, obj) {
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
  
  //节点是否在当前 document 中
  // function inDocument(el) {
    // if(doc.contains){
      // return doc.contains(el)
    // }else{
      // while(el = el.parentNode){
        // if(el === doc){
          // return true;
        // }
      // }
      // return false;
    // }
  // }
  
  return Ant;
});
;
if (!Function.prototype.bind) {
  Function.prototype.bind = function (oThis) {
    if (typeof this !== "function") {
      // closest thing possible to the ECMAScript 5 internal IsCallable function
      throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
    }

    var aArgs = Array.prototype.slice.call(arguments, 1), 
        fToBind = this, 
        fNOP = function () {},
        fBound = function () {
          return fToBind.apply(this instanceof fNOP && oThis
                                 ? this
                                 : oThis,
                               aArgs.concat(Array.prototype.slice.call(arguments)));
        };

    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();

    return fBound;
  };
}

/**
 * 让 Ant.js 支持事件委托. 
 */
(function(window, $, undefined){
  window.Ant = window.Ant.extend({
    //ajax
    on: function(name, handler) {
      handler = handler || function() {};
      var callback = handler.bind(this)
        , args = name.trim().split(/\s+/)
        , ev = args.shift()
        ;
      args = [ev, args.join(''), callback];
      $(this.el).on.apply($(this.el), args);
      //jQuery 的事件监听函数是用 guid 标定的. 这样 `controller.off(handler)` 就可以起作用了
      handler.guid = callback.guid;
      return this;
    }
  , trigger: function(name, data, onlyHandlers) {
      if(name === 'render' || name === 'update'){
        //这两个模板更新事件不冒泡
        onlyHandlers = true;
      }
      $.event.trigger(name, data, this.el, onlyHandlers);
      return this;
    }
  , off: function(name, handler) {
      var args = name.trim().split(/\s+/);
      args.push(handler);
      
      $(this.el).off.apply($(this.el), args);
      return this;
    }
  });
})(this, jQuery);;(function(window, $, undefined){
  "use strict";
  var $root = $(window);

  //### url 路由控制
  var router = function() {
    
    var router = {
      /**
       * routes 集合.
       */
      routes: []
      /**
       * 设置 router 规则
       * @param {String | RegExp} path rule
       * @param {Function} handler
       */
    , route: function(path, handler) {
        var keys = [];
        this.routes.push({
          path: path//path rule
        , handler: handler
        , reg: pathRegexp(path, keys, true, true)
        , keys: keys
        });
        return this;
      }
    , navigate: function(path, opts) {
        opts = opts || {};
        //TODO silence
        if(opts.replace){
          location.replace('#' + path);
        }else{
          location.hash = path;
        }
        return this;
      }
      /**
       * 开始监听 hash 变化
       */
    , start: function() {
        this.stop();
        $root.on('hashchange', listener);
        $root.trigger('hashchange');
        return this;
      }
      /** 停止 router 监听 */
    , stop: function() {
        $root.off('hashchange', listener);
        return this;
      }
    };
        
    var listener = function(e) {
      var hashInfo = urlParse(location.hash.slice(1), true)
        ;
        
      (function next(index){
        var route = router.routes[index]
          , params, match
          ;
        if(route){
          match = route.reg.exec(hashInfo.pathname);
          if(match) {
            params = hashInfo.params = match.length - 1 === route.keys.length ? {} : [];
            for(var i = 1, l = match.length; i < l; i++) {
              var key = route.keys[i - 1]
                , val
                ;
              try{
                val = match[i] && decodeURIComponent(match[i]);
              }catch(e){
                val = match[i];
              }
              if (key) {
                params[key.name] = val;
              } else {
                params.push(val);
              }
            }
            
            route.handler.call(router, hashInfo, function (){
              next(++index);
            });
          }else {
            next(++index);
          }
        }
      })(0);
    };
    
    /**
   * Normalize the given path string,
   * returning a regular expression.
   *
   * An empty array should be passed,
   * which will contain the placeholder
   * key names. For example "/user/:id" will
   * then contain ["id"].
   *
   * @param  {String|RegExp|Array} path
   * @param  {Array} keys
   * @param  {Boolean} sensitive
   * @param  {Boolean} strict
   * @return {RegExp}
   */
    var pathRegexp = function(path, keys, sensitive, strict) {
      if (({}).toString.call(path) == '[object RegExp]') return path;
      if (Array.isArray(path)) path = '(' + path.join('|') + ')';
      path = path
        .concat(strict ? '' : '/?')
        .replace(/\/\(/g, '(?:/')
        .replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?(\*)?/g, function(_, slash, format, key, capture, optional, star){
          keys.push({ name: key, optional: !! optional });
          slash = slash || '';
          return (optional ? '' : slash) +
            '(?:' +
            (optional ? slash : '') + 
            (format || '') + (capture || (format && '([^/.]+?)' || '([^/]+?)')) + ')' + 
            (optional || '') + 
            (star ? '(/*)?' : '');
        })
        .replace(/([\/.])/g, '\\$1')
        .replace(/\*/g, '(.*)');
      return new RegExp('^' + path + '$', sensitive ? '' : 'i');
    }
    
    var urlParse = (function() {
      var reg = /^(?:(\w+\:)\/\/([^\/]+)?)?((\/?[^?#]*)(\?[^#]*)?(#.*)?)$/
        , map = ['href', 'protocal', 'host', 'path', 'pathname', 'search', 'hash']
        ;
        
     /**
      * url解析
      * @param {String} str url. 
      * @param {Boolean} isParseQuery
      * @return {Object}
      */
      var fn = function(str, isParseQuery){
        str = typeof str === 'string' ? str : location.href;
        var match = str.match(reg)
          , ret = {query: isParseQuery ? {} : null}, query
          ;
        
        for(var i = 0, l = map.length; i < l; i++){
          ret[map[i]] = typeof match[i] === 'undefined' ? null : match[i];
        }
        ret.hostname = ret.host;
        
        if(ret.search !== null){
          query = ret.search.slice(1);
          ret.query = isParseQuery ? fn.queryParse(query) : query;
        }
        
        return ret;
      };
      
      fn.queryParse = function(queryStr) {
        var query = {}
          , queries, q
          ;
        
        queryStr = queryStr || '';
        queries = queryStr.split("&");
        
        for(var i = 0; i < queries.length; i++){
          q = queries[i].split("=");
          query[q[0]] = q[1];
        }
        return query;
      };
      
      return fn;
    })();

    return router;
  }();
  
  window.Ant = window.Ant.extend({}, {
    router: router
  });
})(this, jQuery);