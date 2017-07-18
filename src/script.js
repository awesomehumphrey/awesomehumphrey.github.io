'use strict';

const Donut = require("./donut");
const Data = require("./data");
const VDateTime = require("./datetime");

const dateToIndex = require("./dateToIndex").dateToIndex;
const jaggedDonut = Donut.jaggedDonut;
const simpleCircle = Donut.simpleCircle;

const _ = require("lodash");
const moment = require("moment");

var global_hourly_data;
var global_data_counts;

var donuts = {};
var global_color = [];////baa
var inner_radius = [];//////
var global_data_locs = [];
//console.log(global_color);

const MonthToNumber = {
  'January': 1,
  'February': 2,
  'March': 3,
  'April': 4,
  'May': 5,
  'June': 6,
  'July': 7,
  'August': 8,
  'September': 9,
  'October': 10,
  'November': 11,
  'December': 12
}

function transform_count_data(data) {

  let parsed = _.map(data, (d) => {
    return {
      year: parseInt(d.Year),
      month: parseInt(d.Month),
      sensor_id: parseInt(d.Sensor_ID),
      date: parseInt(d.Mdate),
      time: parseInt(d.Time),
      count: parseInt(d.Hourly_Counts)
    }
  })


  let sorted = _.sortBy(parsed, [
    "sensor_id",
    "year",
    "month",
    "date",
    "time"
  ])

  let result = [];

  for (let sid = 1; sid < 50; sid++) {

    let sensor_one = _.filter(sorted, (d) => { return d.sensor_id === sid });

    let daily_counts = {};

    _.each(sensor_one, (d) => {

      let date_str = d.date + "-" + d.month + "-" + d.year;

      if (!daily_counts[date_str]) {
        daily_counts[date_str] = [];
      }

      daily_counts[date_str].push(d.count);

    });

    result.push(daily_counts);

  }
  console.log(JSON.stringify(result));

  return result;


}

var allTemp = [];
function process_temp_data(temp_data) {

  let date_to_type = {};
  
  let maxTemp = {}
  let minTemp = {}

  _.each(temp_data, (d) => {

    let date_str = d.Day + "-" + d.Month + "-" + d.Year;
	
    date_to_type[date_str] = parseInt(d.type);
	maxTemp[date_str] = parseFloat(d.max);
	minTemp[date_str] = parseFloat(d.min);
	
  })
  allTemp.push(date_to_type);
  allTemp.push(maxTemp);
  allTemp.push(minTemp);
console.log(allTemp[0]);
  return allTemp[0];     ///return max, min and type instead of only type
}


Data.readData((data_locs, data_counts, data_temp) => {

  let locations = {};

  data_locs.forEach((d) => {
    const sid = d["Sensor ID"];
    locations[sid] = {
      street_name: d["Sensor Description"],
      lat: d["Latitude"],
      lon: d["Longitude"]
    }
  })

  /// NOTE(maxim): no need to transform pre-processed
  // data_counts = transform_count_data(data_counts);

  data_temp = process_temp_data(data_temp);
  global_data_counts = data_counts;
  createMap(data_locs, data_counts, data_temp, () => {});
  /// TODO: use data to create maxs and mins for 
console.log(data_temp);

});
//Function for normalising the values between a range
Array.prototype.scaleBetween = function(scaledMin, scaledMax) {
  var max = Math.max.apply(Math, this);
  var min = Math.min.apply(Math, this);
  return this.map(num => (scaledMax-scaledMin)*(num-min)/(max-min)+scaledMin);
}

function prepareDonutData(daily_counts, data_temp, date_idx) {

  //console.log(daily_counts);
  var result = daily_counts[date_idx];
  //var baa = result.map(function(x) { return x * 2; });
  result = result.scaleBetween(5, 20); //normalising the values between 4 and 20
  
  console.log(result);
  
  return  result////return an array[result{object}, color] instead of only result{object}

}

var hourMin = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

function createDonut(cx, cy, hourData, global_color, j) {  ////No longer need to pass inner_radius as parameter
//console.log(global_color);
//console.log(hourData.hot.mins);
//console.log(inner_radius[j]);

    const svg = d3.select("svg");

    //set the min and max radius values for the donut
    var donutMinimumRadius = 20;
    var donutMaximumRadius = 80;

     //leave as false if we want to auto-scale based on min/max for this specific hourlyData dataset, otherwise can 'cap' values at this value
    var donutMinimumValue = false;
    var donutMaximumValue = false;

    var donutAngle = Math.PI * 2; // will mostly likely just be Math.PI for semi-circle or 2*Math.PI for full circle;

//var yellowGreen = d3.interpolateYlOrRd(0.3)
    //"hot" half donut
    var points = jaggedDonut(cx, cy,
      inner_radius[j] + 5,
      donutMaximumRadius,
      donutMinimumValue,
      donutMaximumValue,
      donutAngle, -1, hourData, hourMin) 
    let first_half = svg.append("svg:polygon")
      .style("fill", global_color)
      .attr("opacity", 0.75)
    //.attr("stroke", "black")
      .attr("points", points);


    /* //"cold" half donut
    var points = jaggedDonut(cx, cy,
      donutMinimumRadius,
      donutMaximumRadius,
      donutMinimumValue,
      donutMaximumValue,
      donutAngle, -1, hourData.cold.maxs, hourData.cold.mins) 
    let second_half = svg.append("svg:polygon")
      .attr("fill", 'url(#gradient2)')
      .attr("opacity", 1)
    //.attr("stroke", "black")
      .attr("points", points); */

    return [first_half];     //second_half

}


function createMap(locs, data_counts, temp_data, callback){
	global_data_locs = locs;
	console.log(global_data_locs);
	
	L.mapbox.accessToken = 'pk.eyJ1IjoidmFoYW4iLCJhIjoiY2luaWhyaDBxMHdydHUybTMzanViNzJpNCJ9.B_ndOs4dnU_XghOU9xfnSg';

	var map = L.mapbox.map('map', 'mapbox.streets',{ zoomControl:false, scrollWheelZoom :false })
		.setView([-37.8108798759503,144.960010438559], 14);
		
		//map.zoom = 140;

		map.getPane('tilePane').style.opacity = 0.4;
		
  map.touchZoom.disable();
  map.doubleClickZoom.disable();
  map.scrollWheelZoom.disable();
  map.boxZoom.disable();
  map.keyboard.disable();
  map.dragging.disable();

  var svg = d3.select(map.getPanes().overlayPane).append("svg").attr("width", map._size.x).attr("height", map._size.y),
    g = svg.append("g").attr("id","mapg").attr("class", "leaflet-zoom-hide");

  locs.map( function(d){ var newPoint = map.latLngToLayerPoint( [d.Latitude, d.Longitude] ); d["lpoints"] = { 'x' : newPoint.x, 'y' : newPoint.y }; return d; } );
  
  var loctypes =["Attraction","Dining","Entertainment","Housing","Library","Meeting","Office","Park","Shopping","Station","Street","University"];
  var mycolor = d3.scaleOrdinal(['#993300','#9494b8','#002080','#809fff','#b300b3','#336600','#660066','#ff3399','#ffa64d','#7575a3','#c6538c','#ff5c33']);			//['#595AB7','#A57706','#D11C24','#C61C6F','#BD3613','#2176C7','#259286','#738A05']     d3.schemeCategory20

  g.selectAll("circle").data( locs ).enter().append("circle")
    .attr("cx", function(d){ return d.lpoints.x } )
    .attr("cy", function(d){ return d.lpoints.y } )
    .attr("r", function(d,i){
		
		var selectedDateText = document.getElementById("mydate").value;
		var selectedDate = new Date(selectedDateText);
		var day = selectedDate.getDate();
		var month = selectedDate.getMonth()+1;
		var year = selectedDate.getFullYear();
		var date_idx = day+"-"+month+"-"+year;
		var selectedTime = document.getElementById("mytime").value;
		//var xidx = dateToIndex(day,month,year);
		//xidx = xidx + parseInt(selectedTime);
		var time_idx = parseInt(selectedTime);
		var radius;
		
		var sensor_idx = parseInt(d["Sensor ID"]);
		if (data_counts[sensor_idx-1] == null) radius = 0;
		else if (data_counts[sensor_idx-1][date_idx] == null) radius= 0;
		else radius= data_counts[sensor_idx-1][date_idx][time_idx] / 200;
		
		inner_radius.push(radius); //This is the inner_radius used for the first rendering. Consequently it will be reinitilised and used within updateSensor()
		//console.log(radius);
		return radius;


	})
    .style("fill", function(d){
		
		var xidx = loctypes.indexOf(d["Location Type"]);
		if (xidx == -1) xidx = loctypes.length;
		var thecolor = mycolor(xidx);
		/////
		global_color.push(thecolor); 
		return thecolor;
		
	})
    .on("mouseover", function(d, i) {
		//console.log(d);
        if (donuts[i] === undefined) { donuts[i] = {}}
        if (donuts[i].shown === true) return;
        
        donuts[i].shown = true;
        var s = d3.select(this);

        let start = {d: 1, m: 7, y: 2013, h: 0};
        let end =   {d: 1, m: 10, y: 2016, h: 0};
		
		var selectedDateText = document.getElementById("mydate").value;
		var selectedDate = new Date(selectedDateText);
		var day = selectedDate.getDate();
		var month = selectedDate.getMonth()+1;
		var year = selectedDate.getFullYear();
		var date_idx = day+"-"+month+"-"+year;

        const sid = parseInt(d["Sensor ID"]);

        console.log("sid:", sid);
		//console.log(inner_radius);
        var hourData = prepareDonutData(data_counts[sid - 1], temp_data, date_idx)

        donuts[i].svgs = createDonut(+s.attr("cx"), +s.attr("cy"), hourData, global_color[i], i); // parameter i in createDonut() is just an index
    })
    .on("click", (d, i) => {
      donuts[i].keep = !donuts[i].keep;
    })
    .on("mouseout", (d, i) => {

      if (donuts[i].shown && !donuts[i].keep) {
        donuts[i].shown = false;
        donuts[i].svgs[0].remove();
        //donuts[i].svgs[1].remove();
      }
    });
//console.log(global_color);
	
	var catSvg = d3.select("#categories").append("svg").attr("width",800).attr("height",75);
	catSvg.selectAll("circle").data(loctypes).enter().append("circle").attr("cx",function(d,i){
		if (i > 5) return (i - 5)*140 - 130;
		else return (i+1)*140 - 130;
		})
		.attr("cy", function(d,i){
		if (i > 5) return 50;
		else return 15;
		}).attr("r",10).style("fill", function(d,i){return mycolor(i);});
	catSvg.selectAll("text").data(loctypes).enter().append("text").attr("x",function(d,i){
		if (i > 5) return (i - 5)*140 - 107;
		else return (i+1)*140 - 107;
		})
		.attr("y", function(d,i){
			if (i > 5) return 55;
		else return 20;
			
		}).text(function(d){return d;});
		
	updateTemperature();
	updateWeekday();
	callback();
}
////////////////////////
var addHour;
var flag = true;
//var input = document.getElementById("input");
var playButton = document.getElementById("play");

var dateInput = document.getElementById("mydate");
var timeInput = document.getElementById("mytime");
var slider = document.getElementById("myslider");

dateInput.addEventListener("change", function(){
	clearTitle();
	
	switch(document.getElementById("mydate").value) {  //dateInput is used to update the eventinput
		case "2013-09-07":
			document.getElementById("newIncident").selectedIndex = 1;
			document.getElementById("mytitle").innerHTML = document.getElementById("newIncident").options[1].text;
			break;
		case "2013-02-10":
			document.getElementById("newIncident").selectedIndex = 2;
			document.getElementById("mytitle").innerHTML = document.getElementById("newIncident").options[2].text;
			break;
		case "2014-11-29":
			document.getElementById("newIncident").selectedIndex = 3;
			document.getElementById("mytitle").innerHTML = document.getElementById("newIncident").options[3].text;
			break;
		case "2014-12-25":
			document.getElementById("newIncident").selectedIndex = 4;
			document.getElementById("mytitle").innerHTML = document.getElementById("newIncident").options[4].text;
			break;
		case "2015-12-25":
			document.getElementById("newIncident").selectedIndex = 5;
			document.getElementById("mytitle").innerHTML = document.getElementById("newIncident").options[5].text;
			break;
		default:
			document.getElementById("newIncident").selectedIndex = 0; 
			//No need for id("mytitle") to be updated because clearTitle() above already takes care of that
	}
	
	updateSensors();
	updateTemperature();	
	updateWeekday();
	
});

timeInput.addEventListener("click", function(){
	updateSensors();
		
});
///////////////////////////////////////

function start() {
    addHour = setInterval(function (){
		
		if (timeInput.value == 23){  //// Strictly use == 23, >=23 doesn't work correctly
			//timeInput.value == 23
			//updateSensors();
			stop();
			timeInput.value = 0;
			updateSensors();
			return;   //exit the function early so timeInput.value retains 0 else it executes next timeInput.value++ and retains 1
		}	
		timeInput.value++; 
		updateSensors(); //update sensors
	},1000);
    //console.log(timeInput.value);
    playButton.value = "Stop";
    flag = !flag;
	//return;
}//start();

function stop() {
	clearInterval(addHour); 
	playButton.value = "Start";
	flag = !flag;
}

playButton.addEventListener("click", function() { 
	if(flag){
		start();
	}
	else{
		stop();
	}
});



function clearTitle(){
	document.getElementById("mytitle").innerHTML = "Pedestrian Data Visualisation";
}

var incident = document.getElementById("incident");
//New Humphrey
var element = document.getElementById("newIncident");
var newValue = element.options[element.selectedIndex].value;  //This looks redundant but it's important for the select box to work
//var newText = element.options[element.selectedIndex].text;
var incidents = [{"name":"Christmas 2015","date":"2015-12-25"},{"name":"State Elections 2014", "date":"2014-11-29"}, {"name":"Federal Elections 2013", "date":"2013-09-07"}, {"name":"Christmas 2014","date":"2014-12-25"}, {"name":"Lunar New Year 2013","date":"2013-02-10"}];
//console.log(newValue);
element.addEventListener("change", function(){
	//var ri = Math.floor((Math.random() * incidents.length) + 0);
	if(element.options[element.selectedIndex].text == "Select event"){
		document.getElementById("mytitle").innerHTML = "Pedestrian Data Visualisation";
	}
	else {
		document.getElementById("mytitle").innerHTML = element.options[element.selectedIndex].text;
	}
	//document.getElementById("mytitle").innerHTML = "Melbourne Pedestrian Count - "+ element.options[element.selectedIndex].text;//.text(incidents[ri].name).attr("x","50%").attr("y",10);
	dateInput.value = element.options[element.selectedIndex].value;  
	//element.value = dateInput.value;
	console.log(dateInput.value);
	
	updateSensors();
	updateTemperature();
	updateWeekday();
});

function updateSensors(){
	
	switch(document.getElementById("mytime").value){   /////Change the background colour of map based on time of the day.
		case "0":
		case "1":
		case "2":
		case "22":
		case "23":
			document.getElementById("map").style.backgroundColor = "rgba(0,24,72,0.40)";
			break;
		case "3":
		case "4":
			document.getElementById("map").style.backgroundColor = "rgba(0,24,72,0.35)";
			break;
		case "19":
			document.getElementById("map").style.backgroundColor = "rgba(0,24,72,0.15)";
			break;
		case "20":
		case "21":
			document.getElementById("map").style.backgroundColor = "rgba(0,24,72,0.25)";
			break;
		case "5":
		case "6":
			document.getElementById("map").style.backgroundColor = "rgba(0,24,72,0.30)";
			break;
		case "17":
		case "18":
			document.getElementById("map").style.backgroundColor = "rgba(0,24,72,0.05)";
			break;
		case "7":
		case "8":
			document.getElementById("map").style.backgroundColor = "rgba(0,24,72,0.15)";
			break;
		case "9":
		case "10":
		case "11":
			document.getElementById("map").style.backgroundColor = "rgba(0,24,72,0.05)";
			break;
		case "12":
		case "13":
		case "14":
		case "15":
		case "16":
			document.getElementById("map").style.backgroundColor = "rgba(0,24,72,0)";
			break;
		default:
			document.getElementById("map").style.backgroundColor = "rgba(0,24,72,0)";
	}	
	
	
	inner_radius = []; //reinitilise inner_radius after the first rendering by createDonut so that updateSensors/inner_radius can use/push the newly calculated values
	var tmpg = d3.select("#mapg");
	tmpg.selectAll("circle").transition().attr("r", function(d,i){
							
							var selectedDateText = document.getElementById("mydate").value;
							var selectedDate = new Date(selectedDateText);
							var day = selectedDate.getDate();
							var month = selectedDate.getMonth()+1;
							var year = selectedDate.getFullYear();
							var date_idx = day+"-"+month+"-"+year;
							var selectedTime = document.getElementById("mytime").value;
							var time_idx = parseInt(selectedTime);
							var radius;
							
							var sensor_idx = parseInt(d["Sensor ID"]);
							if (global_data_counts[sensor_idx-1] == null) radius = 0;
							else if (global_data_counts[sensor_idx-1][date_idx] == null) radius= 0;
							else radius= global_data_counts[sensor_idx-1][date_idx][time_idx] / 200
   
							inner_radius.push(radius);
							return radius;
	});
	
	d3.selectAll("polygon").remove();  //remove all clock radials on update
	for (var i in donuts) { //and then update object members 
		donuts[i].shown = false;
		donuts[i].keep = !donuts[i].keep; 
	} 
	
}


function updateTemperature(){
	var selectedDateText = document.getElementById("mydate").value;
	var selectedDate = new Date(selectedDateText);
	var day = selectedDate.getDate();
	var month = selectedDate.getMonth()+1;
	var year = selectedDate.getFullYear();
	var date_idx = day+"-"+month+"-"+year;
	
	var list = document.getElementById('list');
	if(allTemp[1][date_idx] == null || allTemp[2][date_idx] == null){
		list.innerHTML = "<li><em>Data unavailable</em></li>";
	}
	else{
	list.innerHTML = "<li><em>Max: "+allTemp[1][date_idx] +"</em></li>" + "<li><em>Min: "+allTemp[2][date_idx] +"</em></li>";
	//console.log(allTemp[1][date_idx]);
	}
	
}

function updateWeekday(){
	var selectedDateText = document.getElementById("mydate").value;
	var selectedDate = new Date(selectedDateText);
	//var day = selectedDate.getDay();    ////getDay is different from getDate
	
	var myVar = selectedDate.toDateString();
	//console.log(myVar);
	
	/* var weekday = new Array(7);
	weekday[0] =  "Sunday";
	weekday[1] = "Monday";
	weekday[2] = "Tuesday";
	weekday[3] = "Wednesday";
	weekday[4] = "Thursday";
	weekday[5] = "Friday";
	weekday[6] = "Saturday";

	var dayOfWeek = weekday[day]; */
	//console.log(dayOfWeek);
	
	var wd = document.getElementById('weekday');
	wd.innerHTML = "<h3><em>"+myVar+"</em></h3>";	
}

//transport_select.setAttribute("onchange", function(){toggleSelect(transport_select_id);});