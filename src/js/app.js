import {initHighlight,initGraphic} from './highlight.js'

var highlightContainers = document.querySelectorAll('.interactive-highlight-container');
var graphicContainers = document.querySelectorAll('.interactive-graphic')

for (var i=0;i<highlightContainers.length;i++){
    initHighlight(highlightContainers[i]);
}

for (var i=0;i<graphicContainers.length;i++){
    initGraphic(graphicContainers[i],i);
}