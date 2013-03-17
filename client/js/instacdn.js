var instacdn_cache = {};
var outstanding = {};

freedom.on('load', rewrite_images);
//window.addEventListener('load', rewrite_images, true);

function rewrite_images() {
  // Rewrite all img tags with instacdn_src attribute
  var images = document.getElementsByTagName('img');
  var urls = [];
  for (var i = 0; i < images.length; i++) {
    var url = images[i].getAttribute("data-src");
    if (url != null) {
      outstanding[url] = images[i];
      urls.push(url);
    }
  }
  freedom.emit('fetch', urls);
}

freedom.on('resource', function(rsrc) {
  var url = rsrc['url'];
  var el = outstanding[url];
  if (el) {
    el.src = rsrc['src'];
    delete outstanding[url];
  }
});
