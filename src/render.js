import mainTemplate from './src/templates/main.html!text'
import rp from 'request-promise'
import Mustache from 'mustache'

export async function render() {
let data = JSON.parse(await rp("https://interactive.guim.co.uk/docsdata-test/18Qy1WVYOXXy8yv-HHnG6hNuaZEQ3T8WQQn1ATIOMFBo.json"));
data.blocks.map((block) => {
  block.copyBlock = JSON.parse(block.copyBlock);

  if(block.copyBlock && block.copy) {
    block.copy = block.copy.replace(/[\r\n]+/g, '\n').split('\n');
  }

  return block;
});
let html = Mustache.render(mainTemplate, data);
return html;

}
