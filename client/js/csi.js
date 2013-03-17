var start = window.performance.now();
var end = -1;
var timer = function() {
  end = window.performance.now();
}
window.addEventListener('DOMSubtreeModified', timer);
window.setTimeout(function() {
  window.removeEventListener('DOMSubtreeModified', timer);
  document.body.appendChild(document.createTextNode("Load time: " + (end - start)));
}, 1000);