var Ant = require('../')
  , template = '<div>{{name}}</div>'
  ;
  
var ant = new Ant(template, {data: {name: 'Ant'}});

console.log(ant.el.outerHTML);

ant.set('name', 'Bee');

console.log(ant.el.outerHTML);