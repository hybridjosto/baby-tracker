.headers on
.mode csv
.output events.csv
SELECT *
FROM entries
ORDER BY timestamp_utc DESC;
.output stdout