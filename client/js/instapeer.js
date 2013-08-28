var identity = freedom.identity();
var transport = freedom.transport;

var cache = {};
var outstanding;

var identityChannels = {};
var peerChannels = {};

var peers = [];
var state = {};

/*
var qpsEvents;
var qpsStartTime;
(function outputQPS() {
  var now = new Date().valueOf();
  freedom.emit('qps', ((qpsEvents*1000)/(now-qpsStartTime)));
  qpsEvents = 0;
  qpsStartTime = new Date().valueOf();
  setTimeout(outputQPS,5000);
})();
*/

// Client asks for URL.
freedom.on('fetch', function(urls) {
  outstanding = urls;
  var promise = identity.login('instaCDN', 1.0, 'localhost');
  promise.done(function (id) {
    // TODO: remove debugging info.
    freedom.emit("myid", id.id);
    console.log(peers);
    if (peers.indexOf(id.id) > -1) {
      peers.splice(peers.indexOf(id.id), 1);
    }
    if (peers.length) {
      instaCDN_fetch();
    } else {
      http_fetch();
    }
  });
});

// Remote initiates connection.
// TODO(willscott): what is the structure of req?
identity.on('onMessage', function(req) {
  if (!identityChannels[req.fromUserId]) {
    // Make a channel.
    initTransport(req.fromUserId, function(r) {
      var x = identityChannels[r.fromUserId];
      identityChannels[r.fromUserId].emit('message', r.message);
    }.bind(this, req));
  } else {
    identityChannels[req.fromUserId].emit('message', req.message);
  }
});

function initTransport(to, continuation) {
  state[to] = [];
  var promise = freedom.core().createChannel();
  promise.done(function(to, chan) {
    // Hook up one end to the identity service.
    chan.channel.done(function(to, cb, channel) {
      channel.on('message', function(msg) {
        if (!msg.from) {
          identity.sendMessage(to, msg);
        }
        identityChannels[to] = channel;
        cb();
      });
    }.bind(this, to, continuation));
    
    // Give the other to peer transport.
    var peer = transport();
    peer.on('message', onMessage.bind(this, to));
    peer.on('onClose', onClose.bind(this, to));
    peer.open(chan.identifier);
    peerChannels[to] = peer;
  }.bind(this, to));
}

// Message from Peer.
var onMessage = function(from, message) {
  if (state[from] && state[from].length && message instanceof Blob) {
    var url = state[from].shift();
    cache[url] = message;
    freedom.emit('resource', {url: url, src: URL.createObjectURL(cache[url])});
  } else if (state[from] && state[from].length && message == 404) {
    state[from].shift();
    console.log("TODO: handle 404 Response from peer.");
  } else { // Request.
    console.log("got req " + JSON.stringify(message));
    if (typeof cache[message] != "undefined") {
      peerChannels[from].send(cache[message]);
    } else {
      peerChannels[from].send(404);
    }
  }
};

// Transport Closes.
var onClose = function(from) {
  delete peerChannels[from];
  delete peerChannels[from];
  delete state[from];
}

// Peer list update.
identity.on('onChange', function(buddies) {
  peers = buddies.clients;
});

/// InstaCDN methods.
function http_fetch() {
  console.log('fetch from server');
  for (var i = 0; i < outstanding.length; i++) {
    var req = new XMLHttpRequest();
    var url = outstanding[i];
    req.open("GET", url, true);
    req.responseType = 'blob';
    
    req.onload = function(e) {
      if (this.status == 200) {
        // TODO: retrieve mime type using req.getResponseHeader
        var blob = new Blob([this.response], {type: 'image/jpeg'});
        cache[url] = blob;
        freedom.emit('resource', {url: url, src: URL.createObjectURL(blob)});
      }
    };
    
    req.send(null);
  }
};

function instaCDN_fetch() {
  // TODO: distribute requests across available peers.
  console.log("Initiating Connection with " + peers[0]);
  initTransport(peers[0], function() {
    for (var i = 0; i < outstanding.length; i++) {
      state[peers[0]].push(outstanding[i]);
      peerChannels[peers[0]].send(outstanding[i]);
    }    
  });
}

freedom.emit('load');
