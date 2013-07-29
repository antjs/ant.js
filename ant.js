
(function(window, Ant) {
  if(typeof define === 'function'){
    define(Ant);
  }
  window.Ant = Ant();
})(this, function() {
'use strict';

//基础对象
//----

//### 自定义事件原型对象
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
    if((opts = arguments[i]) != null) {
      for(var key in opts) {
        src = obj[key];
        copy = opts[key];
        if(obj === copy){ continue; }
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
};

var RENDER_TYPE = {
      RENDER: 0
    , RESET: 1
    , PART: 2
    , PART_ARRAY_REPLACE: 3
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
   * @constructor
   */
  function Ant(tpl, opts) {
    opts = opts || {};
    var el
      , data = opts.data || {}
      , events = opts.events || {}
      ;
    
    el = tplParse(tpl);
    tpl = el.tpl;
    el = el.el;
    
    if(opts.parse !== false) { data = this.parse(data, opts); }
        
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
     * @type {Object} 只能是合法的 JSON 对象, 根对象本身不应该是数组.
     */
    this.data = data;
    /**
     * ### ant.isRendered
     * 该模板是否已经绑定数据
     * @type {Boolean} 在 `render` 或者 `reset` 绑定数据后, 该属性将为 `true`
     */
    this.isRendered = false;
    
    this.addBinding = addBinding;
    
    if(typeof opts.addBinding === 'function'){
      this.addBinding = _beforeFn(addBinding, opts.addBinding);
    }
    
    /**
     * ### ant.isLazy
     * 是否使用的是延时的 model -> view 同步方式.
     * @type {Boolean}
     */
    this.isLazy = !!opts.lazy;
    
    this.partials = opts.partials || {};
    
    this.options = opts;
    
    buildViewModel(this);
    
    for(var event in events) {
      this.on(event, events[event]);
    }
    
    if(opts.data){
      checkObj(data, this);
      this.render();
    }
    this.init.apply(this, arguments);
  }
  
  extend(Ant, Class, {
    RENDER_TYPE: RENDER_TYPE
  , setPrefix: setPrefix
  });
  
  //方法
  //----
  extend(Ant.prototype, Event, {
    /**
     * ### ant.update
     * 更新模板. 
     * @param {Object} data 要更新的数据. 增量数据或全新的数据.
     */
    update: function(keyPath, data, type) {
      var src;
      if(isObject(keyPath)){
        type = data;
        data = keyPath;
      }else if(typeof keyPath === 'string'){
        data = typeof data === 'undefined' ? deepSet(keyPath, src = this.get(keyPath), {}) : data;
        type = Array.isArray(src) ? RENDER_TYPE.PART_ARRAY_REPLACE : RENDER_TYPE.PART;
      }
      
      if(typeof type === 'undefined'){ type = RENDER_TYPE.PART; }
      callRender(this, data || this.data, type);
      this.trigger('update', data);
    }
    /**
     * ### ant.render
     * 渲染模板
     */
  , render: function(data) {
      callRender(this, data || this.data, RENDER_TYPE.RENDER);
      this.trigger('render');
    }
    /**
     * ### ant.rest
     * 用新的数据重新渲染
     */
  , reset: function(data) {
      this.set(data, {reset: true});
      this.trigger('reset');
    }
    /**
     * ### ant.clone
     * 复制模板
     * @param {Object} [opts]
     * @return {TemplateObject} 一个新 `Ant` 实例
     */
  , clone: function(opts) {
      return new this.constructor(this.el.cloneNode(true), extend(this.options, opts));
    }
    
  , get: function(key) {
      return deepGet(key, this.data);
    }
    
  , set: function(key, val, opt) {
      var attrs = {}, changed, old, type;
      
      if(!key){ return this; }
      
      if(isObject(key)){
        attrs = key;
        opt = val;
        opt = opt || {};
        for(var attr in attrs){
          if(this.data[attr] !== attrs[attr]){
            this.data[attr] = attrs[attr];
            if(!opt.silence){
              changed = true;
              type = opt.reset ? RENDER_TYPE.RESET : RENDER_TYPE.PART;
            }
          }
        }
      }else{
        old = deepGet(key, this.data);
        opt = opt || {};
        deepSet(key, val, attrs);
        if(!opt.silence && old !== val) {
          extend(this.data, attrs);
          changed = true;
          type = Array.isArray(old) ? RENDER_TYPE.PART_ARRAY_REPLACE : RENDER_TYPE.PART;
        }
      }
      
     checkObj(attrs, this);
      
      if(changed){
        this.update(attrs, type);
      }
    }
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
      this.__ant__.update(null, null, 3);
    })
  , push: afterFn([].push, function() {
      this.__ant__.update(null, null, 3);
    })
  , pop: afterFn([].pop, function() {
      this.__ant__.update(null, null, 3);
    })
  , sort: afterFn([].sort, function() {
      this.__ant__.update(null, null, 3);
    })
  , reverse: afterFn([].reverse, function(){
      this.__ant__.update(null, null, 3);
    })
  , unshift: afterFn([].unshift, function() {
      this.__ant__.update(null, null, 3);
    })
  , shift: afterFn([].shift, function() {
      this.__ant__.update(null, null, 3);
    })
  };
  
  function tplParse(tpl) {
    var el, div = document.createElement('div');
    if(isObject(tpl)){
      el = tpl;
      tpl = div.outerHTML;
    }else{
      div.innerHTML = tpl.trim();
      el = div.firstChild;
    }
    return {el: el, tpl: tpl};
  }
  
  function callRender(ant, data, renderType) {
    ant.vm.$$render(data, renderType);
    if(renderType <= 1){
    //`render, reset` 时
      ant.isRendered = true;
    }
  }
  
  function buildViewModel(ant) {
    var vm = new ViewModel();
    vm.$$root = vm;
    vm.$$ant = ant;
    ant.vm = vm;
    travelEl(ant.el, vm);
  }
    
  //遍历元素及其子元素的所有属性节点及文本节点
  function travelEl(el, vm) {
    if(el.nodeType === 8){
      //注释节点
      return;
    }
    var r = el.getAttribute(REPEAT)
      , i = el.getAttribute(IF)
      , m = el.getAttribute(MODEL)
      
      , flag, next
      ;
    
  
    if(r){
      vm.$$getChild(r).$$addGenerator(el, vm.$$getChild(r), Generator.TYPE_REPEAT);
      flag = true;
    }else{
      if(i){
        vm.$$getChild(i).$$addGenerator(el, vm.$$getChild(i), Generator.TYPE_IF);
        flag = true;
      }
      if(m){
        view2Model(el, m, vm);
      }
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
  function view2Model(el, key, vm) {
    var ant = vm.$$root.$$ant
      , cur = vm.$$getChild(key)
      , ev = 'change'
      , attr, value = attr = 'value'
      , isSetDefaut = typeof ant.get(cur.$$keyPath) === 'undefined'//界面的初始值不会覆盖 model 的初始值
      , watcher = function(vm, path) {
          var newVal = vm.$$getData(path) || '';
          if(newVal !== el[attr]){ el[attr] = newVal; }
        }
      , handler = function() {
          ant.set(cur.$$keyPath, el[value]);
        }
      ;
    
    switch(el.tagName) {
      case 'INPUT':
      case 'TEXTAREA':
        switch(el.type) {
          case 'checkbox':
            value = attr = 'checked';
            if(el.attachEvent) { ev += ' propertychange'; }
          break;
          case 'radio':
            attr = 'checked';
            if(el.attachEvent) { ev += ' propertychange'; }
            watcher = function(vm, path) {
              el.checked = el.value === vm.$$getData(path);
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
          watcher = function(vm, path){
            var vals = vm.$$getData(path);
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
    if(el[value] && isSetDefaut){ handler(); }
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
        textMap.forEach(function(text, i) {
          var tn = document.createTextNode(text);
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
      var generator = new Generator(el, relativeScope, type);
      this.$$generators.push(generator);
      return generator;
    }
  
  //获取对象的某个值, 没有的话查找父节点, 直到顶层.
  , $$getData: function(key, isStrict) {
      if(isStrict){
        return this.$$data[key];
      }else{
        for(var vm = this; vm; vm = vm.$$parent){
          if(vm.$$data && typeof vm.$$data[key] !== 'undefined'){
            return vm.$$data[key];
          }
        }
      }
    }
  , $$render: function (data, renderType) {
      var vm = this
        , map = renderType >= RENDER_TYPE.PART ? data : this
        , childVM
        ;
        
      vm.$$data = data;
        
      for(var path in map) {
        if(!vm.hasOwnProperty(path) || (path in ViewModel.prototype)){
        //传入的数据键值不能和 vm 中的自带属性名相同.
        //所以不推荐使用 '$$' 作为 JSON 数据键值的开头.
          continue;
        }else{
          childVM = vm.$$getChild(path);
          if(childVM.$$generators && childVM.$$generators.length){
            for(var i = 0, l = childVM.$$generators.length; i < l; i++) {
              if(childVM.$$generators[i].state === 0 || renderType !== RENDER_TYPE.PART){
                childVM.$$generators[i].generate(data, path);
              }
            }
          }
          if(vm[path].$$watchers.length){
            for(var i = 0, l = childVM.$$watchers.length; i < l; i++) {
              childVM.$$watchers[i](vm, path);
            }
          }
          
          childVM.$$render(data[path], renderType);
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
      , nodeName, index
      ;
    
    if(node.nodeType === 3){//文本节点
      type = 'text';
    }else if(node.nodeType === 2){//属性节点
      type = 'attr';
      nodeName = node.nodeName;
      if((index = nodeName.indexOf(prefix)) === 0){
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
    var childVm = vm.$$getChild(token.path);
    
    childVm.$$watchers.push(function(vm, path) {
      var newVal = path === '.' ? vm.$$data : vm.$$getData(path);
      //只更新变化了的部分.
      updateDom(newVal, token, tokenMap);
    });
  }
  
  //{{data: str}}
  addBinding = _beforeFn(addBinding, function(tokenMap, vm, token) {
    var tokenStr = token.path
      , pair = tokenStr.split(':')
      ;
      
    if(pair.length === 2){
      var path = pair[0].trim()
        , value = pair[1].trim()
        ;
      vm.$$getChild(path).$$watchers.push(function(_vm, _path) {
        var newVal = _vm.$$getData(_path) ? value : '';
        updateDom(newVal, token, tokenMap);
      });
      return false;
    }
  });
  
  //局部模板. {{> childview}}
  var pertialReg = /^>\s*(?=.+)/
  addBinding = _beforeFn(addBinding, function(tokenMap, vm, token) {
    var pertial, ant, el;
    if(tokenMap.type === 'text' && pertialReg.test(token.path)){
      pertial = token.path.replace(pertialReg, '');
      ant = vm.$$root.$$ant;
      if(ant.partials[pertial]) {
        el = tplParse(ant.partials[pertial]).el;
        travelEl(el, vm);
        tokenMap.node.parentNode.insertBefore(el, tokenMap.node);
      }
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
        var div = document.createElement('div')
          , nodes
          ;
        
        token.unescapeNodes = token.unescapeNodes || [];
        
        div.innerHTML = textMap.join('');
        nodes = div.childNodes;
        
        token.unescapeNodes.forEach(function(_node) {
          _node.parentNode.removeChild(_node);
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
  function Generator(el, vm, type){
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
    
    el.removeAttribute(attr);
    
    if(attr === IF){
      travelEl(el, vm.$$parent);
    }
    
    this.el = el;
    this.vm = vm;
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
  , generate: function(values, path) {
      var that = this
        , frag = document.createDocumentFragment()
        , data = values[path]
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


  //函数切面
  //前面的函数返回值传入 breakCheck 判断, breakCheck 返回值为真时不执行后面的函数
  function beforeFn(oriFn, fn, breakCheck) {
    return function() {
      var ret = fn.apply(this, arguments);
      if(breakCheck && breakCheck.call(ret)){
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
  var keyPathReg = /(?:\]\.?|\]?\[\]?|\.)/g
    , bra = /\]$/
    ;
  function deepSet(keyStr, value, obj) {
    var chain = keyStr.replace(bra, '').split(keyPathReg)
      , cur = obj
      ;
      
    chain.forEach(function(key, i) {
      if(i === chain.length - 1){
        cur[key] = value;
      }else{
        if(cur && cur.hasOwnProperty(key)){
          cur = cur[key];
        }else{
          cur[key] = chain[i + 1] && /^\d+$/.test(chain[i + 1]) ? [] : {};
          cur = cur[key];
        }
      }
    });
    
    return obj;
  }
  function deepGet(keyStr, obj) {
    var chain = keyStr.replace(bra, '').split(keyPathReg)
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
