"use strict";

var doc = require('../document.js');
  
var dirs = {};


dirs.text = {
  terminal: true
, init: function() {
    var text = doc.createTextNode('')
      , el
      ;
    if(this.nodeName !== text.nodeName) {
      el = this.el;
      this.el = el.parentNode;
      this.el.replaceChild(text, el);
      this.node = text;
      this.nodeName = text.nodeName;
    }
  }
, update: function(val) {
    this.node.nodeValue = val;
  }
};



dirs.html = {
  
};
  
  
dirs.repeat = {
  priority: 10000
, terminal: true
};
  
dirs['if'] = {
  
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