//Add some filters
(function(Ant){
  window.Ant = Ant.extend({
    defaults: {
      filters: {
        capitalize: function(str) {
          return str.charAt(0).toUpperCase() + str.slice(1);
        }
      , urlEncode: function(str) {
          return encodeURIComponent(str);
        }
      , json: function(obj) {
          return JSON.stringify(obj);
        }
      }
    }
  })
})(window.Ant);