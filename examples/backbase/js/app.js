var antData = new Firebase('https://ant.firebaseIO.com/');

Ant = Ant.extend({
  parse: function(commentsObj) {
    commentsObj = commentsObj || {};
    var comments = [];
    for(var id in commentsObj) {
      var comment = commentsObj[id];
      comment.id = id;
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
  , 'click .close': function(e) {
      antData.child($(e.target.parentNode).data('id')).remove();
    }
  , 'click .edit': function(e) {
      var index = $(e.target.parentNode).data('a-index');
      this.set('newComment', this.data.comments[index]);
    }
  , 'click .edit-cancel': function(){
      this.set('newComment', {});
    }
    
  , 'render': function(){
      document.body.className = 'loaded';
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

marked.setOptions({
  highlight: function (code, lang) {
    return hljs.highlightAuto(code, lang).value;
  }
, sanitize: true
});