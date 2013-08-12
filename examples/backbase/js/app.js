var antData = new Firebase('https://ant.firebaseIO.com/');

Ant = Ant.extend({
  parse: function(commentsObj) {
    commentsObj = commentsObj || {};
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
      if(this.data.newComment){
        if(this.data.newComment.id){
          antData.child(this.data.newComment.id).set(this.data.newComment);
        }else{
          antData.push(this.data.newComment);
        }
        this.set('newComment');
      }
    }
  , 'click #login': function() {
      auth.login('github')
    }
  , 'click .close': function(e) {
      antData.child($(e.target.parentNode).data('id')).remove();
    }
  , 'click .edit': function(e) {
      var id = $(e.target.parentNode).data('id')
        , comment
        ;
      for(var i = 0, l = this.data.comments.length; i < l; i++) {
        if(this.data.comments[i].id === id){
          comment = this.data.comments[i];
          break;
        }
      }
      this.set('newComment', comment);
    }
  , 'click .edit-cancel': function(){
      this.set('newComment', {});
    }
  , 'update': function(e, info){
      var that = this;
      if(info && info.newComment && typeof info.newComment.commentMarked !== 'undefined'){
        marked(this.data.newComment.commentMarked, {}, function(err, comment){
          that.set('newComment.comment', comment);
        })
      }
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

marked.setOptions({
  highlight: function (code, lang) {
    return hljs.highlightAuto(code, lang).value;
  }
, sanitize: true
});