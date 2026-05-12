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
      contraseña VARCHAR(255),
      Id_Especialidad_Fk INT,
      Id_Eps_Fk INT,
      Direccion_Doctor VARCHAR(255),
      Fecha_Nacimiento_Doctor DATE,
      FOREIGN KEY (Id_Especialidad_Fk) REFERENCES especialidad(Id_Especialidad),
      FOREIGN KEY (Id_Eps_Fk) REFERENCES eps(Id_Eps)
    )`,
    `CREATE TABLE IF NOT EXISTS pacientes (
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
    `CREATE TABLE IF NOT EXISTS cita (
      Id_cita INT PRIMARY KEY AUTO_INCREMENT,
      Id_Paciente_Fk VARCHAR(50) NOT NULL,
      Id_Doctor_Fk VARCHAR(50) NOT NULL,
      Tipo_Cita VARCHAR(100),
      Fecha DATE NOT NULL,
      hora TIME,
      nombre_completo VARCHAR(255),
      documento_identidad VARCHAR(50),
      Telefono VARCHAR(20),
      Correo VARCHAR(255),
      motivo TEXT,
      FOREIGN KEY (Id_Paciente_Fk) REFERENCES pacientes(id_paciente),
      FOREIGN KEY (Id_Doctor_Fk) REFERENCES doctor(id_doctor)
    )`
  ];

  let count = 0;
  const createTables = () => {
    if (count >= tables.length) {
      console.log("All tables created");
      seedEPS();
      return;
    }
    connection.query(tables[count], (err) => {
      if (err) console.error("Error creating table:", err);
      else console.log("Table created:", count + 1);
      count++;
      createTables();
    });
  };

  const seedEPS = () => {
    const epsData = [
      ["Sanitas", "900123456"],
      ["Nueva EPS", "800987654"],
      ["Famisanar", "700654321"],
      ["Compensar", "600321987"],
      ["Sura", "500987123"]
    ];
    let epCount = 0;
    const insertEPS = () => {
      if (epCount >= epsData.length) {
        console.log("EPS data inserted");
        seedEspecialidades();
        return;
      }
      const [nombre, nit] = epsData[epCount];
      connection.query("INSERT IGNORE INTO eps (Nombre_Eps, Nit_Eps) VALUES (?, ?)", [nombre, nit], (err) => {
        if (err) console.error("Error inserting EPS:", err);
        else console.log("EPS inserted:", nombre);
        epCount++;
        insertEPS();
      });
    };
    insertEPS();
  };

  const seedEspecialidades = () => {
    const espData = ["Medicina General", "Cardiología", "Pediatría", "Dermatología"];
    let espCount = 0;
    const insertEsp = () => {
      if (espCount >= espData.length) {
        console.log("Especialidades data inserted");
        connection.end();
        process.exit(0);
        return;
      }
      connection.query("INSERT IGNORE INTO especialidad (Nombre_Esp) VALUES (?)", [espData[espCount]], (err) => {
        if (err) console.error("Error inserting especialidad:", err);
        else console.log("Especialidad inserted:", espData[espCount]);
        espCount++;
        insertEsp();
      });
    };
    insertEsp();
  };

  createTables();
});
