describe('接口可用性', function() {
  it('Ant 基本接口', function() {
    expect(Ant).to.be.a('function');
    expect(Ant.extend).to.be.a('function');
    expect(Ant.prototype.on).to.be.a('function');
    expect(Ant.prototype.render).to.be.a('function');
    expect(Ant.prototype.set).to.be.a('function');
  });
});

describe('实例接口', function(){
  var tpl = '{{person}} - {{person.name}}';
  var ant = new Ant(tpl);
  //document.body.appendChild(ant.el);
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
    var val0 = 'ant', path0 = 'person';
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
    
    it('ant.isRendered. 调用 ant.render 前', function() {
      expect(ant.isRendered).to.be(false);
    });
    it('ant.data 是绑定数据的一个拷贝', function() {
      var data = {abc: 234}
      ant.render(data);
      expect(ant.data).not.to.be(data);
      expect(JSON.stringify(ant.data)).to.be(JSON.stringify(data));
    });
    it('ant.isRendered. 调用 ant.render 后', function() {
      expect(ant.isRendered).to.be(true);
    })
    
  });
  
});

describe('模板语法', function() {
  describe('子模板', function() {
    var prefix = '下面有个子节点: ', postfix = ' !'
      , getTpl = function(unescape){
          var partial = unescape ? '{{{>content}}}' : '{{> content}}';
          return '<h1>父模板</h1><p>' + prefix + partial + postfix + '</p>';
        }
      , content = '-- <span>这里是子节点, 里面可以包含变量标签: </span>{{title}} --'
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
      expect($(ant.el).children('p').text()).to.be(prefix + content.replace('{{title}}', ant.data.title) + postfix);
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
      expect($(ant.el).children('p').html().toLowerCase()).to.be(prefix + content.replace('{{title}}', ant.data.title) + postfix);
    });
    
    it('DOM 子模板', function() {
      var content = document.createElement('div');
      var html = content.innerHTML = '<span>{{title}}</span><pre>这里是子节点</pre>';
      ant = new Ant(getTpl(), {
        data: {
          title: '标题'
        }
      , partials: {
          content: content
        }
      });
      expect($(ant.el).children('p').children('div')[0]).to.be(content);
      expect(content.innerHTML.toLowerCase()).to.be(html.replace('{{title}}', ant.data.title))
    });
    
    it('子模板根元素带有 repeat 属性', function() {
      var content = '<span>{{title}}</span><span class=repeat a-repeat=list>{{.}}</span>'
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
      var $partial = $(ant.el).children('p')
      expect($partial.children('.repeat').length).to.be(ant.data.list.length);
      $partial.children('.repeat').each(function(i, span){
        expect(this.innerHTML).to.be(ant.data.list[i])
      });
    })
    
    it('异常情况: 有子模板标记, 没有子模板数据', function() {
      var ant = new Ant(getTpl(), {
        data: {}
      });
      expect($(ant.el).children('p').text()).to.be(prefix + postfix);
    });
    
    it('延时添加子模板. ant.addPartial', function() {
      var ant = new Ant(getTpl(), {
        data: {title: 'Ant'}
      });
      //document.body.appendChild(ant.el);
      ant.setPartial({
        name: 'content'
      , content: content
      });
      expect($(ant.el).children('p').text()).to.be(prefix + content.replace('{{title}}', ant.data.title) + postfix);
    })
  });
})