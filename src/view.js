(function(window, $, undefined){
  var $root = $(window);

  //### url 路由控制
  var router = (function(Event) {
    var routes = {};
    var listener = function(e) {
      var hash = urlParse.queryParse(location.hash)
        , match, route
        , params = hash.params = []
        ;
      for(var routeName in routes) {
        route = routes[routeName]
        match = route.reg.exec(hash.path);
        if(match) {
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
          this.trigger(routeName, hash);
          //break;
        }
      }
    };
    
    var router = $.extend({}, Event, {
      on: function(path, callback) {
        if(!routes[path]){
          var keys = [];
          routes[path] = {reg: pathRegexp(path, keys, true, true), keys: keys};
        }
        Event.on.call(this, path, callback);
        return this;
      }
    , off: function(path) {
        Event.off.apply(this, arguments);
        
        if(!(this._handlers[path] && this._handlers[path].length)){
          delete routes[path];
        }
        return this;
      }
    , navigate: function(path, opts) {
        location.hash = path;
        return this;
      }
      /**
       * 设置 router 规则
       * @param {Object} routes router 规则
       */
    , route: function(routes) {
        for(var path in routes) {
          this.on(path, routes[path]);
        }
        return this;
      }
      /**
       * 开始监听 hash 变化
       * @param {Object} [routes] 初始化传入的 router 规则
       */
    , start: function(routes) {
        this.stop();
        var callback = listener.bind(this);
        $root.on('hashchange', callback);
        
        listener.guid = callback.guid;
        
        this.route(routes);
        
        $root.trigger('hashchange');
        return this;
      }
      /** 停止 router 监听 */
    , stop: function() {
        $root.off('hashchange', listener);
        return this;
      }
    });
    
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
   * @api private
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
          ret.searchobj = fn.queryParse(ret.search);
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
            url.searchObj = o;
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
  })(Ant.Event);
  
  //扩展
  window.Ant.setPrefix('z-');
  window.Ant = window.Ant.extend({
    //ajax
    fetch: function(opts) {
      var that = this
        ;
      opts.url = opts.url || this.url;
      return $.ajax(opts);
    }
    
    
  , on: function(name, handler) {
      handler = handler || function() {};
      var callback = handler.bind(this)
        , args = name.trim().split(/\s+/)
        ;
      args.push(callback);
      $(this.el).on.apply($(this.el), args);
      //jQuery 的事件监听函数是用 guid 标定的. 这样 `controller.off(handler)` 就可以起作用了
      handler.guid = callback.guid;
      return this;
    }
  , trigger: function(name) {
      var args = [].slice.call(arguments)
        , en = args.shift().trim().split(/\s+/)
        ;
      
      args.unshift(en[0]);
      
      $(this.el).trigger.apply($(this.el), args);
      return this;
    }
  , off: function(name, handler) {
      var args = name.trim().split(/\s+/);
      args.push(handler);
      
      $(this.el).off.apply($(this.el), args);
      return this;
    }
  }, {
    router: router
  });
  
  
})(this, jQuery);