//Some filters
(function(Ant){
  window.Ant = Ant.extend({
    defaults: {
      filters: {
        capitalize: function(str) {
          return (str || '').charAt(0).toUpperCase() + str.slice(1);
        }
      , urlEncode: function(str) {
          return encodeURIComponent(str);
        }
      // , json: function(obj) {
      //     return JSON.stringify(obj);
      //   }
      , defaults: function(val, defaults) {
          return typeof val === 'undefined' ? (typeof defaults === 'undefined' ? '' : defaults) : val;
        }
      , ellipsis: function(str, maxLength, tail) {
          maxLength = maxLength || 80;
          tail = tail || '...';
          return str.length > maxLength ? (str.slice(0, maxLength - tail.length) + tail) : str;
        }
      }
    }
  })
})(window.Ant);