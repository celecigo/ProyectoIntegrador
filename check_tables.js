import mysql from "mysql2";

const connection = mysql.createConnection({
  host: "localhost",
  port: 3307,
  user: "root",
  password: "",
  database: "arcdata"
});

connection.connect((err) => {
  if (err) {
    console.error("Error:", err);
    process.exit(1);
  }

  // Try to get info about the tables from information_schema
  connection.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'arcdata'", (err, results) => {
    if (err) console.error("Error querying schema:", err.message);
    else console.log("Tables in schema:", results.map(r => r.TABLE_NAME));

    // Try simple queries
    connection.query("SELECT * FROM eps LIMIT 1", (err, results) => {
      if (err) console.error("Error querying eps:", err.message);
      else console.log("eps query worked, records:", results.length);
    });

    connection.query("SELECT * FROM pacientes LIMIT 1", (err, results) => {
      if (err) console.error("Error querying pacientes:", err.message);
      else console.log("pacientes query worked, records:", results.length);
    });

    setTimeout(() => {
      connection.end();
    }, 1000);
  });
});
