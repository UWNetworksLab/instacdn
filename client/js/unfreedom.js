var freedom = {
  identity: function() {
    return {
      provideAsynchronous: function(provider) {freedom.ident = new provider();},
      on: function(a, f) {
        freedom.identity['on' + a] = f;
      },
      emit: function(a, b) {
        freedom.identity['on' + a](b);
      },
      get: function() {
        var ret = { done: function(c) { ret.cb = c; }};
        freedom.ident.get(function(x) {
          ret.cb(x);
        });
        return ret;
      }
    }
  },
  on: function(a, f) {
    freedom['on' + a] = f;
  },
  emit: function(a, b) {
    console.log('on ' + a);
    freedom['on' + a](b);
  }
};