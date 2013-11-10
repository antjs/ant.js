if(typeof require === 'function' && typeof exports === 'object'){
  expect = require('expect.js');
  Ant = require('../');
  console.log('node test start');
}else{
  typeof console === 'object' && console.log('browser test start');
}

var parse = Ant.parse;
var evalu = parse.evaluate;

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
});

describe('variable 变量', function() {
  it('parse: a + b', function() {
    var l = {};
    parse('a + b', l);
    expect(l.a).to.be.ok();
    expect(l.b).to.be.ok();
  });
  it('parse: a.abc', function() {
    var l = {};
    parse('a.abc', l);
    expect(l.a).to.be.ok();
    expect(l.abc).to.not.be.ok();
  });
  it('parse: a[abc]', function() {
    var l = {};
    parse('a[abc]', l);
    expect(l.a).to.be.ok();
    expect(l.abc).to.be.ok();
  });
  it('parse: a["abc"]', function() {
    var l = {};
    parse('a["abc"]', l);
    expect(l.a).to.be.ok();
    expect(l.abc).to.not.be.ok();
  });
});

