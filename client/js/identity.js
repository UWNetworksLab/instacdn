function IdentityProvider() {
  this.conn = new WebSocket("ws://p2pbr.com:8082/route/instacdndemo");
  this.connected = false;
  this.onConnected = function() {};
  this.conn.addEventListener('open', this.onStateChange.bind(this, true), true);
  this.conn.addEventListener('message', this.onMsg.bind(this), true);
  this.conn.addEventListener('error', this.onStateChange.bind(this, false), true);
  this.conn.addEventListener('close', this.onStateChange.bind(this, false), true);
};

IdentityProvider.prototype.onMsg = function(m) {
  var data = JSON.parse(m.data);
  if (data.from == 0) {
    // roster update
    this.dispatchEvent('onChange', {'clients': data.msg});
  
    // identity update
    this.id = data.id;
    this.onConnected();
  } else {
    var msg = {
      "fromUserId": data['from'],
      "message": data['msg']
    };
    this.dispatchEvent('onMessage', msg);
  }
};

IdentityProvider.prototype.onStateChange = function(to) {
  this.connected = to;
};

IdentityProvider.prototype.login = function(agent, version, url, continuation) {
  if (this.id) {
    continuation({'id': this.id});
  } else {
    this.onConnected = function() {
      continuation({'id': this.id});
    }.bind(this);
  }
};

IdentityProvider.prototype.sendMessage = function(to, msg, continuation) {
  this.conn.send(JSON.stringify({to:to, msg:msg}));
  continuation();
};

var identity = freedom.identity();
identity.provideAsynchronous(IdentityProvider);
