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
};/***
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

(function(window, Ant) {
  if(typeof module === 'object' && module){
    var jsdom = require('jsdom')
      , doc = jsdom.jsdom()
      ;
    module.exports = Ant(doc);//NodeJs
  }else{
    if(typeof define === 'function'){
      define(function() {
        return Ant();
      });
    }
    window.Ant = Ant();
  }
})(this, function(doc) {
'use strict';

doc = doc || document;

//自定义事件原型对象
//所有需要自定义事件的对象都可以 extend 该对象: `extend(obj, Event)`
var Event = {
  /**
   * 监听自定义事件.
   * @param {String} name 事件名.
   * @param {Function} handler 事件处理函数.
   * @param {Object} [context] 监听的对象, 默认为 `this` 对象.
   */
  on: function(name, handler, context) {
    var ctx = context || this
      ;
      
    ctx._handlers = ctx._handlers || {};
    ctx._handlers[name] = ctx._handlers[name] || [];
    
    ctx._handlers[name].push({handler: handler, context: context, ctx: ctx});
    return this;
  },
  /**
   * 移除监听事件.
   * @param {String} name 事件名.
   * @param {Function} [handler] 事件处理函数. 如果处理函数为空, 将移除所有处理函数.
   * @param {Object} [context]
   */
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
  /**
   * 触发自定义事件. 
   * 
   * 该方法没有提供静态化的 context 参数. 需要静态化使用, 应该: `Event.trigger.call(context, name, data)`
   * @param {String} name 事件名.
   * @param {AnyType} [data] 传给处理函数的数据
   */
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
      for(var key in opts) {
        src = obj[key];
        copy = opts[key];
        if(obj === copy || key === '__ant__'){ continue; }
        if(isObject(copy)){
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
// , before: function(cons) {
    // var Fn = beforeFn(this, cons);
    // Fn.prototype = this.prototype;
    // extend(Fn, this);
    // return Fn.extend();
  // }
// , after: function(cons) {
    // var Fn = afterFn(this, cons);
    // Fn.prototype = this.prototype;
    // extend(Fn, this);
    // return Fn.extend();
  // }
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

//# 视图模板

//用法示例
// ----
//
//
// ```html
// <div id="ant">
//   <h1>{{title}}</h1>
//   <ul>
//     <li title="{{phone.description}}" z-repeat="phones">{{name}} -- {{price}}</li>
//   </ul>
//   <span>共有 {{phones.length}} 部手机</span>
// </div>
// ```
//  
// **JavaScript 部分**
//
// ```js
// var html = $('#ant')[0]
//   , data = {
//       title: "你的手机"
//     , phones: [
//         {name: 'Galaxy S', price: '$149.00', description: 'SAMSAUNG'}
//       , {name: 'Nexus S', price: '$149.00', description: 'Google'}
//       ]
//     }
//   , ant = new Ant(html, {data: data})
//   ;
// // 更新数据后只需调用 `update` 即可自动更新 html
// data.phones.push({name: 'HTC One', price: '$149.00', description: 'HTC'});
// ```
  
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
    
    data = this.parse(data, opts);
        
    //属性
    //----
    
    
    /**
     * ### ant.template
     * 模板字符串
     * @type {String}
     */
    this.template = tpl;
    
    /**
     * ### ant.el
     * 模板 DOM 对象.
     * @type {HTMLElementObject}
     */
    this.el = el;
    
    /**
     * ### ant.data
     * 绑定模板的数据.
     * @type {Object} 只能是合法的 JSON 对象, 根对象本身不应该是数组.
     */
    this.data = data;
    /**
     * ### ant.isRendered
     * 该模板是否已经绑定数据
     * @type {Boolean} 在 `render` 或者 `reset` 绑定数据后, 该属性将为 `true`
     */
    this.isRendered = false;
    
    /**
     * ### ant.isLazy
     * 是否使用的是延时的 model -> view 同步方式.
     * @type {Boolean}
     */
    this.isLazy = !!opts.lazy;
    
    this.options = opts;
    
    if(opts.partials){
      this.partials = {};
    }
    
    for(var event in events) {
      this.on(event, events[event]);
    }
    
    buildViewModel(this);
    
    if(opts.data){
      checkObj(data, this);
      this.render();
    }
    this.init.apply(this, arguments);
  }
  
  extend(Ant, Class, {
    setPrefix: setPrefix
  , Event: Event
  , beforeFn: beforeFn
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
     * @param {Boolean} [isExtend] 界面更新类型. 默认为 true
              为 true 时, 是扩展式更新, 原有的数据不变
              为 false 时, 是替换时更新, 不在 data 中的变量, 将在 DOM 中被清空.
     */
    update: function(keyPath, data, isExtend) {
      var attrs, vm = this.vm;
      if(isObject(keyPath)){
        isExtend = data;
        attrs = data = keyPath;
      }else if(typeof keyPath === 'string'){
        if(isUndefined(data)){
          data = this.get(keyPath);
        }
        attrs = deepSet(keyPath, data, {});
        vm = vm.$$getChild(keyPath);
      }else{
        data = this.data;
      }
      
      if(isUndefined(isExtend)){ isExtend = true; }
      callRender(vm, data, isExtend);
      this.trigger('update', attrs);
    }
    /**
     * ### ant.render
     * 渲染模板
     */
  , render: function(data) {
      this.set(data, {isExtend: false, silence: true});
      callRender(this.vm, data || this.data, false);
      this.isRendered = true;
      this.trigger('render');
    }
    /**
     * ### ant.clone
     * 复制模板
     * @param {Object} [opts]
     * @return {TemplateObject} 一个新 `Ant` 实例
     */
  , clone: function(opts) {
      return new this.constructor(this.template, extend(this.options, opts));
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
        opt = val;
        opt = opt || {};
        //深度检测, 精确的 diff?
        for(var attr in key){
          if(this.data[attr] !== key[attr]){
            changed = true;
            break;
          }
        }
        if(changed){
          if(opt.isExtend !== false){
            isExtend = true;
            extend(this.data, key);
          }else{
            isExtend = false;
            this.data = key;
          }
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
            parent[path] = val;
            isExtend = false;
          }else{
            extend(this.data, deepSet(key, val, {}));
            isExtend = true;
          }
        }
      }
      checkObj(this.data, this);
      changed && (isObject(key) ? this.update(key, isExtend) : this.update(key, val, isExtend));
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
  
  function checkObj(obj, ant){
    check(obj);
    function check(obj) {
      var val;
      
      for(var key in obj) {
        val = obj[key];
        if(typeof val === 'object' && key !== '__ant__'){
          if(Array.isArray(val)) {
            val.__ant__ = ant;
            arrayWrap(val, ant);
          }
          check(val);
        }
      }
    }
  }
  
  function arrayWrap(array) {
    for(var method in arrayMethods) {
      array[method] = arrayMethods[method];
    }
  }
  
  //TODO
  var arrayMethods = {
    splice: afterFn([].splice, function() {
      this.__ant__.update(null, null, 0);
    })
  , push: afterFn([].push, function() {
      this.__ant__.update(null, null, 0);
    })
  , pop: afterFn([].pop, function() {
      this.__ant__.update(null, null, 0);
    })
  , sort: afterFn([].sort, function() {
      this.__ant__.update(null, null, 0);
    })
  , reverse: afterFn([].reverse, function(){
      this.__ant__.update(null, null, 0);
    })
  , unshift: afterFn([].unshift, function() {
      this.__ant__.update(null, null, 0);
    })
  , shift: afterFn([].shift, function() {
      this.__ant__.update(null, null, 0);
    })
  };
  
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
        if(isToken(el.attributes[i].nodeName)){
          //TODO 属性名称?
        }else{
          vm.$$updateVM(el.attributes[i], el);
        }
      }
      for(var child = el.firstChild; child; ){
        next = child.nextSibling;
        if(child.nodeType === 3){
          vm.$$updateVM(child, child.parentNode);
        }else{
          travelEl(child, vm);
        }
        child = next;
      }
    }
    
  }
  
  //双向绑定
  function view2Model(el, keyPath, vm) {
    keyPath = keyPath.trim();
    var ant = vm.$$root.$$ant
      , cur = vm.$$getChild(keyPath)
      , ev = 'change'
      , attr, value = attr = 'value'
      , isSetDefaut = isUndefined(ant.get(cur.$$keyPath))//界面的初始值不会覆盖 model 的初始值
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
          ant.set(cur.$$keyPath, val);
        }
      ;
    
    switch(el.tagName) {
      case 'INPUT':
      case 'TEXTAREA':
        switch(el.type) {
          case 'checkbox':
            value = attr = 'checked';
            //IE6, IE7 下监听 propertychange 会挂?
            if(el.attachEvent) { ev += ' click'; }
          break;
          case 'radio':
            attr = 'checked';
            if(el.attachEvent) { ev += ' click'; }
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
              if(el.attachEvent) {
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
            ant.set(cur.$$keyPath, vals);
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
      detachEvent(el, e, handler);
      attachEvent(el, e, handler);
    });
    
    el.removeAttribute(MODEL);
    
    //根据表单元素的初始化默认值设置对应 model 的值
    if(el[value] && isSetDefaut){
       handler(); 
    }
  }
  
  
  function ViewModel() {
    this.$$keyPath = '';
    this.$$watchers = [];
  }
  
  ViewModel.prototype = {
    //新加示例属性应该都要在 prototype 中定义一次, 以便于区分自带属性和数据属性
    $$watchers: null
  , $$root: null
  , $$parent: null
  , $$generators: null
  , $$ant: null
  , $$data: null
  , $$keyPath: null
    
    //用节点中的模板占位符来更新 vm
  , $$updateVM: function(node, el) {
      if(isToken(node.nodeValue)){
        this.$$addWatcher(node, el);
      }
    }
  
  //获取当前 vm 的 path 上的子 vm, 不存在的话将新建一个.
  , $$getChild: function(path) {
      var key, vm
        , cur = this
        , keyChain
        ;
      
      keyChain = path.split(/(?!^)\.(?!$)/);
      for(var i = 0, l = keyChain.length; i < l; i++){
        key = keyChain[i];
        
        if(!cur[key]){
          vm = new ViewModel();
          vm.$$parent = cur;
          vm.$$root = cur.$$root || cur;
          vm.$$keyPath = cur.$$keyPath + (cur.$$keyPath && '.') + key;
          cur[key] = vm;
        }
        
        cur = cur[key];
      }
      return cur;
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
      this.$$generators = this.$$generators || [];
      var generator = new Generator(el, this, relativeScope, type);
      this.$$generators.push(generator);
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
        , childVM
        , gens = this.$$generators
        , map
        ;
      
      if(isExtend){
        vm.$$data = isObject(vm.$$data) ? extend(vm.$$data, data) : data;
        map = data;
      }else{
        vm.$$data = data;
        map = this;
      }
      
      if(gens){
        for(var i = 0, l = gens.length; i < l; i++){
          if(gens[i].type === Generator.TYPE_IF || gens[i].state === 0 || !isExtend){
            gens[i].generate();
          }
        }
      }
      
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
    }else{
      console.error('我们需要一个文本节点或者属性节点');
      return;
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
    , refNodeName: nodeName
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
    var pName, partial, ant, els, pn = tokenMap.node.parentNode, opts;
    if(tokenMap.type === 'text' && pertialReg.test(token.path)){
      pName = token.path.replace(pertialReg, '');
      ant = vm.$$root.$$ant;
      opts = ant.options;
      if(opts && opts.partials && (partial = opts.partials[pName])) {
        if(token.escape && !isObject(partial)){
          els = doc.createTextNode(partial);
          pn.insertBefore(els, tokenMap.node);
          travelEl(els, vm);
        }else{
          els = tplParse(partial, 'div').el.childNodes;
          travelEls(els, vm);
          for(var i = 0, l = els.length; i < l; i++){
            pn.insertBefore(els[0], tokenMap.node);
          }
        }
        //TODO 设置 this.partials 于 els 的对应关系
      }
      pn.removeChild(tokenMap.node);
      return false;
    }
  });
  
  function updateDom(newVal, token, tokenMap) {
    var pos = token.position
      , node = tokenMap.node
      , textMap = tokenMap.textMap
      , refName = tokenMap.refNodeName
      ;
    if(newVal + '' !== textMap[pos] + '') {
      
      //模板内容被外部程序修改
      if(node.nodeValue !== textMap.join('') && token.escape) {
        //什么都不做?
        console.warn('没有更新内容. 因为模板内容已被其他程序修改!');
        return;
      }

      textMap[pos] = newVal && (newVal + '');
      
      if(!token.escape && tokenMap.type === 'text') {
        //没有转义的 HTML 代码
        var div = doc.createElement('div')
          , nodes
          ;
        
        token.unescapeNodes = token.unescapeNodes || [];
        
        div.innerHTML = textMap.join('');
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
        node.nodeValue = textMap.join('');
        if(refName && tokenMap.type === 'attr'){
          if(refName === 'style' && tokenMap.el.style.setAttribute){
            //for IE6, IE 7
            tokenMap.el.style.setAttribute('cssText', node.nodeValue);
          }else{
            tokenMap.el.setAttribute(tokenMap.refNodeName, node.nodeValue);
          }
        }
      }
    }
  }
  
  //处理动态节点(z-repeat, z-if)
  function Generator(el, vm, relativeVm, type){
    //文档参照节点. 延迟节点在插入 DOM 的时候需要一个参照点, 是其后面相邻的节点或者父节点
    var relateEl = el
      , relateType
      , attr = type === Generator.TYPE_IF ? IF : REPEAT
      ;
      
    while(true){
      relateEl = relateEl.nextSibling;
      if(relateEl && relateEl.hasAttributes){
        if(Generator.isGenTempl(relateEl)){
          continue;
        }else{
          relateType = 'sibling';
          break;
        }
      }else{
        relateEl = el.parentNode;
        relateType = 'parent';
        break;
      }
    }
    
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
    this.relateType = relateType;
    
    this.instances = [];
    
    this.state = this.STATE_READY;
    el.parentNode && el.parentNode.removeChild(el);
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
        , frag = doc.createDocumentFragment()
        , data = this.relativeVm.$$getData(this.path.replace(invertedReg, ''))
        ;
      if(that.type === Generator.TYPE_REPEAT){
        if(data && !Array.isArray(data)){
          console.warn(JSON.stringify(data) + ' 应该是一个数组');
          return;
        }
        that.empty();
        data && data.forEach(function(data, i) {
          var el = that.el.cloneNode(true)
            , vm = that.vm.$$getChild(i + '')
            ;
            
          frag.appendChild(el);
          travelEl(el, vm);
          vm.$$render(data);
          
          that.instances.push(el);
        });
      }else{
        if(invertedReg.test(this.path)){ data = !data; }
        if(data) {
          if(!that.lastIfState) {
            frag.appendChild(that.el);
          }
        }else{
          if(that.lastIfState) {
            that.el.parentNode.removeChild(that.el);
          }
        }
        that.lastIfState = data;
      }
      
      that.relateType === 'sibling' ? 
          that.relateEl.parentNode.insertBefore(frag, that.relateEl) : 
          that.relateEl.appendChild(frag);
          
      that.state = this.STATE_GENEND;
    }
  , splice: function() {
      //TODO 数组的精确控制
    }
  , empty: function() {
      var that = this;
      this.instances.forEach(function(el, i) {
        if(el.parentNode && el.parentNode.nodeType !== 11){
          el.parentNode.removeChild(el);
        }
        delete that.vm[i];
      });
      this.instances = [];
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
    var chain = parseKeyPath(keyStr)
      , cur = obj
      , key
      ;
      
    for(var i = 0, l = chain.length; i < l; i++) {
      key = chain[i];
      if(cur && cur.hasOwnProperty(key)){
        cur = cur[key];
      }else{
        return;
      }
    }
    
    return cur;
  }
  
  function attachEvent(el, event, handler) {
    if(el.addEventListener) {
      el.addEventListener(event, handler, false);
    }else{
      el.attachEvent('on' + event, handler);
    }
  }
  
  function detachEvent(el, event, handler) {
    if(el.removeEventListener) {
      el.removeEventListener(event, handler);
    }else{
      el.detachEvent('on' + event, handler);
    }
  }
  
  return Ant;
});
;/**
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