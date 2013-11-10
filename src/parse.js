(function(Ant){
  // tokens.js
  // 2010-02-23

  // (c) 2006 Douglas Crockford

  // Produce an array of simple token objects from a string.
  // A simple token object contains these members:
  //      type: 'name', 'string', 'number', 'operator'
  //      value: string or number value of the token
  //      from: index of first character of the token
  //      to: index of the last character + 1

  // Comments of the // type are ignored.

  // Operators are by default single characters. Multicharacter
  // operators can be made by supplying a string of prefix and
  // suffix characters.
  // characters. For example,
  //      '<>+-&', '=>&:'
  // will match any of these:
  //      <=  >>  >>>  <>  >=  +: -: &: &&: &&



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
          } else if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')) {// name.
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
                      make('number', str).error("Bad exponent");
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
                  make('number', str).error("Bad number");
              }

  // Convert the string value to a number. If it is finite, then it is a good
  // token.

              n = +str;
              if (isFinite(n)) {
                  result.push(make('number', n));
              } else {
                  make('number', str).error("Bad number");
              }

  // string

          } else if (c === '\'' || c === '"') {
              str = '';
              q = c;
              i += 1;
              for (;;) {
                  c = code.charAt(i);
                  if (c < ' ') {
                      make('string', str).error(c === '\n' || c === '\r' || c === '' ?
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
                          make('string', str).error("Unterminated string");
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
                              make('string', str).error("Unterminated string");
                          }
                          c = parseInt(code.substr(i + 1, 4), 16);
                          if (!isFinite(c) || c < 0) {
                              make('string', str).error("Unterminated string");
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

  var create = Object.create || function (o) {
    function F() {}
    F.prototype = o;
    return new F();
  };
  
  // parse.js
  // Parser for Simplified JavaScript written in Simplified JavaScript
  // From Top Down Operator Precedence
  // http://javascript.crockford.com/tdop/index.html
  // Douglas Crockford
  // 2010-06-26
  // Modify by Justan at 2013-11-10

  var make_parse = function () {
      var symbol_table = {};
      var token;
      var tokens;
      var token_nr;

      var itself = function () {
          return this;
      };
  
      var getter = function (n) {
        n.nud      = itself;
        n.led      = null;
        n.std      = null;
        n.lbp      = 0;
        if(token.id !== '.'){
          locals[n.value] = n;
        }
        return n;
      };

      var advance = function (id) {
          var a, o, t, v;
          if (id && token.id !== id) {
              token.error("Expected '" + id + "'.");
          }
          if (token_nr >= tokens.length) {
              token = symbol_table["(end)"];
              return;
          }
          t = tokens[token_nr];
          token_nr += 1;
          v = t.value;
          a = t.type;
          if (a === "name") {
              o = getter(t);
          } else if (a === "operator") {
              o = symbol_table[v];
              if (!o) {
                  t.error("Unknown operator.");
              }
          } else if (a === "string" || a ===  "number") {
              o = symbol_table["(literal)"];
              a = "literal";
          } else {
              t.error("Unexpected token.");
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
              this.error("Undefined.");
          },
          led: function (left) {
              this.error("Missing operator.");
          },
          error: function (message, t) {
              t = t || this;
              t.name = "SyntaxError";
              t.message = message;
              throw t;
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

      var constant = function (s, v) {
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

      symbol("(literal)").nud = itself;

      symbol("this").nud = function () {
          this.arity = "this";
          return this;
      };


      infix("?", 20, function (left) {
          this.first = left;
          this.second = expression(0);
          advance(":");
          this.third = expression(0);
          this.arity = "ternary";
          return this;
      });

      infixr("&&", 30);
      infixr("||", 30);

      infixr("===", 40);
      infixr("!==", 40);
      infixr("<", 40);
      infixr("<=", 40);
      infixr(">", 40);
      infixr(">=", 40);

      infix("+", 50);
      infix("-", 50);

      infix("*", 60);
      infix("/", 60);

      infix(".", 80, function (left) {
          this.first = left;
          if (token.arity !== "name") {
              token.error("Expected a property name.");
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
                      left.arity !== "name" && left.id !== "(" &&
                      left.id !== "&&" && left.id !== "||" && left.id !== "?") {
                  left.error("Expected a variable name.");
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
                      token.error("Bad property name.");
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

      var parser = function (source, local) {
          tokens = tokenize(source, '=<>!+-*&|/%^', '=<>&|');
          token_nr = 0;
          locals = local || {};
          advance();
          var s = expression(0);
          advance("(end)");
          return s;
      };

      return parser;
  };

  var unaryOperators = {
    '+': function(v) { return +v; },
    '-': function(v) { return -v; },
    '!': function(v) { return !v; }
  };

  var binaryOperators = {
    '+': function(l, r) { return l+r; },
    '-': function(l, r) { return l-r; },
    '*': function(l, r) { return l*r; },
    '/': function(l, r) { return l/r; },
    '%': function(l, r) { return l%r; },
    '<': function(l, r) { return l<r; },
    '>': function(l, r) { return l>r; },
    '<=': function(l, r) { return l<=r; },
    '>=': function(l, r) { return l>=r; },
    '==': function(l, r) { return l==r; },
    '!=': function(l, r) { return l!=r; },
    '===': function(l, r) { return l===r; },
    '!==': function(l, r) { return l!==r; },
    '&&': function(l, r) { return l&&r; },
    '||': function(l, r) { return l||r; },
    
    '.': function(l, r) { return l[r]; },
    '[': function(l, r) { return l[r]; }
  };
  
  var ternaryOperators = {
    '?': function(f, s, t) { return f ? s : t; },
    '(': function(f, s, t) { return f[s].apply(f, t) }
  };

  var make_eval = function() {
    var locals;
    var evaluate = function(tree) {
      var arity = tree.arity
        , first = tree.first && !Array.isArray(tree.first) && evaluate(tree.first)
        , second = tree.second && evaluate(tree.second)
        , third = tree.third && evaluate(tree.third)
        , isArray, val
        , value = tree.value
        ;
      
      //Array or Object literal
      if(Array.isArray(tree.first)){
        first = tree.first;
        isArray = value === '[';
        var val = isArray ? [] : {};
        for(var i = 0, l = first.length; i < l; i++){
          isArray ? val.push(evaluate(first[i])) : val[first[i].key] = evaluate(first[i]);
        }
        return val;
      }
      
      switch(arity){
        case 'unary': 
          return unaryOperators[value](first);
        break;
        case 'binary':
          return binaryOperators[value](first, second);
        break;
        case 'ternary':
          return ternaryOperators[value](first, second, third);
        break;
        case 'literal':
          return value;
        case 'name':
          return locals[value]
        break;
      }
    };
    
    return function(tree, local) {
      locals = local || {};
      return evaluate(tree);
    }
  };
  
  var parse = make_parse();
  
  parse.evaluate = make_eval();
  
  Ant.parse = parse;
})(Ant);