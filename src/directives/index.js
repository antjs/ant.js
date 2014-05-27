"use strict";

var doc = require('../document.js')
  , utils = require('../utils.js')
  ;

var dirs = {};


dirs.text = {
  terminal: true
, replace: function() { return doc.createTextNode('') }
, update: function(val) {
    this.node.nodeValue = utils.isUndefined(val) ? '' : val;
  }
};


dirs.html = {
  terminal: true
, replace: true
, link: function() {
    this.nodes = [];
  }
, update: function(val) {
    var el = document.createElement('div');
    el.innerHTML = utils.isUndefined(val) ? '' : val;
    
    var node;
    while(node = this.nodes.pop()) {
      node.parentNode && node.parentNode.removeChild(node);
    }
    
    var nodes = el.childNodes;
    for(var i = 0, l = nodes.length; i < l; i ++) {
      this.nodes.push(nodes[i])
      this.el.insertBefore(this.nodes[i], this.node);
    }
  }
};

  
dirs['if'] = {
  anchor: true
, link: function() {
    var parent = this.el.parentNode;
    parent.removeChild(this.el);
  }
, update: function(val) {
    var parent = this.anchors.end.parentNode;
    if(val) {
      if(!this.state) { parent.insertBefore(this.el, this.anchors.end); }
    }else{
      if(this.state) { parent.removeChild(this.el); }
    }
    this.state = val;
  }
};


dirs.partial = {
  terminal: true
, replace: true
, link: function(vm) {
    var that = this;
    var pName, ant, opts;
    pName = this.path;
    ant = vm.$root.$ant;
    opts = ant.options;
    
    this.path = '';
    
    ant.setPartial({
      name: pName
    , content: opts && opts.partials && opts.partials[pName]
    , target: function(el) { that.el.insertBefore(el, that.node) }
    , escape: this.escape
    , path: vm.$getKeyPath()
    , context: this
    });
  }
};

dirs.template = {
  priority: 10000
, link: function() {
    
  }
};
  
dirs.repeat = require('./repeat.js');
dirs.attr = require('./attr.js');
dirs.model = require('./model.js');

module.exports = dirs;