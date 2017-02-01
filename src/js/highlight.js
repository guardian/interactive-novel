import {scaleLinear} from 'd3-scale'
import {max} from 'd3-array'
import {select,selectAll} from 'd3-selection'
import {line} from 'd3-shape'
import {easeLinear} from 'd3-ease'
import {transition} from 'd3-transition'
import data from '../assets/data.json'

var highlightEls = [].slice.call(document.querySelectorAll('.interactive-highlight-container'));
var summaryEls = [].slice.call(document.querySelectorAll('.interactive-graphic'));
var windowHeight = window.innerHeight;

export function initHighlight(el){
    el.querySelector('.interactive-highlight-viz').innerHTML = highlightHtml
}

function throttle (callback, limit) {
    var wait = false;                 
    return function () {              
        if (!wait) {                  
            callback.call();          
            wait = true;              
            setTimeout(function () {  
                wait = false;         
            }, limit);
        }
    }
}
function checkElPosition(){
    highlightEls.forEach(function(el,i){
        var offsetTop = el.getBoundingClientRect().top;

        if(offsetTop < windowHeight * 0.75 && offsetTop > -windowHeight/2){
            var quotes = [].map.call(el.querySelectorAll('.interactive-highlight-quote'),function(quote){
                return {
                    "quote":quote,
                    "date":quote.getAttribute('data-date')
                }
            })
            animateHighlight(el,quotes,0,"",false);
            highlightEls.splice(i,1)
        }
    })

    summaryEls.forEach(function(el,i){
        var offsetTop = el.getBoundingClientRect().top;

        if(offsetTop < windowHeight * 0.75 && offsetTop > -windowHeight/2){
            animateSummary(el);
            summaryEls.splice(i,1)
        }
    })
}

document.addEventListener('scroll',throttle(checkElPosition,200))

export function initGraphic(el,index){
    createSummary(el,index===1);
}




// Viz variables
var highlightPoints = [];
var highlightMargin = 0;
var highlightMarginTop = 10;
var highlightWidth = document.querySelector('.interactive-highlight-viz').offsetWidth - highlightMargin*2;
var highlightHeight = highlightWidth/4;

var maxPages = 44030;
var maxOffset = max(data,function(d){
    return Number(d.day_gap)
});

var offsetScale = scaleLinear().domain([0,maxOffset]).range([highlightMarginTop,highlightHeight - highlightMarginTop]);
var wordScale = scaleLinear().domain([0,maxPages]).range([highlightMarginTop,highlightWidth - highlightMarginTop]);

var lineFn = line()
    .x(function(d,i){
        if(i > 0){return wordScale(d.words - ((d.words - highlightPoints[i-1].words)))
        }else{return 0}
    })
    .y(function(d,i){
        return offsetScale(d.day_gap ? d.day_gap : 0)
    })


function createHighlight(vizWidth){
    var targetEl = document.createElement('div')

    var svg = select(targetEl).append('svg')
        .attr('width',highlightWidth)
        .attr('height',highlightHeight)

    // Fill points
    data.forEach(function(e,i){
        highlightPoints.push(e);
        if(i < data.length - 1){
            highlightPoints.push({
                "blank": true,
                "day_gap": 0,
                "words": e.words + ((data[i+1].words - e.words)/2)
            })
        }
    })

    var baseline = svg.append('path')
        .datum(highlightPoints)
        .attr('class','gv-baseline')
        .attr('fill','none')
        .attr('stroke','#333')
        .attr('stroke-width','1px')
        .attr('d',lineFn)

    var highlightline = svg.append('path')
        .attr('class','gv-highlightline')
        .attr('fill','none')
        .attr('stroke','#dc2a7d')
        .attr('stroke-width','2px')
        .attr('d','')

    var pointerLine = svg.append('line')
        .attr('class','gv-pointerline')
        .attr('x1',40.5)
        .attr('x2',40.5)
        .attr('y1',highlightMarginTop)
        .attr('y2',highlightMarginTop)
        .attr('stroke','#ccc')
        .attr('stroke-width',1)
        .attr('stroke-linecap','round')
        .attr('stroke-dasharray','2,4')

    var highlightcircle = svg.append('circle')
        .attr('class','gv-highlightcircle')
        .attr('fill','#dc2a7d')
        .attr('transform','translate(3,' + highlightMarginTop +')')
        .attr('r',3)



    return targetEl.innerHTML
}


function animateHighlight(el,quotes,count,oldQuote,isFirst){
    var hasFound = false;
    var highlightDate = quotes[count].date;
    var quote = quotes[count].quote;
    var looped = false;
    
    var highlightLine = select(el).select('svg .gv-highlightline');
    var highlightCircle = select(el).select('.gv-highlightcircle');
    var pointerLine = select(el).select('.gv-pointerline');
        pointerLine.attr('y2',highlightMarginTop)
    
    var lineLengthOld = isFirst ? 0 : highlightLine.node().getTotalLength();
    var customData = highlightPoints.filter(function(e){
        if(e.date === highlightDate){
            hasFound = true;
            return true
        }

        return !hasFound
    })
    var lastValue = customData[customData.length - 1];

    highlightLine.datum(customData).attr('d',lineFn)
    var lineLengthNew = highlightLine.node().getTotalLength();
    var lineDifference = (lineLengthNew - lineLengthOld) / lineLengthNew;
    var transitionSpeed = (lineLengthNew - lineLengthOld)*3;

    if(oldQuote){
        oldQuote.style.opacity = 0;
    }

    highlightCircle.transition()
        .duration(function(){
            if(isFirst){
                return transitionSpeed
            }else{
                return transitionSpeed / lineDifference
            }
        })
        .ease(easeLinear)
        .attrTween("transform", translateAlong(highlightLine.node()))

    function translateAlong(path) {
        var distance = lineLengthNew - lineLengthOld;

        return function(i) {
          return function(t) {
            var p = path.getPointAtLength(lineLengthOld + (t * lineLengthNew));
            return "translate(" + p.x + "," + p.y + ")";//Move marker
          }
        }
      }


    highlightLine
        .attr("stroke-dasharray", (lineLengthNew) + " " + (lineLengthNew))
        .attr("stroke-dashoffset", lineLengthNew - lineLengthOld)
        .transition()
        .duration(transitionSpeed)
        .ease(easeLinear)
        .attr("stroke-dashoffset", 0)
        .on('end',function(d){
            quote.style.opacity = 1;
            pointerLine
                .attr('x1', function(d){
                    var lastPathPoint = highlightLine.node().getPointAtLength(highlightLine.node().getTotalLength()).x;
                    return Math.round(lastPathPoint) + 0.5
                })
                .attr('x2', function(d){
                    var lastPathPoint = highlightLine.node().getPointAtLength(highlightLine.node().getTotalLength()).x;
                    return Math.round(lastPathPoint) + 0.5
                })
                .attr('y1',function(){
                    return highlightLine.node().getPointAtLength(highlightLine.node().getTotalLength()).y;
                })
                .attr('y2', highlightHeight - highlightMarginTop)
                .attr("stroke-dasharray", (highlightHeight - highlightMarginTop) + " " + (highlightHeight - highlightMarginTop))
                .attr("stroke-dashoffset", highlightHeight - highlightMarginTop)
                .transition()
                .duration(500)
                .attr("stroke-dashoffset", 0)

            function nextStep(){
                setTimeout(function(){
                    console.log('checking ' + el)
                    var offsetTop = el.getBoundingClientRect().top;
                    if(offsetTop > windowHeight * 0.75 || offsetTop < -windowHeight/2){
                        console.log('not in view')
                        nextStep();
                        return;
                    }
                    console.log('is in view')
                    var isLast = count === quotes.length - 1;
                    if(isLast){count = 0; looped = true;}
                    else{count++;}
                    animateHighlight(el,quotes,count,quote,looped)
                },6000)
            }
            nextStep();
        })
}


// Summary
var summaryWidth = document.querySelector('.interactive-graphic-viz').offsetWidth - highlightMargin*2;
var summaryHeight = summaryWidth / 6;
var summaryScale = scaleLinear().domain([0,maxPages]).range([highlightMarginTop,summaryWidth - highlightMarginTop]);
var summaryPoints = [];
var straightLineFn = line()
    .x(function(d,i){
        if(i > 0){return summaryScale(d.words - ((d.words - summaryPoints[i-1].words)))}
        else{ return 0}
    })
    .y(function(d,i){
        return offsetScale(d.gap ? d.gap : 0)
    })


function createSummary(el,animates){
    var svg = select(el).append('svg')
        .attr('width',summaryWidth)
        .attr('height',summaryHeight)

    summaryPoints = [];

    // Fill points
    data.forEach(function(e,i){
        summaryPoints.push(e);
        if(i < data.length - 1){
            summaryPoints.push({
                "blank": true,
                "day_gap": 0,
                "words": e.words + ((data[i+1].words - e.words)/2)
            })
        }
    })

    summaryPoints.map(function(e){
        e.gap = 0.5;
        return e;
    })

    var summaryBaseline = svg.append('path')
        .datum(summaryPoints)
        .attr('class','gv-baseline')
        .attr('fill','none')
        .attr('stroke','#333')
        .attr('stroke-width','1px')
        .attr('d',straightLineFn)


    if(!animates){
        var summaryLineLength = summaryBaseline.node().getTotalLength();
        
        summaryBaseline
            .attr("stroke-dasharray", summaryLineLength + " " + summaryLineLength)
            .attr("stroke-dashoffset", summaryLineLength)
    }else{
        svg.attr('opacity',0)
    }
}

function animateSummary(el){
    var summaryId = el.getAttribute('data-id');
    var svg = select(el).select('svg')
    var summaryBaseline = svg.select('.gv-baseline');
    var speed = 6000;
    if(summaryId === "ideal"){
        summaryBaseline
            .transition()
            .duration(speed)
            .ease(easeLinear)
            .attr('stroke-dashoffset',0)

        var startCircle = svg.append('circle')
            .attr('fill','#333')
            .attr('cx',3)
            .attr('cy',10)
            .attr('r',3)
        
        var label = svg.append('g')
            .attr('transform','translate(0,10)')

        label.append('circle')
            .attr('fill','#333')
            .attr('cx',0)
            .attr('cy',0)
            .attr('r',3)

        label.append('text')
            .text('100 words')
            .attr('dy',20)
            .attr('dx',-10)
            .attr('font-family','Arial')
            .attr('font-size','12px')
            .attr('fill',"#999")

        label.transition()
            .duration(speed)
            .ease(easeLinear)
            .tween('attr.transform',function(i){
                var node = this;
                var textEl = node.querySelector('text');
                var milestone = 1;
                return function(t){
                    var words = t * 44030;
                    if((words/5000)>milestone){
                        milestone++;
                        textEl.innerHTML = (milestone * 5000)/1000 + ",000" + " words"
                    }

                    node.setAttribute('transform','translate(' +  (summaryWidth-highlightMarginTop) * t + ',10)')
                }
            })
    }else if(summaryId === "real"){
        svg
            .transition()
            .duration(speed/10)
            .attr('opacity',1)

        summaryPoints.map(function(e){e.gap = e.day_gap; return e;})

        summaryBaseline.datum(summaryPoints)
            .transition()
            .duration(speed)
            .attr('d',straightLineFn) 
    }
}

var highlightHtml = createHighlight();

