var tokenReg = /{{({([^}\n]+)}|[^}\n]+)}}/g;
var attrPostReg = /\?$/;

//字符串中是否包含模板占位符标记
function hasToken(str) {
  tokenReg.lastIndex = 0;
  return str && tokenReg.test(str);
}

function parseToken(node, parseNodeName) {
  var tokens = []
    , textMap = []
    , start = 0
    , value = node.nodeValue
    , nodeName = node.nodeName
    , condiAttr, isAttrName
    , val, token
    ;
  
  // if(node.nodeType === NODETYPE.ATTR){
    // //attribute with prefix.
    // if(nodeName.indexOf(prefix) === 0 && !isAntAttr(nodeName)){
      // nodeName = node.nodeName.slice(prefix.length);
    // }
    
    // if(attrPostReg.test(nodeName)){
      // //attribute with postfix
      // //attr?={{condition}}
      // nodeName = nodeName.slice(0, nodeName.length - 1);
      // condiAttr = true;
    // }
    // if(parseNodeName){
      // value = nodeName;//属性名
      // isAttrName = true;
    // }
  // }
  
  tokenReg.lastIndex = 0;
  
  while((val = tokenReg.exec(value))){
    if(tokenReg.lastIndex - start > val[0].length){
      textMap.push(value.slice(start, tokenReg.lastIndex - val[0].length));
    }
    
    token = {
      escape: !val[2]
    , path: (val[2] || val[1]).trim()
    , position: textMap.length
    , node: node
    , nodeName: nodeName
    , textMap: textMap
    };
    if(condiAttr){ token.condiAttr = true; }
    if(isAttrName){ token.isAttrName = true; }
    
    tokens.push(token);
    
    //一个引用类型(数组)作为节点对象的文本图, 这样当某一个引用改变了一个值后, 其他引用取得的值都会同时更新
    textMap.push(val[0]);
    
    start = tokenReg.lastIndex;
  }
  
  if(value.length > start){
    textMap.push(value.slice(start, value.length));
  }
  
  tokens.textMap = textMap;
  
  return tokens;
}

exports.hasToken = hasToken;

exports.parseToken = parseToken;