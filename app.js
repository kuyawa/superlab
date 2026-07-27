require('./envvars');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const ejs = require('ejs');
//const fileUpload = require('express-fileupload');
//const expressLayouts = require('express-ejs-layouts'); research layouts
const cookieParser = require('cookie-parser');
const Agent = require('./agent');
const Database = require('./database');
const db = new Database();
const agent = new Agent();
const PORT = parseInt(process.env.PORT || '3000');


const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Cookie parser
const COOKIE_SECRET = process.env.COOKIE_SECRET || 'default-secret-key-change-me';
app.use(cookieParser(COOKIE_SECRET));

// Set EJS as template engine but use .html extension
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// File upload handler - multer not allowed, so we'll handle multipart manually
// For simplicity, we use urlencoded which works for form data without files
// In production, you'd need a multipart handler

// ============================================================
// Authentication Middleware
// ============================================================

// Load user from token cookie
app.use(async (req, res, next) => {
    req.locals = { user: null };
    
    const token = req.signedCookies['superlab_token'];
    if (token) {
        try {
            const user = await db.findByToken(token);
            if (user) {
                req.locals.user = user;
            }
        } catch (err) {
            console.error('Auth middleware error:', err.message);
        }
    }
    
    next();
});

// Make user available to all templates
app.use((req, res, next) => {
    res.locals.user = req.locals.user;
    next();
});

// ============================================================
// Auth Helpers
// ============================================================

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function requireAuth(roles) {
    return (req, res, next) => {
        if (!req.locals.user) {
            return res.redirect('/login');
        }
        if (roles && !roles.includes(req.locals.user.role)) {
            return res.status(403).render('error', { 
                title: 'Acceso Denegado',
                error: 'No tienes permisos para acceder a esta página',
                extraStyles: [],
                extraScripts: []
            });
        }
        next();
    };
}

// ============================================================
// ROUTES - Public Pages
// ============================================================

// Home / Landing Page
app.get('/', async (req, res) => {
    try {
        res.render('index', { 
            title: 'Inicio',
            extraStyles: ['index.css'],
            extraScripts: []
        });
    } catch (err) {
        console.error('Error loading index:', err);
        res.status(500).send('Error interno del servidor');
    }
});

// Plans Page
app.get('/planes', async (req, res) => {
    try {
        //const plans = await db.getAllPlans();
        res.render('index', {
            title: 'Planes y Precios',
            extraStyles: ['index.css'],
            extraScripts: [],
            //plans
        });
    } catch (err) {
        console.error('Error loading plans:', err);
        res.status(500).send('Error interno del servidor');
    }
});

// Labs Listing (Public)
app.get('/labs', async (req, res) => {
    try {
        const labs = await db.getAllLabs();
        res.render('labs', {
            title: 'Laboratorios',
            extraStyles: ['labs.css'],
            extraScripts: [],
            labs
        });
    } catch (err) {
        console.error('Error loading labs:', err);
        res.status(500).send('Error interno del servidor');
    }
});

// Lab Detail with Tests (Public)
app.get('/labs/view/:id', async (req, res) => {
    try {
        const labId = req.params.id
        const lab = await db.getLabById(labId);
        if (!lab) {
            return res.status(404).send('Laboratorio no encontrado');
        }
        const tests = await db.getAllTests(labId);
        const panels = await db.getAllPanels(labId, true);
        //const panels = await db.getAllPanels(labId);
        res.render('lab-view', {
            title: lab.name,
            extraStyles: ['labs.css'],
            extraScripts: [],
            lab,
            tests,
            panels
        });
    } catch (err) {
        console.error('Error loading lab:', err);
        res.status(500).send('Error interno del servidor');
    }
});

// ============================================================
// ROUTES - Auth Pages
// ============================================================

// Login Page
app.get('/login', (req, res) => {
    if (req.locals.user) return res.redirect('/dashboard');
    res.render('login', {
        title: 'Iniciar Sesión',
        extraStyles: ['auth.css'],
        extraScripts: [],
        error: null,
        success: null
    });
});

// Login POST
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.render('login', {
                title: 'Iniciar Sesión',
                extraStyles: ['auth.css'],
                extraScripts: [],
                error: 'Correo y contraseña son requeridos',
                success: null
            });
        }

        const user = await db.findByEmail(email);
        if (!user) {
            return res.render('login', {
                title: 'Iniciar Sesión',
                extraStyles: ['auth.css'],
                extraScripts: [],
                error: 'Credenciales inválidas',
                success: null
            });
        }

        const hashedPassword = hashPassword(password);
        if (user.password !== hashedPassword) {
            return res.render('login', {
                title: 'Iniciar Sesión',
                extraStyles: ['auth.css'],
                extraScripts: [],
                error: 'Credenciales inválidas',
                success: null
            });
        }

        // Generate token and set cookie
        const token = generateToken();
        await db.updateToken(user.id, token);
        
        res.cookie('superlab_token', token, {
            signed: true,
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            sameSite: 'strict'
        });

        await db.logActivity(user.id, 'login', `Inicio de sesión de ${user.name}`, req.ip);
        
        res.redirect('/dashboard');
    } catch (err) {
        console.error('Login error:', err);
        res.render('login', {
            title: 'Iniciar Sesión',
            extraStyles: ['auth.css'],
            extraScripts: [],
            error: 'Error al iniciar sesión',
            success: null
        });
    }
});

// Register Page
app.get('/register', (req, res) => {
    if (req.locals.user) return res.redirect('/dashboard');
    res.render('register', {
        title: 'Registro',
        extraStyles: ['auth.css'],
        extraScripts: [],
        error: null,
        success: null
    });
});

// Register POST
app.post('/register', async (req, res) => {
    try {
        const { lab_name, name, email, phone, national_id, password, confirm_password, plan } = req.body;

        if (!lab_name || !name || !email || !password) {
            return res.render('register', {
                title: 'Registro',
                extraStyles: ['auth.css'],
                extraScripts: [],
                error: 'Todos los campos obligatorios deben ser completados',
                success: null
            });
        }

        if (password !== confirm_password) {
            return res.render('register', {
                title: 'Registro',
                extraStyles: ['auth.css'],
                extraScripts: [],
                error: 'Las contraseñas no coinciden',
                success: null
            });
        }

        if (password.length < 8) {
            return res.render('register', {
                title: 'Registro',
                extraStyles: ['auth.css'],
                extraScripts: [],
                error: 'La contraseña debe tener al menos 8 caracteres',
                success: null
            });
        }

        // Check if email already exists
        const existing = await db.findByEmail(email);
        if (existing) {
            return res.render('register', {
                title: 'Registro',
                extraStyles: ['auth.css'],
                extraScripts: [],
                error: 'Este correo electrónico ya está registrado',
                success: null
            });
        }

        // Get plan
        const planRecord = await db.getPlanByName(plan || 'FREE');
        if (!planRecord) {
            return res.render('register', {
                title: 'Registro',
                extraStyles: ['auth.css'],
                extraScripts: [],
                error: 'Plan inválido',
                success: null
            });
        }

        // Create lab
        const lab = await db.createLab(lab_name, '', phone, email, planRecord.id);

        // Create user
        const hashedPassword = hashPassword(password);
        const user = await db.createUser(lab.id, email, hashedPassword, name, 'admin', national_id, phone);

        // Generate token and auto-login
        const token = generateToken();
        await db.updateToken(user.id, token);
        
        res.cookie('superlab_token', token, {
            signed: true,
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'strict'
        });

        await db.logActivity(user.id, 'register', `Registro de nuevo laboratorio: ${lab_name}`, req.ip);

        res.redirect('/dashboard');
    } catch (err) {
        console.error('Register error:', err);
        res.render('register', {
            title: 'Registro',
            extraStyles: ['auth.css'],
            extraScripts: [],
            error: 'Error al registrar: ' + err.message,
            success: null
        });
    }
});

// Logout
app.get('/logout', async (req, res) => {
    const token = req.signedCookies['superlab_token'];
    if (token) {
        const user = await db.findByToken(token);
        if (user) {
            await db.updateToken(user.id, null);
        }
    }
    res.clearCookie('superlab_token');
    res.redirect('/');
});

// Forgot Password
app.get('/forgot', (req, res) => {
    if (req.locals.user) return res.redirect('/dashboard');
    res.render('forgot', {
        title: 'Recuperar Contraseña',
        extraStyles: ['auth.css'],
        extraScripts: [],
        error: null,
        success: null
    });
});

app.post('/forgot', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await db.findByEmail(email);
        
        // Always show success to prevent email enumeration
        let successMsg = 'Si el correo existe, recibirás instrucciones para restablecer tu contraseña.';
        
        if (user) {
            // In production, send actual email here
            // For now, just log and show placeholder message
            console.log(`Password reset requested for: ${email}`);
            // Generate reset token and store it (simplified)
            const resetToken = generateToken();
            await db.updateToken(user.id, resetToken);
        }

        res.render('forgot', {
            title: 'Recuperar Contraseña',
            extraStyles: ['auth.css'],
            extraScripts: [],
            error: null,
            success: successMsg
        });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.render('forgot', {
            title: 'Recuperar Contraseña',
            extraStyles: ['auth.css'],
            extraScripts: [],
            error: 'Error al procesar la solicitud',
            success: null
        });
    }
});

// ============================================================
// ROUTES - Authenticated Pages
// ============================================================

// Dashboard
app.get('/dashboard', requireAuth(), async (req, res) => {
    try {
        const labId = req.locals.user.lab_id;
        const stats = await db.getDashboardStats(labId);
        const recentOrders = await db.getRecentOrders(labId, 10);
        const recentActivity = await db.getRecentActivity(labId, 10);

        res.render('dashboard', {
            title: 'Panel de Control',
            extraStyles: ['dashboard.css'],
            extraScripts: [],
            stats,
            recentOrders,
            recentActivity
        });
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).send('Error interno del servidor');
    }
});

// Orders List
app.get('/orders', requireAuth(), async (req, res) => {
    try {
        const labId = req.locals.user.lab_id;
        const statusFilter = req.query.status || null;
        const orders = await db.getAllOrders(labId, statusFilter);
        
        res.render('orders', {
            title: 'Órdenes',
            extraStyles: ['orders.css'],
            extraScripts: [],
            orders,
            statusFilter
        });
    } catch (err) {
        console.error('Orders list error:', err);
        res.status(500).send('Error interno del servidor');
    }
});

// New Order Form
app.get('/orders/new', requireAuth(), async (req, res) => {
    try {
        const labId = req.locals.user.lab_id;
        const patients = await db.getAllPatients(labId);
        const tests = await db.getAllTests(labId);
        
        res.render('order-new', {
            title: 'Nueva Orden',
            extraStyles: ['orders.css'],
            extraScripts: [],
            patients,
            tests,
            error: null
        });
    } catch (err) {
        console.error('New order form error:', err);
        res.status(500).send('Error interno del servidor');
    }
});

// Create Order POST
app.post('/orders/new', requireAuth(), async (req, res) => {
    try {
        const labId = req.locals.user.lab_id;
        const userId = req.locals.user.id;
        let { patient_id, new_patient_name, new_patient_phone, test_ids, paid, payment_method, notes } = req.body;

        // Handle new patient creation
        if (!patient_id && new_patient_name) {
            const newPatient = await db.createPatient(labId, null, new_patient_name, new_patient_phone, null, null, null, null, null);
            patient_id = newPatient.id;
        }

        if (!patient_id) {
            const patients = await db.getAllPatients(labId);
            const tests = await db.getAllTests(labId);
            return res.render('order-new', {
                title: 'Nueva Orden',
                extraStyles: ['orders.css'],
                extraScripts: [],
                patients,
                tests,
                error: 'Debes seleccionar o crear un paciente'
            });
        }

        if (!test_ids) {
            const patients = await db.getAllPatients(labId);
            const tests = await db.getAllTests(labId);
            return res.render('order-new', {
                title: 'Nueva Orden',
                extraStyles: ['orders.css'],
                extraScripts: [],
                patients,
                tests,
                error: 'Debes seleccionar al menos una prueba'
            });
        }

        // Ensure test_ids is an array
        if (!Array.isArray(test_ids)) test_ids = [test_ids];

        // Calculate total
        let totalAmount = 0;
        for (const testId of test_ids) {
            const test = await db.getTestById(testId);
            if (test) totalAmount += parseFloat(test.base_price);
        }

        const isPaid = paid === 'true' || paid === true;

        // Create order
        const order = await db.createOrder(labId, patient_id, userId, totalAmount, isPaid, notes || null);

        // Add tests to order
        for (const testId of test_ids) {
            await db.addOrderTest(order.id, testId);
        }

        // Generate patient token for result access
        const token = generateToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry
        await db.createPatientToken(patient_id, order.id, token, expiresAt);

        // If paid, update payment method
        if (isPaid && payment_method) {
            await db.query('UPDATE orders SET payment_method = $1 WHERE id = $2', [payment_method, order.id]);
        }

        await db.logActivity(userId, 'create_order', `Creó orden #${order.id} para paciente`, req.ip);

        res.redirect('/orders/view/' + order.id);
    } catch (err) {
        console.error('Create order error:', err);
        const labId = req.locals.user.lab_id;
        const patients = await db.getAllPatients(labId);
        const tests = await db.getAllTests(labId);
        res.render('order-new', {
            title: 'Nueva Orden',
            extraStyles: ['orders.css'],
            extraScripts: [],
            patients,
            tests,
            error: 'Error al crear la orden: ' + err.message
        });
    }
});

// View Order
app.get('/orders/view/:id', requireAuth(), async (req, res) => {
    try {
        const order = await db.getOrderById(req.params.id);
        if (!order) return res.status(404).send('Orden no encontrada');
        
        // Check lab access
        if (order.lab_id !== req.locals.user.lab_id) {
            return res.status(403).send('Acceso denegado');
        }

        const orderTests = await db.getOrderTests(order.id);
        
        res.render('order-view', {
            title: 'Orden #' + order.id,
            extraStyles: ['orders.css'],
            extraScripts: [],
            order,
            orderTests
        });
    } catch (err) {
        console.error('View order error:', err);
        res.status(500).send('Error interno del servidor');
    }
});

// Update Order Status
app.post('/orders/:id/status', requireAuth(), async (req, res) => {
    try {
        const order = await db.getOrderById(req.params.id);
        if (!order) return res.status(404).send('Orden no encontrada');
        if (order.lab_id !== req.locals.user.lab_id) return res.status(403).send('Acceso denegado');

        const { status } = req.body;
        await db.updateOrderStatus(order.id, status);

        // If publishing, update all test statuses
        if (status === 'published') {
            await db.query(
                `UPDATE order_tests SET status = 'published', updated_at = NOW() WHERE order_id = $1`,
                [order.id]
            );
        }

        await db.logActivity(req.locals.user.id, 'update_status', 
            `Actualizó estado de orden #${order.id} a ${status}`, req.ip);

        res.redirect('/orders/view/' + order.id);
    } catch (err) {
        console.error('Update status error:', err);
        res.status(500).send('Error interno del servidor');
    }
});

// Enter Results Page
app.get('/orders/enter-results/:id', requireAuth(), async (req, res) => {
    try {
        const order = await db.getOrderById(req.params.id);
        if (!order) return res.status(404).send('Orden no encontrada');
        if (order.lab_id !== req.locals.user.lab_id) return res.status(403).send('Acceso denegado');

        const orderTests = await db.getOrderTests(order.id);
        
        res.render('order-results', {
            title: 'Ingresar Resultados',
            extraStyles: ['orders.css'],
            extraScripts: [],
            order,
            orderTests
        });
    } catch (err) {
        console.error('Enter results form error:', err);
        res.status(500).send('Error interno del servidor');
    }
});

// Save Results POST
app.post('/orders/enter-results/:id', requireAuth(), async (req, res) => {
    try {
        const order = await db.getOrderById(req.params.id);
        if (!order) return res.status(404).send('Orden no encontrada');
        if (order.lab_id !== req.locals.user.lab_id) return res.status(403).send('Acceso denegado');

        const { test_ids, ...otherFields } = req.body;
        const testIds = Array.isArray(test_ids) ? test_ids : [test_ids];

        for (const testId of testIds) {
            const resultValue = otherFields[`result_${testId}`] || null;
            const resultText = otherFields[`text_${testId}`] || null;
            const flag = otherFields[`flag_${testId}`] || null;

            await db.updateOrderTestResultByTestId(order.id, testId, resultValue, resultText, flag);
        }

        // Update order status
        if (order.status === 'in_analysis' || order.status === 'specimen_collected') {
            await db.updateOrderStatus(order.id, 'results_entered');
        }

        await db.logActivity(req.locals.user.id, 'enter_results', 
            `Ingresó resultados para orden #${order.id}`, req.ip);

        res.redirect('/orders/view/' + order.id);
    } catch (err) {
        console.error('Save results error:', err);
        res.status(500).send('Error interno del servidor');
    }
});

// ============================================================
// ROUTES - Patient Results (Public with token)
// ============================================================

// Patient Results Page - Token Verification
app.get('/results/:patientId', async (req, res) => {
    try {
        const patient = await db.getPatientById(req.params.patientId);
        if (!patient) return res.status(404).send('Paciente no encontrado');

        res.render('patient-results', {
            title: 'Mis Resultados',
            extraStyles: ['patient-results.css'],
            extraScripts: [],
            authorized: false,
            patientId: req.params.patientId,
            patient: null,
            results: [],
            labName: '',
            error: null
        });
    } catch (err) {
        console.error('Patient results error:', err);
        res.status(500).send('Error interno del servidor');
    }
});

// Verify Token and Show Results
app.post('/results/:patientId', async (req, res) => {
    try {
        const { token } = req.body;
        const patientId = req.params.patientId;

        const validToken = await db.verifyPatientToken(patientId, token);
        if (!validToken) {
            return res.render('patient-results', {
                title: 'Mis Resultados',
                extraStyles: ['patient-results.css'],
                extraScripts: [],
                authorized: false,
                patientId,
                patient: null,
                results: [],
                labName: '',
                error: 'Token inválido o expirado. Contacta al laboratorio.'
            });
        }

        // Mark token as used
        // await db.markTokenUsed(validToken.id);

        // Get patient info and results
        const patient = await db.getPatientById(patientId);
        const lab = patient.lab_id ? await db.getLabById(patient.lab_id) : null;
        const results = await db.getResultsByPatientAndOrder(patientId, validToken.order_id);

        res.render('patient-results', {
            title: 'Mis Resultados',
            extraStyles: ['patient-results.css'],
            extraScripts: [],
            authorized: true,
            patientId,
            patient,
            results,
            labName: lab ? lab.name : 'SuperLab'
        });
    } catch (err) {
        console.error('Token verification error:', err);
        res.status(500).send('Error interno del servidor');
    }
});

// ============================================================
// ROUTES - Patients Management (Admin)
// ============================================================

app.get('/admin/patients', requireAuth(['admin']), async (req, res) => {
    try {
        const labId = req.locals.user.lab_id;
        const search = req.query.search || '';
        const patients = await db.getAllPatients(labId, search);
        
        res.render('patients', {
            title: 'Pacientes',
            extraStyles: ['patients.css'],
            extraScripts: [],
            patients,
            search
        });
    } catch (err) {
        console.error('Patients list error:', err);
        res.status(500).send('Error interno del servidor');
    }
});

app.post('/admin/patients/new', requireAuth(['admin']), async (req, res) => {
    try {
        const labId = req.locals.user.lab_id;
        const { full_name, national_id, phone, email, date_of_birth, sex, address } = req.body;

        await db.createPatient(labId, national_id || null, full_name, phone || null, email || null, 
            date_of_birth || null, sex || null, address || null, null);

        await db.logActivity(req.locals.user.id, 'create_patient', `Creó paciente: ${full_name}`, req.ip);

        res.redirect('/admin/patients');
    } catch (err) {
        console.error('Create patient error:', err);
        res.status(500).send('Error al crear paciente');
    }
});

app.get('/admin/patients/view/:id', requireAuth(['admin']), async (req, res) => {
    try {
        const patient = await db.getPatientById(req.params.id);
        if (!patient) return res.status(404).send('Paciente no encontrado');
        
        // Get patient's orders
        const labId = req.locals.user.lab_id;
        const orders = await db.query(
            `SELECT o.*, 
             (SELECT COUNT(*) FROM order_tests ot WHERE ot.order_id = o.id) as test_count
             FROM orders o WHERE o.patient_id = $1 AND o.lab_id = $2 
             ORDER BY o.created_at DESC`,
            [patient.id, labId]
        );
        
        const queries = await db.getPatientQueries(patient.id);

        res.render('patient-view', {
            title: 'Paciente: ' + patient.full_name,
            extraStyles: ['patients.css'],
            extraScripts: [],
            patient,
            orders: orders.rows,
            queries
        });
    } catch (err) {
        console.error('Patient view error:', err);
        res.status(500).send('Error interno del servidor');
    }
});

// ============================================================
// ROUTES - Tests Management (Admin)
// ============================================================

app.get('/admin/tests', requireAuth(['admin']), async (req, res) => {
    try {
        const labId = req.locals.user.lab_id;
        const tests = await db.getAllTests(labId);
        const categories = await db.getAllCategories();
        
        res.render('admin-tests', {
            title: 'Pruebas de Laboratorio',
            extraStyles: [],
            extraScripts: [],
            tests,
            categories,
            error: null,
            success: null
        });
    } catch (err) {
        console.error('Tests list error:', err);
        res.status(500).send('Error interno del servidor');
    }
});

// ============================================================
// ROUTES - Reports
// ============================================================

app.get('/reports', requireAuth(['admin']), async (req, res) => {
    try {
        const labId = req.locals.user.lab_id;
        const stats = await db.getDashboardStats(labId);
        
        // Get daily/weekly/monthly stats
        const dailyOrders = await db.query(
            `SELECT DATE(created_at) as date, COUNT(*) as count 
             FROM orders WHERE lab_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
             GROUP BY DATE(created_at) ORDER BY date`,
            [labId]
        );

        res.render('reports', {
            title: 'Reportes',
            extraStyles: [],
            extraScripts: [],
            stats,
            dailyOrders: dailyOrders.rows
        });
    } catch (err) {
        console.error('Reports error:', err);
        res.status(500).send('Error interno del servidor');
    }
});

// ============================================================
// ROUTES - Admin: Tests CRUD
// ============================================================

app.post('/admin/tests/new', requireAuth(['admin']), async (req, res) => {
    try {
        const labId = req.locals.user.lab_id;
        const { code, name, name_es, description, methodology, unit, base_price, category_id } = req.body;

        if (!code || !name_es || !base_price) {
            const tests = await db.getAllTests(labId);
            const categories = await db.getAllCategories();
            return res.render('admin-tests', {
                title: 'Pruebas de Laboratorio',
                extraStyles: [],
                extraScripts: [],
                tests,
                categories,
                error: 'Código, nombre y precio son requeridos',
                success: null
            });
        }

        await db.createTest(labId, code, name || name_es, name_es, description || null, 
            methodology || null, unit || null, 2, parseFloat(base_price), category_id || null);

        await db.logActivity(req.locals.user.id, 'create_test', `Creó prueba: ${name_es}`, req.ip);

        res.redirect('/admin/tests');
    } catch (err) {
        console.error('Create test error:', err);
        res.redirect('/admin/tests?error=' + encodeURIComponent('Error al crear prueba'));
    }
});

// ============================================================
// ROUTES - Admin: Categories CRUD
// ============================================================

app.post('/admin/categories/new', requireAuth(['admin']), async (req, res) => {
    try {
        const { name, name_es, display_order } = req.body;
        
        await db.query(
            `INSERT INTO categories (name, name_es, display_order) VALUES ($1, $2, $3)`,
            [name || name_es, name_es, parseInt(display_order || '0')]
        );

        await db.logActivity(req.locals.user.id, 'create_category', `Creó categoría: ${name_es}`, req.ip);
        
        res.redirect('/admin/tests');
    } catch (err) {
        console.error('Create category error:', err);
        res.redirect('/admin/tests?error=' + encodeURIComponent('Error al crear categoría'));
    }
});

// ============================================================
// ROUTES - Admin: Panels CRUD
// ============================================================

app.post('/admin/panels/new', requireAuth(['admin']), async (req, res) => {
    try {
        const labId = req.locals.user.lab_id;
        const { name, name_es, description, combined_price, test_ids } = req.body;

        if (!name_es) {
            return res.redirect('/admin/tests?error=' + encodeURIComponent('Nombre del panel requerido'));
        }

        const result = await db.query(
            `INSERT INTO panels (lab_id, name, name_es, description, combined_price) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [labId, name || name_es, name_es, description || null, combined_price ? parseFloat(combined_price) : null]
        );

        const panel = result.rows[0];

        // Add tests to panel
        if (test_ids) {
            const testIdArray = Array.isArray(test_ids) ? test_ids : [test_ids];
            for (const testId of testIdArray) {
                await db.query(
                    'INSERT INTO panel_tests (panel_id, test_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [panel.id, testId]
                );
            }
        }

        await db.logActivity(req.locals.user.id, 'create_panel', `Creó panel: ${name_es}`, req.ip);
        
        res.redirect('/admin/tests');
    } catch (err) {
        console.error('Create panel error:', err);
        res.redirect('/admin/tests?error=' + encodeURIComponent('Error al crear panel'));
    }
});

// ============================================================
// ROUTES - AI Query
// ============================================================

app.post('/api/query', requireAuth(), async (req, res) => {
    try {
        const { patient_id, order_id, query } = req.body;
        const userId = req.locals.user.id;

        if (!query) {
            return res.status(400).json({ error: 'Consulta requerida' });
        }

        const aiResponse = await agent.exec(query) // Call AI API
        await db.createQuery(userId, patient_id || null, order_id || null, query, aiResponse);

        res.json({ 
            success: true, 
            response: aiResponse,
            query: query
        });
    } catch (err) {
        console.error('Query error:', err);
        res.status(500).json({ error: 'Error al procesar la consulta' });
    }
});

// ============================================================
// ROUTES - Share Results (Placeholder)
// ============================================================

app.get('/orders/:id/share', requireAuth(), async (req, res) => {
    try {
        const order = await db.getOrderById(req.params.id);
        if (!order) return res.status(404).send('Orden no encontrada');

        // Placeholder for email/whatsapp sharing
        const shareUrl = `${req.protocol}://${req.get('host')}/results/${order.patient_id}`;
        
        // In production, generate and store a new token for sharing
        const shareToken = BigInt('0x'+generateToken()).toString().substring(0, 9);
        await db.createPatientToken(order.patient_id, order.id, shareToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

        res.render('share-results', {
            title: 'Compartir Resultados',
            extraStyles: [],
            extraScripts: [],
            order,
            shareUrl,
            shareToken
        });
    } catch (err) {
        console.error('Share results error:', err);
        res.status(500).send('Error interno del servidor');
    }
});

// ============================================================
// ROUTES - Print/PDF (Placeholder)
// ============================================================

app.get('/orders/:id/pdf', requireAuth(), async (req, res) => {
    try {
        const order = await db.getOrderById(req.params.id);
        if (!order) return res.status(404).send('Orden no encontrada');

        const orderTests = await db.getOrderTests(order.id);
        
        // Simple HTML-based PDF (browser can print to PDF)
        res.render('order-pdf', {
            title: 'Orden #' + order.id,
            extraStyles: [],
            extraScripts: [],
            order,
            orderTests,
            layout: false
        });
    } catch (err) {
        console.error('PDF generation error:', err);
        res.status(500).send('Error interno del servidor');
    }
});

// ============================================================
// 404 Handler
// ============================================================

app.use((req, res) => {
    res.status(404).render('error', {
        title: 'Página no encontrada',
        extraStyles: [],
        extraScripts: [],
        error: 'La página que buscas no existe',
        code: 404
    });
});

// ============================================================
// Error Handler
// ============================================================

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).render('error', {
        title: 'Error del servidor',
        extraStyles: [],
        extraScripts: [],
        error: 'Ha ocurrido un error interno del servidor',
        code: 500
    });
});

// ============================================================
// Start Server
// ============================================================

app.listen(PORT, () => {
    console.log(`SuperLab - Clinical Lab Management System`);
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
