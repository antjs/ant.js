var fs = require('fs')
  , Ant = require('../')
  , marked = require('../third-part/marked.js')
  , pygmentize = require('pygmentize-bundled')
  ;

var layout = fs.readFileSync(__dirname + '/_layouts/default.html', 'utf8')
  , doc = fs.readFileSync(__dirname + '/doc.md', 'utf8')
  , log = fs.readFileSync(__dirname + '/../CHANGELOG.md', 'utf8')
  , site = JSON.parse(fs.readFileSync(__dirname + '/../package.json', 'utf8'))
  , ant =  new Ant(layout, {data: {site: site}})
  , doctype = '<!DOCTYPE HTML>'
  ;
  
var parse = marked.Parser.parse;

var lastDepth = 2
  , nav = ''
  ;
  
//生成侧边栏
marked.Parser.parse = function(tokens, opt) {
  tokens.forEach(function(token){
    if(token.type === 'heading' && (token.depth === 2 || token.depth === 3)){
      if(token.depth > lastDepth){
        nav += '<ul>'
      }
      if(token.depth < lastDepth){
        nav += '</ul></li>'
      }
      nav += (token.depth === 2 ? '<li><h4><a href="#' + encodeURIComponent(token.text.toLowerCase()) + '">' + token.text + '</a></h4>' : '<li><a href="#' + encodeURIComponent(token.text.toLowerCase()) + '">' + token.text + '</a></li>');
      
      lastDepth = token.depth;
    }
  });
  ant.set('nav', nav);
  return parse.apply(this, arguments);
}  
  
function build(callback) {
  log = genHistroyLinks(log);
  marked(doc + '\n\n' + log, {highlight: function(code, lang, callback){
    pygmentize({lang: lang, format: 'html'}, code, function(err, result){
      if(err) return callback(err);
      callback(null, result.toString());
    })
  }}, function(err, html){
    if(err){
      console.error(err)
    }else{
      ant.set('content', html);
      fs.writeFileSync(__dirname + '/../index.html', doctype + ant.el.innerHTML, 'utf8');
    }
    callback && callback(err, 'Homepage completed!')
  });
}

function genHistroyLinks(md){
  return md.replace(/\[(\d+\.\d+\.\d+)\]/g, function(all, ver){
    return all + '(https://rawgithub.com/antjs/ant.js/v' + ver + '/index.html)'
  });
}
  
module.exports = build;


//build();