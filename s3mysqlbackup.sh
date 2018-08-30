# Basic variables
bucket="s3://apt-historical-data"
DB_HOST="apt-sensor-data.cndypkh49rqd.us-west-2.rds.amazonaws.com"
DB_USER="aptadmin"
DB_USER_PASSWORD="aptaccess2018"
DB_NAME="apt_sensor_data"

ord() {
  LC_CTYPE=C printf '%d' "'$1"
}

# Timestamp (sortable AND readable)

# store all tables
tables=`mysql -h $DB_HOST -u $DB_USER -p$DB_USER_PASSWORD -e "Use apt_sensor_data; show tables;"`

currentTime=$(date +%s);
eightHours=28800;
pastTime=`expr $currentTime - $eightHours`;

for table in $tables; do
	if [ "$table" != "Tables_in_apt_sensor_data" ]; then
		echo "$table";
		result=`mysql -h $DB_HOST -u $DB_USER -p$DB_USER_PASSWORD -e "Use apt_sensor_data; select * from "$table" where timestamp>"$pastTime";"`
		newLine=${result:258:1};
		stamp=${result:259:10};
		spaceChar=${result:9:1};
		csv=${result//$spaceChar/","};
		csv=${csv//$newLine/"\n"};
		echo "csv generated";
		#echo -e "$csv";
		echo -e "Dumping to \e[1;32m$bucket/$stamp/\e[00m"

		# Define our filenames
		filename="$table-$stamp.csv"
		tmpfile="/tmp/$filename"
		object="$bucket/$table/$stamp"

		#write csv to file;
		echo -e "  creating \e[0;35m$tmpfile\e[00m"
		echo -e $csv > "$tmpfile";

		# Upload
		echo -e "  uploading..."
		s3cmd put "$tmpfile" "$object"

		# Delete
		rm -f "$tmpfile"
	fi
done;
echo -e "\e[1;32mJobs a goodun\e[00m"
