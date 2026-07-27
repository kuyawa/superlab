// ============================================================
// SuperLab - Database Class
// All database queries as methods
// ============================================================

const { Pool } = require('pg');

class Database {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL
            //ssl: { rejectUnauthorized: false }
        });
    }

    // ============================================================
    // USER METHODS
    // ============================================================

    async findByEmail(email) {
        const result = await this.pool.query(
            'SELECT u.*, l.name as lab_name, l.id as lab_id FROM users u LEFT JOIN labs l ON u.lab_id = l.id WHERE u.email = $1',
            [email]
        );
        return result.rows[0] || null;
    }

    async findByToken(token) {
        const result = await this.pool.query(
            'SELECT u.*, l.name as lab_name FROM users u LEFT JOIN labs l ON u.lab_id = l.id WHERE u.token = $1',
            [token]
        );
        return result.rows[0] || null;
    }

    async findByNationalId(nationalId) {
        const result = await this.pool.query(
            'SELECT u.*, l.name as lab_name FROM users u LEFT JOIN labs l ON u.lab_id = l.id WHERE u.national_id = $1',
            [nationalId]
        );
        return result.rows[0] || null;
    }

    async findByPhone(phone) {
        const result = await this.pool.query(
            'SELECT u.*, l.name as lab_name FROM users u LEFT JOIN labs l ON u.lab_id = l.id WHERE u.phone = $1',
            [phone]
        );
        return result.rows[0] || null;
    }

    async createUser(labId, email, password, name, role, nationalId, phone) {
        const result = await this.pool.query(
            `INSERT INTO users (lab_id, email, password, name, role, national_id, phone)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [labId, email, password, name, role, nationalId || null, phone || null]
        );
        return result.rows[0];
    }

    async updateToken(userId, token) {
        await this.pool.query(
            'UPDATE users SET token = $1 WHERE id = $2',
            [token, userId]
        );
    }

    async updatePassword(userId, password) {
        await this.pool.query(
            'UPDATE users SET password = $1 WHERE id = $2',
            [password, userId]
        );
    }

    // ============================================================
    // LAB METHODS
    // ============================================================

    async getAllLabs() {
        const result = await this.pool.query(
            `SELECT l.*, p.name_es as plan_name, 
             (SELECT COUNT(*) FROM tests t WHERE t.lab_id = l.id) as test_count
             FROM labs l LEFT JOIN plans p ON l.plan_id = p.id
             WHERE l.is_active = true ORDER BY l.name`
        );
        return result.rows;
    }

    async getLabById(id) {
        const result = await this.pool.query(
            `SELECT l.*, p.name_es as plan_name FROM labs l 
             LEFT JOIN plans p ON l.plan_id = p.id WHERE l.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    async createLab(name, address, phone, email, planId) {
        const result = await this.pool.query(
            `INSERT INTO labs (name, address, phone, email, plan_id) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [name, address, phone, email, planId]
        );
        return result.rows[0];
    }

    // ============================================================
    // PLAN METHODS
    // ============================================================

    async getAllPlans() {
        const result = await this.pool.query(
            'SELECT * FROM plans WHERE is_active = true ORDER BY price_monthly'
        );
        return result.rows;
    }

    async getPlanByName(name) {
        const result = await this.pool.query(
            'SELECT * FROM plans WHERE name = $1',
            [name]
        );
        return result.rows[0] || null;
    }

    // ============================================================
    // PATIENT METHODS
    // ============================================================

    async getAllPatients(labId, search) {
        let query = `
            SELECT p.*, 
            (SELECT COUNT(*) FROM orders o WHERE o.patient_id = p.id) as order_count
            FROM patients p WHERE p.lab_id = $1`;
        const params = [labId];

        if (search) {
            query += ` AND (p.full_name ILIKE $2 OR p.national_id ILIKE $2 OR p.phone ILIKE $2)`;
            params.push(`%${search}%`);
        }

        query += ' ORDER BY p.full_name';
        const result = await this.pool.query(query, params);
        return result.rows;
    }

    async getPatientById(id) {
        const result = await this.pool.query('SELECT * FROM patients WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    async getPatientByNationalId(nationalId) {
        const result = await this.pool.query('SELECT * FROM patients WHERE national_id = $1', [nationalId]);
        return result.rows[0] || null;
    }

    async getPatientsByPhone(phone) {
        const result = await this.pool.query('SELECT * FROM patients WHERE phone = $1', [phone]);
        return result.rows;
    }

    async createPatient(labId, nationalId, fullName, phone, email, dateOfBirth, sex, address, parentId) {
        const result = await this.pool.query(
            `INSERT INTO patients (lab_id, national_id, full_name, phone, email, date_of_birth, sex, address, parent_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [labId, nationalId, fullName, phone, email, dateOfBirth, sex, address, parentId]
        );
        return result.rows[0];
    }

    async updatePatient(id, fields) {
        const sets = [];
        const params = [];
        let idx = 1;

        Object.keys(fields).forEach(key => {
            if (fields[key] !== undefined) {
                sets.push(`${key} = $${idx}`);
                params.push(fields[key]);
                idx++;
            }
        });

        if (sets.length === 0) return null;

        params.push(id);
        const result = await this.pool.query(
            `UPDATE patients SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
            params
        );
        return result.rows[0];
    }

    // ============================================================
    // TEST METHODS
    // ============================================================

    async getAllTests(labId) {
        const result = await this.pool.query(
            `SELECT t.*, c.name_es as category_name FROM tests t 
             LEFT JOIN categories c ON t.category_id = c.id 
             WHERE t.lab_id = $1 AND t.is_active = true 
             ORDER BY c.display_order, t.name_es`,
            [labId]
        );
        return result.rows;
    }

    async getTestById(id) {
        const result = await this.pool.query(
            `SELECT t.*, c.name_es as category_name FROM tests t 
             LEFT JOIN categories c ON t.category_id = c.id WHERE t.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    async createTest(labId, code, name, nameEs, description, methodology, unit, decimalPrecision, basePrice, categoryId) {
        const result = await this.pool.query(
            `INSERT INTO tests (lab_id, code, name, name_es, description, methodology, unit, decimal_precision, base_price, category_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [labId, code, name, nameEs, description, methodology, unit, decimalPrecision, basePrice, categoryId]
        );
        return result.rows[0];
    }

    // ============================================================
    // REFERENCE RANGES METHODS
    // ============================================================

    async getRangesForTest(testId) {
        const result = await this.pool.query(
            'SELECT * FROM ranges WHERE test_id = $1 AND is_active = true ORDER BY sex, age_min_months',
            [testId]
        );
        return result.rows;
    }

    async getApplicableRange(testId, sex, ageMonths) {
        const result = await this.pool.query(
            `SELECT * FROM ranges 
             WHERE test_id = $1 AND (sex = $2 OR sex = 'Both') 
             AND age_min_months <= $3 AND age_max_months >= $3 
             AND is_active = true ORDER BY sex DESC LIMIT 1`,
            [testId, sex, ageMonths]
        );
        return result.rows[0] || null;
    }

    async createReferenceRange(testId, sex, ageMin, ageMax, minValue, maxValue, textValue) {
        const result = await this.pool.query(
            `INSERT INTO ranges (test_id, sex, age_min_months, age_max_months, min_value, max_value, text_value)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [testId, sex, ageMin, ageMax, minValue, maxValue, textValue]
        );
        return result.rows[0];
    }

    // ============================================================
    // CATEGORY METHODS
    // ============================================================

    async getAllCategories() {
        const result = await this.pool.query(
            'SELECT * FROM categories WHERE is_active = true ORDER BY display_order'
        );
        return result.rows;
    }

    // ============================================================
    // PANEL METHODS
    // ============================================================

    async getAllPanels(labId, includeTests=false) {
        const panels = await this.pool.query(
            `SELECT p.*, 
             (SELECT COUNT(*) FROM panel_tests pt WHERE pt.panel_id = p.id) as test_count
             FROM panels p WHERE p.lab_id = $1 AND p.is_active = true ORDER BY p.name_es`,
            [labId]
        );
        if(includeTests && panels.rows?.length > 0){
            for(let row of panels.rows){
                row.tests = await this.getPanelTests(row.id)
                //console.log('INCLUDED', row.tests)
            }
            //console.log('PANELS', panels.rows)
        }
        return panels.rows;
    }

    async getPanelById(id) {
        const result = await this.pool.query('SELECT * FROM panels WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

/*
    async getAllPanelTests(labId) {
        const result = await this.pool.query(
            `SELECT t.* FROM tests t 
             INNER JOIN panel_tests p ON t.id = p.test_id 
             WHERE p.lab_id = $1`,
            [labId]
        );
        return result.rows;
    }
*/
    async getPanelTests(panelId) {
        const result = await this.pool.query(
            `SELECT t.*, pt.panel_id FROM tests t
             INNER JOIN panel_tests pt ON t.id = pt.test_id 
             WHERE pt.panel_id = $1`,
            [panelId]
        );
        return result.rows;
    }

    // ============================================================
    // ORDER METHODS
    // ============================================================

    async getAllOrders(labId, statusFilter) {
        let query = `
            SELECT o.*, p.national_id, p.full_name as patient_name, u.name as created_by,
            (SELECT COUNT(*) FROM order_tests ot WHERE ot.order_id = o.id) as test_count
            FROM orders o 
            LEFT JOIN patients p ON o.patient_id = p.id 
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.lab_id = $1`;
        const params = [labId];

        if (statusFilter) {
            query += ' AND o.status = $2';
            params.push(statusFilter);
        }

        query += ' ORDER BY o.created_at DESC LIMIT 50';
        const result = await this.pool.query(query, params);
        return result.rows;
    }

    async getRecentOrders(labId, limit = 10) {
        const result = await this.pool.query(
            `SELECT o.*, p.national_id, p.full_name as patient_name, u.name as created_by,
             (SELECT COUNT(*) FROM order_tests ot WHERE ot.order_id = o.id) as test_count
             FROM orders o 
             LEFT JOIN patients p ON o.patient_id = p.id 
             LEFT JOIN users u ON o.user_id = u.id
             WHERE o.lab_id = $1 
             ORDER BY o.created_at DESC LIMIT $2`,
            [labId, limit]
        );
        return result.rows;
    }

    async getOrderById(id) {
        const result = await this.pool.query(
            `SELECT o.*, p.full_name as patient_name, p.national_id as patient_national_id,
             p.phone as patient_phone, p.email as patient_email,
             u.name as created_by, l.name as lab_name
             FROM orders o 
             LEFT JOIN patients p ON o.patient_id = p.id 
             LEFT JOIN users u ON o.user_id = u.id
             LEFT JOIN labs l ON o.lab_id = l.id
             WHERE o.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    async getOrderTests(orderId) {
        const result = await this.pool.query(
            `SELECT ot.*, t.name_es as test_name_es, t.name as test_name, t.unit,
             t.base_price, t.decimal_precision
             FROM order_tests ot 
             INNER JOIN tests t ON ot.test_id = t.id 
             WHERE ot.order_id = $1 ORDER BY t.name_es`,
            [orderId]
        );

        // Get ranges for each test
        for (let row of result.rows) {
            const ranges = await this.getRangesForTest(row.test_id);
            if (ranges.length > 0) {
                row.range_min = ranges[0].min_value;
                row.range_max = ranges[0].max_value;
            }
        }

        return result.rows;
    }

    async createOrder(labId, patientId, userId, totalAmount, paid, notes) {
        const result = await this.pool.query(
            `INSERT INTO orders (lab_id, patient_id, user_id, total_amount, paid, notes)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [labId, patientId, userId, totalAmount, paid, notes]
        );
        return result.rows[0];
    }

    async addOrderTest(orderId, testId) {
        const result = await this.pool.query(
            `INSERT INTO order_tests (order_id, test_id) VALUES ($1, $2) RETURNING *`,
            [orderId, testId]
        );
        return result.rows[0];
    }

    async updateOrderStatus(orderId, status) {
        const result = await this.pool.query(
            'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [status, orderId]
        );
        return result.rows[0];
    }

    async updateOrderTestResult(orderTestId, resultValue, resultText, flag, status) {
        const result = await this.pool.query(
            `UPDATE order_tests SET result_value = $1, result_text = $2, flag = $3, 
             status = $4, is_abnormal = $5, updated_at = NOW() WHERE id = $6 RETURNING *`,
            [resultValue, resultText, flag, status, flag && flag !== 'normal']
        );
        return result.rows[0];
    }

    async updateOrderTestResultByTestId(orderId, testId, resultValue, resultText, flag) {
        const result = await this.pool.query(
            `UPDATE order_tests SET result_value = $1, result_text = $2, flag = $3,
             is_abnormal = $4, status = 'completed', updated_at = NOW() 
             WHERE order_id = $5 AND test_id = $6 RETURNING *`,
            [resultValue, resultText, flag, flag && flag !== 'normal', orderId, testId]
        );
        return result.rows[0];
    }

    // ============================================================
    // PATIENT TOKEN METHODS
    // ============================================================

    async createPatientToken(patientId, orderId, token, expiresAt) {
        const result = await this.pool.query(
            `INSERT INTO patient_tokens (patient_id, order_id, token, expires_at)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [patientId, orderId, token, expiresAt]
        );
        return result.rows[0];
    }

    async verifyPatientToken(patientId, token) {
        const result = await this.pool.query(
            `SELECT * FROM patient_tokens 
             WHERE patient_id = $1 AND token = $2 AND used = false 
             AND (expires_at IS NULL OR expires_at > NOW())`,
            [patientId, token]
        );
        return result.rows[0] || null;
    }

    async markTokenUsed(tokenId) {
        await this.pool.query(
            'UPDATE patient_tokens SET used = true WHERE id = $1',
            [tokenId]
        );
    }

    async getResultsByPatientAndOrder(patientId, orderId) {
        const result = await this.pool.query(
            `SELECT ot.*, t.name_es as test_name_es, t.unit, t.name as test_name,
             rr.min_value as range_min, rr.max_value as range_max
             FROM order_tests ot 
             INNER JOIN tests t ON ot.test_id = t.id 
             LEFT JOIN ranges rr ON t.id = rr.test_id AND rr.is_active = true
             WHERE ot.order_id = $1 AND ot.status IN ('completed', 'verified', 'published')
             ORDER BY t.name_es`,
            [orderId]
        );
        return result.rows;
    }

    // ============================================================
    // AGENT QUERY METHODS
    // ============================================================

    async createQuery(userId, patientId, orderId, query, response) {
        const result = await this.pool.query(
            `INSERT INTO queries (user_id, patient_id, order_id, query, response)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [userId, patientId, orderId, query, response]
        );
        return result.rows[0];
    }

    async getPatientQueries(patientId) {
        const result = await this.pool.query(
            'SELECT * FROM queries WHERE patient_id = $1 ORDER BY created_at DESC',
            [patientId]
        );
        return result.rows;
    }

    // ============================================================
    // ACTIVITY LOG METHODS
    // ============================================================

    async logActivity(userId, action, description, ipAddress) {
        const result = await this.pool.query(
            `INSERT INTO activity_log (user_id, action, description, ip_address)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [userId, action, description, ipAddress]
        );
        return result.rows[0];
    }

    async getRecentActivity(labId, limit = 10) {
        const result = await this.pool.query(
            `SELECT al.*, u.name as user_name FROM activity_log al
             LEFT JOIN users u ON al.user_id = u.id
             LEFT JOIN labs l ON u.lab_id = l.id
             WHERE l.id = $1
             ORDER BY al.created_at DESC LIMIT $2`,
            [labId, limit]
        );
        return result.rows;
    }

    // ============================================================
    // DASHBOARD STATS METHODS
    // ============================================================

    async getDashboardStats(labId) {
        const result = await this.pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM orders WHERE lab_id = $1) as total_orders,
                (SELECT COUNT(*) FROM orders WHERE lab_id = $1 AND status IN ('draft', 'specimen_collected', 'in_analysis')) as pending_orders,
                (SELECT COUNT(*) FROM order_tests ot INNER JOIN orders o ON ot.order_id = o.id WHERE o.lab_id = $1 AND ot.status IN ('completed', 'verified', 'published')) as completed_tests,
                (SELECT COUNT(*) FROM patients WHERE lab_id = $1) as total_patients,
                (SELECT COUNT(*) FROM orders WHERE lab_id = $1 AND paid = false AND status != 'draft') as unpaid_orders,
                (SELECT COUNT(*) FROM orders WHERE lab_id = $1 AND status = 'published') as published_results
        `, [labId]);
        return result.rows[0];
    }

    // ============================================================
    // UTILITY METHODS
    // ============================================================

    async query(text, params) {
        return this.pool.query(text, params);
    }

    async end() {
        await this.pool.end();
    }
}

module.exports = Database;
