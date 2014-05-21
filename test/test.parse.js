if(typeof require === 'function' && typeof exports === 'object'){
  expect = require('expect.js');
  Ant = require('../');
  console.log('node test start');
}else{
  typeof console === 'object' && console.log('browser test start');
}

var evalu = Ant._eval;
var parse = Ant._parse;

describe('literal 直接量', function() {
  it('Number: 1', function() {
    expect(evalu(parse('1'))).to.be(1);
  });
  it('Number: 1.2', function() {
    expect(evalu(parse('1.2'))).to.be(1.2);
  });
  it('String: "a"', function() {
    expect(evalu(parse('"a"'))).to.be("a");
  });
  it("String: 'ab'", function() {
    expect(evalu(parse("'ab'"))).to.be("ab");
  });
  it("String: 'a\"b'", function() {
    expect(evalu(parse("'a\"b'"))).to.be("a\"b");
  });
  it("String: 'a\\'b'", function() {
    expect(evalu(parse("'a\\\'b'"))).to.be("a\'b");
  });
  it('String: "a\\"b"', function() {
    expect(evalu(parse('"a\\\"b"'))).to.be("a\"b");
  });
  it('Array: []', function() {
    var a = evalu(parse("[]"));
    expect(Array.isArray(a)).to.be.ok();
    expect(a.length).to.be(0);
  });
  it('Array: [1, "2"]', function() {
    var a = evalu(parse('[1, "2"]'));
    expect(Array.isArray(a)).to.be.ok();
    expect(a[0]).to.be(1);
    expect(a[1]).to.be("2");
    expect(a.length).to.be(2);
  });
  
  describe('字符串中的符号', function() {
    var symbols = ["+", "-", "*", "/", "true", "false", "%"]
    symbols.forEach(function(s) {
      it('String: ' + s, function() {
        expect(evalu(parse('"' + s + '"'))).to.be(s);
      })
    })
  })
});

describe('variable 变量', function() {
  // it('parse: a + b', function() {
    // var l = {};
    // parse('a + b', function(key, type) {
      // l[key] = type
    // });
    // expect(l.a).to.be.ok();
    // expect(l.b).to.be.ok();
  // });
  // it('parse: a.abc', function() {
    // var l = {};
    // parse('a.abc', function(key, type) {
      // l[key] = type
    // });
    // expect(l.a).to.be.ok();
    // expect(l.abc).to.not.be.ok();
  // });
  // it('parse: a[abc]', function() {
    // var l = {};
    // parse('a[abc]', function(key, type) {
      // l[key] = type
    // });
    // expect(l.a).to.be.ok();
    // expect(l.abc).to.be.ok();
  // });
  // it('parse: a["abc"]', function() {
    // var l = {};
    // parse('a["abc"]', function(key, type) {
      // l[key] = type
    // });
    // expect(l.a).to.be.ok();
    // expect(l.abc).to.not.be.ok();
  // });
});

describe('expression 表达式', function() {
  var exps = [
    '1 + 1'
  , '-1 + 2'
  , '1.2 + 500 + 30'
  , '23 - 12 + -3 - 4'
  , '1.5 * 3'
  , '1 + 5 * 2'
  , '(1 + 3) * 3'
  , '3 / 4'
  , '2 * 6 / 3'
   , '2 % 3'
  , '2 % 4'
  , '4 % 2'
  , '4 % 3'
  , '"123" - "234"'
  , '"a" + 1'
  , '"123" + "234"'
  , '"123" && "234"'
  , '1 && "234"'
  , '1 && 12'
  , '0 && 12'
  , '0 || 1'
  , '0 && 12 || 1'
  , '1 || 0 && 51'
  , '0 ? 12 : 4'
  , '-1 ? 12 : 4'
  
  , '"a" - 1'
  , '"a" + "b"'
  
  , '"2" == 2'
  , '"a" === 2'
  
  , '"0" !== 0'
  , '"0" != 2'
  ];
  for(var i = 0, l = exps.length; i < l; i++){
    (function(i){
      var val = eval(exps[i]);
      it(exps[i] + ' = ' + val, function() {
        if(isNaN(val)){
          expect(isNaN(evalu(parse(exps[i])))).to.be.ok();
        }else{
          expect(evalu(parse(exps[i]))).to.be(val);
        }
      });
    })(i)
  }
});

describe('locals', function() {
  it('23 | filter:abc', function() {
    var locals = {
      locals: {a: 1, b: 1, c:1}
    , filters: {filter: 1, fi: 1}
    , paths: {'a.b': 1, 'b.c': 1, b: 1, 'a.bc': 1, 'c.0': 1}
    };
    var tree = parse('a.b + b["c"] * b | filter:a.bc |fi:[1]:c[0]', function(val, type) {
      expect(locals[type][val]).to.be.ok();
      delete locals[type][val];
    });
    expect(Object.keys(locals.locals).length).to.be(0);
    expect(Object.keys(locals.filters).length).to.be(0);
    expect(Object.keys(locals.paths).length).to.be(0);
  })
});