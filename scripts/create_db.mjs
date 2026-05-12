import mysql from "mysql2";

const connection = mysql.createConnection({
  host: "localhost",
  port: 3307,
  user: "root",
  password: ""
});

connection.connect((err) => {
  if (err) {
    console.error("Error connecting:", err);
    process.exit(1);
  }
  console.log("Connected to MySQL");

  connection.query("CREATE DATABASE IF NOT EXISTS arcdata", (err) => {
    if (err) {
      console.error("Error creating database:", err);
      connection.end();
      process.exit(1);
    }
    console.log("Database arcdata created or already exists");
    connection.end();
  });
});