var Ant = require('../')
  , fs = require('fs')
  , template = '<div>{{name}}</div>'
  ;
  
var ant = new Ant(template, {data: {name: 'Ant'}});

console.log(ant.el.outerHTML);

ant.set('name', 'Bee');

console.log(ant.el.outerHTML);

var html = fs.readFileSync(__dirname + '/2-way-binding.html', 'utf8');

console.log(new Ant(html, {data: {text: 'Ant'}}).el.innerHTML);