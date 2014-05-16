"use strict";

var doc = require('../document.js');

var dirs = {};


dirs.text = {
  terminal: true
, replace: function() { return doc.createTextNode('') }
, update: function(val) {
    this.node.nodeValue = val;
  }
};


dirs.html = {
  terminal: true
, replace: true
, init: function() {
    this.nodes = [];
  }
, update: function(val) {
    var el = document.createElement('div');
    el.innerHTML = val;
    
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
  
  
dirs.repeat = {
  priority: 10000
, terminal: true
};
  
dirs['if'] = {
  init: function() {
    var parent = this.parent = this.el.parentNode;
    this.anchor = doc.createComment(this.type + ' = ' + this.path)
    parent.insertBefore(this.anchor, this.el);
    parent.removeChild(this.el);
  }
, update: function(val) {
    if(val) {
      if(!this.state) { this.parent.insertBefore(this.el, this.anchor); }
    }else{
      if(this.state) { this.parent.removeChild(this.el); }
    }
    this.state = val;
  }
};
  
dirs.attr = require('./attr.js');
dirs.model = require('./model.js')
  
dirs.partial = {
  terminal: true
, init: function() {
    ;
  }
};

module.exports = dirs;