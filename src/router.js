(function(window, $, undefined){
  "use strict";
  var $root = $(window);

  //### url 路由控制
  var router = function() {
    
    var router = {
      /**
       * routes 集合.
       */
      routes: []
      /**
       * 设置 router 规则
       * @param {String | RegExp} path rule
       * @param {Function} handler
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
        opts = opts || {};
        //TODO silence
        if(opts.replace){
          location.replace('#' + path);
        }else{
          location.hash = path;
        }
        return this;
      }
      /**
       * 开始监听 hash 变化
       */
    , start: function(routes) {
        routes = routes || {};
        for(var path in routes){
          this.route(path, routes[path]);
        }
        this.stop();
        $root.on('hashchange', listener);
        $root.trigger('hashchange');
        return this;
      }
      /** 停止 router 监听 */
    , stop: function() {
        $root.off('hashchange', listener);
        return this;
      }
    };
        
    var listener = function(e) {
      var hashInfo = urlParse(location.hash.slice(1), true)
        ;
        
      (function next(index){
        var route = router.routes[index]
          , params, match
          ;
        if(route){
          match = route.reg.exec(hashInfo.pathname);
          if(match) {
            params = hashInfo.params = match.length - 1 === route.keys.length ? {} : [];
            for(var i = 1, l = match.length; i < l; i++) {
              var key = route.keys[i - 1]
                , val
                ;
              try{
                val = match[i] && decodeURIComponent(match[i]);
              }catch(e){
                val = match[i];
              }
              if (key) {
                params[key.name] = val;
              } else {
                params.push(val);
              }
            }
            
            try{
              //handler return false will prevent nexts handlers
              route.handler.call(router, hashInfo) !== false && next(++index);
            }catch(e){
              next(++index);
            }
          }else {
            next(++index);
          }
        }
      })(0);
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
      var reg = /^(?:(\w+\:)\/\/([^\/]+)?)?((\/?[^?#]*)(\?[^#]*)?(#.*)?)$/
        , map = ['href', 'protocal', 'host', 'path', 'pathname', 'search', 'hash']
        ;
        
     /**
      * url解析
      * @param {String} str url. 
      * @param {Boolean} isParseQuery
      * @return {Object}
      */
      var fn = function(str, isParseQuery){
        str = typeof str === 'string' ? str : location.href;
        var match = str.match(reg)
          , ret = {query: isParseQuery ? {} : null}, query
          ;
        
        for(var i = 0, l = map.length; i < l; i++){
          ret[map[i]] = typeof match[i] === 'undefined' ? null : match[i];
        }
        ret.hostname = ret.host;
        
        if(ret.search !== null){
          query = ret.search.slice(1);
          ret.query = isParseQuery ? fn.queryParse(query) : query;
        }
        
        return ret;
      };
      
      fn.queryParse = function(queryStr) {
        var query = {}
          , queries, q
          ;
        
        queryStr = queryStr || '';
        queries = queryStr.split("&");
        
        for(var i = 0; i < queries.length; i++){
          q = queries[i].split("=");
          query[q[0]] = q[1];
        }
        return query;
      };
      
      return fn;
    })();

    return router;
  }();
  
  window.Ant = window.Ant.extend({}, {
    router: router
  });
})(this, jQuery);