import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { SEED_USERS, SEED_CATEGORIES, SEED_PRODUCTS, SEED_INGREDIENTS, SEED_RECIPES } from '../seedData.js';

const bool = (v) => (v ? 1 : 0);

export const store = {
  // ---------- Auth ----------
  async findUserByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(email.toLowerCase().trim());
  },
  async findUserById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },
  hashPassword: (pw) => bcrypt.hashSync(pw, 10),
  verifyPassword: (pw, hash) => bcrypt.compareSync(pw, hash),

  // ---------- Categorías ----------
  async listCategories() {
    return db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all();
  },
  async createCategory({ name, sort_order = 0 }) {
    const info = db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)').run(name, sort_order);
    return { id: info.lastInsertRowid, name, sort_order };
  },
  async updateCategory(id, { name, sort_order }) {
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!cat) return null;
    db.prepare('UPDATE categories SET name = ?, sort_order = ? WHERE id = ?')
      .run(name ?? cat.name, sort_order ?? cat.sort_order, cat.id);
    return { ok: true };
  },
  async deleteCategory(id) {
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    return { ok: true };
  },

  // ---------- Productos ----------
  async listProducts({ category_id, available } = {}) {
    let sql = `
      SELECT p.*, c.name AS category_name
      FROM products p JOIN categories c ON c.id = p.category_id
      WHERE 1=1`;
    const params = [];
    if (category_id) { sql += ' AND p.category_id = ?'; params.push(category_id); }
    if (available !== undefined) { sql += ' AND p.available = ?'; params.push(bool(available)); }
    sql += ' ORDER BY c.sort_order, p.name';
    const products = db.prepare(sql).all(...params);
    const recipe = db.prepare(`
      SELECT pi.ingredient_id, i.name, i.unit, pi.quantity
      FROM product_ingredients pi JOIN ingredients i ON i.id = pi.ingredient_id
      WHERE pi.product_id = ?`);
    return products.map(p => ({ ...p, ingredients: recipe.all(p.id) }));
  },
  async createProduct({ category_id, name, description = '', price, available = 1, image_url = '', ingredients = [] }) {
    const tx = db.transaction(() => {
      const info = db.prepare(
        'INSERT INTO products (category_id, name, description, price, available, image_url) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(category_id, name, description, price, bool(available), image_url);
      const pid = info.lastInsertRowid;
      const ins = db.prepare('INSERT INTO product_ingredients (product_id, ingredient_id, quantity) VALUES (?, ?, ?)');
      for (const ing of ingredients) ins.run(pid, ing.ingredient_id, ing.quantity);
      return pid;
    });
    return { id: tx() };
  },
  async updateProduct(id, { category_id, name, description, price, available, image_url, ingredients }) {
    const p = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!p) return null;
    db.prepare(`UPDATE products SET category_id=?, name=?, description=?, price=?, available=?, image_url=? WHERE id=?`)
      .run(category_id ?? p.category_id, name ?? p.name, description ?? p.description,
           price ?? p.price, available === undefined ? p.available : bool(available),
           image_url ?? p.image_url, p.id);
    if (Array.isArray(ingredients)) {
      db.prepare('DELETE FROM product_ingredients WHERE product_id = ?').run(p.id);
      const ins = db.prepare('INSERT INTO product_ingredients (product_id, ingredient_id, quantity) VALUES (?, ?, ?)');
      for (const ing of ingredients) ins.run(p.id, ing.ingredient_id, ing.quantity);
    }
    return { ok: true };
  },
  async deleteProduct(id) {
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    return { ok: true };
  },

  // ---------- Pedidos ----------
  async createOrder({ customer_name = '', table_number = '', payment_method = '', items, userId }) {
    const total = items.reduce((s, i) => s + i.subtotal, 0);
    const maxNum = db.prepare('SELECT COALESCE(MAX(order_number), 0) + 1 AS n FROM orders').get().n;
    const tx = db.transaction(() => {
      const info = db.prepare(`
        INSERT INTO orders (order_number, status, customer_name, table_number, payment_method, total, created_by)
        VALUES (?, 'pendiente', ?, ?, ?, ?, ?)
      `).run(maxNum, customer_name, table_number, payment_method, total, userId);
      const orderId = info.lastInsertRowid;
      const ins = db.prepare(`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const i of items) ins.run(orderId, i.product.id, i.product.name, i.quantity, i.unit_price, i.subtotal);
      return orderId;
    });
    return this.getOrder(tx());
  },
  async listOrders({ status } = {}) {
    let sql = `
      SELECT o.*, u.name AS created_by_name,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
      FROM orders o LEFT JOIN users u ON u.id = o.created_by`;
    const params = [];
    if (status) { sql += ' WHERE o.status = ?'; params.push(status); }
    sql += ' ORDER BY o.created_at DESC LIMIT 200';
    return db.prepare(sql).all(...params);
  },
  async getOrder(id) {
    const order = db.prepare(`
      SELECT o.*, u.name AS created_by_name
      FROM orders o LEFT JOIN users u ON u.id = o.created_by WHERE o.id = ?
    `).get(id);
    if (!order) return null;
    order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
    return order;
  },
  async getOrderRaw(id) {
    return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  },
  async setOrderStatus(id, status) {
    db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
    return this.getOrder(id);
  },
  async deductStock(orderId) {
    const items = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(orderId);
    const recipe = db.prepare('SELECT ingredient_id, quantity FROM product_ingredients WHERE product_id = ?');
    const deduct = db.prepare('UPDATE ingredients SET stock = stock - ? WHERE id = ?');
    const move = db.prepare(
      `INSERT INTO inventory_movements (ingredient_id, type, quantity, reason)
       VALUES (?, 'salida', ?, ?)`
    );
    const tx = db.transaction(() => {
      for (const item of items) {
        if (!item.product_id) continue;
        for (const r of recipe.all(item.product_id)) {
          const qty = r.quantity * item.quantity;
          deduct.run(qty, r.ingredient_id);
          move.run(r.ingredient_id, qty, `Pedido #${orderId}`);
        }
      }
    });
    tx();
  },
  async salesReport({ from, to } = {}) {
    let sql = `
      SELECT date(created_at) AS day, COUNT(*) AS orders,
        SUM(CASE WHEN status != 'cancelado' THEN total ELSE 0 END) AS revenue
      FROM orders WHERE 1=1`;
    const params = [];
    if (from) { sql += " AND date(created_at) >= date(?)"; params.push(from); }
    if (to) { sql += " AND date(created_at) <= date(?)"; params.push(to); }
    sql += ' GROUP BY day ORDER BY day DESC';
    return db.prepare(sql).all(...params);
  },

  // ---------- Inventario ----------
  async listIngredients() {
    const rows = db.prepare('SELECT * FROM ingredients ORDER BY name').all();
    const usedIn = db.prepare(`
      SELECT p.name FROM product_ingredients pi
      JOIN products p ON p.id = pi.product_id
      WHERE pi.ingredient_id = ? LIMIT 5
    `);
    return rows.map(i => ({
      ...i,
      low_stock: i.stock <= i.min_stock,
      used_in: usedIn.all(i.id).map(r => r.name),
    }));
  },
  async createIngredient({ name, unit = 'unidad', stock = 0, min_stock = 0 }) {
    const info = db.prepare('INSERT INTO ingredients (name, unit, stock, min_stock) VALUES (?, ?, ?, ?)')
      .run(name, unit, stock, min_stock);
    return { id: info.lastInsertRowid };
  },
  async updateIngredient(id, { name, unit, min_stock }) {
    const ing = db.prepare('SELECT * FROM ingredients WHERE id = ?').get(id);
    if (!ing) return null;
    db.prepare('UPDATE ingredients SET name = ?, unit = ?, min_stock = ? WHERE id = ?')
      .run(name ?? ing.name, unit ?? ing.unit, min_stock ?? ing.min_stock, ing.id);
    return { ok: true };
  },
  async addMovement(id, { type, quantity, reason = '' }) {
    const ing = db.prepare('SELECT * FROM ingredients WHERE id = ?').get(id);
    if (!ing) return null;
    const qty = parseFloat(quantity);
    const tx = db.transaction(() => {
      if (type === 'ajuste') {
        db.prepare('UPDATE ingredients SET stock = ? WHERE id = ?').run(qty, id);
        db.prepare(`INSERT INTO inventory_movements (ingredient_id, type, quantity, reason) VALUES (?, 'ajuste', ?, ?)`)
          .run(id, qty, reason || 'Ajuste manual');
      } else {
        const delta = type === 'entrada' ? qty : -qty;
        db.prepare('UPDATE ingredients SET stock = stock + ? WHERE id = ?').run(delta, id);
        db.prepare(`INSERT INTO inventory_movements (ingredient_id, type, quantity, reason) VALUES (?, ?, ?, ?)`)
          .run(id, type, qty, reason);
      }
    });
    tx();
    return db.prepare('SELECT * FROM ingredients WHERE id = ?').get(id);
  },
  async listMovements() {
    return db.prepare(`
      SELECT m.*, i.name AS ingredient_name, i.unit
      FROM inventory_movements m JOIN ingredients i ON i.id = m.ingredient_id
      ORDER BY m.created_at DESC LIMIT 200
    `).all();
  },

  // ---------- Usuarios ----------
  async listUsers() {
    return db.prepare('SELECT id, name, email, role, active, created_at FROM users ORDER BY name').all();
  },
  async createUser({ name, email, password, role }) {
    const info = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
      .run(name, email.toLowerCase().trim(), bcrypt.hashSync(password, 10), role);
    return { id: info.lastInsertRowid };
  },
  async updateUser(id, { name, email, role, active, password }) {
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!u) return null;
    db.prepare('UPDATE users SET name=?, email=?, role=?, active=? WHERE id=?')
      .run(name ?? u.name, (email ?? u.email).toLowerCase().trim(), role ?? u.role,
           active === undefined ? u.active : bool(active), u.id);
    if (password) {
      db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(password, 10), u.id);
    }
    return { ok: true };
  },

  // ---------- Seed ----------
  async seed() {
    const insUser = db.prepare('INSERT OR IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');
    for (const u of SEED_USERS) insUser.run(u.name, u.email, bcrypt.hashSync(u.password, 10), u.role);

    const insCat = db.prepare('INSERT OR IGNORE INTO categories (name, sort_order) VALUES (?, ?)');
    for (const c of SEED_CATEGORIES) insCat.run(c.name, c.sort_order);

    const catId = (name) => db.prepare('SELECT id FROM categories WHERE name = ?').get(name)?.id;
    const insProd = db.prepare(
      `INSERT OR IGNORE INTO products (category_id, name, description, price, available)
       VALUES (?, ?, ?, ?, ?)`
    );
    const existing = new Set(db.prepare('SELECT name FROM products').all().map(r => r.name));
    for (const [cat, name, desc, price, avail] of SEED_PRODUCTS) {
      if (!existing.has(name)) insProd.run(catId(cat), name, desc, price, avail);
    }

    const insIng = db.prepare('INSERT OR IGNORE INTO ingredients (name, unit, stock, min_stock) VALUES (?, ?, ?, ?)');
    for (const [name, unit, stock, min] of SEED_INGREDIENTS) insIng.run(name, unit, stock, min);

    const pid = (name) => db.prepare('SELECT id FROM products WHERE name = ?').get(name)?.id;
    const iid = (name) => db.prepare('SELECT id FROM ingredients WHERE name = ?').get(name)?.id;
    const insRec = db.prepare(
      `INSERT OR IGNORE INTO product_ingredients (product_id, ingredient_id, quantity) VALUES (?, ?, ?)`
    );
    for (const [p, i, q] of SEED_RECIPES) {
      const pId = pid(p), iId = iid(i);
      if (pId && iId) insRec.run(pId, iId, q);
    }
  },
};
