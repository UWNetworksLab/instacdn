var imap = {};

var e = 2;
function l() {
  if (--e == 0)
    onLoad();
}
window.addEventListener('DOMContentLoaded', l, false);
freedom.on('load', l);

freedom.on('qps', function(qps) {
  var qpsdiv = document.getElementById('qps');
  if (qpsdiv) {
    qpsdiv.appendChild(document.createTextNode("QPS: " + qps));
    qpsdiv.appendChild(document.createElement('br'));
    //qpsdiv.innerHTML = "QPS: " + qps;
  }
});

freedom.on('myid', function (myid) {
  top.postMessage({'n':window.performance.now(),'l':'id'},'*');
  var myiddiv = document.getElementById('myid');
  myiddiv.innerHTML = "ID: " + myid;
});

var onLoad = function() {
  // Rewrite all img tags with data-src set.
  var images = document.getElementsByTagName('img');
  var link = document.createElement('a');
  var urls = [];
  for (var i = 0; i < images.length; i++) {
    var url = images[i].getAttribute("data-src");
    link.href = url;
    url = link.protocol + "//" + link.host + link.pathname + link.search;
    if (url != null && typeof imap[url] === 'undefined') {
      imap[url] = [images[i]];
      urls.push(url);
    } else if (url != null) {
      imap[url].push(images[i]);
    }
  }
  delete link;
  top.postMessage({'n':window.performance.now(),'l':'fetch'},'*');
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
