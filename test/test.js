describe('接口可用性', function() {
  it('全局变量 window.Ant', function() {
    expect(window.Ant).to.be.a('function');
  });
  
  it('接口完备性', function() {
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
      expect(ant.get(path2)).to.be(val2);
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
  });
})