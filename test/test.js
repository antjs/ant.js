if(typeof require === 'function' && typeof exports === 'object'){
  expect = require('expect.js');
  Ant = require('../');
  console.log('node test start');
}else{
  typeof console === 'object' && console.log('browser test start');
}

var doc = Ant.doc;

//hacks for IE6/7/8
function _$(selector, context){
  return typeof $ === 'function' ? $(selector, context).get() : context.querySelectorAll(selector);
}

function getText(el){
  return typeof $ === 'function' ? $(el).text() : el.textContent;
}

describe('接口可用性', function() {
  it('Ant 基本接口', function() {
    var ant = new Ant('');
    expect(Ant).to.be.a('function');
    expect(Ant.extend).to.be.a('function');
    expect(ant.on).to.be.a('function');
    expect(ant.off).to.be.a('function');
    expect(ant.trigger).to.be.a('function');
    expect(ant.render).to.be.a('function');
    expect(ant.update).to.be.a('function');
    expect(ant.set).to.be.a('function');
    expect(ant.get).to.be.a('function');
    expect(ant.clone).to.be.a('function');
  });
});

describe('实例接口', function(){
  var tpl = '{{person}} - {{person.name}}';
  var ant = new Ant(tpl);
  //doc.body.appendChild(ant.el);
  it('ant.el', function() {
    expect(ant.el.nodeName).to.be('DIV');
    expect(ant.el.innerHTML).to.be(tpl);
  });
  
  it('ant.clone', function() {
    var ant1 = ant.clone();
    expect(ant1.el.nodeName).to.be('DIV');
    expect(ant1.el.innerHTML).to.be(tpl);
    expect(ant1.el).not.to.be(ant.el);
  });
  
  describe('ant.set', function() {
    var ant = new Ant(tpl)
      , val0 = 'ant', path0 = 'person';
    it('基本 ant.set(name, val)', function() {
      ant.set(path0, val0);
      expect(ant.get(path0)).to.be(val0);
    });
    
    var val1 = 'ant', path1 = 'path.to';
    it('深度 ant.set(path.name, val)', function() {
      ant.set(path1, val1);
      expect(ant.get(path1)).to.be(val1);
    });
    
    var path2 = 'path1.to', val2 = {};
    it('set 一个对象 ant.set(path, obj)', function() {
      ant.set(path2, val2);
      expect(JSON.stringify(ant.get(path2))).to.be(JSON.stringify(val2));
    });
    
    var path3 = 'person.name', val3 = 'Ant';
    it('将基本类型数据当做父节点', function() {
      ant.set(path3, val3);
      expect(ant.get('person') + '').to.be(val0);
      expect(ant.get(path3)).to.be(val3);
    });
    
    var o0 = {age: 25}, o1 = {to1: 'Bee'}, o2 = {to: 'Cyn'}
      , o = {person: o0, path: o1, path1: o2}
    it('扩展 ant.set(obj)', function() {
      var o3 = ant.data.person
        , o4 = ant.data.path
        , o5 = ant.data.path1
        ;
      ant.set(o);
      expect(ant.data.person).to.be(o3);
      expect(ant.data.path).to.be(o4);
      expect(ant.data.path1).to.be(o5);
      expect(ant.data.path.to1).to.be('Bee');
      expect(ant.data.path.to).to.be(val1);
      expect(ant.data.path1.to).to.be('Cyn');
      expect(ant.data.person.age).to.be(25);
      expect(ant.data.person.name).to.be(val3);
      expect(ant.data.person + '').to.be(val0);
    });
    
    it('替换 ant.set(obj, {isExtend: false})', function() {
      ant.set({only: 1}, {isExtend: false});
      expect(ant.data.person).to.be();
      expect(ant.data.path).to.be();
      expect(ant.data.only).to.be(1);
    });
    
    it('ant.set, opt.silence', function(done) {
      var handler = function(data) {
        if(data.silence){
          throw new Error('不应触发 update 事件');
        }else{
          done();
        }
      };
      ant.on('update', handler);
      ant.set('silence', true, {silence: true});
      expect(ant.data.silence).to.be(true);
      ant.set('silence', false);
      expect(ant.data.silence).to.be(false);
      ant.off('update', handler);
    });
    
    it('ant.isRendered. 调用 ant.render 前', function() {
      expect(ant.isRendered).to.be(false);
    });
    it('ant.data 是绑定数据的一个拷贝', function() {
      var arr = [1, 2]
        , data = {abc: 234, arr1: arr, arr2: arr}
        ;
      ant.render(data);
      expect(ant.data).not.to.be(data);
      expect(JSON.stringify(ant.data)).to.be(JSON.stringify(data));
      expect(ant.data.arr1).not.to.be(arr);
      expect(ant.data.arr2).not.to.be(arr);
      expect(ant.data.arr1).not.to.be(ant.data.arr2);
    });
    it('ant.isRendered. 调用 ant.render 后', function() {
      expect(ant.isRendered).to.be(true);
    });
    
    it('包含数组内容.', function() {
      var ant = new Ant('', {data: {}});
      ant.set('list', []);
      expect(ant.data.list.__ant__).to.be.ok();
      ant.set('path.list', []);
      expect(ant.data.path.list.__ant__).to.be.ok();
      ant.set({'list1': []});
      expect(ant.data.list1.__ant__).to.be.ok();
      ant.set({path: {list1: []}});
      expect(ant.data.path.list1.__ant__).to.be.ok();
    });
    
  });
  
  describe('filters', function() {
    var tpl = '{{path | twice}}'
      , twice = function(val) {
          return val * 2;
        }
      , ant
      ;
    
    it('new Ant("tpl", { filters: {} })', function() {
      ant = new Ant(tpl, {filters: {
        twice: twice
      }, data: {path: 5}});
      expect(ant.el.innerHTML).to.be('10');
    });
    
    it('ant.setFilter', function() {
      ant = new Ant(tpl);
      ant.setFilter('twice', twice);
      ant.render({path: 5});
      expect(ant.el.innerHTML).to.be('10');
    });
    
    // it('ant.getFilter', function() {
      // expect(ant.getFilter('twice')).to.be(twice);
    // });
    it('ant.removeFilter', function() {
      ant.removeFilter('twice');
      expect(ant._filters['twice']).to.be(undefined);
    });
  });
});

describe('模板语法', function() {
  describe('a-repeat 属性', function() {
    var tpl = '<li a-repeat={{list}}>{{.}}</li>'
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
      expect(els.length).to.be(arr.length);
      for(var i = 0, l = arr.length; i < l; i++){
        expect(els[i].innerHTML).to.be(prefix + (key ? arr[i][key] : arr[i]) + postfix);
      }
    }
    
    it('基本列表', function() {
      check(ant.el.getElementsByTagName('li'), data.list);
    });
    
    describe('数组方法', function() {
      it('.push', function() {
        var el = ant.el.getElementsByTagName('li')[0];
        
        ant.data.list.push('cicada');
        check(ant.el.getElementsByTagName('li'), ant.data.list);
        
        //push 操作应该不影响原有的列表元素
        expect(el).to.be(ant.el.getElementsByTagName('li')[0]);
      });
      
      it('.pop', function() {
        var el = ant.el.getElementsByTagName('li')[0];
        
        ant.data.list.pop();
        check(ant.el.getElementsByTagName('li'), ant.data.list);
        
        expect(el).to.be(ant.el.getElementsByTagName('li')[0]);
      });
      
      it('.unshift', function() {
        var el = ant.el.getElementsByTagName('li')[0];
        
        ant.data.list.unshift('000');
        check(ant.el.getElementsByTagName('li'), ant.data.list);
        
        expect(el).to.be(ant.el.getElementsByTagName('li')[1]);
      });
      
      it('.shift', function() {
        var el = ant.el.getElementsByTagName('li')[1];
        
        ant.data.list.shift();
        check(ant.el.getElementsByTagName('li'), ant.data.list);
        
        expect(el).to.be(ant.el.getElementsByTagName('li')[0]);
      });
      
      it('.reverse', function() {
        var el = ant.el.getElementsByTagName('li')[0];
        
        ant.data.list.reverse();
        check(ant.el.getElementsByTagName('li'), ant.data.list);
        
        expect(el).to.be(ant.el.getElementsByTagName('li')[ant.data.list.length - 1]);
      });
      
      it('.sort', function() {
        var el = ant.el.getElementsByTagName('li')[0];
        
        ant.data.list.sort();
        check(ant.el.getElementsByTagName('li'), ant.data.list);
        
        //TODO
      });
      
      describe('.splice', function() {
        it('splice()', function() {
          var el = ant.el.getElementsByTagName('li')[0];
          
          ant.data.list.splice();
          check(ant.el.getElementsByTagName('li'), ant.data.list);
          
          expect(el).to.be(ant.el.getElementsByTagName('li')[0]);
        });
        
        it('splice(2, 0, "cicada")', function() {
          var el = ant.el.getElementsByTagName('li')[0];
          
          ant.data.list.splice(2, 0, 'cicada');
          check(ant.el.getElementsByTagName('li'), ant.data.list);
          
          expect(el).to.be(ant.el.getElementsByTagName('li')[0]);
        });
        
        it('splice(2, 1)', function() {
          var el = ant.el.getElementsByTagName('li')[0];
          
          ant.data.list.splice(2, 1);
          check(ant.el.getElementsByTagName('li'), ant.data.list);
          
          expect(el).to.be(ant.el.getElementsByTagName('li')[0]);
        });
        
        it('splice(0, 0, "000")', function() {
          var el = ant.el.getElementsByTagName('li')[0];
          
          ant.data.list.splice(0, 0, "000");
          check(ant.el.getElementsByTagName('li'), ant.data.list);
          
          expect(el).to.be(ant.el.getElementsByTagName('li')[1]);
        });
        
        it('splice(0, 1, "111")', function() {
          var el = ant.el.getElementsByTagName('li')[1];
          
          ant.data.list.splice(0, 1, "111");
          check(ant.el.getElementsByTagName('li'), ant.data.list);
          
          expect(el).to.be(ant.el.getElementsByTagName('li')[1]);
        });
        
      });
      
    });
    
    describe('一个数组对应多个 DOM 列表', function() {
      var tpl = '<ul class="list0"><li a-repeat={{list}}>{{.}}</li></ul><ul class="list1"><li a-repeat={{list}}>{{.}}</li></ul>'
        , ant = new Ant(tpl, {data: data})
        ;
       
      function listCheck(key){
        check(ant.el.getElementsByTagName('ul')[0].getElementsByTagName('li'), ant.data.list, {key: key});
        check(ant.el.getElementsByTagName('ul')[1].getElementsByTagName('li'), ant.data.list, {key: key});
      }
       
      it('基本渲染情况', function(){
        listCheck();
      });
      
      it('修改数组: .push', function() {
        ant.data.list.push('cicada');
        listCheck();
      });
      
      it('修改数组: .reverse', function() {
        ant.data.list.reverse();
        listCheck();
      });
      
      //Phantomjs failed. pass it
      if(typeof navigator === 'undefined' || !/PhantomJS/.test(navigator.userAgent)){
        it('修改数组: .set', function() {
          ant.set('list[0]', 'ANT');
          listCheck();
        });
      }
      
      it('替换数组', function(){
        ant.set('list', data.list);
      })
    });
    
    
    describe('同时拥有 repeat 和 if 属性', function() {
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
      var tpl = '<ul class="list0"><li a-repeat={{list}} a-if={{state}}>{{name}}</li></ul>';
      var ant = new Ant(tpl, {data: data});
      
      function listCheck(){
        var vlist = [];
        ant.data.list.forEach(function(item){
          item.state && vlist.push(item)
        });
        check(ant.el.getElementsByTagName('ul')[0].getElementsByTagName('li'), vlist, {key: 'name'});
      }
      
      it('基本渲染情况', function() {
        listCheck();
      });
      
      it('修改数组: .push', function() {
        ant.data.list.push({name: 'cicada', state: true});
        listCheck();
      });
      it('修改数组: .set', function() {
        ant.set('list[0].name', 'Ant');
        listCheck();
      });
      
      it('修改状态: true -> false', function() {
        ant.set('list[0].state', false);
        listCheck();
      });
      
      it('修改状态: false -> true', function() {
        ant.set('list[0].state', true);
        listCheck();
      });
      
      it('替换数组并更改状态', function(){
        data.list[0].state = false;
        data.list[1].state = true;
        ant.set('list', data.list);
        listCheck();
        ant.set('list[1].name', 'Bee')
        listCheck();
      })
      
    });
  });
  
  it('非转义模板 {{{token}}}', function() {
    var tpl = 'This is a unescape code: <span>{{{unescape}}}</span> !!'
      , html = '...<span>1</span><code>222</code>..'
      ;
    var ant = new Ant(tpl, {data: {unescape: html}});
    expect(ant.el.innerHTML).to.be(tpl.replace(/{{{unescape}}}/, html));
  });
  
  describe('子模板', function() {
    var prefix = '下面有个子节点: ', postfix = ' !'
      , getTpl = function(unescape){
          var partial = unescape ? '{{{>content}}}' : '{{> content}}';
          return '<h1>父模板</h1><p>' + prefix + partial + postfix + '</p>';
        }
      , content = '-- <span>这里是子节点, 里面可以包含变量标签: </span>{{title}}<span>。。。</span> --'
      , ant
      ;
    it('字符串子模板, {{>partial}}', function() {
      ant = new Ant(getTpl(), {
        data: {
          title: '标题'
        }
      , partials: {
          content: content
        }
      });
      expect(getText(_$('p', ant.el)[0])).to.be(prefix + content.replace('{{title}}', ant.data.title) + postfix);
    });
    
    it('字符串非转义子模板, {{{>partial}}}', function() {
      
      ant = new Ant(getTpl(true), {
        data: {
          title: '标题'
        }
      , partials: {
          content: content
        }
      });
      expect(_$('p', ant.el)[0].innerHTML.toLowerCase()).to.be(prefix + content.replace('{{title}}', ant.data.title) + postfix);
    });
    
    it('DOM 子模板', function() {
      var content = doc.createElement('div');
      var html = content.innerHTML = '<span>{{title}}</span><pre>这里是子节点</pre>';
      ant = new Ant(getTpl(), {
        data: {
          title: '标题'
        }
      , partials: {
          content: content
        }
      });
      expect(_$('p>div', ant.el)[0]).to.be(content);
      expect(content.innerHTML.toLowerCase()).to.be(html.replace('{{title}}', ant.data.title))
    });
    
    0 && it('Ant 子模板', function() {
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
      
      //$('body').append(ant.el);
      
      expect(_$('p>div', ant.el)[0]).to.be(child.el);
      expect(child.el.innerHTML.toLowerCase()).to.be(tpl.replace('{{title}}', ant.data.title));
    });
    
    it('子模板根元素带有 repeat 属性', function() {
      var content = '<span>{{title}}</span><span class=repeat a-repeat={{list}}>{{.}}</span>'
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
      var partial = _$('p', ant.el)[0]
        , repeats = _$('.repeat', partial)
        , span
        ;
      expect(repeats.length).to.be(ant.data.list.length);
      for(var i = 0, l = repeats.length; i < l; i++){
        span = repeats[i];
        expect(span.innerHTML).to.be(ant.data.list[i]);
      };
    })
    
    it('异常情况: 有子模板标记, 没有子模板数据', function() {
      var ant = new Ant(getTpl(), {
        data: {}
      });
      expect(getText(_$('p', ant.el)[0])).to.be(prefix + postfix);
    });
    
    it('延时添加子模板. ant.addPartial', function() {
      var ant = new Ant(getTpl(), {
        data: {title: 'Ant'}
      });
      //doc.body.appendChild(ant.el);
      ant.setPartial({
        name: 'content'
      , content: content
      });
      expect(getText(_$('p', ant.el)[0])).to.be(prefix + content.replace('{{title}}', ant.data.title) + postfix);
    })
  });
  
  describe('"a-" 前缀属性', function() {
    var tpl = '<span data-test="{{test}}" a-style="width:{{width}}px" a-class="{{className}}"></span>'
    it('带有 "a-" 前缀的非 ant 功能属性在渲染后, 将会被转成正常属性', function() {
      var ant = new Ant(tpl, {
            data: {
              test: '测试'
            , width: 10
            , className: 'sun'
            }
          })
        , el = (ant.el).children[0]
        ;
      
      expect(el.getAttribute('a-style')).to.not.be.ok();
      expect(el.getAttribute('style')).to.be.ok();
      expect(el.getAttribute('a-class')).to.not.be.ok();
      expect(el.className).to.be.ok();
      expect(el.getAttribute('data-test')).to.be(ant.data.test);
      expect(el.style.width).to.be(ant.data.width + 'px');
      expect(el.className).to.be(ant.data.className);
    })
  });

});
