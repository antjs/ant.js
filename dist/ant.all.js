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
  Array.prototype.indexOf = function (searchElement /*, fromIndex */ ) {
    'use strict';
    if (this == null) {
      throw new TypeError();
    }
    var n, k, t = Object(this),
        len = t.length >>> 0;

    if (len === 0) {
      return -1;
    }
    n = 0;
    if (arguments.length > 1) {
      n = Number(arguments[1]);
      if (n != n) { // shortcut for verifying if it's NaN
        n = 0;
      } else if (n != 0 && n != Infinity && n != -Infinity) {
        n = (n > 0 || -1) * Math.floor(Math.abs(n));
      }
    }
    if (n >= len) {
      return -1;
    }
    for (k = n >= 0 ? n : Math.max(len - Math.abs(n), 0); k < len; k++) {
      if (k in t && t[k] === searchElement) {
        return k;
      }
    }
    return -1;
  };
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
    root.Ant = Ant;
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
      if('function' === typeof handler){
        for(var i = 0; i < handlers[name].length; i++) {
          if(handlers[name][i].handler === handler){
            handlers[name].splice(i, 1);
            i--;
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

//将多个对象的属性深度并入一个对象中
function extend(obj) {
  var length = arguments.length, opts, src, copy, clone;
  obj = obj || {};
  for(var i = 1; i < length; i++) {
    if((opts = arguments[i]) !== null) {
      //数组不使用 `for in`?
      for(var key in opts) {
        src = obj[key];
        copy = opts[key];
        if(obj === copy || key === '__ant__'){ continue; }
        if(isPlainObject(copy) || Array.isArray(copy)){
          if(Array.isArray(copy)){
            clone = src && Array.isArray(src) ? src : [];
          }else{
            clone = src || {};
          }
          obj[key] = extend(clone, copy);
        }else{
          obj[key] = copy;
        }
      }
    }
  }
  return obj;
}

var Class = {
  /** 
   * 构造函数继承. 
   * 如: `var Car = Ant.extend({drive: function(){}}); new Car();`
   * @param {Object} protoProps 子构造函数的扩展原型对象
   * @param {Object} [staticProps] 子构造函数的扩展静态属性
   * @return {Function} 子构造函数
   */
  extend: function (protoProps, staticProps) {
    var sup = this;
    var sub = function(){ return sup.apply(this, arguments); };
    var Fn = function() { this.constructor = sub; };
    
    Fn.prototype = sup.prototype;
    sub.prototype = new Fn();
    extend(sub.prototype, protoProps);
    extend(sub, sup, staticProps);
    
    return sub;
  }
};

var prefix, IF, REPEAT, MODEL;

function setPrefix(newPrefix) {
  if(newPrefix){
    prefix = newPrefix;
    IF = prefix + 'if';
    REPEAT = prefix + 'repeat';
    MODEL = prefix + 'model';
  }
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
    
    this.partials = null;
    
    for(var event in events) {
      this.on(event, events[event]);
    }
    
    buildViewModel(this);
    
    //这里需要合并可能存在的 this.data
    //表单控件可能会有默认值, `buildViewModel` 后会默认值会并入 `this.data` 中
    data = extend(this.data, data);
    
    if(opts.data){
      this.render(data);
    }
    this.init.apply(this, arguments);
  }
  
  extend(Ant, Class, {
    setPrefix: setPrefix
  , Event: Event
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
      callRender(vm, data, isExtend);
      this.trigger('update', attrs);
      return this;
    }
    /**
     * ### ant.render
     * 渲染模板
     */
  , render: function(data) {
      this.set(data, {isExtend: false, silence: true});
      callRender(this.vm, this.data, false);
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
      return new this.constructor(this.tpl, extend(this.options, opts));
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
      
      if(!key){ return this; }
      
      if(isObject(key)){
        changed = true;
        opt = val;
        opt = opt || {};
        if(opt.isExtend !== false){
          isExtend = true;
          extend(this.data, key);
        }else{
          isExtend = false;
          this.data = extend({}, key);
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
              parent = this.data;
              path = key;
            }
            parent[path] = isObject(val) ? extend(Array.isArray(val) ? [] : {}, val) : val;
            isExtend = false;
          }else{
            extend(this.data, deepSet(key, val, {}));
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
     * @param {HTMLElement} [info.node] 子模板的目标节点
     * @param {Boolean} [info.escape] 是否转义字符串子模板
     * @param {String} [info.path] 指定子模板中变量在数据中的作用域
     */
  , setPartial: function(info) {
      if(!info){ return; }
      this.partials = this.partials || {};
      
      info = extend({}, this.partials[info.name], info);
      
      var els, _els, vm
        , name = info.name
        , node = info.node
        , pn = node && node.parentNode
        , partial = info.content
        ;
      if(name){
        this.partials[name] = info;
      }
      if(partial) {
        vm = this.vm.$$getChild(info.path);
        if(info.escape && !isObject(partial)){
          els = [doc.createTextNode(partial)];
          pn && pn.insertBefore(els[0], node);
          travelEl(els[0], vm);
        }else{
          _els = tplParse(partial, 'div').el.childNodes;
          els = [];
          for(var i = 0, l = _els.length; i < l; i++){
            els.push(_els[i]);
          }
          for(var i = 0, l = els.length; i < l; i++){
            pn && pn.insertBefore(els[i], node);
          }
          travelEls(els, vm);
        }
        this.isRendered && vm.$$render(deepGet(info.path, this.data));
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
  
  function callRender(vm, data, renderType) {
    vm.$$render(data, renderType);
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
      vm.$$updateVM(el, el.parentNode);
      return;
    }
    var r = el.getAttribute(REPEAT)
      , i = el.getAttribute(IF)
      , m = el.getAttribute(MODEL)
      
      , flag, next
      ;
    
  
    if(r){
      vm.$$getChild(r).$$addGenerator(el, vm, Generator.TYPE_REPEAT);
      flag = true;
    }else if(i){
      i = i.replace(invertedReg, '');
      vm.$$getChild(i).$$addGenerator(el, vm, Generator.TYPE_IF);
      flag = true;
    }else if(m){
      view2Model(el, m, vm);
    }
    
    if(!flag){
      for(var i = 0, l = el.attributes.length; i < l; i++){
        vm.$$updateVM(el.attributes[i], el);
      }
      for(var child = el.firstChild; child; ){
        next = child.nextSibling;
        travelEl(child, vm);
        child = next;
      }
    }
    
  }
  
  var isIE = !!doc.attachEvent;
  
  //双向绑定
  function view2Model(el, keyPath, vm) {
    keyPath = keyPath.trim();
    var ant = vm.$$root.$$ant
      , cur = vm.$$getChild(keyPath)
      , ev = 'change'
      , attr, value = attr = 'value'
      , isSetDefaut = isUndefined(ant.get(cur.$$getKeyPath()))//界面的初始值不会覆盖 model 的初始值
      , crlf = /\r\n/g//IE 8 下 textarea 会自动将 \n 换行符换成 \r\n. 需要将其替换回来
      , watcher = function() {
          //执行这里的时候, 很可能 render 还未执行. vm.$$getData(keyPath) 未定义, 不能返回新设置的值
          var newVal = this.$$data || vm.$$getData(keyPath) || ''
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
            watcher = function() {
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
          watcher = function(){
            var vals = vm.$$getData(keyPath);
            for(var i = 0, l = el.options.length; i < l; i++){
              el.options[i].selected = vals && vals.indexOf(el.options[i].value) !== -1;
            }
          };
        }
        isSetDefaut = isSetDefaut && !isToken(el[value]);
      break;
    }
    
    cur.$$watchers.push(watcher);
    
    ev.split(/\s+/g).forEach(function(e){
      removeEvent(el, e, handler);
      addEvent(el, e, handler);
    });
    
    el.removeAttribute(MODEL);
    
    //根据表单元素的初始化默认值设置对应 model 的值
    if(el[value] && isSetDefaut){
       handler(); 
    }
  }
  
  function ViewModel() {
    this.$$path = '';
    this.$$watchers = [];
    this.$$conditioners = [];
    this.$$repeaters = [];
  }
  
  ViewModel.prototype = {
    //新加示例属性应该都要在 prototype 中定义一次, 以便于区分自带属性和数据属性
    $$watchers: null
  , $$root: null
  , $$parent: null
  , $$conditioners: null
  , $$repeaters: null
  , $$ant: null
  , $$data: null
  , $$path: null
    
  , $$updateVM: function(node, el) {
      if(isToken(node.nodeValue) || isToken(node.nodeName)){
        this.$$addWatcher(node, el);
      }
    }
  
  //获取子 vm, 不存在的话将新建一个.
  , $$getChild: function(path) {
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
    
  , $$addWatcher: function(node, el) {
      var tokenMap = parseTokens(node, el)
        , tokens = tokenMap.tokens
        , textMap = tokenMap.textMap
        , that = this
        ;
      
       //分割文本节点
      if(tokenMap.type === 'text' && textMap.length > 1){
        textMap.forEach(function(text) {
          var tn = doc.createTextNode(text);
          el.insertBefore(tn, node);
          that.$$updateVM(tn, el);
        });
        el.removeChild(node);
      }else{
        tokens.forEach(function(token){
          addBinding(tokenMap, that, token);
        });
      }
    }
  , $$addGenerator: function(el, relativeScope, type) {
      var generator = new Generator(el, this, relativeScope, type);
      (type === Generator.TYPE_IF ? this.$$conditioners : this.$$repeaters).push(generator);
      return generator;
    }
  
  //获取对象的某个值, 没有的话查找父节点, 直到顶层.
  , $$getData: function(key, isStrict) {
      var curVal = deepGet(key, this.$$data);
      if(isStrict || !this.$$parent || !isUndefined(curVal)){
        return curVal;
      }else{
        return this.$$parent.$$getData(key);
      }
    }
  , $$render: function (data, isExtend) {
      var vm = this
        , childVM, map
        ;
      
      if(isExtend){
        vm.$$data = isObject(vm.$$data) ? extend(vm.$$data, data) : data;
        map = data;
      }else{
        vm.$$data = data;
        map = this;
      }
      
      if(Array.isArray(data)){
        data.__ant__ = vm;
        if(data.push !== arrayMethods.push){
          extend(data, arrayMethods);
        }
      }
      
      this.$$conditioners.forEach(function(cond){ cond.generate() });
      
      this.$$repeaters.forEach(function(repeater){
        if(repeater.state === 0 || !isExtend){
          repeater.generate();
        }
      });
      
      for(var i = 0, l = this.$$watchers.length; i < l; i++){
        this.$$watchers[i].call(this);
      }
        
      if(isObject(map)){
        for(var path in map) {
          if(vm.hasOwnProperty(path) && (!(path in ViewModel.prototype))){
          //传入的数据键值不能和 vm 中的自带属性名相同.
          //所以不推荐使用 '$$' 作为 JSON 数据键值的开头.
            this[path].$$render(!data || isUndefined(data[path]) ? '' : data[path], isExtend);
          }
        }
      }
    }
  };
  
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
      , nodeName
      ;
    
    if(node.nodeType === 3){//文本节点
      type = 'text';
    }else if(node.nodeType === 2){//属性节点
      type = 'attr';
      nodeName = node.nodeName;
      if(nodeName.indexOf(prefix) === 0){
        nodeName = node.nodeName.slice(prefix.length);
      }
      if(isToken(nodeName)){
        text = nodeName;
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
      });
      
      //一个引用类型(数组)作为节点对象的文本图, 这样当某一个引用改变了一个值后, 其他引用取得的值都会同时更新
      textMap.push(val[0]);
      
      start = tokenReg.lastIndex;
    }
    
    if(text.length > start){
      textMap.push(text.slice(start, text.length));
    }
    
    return {
      tokens: tokens
    , textMap: textMap
    , node: node
    , type: type
    , attr: nodeName
    , el: el
    }
  }
  
  var addBinding = function (tokenMap, vm, token) {
    var childVm = token.path === '.' ? vm : vm.$$getChild(token.path);
    
    childVm.$$watchers.push(function() {
      var newVal = token.path === '.' ? childVm.$$data : vm.$$getData(token.path);
      updateDom(newVal, token, tokenMap);
    });
  }
  
  var invertedReg = /^\^/;
  
  //{{data: str}}
  addBinding = _beforeFn(addBinding, function(tokenMap, vm, token) {
    var tokenStr = token.path
      , pair = tokenStr.split(':')
      ;
      
    if(pair.length === 2){
      var path = pair[0].trim()
        , _path = path.replace(invertedReg, '')
        , value = pair[1].trim()
        ;
      vm.$$getChild(_path).$$watchers.push(function() {
        var val = vm.$$getData(_path);
        var newVal = (invertedReg.test(path) ? !val : val) ? value : '';
        updateDom(newVal, token, tokenMap);
      });
      return false;
    }
  });
  
  //局部模板. {{> anotherant}}
  var pertialReg = /^>\s*(?=.+)/
  addBinding = _beforeFn(addBinding, function(tokenMap, vm, token) {
    var pName, ant, opts, node;
    if(tokenMap.type === 'text' && pertialReg.test(token.path)){
      pName = token.path.replace(pertialReg, '');
      ant = vm.$$root.$$ant;
      opts = ant.options;
      node = doc.createTextNode('');
      tokenMap.el.insertBefore(node, tokenMap.node);
      tokenMap.el.removeChild(tokenMap.node);
      
      ant.setPartial({
        name: pName
      , content: opts && opts.partials && opts.partials[pName]
      , node: node
      , escape: token.escape
      , path: vm.$$getKeyPath()
      });
      return false;
    }
  });
  
  function updateDom(newVal, token, tokenMap) {
    var pos = token.position
      , node = tokenMap.node
      , el = tokenMap.el
      , type = tokenMap.type
      , textMap = tokenMap.textMap
      , attrName = tokenMap.attr
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
            tokenMap.attr = val;
          }else{
            setAttr(el, attrName, val);
          }
        }
      }
    }
  }
  
  //IE 浏览器很多属性通过 `setAttribute` 设置后无效. 
  //这些通过 `el[attr] = value` 设置的属性却能够通过 `removeAttribute` 清除.
  function setAttr(el, attr, val){
    try{
      if((attr in el) && isIE){
        if(attr === 'style' && el.style.setAttribute){
          el.style.setAttribute('cssText', val);
        }else{
          el[attr] = typeof el[attr] === 'boolean' ? true : val;
        }
      }else{
        el.setAttribute(attr, val);
      }
    }catch(e){}
  }
  
  
  function callRepeater(vmArray, method, args){
    var repeaters = vmArray.__ant__.$$repeaters;
    for(var i = 0, l = repeaters.length; i < l; i++){
      repeaters[i][method].apply(repeaters[i], args);
    }
  }
  var arrayMethods = {
    splice: afterFn([].splice, function() {
      callRepeater(this, 'splice', arguments);
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
  function Generator(el, vm, relativeVm, type){
    //文档参照节点. 
    var relateEl = doc.createTextNode('')
      , attr = type === Generator.TYPE_IF ? IF : REPEAT
      ;
      
    this.path = el.getAttribute(attr);
    
    el.removeAttribute(attr);
    
    if(attr === IF){
      //if 属性不用切换作用域
      travelEl(el, relativeVm);
    }
    
    this.el = el;
    this.vm = vm;
    this.relativeVm = relativeVm;
    this.type = type;
    
    this.relateEl = relateEl;
    
    this.els = [];
    
    this.state = this.STATE_READY;
    el.parentNode.insertBefore(relateEl, el);
    el.parentNode.removeChild(el);
  }
  
  extend(Generator, {
    TYPE_REPEAT: 'repeat'
  , TYPE_IF: 'if'
  , isGenTempl: function(el) {
      return el && el.hasAttributes && el.hasAttributes(REPEAT) || el.hasAttributes(IF);
    }
  });
  
  Generator.prototype = {
    STATE_READY: 0
  , STATE_GENEND: 1
  , generate: function() {
      var that = this
        , data = this.relativeVm.$$getData(this.path.replace(invertedReg, ''))
        ;
      if(that.type === Generator.TYPE_REPEAT){
        if(data && !Array.isArray(data)){
          console.warn('需要一个数组');
          return;
        }
        data && this.splice.apply(this, [0, this.els.length].concat(data));
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
      
      that.state = this.STATE_GENEND;
    }
    //精确控制 DOM 列表
  , splice: function(index, n/*, items...*/) {
      var els = this.els
        , args = [].slice.call(arguments)
        , items = args.slice(2), m = items.length
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
        }else{
          if(m || n){
            els[i][prefix + 'index'] = i - n + m;
            vm = this.vm[i - n + m] = this.vm[i];
            vm.$$path = i - n + m;
          }else{
            break;
          }
        }
      }
      
      //新增
      for(var j = 0; j < m; j++){
        el = this.el.cloneNode(true);
        delete this.vm[index + j];
        vm = this.vm.$$getChild(index + j)
        el[prefix + 'index'] = index + j;
        frag.appendChild(el);
        travelEl(el, vm);
        vm.$$render(items[j]);
        
        newEls.push(el);
      }
      if(newEls.length){
        pn.insertBefore(frag, els[index + n] || this.relateEl);
      }
      
      //清理
      for(var k = l - n + m; k < l; k++){
        delete this.vm[k];
      }
      
      args = args.slice(0, 2).concat(newEls);
      els.splice.apply(els, args);
      
      if(n !== m){
        this.vm.$$getChild('length').$$render(els.length);
      }
    }
  , reverse: function() {
      var vms = this.vm, vm
        , el = this.relateEl
        , frag = doc.createDocumentFragment()
        ;
      for(var i = 0, l = this.els.length; i < l; i++){
        if(i < 1/2){
          vm = vms[i];
          vms[i] = vms[l - i - 1];
          vms[i].$$path = i;
          vm.$$path = l - i - 1;
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
      this.generate()
    }
  }
  
  //---
  
  function noop(){}

  function isObject(val) {
    return typeof val === 'object' && val !== null;
  }
  
  function isUndefined(val) {
    return typeof val === 'undefined';
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
  
  //返回 false 终止
  function _beforeFn(oriFn, fn) {
    return beforeFn(oriFn, fn, function(ret) {
      return ret === false; 
    })
  }
  var keyPathReg = /(?:\.|\[)/g
    , bra = /\]/g
    ;
    
  function parseKeyPath(keyPath){
    return keyPath.replace(bra, '').split(keyPathReg);
  }
  function deepSet(keyStr, value, obj) {
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
        ;
      args.push(callback);
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
  var $root = $(window);

  //### url 路由控制
  var router = (function(Event) {
    var routes = {};
    var listener = function(e) {
      var hash = urlParse.queryParse(location.hash)
        , match, route
        , params = hash.params = []
        ;
      for(var routeName in routes) {
        route = routes[routeName]
        match = route.reg.exec(hash.path);
        if(match) {
          for(var i = 1, l = match.length; i < l; i++) {
            var key = route.keys[i - 1]
              , val = decodeURIComponent(match[i])
              ;
            if (key) {
              params[key.name] = val;
            } else {
              params.push(val);
            }
          }
          this.trigger(routeName, hash);
          //break;
        }
      }
    };
    
    var router = $.extend({}, Event, {
      on: function(path, callback) {
        if(!routes[path]){
          var keys = [];
          routes[path] = {reg: pathRegexp(path, keys, true, true), keys: keys};
        }
        Event.on.call(this, path, callback);
        return this;
      }
    , off: function(path) {
        Event.off.apply(this, arguments);
        
        if(!(this._handlers[path] && this._handlers[path].length)){
          delete routes[path];
        }
        return this;
      }
    , navigate: function(path, opts) {
        location.hash = path;
        return this;
      }
      /**
       * 设置 router 规则
       * @param {Object} routes router 规则
       */
    , route: function(routes) {
        for(var path in routes) {
          this.on(path, routes[path]);
        }
        return this;
      }
      /**
       * 开始监听 hash 变化
       * @param {Object} [routes] 初始化传入的 router 规则
       */
    , start: function(routes) {
        this.stop();
        var callback = listener.bind(this);
        $root.on('hashchange', callback);
        
        listener.guid = callback.guid;
        
        this.route(routes);
        
        $root.trigger('hashchange');
        return this;
      }
      /** 停止 router 监听 */
    , stop: function() {
        $root.off('hashchange', listener);
        return this;
      }
    });
    
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
   * @api private
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
     /**
      * url解析
      * @param {String} str url字符
      * @param {Boolean} flag 是否解析search和hash
      */
      var fn = function(str, flag){
        str = str || location.href;
        var reg = /(?:(\w+\:)\/\/)?([^\/]+)?(\/[^?#]*)?(\?[^#]*)?(#.*)?/,
          match = str.match(reg), ret = {},
          map = ['href', 'protocal', 'host', 'pathname', 'search', 'hash']
        ;
        for(var i = 0, l = map.length; i < l; i++){
          ret[map[i]] = match[i] || '';
        }
        ret.hostname = ret.host;
        ret.pathname = ret.pathname || '/';
        ret.paths = fn.pathParse(ret.pathname);
        if(flag){
          ret.searchobj = fn.queryParse(ret.search);
          ret.hashobj = fn.queryParse(ret.hash);
        }
        return ret;
      };
      fn.queryParse = (function(){
        var urlExp = /#?([^?]*)(\?.*)?$/;
        var hashParse = function(hash){
          var res = hash.match(urlExp), url = {}, a, o;
          url.path = res[1];
          url.search = res[2];
          url.paths = res[1] && fn.pathParse(res[1]);
          
          if(url.search){
            a = url.search.slice(1).split("&"), o={};
            for(var i=0; i<a.length; i++){
              var b= a[i].split("=");
              o[b[0]]=b[1];
            }
            url.searchObj = o;
          }
          return url;
        };
        return hashParse;
      })();
      fn.pathParse = function(path){
        return path.replace(/(^\/|\/$)/, '').split('/');
      };
      return fn;
    })();

    return router;
  })(Ant.Event);
  
  window.Ant = window.Ant.extend({}, {
    router: router
  });
})(this, jQuery);