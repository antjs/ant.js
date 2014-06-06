var test = require('tape');
var Ant = require('../');
var $ = require('jquery')(typeof window === 'undefined' ? Ant.doc.createWindow() : window);

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
      
      t.test('修改数组: .set', function(t) {
        ant.set('list[0]', 'ANT');
        listCheck();

        t.end();
      });
      
      t.test('替换数组', function(t){
        ant.set('list', data.list);
        listCheck();

        t.end();
      });
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
      
      //TODO
      /* t.test('替换数组并更改状态', function(t){
        var list = data.list.slice();
        list[0].state = false;
        list[1].state = true;
        list.push({state: true, name: 'cicada'});
        ant.set('list', list);
        listCheck();
        ant.set('list[1].name', 'Bee');
        listCheck();

        t.end();
      }) */
      
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

  t.test('非转义模板 {{{token}}}', function(t) {
    var tpl = 'This is a unescape code: <span>{{{unescape}}}</span> !!'
      , html = '...<span>1</span><code>222</code>..'
      ;
    var ant = new Ant(tpl, {data: {unescape: html}});
    t.equal(ant.el.innerHTML.toLowerCase(), tpl.replace(/{{{unescape}}}/, html).toLowerCase());
    
    t.end();
  });
  
  t.test('子模板', function(t) {
    var prefix = '下面有个子节点: ', postfix = ' !'
      , getTpl = function(unescape){
          var partial = unescape ? '{{{>content}}}' : '{{> content}}';
          return '<h1>父模板</h1><p>' + prefix + partial + postfix + '</p>';
        }
      , content = '-- <span>这里是子节点, 里面可以包含变量标签: </span>{{title}}<span>。。。</span> --'
      , ant
      ;
      
    t.test('字符串子模板, {{>partial}}', function(t) {
      ant = new Ant(getTpl(), {
        data: {
          title: '标题'
        }
      , partials: {
          content: content
        }
      });
      t.equal($('p', ant.el).text(), prefix + content.replace('{{title}}', ant.data.title) + postfix);
      t.end();
    });
    
    t.test('字符串非转义子模板, {{{>partial}}}', function(t) {
      
      ant = new Ant(getTpl(true), {
        data: {
          title: '标题'
        }
      , partials: {
          content: content
        }
      });
      t.equal($('p', ant.el).html().toLowerCase(), prefix + content.replace('{{title}}', ant.data.title) + postfix);
      
      t.end();
    });
    
    t.test('DOM 子模板', function(t) {
      var content = Ant.doc.createElement('div');
      var html = content.innerHTML = '<span>{{title}}</span><pre>这里是子节点</pre>';
      ant = new Ant(getTpl(), {
        data: {
          title: '标题'
        }
      , partials: {
          content: content
        }
      });
      t.equal($('p>div', ant.el)[0], content);
      t.equal(content.innerHTML.toLowerCase(), html.replace('{{title}}', ant.data.title));
      
      t.end();
    });

   /*  t.test('Ant 子模板', function(t) {
      var Child = Ant.extend({
        getTitle: function() {
          return this.data.title;
        }
      });
      var tpl = '<span>{{title}}</span><pre>这里是子节点</pre>';
      var child = new Child(tpl);
      
      ant = new Ant(getTpl(), {
        data: {
          title: '标题'
        }
      , partials: {
          content: child
        }
      });
      
      t.equal($('p>div', ant.el)[0], child.el);
      t.equal(child.el.innerHTML.toLowerCase(), tpl.replace('{{title}}', ant.data.title));
      
      t.end();
    }); */
    
    t.test('子模板根元素带有 repeat 属性', function(t) {
      var content = '<span>{{title}}</span><span class=repeat a-repeat="item in list">{{item}}</span>'
        , ant = new Ant(getTpl(true), {
            data: {
              title: 'Ant'
            , list: ['1', '2']
            }
          , partials: {
              content: content
            }
          })
        ;
      var partial = $('p', ant.el)[0]
        , repeats = $('.repeat', partial)
        , span
        ;
      t.equal(repeats.length, ant.data.list.length);
      for(var i = 0, l = repeats.length; i < l; i++){
        span = repeats[i];
        t.equal(span.innerHTML, ant.data.list[i]);
      };
      
      t.end();
    });
    
    t.test('异常情况: 有子模板标记, 没有子模板数据', function(t) {
      var ant = new Ant(getTpl(), {
        data: {}
      });
      t.equal($('p', ant.el).text(), prefix + postfix);
      
      t.end();
    });
    
    t.test('延时添加子模板. ant.addPartial', function(t) {
      var ant = new Ant(getTpl(), {
        data: {title: 'Ant'}
      });
      ant.setPartial({
        name: 'content'
      , content: content
      });
      t.equal($('p', ant.el).text(), prefix + content.replace('{{title}}', ant.data.title) + postfix);
      
      t.end();
    })
  });

  t.test('属性模板', function(t){  
    t.test('普通属性及 "a-" 前缀属性', function(t) {
      var tpl = '<span data-test="{{test}}" a-style="width:{{width}}px" a-class="{{className}}"></span>'
      t.test('带有 "a-" 前缀的非 ant 功能属性在渲染后, 将会被转成正常属性', function() {
        var ant = new Ant(tpl, {
              data: {
                test: '测试'
              , width: 10
              , className: 'sun'
              }
            })
          , el = (ant.el).children[0]
          ;
        
        t.notOk(el.getAttribute('a-style'));
        t.ok(el.getAttribute('style'));
        t.notOk(el.getAttribute('a-class'));
        t.ok(el.className);
        t.equal(el.getAttribute('data-test'), ant.data.test);
        t.equal(el.style.width, ant.data.width + 'px');
        t.equal(el.className, ant.data.className);
      
        t.end();
      })
    });

    //v 0.3 不再支持
    /* t.test('属性名', function(t){
      t.test('独占属性 <span {{attr}}>{{text}}</span>', function(t){
        var tpl = '<span {{attr}}>{{text}}</span>'
        var data = {attr: 'attr', text: 'test'};
        var ant = new Ant(tpl, {
          data: data
        });
        var el = (ant.el).children[0];

        t.notEqual(el.getAttribute(ant.data.attr), null);
        t.equal(el.getAttribute('{{attr}}'), null);
        t.equal(el.innerHTML, ant.data.text);

        ant.set('attr', 'otherattr');

        t.notEqual(el.getAttribute(ant.data.attr), null);
        t.equal(el.getAttribute('{{attr}}'), null);
        t.equal(el.innerHTML, ant.data.text);
      
        t.end();
      });

    return;
    
      it('混合属性名 <span data-{{attr}}-attr>{{text}}</span>', function(){
        var tpl = '<span data-{{attr}}-attr>{{text}}</span>'
        var data = {attr: 'attr', text: 'test'};
        var ant = new Ant(tpl, {
          data: data
        });
        var el = (ant.el).children[0];

        expect(el.getAttribute('data-' + ant.data.attr + '-attr')).to.not.be(null);
        expect(el.getAttribute('data-{{attr}}-attr')).to.be(null);
        expect(el.innerHTML).to.be(ant.data.text);

        ant.set('attr', 'otherattr');

        expect(el.getAttribute('data-' + ant.data.attr + '-attr')).to.not.be(null);
        expect(el.getAttribute('data-{{attr}}-attr')).to.be(null);
        expect(el.innerHTML).to.be(ant.data.text);
      });

      it('条件属性 <input disabled?={{condition}} />', function(){
        var tpl = '<input disabled?={{condition}} />'
        var ant = new Ant(tpl, {
          data: {
            condition: true
          }
        });

        var el = (ant.el).children[0];

        expect(el.getAttribute('disabled')).to.not.be(null);
        expect(el.disabled).to.be.ok();

        ant.set('condition', false);


        expect(el.disabled).to.not.be.ok();
        (function(){
          this.oldIE ||expect(el.getAttributeNode('disabled')).to.be(null);
        })();
      });

      it('模板标识同时存在于属性名及属性值中 <div data-{{attr}}={{val}}></div>', function(){
        var tpl = '<div data-{{attr}}={{val}}></div>'
        var data = {attr: 'value', val: 'abc'};
        var ant = new Ant(tpl, {
          data: data
        });

        var el = (ant.el).children[0];

        expect(el.getAttribute('data-{{attr}}')).to.be(null);
        expect(el.getAttribute('data-' + data.attr)).to.be(data.val);

        var data2 = {attr: 'attttt', val: '8888888'};
        ant.set(data2);
        expect(el.getAttribute('data-' + data.attr)).to.be(null);        
        expect(el.getAttribute('data-' + data2.attr)).to.be(data2.val);

      });
    }) */
  });

});

test('ant.watch / ant.unwatch', function(t) {
  var ant = new Ant({data: {}})
    , val1, val2
    ;

  function clean () {
    val1 = void(0);
    val2 = void(0);
  }
    
  var watcher = function(newVal, oldVal) {
    val1 = newVal;
    val2 = oldVal;
  };

  ant.watch('key', watcher);
  t.test('base watch', function(t){
    ant.set('key', 'abc');
    t.equal(val1, 'abc');
    
    clean ();
    t.end();
  });
  
  t.test('deep watch', function(t) {
    ant.watch('path.val', function(newVal, oldVal) {
      val1 = newVal;
      val2 = oldVal;
    });
    ant.set('path.val', '123');
    t.equal(val1, '123');
    
    clean ();
    t.end();
  });
  
  t.test('bubbling', function(t) {
    ant.watch('path', function(newVal, oldVal) {
      console.log(newVal);
      console.log(oldVal);
      val1 = newVal;
      val2 = oldVal;
    });
    
    ant.set('path.val2', 'Zz');
    t.equal(val1.val2, 'Zz', '1');
    
    clean ();
    
    ant.set('path.val2', 'Aa');
    t.equal(val1.val2, 'Aa', '2');
    
    clean ();
    t.end();
  });
  
  t.test('unwatch', function(t) {
    ant.set('key', 'ant');
    t.equal(val1, 'ant');
    ant.unwatch('key', watcher);
    ant.set('key', 'unwatch');
    t.equal(val1, 'ant', 'unwatch 之后');
    
    t.end();
  });
});
