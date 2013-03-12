// Adapted from the tornado webchat demo.
var server = {
  socket: null,
  subscribers: [],
  waiters: {},
  providers: {},
  serverDataRecv: 0,

  write: function(obj) {
    if (!this.socket || this.socket.readyState != 1) {
      return false;
    }
    return this.socket.send(JSON.stringify({"payload": obj}));
  },
  
  start: function() {
    var url = "ws://" + location.host + "/message";
    if (!window.WebSocket) {
      return false;
    }
    this.socket = new WebSocket(url);
    var that = this;
    this.socket.onmessage = function(event) {
      var msg = JSON.parse(event.data);
        for (var i = 0; i < that.subscribers.length; i++) {
          that.subscribers[i](msg);
        }
    }

    // Create a server socket.
	new WebP2PConnection().getId();
	window._WebP2PServer.onAccept = node.onPeerConnect;
	return true;
  },
 
  announce_hash: function(hashQueryPair, dataHandler) {
    console.log("Providing " + JSON.stringify(hashQueryPair));
    if (server.write({"event": "set","key": hashQueryPair["hash"]})) {
      server.providers[hashQueryPair["hash"]] = true;
    }
  },

  retrieve: function(req, result) {
    server.peers_for_hash(req, function(peers) {
      if (!peers.length) {
        server.serverDataRecv++; 
        result(null);
      } 
      else {
        var p = node.get_connected(peers);
        if (p) {
          if (window.evaluation) {
            window.evaluation.countPeer(p);
          }
          server.data_from_peer(p, req, result);
        } else {
          //todo: allow on demand connection establishment.
          server.serverDataRecv++; 
          result(null);
        }
      }
    });
  },
  
  peers_for_hash: function(req, result) {
    var key = req.hash;
    console.log("Looking up " + key);
    if (server.waiters[key + ".cache"]) {
      return result(server.waiters[key + ".cache"]);
    }
    if(server.write({"event":"get", "key":key})) {
      if (server.waiters[key]) {
        server.waiters[key].push(result);
      } else {
        server.waiters[key] = [result];
      }
    } else {
      result([]);
    }
  },
  data_from_peer: function(peer, req, result) {
    var key = req.hash;
    console.log("Getting data for " + key);
    var datakey = peer.sid + "_" + key;
    if(server.waiters[datakey]) {
      sever.waiters[datakey].push(result);
    } else {
      server.waiters[datakey] = [result];
      peer.send(JSON.stringify({"event":"get","id":datakey,"key":key,"time":(new Date()).valueOf()}));
      window.setTimeout(server.respond.bind(server, datakey, null), 3 * peer.rtt);
    }
  },
  respond: function(key, val) {
    console.log("Data fetching timed out");
    if (key in server.waiters) {
      for (var i = 0; i < server.waiters[key].length; i++) {
        server.waiters[key][i](val);
      }
      delete server.waiters[key];
    }
  }
};

var node = {
  edges:{},
  MAX_EDGES: 20,
  peerDataRecv: 0,
  onServerMessage: function(msg) {
    if (msg['from'] === 0)
    {
      if (msg['id'] && !this.id && msg['event'] == "register") {
        // Registration complete.
        this.id = msg['id'];
        console.log("Registered with server as " + this.id);
        // todo: consider announces on a timer or when deficient degree.
        server.write({
          event:'announce'
        });
      } else if (msg['event'] == 'disconnect') {
        delete this.edges[msg['id']];
      } else if (msg['event'] == 'list') {
        var key = msg['key'];
        var result = msg['ids'];
        server.waiters[key + ".cache"] = result;
        var callback = server.waiters[key];
        delete server.waiters[key];
        for (var i = 0; i < callback.length; i++) {
          callback[i](result);
        }
      }
    } else if (msg['from'] && msg['from'] != this.id) {
      if (this.edges[msg['from']]) {
        this.edges[msg['from']].connect(msg['msg']);
        // Continue signalling a peer.
      } else if (msg['event'] && msg['event'] == 'announce') {
        // Initiate connection to a new peer.
        this.maybeConnect_(msg['from']);
      } else if (msg['event'] && msg['event'] == 'decline') {
        if (this.edges[msg['from']]) {
          this.edges[msg['from']].close();
          delete this.edges[msg['from']];
        }
      } else if (msg['msg'] && !this.full()) {
        this.maybeConnect_(msg['from'], msg['msg']);
      } else {
        server.write({to:msg['from'], event:'decline'});
      }
    }
  },
  full: function() {
    var edge_num = 0;
    for (var i in this.edges) {
      if(this.edges.hasOwnProperty(i)) {
        edge_num++;
      }
    }
    return (edge_num >= this.MAX_EDGES);
  },
  get_connected: function(peers) {
    var filtered = peers.filter(function(peer) {
      return this.edges[peer] !== undefined && this.edges[peer].state == WebP2PConnectionState.CONNECTED;
    }.bind(this));
    return filtered.length? this.edges[filtered[0]] : false;
  },
  onPeerConnect: function(connection) {
    connection.onMessage = function(msg) {
      if (node.edges[msg]) {
        if (node.edges[msg].state == WebP2PConnectionState.CONNECTED && msg < node.id) {
          connection.close();
        } else {
          node.edges[msg].close();
          node.edges[msg] = connection;
          connection.onMessage = node.onPeerMessage.bind(node, msg);
          connection.onError = node.onPeerError.bind(node, msg);
          connection.onStateChange = node.onPeerStateChange.bind(node, msg);
        }
      } else {
        node.edges[msg] = connection;
        connection.onMessage = node.onPeerMessage.bind(node, msg);
        connection.onError = node.onPeerError.bind(node, msg);
        connection.onStateChange = node.onPeerStateChange.bind(node, msg);        
      }
    };
  },
  onPeerStateChange: function(peer, state) {
    if (state == WebP2PConnectionState.STOPPING) {
      var pc = this.edges[peer];
      delete this.edges[peer];
      pc.onMessage = null;
      pc.onStateChange = null;
    }
  },
  onPeerError: function(peer, error) {
    if (error.request && error.request.comand == 3) {
      var data = error.request.data;
      var n1 = data[0];
      var realdata = data.substr(1 + parseInt(n1));
      if (server.waiters[realdata.id]) {
        node.onPeerMessage(peer, {'event':'resp', 'status':false, 'id':realdata.id});
      }
    }
  },
  onPeerMessage: function(peer, message) {
    var mo;
    try {
      mo = JSON.parse(message);
    } catch(e) {
      log.write("Malformed peer message from " + peer);
      return;
    }
    if (!mo['event']) return;
    if (mo['event'] == 'get') {
      var key = mo['key'];
      if (server.providers[key]) {
        if (key in instacdn_cache) {
          console.log('Sending cached data key ' + key + ' to ' + peer);
          node.edges[peer].send(JSON.stringify({'event':'resp', 'rtime':mo['time'], 'id':mo['id'], 'status':true, 'data':instacdn_cache[key]}));        
        } else {
          console.log('Received get request for key not in cache: '+mo['key']);
        }
      }
      else {
        log.write('Asked to provide unavailable data key ' + mo['key'] + ' for ' + peer);
        this.edges[peer].send(JSON.stringify({'event':'resp', 'id':mo['id'], 'status':false}));
      }
    } 
    else if (mo['event'] == 'resp') {
      if (mo['rtime']) {
        var delta = (new Date()).valueOf() - mo['rtime'];
        this.edges[peer].rtt = (this.edges[peer].rtt * 3 + delta) / 4;
      }
      if (mo['status'] === false) {
        server.serverDataRecv++;
      }
      else {
        node.peerDataRecv++;
      }
      var waiters = server.waiters[mo['id']];
      if (waiters) {
        delete server.waiters[mo['id']];
        for (var i = 0; i < waiters.length; i++) {
          waiters[i](mo['status'] ? mo['data']: null);
        }
      }
    }
  },
  maybeConnect_:function(id, info) {
    if (!this.full()) {
      var pc = new WebP2PConnection();
      if (info) {
        pc.connect(info, function() {
          if (pc.state != WebP2PConnectionState.CONNECTED) {
            server.write({"to":id, "msg": pc.getId()});
          } else {
            pc.send(node.id);
          }
        });
      } else {
        server.write({"to": id, "msg": pc.getId()});
      }
      this.edges[id] = pc;
      pc.onMessage = node.onPeerMessage.bind(node, id);
      pc.onError = node.onPeerError.bind(node, id);
      pc.onStateChange = node.onPeerStateChange.bind(node, id);
    }
  },
};
