# SuperLab - Sistema de Gestión para Laboratorios Clínicos

**SuperLab** es una aplicación web moderna y profesional diseñada para la gestión integral de laboratorios clínicos. Permite administrar pacientes, órdenes de pruebas, resultados, reportes y más, todo en un solo lugar con interfaz en español.

---

## Tabla de Contenidos

1. [Características Principales](#-características-principales)
2. [Tecnologías](#-tecnologías)
3. [Requisitos Previos](#-requisitos-previos)
4. [Instalación](#-instalación)
5. [Configuración](#-configuración)
6. [Base de Datos](#-base-de-datos)
7. [Estructura del Proyecto](#-estructura-del-proyecto)
8. [Uso del Sistema](#-uso-del-sistema)
9. [Planes y Precios](#-planes-y-precios)
10. [API de IA](#-api-de-ia)
11. [Seguridad](#-seguridad)
12. [Contribución](#-contribución)
13. [Licencia](#-licencia)

---

## Características Principales

### Para Laboratorios
- **Gestión de pacientes**: Registro, búsqueda por cédula o teléfono, historial completo
- **Catálogo de pruebas**: Amplia base de pruebas con rangos de referencia por edad y sexo
- **Paneles/Perfiles**: Agrupación de pruebas en paneles con precio combinado
- **Órdenes de laboratorio**: Creación, seguimiento de estado y gestión de resultados
- **Resultados con indicadores**: Resaltado automático de valores altos (rojo), bajos (azul) y normales (verde)
- **Reportes**: Estadísticas diarias, semanales y mensuales
- **Integración con IA**: Consultas inteligentes para análisis de resultados

### Para Pacientes
- **Resultados seguros**: Acceso mediante enlace único + token de seguridad
- **Visualización clara**: Resultados con rangos de referencia y marcadores visuales
- **Compartir resultados**: Opción de imprimir o guardar como PDF

### Generales
- **Diseño responsivo**: Funciona en desktop y dispositivos móviles
- **Modo oscuro/claro**: Tema personalizable con persistencia en localStorage
- **Idioma**: Interfaz completamente en español
- **Autenticación**: Roles de administrador y asistente

---

## Tecnologías

### Backend
- **Node.js** - Entorno de ejecución
- **Express** - Framework web
- **EJS** - Motor de plantillas (con extensión .html)
- **cookie-parser** - Manejo de cookies firmadas
- **pg** - Cliente de PostgreSQL

### Base de Datos
- **PostgreSQL** - Sistema de gestión de bases de datos relacional

### Frontend
- **HTML5** - Estructura semántica
- **CSS3** - Diseño con variables CSS, modos claro/oscuro
- **JavaScript** - Interactividad del lado del cliente
- **Sin dependencias externas** - No se utilizan FontAwesome, Google Fonts ni librerías externas

---

## Requisitos Previos

- **Node.js** v14 o superior
- **PostgreSQL** v12 o superior
- **npm** v6 o superior

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/superlab.git
cd superlab
```

### 2. Instalar dependencias

```bash
npm init -y
npm install express ejs cookie-parser pg
```

### 3. Configurar variables de entorno

Crear archivo `.env` en la raíz del proyecto:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=labapp
DB_USER=postgres
DB_PASSWORD=postgres
SECRET_KEY=SuperLab2024SecureKey!@#$%
AGENT_API_KEY=sk-your-agent-api-key-here
UPLOAD_MAX_SIZE=10485760
```

### 4. Configurar la base de datos

```bash
# Crear la base de datos y las tablas
psql -U postgres -f database.sql

# Cargar datos de ejemplo
psql -U postgres -d labapp -f dummydata.sql
```

### 5. Iniciar la aplicación

```bash
node app.js
```

La aplicación estará disponible en `http://localhost:3000`

---

## Configuración

### Variables de Entorno (.env)

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| `PORT` | Puerto del servidor | `3000` |
| `DB_HOST` | Host de PostgreSQL | `localhost` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_NAME` | Nombre de la base de datos | `labapp` |
| `DB_USER` | Usuario de PostgreSQL | `postgres` |
| `DB_PASSWORD` | Contraseña de PostgreSQL | `postgres` |
| `SECRET_KEY` | Clave secreta para cookies | (cambiar en producción) |
| `AGENT_API_KEY` | API Key de agente | (opcional) |
| `UPLOAD_MAX_SIZE` | Tamaño máximo de subida | `10485760` (10MB) |

### Usuarios por Defecto (dummydata.sql)

| Email | Contraseña | Rol | Laboratorio |
|-------|-----------|-----|-------------|
| admin@superlab.com | admin123 | admin | SuperLab Central |
| admin2@superlab.com | admin123 | admin | LabAnalytica Norte |
| assistant@superlab.com | assist123 | assistant | SuperLab Central |

---

## Base de Datos

### Esquema (database.sql)

La base de datos `labapp` contiene las siguientes tablas:

| Tabla | Descripción |
|-------|-------------|
| `plans` | Planes de suscripción (FREE, BASIC, PRO) |
| `labs` | Laboratorios registrados |
| `users` | Usuarios del sistema (admins, asistentes) |
| `categories` | Categorías de pruebas |
| `tests` | Pruebas de laboratorio |
| `ranges` | Rangos de referencia por edad/sexo |
| `panels` | Paneles/Perfiles de pruebas |
| `panel_tests` | Asociación panel-prueba |
| `patients` | Pacientes |
| `orders` | Órdenes de laboratorio |
| `order_tests` | Pruebas dentro de una orden |
| `patient_tokens` | Tokens de acceso para pacientes |
| `queries` | Historial de consultas a IA |
| `activity_log` | Registro de actividad |

### Modelo de Datos para Menores

Los pacientes menores de edad se identifican con un número de cédula que consiste en la cédula del padre/madre seguida de un punto y un número secuencial:

```
001-1234567-01   → Padre/Madre
001-1234567-01.1 → Hijo 1
001-1234567-01.2 → Hijo 2
```

### Datos de Pruebas Incluidos

El archivo `tests-es.txt` contiene más de 250 pruebas de laboratorio en español, y `panels-es.md` describe 8 paneles clínicos prioritarios (PMC, BMP, Perfil Lipídico, Hemograma, etc.)

---

## Estructura del Proyecto

```
superlab/
├── app.js                 # Punto de entrada principal
├── database.js            # Clase Database con métodos de consulta
├── database.sql           # Script de creación de base de datos
├── dummydata.sql          # Datos de ejemplo
├── .env                   # Variables de entorno
├── README.md              # Documentación
├── tests-es.txt           # Lista de pruebas en español
├── panels-es.md           # Paneles de pruebas clínicas
├── funciton.md            # Requisitos funcionales detallados
├── prompt.txt             # Especificación del proyecto
├── package.json           # Dependencias de Node.js
├── views/                 # Plantillas EJS (.html)
│   ├── header.html        # Componente de cabecera
│   ├── footer.html        # Componente de pie de página
│   ├── index.html         # Página de inicio (landing page)
│   ├── login.html         # Inicio de sesión
│   ├── register.html      # Registro de laboratorio
│   ├── forgot.html        # Recuperación de contraseña
│   ├── dashboard.html     # Panel de control
│   ├── labs.html          # Listado de laboratorios
│   ├── lab-view.html      # Detalle de laboratorio con pruebas
│   ├── orders.html        # Listado de órdenes
│   ├── order-new.html     # Nueva orden
│   ├── order-view.html    # Detalle de orden
│   ├── order-results.html # Ingreso de resultados
│   ├── order-pdf.html     # Versión imprimible/PDF
│   ├── share-results.html # Compartir resultados
│   ├── patients.html      # Listado de pacientes
│   ├── patient-view.html  # Detalle de paciente
│   ├── patient-results.html # Resultados para paciente
│   ├── admin-tests.html   # Gestión de pruebas
│   ├── reports.html       # Reportes y estadísticas
│   └── error.html         # Página de error
├── public/
│   ├── styles/
│   │   ├── common.css     # Estilos compartidos (globales)
│   │   ├── index.css      # Estilos de la landing page
│   │   ├── auth.css       # Estilos de autenticación
│   │   ├── dashboard.css  # Estilos del panel
│   │   ├── labs.css       # Estilos de laboratorios
│   │   ├── orders.css     # Estilos de órdenes
│   │   ├── patients.css   # Estilos de pacientes
│   │   └── patient-results.css # Estilos de resultados
│   ├── scripts/
│   │   └── main.js        # JavaScript principal
│   ├── media/             # Archivos multimedia
│   └── uploads/           # Archivos subidos
└── package.json
```

---

## Uso del Sistema

### Visitantes (sin autenticación)
- **Página principal**: Información del sistema, planes y precios
- **Ver laboratorios**: Lista de laboratorios y sus pruebas con precios
- **Consultar resultados**: Acceder a resultados mediante enlace + token

### Administradores
- **Dashboard**: Vista general con estadísticas y actividad reciente
- **Gestión de pacientes**: CRUD completo, búsqueda avanzada
- **Gestión de pruebas**: Crear, editar pruebas y rangos de referencia
- **Paneles**: Agrupar pruebas en perfiles
- **Órdenes**: Crear, gestionar y dar seguimiento
- **Reportes**: Estadísticas y exportación
- **IA**: Consultas sobre resultados de pacientes

### Asistentes
- **Órdenes**: Crear y gestionar órdenes de laboratorio
- **Resultados**: Ingresar resultados de pruebas
- **Cambiar estados**: Avanzar órdenes en el flujo de trabajo
- **Compartir**: Enviar resultados a pacientes

### Flujo de una Orden
1. **Borrador** → Se crea la orden con paciente y pruebas
2. **Muestra tomada** → Se recolecta la muestra
3. **En análisis** → La muestra está siendo procesada
4. **Resultados ingresados** → Técnico ingresa los valores
5. **Verificado** → Admin verifica los resultados
6. **Publicado** → Resultados disponibles para el paciente

---

## Planes y Precios

| Característica | GRATIS | BÁSICO ($10/mes) | PRO ($25/mes) |
|---------------|--------|------------------|---------------|
| Pruebas por mes | Hasta 100 | Hasta 1,000 | Ilimitadas |
| Gestión de pacientes | Básica | Avanzada | Completa |
| Catálogo de pruebas | Estándar | Personalizado | Todos |
| Paneles/Perfiles | ❌ | ✅ | ✅ |
| Reportes | Básicos | Detallados | Avanzados |
| Integración con IA | ❌ | ✅ | Ilimitada |
| Soporte | Email | Prioritario | 24/7 |
| API | ❌ | ❌ | ✅ |

---

## API de Agentes

SuperLab se integra con Agentes de IA para permitir a los laboratorios realizar consultas sobre resultados de pacientes.

### Configuración
1. Obtén una API key de DeepSeek
2. Colócala en el archivo `.env`: `AGENT_API_KEY=tu-api-key`
3. Las consultas se realizarán desde el panel de administración

### Funcionalidades
- Preguntar sobre rangos de referencia
- Interpretación de valores anormales
- Posibles causas y tratamientos
- Historial de consultas por paciente

### Sin API Key
Si no se configura una API key, el sistema generará respuestas simuladas para demostración.

---

## Seguridad

- **Contraseñas**: Hash SHA-256 usando `node:crypto`
- **Cookies**: Firmadas con `cookie-parser` y clave secreta
- **Tokens**: Generados con `crypto.randomBytes(32)` (64 caracteres hex)
- **Acceso a resultados**: Token único + URL segura (el token no va en la URL)
- **Roles**: Separación entre administradores y asistentes
- **HTTP Only**: Cookies no accesibles desde JavaScript
- **SameSite**: Protección contra CSRF

---

## Pruebas Incluidas

El archivo `tests-es.txt` contiene más de 250 pruebas de laboratorio en español, incluyendo:

- **Hematología**: Hemograma completo, hemoglobina, hematocrito, etc.
- **Química Clínica**: Glucosa, perfil lipídico, función hepática, función renal
- **Endocrinología**: TSH, T4, T3, hormonas
- **Microbiología**: Cultivos, PCR, serologías
- **Inmunología**: Anticuerpos, autoinmunes
- **Urianálisis**: Exámenes de orina completos
- **Y más**: Marcadores tumorales, genéticos, drogas, etc.

### Paneles Prioritarios (panels-es.md)
1. Panel Metabólico Completo (PMC)
2. Panel Metabólico Básico (BMP)
3. Perfil Lipídico
4. Hemograma Completo con Diferencial
5. Panel de Función Hepática
6. Panel de Función Renal
7. Panel Tiroideo
8. Panel de Hepatitis Aguda

---

## Contribución

1. Fork it
2. ...
3. Profit!

### Lineamientos
- Mantén el código limpio y comentado
- Todas las variables, funciones y tablas en inglés
- Solo la UI y mensajes en español
- Sigue la estructura de archivos establecida

---

## Licencia

Este proyecto es de código abierto. Todos los derechos reservados por SuperLab

---

## Contacto

- **Email**: info@superlab.com
- **Web**: https://superlab.com
- **GitHub**: https://github.com/superlab

---

*Hecho con ❤️ para laboratorios clínicos*
