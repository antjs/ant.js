"use strict";

module.exports = {
  init: function() {
    if(this.dirName === this.type) {
      this.attrs = {};
    }
  }
, update: function(val) {
    if(this.dirName === this.type) {
      
      for(var attr in val) {
        setAttr(this.el, attr, val[attr]);
        if(val[attr]) {
          delete this.attrs[attr];
        }
      }
      for(var attr in this.attrs) {
        this.el.removeAttribute(attr);
      }
      this.attrs = val;
    }else{
      this.textMap[this.position] = val && (val + '');
      val = this.textMap.join('');
      setAttr(this.el, this.dirName, val);
    }
  }
};

  // update: function(newVal) {
    // var isAttrName = this.isAttrName
      // , nodeName = this.dirName
      // , node = this.node
      // , el = this.el
      // , val
      // ;
    
    // this.textMap[this.position] = newVal && (newVal + '');
    // val = this.textMap.join('');
    
    // //{{}} token in attribute value, which nodeName is dynamic
    // //baseTokens is about attribute name
    // if(this.baseTokens){
      // nodeName = this.nodeName = this.baseTokens.textMap.join('');
    // }

    // if(!isAttrName){
      // node.nodeValue = val;
    // }

    // //conditional attribute just only consider attr's value
    // if(this.condiAttr && !isAttrName){
      // if(newVal){
       // // delete node._hide_;
      // }else{
        // el.removeAttribute(nodeName);
       // // node._hide_ = true;
        // return;
      // }
    // }
    // //if(!node._hide_){
      // if(isAttrName){
        // if(nodeName){
          // el.removeAttribute(nodeName);
        // }
        // nodeName = this.nodeName = val;
        // val = node.nodeValue;
      // }
      // if(nodeName){
        // setAttr(el, nodeName, val);
      // }
    // // }else{
    // //   console.log('skip..')
    // // }
    
  // }


//IE 浏览器很多属性通过 `setAttribute` 设置后无效. 
//这些通过 `el[attr] = value` 设置的属性却能够通过 `removeAttribute` 清除.
function setAttr(el, attr, val){
  try{
    if(((attr in el) || attr === 'class')){
      if(attr === 'style' && el.style.setAttribute){
        el.style.setAttribute('cssText', val);
      }else if(attr === 'class'){
        el.className = val;
      }else{
        el[attr] = typeof el[attr] === 'boolean' ? true : val;
      }
    }
  }catch(e){}
  try{
    //chrome setattribute with `{{}}` will throw an error
    el.setAttribute(attr, val);
  }catch(e){ console.warn(e) }
}