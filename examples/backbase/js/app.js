var antData = new Firebase('https://ant.firebaseIO.com/');

Ant = Ant.extend({
  parse: function(commentsObj) {
    var ids = Object.keys(commentsObj);
    var comments = [];
    for(var i = 0, l = ids.length; i < l; i++) {
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
  , 'click #login': function() {
      auth.login('github')
    }
  }
});

antData.on('value', function(shot) {
  var val = shot.val();
  ant.data.comments = ant.parse(val).comments;
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

var auth = new FirebaseSimpleLogin(antData, function(error, user) {
  if (error) {
    // an error occurred while attempting login
    console.log(error);
  } else if (user) {
    // user authenticated with Firebase
    console.log('User ID: ' + user.id + ', Provider: ' + user.provider);
    ant.set('user', user);
  } else {
    ant.set('user');
    // user is logged out
  }
});