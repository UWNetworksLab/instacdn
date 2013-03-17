var outstanding = {};

freedom.on('load', function() {
  // Rewrite all img tags with data-src set.
  var images = document.getElementsByTagName('img');
  var urls = [];
  for (var i = 0; i < images.length; i++) {
    var url = images[i].getAttribute("data-src");
    if (url != null && typeof outstanding[url] === 'undefined') {
      outstanding[url] = [images[i]];
      urls.push(url);
    } else if (url != null) {
      outstanding[url].push(images[i]);
    }
  }
  freedom.emit('fetch', urls);
});

freedom.on('resource', function(rsrc) {
  var url = rsrc['url'];
  var els = outstanding[url];
  for (var i = 0; els && i < els.length; i++) {
    els[i].src = rsrc['src'];
  }
  delete outstanding[url];
});
