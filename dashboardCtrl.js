(function () {
  'use strict';

  angular.module('BlurAdmin.pages.dashboard')
    .controller('dashboardCtrl', dashboardCtrl);

  /** @ngInject */
  function dashboardCtrl($scope, baConfig, $element, layoutPaths) {

    var chartdiv = document.getElementById('chartdiv');
    var field2 = false;
    var dropDown = document.getElementById("fieldSelect");
    var desiredField = dropDown.options[dropDown.selectedIndex].value;
    var rollingAverageOn = false;
    var chartData = [];
    var timeFrame = 3600;
    var sensorsStatus = [];
    var makeTable = true;
    var sensorColors = ["#f44242","#f49541","#82f441","#1e2f44","#ff05fa","#c7ace2","#13562b","#683120","#000000","#fceabd","#0087ff"];

    var domainSlider = document.getElementById("domain");
    domainSlider.oninput = function(){
      timeFrame = this.value * 60;
    }

    var raSlider = document.getElementById("raTime");
    var averageTime = 900;
    raSlider.oninput = function(){
      averageTime = this.value * 60;
      addAllChartData();
    }

    dropDown.onchange = function(){
      desiredField = dropDown.options[dropDown.selectedIndex].value;
      setAxes = true;
      addAllChartData();
    }


    //var tableRef = document.getElementById('statusTable').getElementsByTagName('tbody')[0];
    function updateStatusTable(){
      var row = document.getElementById("templateRow"); // find row to copy
      for(var i = 0; i < sensorsStatus.length; i++){
          var table = document.getElementById("statusTable").getElementsByTagName('tbody')[0]; // find table to append to
          var clone = row.cloneNode(true); // copy children too
          clone.id = "row" + i; // change id or other attributes/contents
          table.appendChild(clone); // add new row to end of table=
          var myRow = document.getElementById('row' + i)
          myRow.querySelector("#sensorName").innerHTML = sensor_ids[i];
          var color = "color:" + rgbToHex(i);
          myRow.querySelector("#color").setAttribute("style", color);
          if(sensorsStatus[i]){
            myRow.querySelector('#status').classList.add("btn-success");
          }else{
            myRow.querySelector('#status').classList.add("btn-danger");
          }
      }
      row.parentNode.removeChild(row);
    }

    var avgCheckBox = document.getElementById("rollingAverage");
    avgCheckBox.addEventListener( 'change', function() {
        if(this.checked) {
          rollingAverageOn = true;
    			setAxes = true;
          timeFrame = timeFrame + averageTime;
          addAllChartData();
        } else {
          rollingAverageOn = false;
    			setAxes = true;
          timeFrame = timeFrame - averageTime;
          addAllChartData();
        }
    });

    function rollingAverage(timeStamps, data, avgPeriod, timestampFreq){
      var avgIndex = (avgPeriod / timestampFreq)//use avgPeriod and timestampFreq to calculate how many array indexes to average together
      var rollingAvg = []
    	timeStamps = timeStamps.slice(avgIndex, timeStamps.length);
      for(var i = 0; i < data.length - avgIndex; i++){
        var dataSum = 0;
        var dataAvg = 0;
        for(var j = i; j < i + avgIndex; j++){
          dataSum = dataSum + data[j];
        }
        dataAvg = dataSum / avgIndex;
        var formatted = convertUnix(timeStamps[i]);
        rollingAvg.push({date: formatted, v0: dataAvg});
      }
      return rollingAvg;
    }

    function convertUnix(timestamp){
      ////"2014-03-01, 08:05:05"
      var date = new Date(timestamp * 1000)
      var year = date.getFullYear();
      var month = date.getMonth() + 1;
      if(month < 10) month = "0" + month;
      var day = date.getDate();
      if(day < 10) day = "0" + day;
      var hour = date.getHours();
      if(hour < 10) hour = "0" + hour;
      var min = date.getMinutes();
      if(min < 10) min = "0" + min;
      var seconds = date.getSeconds();
      if(seconds < 10) seconds = "0" + seconds;
      var dateStr = year + "-" + month + "-" + day + ", " + hour + ":" + min + ":" + seconds;
      return dateStr;
    }

    var chart = AmCharts.makeChart("chartdiv", {
        "type": "serial",
        "theme": "light",
        "marginRight": 80,
        "autoMarginOffset": 20,
        "marginTop": 7,
        "dataProvider": chartData,
        "fontSize": 15,
        "valueAxes": [{
    			  "minimum": 150,
    				"maximum": 550,
            "axisAlpha": 0.2,
            "dashLength": 1,
            "position": "left",
            "precision": 2,
            "integersOnly": false,
            "step": 0.5
        }],
        "mouseWheelZoomEnabled": true,
        "graphs": [{
            "id": "g0",
            "balloonText": "[[value]]",
            "bullet": "round",
            "bulletBorderAlpha": 1,
            "bulletColor": "#FFFFFF",
            "hideBulletsCount": 50,
            "title": "red line",
            "valueField": "v0",
            "useLineColorForBulletBorder": true,
            "balloon":{
                "drop":true
            }
        },
    		{
            "id": "g1",
            "balloonText": "[[value]]",
            "bullet": "round",
            "bulletBorderAlpha": 1,
            "bulletColor": "#ffffff",
            "hideBulletsCount": 50,
            "title": "blue line",
            "valueField": "v1",
            "useLineColorForBulletBorder": true,
            "balloon":{
                "drop":true
            }
        }],
        "chartCursor": {
           "limitToGraph":"g1"
        },
        "categoryField": "date",
        "dataDateFormat": "YYYY-MM-DD, JJ:NN:SS", //"2014-03-01, 08:05:05"
        "categoryAxis": {
            "parseDates": false,
            "axisColor": "#DADADA",
            "dashLength": 1,
            "autoGridCount": true,
            "minHorizontalGap": 250,
            "minorGridEnabled": true
        },
        "export": {
            "enabled": true
        }
    });

    var sensor_ids = [];
    //function to gather user's sensor information
    function querySensorInfo() {
        var xmlHttp = new XMLHttpRequest(); // Initialize our XMLHttpRequest instance
        xmlHttp.open("POST", "sensor_info.php", false); // Starting a POST request (NEVER send passwords as GET variables!!!)
        xmlHttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xmlHttp.addEventListener("load", ajaxCallback, false); // It's easy to forget this line for POST requests
        xmlHttp.send();
        function ajaxCallback(event){
          var jsonData = JSON.parse(event.target.responseText); // parse the JSON into a JavaScript object
          for(var i = 0; i < jsonData.length; i++){
            sensor_ids.push(jsonData[i]);
          }
          console.log(sensor_ids);
        }
    }

    function rgbToHex(i) {
    	switch(i){
        case 0:
          return "#336699";
        break;
    		case 1:
    		    	return "#f44242"; //red
    		break;
    		case 2:
    		    	return "#f49541"; //orange
    		break;
    		case 3:
    		    	return "#82f441"; //green
    		break;
    		case 4:
    		    	return "#1e2f44"; //navy
    		break;
    		case 5:
    		    	return "#ff05fa"; //pink
    		break;
    		case 6:
    		    	return "#c7ace2"; //lavender
    		break;
    		case 7:
    		    	return "#13562b"; //dark green
    		break;
    		case 8:
    		    	return "#683120"; //brown
    		break;
    		case 9:
    		    	return "#000000"; //black
    		break;
    		case 10:
    		    	return "#fceabd"; //cream
    		break;
    		default:
    		    	return "#0087ff"; //royal blue
    		break;
    	}
	}

    function prepGraph(sensors){
    	var graphs = [{
    			"id": "g0",
    			"balloonText": "[[value]]",
    			"bullet": "round",
    			"bulletBorderAlpha": 1,
    			"bulletColor": "#FFFFFF",
          "lineColor": "#336699",
    			"hideBulletsCount": 50,
    			"title": "red line",
    			"valueField": "v0",
    			"useLineColorForBulletBorder": true,
    			"balloon":{
    					"drop":true
    			}
    	}];
    	for(var i = 1; i < sensors.length; i++){
    		//make a variable for current color to be passed into
    		var lineColor = rgbToHex(i);
    		var valueField = "v" + i;
    		var template = {
            "id": "g" + i,
            "balloonText": "[[value]]",
            "bullet": "round",
            "bulletBorderAlpha": 1,
            "bulletColor": "#ffffff",
            "lineColor": lineColor,
            "hideBulletsCount": 50,
            "title": "blue line",
            "valueField": valueField,
            "useLineColorForBulletBorder": true,
            "balloon":{
                "drop":true
            }
        }
    		graphs.push(template);
    	}
    	chart.graphs = graphs;
    }


    var field2 = false;
    var desiredField2 = "cf_count0_3"
    var chartData = []
    var setAxes = true;

    function addAllChartData(){
      //querySensorInfo();
    	prepGraph(sensor_ids);
      var chartMax = 0
      var chartMin = 100000;
      var all_sensors = [];
      var sensor_data = [];
    	var rolling_data = [];
      var sensor_timestamps = [];
    	var stampFrequency = 5;
      var dataString = "sensorID=" + encodeURIComponent(sensor_ids[0]) + "&field=" + encodeURIComponent(desiredField) + "&timeframe=" + encodeURIComponent(timeFrame);
      var xmlHttp = new XMLHttpRequest(); // Initialize our XMLHttpRequest instance
      xmlHttp.open("POST", "sensor_data.php", false); // Starting a POST request (NEVER send passwords as GET variables!!!)
      xmlHttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      xmlHttp.addEventListener("load", ajaxCallbackOne, false); // It's easy to forget this line for POST requests
      xmlHttp.send(dataString);
      function ajaxCallbackOne(event){
        var jsonData = JSON.parse(event.target.responseText); // parse the JSON into a JavaScript object
        if(jsonData.length == 0){
          sensorsStatus[0] = false;
        }
        else{
          sensorsStatus[0] = true;
        }
        var eventCount = jsonData.eventCount;
        if(jsonData.length > 1){
          stampFrequency = jsonData[1]["timestamp"] - jsonData[0]["timestamp"];
        }
        if(setAxes && !rollingAverageOn){
          var tempMax = Math.max.apply(Math,jsonData.map(function(o){ return parseInt(o[desiredField])}));
          var tempMin = Math.min.apply(Math,jsonData.map(function(o){ return parseInt(o[desiredField])}));
          if(tempMax > chartMax){
            chartMax = tempMax;
          }
          if(tempMin < chartMin){
            chartMin = tempMin;
          }
        }
        for(var i = 0; i < jsonData.length; i++){
          if(rollingAverageOn){
            sensor_timestamps.push(parseInt(jsonData[i]["timestamp"]));
            rolling_data.push(parseFloat(jsonData[i][desiredField]));
          }
          else{
            var formatted = convertUnix(parseInt(jsonData[i]["timestamp"]));
            var timeAndValue = {date: formatted, v0: parseFloat(jsonData[i][desiredField])};
            sensor_data.push(timeAndValue);
          }
        }
        if(rollingAverageOn){
            sensor_data = rollingAverage(sensor_timestamps, rolling_data, averageTime, stampFrequency);
            console.log(sensor_data);
    				if(setAxes){
    					var tempMax = Math.max.apply(Math,sensor_data.map(function(o){ return parseInt(o["v0"])}));
    					var tempMin = Math.min.apply(Math,sensor_data.map(function(o){ return parseInt(o["v0"])}));
              console.log("first tempmax: " + tempMax)
              console.log("first tempmin: " + tempMin)
              if(tempMax > chartMax){
                chartMax = tempMax;
              }
              if(tempMin < chartMin){
                chartMin = tempMin;
              }
    				}
        }

        all_sensors = sensor_data;
      }


      for(var j = 1; j < sensor_ids.length; j++){
        var valueString = "v" + j;
        var sensor_data = [];
        var sensor_timestamps = [];
        var dataString = "sensorID=" + encodeURIComponent(sensor_ids[j]) + "&field=" + encodeURIComponent(desiredField) + "&timeframe=" + encodeURIComponent(timeFrame);
        var xmlHttp = new XMLHttpRequest(); // Initialize our XMLHttpRequest instance
        xmlHttp.open("POST", "sensor_data.php", false); // Starting a POST request (NEVER send passwords as GET variables!!!)
        xmlHttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xmlHttp.addEventListener("load", ajaxCallback, false); // It's easy to forget this line for POST requests
        xmlHttp.send(dataString);
        function ajaxCallback(event){
          var jsonData = JSON.parse(event.target.responseText); // parse the JSON into a JavaScript object
          var eventCount = jsonData.eventCount;
          if(jsonData.length == 0){
            sensorsStatus[j] = false;
          }
          else{
            sensorsStatus[j] = true;
          }
          if(setAxes && !rollingAverageOn){
            var tempMax = Math.max.apply(Math,jsonData.map(function(o){ return parseInt(o[desiredField])}));
            var tempMin = Math.min.apply(Math,jsonData.map(function(o){ return parseInt(o[desiredField])}));
            if(tempMax > chartMax){
              chartMax = tempMax;
            }
            if(tempMin < chartMin){
              chartMin = tempMin;
            }
          }
          for(var i = 0; i < jsonData.length; i++){
            if(rollingAverageOn){
              sensor_timestamps.push(parseInt(jsonData[i]["timestamp"]));
              rolling_data[i] = (parseFloat(jsonData[i][desiredField]));
            }
            else{
              var timeAndValues = all_sensors[i];
    					Object.defineProperty(timeAndValues, valueString, {
    					  value: parseFloat(jsonData[i][desiredField]),
    					  writable: true
    					});
    					all_sensors[i] = timeAndValues;
            }
          }
          if(rollingAverageOn){
              sensor_data = rollingAverage(sensor_timestamps, rolling_data, averageTime, stampFrequency);
              if(setAxes){
      					var tempMax = Math.max.apply(Math,sensor_data.map(function(o){ return parseFloat(o["v0"])}));
      					var tempMin = Math.min.apply(Math,sensor_data.map(function(o){ return parseFloat(o["v0"])}));
                console.log("tempmax: " + tempMax)
                console.log("tempmin: " + tempMin)
                if(tempMax > chartMax){
                  chartMax = tempMax;
                }
                if(tempMin < chartMin){
                  chartMin = tempMin;
                }
      				}
              for(var i = 0; i < sensor_data.length; i++){
                  var timeAndValues = all_sensors[i];
    							Object.defineProperty(timeAndValues, valueString, {
    								value: sensor_data[i]["v0"],
    								writable: true
    							});
    							all_sensors[i] = timeAndValues;
              }
          }
        }
      }
      if(setAxes){
        console.log("did set regular axes");
        console.log("chartMax: " + chartMax);
        console.log("chartMin: " + chartMin);
        if(chartMin <= 100){
          chart.valueAxes[0].minimum = 0;
        }
        else{
          chart.valueAxes[0].minimum = chartMin - 10
        }
        chart.valueAxes[0].maximum = chartMax + 10
        setAxes = false;
      }

      chart.dataProvider = all_sensors;
      chart.validateData();
      if(makeTable){
        updateStatusTable();
        makeTable = false;
      }
    }
    querySensorInfo();
    addAllChartData();
    setInterval(addAllChartData, 10000);
  }
})();
