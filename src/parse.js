define(function(){

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
          try{
            return getOperator(arity, value)(args[0], args[1], args[2]);
          }catch(e){
            //console.debug(e);
            return '';
          }
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
  
  return parser;
});