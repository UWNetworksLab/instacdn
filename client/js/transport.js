function TransportProvider() {
  this.peer = freedom['core.peerconnection']();

  this.peer.on('message', this.onMessage.bind(this));
  this.peer.on('onClose', this.onClose.bind(this));
};

TransportProvider.prototype.onMessage = function(m) {
  this.dispatchEvent('message', m);
};

TransportProvider.prototype.open = function(proxy, continuation) {
  var promise = this.peer.open(proxy);
  promise.done(continuation);
};

TransportProvider.prototype.send = function(msg, continuation) {
  var promise;
  if (msg instanceof Blob) {
    promise = this.peer.postMessage({"binary": msg})
  } else {
    console.log("Transport asking to post text msg: " + msg);
    promise = this.peer.postMessage({"text": msg});
  }
  promise.done(continuation);
};

TransportProvider.prototype.close = function(continuation) {
  peer.close().done(continuation);
};

TransportProvider.prototype.onClose = function() {
  this.dispatchEvent('onClose', null);
}

var transport = freedom.transport();
transport.provideAsynchronous(TransportProvider);
