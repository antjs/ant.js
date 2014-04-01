if(typeof require === 'function' && typeof exports === 'object'){
  expect = require('expect.js');
  Ant = require('../');
  //$ = require('jquery');
  console.log('node test start');
}else{
  typeof console === 'object' && console.log('browser test start');
}

var evalu = Ant._eval;
var parse = Ant._parse;

describe('内置 filters', function() {
  it('capitalize', function() {
    
  })
});
