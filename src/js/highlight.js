import {scaleLinear} from 'd3-scale'
import {max} from 'd3-array'
import {select,selectAll} from 'd3-selection'
import {line} from 'd3-shape'
import {easeLinear} from 'd3-ease'
import {transition} from 'd3-transition'
import data from '../assets/data.json'

export function initHighlight(el){
    el.querySelector('.interactive-highlight-viz').innerHTML = highlightHtml

    var windowHeight = window.innerHeight;
    var looped = false;
    var oldQuote = "";
    var count = 0;
    var quotes = [].map.call(el.querySelectorAll('.interactive-highlight-quote'),function(quote){
        return {
            "quote":quote,
            "date":quote.getAttribute('data-date')
        }
    })

    animateHighlight(el,quotes[count].date,quotes[count].quote,"",false);


    setInterval(function(){
        var elOffset = el.getBoundingClientRect().top;
        var elHeight = el.getBoundingClientRect().height;
        if(elOffset <= -elHeight || elOffset > windowHeight || document.hidden){return;}


        var isLast = count === quotes.length - 1;
        if(isLast){count = 0; looped = true;}
        else{count++;}

        var date = quotes[count].date;
        var newQuote = quotes[count].quote;
        
        animateHighlight(el,date,newQuote,oldQuote,count === 0 && looped);

        oldQuote = newQuote;
    },6000)
}



export function initGraphic(el,index){
    if(index === 0){
        el.querySelector('.interactive-graphic-viz').innerHTML = createSummary(false);
    }else{
        el.querySelector('.interactive-graphic-viz').innerHTML = createSummary(true);

    }   
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

    var highlightcircle = svg.append('circle')
        .attr('class','gv-highlightcircle')
        .attr('fill','#dc2a7d')
        .attr('transform','translate(3,' + highlightMarginTop +')')
        .attr('r',3)

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




    return targetEl.innerHTML
}


function animateHighlight(el,highlightDate,newQuote,oldQuote,isFirst){
    var hasFound = false;
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

    wordScale.range([highlightMarginTop,highlightWidth - highlightMarginTop]);

    highlightLine.datum(customData).attr('d',lineFn)
    var lineLengthNew = highlightLine.node().getTotalLength();
    var lineDifference = (lineLengthNew - lineLengthOld) / lineLengthNew;
    var transitionSpeed = (lineLengthNew - lineLengthOld)*5;

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
            newQuote.style.opacity = 1;
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
            console.log(d.gap)
            return offsetScale(d.gap ? d.gap : 0)
        })


function createSummary(animates){
    console.log('hello, in here')
    var targetEl = document.createElement('div')
    var svg = select(targetEl).append('svg')
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
        e.gap = 0;
        return e;
    })

    var summaryBaseline = svg.append('path')
        .datum(summaryPoints)
        .attr('class','gv-baseline')
        .attr('fill','none')
        .attr('stroke','#333')
        .attr('stroke-width','1px')
        .attr('d',straightLineFn)

    if(animates){
        summaryPoints.map(function(e){e.gap = e.day_gap; return e;})

        summaryBaseline.datum(summaryPoints)
            .transition()
            .attr('stroke','blue')
            .attr('d',straightLineFn) 

        
    }

    return targetEl.innerHTML
}

var highlightHtml = createHighlight();

