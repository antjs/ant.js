var test = require('tape')
var Ant = require('../');
var $ = require('jquery');

test('构造函数', function(t) {
  t.equal(typeof Ant, 'function');
  t.equal(typeof Ant.extend, 'function');
  t.equal(typeof Ant.prototype.on, 'function');
  t.equal(typeof Ant.prototype.off, 'function');
  t.equal(typeof Ant.prototype.trigger, 'function');
  t.equal(typeof Ant.prototype.render, 'function');
  t.equal(typeof Ant.prototype.set, 'function');
  t.equal(typeof Ant.prototype.get, 'function');
  t.equal(typeof Ant.prototype.clone, 'function');
  t.end();
});

test('模板语法', function(t) {
  t.test('a-if', function(t) {
    var tpl = '<span a-if=true>{{val}}</span>'
      ;
    var Bee = Ant.extend({defaults: { data: {key: true, val: 1234} }});

    t.test('单个变量', function(t) {
      var tpl = '<span a-if=key>{{val}}</span>';
      var b = new Bee(tpl);
      t.ok(b.el.innerHTML);
      b.set('key', false);
      t.notOk(b.el.innerHTML);

      b.set('key', 123);
      t.ok(b.el.innerHTML);

      t.end();
    });
    t.test('直接量', function(t) {
      var b = new Bee(tpl);
      t.ok(b.el.innerHTML);
      
      t.end();
    });
    t.test('表达式', function(t) {
      var tpl = '<span a-if="key && key2 || key3">{{val}}</span>';
      var b = new Bee(tpl);
      t.notOk(b.el.innerHTML);
      b.set('key2', true);
      t.ok(b.el.innerHTML);

      b.set('key2', 0);
      t.notOk(b.el.innerHTML);
      b.set('key3', 1);
      t.ok(b.el.innerHTML);
      
      t.end();
    });
  });


  t.test('a-repeat 属性', function(t) {
    var tpl = '<li a-repeat="item in list">{{item}}</li>'
      , data = {list: ['ant', 'bee']}
      , ant = new Ant(tpl, {data: data});
      ;
    
    //检查列表长度及内容
    function check(els, arr, opts) {
      opts = opts || {};
      var prefix = opts.prefix || ''
        , postfix = postfix || ''
        , key = opts.key
        ;
      t.equal(els.length, arr.length);
      for(var i = 0, l = arr.length; i < l; i++){
        t.equal(els[i].innerHTML, prefix + (key ? arr[i][key] : arr[i]) + postfix);
      }
    }
    
    t.test('基本列表', function(t) {
      check(ant.el.getElementsByTagName('li'), data.list);
      t.end();
    });


    t.test('数组方法', function(t) {
      t.test('.push', function(t) {
        var el = ant.el.getElementsByTagName('li')[0];
        
        ant.data.list.push('cicada');
        check(ant.el.getElementsByTagName('li'), ant.data.list);
        
        //push 操作应该不影响原有的列表元素
        t.equal(el, ant.el.getElementsByTagName('li')[0]);

        t.end();
      });
      
      t.test('.pop', function(t) {
        var el = ant.el.getElementsByTagName('li')[0];
        
        ant.data.list.pop();
        check(ant.el.getElementsByTagName('li'), ant.data.list);
        
        t.equal(el, ant.el.getElementsByTagName('li')[0]);

        t.end();
      });
      
      t.test('.unshift', function(t) {
        var el = ant.el.getElementsByTagName('li')[0];
        
        ant.data.list.unshift('000');
        check(ant.el.getElementsByTagName('li'), ant.data.list);
        
        t.equal(el, ant.el.getElementsByTagName('li')[1]);

        t.end();
      });
      
      t.test('.shift', function(t) {
        var el = ant.el.getElementsByTagName('li')[1];
        
        ant.data.list.shift();
        check(ant.el.getElementsByTagName('li'), ant.data.list);
        
        t.equal(el, ant.el.getElementsByTagName('li')[0]);

        t.end();
      });
      
      t.test('.reverse', function(t) {
        var el = ant.el.getElementsByTagName('li')[0];
        
        ant.data.list.reverse();
        check(ant.el.getElementsByTagName('li'), ant.data.list);
        
        t.equal(el, ant.el.getElementsByTagName('li')[ant.data.list.length - 1]);

        t.end();
      });
      
      t.test('.sort', function(t) {
        var el = ant.el.getElementsByTagName('li')[0];
        
        ant.data.list.sort();
        check(ant.el.getElementsByTagName('li'), ant.data.list);
        
        t.end();
      });
      
      t.test('.splice', function(t) {
        t.test('splice()', function(t) {
          var el = ant.el.getElementsByTagName('li')[0];
          
          ant.data.list.splice();
          check(ant.el.getElementsByTagName('li'), ant.data.list);
          
          t.equal(el, ant.el.getElementsByTagName('li')[0]);

          t.end();
        });
        
        t.test('splice(2, 0, "cicada")', function(t) {
          var el = ant.el.getElementsByTagName('li')[0];
          
          ant.data.list.splice(2, 0, 'cicada');
          check(ant.el.getElementsByTagName('li'), ant.data.list);
          
          t.equal(el, ant.el.getElementsByTagName('li')[0]);

          t.end();
        });
        
        t.test('splice(2, 1)', function(t) {
          var el = ant.el.getElementsByTagName('li')[0];
          
          ant.data.list.splice(2, 1);
          check(ant.el.getElementsByTagName('li'), ant.data.list);
          
          t.equal(el, ant.el.getElementsByTagName('li')[0]);

          t.end();
        });
        
        t.test('splice(0, 0, "000")', function(t) {
          var el = ant.el.getElementsByTagName('li')[0];
          
          ant.data.list.splice(0, 0, "000");
          check(ant.el.getElementsByTagName('li'), ant.data.list);
          
          t.equal(el, ant.el.getElementsByTagName('li')[1]);

          t.end();
        });
        
        t.test('splice(0, 1, "111")', function(t) {
          var el = ant.el.getElementsByTagName('li')[1];
          
          ant.data.list.splice(0, 1, "111");
          check(ant.el.getElementsByTagName('li'), ant.data.list);
          
          t.equal(el, ant.el.getElementsByTagName('li')[1]);

          t.end();
        });
        
      });
      
    });
    
    t.test('一个数组对应多个 DOM 列表', function(t) {
      var tpl = '<ul class="list0"><li a-repeat="item in list">{{item}}</li></ul><ul class="list1"><li a-repeat="item in list">{{item}}</li></ul>'
        , ant = new Ant(tpl, {data: data})
        ;
       
      function listCheck(key){
        check(ant.el.getElementsByTagName('ul')[0].getElementsByTagName('li'), ant.data.list, {key: key});
        check(ant.el.getElementsByTagName('ul')[1].getElementsByTagName('li'), ant.data.list, {key: key});
      }
       
      t.test('基本渲染情况', function(t){
        listCheck();

        t.end();
      });
      
      t.test('修改数组: .push', function(t) {
        ant.data.list.push('cicada');
        listCheck();

        t.end();
      });
      
      t.test('修改数组: .reverse', function(t) {
        ant.data.list.reverse();
        listCheck();

        t.end();
      });
      
      //Phantomjs failed. pass it
      //if(typeof navigator === 'undefined' || !/PhantomJS/.test(navigator.userAgent)){
        t.test('修改数组: .set', function(t) {
          ant.set('list[0]', 'ANT');
          listCheck();

          t.end();
        });
      //}
      
      t.test('替换数组', function(t){
        ant.set('list', data.list);
        listCheck();

        t.end();
      })
    });
    
    
    t.test('同时拥有 repeat 和 if 属性', function(t) {
      var data = {
        list: [
          {
            name: 'ant'
          , state: true
          }
        , {
            name: 'bee'
          , state: false
          }
        ]
      };
      var tpl = '<ul class="list0"><li a-repeat="item in list" a-if="item.state">{{item.name}}</li></ul>';
      var ant = new Ant(tpl, {data: data});
      
      function listCheck(){
        var vlist = [];
        ant.data.list.forEach(function(item){
          item.state && vlist.push(item)
        });
        check(ant.el.getElementsByTagName('ul')[0].getElementsByTagName('li'), vlist, {key: 'name'});
      }
      
      t.test('基本渲染情况', function(t) {
        listCheck();

        t.end();
      });
      
      t.test('修改数组: .push', function(t) {
        ant.data.list.push({name: 'cicada', state: true});
        listCheck();

        t.end();
      });
      t.test('修改数组: .set', function(t) {
        ant.set('list[0].name', 'Ant');
        listCheck();

        t.end();
      });
      
      t.test('修改状态: true -> false', function(t) {
        ant.set('list[0].state', false);
        listCheck();

        t.end();
      });
      
      t.test('修改状态: false -> true', function(t) {
        ant.set('list[0].state', true);
        listCheck();

        t.end();
      });
      
      0 && t.test('替换数组并更改状态', function(t){
        var list = data.list.slice();
        list[0].state = false;
        list[1].state = true;
        list.push({state: true, name: 'cicada'});
        ant.set('list', list);
        listCheck();
        ant.set('list[1].name', 'Bee');
        listCheck();

        t.end();
      })
      
    });

    t.test('深度变量', function(t) {
      var tpl = '<li a-repeat="item in path.list">{{item}}</li>'
        , data = {path: {list: ['ant', 'bee']}}
        , ant = new Ant(tpl, {data: data})
        ;

        check(ant.el.getElementsByTagName('li'), data.path.list);

        t.end();
    });
    
    t.test('多层数组', function(t) {
      var tpl = '\
          <li a-repeat="p in province"><span>{{p.name}}</span>\
            <ul>\
              <li a-repeat="c in city"><span>{{c.name}}</span>\
            </ul>\
          </li>\
          '
        , data = {province: [{name: '天际', city: [{name: '独孤城'}]}]}
        , ant = new Ant(tpl, {data: data})
        ;
        
      //TODO
      t.end()
    })
  });

  t.test

})
