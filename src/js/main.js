var el = document.createElement('script');
el.src = '<%= path %>/app.js';
document.body.appendChild(el);
const blocks = [].slice.apply(document.querySelectorAll(".interactive-block"));
