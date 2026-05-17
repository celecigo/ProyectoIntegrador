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

app.get("/testdb", async (req, res) => {

    try {

        const [rows] = await connection.query(
            "SELECT * FROM eps LIMIT 1"
        );

        res.json(rows);

    } catch(error){

        console.error("TEST DB ERROR:", error);

        res.status(500).json({
            error: error.message
        });
    }
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

    try {

        const { correo, contraseña } = req.body;

        if (!correo || !contraseña) {
            return res.status(400).json({
                error: "Faltan credenciales"
            });
        }

        // Buscar paciente
        const [paciente] = await connection.query(
            `SELECT 
                id_paciente as id,
                'paciente' as tipo,
                Nombre_Paciente as nombre,
                Apellido_Paciente as apellido,
                contraseña
             FROM pacientes
             WHERE Correo_Paciente = ?`,
            [correo]
        );

        if (paciente.length > 0) {

            const user = paciente[0];

            const match = await bcrypt.compare(
                contraseña,
                user.contraseña
            );

            if (!match) {
                return res.status(401).json({
                    error: "Contraseña incorrecta"
                });
            }

            const token = jwt.sign(
                {
                    id: user.id,
                    nombre: `${user.nombre} ${user.apellido}`,
                    tipo: user.tipo
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "1h"
                }
            );

            return res.json({
                message: "Login exitoso",
                token,
                user: {
                    id: user.id,
                    nombre: `${user.nombre} ${user.apellido}`,
                    tipo: user.tipo
                }
            });
        }

        // Buscar doctor
        const [doctor] = await connection.query(
            `SELECT 
                id_doctor as id,
                'doctor' as tipo,
                Nombre_Doctor as nombre,
                Apellido_Doctor as apellido
             FROM doctor
             WHERE Correo_Doctor = ?`,
            [correo]
        );

        if (doctor.length === 0) {
            return res.status(404).json({
                error: "Usuario no encontrado"
            });
        }

        const user = doctor[0];

        const token = jwt.sign(
            {
                id: user.id,
                nombre: `${user.nombre} ${user.apellido}`,
                tipo: user.tipo
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        res.json({
            message: "Login exitoso",
            token,
            user: {
                id: user.id,
                nombre: `${user.nombre} ${user.apellido}`,
                tipo: user.tipo
            }
        });

    } catch(error){

        console.error("LOGIN ERROR:", error);

        res.status(500).json({
            error: error.message
        });
    }
});

// === OBTENER DOCTORES ===
app.get("/api/doctores", async (req, res) => {

    try {

        const [results] = await connection.query(
            `SELECT 
                d.id_doctor,
                d.Nombre_Doctor,
                e.Nombre_Esp as Nombre_Especialidad
             FROM doctor d
             JOIN especialidad e
             ON d.Id_Especialidad_Fk = e.Id_Especialidad`
        );

        res.json(results);

    } catch(error){

        console.error(error);

        res.status(500).json({
            error: error.message
        });
    }
});

// === OBTENER ESPECIALIDADES ===
app.get('/api/especialidades', async (req, res) => {

    try {

        const [results] = await connection.query(
            `SELECT 
                Id_Especialidad as id,
                Nombre_Esp as nombre
             FROM especialidad`
        );

        res.json(results);

    } catch(error){

        console.error(error);

        res.status(500).json({
            error: error.message
        });
    }
});
// === OBTENER EPS ===
app.get('/api/eps', async (req, res) => {

    try {

        const [results] = await connection.query(
            `SELECT 
                Id_Eps as id,
                Nombre_Eps as nombre,
                Nit_Eps as nit
             FROM eps
             ORDER BY Nombre_Eps`
        );

        res.json(results);

    } catch(error){

        console.error("EPS ERROR:", error);

        res.status(500).json({
            error: error.message
        });
    }
});

// === AGENDAR CITA ===
app.post("/api/agendar-cita", autenticar, async (req, res) => {

    try {

        const {
            tipoCita,
            especialidad,
            fecha,
            hora,
            nombreCompleto,
            documentoIdentidad,
            telefono,
            correo,
            motivo
        } = req.body;

        if (
            !tipoCita ||
            !especialidad ||
            !fecha ||
            !hora ||
            !nombreCompleto ||
            !documentoIdentidad
        ) {
            return res.status(400).json({
                error: "Faltan campos obligatorios"
            });
        }

        // Buscar doctor
        const [doctor] = await connection.query(
            `SELECT d.id_doctor
             FROM doctor d
             JOIN especialidad e
             ON d.Id_Especialidad_Fk = e.Id_Especialidad
             WHERE e.Nombre_Esp = ?
             LIMIT 1`,
            [especialidad]
        );

        if (doctor.length === 0) {
            return res.status(400).json({
                error: "Especialidad no disponible"
            });
        }

        const id_doctor = doctor[0].id_doctor;

        // Validar hora ocupada
        const [citaExistente] = await connection.query(
            `SELECT Id_cita
             FROM cita
             WHERE Id_Doctor_Fk = ?
             AND Fecha = ?
             AND hora = ?`,
            [id_doctor, fecha, hora]
        );

        if (citaExistente.length > 0) {
            return res.status(400).json({
                error: "Hora ocupada"
            });
        }

        // Insertar cita
        const [result] = await connection.query(
            `INSERT INTO cita
            (
                Id_Paciente_Fk,
                Id_Doctor_Fk,
                Tipo_Cita,
                especialidad,
                nombre_completo,
                documento_identidad,
                Telefono,
                Correo,
                motivo,
                Fecha,
                hora
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id,
                id_doctor,
                tipoCita,
                especialidad,
                nombreCompleto,
                documentoIdentidad,
                telefono || "",
                correo || "",
                motivo || "",
                fecha,
                hora
            ]
        );

        res.json({
            success: true,
            message: "Cita agendada",
            id_cita: result.insertId
        });

    } catch(error){

        console.error("AGENDAR CITA ERROR:", error);

        res.status(500).json({
            error: error.message
        });
    }
});

// === MIS CITAS ===
app.get("/api/mis-citas", autenticar, async (req, res) => {

    try {

        const [results] = await connection.query(
            `SELECT 
                c.*,
                d.Nombre_Doctor,
                e.Nombre_Esp as especialidad
             FROM cita c
             JOIN doctor d
                ON c.Id_Doctor_Fk = d.id_doctor
             JOIN especialidad e
                ON d.Id_Especialidad_Fk = e.Id_Especialidad
             WHERE c.Id_Paciente_Fk = ?
             ORDER BY c.Fecha DESC, c.hora DESC`,
            [req.user.id]
        );

        const normalized = results.map(r => ({

            Id_cita:
                r.Id_cita || r.id_cita || r.id || null,

            Id_Paciente_Fk:
                r.Id_Paciente_Fk ||
                r.id_paciente_fk ||
                r.Id_Paciente ||
                req.user.id,

            Id_Doctor_Fk:
                r.Id_Doctor_Fk ||
                r.id_doctor_fk ||
                r.Id_Doctor ||
                null,

            especialidad:
                r.especialidad ||
                r.Nombre_Esp ||
                null,

            Tipo_Cita:
                r.Tipo_Cita ||
                r.tipo_cita ||
                r.tipo ||
                null,

            Fecha:
                r.Fecha ||
                r.fecha ||
                null,

            hora:
                r.hora ||
                r.Hora ||
                r.hora_cita ||
                null,

            nombre_completo:
                r.nombre_completo ||
                r.nombre ||
                `${r.Nombre_Doctor || ''}`,

            documento_identidad:
                r.documento_identidad ||
                r.Documento_Identidad ||
                null,

            Telefono:
                r.Telefono ||
                r.telefono ||
                null,

            Correo:
                r.Correo ||
                r.correo ||
                null,

            motivo:
                r.motivo ||
                r.Motivo ||
                null,

            Nombre_Doctor:
                r.Nombre_Doctor ||
                null,

            raw: r
        }));

        // Datos demo opcionales
        if (
            normalized.length === 0 &&
            req.query &&
            req.query.debug === '1'
        ) {

            const today = new Date()
                .toISOString()
                .split('T')[0];

            return res.json([
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
                    motivo: 'Cita de prueba',
                    Nombre_Doctor: 'Dr. Demo'
                }
            ]);
        }

        res.json(normalized);

    } catch(error){

        console.error("MIS CITAS ERROR:", error);

        res.status(500).json({
            error: error.message
        });
    }
});

// === CITAS PARA EL CALENDARIO (FullCalendar) ===
app.get("/api/citas-calendario", autenticar, async (req, res) => {

    try {

        const [results] = await connection.query(
            `SELECT
                c.Id_cita,
                c.Fecha,
                c.hora,
                c.Tipo_Cita,
                c.motivo,
                d.Nombre_Doctor,
                d.Apellido_Doctor,
                e.Nombre_Esp as especialidad
             FROM cita c
             JOIN doctor d
                ON c.Id_Doctor_Fk = d.id_doctor
             JOIN especialidad e
                ON d.Id_Especialidad_Fk = e.Id_Especialidad
             WHERE c.Id_Paciente_Fk = ?
             ORDER BY c.Fecha ASC, c.hora ASC`,
            [req.user.id]
        );

        const eventos = results.map(cita => {

            const fecha =
                cita.Fecha instanceof Date
                    ? cita.Fecha.toISOString().split('T')[0]
                    : cita.Fecha;

            return {

                id: cita.Id_cita,

                title:
                    `${cita.especialidad} - Dr. ${cita.Nombre_Doctor}`,

                start:
                    `${fecha}T${cita.hora}`,

                extendedProps: {

                    tipoCita:
                        cita.Tipo_Cita,

                    motivo:
                        cita.motivo,

                    doctor:
                        `${cita.Nombre_Doctor} ${cita.Apellido_Doctor}`,

                    especialidad:
                        cita.especialidad
                }
            };
        });

        res.json(eventos);

    } catch(error){

        console.error(
            "CALENDARIO ERROR:",
            error
        );

        res.status(500).json({
            error: error.message
        });
    }
});

// === ELIMINAR CITA ===
app.get("/api/cita/:id", autenticar, async (req, res) => {

    try {

        const { id } = req.params;

        const [results] = await connection.query(
            `SELECT
                c.*,
                d.Nombre_Doctor,
                d.Apellido_Doctor,
                e.Nombre_Esp as especialidad
             FROM cita c
             JOIN doctor d
                ON c.Id_Doctor_Fk = d.id_doctor
             JOIN especialidad e
                ON d.Id_Especialidad_Fk = e.Id_Especialidad
             WHERE c.Id_cita = ?
             AND c.Id_Paciente_Fk = ?`,
            [id, req.user.id]
        );

        if (results.length === 0) {

            return res.status(404).json({
                error: "Cita no encontrada"
            });
        }

        const cita = results[0];

        const fecha =
            cita.Fecha instanceof Date
                ? cita.Fecha.toISOString().split('T')[0]
                : cita.Fecha;

        res.json({

            id:
                cita.Id_cita,

            fecha,

            hora:
                cita.hora,

            tipoCita:
                cita.Tipo_Cita,

            motivo:
                cita.motivo,

            especialidad:
                cita.especialidad,

            doctor:
                `${cita.Nombre_Doctor} ${cita.Apellido_Doctor}`,

            telefono:
                cita.Telefono,

            correo:
                cita.Correo,

            nombreCompleto:
                cita.nombre_completo,

            documento:
                cita.documento_identidad
        });

    } catch(error){

        console.error(
            "DETALLE CITA ERROR:",
            error
        );

        res.status(500).json({
            error: error.message
        });
    }
});
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));