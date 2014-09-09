(function(root){
  "use strict";

  module.exports = root.document || require('jsdom').jsdom();

})((function() {return this})());