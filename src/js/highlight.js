import {scaleLinear} from 'd3-scale'
import {max} from 'd3-array'
import {select,selectAll} from 'd3-selection'
import {line} from 'd3-shape'
import {easeLinear} from 'd3-ease'
import {transition,duration,ease} from 'd3-transition'
import data from '../assets/data.json'

export default function(el){
    el.querySelector('.interactive-highlight-viz').innerHTML = vizHtml

    var count = 0;
    var quotes = el.getAttribute('data-dates').split(', ').filter(function(e){return e});
    var looped = false;

    setInterval(function(){
        var date = quotes[count];
        var isLast = count === quotes.length - 1;

        animateVisualisation(el,date,count === 0 && looped);

        if(isLast){
            count = 0;
            looped = true;
        }else{
            count++;
        }
    },4000)
}

// Viz variables
var vizPoints = [];
var vizMargin = 0;
var vizWidth = document.querySelector('.interactive-highlight-viz').offsetWidth - vizMargin*2;
var vizHeight = vizWidth/2;

var maxPages = 44030;
var maxOffset = max(data,function(d){
    return Number(d.day_gap)
});

var offsetScale = scaleLinear().domain([0,maxOffset]).range([0,vizHeight/2]);
var wordScale = scaleLinear().domain([0,maxPages]).range([0,vizWidth]);

var lineFn = line()
    .x(function(d,i){
        if(i > 0){return wordScale(d.words - ((d.words - vizPoints[i-1].words)))
        }else{return 0}
    })
    .y(function(d,i){
        return (vizHeight/2) + offsetScale(d.day_gap ? d.day_gap : 0)
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

    return targetEl.innerHTML
}

function animateVisualisation(el,highlightDate,isFirst){
    var hasFound = false;
    var highlightLine = select(el).select('svg .gv-highlightline');
    var lineLengthOld = isFirst ? 0 : highlightLine.node().getTotalLength();
    var dataPoint;

    var customData = vizPoints.filter(function(e){
        if(e.date === highlightDate){
            hasFound = true;
            dataPoint = e;
            return true
        }

        return !hasFound
    })

    if(dataPoint){
        el.querySelector('.interactive-highlight-label').innerHTML = dataPoint.comments;
    }else{
        el.querySelector('.interactive-highlight-label').innerHTML = "aaaah wrong date. does not compute"
    }
    // console.log(dataPoint);

    highlightLine.datum(customData).attr('d',lineFn)
    var lineLengthNew = highlightLine.node().getTotalLength();
    var transitionSpeed = (lineLengthNew - lineLengthOld)*2;

    console.log(lineLengthNew - lineLengthOld)

    highlightLine
        .attr("stroke-dasharray", (lineLengthNew) + " " + (lineLengthNew))
        .attr("stroke-dashoffset", lineLengthNew - lineLengthOld)
        .transition()
        .duration(transitionSpeed)
        .ease(easeLinear)
        .attr("stroke-dashoffset", 0);
}

var vizHtml = createVisualisation();
