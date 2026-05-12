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

  // Crear base de datos si no existe
  connection.query("CREATE DATABASE IF NOT EXISTS arcdata", (err) => {
    if (err) {
      console.error("Error creating database:", err);
      connection.end();
      process.exit(1);
    }
    console.log("Database arcdata created or already exists");

    // Usar la base de datos
    connection.query("USE arcdata", (err) => {
      if (err) {
        console.error("Error using database:", err);
        connection.end();
        process.exit(1);
      }

      // Crear tablas
      const tables = [
        `CREATE TABLE IF NOT EXISTS eps (
          Id_Eps INT PRIMARY KEY AUTO_INCREMENT,
          Nombre_Eps VARCHAR(255) NOT NULL,
          Nit_Eps VARCHAR(50) UNIQUE NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS especialidad (
          Id_Especialidad INT PRIMARY KEY AUTO_INCREMENT,
          Nombre_Esp VARCHAR(255) NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS doctor (
          id_doctor VARCHAR(50) PRIMARY KEY,
          Nombre_Doctor VARCHAR(255) NOT NULL,
          Apellido_Doctor VARCHAR(255) NOT NULL,
          Correo_Doctor VARCHAR(255) UNIQUE NOT NULL,
          Id_Especialidad_Fk INT,
          Id_Eps_Fk INT,
          Direccion_Doctor VARCHAR(255),
          Fecha_Nacimiento_Doctor DATE,
          FOREIGN KEY (Id_Especialidad_Fk) REFERENCES especialidad(Id_Especialidad),
          FOREIGN KEY (Id_Eps_Fk) REFERENCES eps(Id_Eps)
        )`,
        `CREATE TABLE IF NOT EXISTS paciente (
          id_paciente VARCHAR(50) PRIMARY KEY,
          Nombre_Paciente VARCHAR(255) NOT NULL,
          Apellido_Paciente VARCHAR(255) NOT NULL,
          Correo_Paciente VARCHAR(255) UNIQUE NOT NULL,
          contraseña VARCHAR(255),
          Direccion_Paciente VARCHAR(255),
          Fecha_Nacimiento_Paciente DATE,
          Id_Eps_Fk INT,
          FOREIGN KEY (Id_Eps_Fk) REFERENCES eps(Id_Eps)
        )`,
        // Agregar otras tablas si es necesario
      ];

      let tableIndex = 0;
      const createTables = () => {
        if (tableIndex >= tables.length) {
          console.log("All tables created");
          seedData();
          return;
        }
        connection.query(tables[tableIndex], (err) => {
          if (err) {
            console.error("Error creating table:", err);
          } else {
            console.log("Table created:", tableIndex + 1);
          }
          tableIndex++;
          createTables();
        });
      };

      const seedData = () => {
        // Insertar EPS
        const epsData = [
          ['Sanitas', '900123456'],
          ['Nueva EPS', '800987654'],
          ['Famisanar', '700654321'],
          ['Compensar', '600321987'],
          ['Sura', '500987123']
        ];
        epsData.forEach(([nombre, nit]) => {
          connection.query('INSERT IGNORE INTO eps (Nombre_Eps, Nit_Eps) VALUES (?, ?)', [nombre, nit], (err) => {
            if (err) console.error('Error inserting EPS:', err);
          });
        });

        // Insertar especialidades
        const espData = [
          'Medicina General',
          'Cardiología',
          'Pediatría',
          'Dermatología'
        ];
        espData.forEach((nombre) => {
          connection.query('INSERT IGNORE INTO especialidad (Nombre_Esp) VALUES (?)', [nombre], (err) => {
            if (err) console.error('Error inserting especialidad:', err);
          });
        });

        console.log("Data seeded");
        connection.end();
      };

      createTables();
    });
  });
});