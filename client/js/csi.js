var start = window.performance.now();
var end = -1;
var timer = function(e) {
  if(e.target.tagName == "IMG") {
    end = window.performance.now();
  }
}
window.addEventListener('DOMSubtreeModified', timer);
var timeID = window.setInterval(function() {
  if (end >= 0) {
    window.removeEventListener('DOMSubtreeModified', timer);
    document.body.appendChild(document.createTextNode("Load time: " + (end - start)));
  }
  window.clearInterval(timeID);
}, 1000);
