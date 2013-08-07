var antData = new Firebase('https://ant.firebaseIO.com/');

Ant = Ant.extend({
  parse: function(commentsObj) {
    var ids = Object.keys(commentsObj);
    var comments = [];
    for(var i = i, l = ids.length; i < l; i++) {
      var comment = commentsObj[ids[i]];
      comment.id = ids[i];
      comments.push(comment);
    }
    return {comments: comments};
  }
})

var ant = new Ant($('#container')[0], {
  events: {
    'click #comment': function() {
      this.data.newComment && antData.push(this.data.newComment)
    }
  }
});

antData.on('value', function(shot) {
  var val = shot.val();
  ant.parse(val);
  ant.render();
});

antData.on('child_added', function(snapshot) {
  var comment = snapshot.val();
  if(ant.data.comments){
    ant.data.comments.push(comment);
  }else{
    ant.set('comments', [comment]);
  }
});