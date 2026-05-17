// index.js
import express from "express";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import connection from "./db.js";
import bcrypt from "bcrypt";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "pages")));
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "pages", "index.html"));
});

app.get("/index-inicial.html", (req, res) => {
    const filePath = path.join(__dirname, "pages", "index-inicial.html");
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error("Error al enviar archivo:", err);
            res.status(404).send("Archivo no encontrado");
        }
    });
});

// === MIDDLEWARE DE AUTENTICACIÓN ===
function autenticar(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Token requerido" });

    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Token inválido" });
        req.user = user;
        next();
    });
}

// === REGISTRO ===
app.post("/registro", async (req, res) => {
    const { documento, nombre, apellido, correo, contraseña, direccion, fecha_nacimiento, nit_eps, especialidad, tipo } = req.body;

    if (!documento || !nombre || !apellido || !correo || !contraseña || !tipo) {
        return res.status(400).json({ error: "Faltan campos básicos" });
    }

    try {
        const hashedPassword = await bcrypt.hash(contraseña, 10);

        // Antes de insertar, resolver el Id_Eps real en la tabla `eps`.
        connection.query(
            "SELECT Id_Eps FROM eps WHERE Id_Eps = ? OR Nit_Eps = ? LIMIT 1",
            [nit_eps, nit_eps],
            (err, epsResults) => {
                if (err) return res.status(500).json({ error: "Error al verificar EPS: " + err.message });
                if (!epsResults || epsResults.length === 0) {
                    return res.status(400).json({ error: "EPS no encontrada. Verifica el Id o NIT de la EPS." });
                }
                const idEpsFk = epsResults[0].Id_Eps;

                if (tipo === "paciente") {
                    connection.query(
                        `INSERT INTO pacientes 
                        (id_paciente, Nombre_Paciente, Apellido_Paciente, Correo_Paciente, contraseña, Direccion_Paciente, Fecha_Nacimiento_Paciente, Id_Eps_Fk)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [documento, nombre, apellido, correo, hashedPassword, direccion, fecha_nacimiento, idEpsFk],
                        (err) => {
                            if (err?.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: "Documento o correo ya registrado" });
                            if (err) return res.status(500).json({ error: "Error al registrar paciente: " + err.message });
                            res.status(201).json({ message: "Paciente registrado" });
                        }
                    );
                } else {
                    connection.query(
                        `INSERT INTO doctor 
                        (id_doctor, Nombre_Doctor, Apellido_Doctor, Correo_Doctor, Id_Especialidad_Fk, Id_Eps_Fk, Direccion_Doctor, Fecha_Nacimiento_Doctor) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [documento, nombre, apellido, correo, especialidad, idEpsFk, direccion, fecha_nacimiento],
                        (err) => {
                            if (err?.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: "Documento o correo ya registrado" });
                            if (err) return res.status(500).json({ error: "Error al registrar doctor: " + err.message });
                            res.status(201).json({ message: "Doctor registrado" });
                        }
                    );
                }
            }
        );
    } catch (err) {
        res.status(500).json({ error: "Error interno: " + err.message });
    }
});

// === LOGIN ===
app.post("/login", async (req, res) => {
    const { correo, contraseña } = req.body;

    if (!correo || !contraseña) {
        return res.status(400).json({ error: "Faltan credenciales" });
    }

    connection.query(
        "SELECT id_paciente as id, 'paciente' as tipo, Nombre_Paciente as nombre, Apellido_Paciente as apellido, contraseña FROM pacientes WHERE Correo_Paciente = ?",
        [correo],
        async (err, results) => {
            if (err) return res.status(500).json({ error: "Error en BD" });
            if (results.length > 0) {
                return verificarUsuario(results[0], res, contraseña);
            }

            connection.query(
                "SELECT id_doctor as id, 'doctor' as tipo, Nombre_Doctor as nombre, Apellido_Doctor as apellido, NULL as contraseña FROM doctor WHERE Correo_Doctor = ?",
                [correo],
                async (err, results) => {
                    if (err) return res.status(500).json({ error: "Error en BD" });
                    if (results.length === 0) return res.status(400).json({ error: "Usuario no encontrado" });
                    verificarUsuario(results[0], res, contraseña);
                }
            );
        }
    );

    async function verificarUsuario(user, res, contraseña) {
        if (user.contraseña) {
            const match = await bcrypt.compare(contraseña, user.contraseña);
            if (!match) return res.status(401).json({ error: "Contraseña incorrecta" });
        }
        const token = jwt.sign(
            { id: user.id, nombre: `${user.nombre} ${user.apellido}`, tipo: user.tipo },
            SECRET_KEY,
            { expiresIn: "1h" }
        );
        res.json({
            message: "Login exitoso",
            token,
            user: { id: user.id, nombre: `${user.nombre} ${user.apellido}`, tipo: user.tipo }
        });
    }
});

// === OBTENER DOCTORES ===
app.get("/api/doctores", (req, res) => {
    connection.query(
        `SELECT d.id_doctor, d.Nombre_Doctor, e.Nombre_Esp as Nombre_Especialidad
         FROM doctor d
         JOIN especialidad e ON d.Id_Especialidad_Fk = e.Id_Especialidad`,
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

// === OBTENER ESPECIALIDADES ===
app.get('/api/especialidades', (req, res) => {
    connection.query(
        `SELECT Id_Especialidad as id, Nombre_Esp as nombre FROM especialidad`,
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

// === OBTENER EPS ===
app.get('/api/eps', (req, res) => {
    connection.query(
        `SELECT Id_Eps as id, Nombre_Eps as nombre, Nit_Eps as nit FROM eps ORDER BY Nombre_Eps`,
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

// === AGENDAR CITA ===
app.post("/api/agendar-cita", autenticar, (req, res) => {
    const {
        tipoCita, especialidad, fecha, hora,
        nombreCompleto, documentoIdentidad, telefono, correo, motivo
    } = req.body;

    if (!tipoCita || !especialidad || !fecha || !hora || !nombreCompleto || !documentoIdentidad) {
        return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    connection.query(
    `SELECT id_doctor FROM doctor d 
     JOIN especialidad e ON d.Id_Especialidad_Fk = e.Id_Especialidad 
     WHERE e.Nombre_Esp = ? LIMIT 1`,
        [especialidad],
        (err, results) => {
            if (err || results.length === 0) {
                return res.status(400).json({ error: "Especialidad no disponible" });
            }

            const id_doctor = results[0].id_doctor;

            connection.query(
                "SELECT Id_cita FROM cita WHERE Id_Doctor_Fk = ? AND Fecha = ? AND hora = ?",
                [id_doctor, fecha, hora],
                (err, results) => {
                    if (err) return res.status(500).json({ error: err.message });
                    if (results.length > 0) {
                        return res.status(400).json({ error: "Hora ocupada" });
                    }

                    connection.query(
                        `INSERT INTO cita 
                        (Id_Paciente_Fk, Id_Doctor_Fk, Tipo_Cita, especialidad, nombre_completo, 
                         documento_identidad, Telefono, Correo, motivo, Fecha, hora)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            req.user.id, id_doctor, tipoCita, especialidad, nombreCompleto,
                            documentoIdentidad, telefono || "", correo || "", motivo || "", fecha, hora
                        ],
                        (err, result) => {
                            if (err) return res.status(500).json({ error: err.message });
                            res.json({
                                success: true,
                                message: "Cita agendada",
                                id_cita: result.insertId
                            });
                        }
                    );
                }
            );
        }
    );
});

// === MIS CITAS ===
app.get("/api/mis-citas", autenticar, (req, res) => {
    connection.query(
    `SELECT c.*, d.Nombre_Doctor, e.Nombre_Esp as especialidad
     FROM cita c 
     JOIN doctor d ON c.Id_Doctor_Fk = d.id_doctor
     JOIN especialidad e ON d.Id_Especialidad_Fk = e.Id_Especialidad
     WHERE c.Id_Paciente_Fk = ?
     ORDER BY c.Fecha DESC, c.hora DESC`,
        [req.user.id],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            // Normalizar los campos para que el frontend pueda consumirlos de forma consistente
            const normalized = results.map(r => ({
                Id_cita: r.Id_cita || r.id_cita || r.id || null,
                Id_Paciente_Fk: r.Id_Paciente_Fk || r.id_paciente_fk || r.Id_Paciente || req.user.id,
                Id_Doctor_Fk: r.Id_Doctor_Fk || r.id_doctor_fk || r.Id_Doctor || null,
                especialidad: r.especialidad || r.Nombre_Esp || null,
                Tipo_Cita: r.Tipo_Cita || r.tipo_cita || r.tipo || null,
                Fecha: r.Fecha || r.fecha || null,
                hora: r.hora || r.Hora || r.hora_cita || null,
                nombre_completo: r.nombre_completo || r.nombre || `${r.Nombre_Doctor || ''}`,
                documento_identidad: r.documento_identidad || r.Documento_Identidad || null,
                Telefono: r.Telefono || r.telefono || null,
                Correo: r.Correo || r.correo || null,
                motivo: r.motivo || r.Motivo || null,
                Nombre_Doctor: r.Nombre_Doctor || null,
                raw: r
            }));
            // Si no hay citas y se solicita modo debug, devolver datos de ejemplo para pruebas UI
            if ((normalized.length === 0) && (req.query && req.query.debug === '1')) {
                const today = new Date().toISOString().split('T')[0];
                const sample = [
                    {
                        Id_cita: 999001,
                        Id_Paciente_Fk: req.user.id,
                        Id_Doctor_Fk: 1,
                        especialidad: 'Cardiología',
                        Tipo_Cita: 'Control',
                        Fecha: today,
                        hora: '10:00:00',
                        nombre_completo: 'Paciente Demo',
                        documento_identidad: '00000000',
                        Telefono: '+000000000',
                        Correo: 'demo@example.com',
                        motivo: 'Cita de prueba para visualizar calendario',
                        Nombre_Doctor: 'Dr. Demo'
                    },
                    {
                        Id_cita: 999002,
                        Id_Paciente_Fk: req.user.id,
                        Id_Doctor_Fk: 2,
                        especialidad: 'Pediatría',
                        Tipo_Cita: 'Primera Vez',
                        Fecha: today,
                        hora: '14:30:00',
                        nombre_completo: 'Paciente Demo 2',
                        documento_identidad: '11111111',
                        Telefono: '+000000001',
                        Correo: 'demo2@example.com',
                        motivo: 'Segunda cita de prueba',
                        Nombre_Doctor: 'Dra. Demo'
                    }
                ];
                return res.json(sample);
            }

            res.json(normalized);
        }
    );
});

// === CITAS PARA EL CALENDARIO (FullCalendar) ===
app.get("/api/citas-calendario", autenticar, (req, res) => {
    connection.query(
        `SELECT 
            c.Id_cita,
            c.Fecha,
            c.hora,
            c.Tipo_Cita,
            c.nombre_completo,
            d.Nombre_Doctor,
            e.Nombre_Esp as especialidad
         FROM cita c 
         JOIN doctor d ON c.Id_Doctor_Fk = d.id_doctor
         JOIN especialidad e ON d.Id_Especialidad_Fk = e.Id_Especialidad
         WHERE c.Id_Paciente_Fk = ?
         ORDER BY c.Fecha, c.hora`,
        [req.user.id],
        (err, results) => {
            if (err) {
                console.error("Error en /api/citas-calendario:", err);
                return res.status(500).json({ error: err.message });
            }

            // Convertir a formato FullCalendar
            const eventos = results.map(cita => {
                const fecha = cita.Fecha; // YYYY-MM-DD
                const horaInicio = cita.hora; // HH:MM:SS

                // Calcular hora fin: +30 minutos (ajusta si usas otra duración)
                const [h, m] = horaInicio.split(':');
                const fechaFin = new Date(fecha);
                fechaFin.setHours(parseInt(h), parseInt(m) + 30, 0); // +30 min

                const inicio = new Date(`${fecha}T${horaInicio}`);
                const fin = fechaFin;

                return {
                    id: cita.Id_cita,
                    title: `${cita.Tipo_Cita} - ${cita.Nombre_Doctor} (${cita.especialidad})`,
                    start: inicio.toISOString(), // 2025-11-15T10:00:00
                    end: fin.toISOString(),
                    color: cita.Tipo_Cita === 'Primera Vez' ? '#e74c3c' : '#3498db',
                    extendedProps: {
                        nombre_completo: cita.nombre_completo,
                        especialidad: cita.especialidad,
                        motivo: cita.motivo || 'No especificado'
                    }
                };
            });

            res.json(eventos);
        }
    );
});
// === ELIMINAR CITA ===
app.delete("/api/cita/:id", autenticar, (req, res) => {
    const { id } = req.params;

    connection.query(
        "DELETE FROM cita WHERE Id_cita = ? AND Id_Paciente_Fk = ?",
        [id, req.user.id],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Cita no encontrada o no autorizada" });
            }
            res.json({ success: true, message: "Cita eliminada" });
        }
    );
});

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));