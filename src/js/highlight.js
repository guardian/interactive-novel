import {scaleLinear} from 'd3-scale'
import {max} from 'd3-array'
import {select,selectAll} from 'd3-selection'
import {line} from 'd3-shape'
import {easeLinear} from 'd3-ease'
import {transition,duration,ease} from 'd3-transition'
import data from '../assets/data.json'

export default function(el){
    el.querySelector('.interactive-highlight-viz').innerHTML = vizHtml

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

    animateVisualisation(el,quotes[count].date,quotes[count].quote,"",false);

    setInterval(function(){
        var elOffset = el.getBoundingClientRect().top;
        var elHeight = el.getBoundingClientRect().height;
        console.log(document.hidden)
        if(elOffset <= -elHeight || elOffset > windowHeight || document.hidden){return;}


        var isLast = count === quotes.length - 1;
        if(isLast){count = 0; looped = true;}
        else{count++;}

        var date = quotes[count].date;
        var newQuote = quotes[count].quote;

        animateVisualisation(el,date,newQuote,oldQuote,count === 0 && looped);

        oldQuote = newQuote;
    },6000)
}



// Viz variables
var vizPoints = [];
var vizMargin = 0;
var vizMarginTop = 10;
var vizWidth = document.querySelector('.interactive-highlight-viz').offsetWidth - vizMargin*2;
var vizHeight = vizWidth/3;

var maxPages = 44030;
var maxOffset = max(data,function(d){
    return Number(d.day_gap)
});

var offsetScale = scaleLinear().domain([0,maxOffset]).range([vizMarginTop,vizHeight-vizMarginTop]);
var wordScale = scaleLinear().domain([0,maxPages]).range([vizMarginTop,vizWidth - vizMarginTop]);

var lineFn = line()
    .x(function(d,i){
        if(i > 0){return wordScale(d.words - ((d.words - vizPoints[i-1].words)))
        }else{return 0}
    })
    .y(function(d,i){
        return offsetScale(d.day_gap ? d.day_gap : 0)
    })


function createVisualisation(){
    var targetEl = document.createElement('div')

    var svg = select(targetEl).append('svg')
        .attr('width',vizWidth)
        .attr('height',vizHeight)

    // Fill points
    data.forEach(function(e,i){
        vizPoints.push(e);
        if(i < data.length - 1){
            vizPoints.push({
                "blank": true,
                "day_gap": 0,
                "words": e.words + ((data[i+1].words - e.words)/2)
            })
        }
    })

    var baseline = svg.append('path')
        .datum(vizPoints)
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
        .attr('y1',vizMarginTop)
        .attr('y2',vizMarginTop)
        .attr('stroke','#999')
        .attr('stroke-width',1)
        .attr('stroke-linecap','round')
        .attr('stroke-dasharray','2,4')

    var highlightcircle = svg.append('circle')
        .attr('class','gv-highlightcircle')
        .attr('fill','#dc2a7d')
        .attr('transform','translate(3,' + vizMarginTop +')')
        // .attr('cx',3)
        // .attr('cy',vizMarginTop)
        .attr('r',3)




    return targetEl.innerHTML
}


function animateVisualisation(el,highlightDate,newQuote,oldQuote,isFirst){
    var hasFound = false;
    var highlightLine = select(el).select('svg .gv-highlightline');
    var highlightCircle = select(el).select('.gv-highlightcircle');
    var pointerLine = select(el).select('.gv-pointerline');
        pointerLine.attr('y2',vizMarginTop)
    var lineLengthOld = isFirst ? 0 : highlightLine.node().getTotalLength();
    var customData = vizPoints.filter(function(e){
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
                .attr('y2', vizHeight - vizMarginTop +60)
                //.attr("stroke-dasharray", (vizHeight - vizMarginTop) + " " + (vizHeight - vizMarginTop))
                .attr("stroke-dashoffset", vizHeight - vizMarginTop)
                .attr("stroke-dasharray","1,3")
                .transition()
                .duration(500)
                .attr("stroke-dashoffset", 0)
        })


}


var vizHtml = createVisualisation();
