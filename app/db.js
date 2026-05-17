import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();
console.log(process.env.DB_HOST);
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

connection.connect((err) => {

    if (err) {
        console.error("Error conectando a MySQL:", err);
        return;
    }

    console.log("Conectado a MySQL Railway");
});

export default connection;