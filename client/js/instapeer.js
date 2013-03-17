var identity = freedom.identity();

var cache = {};
var outstanding;
var peers = [];

freedom.on('request', function(req) {
  var to = req.to;
  identity.send(to, req.msg);
  identity.once(function(t, d) {
    return t == 'message' && d.from == to;
  }, function(m) {
    freedom.emit('message', m);
  });
});

// Client asks for URL.
freedom.on('fetch', function(urls) {
  outstanding = urls;

  var promise = identity.get();
  promise.done(function(id) {
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
  if (msg.type == 'request') {
    if (typeof cache[msg.url] !== "undefined") {
      identity.send(req.from, JSON.stringify({'type':'response', 'data':'blob here'}));
    } else {
      console.log("Missing resource " + msg.url);
    }
  } else if (msg.type =='response') {
    cache[msg.url] = new Blob([msg.data], {type: 'image/jpeg'});
    freedom.emit('resource', {url: msg.url, src: URL.createObjectURL(cache[msg.url])});
  }
});

identity.on('buddylist', function(b) {
  peers = b;
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
  for (var i = 0; i < outstanding.length; i++) {
    // TODO: setup transport with peer instead of requesting directly.
    identity.send(peers[0], JSON.stringify({'type':'request', 'url':outstanding[i]}));
  }
}

freedom.emit('load');
