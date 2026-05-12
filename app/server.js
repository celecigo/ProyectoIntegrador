// app/server.js
const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Sirve todo desde app/

// === CONEXIÓN A TU BASE DE DATOS EXISTENTE ===
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',           // Cambia si usas otro
    password: '',           // Cambia si tienes contraseña
    database: 'citas_medicas' // ← NOMBRE EXACTO DE TU BD
});

db.connect(err => {
    if (err) {
        console.error('Error conectando a MySQL:', err);
        process.exit(1);
    }
    console.log('MySQL conectado a la base de datos: citas_medicas');
});

const JWT_SECRET = 'citas123';

// === LOGIN ===
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.query(
        'SELECT * FROM usuarios WHERE email = ? AND password = ?',
        [email, password],
        (err, results) => {
            if (err || !results.length) {
                return res.json({ error: 'Credenciales inválidas' });
            }
            const user = results[0];
            const token = jwt.sign(
                { id: user.id, nombre: user.nombre },
                JWT_SECRET,
                { expiresIn: '1h' }
            );
            res.json({ token, nombre: user.nombre });
        }
    );
});

// === MIDDLEWARE AUTH ===
const auth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No autorizado' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido' });
        req.user = user;
        next();
    });
};

// === MIS CITAS ===
app.get('/api/mis-citas', auth, (req, res) => {
    db.query(`
        SELECT c.*, e.Nombre_Especialidad 
        FROM citas c 
        JOIN especialidades e ON c.id_especialidad = e.Id_especialidad 
        WHERE c.id_usuario = ?
        ORDER BY c.Fecha DESC, c.hora DESC
    `, [req.user.id], (err, results) => {
        if (err) return res.json([]);
        // Normalizar nombres de campos para que el frontend no dependa de mayúsculas o alias
        const normalized = results.map(r => ({
            Id_cita: r.Id_cita || r.id_cita || r.id || null,
            id_usuario: r.id_usuario || r.Id_usuario || r.user_id || req.user.id,
            id_especialidad: r.id_especialidad || r.Id_especialidad || null,
            Nombre_Especialidad: r.Nombre_Especialidad || r.nombre_especialidad || r.Especialidad || null,
            Tipo_Cita: r.Tipo_Cita || r.tipo_cita || r.tipo || null,
            Fecha: r.Fecha || r.fecha || null,
            hora: r.hora || r.Hora || r.hora_cita || null,
            nombre_completo: r.nombre_completo || r.Nombre_Completo || r.nombre || null,
            documento_identidad: r.documento_identidad || r.Documento_Identidad || r.documento || null,
            telefono: r.telefono || r.Telefono || null,
            correo: r.correo || r.Correo || null,
            motivo: r.motivo || r.Motivo || null,
            // incluir cualquier campo adicional que pueda ser útil
            raw: r
        }));
        res.json(normalized);
    });
});

// === ESPECIALIDADES ===
app.get('/api/especialidades', (req, res) => {
    db.query('SELECT Nombre_Especialidad FROM especialidades', (err, results) => {
        res.json(err ? [] : results.map(r => r.Nombre_Especialidad));
    });
});

// === AGENDAR CITA ===
app.post('/api/agendar-cita', auth, (req, res) => {
    const {
        tipoCita, especialidad, fecha, hora,
        nombreCompleto, documentoIdentidad, telefono, correo, motivo
    } = req.body;

    // Buscar ID de especialidad
    db.query(
        'SELECT Id_especialidad FROM especialidades WHERE Nombre_Especialidad = ?',
        [especialidad],
        (err, results) => {
            if (err || !results.length) {
                return res.json({ error: 'Especialidad no encontrada' });
            }

            const id_especialidad = results[0].Id_especialidad;

            db.query(
                `INSERT INTO citas 
                (id_usuario, id_especialidad, Tipo_Cita, Fecha, hora, nombre_completo, documento_identidad, telefono, correo, motivo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    req.user.id, id_especialidad, tipoCita, fecha, hora,
                    nombreCompleto, documentoIdentidad, telefono, correo, motivo
                ],
                (err, result) => {
                    if (err) {
                        console.error('Error al insertar cita:', err);
                        return res.json({ error: 'Error al agendar cita' });
                    }
                    res.json({ success: true, id_cita: result.insertId });
                }
            );
        }
    );
});

// === ELIMINAR CITA ===
app.delete('/api/cita/:id', auth, (req, res) => {
    const citaId = req.params.id;
    db.query(
        'DELETE FROM citas WHERE Id_cita = ? AND id_usuario = ?',
        [citaId, req.user.id],
        (err, result) => {
            if (err || result.affectedRows === 0) {
                return res.json({ error: 'No se pudo eliminar la cita' });
            }
            res.json({ success: true });
        }
    );
});

app.get('/api/doctores', (req, res) => {
  const sql = `
    SELECT 
      d.Id_Doctor,
      d.Nombre_Doctor,
      d.Apellido_Doctor,
      d.Correo_Doctor,
      e.Nombre_Esp AS Especialidad,
      eps.Nombre_Eps AS EPS
    FROM doctor d
    LEFT JOIN especialidad e ON d.Id_Especialidad_Fk = e.Id_Especialidad
    LEFT JOIN eps ON d.Id_Eps_Fk = eps.Id_Eps
    ORDER BY d.Nombre_Doctor;
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener doctores:', err);
      return res.status(500).json({ error: 'Error en el servidor' });
    }
    res.json(results);
  });
});


app.get('/api/citas-doctor/:idDoctor', (req, res) => {
  const { idDoctor } = req.params;
  const sql = `
    SELECT 
      c.Id_cita,
      p.Nombre_Paciente,
      p.Apellido_Paciente,
      c.Tipo_Cita,
      c.especialidad,
      c.fecha,
      c.hora,
      c.motivo
    FROM cita c
    JOIN paciente p ON c.Id_Paciente_Fk = p.Id_Paciente
    WHERE c.Id_Doctor_Fk = ?
    ORDER BY c.fecha, c.hora;
  `;
  db.query(sql, [idDoctor], (err, results) => {
    if (err) {
      console.error('Error al obtener citas:', err);
      return res.status(500).json({ error: 'Error en el servidor' });
    }
    res.json(results);
  });
});


app.get('/api/especialidades', (req, res) => {
  db.query('SELECT Id_Especialidad, Nombre_Esp FROM especialidad', (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al cargar especialidades' });
    res.json(results);
  });
});


app.get('/api/eps', (req, res) => {
  db.query('SELECT Id_Eps, Nombre_Eps FROM eps', (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al cargar EPS' });
    res.json(results);
  });
});


app.post('/api/doctor', (req, res) => {
  const { 
    Numero_Documento_Doctor, Nombre_Doctor, Apellido_Doctor, 
    Correo_Doctor, Direccion_Doctor, Fecha_Nacimiento_Doctor,
    Id_Especialidad_Fk, Id_Eps_Fk
  } = req.body;

  const sql = `
    INSERT INTO doctor 
    (Numero_Documento_Doctor, Nombre_Doctor, Apellido_Doctor, Correo_Doctor, 
     Direccion_Doctor, Fecha_Nacimiento_Doctor, Id_Especialidad_Fk, Id_Eps_Fk)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(sql, [
    Numero_Documento_Doctor, Nombre_Doctor, Apellido_Doctor, Correo_Doctor, 
    Direccion_Doctor, Fecha_Nacimiento_Doctor, Id_Especialidad_Fk, Id_Eps_Fk
  ], (err, result) => {
    if (err) {
      console.error('Error al registrar doctor:', err);
      return res.status(500).json({ error: 'Error al insertar el doctor' });
    }
    res.json({ success: true, id: result.insertId });
  });
});



// === INICIAR SERVIDOR ===
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en: http://localhost:${PORT}`);
    console.log(`Login: http://localhost:${PORT}/index.html`);
});