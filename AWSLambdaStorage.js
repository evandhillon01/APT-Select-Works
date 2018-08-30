//Connect to sql database outside event handler to store and query sensor data
var mysql = require('mysql');
var AWS = require('aws-sdk');

var con = mysql.createConnection({
	host: "*****",
	user: "*****",
	password: "*****",
	database: "*****"
});

exports.handler = (event, context, callback) => {
	var sensor = event.sensor_id  //store sensor id from payload
	var lines = event.message.split("$"); //split $ seperated list into lines to be parsed and stored in results
	var results = [];
	var calibration_slopes = [];
	var calibration_intercepts = [];

	var headers = ["timestamp", "temperature", "humidity", "count0_3", "count0_5", "count1_0",
	"count2_5", "count5_0", "count10_0", "pm1_0", "pm2_5", "pm10_0", "pma1_0", "pma2_5", "pma10_0"];

	//loop through each line, seperate each element by ',' and then loop through that line and store
	//each element and its corresponding header in an object to be pushed into results
	for (var i = 0; i < lines.length - 1; i++) {
		var obj = {};
		var currentline = lines[i].split(",");
		obj["sensor_id"] = sensor;
		for (var j = 0; j < headers.length; j++) {
			obj[headers[j]] = currentline[j];
		}
		results.push(obj);
	}
	//results[] now holds all data objects for the sensor

	//unix time of 1 week before most recent timestamp used to clear old data from sensor table if its not a new sensor
	var oldTime = results[0].timestamp - 172800;

	con.connect(function(err) {
		if (err) throw err;
		//query Sensor_Info table to see if this sensor is recognized or not
		con.query("SELECT EXISTS(SELECT * FROM Sensor_Info WHERE sensor_id = '" + sensor + "')",
			function(err, result) {
				if (err) {
					throw err;
				}
				else {
					//if the 'result' from sensor_id exists query is true then the sensor already exists,
					if (result[0]["EXISTS(SELECT * FROM Sensor_Info WHERE sensor_id = '" + sensor + "')"] == 0) {
						//creating new table if it is a new sensor
						con.query("CREATE TABLE " + sensor + " (timestamp int(11), temperature int(11), humidity int(11), count0_3 int(11), count0_5 int(11), count1_0 int(11), count2_5 int(11), count5_0 int(11), count10_0 int(11), pm1_0 int(11), pm2_5 int(11), pm10_0 int(11), pma1_0 int(11), pma2_5 int(11), pma10_0 int(11), cf_count0_3 double, cf_count0_5 double, cf_count1_0 double, cf_count2_5 double, cf_count5_0 double, cf_count10_0 double, newPM1 double, newPM2_5, double, newPM5 double, newPM10 double, newPMTotal double);",
							function(err, result) {
								if (err) {
									throw err;
								}
								con.query("SELECT * FROM Sensor_Info WHERE sensor_id = '" + sensor + "'",
									function(err, result) {
										if (err) {
											throw err;
										}
										calibration_slopes[0] = result[0].count0_3_slope;
										calibration_slopes[1] = result[0].count0_5_slope;
										calibration_slopes[2] = result[0].count1_0_slope;
										calibration_slopes[3] = result[0].count2_5_slope;
										calibration_slopes[4] = result[0].count5_0_slope;
										calibration_slopes[5] = result[0].count10_0_slope;
										calibration_intercepts[0] = result[0].count0_3_intercept;
										calibration_intercepts[1] = result[0].count0_5_intercept;
										calibration_intercepts[2] = result[0].count1_0_intercept;
										calibration_intercepts[3] = result[0].count2_5_intercept;
										calibration_intercepts[4] = result[0].count5_0_intercept;
										calibration_intercepts[5] = result[0].count10_0_intercept;
										var density = result[0].density;

										for (var i = 0; i < results.length; i++) {

											var count0_3_cal = results[i].count0_3 * calibration_slopes[0] + calibration_intercepts[0];
											if (count0_3_cal < 0){
												count0_3_cal = 0
											}
											var count0_5_cal = results[i].count0_5 * calibration_slopes[1] + calibration_intercepts[1];
											if (count0_5_cal < 0){
												count0_5_cal = 0
											}
											var count1_0_cal = results[i].count1_0 * calibration_slopes[2] + calibration_intercepts[2];
											if (count1_0_cal < 0){
												count1_0_cal = 0
											}
											var count2_5_cal = results[i].count2_5 * calibration_slopes[3] + calibration_intercepts[3];
											if (count2_5_cal < 0){
												count2_5_cal = 0
											}
											var count5_0_cal = results[i].count5_0 * calibration_slopes[4] + calibration_intercepts[4];
											if (count5_0_cal < 0){
												count5_0_cal = 0
											}
											var count10_0_cal = results[i].count10_0 * calibration_slopes[5] + calibration_intercepts[5];
											if (count10_0_cal < 0){
												count10_0_cal = 0
											}
											var newPM1 = count0_3_cal * ((Math.PI * Math.pow(0.4 * 0.000001,3)) / 6) * density * 10000000000000 + count0_5_cal * ((Math.PI * Math.pow(0.75 * 0.000001,3)) / 6) * density * 10000000000000;
											var newPM2_5 = newPM1 + count1_0_cal * ((Math.PI * Math.pow(1.75 * 0.000001,3)) / 6) * density * 10000000000000;
											var newPM5 = newPM2_5 + count2_5_cal * ((Math.PI * Math.pow(3.75 * 0.000001,3)) / 6) * density * 10000000000000;
											var newPM10 = newPM5 + count5_0_cal * ((Math.PI * Math.pow(7.5 * 0.000001,3)) / 6) * density * 10000000000000;
											var newPMTotal = newPM10 + count10_0_cal * ((Math.PI * Math.pow(55 * 0.000001,3)) / 6) * density * 10000000000000;

											con.query("INSERT INTO " + sensor + " (timestamp, temperature, humidity, count0_3, count0_5, count1_0, count2_5, count5_0, count10_0, pm1_0, pm2_5, pm10_0, pma1_0, pma2_5, pma10_0, cf_count0_3, cf_count0_5, cf_count1_0, cf_count2_5, cf_count5_0, cf_count10_0, newPM1, newPM2_5, newPM5, newPM10, newPMTotal) VALUES(" + results[i].timestamp + ", " + results[i].temperature + ", " + results[i].humidity + ", " + results[i].count0_3 + ", " + results[i].count0_5 + ", " + results[i].count1_0 + ", " + results[i].count2_5 + ", " + results[i].count5_0 + ", " + results[i].count10_0 + ", " + results[i].pm1_0 + ", " + results[i].pm2_5 + ", " + results[i].pm10_0 + ", " + results[i].pma1_0 + ", " + results[i].pma2_5 + ", " + results[i].pma10_0 + ", " + count0_3_cal + ", " + count0_5_cal + ", " + count1_0_cal + ", " + count2_5_cal + ", " + count5_0_cal + ", " + count10_0_cal +  ", " + newPM1 + ", " + newPM2_5 + ", " + newPM5 + ", " + newPM10 + ", " + newPMTotal + ")",
												function(err, result) {
													if (err) throw err;
													console.log("Result: " + result);
												});
										}
									});

							});
							//update sensor_info with new sensor
						con.query("INSERT INTO Sensor_Info (sensor_id, user) VALUES('" + sensor + "', 'apt')",
							function(err, result) {
								if (err) {
									throw err;
								}
							});
					}
					else {
						//old sensor so just store results into its corresponding sensor table based on id
						con.query("SELECT * FROM Sensor_Info WHERE sensor_id = '" + sensor + "'",
							function(err, result) {
								if (err) {
									throw err;
								}
								calibration_slopes[0] = result[0].count0_3_slope;
								calibration_slopes[1] = result[0].count0_5_slope;
								calibration_slopes[2] = result[0].count1_0_slope;
								calibration_slopes[3] = result[0].count2_5_slope;
								calibration_slopes[4] = result[0].count5_0_slope;
								calibration_slopes[5] = result[0].count10_0_slope;
								calibration_intercepts[0] = result[0].count0_3_intercept;
								calibration_intercepts[1] = result[0].count0_5_intercept;
								calibration_intercepts[2] = result[0].count1_0_intercept;
								calibration_intercepts[3] = result[0].count2_5_intercept;
								calibration_intercepts[4] = result[0].count5_0_intercept;
								calibration_intercepts[5] = result[0].count10_0_intercept;
								var density = result[0].density;

								for (var i = 0; i < results.length; i++) {
									var count0_3_cal = results[i].count0_3 * calibration_slopes[0] + calibration_intercepts[0];
									if (count0_3_cal < 0){
										count0_3_cal = 0
									}
									var count0_5_cal = results[i].count0_5 * calibration_slopes[1] + calibration_intercepts[1];
									if (count0_5_cal < 0){
										count0_5_cal = 0
									}
									var count1_0_cal = results[i].count1_0 * calibration_slopes[2] + calibration_intercepts[2];
									if (count1_0_cal < 0){
										count1_0_cal = 0
									}
									var count2_5_cal = results[i].count2_5 * calibration_slopes[3] + calibration_intercepts[3];
									if (count2_5_cal < 0){
										count2_5_cal = 0
									}
									var count5_0_cal = results[i].count5_0 * calibration_slopes[4] + calibration_intercepts[4];
									if (count5_0_cal < 0){
										count5_0_cal = 0
									}
									var count10_0_cal = results[i].count10_0 * calibration_slopes[5] + calibration_intercepts[5];
									if (count10_0_cal < 0){
										count10_0_cal = 0
									}

									var newPM1 = count0_3_cal * ((Math.PI * Math.pow(0.4 * 0.000001,3)) / 6) * density * 10000000000000 + count0_5_cal * ((Math.PI * Math.pow(0.75 * 0.000001,3)) / 6) * density * 10000000000000;
									var newPM2_5 = newPM1 + count1_0_cal * ((Math.PI * Math.pow(1.75 * 0.000001,3)) / 6) * density * 10000000000000;
									var newPM5 = newPM2_5 + count2_5_cal * ((Math.PI * Math.pow(3.75 * 0.000001,3)) / 6) * density * 10000000000000;
									var newPM10 = newPM5 + count5_0_cal * ((Math.PI * Math.pow(7.5 * 0.000001,3)) / 6) * density * 10000000000000;
									var newPMTotal = newPM10 + count10_0_cal * ((Math.PI * Math.pow(55 * 0.000001,3)) / 6) * density * 10000000000000;

										con.query("INSERT INTO " + sensor + " (timestamp, temperature, humidity, count0_3, count0_5, count1_0, count2_5, count5_0, count10_0, pm1_0, pm2_5, pm10_0, pma1_0, pma2_5, pma10_0, cf_count0_3, cf_count0_5, cf_count1_0, cf_count2_5, cf_count5_0, cf_count10_0, newPM1, newPM2_5, newPM5, newPM10, newPMTotal) VALUES(" + results[i].timestamp + ", " + results[i].temperature + ", " + results[i].humidity + ", " + results[i].count0_3 + ", " + results[i].count0_5 + ", " + results[i].count1_0 + ", " + results[i].count2_5 + ", " + results[i].count5_0 + ", " + results[i].count10_0 + ", " + results[i].pm1_0 + ", " + results[i].pm2_5 + ", " + results[i].pm10_0 + ", " + results[i].pma1_0 + ", " + results[i].pma2_5 + ", " + results[i].pma10_0 + ", " + count0_3_cal + ", " + count0_5_cal + ", " + count1_0_cal + ", " + count2_5_cal + ", " + count5_0_cal + ", " + count10_0_cal +  ", " + newPM1 + ", " + newPM2_5 + ", " + newPM5 + ", " + newPM10 + ", " + newPMTotal + ")",
										function(err, result) {
											if (err) throw err;
										});
								}
								//delete data from sensor table if it is more than a week old
								con.query("DELETE FROM " + sensor + " WHERE timestamp <= " + oldTime,
									function(err, result) {
										if (err) throw err;
										console.log("Result: " + result);
									});
								});
					}
				}
			});
	});
};
