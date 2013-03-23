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
      send: function(to, m) {
        var ret = {
          cb: function(a) {
            ret.done = function(b, x) {x(b);}.bind(a);
          },
          done: function(c) {
            ret.cb = c;
          }
        };
        freedom.ident.send(to, m, function(x) {
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
      accept: function(id, str) {
        var ret = {
          cb: function(a) {
            ret.done = function(b, x) {x(b);}.bind(a);
          },
          done: function(c) {
            ret.cb = c;
          }
        };
        freedom.tran.accept(id, str, function(x) {
          ret.cb(x);
        });
        return ret;
      },
      send: function(msg) {
        var ret = {
          cb: function(a) {
            ret.done = function(b, x) {x(b);}.bind(a);
          },
          done: function(c) {
            ret.cb = c;
          }
        };
        freedom.tran.send(msg, function(x) {
          ret.cb(x);
        });
        return ret;
      },
      close: function(id) {
        var ret = {
          cb: function(a) {
            ret.done = function(b, x) {x(b);}.bind(a);
          },
          done: function(c) {
            ret.cb = c;
          }
        };
        freedom.tran.close(id, function(x) {
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
