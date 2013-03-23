var start = window.performance.now();
top.postMessage({'n':start},'*');
var end = -1;
var timer = function(e) {
  if(e.target.tagName == "IMG") {
    console.log("BOOM!");
    end = window.performance.now();
  }
}
window.addEventListener('DOMSubtreeModified', timer);
var timeID = window.setInterval(function() {
  if (end >= 0) {
    window.removeEventListener('DOMSubtreeModified', timer);
    document.body.appendChild(document.createTextNode("Load time: " + (end - start)));
    window.clearInterval(timeID);
    top.postMessage({'n':end,'final':true},'*');
  }
}, 1000);
