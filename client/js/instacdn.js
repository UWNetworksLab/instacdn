var instacdn_cache = {};

window.addEventListener('load', function() {
  console.log("Connecting to tracker");
  server.start();
  server.socket.onopen = function() {
    console.log("Connected to tracker");
    server.write({
      event:'register'
    });
  }
  server.subscribers.push(function(msg) {
    console.log("Tracker message received: " + JSON.stringify(msg));
  });
  server.subscribers.push(node.onServerMessage.bind(node));
  //Hack until on-demand connection establishment is done
  window.setTimeout(rewrite_images, 1000);
}, false);

function rewrite_images() {
  //Rewrite all img tags with instacdn_src attribute
  var images = document.getElementsByTagName('img');
  for (var i = 0; i < images.length; i++) {
    var url = images[i].getAttribute("instacdn-src");
    if (url != null) {
      instacdn_fetch(images[i], url);
    }
  }
}

function http_get(url) {
  var req = new XMLHttpRequest();
  req.overrideMimeType('text/plain; charset=x-user-defined');
  req.open("GET", url, false);
  req.send(null);
  var binary = '';
  for (var i = 0; i < req.responseText.length; i++) {
    binary += String.fromCharCode(req.responseText.charCodeAt(i) & 0xFF);
  }
  return binary;
}

function getMimeTypeFromUrl(url) {
  url = url.toLowerCase();
  var tokens = url.split('.');
  var ext = tokens[tokens.length-1];
  if (ext.substring(0,3) === "png")
    return "image/png";
  else if (ext.substring(0,3) === "gif")
    return "image/gif";
  else if (ext.substring(0,3) === "jpg" || ext.substring(0,4) === "jpeg")
    return "image/jpeg";
  else
    return "text/plain";
}

function instacdn_fetch(img, url) {
  if (!img.rewritten) {
    if (!(url in instacdn_cache)) {
      console.log("Fetching " + url);
      server.retrieve({hash:url}, function(data) {
        if (data === null) {
          console.log("Fetched from server");
          instacdn_cache[url] = window.btoa(http_get(url));
        } else {
          console.log("Fetched from peers: "+data);
          instacdn_cache[url] = data;
        }
        server.announce_hash({'hash':url}, null);
        img.src = "data:" + getMimeTypeFromUrl(url) + ";base64," + instacdn_cache[url];
        img.rewritten = true;
      });
    } else {
      img.src = "data:" + getMimeTypeFromUrl(url) + ";base64," + instacdn_cache[url];
      img.rewritten = true;
    }
  }
}
