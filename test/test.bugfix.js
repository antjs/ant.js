var test = require('tape');
var Ant = require('../');
var $ = require('jquery')(typeof window === 'undefined' ? Ant.doc.parentWindow : window);

test('bug fix', function(t) {
  t.test('a-repeat 中的 a-model. #6', function(t) {
    var tpl = '<form a-repeat="r in list">\
            <input type="radio" a-model="r.radio" value="red" name="rd" />\
            <input type="radio" a-model="r.radio" value="blue" name="rd" />\
            <input type="radio" a-model="r.radio" value="green" name="rd" />\
          </form>'
      , ant = new Ant(tpl, {
          data: {
            list : [{radio : 'red'}]
          }
        })
      ;
    var $input = $(ant.el).find('input');
    t.ok($input[0].checked, '初始红色选中');
    t.notOk($input[1].checked, '初始蓝色未选中');
    t.notOk($input[2].checked, '初始绿色未选中');
    
    ant.set('list[0].radio', 'blue')
    
    t.notOk($input[0].checked, '红色未选中');
    t.ok($input[1].checked, '蓝色选中');
    t.notOk($input[2].checked, '绿色未选中');
    t.equal(ant.data.list[0].radio, $input[1].value);
    
    t.end();
  });
});