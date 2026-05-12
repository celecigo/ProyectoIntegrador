import mysql from "mysql2";

const connection = mysql.createConnection({
  host: "localhost",  // Cambia si usas un servidor remoto
  port: 3307,  // Puerto de MySQL en XAMPP
  user: "root",  // Tu usuario de MySQL
  password: "",  // Contraseña de MySQL
  database: "arcdata"
});

connection.connect((err) => {
  if (err) {
    console.error("❌ Error al conectar con MySQL:", err);
  } else {
    console.log("✅ Conexión exitosa a MySQL");
  }
});

export default connection;