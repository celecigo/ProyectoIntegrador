================================================================================
                    SISTEMA DE CITAS MÉDICAS - ARCDATA
                          Documentación Técnica
================================================================================

DESCRIPCIÓN GENERAL
===================
Sistema web de gestión de citas médicas que permite a pacientes agendar citas,
ver su historial de citas, y a doctores gestionar sus horarios y pacientes.

TECNOLOGÍAS UTILIZADAS
======================
Backend:
- Node.js v22.20.0
- Express.js (framework web)
- MySQL 5.7+ (base de datos)
- JWT (autenticación)
- Bcrypt (encriptación de contraseñas)

Frontend:
- HTML5
- Tailwind CSS (estilos)
- FullCalendar v6.1.8 (calendario)
- JavaScript vanilla (lógica)
- Ionicons (iconos)

ESTRUCTURA DEL PROYECTO
=======================
ProyectoIntegrador/
├── app/
│   ├── db.js                 # Configuración de conexión MySQL
│   ├── index.js              # Servidor principal y rutas API
│   ├── server.js             # (Alternativo, no actualmente usado)
│   ├── pages/                # HTML del frontend
│   │   ├── index.html        # Página de login/registro
│   │   ├── index-inicial.html # Dashboard paciente
│   │   ├── Doctor.html       # Dashboard doctor
│   │   └── pagina.html
│   └── public/               # Recursos públicos
│       ├── login.js          # Lógica de autenticación
│       ├── script.js         # Scripts generales
│       ├── pagina.js         # Scripts de página principal
│       ├── style.css         # Estilos CSS
│       └── iconos/           # Iconos ionicons
├── scripts/
│   ├── seed_sample_data.js   # Sembrador de datos
│   ├── create_db.mjs         # Crear base de datos
│   └── create_test_token.mjs # Generar tokens de prueba
├── setup_db.js               # Script para inicializar BD completa
├── check_tables.js           # Verificar tablas
├── package.json              # Dependencias npm
└── README.txt                # Este archivo

BASE DE DATOS - TABLAS
======================

1. TABLA: eps
   - Id_Eps (INT, PRIMARY KEY, AUTO_INCREMENT)
   - Nombre_Eps (VARCHAR(255))
   - Nit_Eps (VARCHAR(50), UNIQUE)
   
   Registro Inicial:
   - Sanitas (NIT: 900123456)
   - Nueva EPS (NIT: 800987654)
   - Famisanar (NIT: 700654321)
   - Compensar (NIT: 600321987)
   - Sura (NIT: 500987123)

2. TABLA: especialidad
   - Id_Especialidad (INT, PRIMARY KEY, AUTO_INCREMENT)
   - Nombre_Esp (VARCHAR(255))
   
   Registros Iniciales:
   - Medicina General
   - Cardiología
   - Pediatría
   - Dermatología

3. TABLA: doctor
   - id_doctor (VARCHAR(50), PRIMARY KEY) - Número de documento
   - Nombre_Doctor (VARCHAR(255))
   - Apellido_Doctor (VARCHAR(255))
   - Correo_Doctor (VARCHAR(255), UNIQUE)
   - contraseña (VARCHAR(255)) - Hash bcrypt
   - Id_Especialidad_Fk (INT) - FK a especialidad
   - Id_Eps_Fk (INT) - FK a eps
   - Direccion_Doctor (VARCHAR(255))
   - Fecha_Nacimiento_Doctor (DATE)

4. TABLA: pacientes
   - id_paciente (VARCHAR(50), PRIMARY KEY) - Número de documento
   - Nombre_Paciente (VARCHAR(255))
   - Apellido_Paciente (VARCHAR(255))
   - Correo_Paciente (VARCHAR(255), UNIQUE)
   - contraseña (VARCHAR(255)) - Hash bcrypt
   - Direccion_Paciente (VARCHAR(255))
   - Fecha_Nacimiento_Paciente (DATE)
   - Id_Eps_Fk (INT) - FK a eps

5. TABLA: cita
   - Id_cita (INT, PRIMARY KEY, AUTO_INCREMENT)
   - Id_Paciente_Fk (VARCHAR(50)) - FK a pacientes
   - Id_Doctor_Fk (VARCHAR(50)) - FK a doctor
   - Tipo_Cita (VARCHAR(100)) - e.g., "Consulta", "Control"
   - Fecha (DATE)
   - hora (TIME)
   - nombre_completo (VARCHAR(255))
   - documento_identidad (VARCHAR(50))
   - Telefono (VARCHAR(20))
   - Correo (VARCHAR(255))
   - motivo (TEXT) - Razón de la cita

INSTALACIÓN Y CONFIGURACIÓN
============================

REQUISITOS PREVIOS:
- Node.js v18+ instalado
- MySQL 5.7+ ejecutándose en localhost:3307
- Usuario MySQL: root, sin contraseña (configurado actualmente)

PASOS:

1. Navegar al directorio del proyecto:
   cd "ruta/al/ProyectoIntegrador"

2. Instalar dependencias:
   npm install

3. Inicializar la base de datos:
   node setup_db.js
   
   (Esto crea la BD 'arcdata' y todas las tablas con datos iniciales)

4. Iniciar el servidor:
   npm run dev
   
   El servidor correrá en: http://localhost:3000

CONFIGURACIÓN DE CONEXIÓN A BASE DE DATOS
==========================================
Archivo: app/db.js

Configuración actual:
- host: "localhost"
- port: 3307
- user: "root"
- password: "" (vacío)
- database: "arcdata"

Para cambiar la contraseña, editar:
const connection = mysql.createConnection({
  host: "localhost",
  port: 3307,
  user: "root",
  password: "tu_nueva_contraseña",  // ← CAMBIAR AQUÍ
  database: "arcdata"
});

RUTAS Y ENDPOINTS DE API
=========================

AUTENTICACIÓN
=============

POST /registro
Descripción: Registrar nuevo usuario (paciente o doctor)
Body:
{
  "documento": "1234567890",
  "nombre": "Juan",
  "apellido": "Pérez",
  "correo": "juan@ejemplo.com",
  "contraseña": "micontraseña",
  "direccion": "Calle 123",
  "fecha_nacimiento": "1990-01-15",
  "nit_eps": "1", // ID de EPS
  "tipo": "paciente", // "paciente" o "doctor"
  // Si es doctor, agregar:
  "especialidad": "1", // ID de especialidad
}

POST /login
Descripción: Iniciar sesión y obtener JWT token
Body:
{
  "correo": "juan@ejemplo.com",
  "contraseña": "micontraseña"
}
Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "1234567890",
    "nombre": "Juan Pérez",
    "tipo": "paciente"
  }
}

DATOS PÚBLICOS
==============

GET /api/eps
Descripción: Obtener lista de todas las EPS
Response:
[
  { "id": 1, "nombre": "Sanitas", "nit": "900123456" },
  { "id": 2, "nombre": "Nueva EPS", "nit": "800987654" },
  ...
]

GET /api/especialidades
Descripción: Obtener lista de especialidades médicas
Response:
[
  { "id": 1, "nombre": "Medicina General" },
  { "id": 2, "nombre": "Cardiología" },
  ...
]

GET /api/doctores
Descripción: Obtener lista de doctores con sus especialidades
Response:
[
  { "id_doctor": "1234567", "Nombre_Doctor": "Carlos", "Nombre_Especialidad": "Cardiología" },
  ...
]

CITAS (requieren autenticación con Bearer token)
================================================

POST /api/agendar-cita
Descripción: Agendar una nueva cita
Headers: Authorization: Bearer {token}
Body:
{
  "tipoCita": "Consulta",
  "especialidad": "Cardiología",
  "fecha": "2026-05-20",
  "hora": "14:30",
  "nombreCompleto": "Juan Pérez",
  "documentoIdentidad": "1234567890",
  "telefono": "3001234567",
  "correo": "juan@ejemplo.com",
  "motivo": "Dolor en el pecho"
}
Response:
{
  "message": "Cita agendada exitosamente",
  "citaId": 42
}

GET /api/mis-citas
Descripción: Obtener todas las citas del usuario autenticado
Headers: Authorization: Bearer {token}
Response:
[
  {
    "Id_cita": 42,
    "Tipo_Cita": "Consulta",
    "Fecha": "2026-05-20",
    "hora": "14:30:00",
    "especialidad": "Cardiología",
    "nombre_completo": "Juan Pérez",
    "Nombre_Doctor": "Dr. Carlos García",
    "motivo": "Dolor en el pecho"
  },
  ...
]

DELETE /api/cita/{id}
Descripción: Cancelar una cita
Headers: Authorization: Bearer {token}
Response:
{
  "message": "Cita eliminada exitosamente"
}

FLUJOS DE USUARIO
=================

FLUJO 1: PACIENTE - REGISTRO Y AGENDAMIENTO
==========================================
1. Paciente entra a http://localhost:3000
2. Click en "Registrarse"
3. Ingresa datos:
   - Documento (sin @arcdata.com)
   - Nombre, Apellido
   - Email, Contraseña
   - Dirección, Fecha de nacimiento
   - Selecciona EPS
4. Sistema:
   - Valida campos
   - Encripta contraseña con bcrypt
   - Inserta en tabla 'pacientes'
5. Paciente inicia sesión
6. Ve calendario en index-inicial.html
7. Click en "Agendar Citas"
8. Selecciona:
   - Tipo de cita
   - Especialidad (se carga lista de doctores)
   - Fecha y hora
9. Ingresa datos de contacto y motivo
10. Sistema:
    - Valida disponibilidad
    - Crea registro en tabla 'cita'
    - Muestra confirmación

FLUJO 2: DOCTOR - REGISTRO Y GESTIÓN
====================================
1. Doctor entra a http://localhost:3000
2. Click en "Registrarse"
3. Ingresa email con dominio @arcdata.com
4. Sistema detecta doctor automáticamente
5. Doctor ingresa:
   - Documento
   - Nombre, Apellido
   - Email (con @arcdata.com)
   - Dirección, Fecha de nacimiento
   - Especialidad (dropdown)
   - EPS
6. Sistema:
   - Valida dominio @arcdata.com
   - Encripta contraseña
   - Inserta en tabla 'doctor'
7. Doctor inicia sesión
8. Ve calendario en Doctor.html
9. Visualiza sus citas asignadas
10. Puede ver detalles de pacientes

AUTENTICACIÓN Y TOKENS JWT
===========================
- Token expira en: 1 hora
- Secret Key: "arcdata_citas_2025"
- Payload contiene:
  {
    "id": "documento_usuario",
    "nombre": "Nombre Completo",
    "tipo": "paciente" o "doctor",
    "iat": timestamp,
    "exp": timestamp + 3600
  }

Uso en frontend:
1. Guardar token en localStorage: localStorage.setItem('token', token)
2. Enviar en requests: Authorization: Bearer {token}
3. Decodificar en frontend: atob(token.split('.')[1])

COMPONENTES CLAVE DEL FRONTEND
==============================

1. LOGIN (index.html)
   - Formulario de autenticación
   - Cambio dinámico: login ↔ registro
   - Detección automática de tipo (paciente/doctor por email)
   - Validación de campos en cliente
   - Almacena token y datos de usuario

2. DASHBOARD PACIENTE (index-inicial.html)
   - Calendario con citas agendadas
   - Sección "Agendar Citas"
   - Sección "Ver Citas" con tabla de citas
   - Sección "Eliminar Citas"
   - Navegación dropdown
   - Cierre de sesión

3. DASHBOARD DOCTOR (Doctor.html)
   - Calendario de citas asignadas
   - Lista de citas por día
   - Información del paciente
   - Disponibilidad del doctor

SEGURIDAD
=========
- Contraseñas: encriptadas con bcrypt (salt rounds: 10)
- Tokens: JWT con expiración de 1 hora
- Autenticación: middleware 'autenticar' en rutas protegidas
- CORS: habilitado (acepta solicitudes del mismo host)
- Validación: campos obligatorios en servidor

NOTAS IMPORTANTES PARA APP MÓVIL
=================================

CAMBIOS NECESARIOS:
1. Reemplazar:
   - HTML/Tailwind → XML/Jetpack Compose (Android) o SwiftUI (iOS)
   - FullCalendar → bibliotecas nativas de calendario
   - Fetch API → HttpClient nativo
   - localStorage → SharedPreferences/UserDefaults

2. Manejo de sesión:
   - Guardar token localmente
   - Incluir Bearer token en cada request
   - Mostrar alerta si token expira
   - Redirigir al login automáticamente

3. Comunicación:
   - Base URL: http://localhost:3000 (cambiar en producción)
   - Content-Type: application/json
   - Todos los requests usan HTTPS en producción

4. Validaciones:
   - Mantener las mismas validaciones de campo
   - Mostrar errores del servidor al usuario
   - Implementar offline-first (caché de citas)

5. Permisos necesarios (Android):
   - INTERNET
   - READ_CALENDAR / WRITE_CALENDAR (para sincronizar con calendario)

TROUBLESHOOTING
===============

Problema: "Error al conectar con MySQL"
Solución: Verificar que MySQL está ejecutándose en puerto 3307
         Verificar credenciales en app/db.js
         
Problema: "Table doesn't exist"
Solución: Ejecutar: node setup_db.js
         
Problema: "Token inválido o expirado"
Solución: Limpiar localStorage y volver a iniciar sesión
         
Problema: "Error al cargar el calendario"
Solución: Verificar que la tabla 'cita' existe
         Revisar consola del navegador (F12)
         Verificar token en localStorage

Problema: "Cannot read property of undefined"
Solución: Puede faltar la tabla en BD o estructura incorrecta
         Ejecutar: node check_tables.js

ARCHIVOS IMPORTANTES A MODIFICAR PARA APP MÓVIL
===============================================

1. app/db.js - Cambiar configuración de BD
2. app/index.js - Ajustar endpoints si es necesario
3. Rutas de imagen - Usar URLs absolutas en producción

CREDENCIALES DE PRUEBA
======================
Para probar sin registrarse:

Usuario Paciente (debe crear uno):
- Documento: 12345678
- Email: usuario@example.com
- Contraseña: test123

Usuario Doctor (debe crear uno):
- Email: doctor@arcdata.com (obligatorio dominio @arcdata.com)
- Contraseña: doctorpass123

DESARROLLO LOCAL
================

Comando para iniciar:
npm run dev

Comando alternativo:
nodemon --exec node app/index.js

Archivo de configuración: package.json

Scripts disponibles:
- npm run dev: Inicia servidor con nodemon (recarga automática)

PUERTO Y HOST
=============
- Servidor: http://localhost:3000
- Base de datos: localhost:3307
- Recomendación para cambiar puerto: Editar app/index.js
  const PORT = 3000; // ← Cambiar aquí

DEPENDENCIAS (package.json)
===========================
- express: Framework web
- mysql2: Driver de MySQL
- jsonwebtoken: Generación de tokens
- bcrypt: Encriptación de contraseñas
- nodemon: Recarga automática en desarrollo (dev)

PRÓXIMAS MEJORAS SUGERIDAS
==========================
1. Implementar confirmación de citas por email
2. Agregar notificaciones push
3. Agregar historial clínico por paciente
4. Implementar reportes médicos
5. Agregar disponibilidad de doctores
6. Implementar rating de doctores
7. Agregar chat entre doctor-paciente
8. Implementar recordatorios de citas
9. Agregar pagos online
10. Implementar búsqueda y filtrado avanzado

SOPORTE TÉCNICO
===============
Para más información o reporte de errores:
- Revisar consola del navegador (F12)
- Revisar logs de servidor en terminal
- Verificar tablas de BD: node check_tables.js
- Reiniciar servidor: npm run dev

Fecha de creación: Mayo 2026
Versión: 1.0.0
Estado: En desarrollo activo

================================================================================
                              FIN DEL DOCUMENTO
================================================================================
