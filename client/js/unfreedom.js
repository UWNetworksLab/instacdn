var fdom = {
  apis: {
    register: function(a, b) {
      freedom.tran = new b({
        postMessage: function(m) {
          if (m.action == 'event') {
            fdom.tp.emit(m.type, m.value);
          }
        }
      });
    }
  }
}

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
      },
      send: function(a) {
        var ret = { done: function(c) { ret.cb = c; }};
        freedom.ident.send(a, function(x) {
          ret.cb(x);
        });
        return ret;
      }
    }
  },
  'core.transport': function() {
    var x = {
      on: function(a, f) {
        freedom['core.transport']['on' + a] = f;
      },
      emit: function(a, b) {
        freedom['core.transport']['on' + a](b);
      },
      create: function() {
        var ret = { done: function(c) { ret.cb = c; }};
        freedom.tran.create(function(x) {
          ret.cb(x);
        });
        return ret;
      },
      accept: function(a, b) {
        var ret = { done: function(c) { ret.cb = c; }};
        freedom.tran.accept(a, b, function(x) {
          ret.cb(x);
        });
        return ret;
      }
    }
    fdom.tp = x;
    return x;
  },
  on: function(a, f) {
    freedom['on' + a] = f;
  },
  emit: function(a, b) {
    console.log('on ' + a);
    freedom['on' + a](b);
  }
};