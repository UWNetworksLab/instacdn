var identity = freedom.identity();
var transport = freedom['core.transport']();

var cache = {};
var outstanding;
var peers = [];
var sockId = {};

// Client asks for URL.
freedom.on('fetch', function(urls) {
  outstanding = urls;
  
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
  var msg = JSON.parse(req.msg);
  if (sockId[req.from]) {
    transport.accept(sockId[req.from], msg);    
  } else {
    var promise = transport.accept(null, msg);
    promise.done(function (acceptresp) {
      sockId[req.from] = acceptresp.id;
      identity.send(req.from, JSON.stringify(acceptresp.offer));
    });
  }
});

identity.on('buddylist', function(b) {
  peers = b;
});

transport.on('onStateChange', function(data) {
  console.log(data.id+" state change to: "+data.state);
});

transport.on('onSignal', function(data) {
  var peer = sockId.indexOf(data.id);

});

transport.on('onMessage', function(req) {
  var msg = JSON.parse(req.msg);
  
  if (msg.type == 'request') {
    if (typeof cache[msg.url] !== "undefined") {
      transport.send(req.id, JSON.stringify({'type':'response', 'url':msg.url, 'data':'blob here'}));
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

function instaCDN_fetch() {
  console.log('fetch from peers');
  function getFirst(array) {
    for (var prop in array) {
      return array[prop];
    }
  }
  var promise = transport.create();
  promise.done(function (sockInfo) {
    console.log(sockInfo);
    sockId[peers[0]] = sockInfo.id;
    console.log("Created PeerConnection: "+sockInfo.id);
    identity.send(peers[0], JSON.stringify(sockInfo.offer));
  });

  for (var i = 0; i < outstanding.length; i++) {
    // TODO: setup transport with peer instead of requesting directly.
    //var sock = getFirst(sockId);
    //transport.send(sock, JSON.stringify({'type':'request', 'url':outstanding[i]}));
    
  }
}

freedom.emit('load');
