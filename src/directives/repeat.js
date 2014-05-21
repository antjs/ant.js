"use strict";

var doc = require('../document.js')
  , utils = require('../utils.js')
  , afterFn = utils.afterFn
  ;
 
module.exports = {
  priority: 1000
, terminal: true
, link: function(vm) {
    var el = this.el
      , parent = this.parent = el.parentNode
      ;
      
    this.anchor = doc.createTextNode('');
    this.els = [];
    this.relativeVm = vm;
    
    parent.insertBefore(this.anchor, el);
    parent.removeChild(el);
    
    //vm.$build(el);
  }
, update: function(val) {
    if(!this.vm) {
      this.vm = this.relativeVm.$getVM(this.paths[0]);
//      this.vm.$repeat = true;
    }
    if(val) {
      if(utils.isArray(val)) {
        if(val.splice !== arrayMethods.splice) {
          utils.extend(val, arrayMethods);
          val.__vm__ = this.vm;
        }
        this.splice([0, this.els.length].concat(val), val, true);
      }else{
        console.warn('需要一个数组');
      }
    }
  }
  //精确控制 DOM 列表
  //args: [index, n/*, items...*/]
  //arr: 数组数据
  //noFixVm: 是否不需要维护 viewmodel 索引
, splice: function(args, arr, noFixVm) {
    var els = this.els
      , items = args.slice(2)
      , index = args[0] * 1
      , n = args[1] * 1
      , m = items.length
      , newEls = []
      , frag = doc.createDocumentFragment()
      , pn = this.anchor.parentNode
      , el, vm
      ;
    
    if(utils.isUndefined(n)){
      args[1] = n = els.length - index;
    }
    
    for(var i = index, l = els.length; i < l; i++){
      if(i < index + n){
        //删除
        //对于拥有 if 属性并且不显示的节点, 其并不存在于 DOM 树中
        try{ pn.removeChild(els[i]); }catch(e){}
        noFixVm || delete this.vm[i];
      }else{
        if(n || m){
          //维护索引
          var newI = i - (n - m)
            , oldI = i
            ;
          
          if(newI > oldI) {
            newI = l - (i - index);
            oldI = newI + (n - m);
          }
          
          els[oldI]['$index'] = newI;
          if(!noFixVm){
            vm = this.vm[newI] = this.vm[oldI];
            vm.$key = newI + '';
            vm['$index'] && vm['$index'].$set(vm.$key);
          }
        }else{
          break;
        }
      }
    }
    
    //新增
    for(var j = 0; j < m; j++){
      el = this.el.cloneNode(true);
      noFixVm || delete this.vm[index + j];
      vm = this.vm.$getVM(index + j, {scope: this.vm});
      
      for(var a = 0; a < this.assignments.length; a++) {
        vm.$assignment[this.assignments[a]] = vm;
      }
      
      el['$index'] = index + j;
      frag.appendChild(el);
      vm.$build(el);
      //vm.$set(items[j]);
      //vm['$index'] && vm['$index'].$set(vm.$key);
      
      newEls.push(el);
      if(arr && utils.isObject(arr[index + j])){
       // arr[index + j] = modelExtend(isArray(arr[index + j]) ? []: {}, arr[index + j], vm);
      }
    }
    if(newEls.length){
      pn.insertBefore(frag, els[index + n] || this.anchor);
    }
    
    //需要清除缩短后多出的部分
    if(!noFixVm){
      for(var k = l - n + m; k < l; k++){
        delete this.vm[k];
      }
    }
    
    if(arr.__vm__ !== this.vm) {
      arr.__vm__ = this.vm;
    }
    
    args = args.slice(0, 2).concat(newEls);
    els.splice.apply(els, args);
  }
, reverse: function(args, arr, noFixVm) {
    var vms = this.vm, vm
      , el = this.anchor
      , frag = doc.createDocumentFragment()
      ;
    for(var i = 0, l = this.els.length; i < l; i++){
      if((!noFixVm) && i < 1/2){
        vm = vms[i];
        vms[i] = vms[l - i - 1];
        vms[i].$key = i + '';
        vm.$key = l - i - 1 + '';
        vms[l - i - 1] = vm;
      }
      this.els[i]['$index'] = l - i - 1;
      frag.appendChild(this.els[l - i - 1]);
    }
    el.parentNode.insertBefore(frag, el);
    this.els.reverse();
  }
, sort: function(fn){
    //TODO 进行精确高还原的排序?
    this.update(this.vm.$value);
  }
};

//---
function callRepeater(vmArray, method, args){
  var watchers = vmArray.__vm__.$watchers;
  var noFixVm = false;
  for(var i = 0, l = watchers.length; i < l; i++){
    if(watchers[i].token.type === 'repeat'){
      watchers[i].token[method](args, vmArray, noFixVm);
      noFixVm = true;
    }
  }
  vmArray.__vm__.length && vmArray.__vm__.length.$set(vmArray.length, false, true);
}
var arrayMethods = {
  splice: afterFn([].splice, function() {
    callRepeater(this, 'splice', [].slice.call(arguments));
  })
, push: afterFn([].push, function(/*item1, item2, ...*/) {
    var arr = [].slice.call(arguments);
    arr.unshift(this.length - arr.length, 0);
    
    callRepeater(this, 'splice', arr);
  })
, pop: afterFn([].pop, function() {
    callRepeater(this, 'splice', [this.length, 1]);
  })
, shift: afterFn([].shift, function() {
    callRepeater(this, 'splice', [0, 1]);
  })
, unshift: afterFn([].unshift, function() {
    var arr = [].slice.call(arguments);
    arr.unshift(0, 0);
    
    callRepeater(this, 'splice', arr);
  })
, sort: afterFn([].sort, function(fn) {
    callRepeater(this, 'sort');
  })
, reverse: afterFn([].reverse, function(){
    callRepeater(this, 'reverse');
  })
};
  