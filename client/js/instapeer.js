var identity = freedom.identity();
var transport = freedom['core.transport']();

var cache = {};
var outstanding;
var peers = [];
var sockId = {};
var sockState = {};
var messageQueue = [];

// Client asks for URL.
freedom.on('fetch', function(urls) {
  outstanding = urls;
  //Used waits until we get a buddylist from the server
  var promise = identity.get();
  promise.done(function (id) {
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

// Remote asks for URL.
identity.on('message', function(req) {
  // Req from remote.
  if (sockId[req.from]) {
    var promise = transport.accept(sockId[req.from], req.msg);
  } else {
    var promise = transport.accept(null, req.msg);
    promise.done(function (acceptresp) {
      sockId[req.from] = acceptresp.id;
      identity.send(req.from, acceptresp.offer);
    });
  }
});

identity.on('buddylist', function(b) {
  peers = b;
});

transport.on('onStateChange', function(data) {
  console.log(data.id+" state change to: "+data.state);
  sockState[data.id] = data.state;
  if (data.state == "open") {
    flushQueue();
  }
});

transport.on('onSignal', function(data) {
  function findPeer(id) {
    for (var prop in sockId) {
      if (sockId[prop] == id) {
        return prop;
      }
    }
  }
  var peer = findPeer(data.id);
  identity.send(peer, data.message);
});

transport.on('onMessage', function(req) {
  var msg = req.message;
  console.log(JSON.stringify(req.message));
  
  if (msg.type == 'request') {
    console.log("Request");
    if (typeof cache[msg.url] !== "undefined") {
      console.log("Sending");
      transport.send(req.id, {'type':'response', 'url':msg.url, 'data':cache[msg.url]});
    } else {
      console.log("Missing resource " + msg.url);
    }
  } else if (msg.type =='response') {
    cache[msg.url] = new Blob([msg.data], {type: 'image/jpeg'});
    freedom.emit('resource', {url: msg.url, src: URL.createObjectURL(cache[msg.url])});
  }

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
        var blob = new Blob([this.response], {type: 'image/jpeg'});
        cache[url] = blob;
        freedom.emit('resource', {url: url, src: URL.createObjectURL(blob)});
      }
    };
    
    req.send(null);
  }
};

function getReadySock() {
  for (var key in sockState) {
    if (sockState[key] == "open") {
      return parseInt(key);
    }
  }
  return null;
}

function flushQueue() {
  var sock = getReadySock();
  for (var i in messageQueue) {
    transport.send(sock, messageQueue[i]);
  }
  messageQueue = [];
}

function instaCDN_fetch() {
  console.log('fetch from peers');

  for (var i = 0; i < outstanding.length; i++) {
    messageQueue.push({'type':'request', 'url':outstanding[i]});
  }

  if (!getReadySock()) {
    var promise = transport.create();
    promise.done(function (sockInfo) {
      console.log(sockInfo);
      sock = sockInfo.id;
      sockId[peers[0]] = sock;
      console.log("Created PeerConnection: "+sock);
      identity.send(peers[0], sockInfo.offer);
    });
  } else {
    flushQueue();
  }
}

freedom.emit('load');
