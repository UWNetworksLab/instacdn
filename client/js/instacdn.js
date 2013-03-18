var imap = {};

var e = 2;
function l() {
  if (--e == 0)
    onLoad();
}
window.addEventListener('DOMContentLoaded', l, false);
freedom.on('load', l);

var onLoad = function() {
  // Rewrite all img tags with data-src set.
  var images = document.getElementsByTagName('img');
  var urls = [];
  for (var i = 0; i < images.length; i++) {
    var url = images[i].getAttribute("data-src");
    if (url != null && typeof imap[url] === 'undefined') {
      imap[url] = [images[i]];
      urls.push(url);
    } else if (url != null) {
      imap[url].push(images[i]);
    }
  }
  freedom.emit('fetch', urls);
};

freedom.on('resource', function(rsrc) {
  var url = rsrc['url'];
  var els = imap[url];
  for (var i = 0; els && i < els.length; i++) {
    els[i].src = rsrc['src'];
  }
  delete imap[url];
});
