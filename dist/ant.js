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

/***
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

 
(function(factory) {
  var root = this;
  if(typeof module === 'object' && module){
    var doc = root.document || require('jsdom').jsdom();
    module.exports = factory(doc);//NodeJs
  }else{
    var Ant = factory(root.document);
    if(typeof define === 'function'){
      define(function() {
        return Ant;
      });
    }
    if(!root.Ant){
      root.Ant = Ant;
    }
  }
})(function(document) {


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
      var getter;
      
      var path = '';

      var init = function(fn) {
        var locals = {
          locals: {},//表达式中用到的变量
          filters: {},//用到的 filter
          paths: {}//用到的监控路径
        };
        
        fn = fn || noop;
        
        getter = function(value, type) {
          if(!locals[type][value]){
            fn(value, type);
            locals[type][value] = true;
          }
        };
      };
      
      var itself = function () {
          return this;
      };
  
      var find = function (n) {
        n.nud      = itself;
        n.led      = null;
        n.std      = null;
        n.lbp      = 0;
        
        var type;
        if(!token || token.id !== '.'){
          if(token && token.id === '|'){
            type = 'filters';
          }else{
            type = 'locals';
            path = n.value;
          }
          getter(n.value, type);
        }else{
          path += '.' + n.value;
        }
        if( path && (!tokens[token_nr] ||tokens[token_nr].value !== '.' && tokens[token_nr].value !== '[')){
          getter(path, 'paths');
          path = '';
        }
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
          if (a === "operator" || v in symbol_table) {
              o = symbol_table[v];
              if (!o) {
                  error("Unknown operator.", t);
              }
          } else if (a === "name") {
              o = find(t);
          } else if (a === "string" || a ===  "number") {
              o = symbol_table["(literal)"];
              a = "literal";
              if(path){
                path += '.' + v;
              }
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

      symbol(".").nud = function () {
          this.arity = "this";
          getter('.', 'locals');
          getter('.', 'paths');
          return this;
      };
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
          if(path && token.value !== '.' && token.value !== '['){
            getter(path, 'paths');
            path = '';
          }
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
        this.second = expression(0);
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

      return function (source, fn) {
          tokens = tokenize(source, '=<>!+-*&|/%^', '=<>&|');
          token_nr = 0;
          init(fn);
          advance();
          var s = expression(0);
          advance("(end)");
          return s;
      };
  };

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
      '+': function(l, r) { return l+r; }
    , '-': function(l, r) { return l-r; }
    , '*': function(l, r) { return l*r; }
    , '/': function(l, r) { return l/r; }
    , '%': function(l, r) { return l%r; }
    , '<': function(l, r) { return l<r; }
    , '>': function(l, r) { return l>r; }
    , '<=': function(l, r) { return l<=r; }
    , '>=': function(l, r) { return l>=r; }
    , '==': function(l, r) { return l==r; }
    , '!=': function(l, r) { return l!=r; }
    , '===': function(l, r) { return l===r; }
    , '!==': function(l, r) { return l!==r; }
    , '&&': function(l, r) { return l&&r; }
    , '||': function(l, r) { return l||r; }
      
    , '.': function(l, r) { return l[r]; }
    , '[': function(l, r) { return l[r]; }
    , '(': function(l, r){ return l.apply(null, r) }
      
    , '|': function(l, r){ return r.call(null, l) }//filter. name|filter
    }
    
  , 'ternary': {
      '?': function(f, s, t) { return f ? s : t; }
    , '(': function(f, s, t) { return f[s].apply(f, t) }
      
    , '|': function(f, s, t){ return s.apply(null, [f].concat(t)); }//filter. name | filter : arg2 : arg3
    }
  };

  var make_eval = function() {
    var _locals, _filters
      , isArray = Array.isArray
      , argName = ['first', 'second', 'third']
      ;
      
    var evaluate = function(tree) {
      var arity = tree.arity
        , value = tree.value
        , args = []
        , n = 0
        , arg
        ;
      
      for(; n < 3; n++){
        arg = tree[argName[n]];
        if(arg){
          if(isArray(arg)){
            args[n] = [];
            for(var i = 0, l = arg.length; i < l; i++){
              args[n].push(typeof arg[i].key === 'undefined' ? evaluate(arg[i]) : [arg[i].key, evaluate(arg[i])]);
            }
          }else{
            args[n] = evaluate(arg);
          }
        }
      }
      
      switch(arity){
        case 'unary': 
        case 'binary':
        case 'ternary':
          return getOperator(arity, value)(args[0], args[1], args[2]);
        break;
        case 'literal':
          return value;
        case 'name':
          return _locals[value];
        case 'filter':
          return _filters[value];
        case 'this':
          return _locals;
        break;
      }
    };
    
    function getOperator(arity, value){
      return operators[arity][value] || function() { return ''; }
    }
    
    return function(tree, locals, filters) {
      _locals = typeof locals === 'undefined' ? {} : locals;
      _filters = filters || {};
      return evaluate(tree);
    }
  };
  
  var parser = {
    parse: make_parse()
  , eval: make_eval()
  };

var doc = document;

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
        //android 2.3 browser can enum the prototype of constructor...
        if(opts.hasOwnProperty(key) && key !== 'prototype'){
          obj[key] = opts[key];
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
  for(var attr in antAttr){
    if(antAttr[attr] === attrName){
      return true;
    }
  }
  return false;
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
      , defaults = this.defaults || {}
      ;

    opts = modelExtend(modelExtend({}, defaults), opts);

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
      var attrs, vm = this._vm;
      if(isObject(keyPath)){
        isExtend = data;
        attrs = data = keyPath;
      }else if(typeof keyPath === 'string'){
        keyPath = parseKeyPath(keyPath).join('.');
        if(isUndefined(data)){
          data = this.get(keyPath);
        }
        attrs = deepSet(keyPath, data, {});
        vm = vm.$getChild(keyPath);
      }else{
        data = this.data;
      }
      
      if(isUndefined(isExtend)){ isExtend = isObject(keyPath); }
      vm.$set(data, isExtend);
      this.trigger('update', attrs);
      return this;
    }
    /**
     * ### ant.render
     * 渲染模板
     */
  , render: function(data) {
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
            parent[path] = isObject(val) ? modelExtend(Array.isArray(val) ? [] : {}, val, this._vm.$getChild(key, !Array.isArray(val))) : val;
            isExtend = false;
          }else{
            modelExtend(this.data, deepSet(key, val, {}), this._vm);
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
        vm = this._vm.$getChild(path);
        
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
        this.isRendered && vm.$set(deepGet(path, this.data));
      }
      return this;
    }
  , init: noop
  
  , watch: function(keyPath, callback) {
      if(keyPath && callback){
        new Watcher(this._vm, {path: keyPath}, callback);
      }
      return this;
    }
  , unwatch: function(keyPath, callback) {
      var vm = this._vm.$getChild(keyPath, true);
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
    vm.$root = vm;
    vm.$ant = ant;
    ant._vm = vm;
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
  
  var NODETYPE = {
    ATTR: 2
  , TEXT: 3
  , COMMENT: 8
  };
  
  //遍历元素及其子元素的所有属性节点及文本节点
  function travelEl(el, vm) {
    if(el.nodeType === NODETYPE.COMMENT){
      //注释节点
      return;
    }else if(el.nodeType === NODETYPE.TEXT){
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
      //replace prefix and postfix attribute. a-style={{value}}, disabled?={{value}}
      if(attr.nodeName.indexOf(prefix) === 0 || attrPostReg.test(attr.nodeName)){
        el.removeAttribute(attr.nodeName);
      }
    }
  }
  
  function checkBinding(vm, node, el) {
    var hasTokenName = hasToken(node.nodeName)
      , hasTokenValue = hasToken(node.nodeValue)
      ;
      
    if(hasTokenValue || hasTokenName){
      var tokens = parseTokens(node, el, hasTokenName)
        , textMap = tokens.textMap
        , valTokens
        ;
      //如果绑定内容是在文本中, 则将其分割成单独的文本节点
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
            addWatcher(vm, token);
          });
        }
        tokens.forEach(function(token){
          addWatcher(vm, token);
        });
      }
    }
  }
  
  var isIE = !!doc.attachEvent;
  
  function ViewModel() {
    this.$key = '';
    this.$watchers = [];
  }
  
  ViewModel.prototype = {
    $root: null
  , $parent: null
  , $ant: null
  , $key: null
  , $repeat: false
  
  , $watchers: null

  , $value: null
    
  //获取子 vm, 不存在的话将新建一个.
  , $getChild: function(path, strict) {
      var key, vm
        , cur = this
        , keyChain
        ;
        
      path = path + '';
      if(path && path !== '.'){
        keyChain = path.split(/(?!^)\.(?!$)/);
        for(var i = 0, l = keyChain.length; i < l; i++){
          key = keyChain[i];
          
          if(!cur[key]){
            if(strict){ return null; }
            vm = new ViewModel();
            vm.$parent = cur;
            vm.$root = cur.$root || cur;
            vm.$key = key;
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
  , $set: function (data, isExtend) {
      var map = isExtend ? data : this
        , parent = this
        ;
      
      
      for(var i = 0, l = this.$watchers.length; i < l; i++){
        if(this.$value !== data || this.$watchers[i].state === Watcher.STATE_READY){
          this.$watchers[i].fn();
        }
      }
      this.$value = data;
      
      if(isObject(map)){
        for(var path in map) {
          if(this.hasOwnProperty(path) && (!(path in ViewModel.prototype))){
          //传入的数据键值不能和 vm 中的自带属性名相同.
          //所以不推荐使用 '$' 作为 JSON 数据键值的开头.
            this[path].$set(data ? data[path] : void(0), isExtend);
          }
        }
      }

    }
  };
  
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
        model[key] = modelExtend(clone, copy, vm && vm.$getChild(key));
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
  
  
  function addWatcher(vm, token) {
    var binding = getBinding(vm.$root.$ant.bindings);
    binding(vm, token);
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
    
    //model 双向绑定
  , function (vm, token) {
      var keyPath = token.path
        , el = token.el
        ;
      
      if(token.nodeName === antAttr.MODEL){
      
        if(!keyPath){ return false; }
        
        var ant = vm.$root.$ant
          , cur = keyPath === '.' ? vm : vm.$getChild(keyPath)
          , ev = 'change'
          , attr, value = attr = 'value'
          , isSetDefaut = isUndefined(ant.get(cur.$getKeyPath()))//界面的初始值不会覆盖 model 的初始值
          , crlf = /\r\n/g//IE 8 下 textarea 会自动将 \n 换行符换成 \r\n. 需要将其替换回来
          , callback = function(val) {
              //执行这里的时候, 很可能 render 还未执行. vm.$getData(keyPath) 未定义, 不能返回新设置的值
              var newVal = val || vm.$getData(keyPath) || ''
                , val = el[attr]
                ;
              val && val.replace && (val = val.replace(crlf, '\n'));
              if(newVal !== val){ el[attr] = newVal; }
            }
          , handler = function() {
              var val = el[value];
              
              val.replace && (val = val.replace(crlf, '\n'));
              ant.set(cur.$getKeyPath(), val);
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
                callback = function() {
                  el.checked = el.value === vm.$getData(keyPath);
                };
                isSetDefaut = el.checked;
              break;
              default:
                if(!ant.options.lazy){
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
                ant.set(cur.$getKeyPath(), vals);
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
        
        ev.split(/\s+/g).forEach(function(e){
          removeEvent(el, e, handler);
          addEvent(el, e, handler);
        });
        
        el.removeAttribute(antAttr.MODEL);
        
        var watcher = new Watcher(vm, token);
        watcher.callback = callback;
        
        //根据表单元素的初始化默认值设置对应 model 的值
        if(el[value] && isSetDefaut){
           handler(); 
        }
        
        return watcher;
      }
    }
  ];
  
  var parse = function(path) {
    var that = this;
      
    this._ast = parser.parse(path, function(key, type) {
      that[type].push(key);
    });
  };
  
  function Watcher(relativeVm, token, callback) {
    this.token = token;
    this.relativeVm = relativeVm;
    this.ant = relativeVm.$root.$ant;
    this.locals = [];
    this.filters = [];
    this.paths = [];
    this.el = token.el;
    this.val = null;
    this.fn = function() {
      var vals = {}, key;
      for(var i = 0, l = this.locals.length; i < l; i++){
        key = this.locals[i];
        if(key === '.'){
          vals = relativeVm.$getData();
        }else{
          vals[key] = relativeVm.$getData(key)
        }
      }
      var newVal = this.getValue(vals);
      if(newVal !== this.val){
        try{
          this.callback(newVal, this.val);
          this.val = newVal;
        }catch(e){
          console.error(e);
        }
      }
      this.state = Watcher.STATE_CALLED;
    };
    
    if(callback){
      this.callback = callback;
    }
    
    token.path && parse.call(this, token.path);
    
    for(var i = 0, l = this.paths.length; i < l; i++){
      relativeVm.$getChild(this.paths[i]).$watchers.push(this);
    }
    
    this.state = Watcher.STATE_READY
    
    //When there is no variable in a binding, evaluate it immediately.
    if(!this.locals.length) {
      this.fn();
    }
  }
  
  extend(Watcher, {
    STATE_READY: 0
  , STATE_CALLED: 1
  }, Class);
  
  extend(Watcher.prototype, {
    //update the DOMs
    callback: function(newVal) {
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
        val = parser.eval(this._ast, vals, ant.filters);
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
    vmArray.__ant__.$getChild('length').$set(vmArray.length);
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
        this.vm = relativeVm.$getChild(this.paths[0]);
        
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
          if(data && !Array.isArray(data)){
            console.warn('需要一个数组');
            return;
          }
          //if(this.state === 0 || !isExtend){
            data && this.splice([0, this.els.length].concat(data));
          //}
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
              var j = i - (n - m);
              els[i]['$index'] = j;
              if(!noFixVm){
                vm = this.vm[j] = this.vm[i];
                vm.$key = j + '';
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
          vm = this.vm.$getChild(index + j)
          el['$index'] = index + j;
          frag.appendChild(el);
          travelEl(el, vm);
          vm.$set(items[j]);
          
          newEls.push(el);
          if(arr && isObject(arr[index + j])){
            arr[index + j] = modelExtend(Array.isArray(arr[index + j]) ? []: {}, arr[index + j], vm);
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
  
  Ant._parse = parser.parse;
  Ant._eval = parser.eval;
  Ant.version = '0.2.2';
  return Ant;
});