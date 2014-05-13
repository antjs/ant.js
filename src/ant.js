"use strict";

var doc = require('./document.js')
  , parse = require('./parse.js').parse
  , evaluate = require('./eval.js')
  , utils = require('./utils.js')
  , Event = require('./event.js')
  , Class = require('./class.js')
  , Dir = require('./directive.js')
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
  
  Ant.directive('text', {
    terminal: true
  , init: function() {
      var text = doc.createTextNode('')
        , el
        ;
      if(this.nodeName !== text.nodeName) {
        el = this.el;
        this.el = el.parentNode;
        this.el.replaceChild(text, el);
        this.node = text;
        this.nodeName = text.nodeName;
      }
    }
  , update: function(val, old) {
      this.node.nodeValue = val;
    }
  });
  
  Ant.directive('html', {
    
  });
  
  Ant.directive('attr', {
    
  });
  
  Ant.directive('repeat', {
    priority: 10000
  , terminal: true
  });
  
  Ant.directive('if', {
    
  });
  
  Ant.directive('model', {
    init: function(vm) {
      if(!this.path) { return false; }
      
      var el = this.el, keyPath = this.path
        , ev = 'change'
        , attr, value = attr = 'value'
        , ant = vm.$root.$ant
        , cur = vm.$getVM(keyPath)
        , isSetDefaut = isUndefined(ant.get(cur.$getKeyPath()))//界面的初始值不会覆盖 model 的初始值
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
  });
  
  Ant.directive('partial', {
    terminal: true
  , init: function() {
      ;
    }
  });
  
  
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
    
    var dirs = getDir(el, Ant.directives, Ant.prefix)
      , dir
      ;
    
    for (var i = 0, l = dirs.length; i < l; i++) {
      dir = dirs[i];
     
      checkBinding(vm, dir);
     
      el.removeAttribute(dir.nodeName);
      if(dir.terminal) {
        return true;
      }
    }
    
    return;
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
      //replace prefix and postfix attribute. a-style={{value}}, disabled?={{value}}
      if(attr.nodeName.indexOf(prefix) === 0 || attrPostReg.test(attr.nodeName)){
        el.removeAttribute(attr.nodeName);
      }
    }
  }
  
  function checkText(node, vm) {
    if(hasToken(node.nodeValue)) {
      checkBinding(vm, extend({
        node: node
      , el: node.parentNode
      , nodeName: node.nodeName
      }, Ant.directives.text))
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
        dir = directives[dirName];
      }else if(hasToken(attr.nodeValue)) {
        dir = directives['attr'];
      }
      if(dir) {
        dirs.push(extend({el: el, node: attr, nodeName: attrName}, dir));
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
      
    var hasTokenName = hasToken(node.nodeName)
      , hasTokenValue = hasToken(node.nodeValue)
      ;
      
    if(hasTokenValue || hasTokenName){
      var tokens = parseTokens(node, el, hasTokenName)
        , textMap = tokens.textMap
        , valTokens
        ;
      //如果绑定内容是在文本中, 则将{{key}}分割成单独的文本节点
      if(node.nodeType === NODETYPE.TEXT && textMap.length > 1){
        textMap.forEach(function(text) {
          var tn = doc.createTextNode(text);
          el.insertBefore(tn, node);
          checkBinding(vm, tn, el);
        });
        el.removeChild(node);
      }else{
        //<tag {{attr}}={{value}} />
        if(hasTokenName && hasTokenValue){
          valTokens = parseTokens(node, el);
          valTokens.forEach(function(token){
            token.baseTokens = tokens;
            addBinding(vm, token);
          });
        }
        tokens.forEach(function(token){
          setBinding(vm, extend(dir, token));
        });
      }
    }
  }
  
  function setBinding(vm, dir) {
    dir.init(vm);
    new Watcher(vm, dir);
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
  
  
  var tokenReg = /{{({([^}\n]+)}|[^}\n]+)}}/g;
  var attrPostReg = /\?$/;
  
  //字符串中是否包含模板占位符标记
  function hasToken(str) {
    tokenReg.lastIndex = 0;
    return str && tokenReg.test(str);
  }
  
  function parseTokens(node, el, parseNodeName) {
    var tokens = []
      , textMap = []
      , start = 0
      , value = node.nodeValue
      , nodeName = node.nodeName
      , condiAttr, isAttrName
      , val, token
      ;
    
    if(node.nodeType === NODETYPE.ATTR){
      //attribute with prefix.
      if(nodeName.indexOf(prefix) === 0 && !isAntAttr(nodeName)){
        nodeName = node.nodeName.slice(prefix.length);
      }
      
      if(attrPostReg.test(nodeName)){
        //attribute with postfix
        //attr?={{condition}}
        nodeName = nodeName.slice(0, nodeName.length - 1);
        condiAttr = true;
      }
      if(parseNodeName){
        value = nodeName;//属性名
        isAttrName = true;
      }
    }
    
    tokenReg.lastIndex = 0;
    
    while((val = tokenReg.exec(value))){
      if(tokenReg.lastIndex - start > val[0].length){
        textMap.push(value.slice(start, tokenReg.lastIndex - val[0].length));
      }
      
      token = {
        escape: !val[2]
      , path: (val[2] || val[1]).trim()
      , position: textMap.length
      , el: el
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
  
  var pertialReg = /^>\s*(?=.+)/;
  
  //buid in bindings
  var baseBindings = [
    function(vm, token){
      return new Watcher(vm, token);
    }
    
    //局部模板. {{> anotherant}}
  , function(vm, token) {
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
    
    if(callback){
      this.callback = callback;
    }
    
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
      var newVal = this.getValue(vals);
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
          if(token.escape){
            node.nodeValue = val;
          }else{
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
          }
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
  
  Ant._parse = parse;
  Ant._eval = evaluate.eval;
  Ant.version = '%VERSION';
  
  module.exports = Ant;