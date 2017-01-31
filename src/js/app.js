import initHighlight from './highlight.js'

var highlightContainers = document.querySelectorAll('.interactive-highlight-container');

for (var i=0;i<highlightContainers.length;i++){
    initHighlight(highlightContainers[i]);
}
