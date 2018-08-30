/**
 * @author v.lugovsky
 * created on 16.12.2015
 */
(function () {
  'use strict';

  angular.module('BlurAdmin.pages.sensors.sensor1')
    .controller('sensor1Ctrl', sensor1Ctrl);

  /** @ngInject */
  function sensor1Ctrl($scope, baConfig, $element, layoutPaths) {
    $scope.recordNotes = recordNotes;
    var chartdiv = document.getElementById('chartdiv');
    //console.log(notesDiv.value);
    var field2 = false;
    var currentSensor = "";
    var dropDown = document.getElementById("fieldSelect");
    var desiredField = dropDown.options[dropDown.selectedIndex].value;
    var rollingAverageOn = false;
    var chartData = [];
    var timeFrame = 3600;
    var stampFrequency = 5; //default stamp frequency used in rolling average, is set again based on timestamp in ajaxCallback

    var domainField = document.getElementById("domain");
    domainField.oninput = function(){
      timeFrame = this.value * 60;
      updateChartData();
    }

    var raField = document.getElementById("raTime");
    var averageTime = 900;
    raField.oninput = function(){
      averageTime = this.value * 60;
      updateChartData();
    }
    var eightHourDate = document.getElementById("eightHourDate");
    var avgText = document.getElementById("eightHourAvg");
    eightHourDate.oninput = function (){
      var date = eightHourDate.value;
      var dataString = "sensor_id=" + encodeURIComponent(currentSensor) + "&defaultDate=" + encodeURIComponent(date);
      var xmlHttp = new XMLHttpRequest(); // Initialize our XMLHttpRequest instance
      xmlHttp.open("POST", 'sensor_date_write.php', true); // Starting a POST request (NEVER send passwords as GET variables!!!)
      xmlHttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      xmlHttp.addEventListener("load", ajaxCallback, false); // It's easy to forget this line for POST requests
      xmlHttp.send(dataString);
      function ajaxCallback(event){
        console.log(event.target.responseText);
      }
      calculateEightHour();
      setInterval(calculateEightHour, 5000);
    }
    function calculateEightHour(){
      var dateValue = eightHourDate.value; //1998-02-20T12:30
      var date = new Date(dateValue);

      var sensor_data = [];
      var avgFrame = date.getTime() / 1000;
      var dataString = "sensorID=" + encodeURIComponent(currentSensor) + "&field=" + encodeURIComponent(desiredField) + "&timeframe=" + encodeURIComponent(avgFrame);
      var xmlHttp = new XMLHttpRequest(); // Initialize our XMLHttpRequest instance
      xmlHttp.open("POST", 'sensor_eight_hour_data.php', true); // Starting a POST request (NEVER send passwords as GET variables!!!)
      xmlHttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      xmlHttp.addEventListener("load", ajaxCallback, false); // It's easy to forget this line for POST requests
      xmlHttp.send(dataString);
      function ajaxCallback(event){
        console.log(event.target.responseText);
        var jsonData = JSON.parse(event.target.responseText); // parse the JSON into a JavaScript object
        var eventCount = jsonData.eventCount;
        if(jsonData.length > 1){
          var tempFrequency = jsonData[1]["timestamp"] - jsonData[0]["timestamp"];
          var eightHourIndex = (60 / tempFrequency) * 60 * 8;
          console.log("tempFrequency: " + tempFrequency);
          console.log("eighthourIndex: " + eightHourIndex);
        }
        if(jsonData.length > eightHourIndex){
          for(var i = 0; i < eightHourIndex; i++){
            if(jsonData[i][desiredField] != null){
              fieldSum = fieldSum + parseFloat(jsonData[i][desiredField]);
            }
          }
        }
        var fieldSum = 0;
        for(var i = 0; i < jsonData.length; i++){
          if(jsonData[i][desiredField] != null){
            fieldSum = fieldSum + parseFloat(jsonData[i][desiredField]);
          }
        }
        console.log(fieldSum);
        if(fieldSum > 0){
          var eightHourAvg = fieldSum / eightHourIndex;
        }
        else{
          var eightHourAvg = 0;
        }
        console.log(eightHourAvg)
        avgText.innerHTML = eightHourAvg;
      }

    }

    dropDown.onchange = function(){
      desiredField = dropDown.options[dropDown.selectedIndex].value;
      updateChartData();
    }

    var raCheckBox = document.getElementById("rollingAverage");
    var rollingAverageOn = false;
    raCheckBox.addEventListener('change', function() {
        if(this.checked) {
          rollingAverageOn = true;
          timeFrame = timeFrame + averageTime;
          updateChartData();
        } else {
          rollingAverageOn = false;
          timeFrame = timeFrame - averageTime;
          updateChartData();
        }
    });

    // var date1 = document.getElementById("date1");
    // var date2 = document.getElementById("date2");
    // var averageBtn = document.getElementById("averageBtn");
    // averageBtn.addEventListener("click", averageOverDates);
    //
    // function averageOverDates(){
    //   var first = date1.value;
    //   var second = date2.value;
    //   console.log(first);
    //   console.log(second);
    // }

    function rollingAverage(timeStamps, data, avgPeriod, timestampFreq){
      var avgIndex = (avgPeriod / timestampFreq); //use avgPeriod and timestampFreq to calculate how many array indexes to average together
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

    //converts unix timestamp to amchart formatted date
    function convertUnix(timestamp){
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
      var dateStr = year + "-" + month + "-" + day + ", " + hour + ":" + min + ":" + seconds; //"2018-07-17, 08:05:05"
      return dateStr;
    }

    //creates initial chart to be populated with chartData;
    var chart = AmCharts.makeChart(chartdiv, {
        type: 'serial',
        theme: 'light',
        marginRight: 80,
        autoMarginOffset: 20,
        marginTop: 7,
        fontSize: 15,
        dataProvider: chartData,
        valueAxes: [{
            axisAlpha: 0.2,
            dashLength: 1,
            position: 'left'
        }],
        mouseWheelZoomEnabled: false,
        graphs: [{
            id: 'g1',
            balloonText: '[[value]]',
            bullet: 'round',
            bulletBorderAlpha: 1,
            bulletColor: '#FFFFFF',
            hideBulletsCount: 50,
            title: 'red line',
            valueField: 'v0',
            useLineColorForBulletBorder: true,
            balloon:{
                drop:true
            }
        }],
        chartCursor: {
           limitToGraph:'g1'
        },
        categoryField: 'date',
        dataDateFormat: 'YYYY-MM-DD, JJ:NN:SS', //"2014-03-01, 08:05:05"
        categoryAxis: {
            parseDates: false,
            axisColor: "#DADADA",
            dashLength: 1,
            autoGridCount: true,
            minHorizontalGap: 250,
            minorGridEnabled: true
        },
        export: {
            enabled: true
        },
        pathToImages: layoutPaths.images.amChart  //ADDED 07/10/2018
    });

    // chart.addListener("zoomed", function(event) {
    //   if (chart.ignoreZoomed) {
    //     chart.ignoreZoomed = false;
    //     return;
    //   }
    //   chart.zoomStartDate = event.startDate;
    //   chart.zoomEndDate = event.endDate;
    // });
    //
    // chart.addListener("dataUpdated", function(event) {
    //   console.log(chart.zoomStartDate);
    //   chart.zoomToDates(chart.zoomStartDate, chart.zoomEndDate);
    // });

    function updateNotesData(){
      var notesDiv = document.getElementById('notes');
      var dataString = "sensor_id=" + encodeURIComponent(currentSensor);
      var xmlHttp = new XMLHttpRequest(); // Initialize our XMLHttpRequest instance
      xmlHttp.open("POST", 'sensor_notes.php', true); // Starting a POST request (NEVER send passwords as GET variables!!!)
      xmlHttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      xmlHttp.addEventListener("load", ajaxCallback, false); // It's easy to forget this line for POST requests
      xmlHttp.send(dataString);
      function ajaxCallback(event){
        console.log(event.target.responseText);
        var jsonData = JSON.parse(event.target.responseText); // parse the JSON into a JavaScript object
        var eventCount = jsonData.eventCount;
        var notes = jsonData;
        console.log(notes);
        notesDiv.value = notes;
      }
    }

    function recordNotes(){
      var notesDiv = document.getElementById('notes');
      var noteVal = notesDiv.value;
      var dataString = "sensor_id=" + encodeURIComponent(currentSensor) + "&notes=" + encodeURIComponent(noteVal);
      var xmlHttp = new XMLHttpRequest(); // Initialize our XMLHttpRequest instance
      xmlHttp.open("POST", 'sensor_notes_write.php', true); // Starting a POST request (NEVER send passwords as GET variables!!!)
      xmlHttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      xmlHttp.addEventListener("load", ajaxCallback, false); // It's easy to forget this line for POST requests
      xmlHttp.send(dataString);
      function ajaxCallback(event){
        console.log(event.target.responseText);

      }
    }

    var sensor_ids = [];
    var eightHourDefaultDate;
    var silicaPercentage;
    //function to gather user's sensor information
    function querySensorInfo() {
        var xmlHttp = new XMLHttpRequest(); // Initialize our XMLHttpRequest instance
        xmlHttp.open("POST", "sensor_info.php", false); // Starting a POST request (NEVER send passwords as GET variables!!!)
        xmlHttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xmlHttp.addEventListener("load", ajaxCallback, false); // It's easy to forget this line for POST requests
        xmlHttp.send();
        function ajaxCallback(event){
          var jsonData = JSON.parse(event.target.responseText); // parse the JSON into a JavaScript object
          currentSensor = jsonData[0]["sensor_id"];
          eightHourDefaultDate = jsonData[0]["eightHourDate"]
          silicaPercentage = jsonData[0]["silicaPercent"];
        }
        eightHourDate.value = eightHourDefaultDate;
        calculateEightHour();
    }

    function updateChartData(){
      var rollingData = [];
      var sensor_timestamps = [];
      var sensor_data = [];
      var sensor_data2 = [];
      var dataString = "sensorID=" + encodeURIComponent(currentSensor) + "&field=" + encodeURIComponent(desiredField) + "&timeframe=" + encodeURIComponent(timeFrame);
      var xmlHttp = new XMLHttpRequest(); // Initialize our XMLHttpRequest instance
      xmlHttp.open("POST", 'sensor_data.php', true); // Starting a POST request (NEVER send passwords as GET variables!!!)
      xmlHttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      xmlHttp.addEventListener("load", ajaxCallback, false); // It's easy to forget this line for POST requests
      xmlHttp.send(dataString);
      function ajaxCallback(event){
        console.log(event.target.responseText);
        var jsonData = JSON.parse(event.target.responseText); // parse the JSON into a JavaScript object
        var eventCount = jsonData.eventCount;
        if(jsonData.length > 1){
          console.log("setting stamp freq")
          stampFrequency = jsonData[1]["timestamp"] - jsonData[0]["timestamp"];
        }
        for(var i = 0; i < jsonData.length; i++){
          if(rollingAverageOn){
            sensor_timestamps.push(parseInt(jsonData[i]["timestamp"]));
            rollingData.push(parseFloat(jsonData[i][desiredField]));
          }
          else{
            var formatted = convertUnix(parseInt(jsonData[i]["timestamp"]));
            var timeAndValue = {date: formatted, v0: parseFloat(jsonData[i][desiredField])};
            sensor_data.push(timeAndValue);
          }
        }

        if(rollingAverageOn){
            sensor_data = rollingAverage(sensor_timestamps, rollingData, averageTime, stampFrequency);
        }
        var NewChartData = sensor_data;
        console.log(NewChartData);
        //Adding new data to array
        //Setting the new data to the graph
        chart.dataProvider = NewChartData;
        //Updating the graph to show the new data
        chart.validateData();
      }
    }
    //updateNotesData();
    updateChartData();
    querySensorInfo();
    setTimeout(updateNotesData, 500);
    setInterval(updateChartData, 5000);
  }

})();
