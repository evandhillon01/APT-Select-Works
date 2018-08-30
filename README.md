# apt-dashboard
APT Dashboard Documentation:

Overview:

I've developed a fullstack web platform for APT's sensors. The sensors publish mqtt messages that are processed and calibrated in a lambda function on aws. The payload contains particle
data that is calibrated and stored in a MySQL database hosted by aws rds. The MySql database is backed up to amazon S3 once every eight hours using a shell script run on the ec2 server.
The front end of the website is based on the angular blur-admin repository.

Lambda Function:

There is one main lambda function that handles the calibration and data storage/deletion in AWS. ED-ProcessStoreSensorData is suscribed to the 'minima' mqtt topic. The function receives
json payloads from the sensors with a sensor field and a message field. If a table for the sensor name does not yet exist in the sql database then the function will create a new table
based off the name and store payloads in it. If the sensor already exists in the db then it will just store the payload in the corresponding table. The function multiplies the sensors 
calibration factors for each field before storage. These factors are stored and set in the MySQL table, Sensor_Info. The function also deletes data older than 48 hours from the sensor
that published the message.

MySQL DB:

The rds hosted db has a table for each senssor, a Sensor_Info table and a users table. The sensor tables store the particle data and timestamps for each sensor. The sensor info table
stores the calibration factors for each sensor as well as the user the sensor is tied to. The users table stores the email of each user a userid used to assign sensors to and a
hashed password. 

Blur-Admin:

The frontend of the website is based on the angular blur-admin repository. User's sign in at auth.html where they can either create a new user account or login to an existing account.
If logging into an existing account the email and password is checked by a php script that queries the sql db for the password corresponding the email input, and is passed into a function
to check if the input password matches up with the hashed password. IF succesful the user is redirected to index.html which defaults to the dashboard page. The dashboard contains one chart
displaying all active sensors for that user. All frontend graphs are rendered via amcharts. There are also individual graphs for each sensor in the side bar. Graphs pull their data from MySQL
via ajax calls to php scripts.

S3 Script:

A bash shell script, s3mysqlbackup.sh is run every eight hours on the server via chron.