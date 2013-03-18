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

transport.on('onMessage', function(data) {
  var msg = data.data;
  var lenBlob = msg.slice(0,4);
  var lenReader = new FileReader();
  lenReader.onload = function(e) {
    var lenArray = new Uint32Array(e.target.result);
    var len = lenArray[0];
    var reqBlob = msg.slice(4,4+len);
    var reqReader = new FileReader();
    reqReader.onload = function(f) {
      var req = JSON.parse(f.target.result);
      if (req.type == 'request') {
        console.log("Request");
        if (typeof cache[req.url] !== "undefined") {
          console.log("Sending");
          var resp = JSON.stringify({'type':'response', 'url':req.url, 'data':cache[req.url]});
          var resplen = new UInt32Array(1);
          resplen[0] = resp.length;
          transport.send({header: req.id, data: new Blob([resplen, resp, cache[req.url]])});
        } else {
          console.log("Missing resource " + req.url);
        }
      } else if (req.type =='response') {
        //cache[req.url] = new Blob([req.data], {type: 'image/jpeg'});
        cache[req.url] = msg.slice(4+len);
        freedom.emit('resource', {url: req.url, src: URL.createObjectURL(cache[req.url])});
      }
    };
    reqReader.readAsText(reqBlob);
  };
  lenReader.readAsArrayBuffer(lenBlob);
  
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
    transport.send({header: sock, data: messageQueue[i]});
  }
  messageQueue = [];
}

function instaCDN_fetch() {
  console.log('fetch from peers');

  for (var i = 0; i < outstanding.length; i++) {
    var req = JSON.stringify({'type':'request', 'url':outstanding[i]});
    var len = new Uint32Array(1);
    len[0] = req.length
    messageQueue.push(new Blob([len,req]));
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
