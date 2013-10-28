(function(window, $, undefined){
  "use strict";
  var $root = $(window);

  //### url 路由控制
  var router = function() {
  
    var listener = function(e) {
      var hashInfo = urlParse.queryParse(location.hash)
        , that = this
        ;
        
      (function next(index){
        var route = that.routes[index]
          , params, match
          ;
        if(route){
          match = route.reg.exec(hashInfo.path);
          if(match) {
            params = hashInfo.params = match.length - 1 === route.keys.length ? {} : [];
            for(var i = 1, l = match.length; i < l; i++) {
              var key = route.keys[i - 1]
                , val = decodeURIComponent(match[i])
                ;
              if (key) {
                params[key.name] = val;
              } else {
                params.push(val);
              }
            }
            
            route.handler.call(that, hashInfo, function (){
              next(++index);
            });
            //break;
          }else {
            next(++index);
          }
        }
      })(0);
    };
    
    var router = {
      /**
       * routes 集合.
       */
      routes: []
      /**
       * 设置 router 规则
       * @param {Object} routers router 规则
       */
    , route: function(path, handler) {
        var keys = [];
        this.routes.push({
          path: path//path rule
        , handler: handler
        , reg: pathRegexp(path, keys, true, true)
        , keys: keys
        });
        return this;
      }
    , navigate: function(path, opts) {
        //TODO
        location.hash = path;
        return this;
      }
      /**
       * 开始监听 hash 变化
       * @param {Object} [routers] 初始化传入的 route 规则
       */
    , start: function(routers) {
        this.stop();
        var callback = listener.bind(this);
        $root.on('hashchange', callback);
        
        listener.guid = callback.guid;
        
        for(var path in routers) {
          this.route(path, routers[path]);
        }
        
        $root.trigger('hashchange');
        return this;
      }
      /** 停止 router 监听 */
    , stop: function() {
        $root.off('hashchange', listener);
        return this;
      }
    };
    
    /**
   * Normalize the given path string,
   * returning a regular expression.
   *
   * An empty array should be passed,
   * which will contain the placeholder
   * key names. For example "/user/:id" will
   * then contain ["id"].
   *
   * @param  {String|RegExp|Array} path
   * @param  {Array} keys
   * @param  {Boolean} sensitive
   * @param  {Boolean} strict
   * @return {RegExp}
   */
    var pathRegexp = function(path, keys, sensitive, strict) {
      if (({}).toString.call(path) == '[object RegExp]') return path;
      if (Array.isArray(path)) path = '(' + path.join('|') + ')';
      path = path
        .concat(strict ? '' : '/?')
        .replace(/\/\(/g, '(?:/')
        .replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?(\*)?/g, function(_, slash, format, key, capture, optional, star){
          keys.push({ name: key, optional: !! optional });
          slash = slash || '';
          return (optional ? '' : slash) +
            '(?:' +
            (optional ? slash : '') + 
            (format || '') + (capture || (format && '([^/.]+?)' || '([^/]+?)')) + ')' + 
            (optional || '') + 
            (star ? '(/*)?' : '');
        })
        .replace(/([\/.])/g, '\\$1')
        .replace(/\*/g, '(.*)');
      return new RegExp('^' + path + '$', sensitive ? '' : 'i');
    }
    
    var urlParse = (function() {
     /**
      * url解析
      * @param {String} str url字符
      * @param {Boolean} flag 是否解析search和hash
      */
      var fn = function(str, flag){
        str = str || location.href;
        var reg = /(?:(\w+\:)\/\/)?([^\/]+)?(\/[^?#]*)?(\?[^#]*)?(#.*)?/,
          match = str.match(reg), ret = {},
          map = ['href', 'protocal', 'host', 'pathname', 'search', 'hash']
        ;
        for(var i = 0, l = map.length; i < l; i++){
          ret[map[i]] = match[i] || '';
        }
        ret.hostname = ret.host;
        ret.pathname = ret.pathname || '/';
        ret.paths = fn.pathParse(ret.pathname);
        if(flag){
          ret.query = fn.queryParse(ret.search);
          ret.hashobj = fn.queryParse(ret.hash);
        }
        return ret;
      };
      fn.queryParse = (function(){
        var urlExp = /#?([^?]*)(\?.*)?$/;
        var hashParse = function(hash){
          var res = hash.match(urlExp), url = {}, a, o;
          url.path = res[1];
          url.search = res[2];
          url.paths = res[1] && fn.pathParse(res[1]);
          
          if(url.search){
            a = url.search.slice(1).split("&"), o={};
            for(var i=0; i<a.length; i++){
              var b= a[i].split("=");
              o[b[0]]=b[1];
            }
            url.query = o;
          }
          return url;
        };
        return hashParse;
      })();
      fn.pathParse = function(path){
        return path.replace(/(^\/|\/$)/, '').split('/');
      };
      return fn;
    })();

    return router;
  }();
  
  window.Ant = window.Ant.extend({}, {
    router: router
  });
})(this, jQuery);