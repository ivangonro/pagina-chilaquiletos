import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { SEED_USERS, SEED_CATEGORIES, SEED_PRODUCTS, SEED_INGREDIENTS, SEED_RECIPES } from '../seedData.js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error('SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos');
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const num = (v) => Number(v ?? 0);
const bool = (v) => Boolean(v);

async function must(res, msg = 'Error de base de datos') {
  if (res.error) throw new Error(`${msg}: ${res.error.message}`);
  return res.data;
}

// helpers de normalización
function normProduct(p) {
  if (!p) return null;
  return {
    ...p,
    price: num(p.price),
    available: bool(p.available),
    category_name: p.categories?.name ?? null,
    ingredients: (p.product_ingredients || []).map(pi => ({
      ingredient_id: pi.ingredient_id,
      name: pi.ingredients?.name,
      unit: pi.ingredients?.unit,
      quantity: num(pi.quantity),
    })),
  };
}

function normOrder(o) {
  if (!o) return null;
  return {
    ...o,
    total: num(o.total),
    created_by_name: o.users?.name ?? o.created_by_name ?? null,
    item_count: Array.isArray(o.order_items)
      ? (o.order_items[0]?.count ?? o.order_items.length)
      : o.item_count,
    items: o.order_items?.map ? o.order_items.map(i => ({ ...i, unit_price: num(i.unit_price), subtotal: num(i.subtotal) })) : undefined,
  };
}

export const store = {
  // ---------- Auth ----------
  async findUserByEmail(email) {
    const { data } = await supabase
      .from('users').select('*')
      .eq('email', email.toLowerCase().trim()).eq('active', true).maybeSingle();
    return data;
  },
  async findUserById(id) {
    const { data } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
    return data;
  },
  hashPassword: (pw) => bcrypt.hashSync(pw, 10),
  verifyPassword: (pw, hash) => bcrypt.compareSync(pw, hash),

  // ---------- Categorías ----------
  async listCategories() {
    return must(await supabase.from('categories').select('*').order('sort_order').order('name'));
  },
  async createCategory({ name, sort_order = 0 }) {
    const { data } = await supabase.from('categories').insert({ name, sort_order }).select().single();
    return must(Promise.resolve({ data, error: null }));
  },
  async updateCategory(id, { name, sort_order }) {
    const patch = {};
    if (name !== undefined) patch.name = name;
    if (sort_order !== undefined) patch.sort_order = sort_order;
    await must(await supabase.from('categories').update(patch).eq('id', id));
    return { ok: true };
  },
  async deleteCategory(id) {
    await must(await supabase.from('categories').delete().eq('id', id));
    return { ok: true };
  },

  // ---------- Productos ----------
  async listProducts({ category_id, available } = {}) {
    let q = supabase.from('products')
      .select(`*, categories(name), product_ingredients(quantity, ingredient_id, ingredients(name, unit))`)
      .order('name');
    if (category_id) q = q.eq('category_id', category_id);
    if (available !== undefined) q = q.eq('available', bool(available));
    const rows = await must(await q);
    // orden por categoría
    const cats = await this.listCategories();
    const order = Object.fromEntries(cats.map((c, i) => [c.id, c.sort_order ?? i]));
    return rows.map(normProduct).sort((a, b) => (order[a.category_id] ?? 99) - (order[b.category_id] ?? 99) || a.name.localeCompare(b.name));
  },
  async createProduct({ category_id, name, description = '', price, available = 1, image_url = '', ingredients = [] }) {
    const { data: p, error } = await supabase.from('products').insert({
      category_id, name, description, price: num(price), available: bool(available), image_url,
    }).select('id').single();
    if (error) throw new Error(error.message);
    if (ingredients.length) {
      await must(await supabase.from('product_ingredients').insert(
        ingredients.map(i => ({ product_id: p.id, ingredient_id: i.ingredient_id, quantity: num(i.quantity) }))
      ));
    }
    return { id: p.id };
  },
  async updateProduct(id, { category_id, name, description, price, available, image_url, ingredients }) {
    const patch = {};
    if (category_id !== undefined) patch.category_id = category_id;
    if (name !== undefined) patch.name = name;
    if (description !== undefined) patch.description = description;
    if (price !== undefined) patch.price = num(price);
    if (available !== undefined) patch.available = bool(available);
    if (image_url !== undefined) patch.image_url = image_url;
    await must(await supabase.from('products').update(patch).eq('id', id));
    if (Array.isArray(ingredients)) {
      await must(await supabase.from('product_ingredients').delete().eq('product_id', id));
      if (ingredients.length) {
        await must(await supabase.from('product_ingredients').insert(
          ingredients.map(i => ({ product_id: id, ingredient_id: i.ingredient_id, quantity: num(i.quantity) }))
        ));
      }
    }
    return { ok: true };
  },
  async deleteProduct(id) {
    await must(await supabase.from('products').delete().eq('id', id));
    return { ok: true };
  },

  // ---------- Pedidos ----------
  async createOrder({ customer_name = '', table_number = '', payment_method = '', items, userId }) {
    const { data: maxRow } = await supabase
      .from('orders').select('order_number').order('order_number', { ascending: false }).limit(1).maybeSingle();
    const order_number = (maxRow?.order_number ?? 0) + 1;
    const total = items.reduce((s, i) => s + i.subtotal, 0);
    const { data: o, error } = await supabase.from('orders').insert({
      order_number, status: 'pendiente', customer_name, table_number,
      payment_method, total, created_by: userId,
    }).select('id').single();
    if (error) throw new Error(error.message);
    await must(await supabase.from('order_items').insert(
      items.map(i => ({
        order_id: o.id, product_id: i.product.id, product_name: i.product.name,
        quantity: i.quantity, unit_price: i.unit_price, subtotal: i.subtotal,
      }))
    ));
    return this.getOrder(o.id);
  },
  async listOrders({ status } = {}) {
    let q = supabase.from('orders')
      .select(`*, users(name), order_items(count)`)
      .order('created_at', { ascending: false }).limit(200);
    if (status) q = q.eq('status', status);
    const rows = await must(await q);
    return rows.map(o => ({
      ...o,
      total: num(o.total),
      created_by_name: o.users?.name ?? null,
      item_count: o.order_items?.[0]?.count ?? 0,
    }));
  },
  async getOrder(id) {
    const { data: o } = await supabase.from('orders')
      .select(`*, users(name), order_items(*)`).eq('id', id).maybeSingle();
    if (!o) return null;
    return {
      ...o,
      total: num(o.total),
      created_by_name: o.users?.name ?? null,
      items: (o.order_items || []).map(i => ({ ...i, unit_price: num(i.unit_price), subtotal: num(i.subtotal) })),
    };
  },
  async getOrderRaw(id) {
    const { data } = await supabase.from('orders').select('*').eq('id', id).maybeSingle();
    return data;
  },
  async setOrderStatus(id, status) {
    await must(await supabase.from('orders')
      .update({ status, updated_at: new Date().toISOString() }).eq('id', id));
    return this.getOrder(id);
  },
  async deductStock(orderId) {
    const { data: items } = await supabase
      .from('order_items').select('product_id, quantity').eq('order_id', orderId);
    const needs = new Map(); // ingredient_id -> qty total
    for (const item of items || []) {
      if (!item.product_id) continue;
      const { data: recipe } = await supabase
        .from('product_ingredients').select('ingredient_id, quantity').eq('product_id', item.product_id);
      for (const r of recipe || []) {
        needs.set(r.ingredient_id, (needs.get(r.ingredient_id) ?? 0) + num(r.quantity) * item.quantity);
      }
    }
    for (const [ingId, qty] of needs) {
      const { data: ing } = await supabase.from('ingredients').select('stock').eq('id', ingId).single();
      if (!ing) continue;
      await must(await supabase.from('ingredients')
        .update({ stock: num(ing.stock) - qty }).eq('id', ingId));
      await must(await supabase.from('inventory_movements').insert({
        ingredient_id: ingId, type: 'salida', quantity: qty, reason: `Pedido #${orderId}`,
      }));
    }
  },
  async salesReport({ from, to } = {}) {
    let q = supabase.from('orders').select('created_at, status, total');
    if (from) q = q.gte('created_at', `${from}T00:00:00`);
    if (to) q = q.lte('created_at', `${to}T23:59:59`);
    const rows = await must(await q);
    const days = new Map();
    for (const r of rows || []) {
      const day = String(r.created_at).slice(0, 10);
      const e = days.get(day) || { day, orders: 0, revenue: 0 };
      e.orders += 1;
      if (r.status !== 'cancelado') e.revenue += num(r.total);
      days.set(day, e);
    }
    return [...days.values()].sort((a, b) => b.day.localeCompare(a.day));
  },

  // ---------- Inventario ----------
  async listIngredients() {
    const ings = await must(await supabase.from('ingredients').select('*').order('name'));
    const { data: pis } = await supabase
      .from('product_ingredients').select('ingredient_id, products(name)');
    const usedMap = new Map();
    for (const pi of pis || []) {
      const arr = usedMap.get(pi.ingredient_id) || [];
      if (arr.length < 5 && pi.products?.name) arr.push(pi.products.name);
      usedMap.set(pi.ingredient_id, arr);
    }
    return (ings || []).map(i => ({
      ...i,
      stock: num(i.stock), min_stock: num(i.min_stock),
      low_stock: num(i.stock) <= num(i.min_stock),
      used_in: usedMap.get(i.id) || [],
    }));
  },
  async createIngredient({ name, unit = 'unidad', stock = 0, min_stock = 0 }) {
    const { data, error } = await supabase.from('ingredients')
      .insert({ name, unit, stock: num(stock), min_stock: num(min_stock) }).select('id').single();
    if (error) throw new Error(error.message);
    return { id: data.id };
  },
  async updateIngredient(id, { name, unit, min_stock }) {
    const patch = {};
    if (name !== undefined) patch.name = name;
    if (unit !== undefined) patch.unit = unit;
    if (min_stock !== undefined) patch.min_stock = num(min_stock);
    await must(await supabase.from('ingredients').update(patch).eq('id', id));
    return { ok: true };
  },
  async addMovement(id, { type, quantity, reason = '' }) {
    const qty = parseFloat(quantity);
    const { data: ing } = await supabase.from('ingredients').select('stock').eq('id', id).single();
    if (!ing) return null;
    const newStock = type === 'ajuste' ? qty : num(ing.stock) + (type === 'entrada' ? qty : -qty);
    await must(await supabase.from('ingredients').update({ stock: newStock }).eq('id', id));
    await must(await supabase.from('inventory_movements').insert({
      ingredient_id: id, type, quantity: qty, reason: reason || (type === 'ajuste' ? 'Ajuste manual' : ''),
    }));
    const { data } = await supabase.from('ingredients').select('*').eq('id', id).single();
    return data;
  },
  async listMovements() {
    const { data } = await supabase.from('inventory_movements')
      .select('*, ingredients(name, unit)').order('created_at', { ascending: false }).limit(200);
    return (data || []).map(m => ({
      ...m,
      quantity: num(m.quantity),
      ingredient_name: m.ingredients?.name,
      unit: m.ingredients?.unit,
    }));
  },

  // ---------- Usuarios ----------
  async listUsers() {
    const { data } = await supabase.from('users')
      .select('id, name, email, role, active, created_at').order('name');
    return data || [];
  },
  async createUser({ name, email, password, role }) {
    const { data, error } = await supabase.from('users')
      .insert({ name, email: email.toLowerCase().trim(), password_hash: bcrypt.hashSync(password, 10), role })
      .select('id').single();
    if (error) throw new Error(error.code === '23505' ? 'El email ya está registrado' : error.message);
    return { id: data.id };
  },
  async updateUser(id, { name, email, role, active, password }) {
    const patch = {};
    if (name !== undefined) patch.name = name;
    if (email !== undefined) patch.email = email.toLowerCase().trim();
    if (role !== undefined) patch.role = role;
    if (active !== undefined) patch.active = bool(active);
    if (password) patch.password_hash = bcrypt.hashSync(password, 10);
    await must(await supabase.from('users').update(patch).eq('id', id));
    return { ok: true };
  },

  // ---------- Seed ----------
  async seed() {
    for (const u of SEED_USERS) {
      await supabase.from('users').upsert(
        { name: u.name, email: u.email, password_hash: bcrypt.hashSync(u.password, 10), role: u.role },
        { onConflict: 'email' }
      );
    }
    for (const c of SEED_CATEGORIES) {
      await supabase.from('categories').upsert(
        { name: c.name, sort_order: c.sort_order }, { onConflict: 'name' }
      );
    }
    const { data: cats } = await supabase.from('categories').select('id, name');
    const catMap = Object.fromEntries((cats || []).map(c => [c.name, c.id]));
    const { data: existingProducts } = await supabase.from('products').select('id, name');
    const prodIds = {};
    for (const p of existingProducts || []) prodIds[p.name] = p.id;
    for (const [cat, name, desc, price, avail] of SEED_PRODUCTS) {
      if (prodIds[name]) continue;
      const { data } = await supabase.from('products').insert({
        category_id: catMap[cat], name, description: desc, price, available: !!avail,
      }).select('id').single();
      if (data) prodIds[name] = data.id;
    }
    for (const [name, unit, stock, min] of SEED_INGREDIENTS) {
      await supabase.from('ingredients').upsert(
        { name, unit, stock, min_stock: min }, { onConflict: 'name' }
      );
    }
    const { data: ings } = await supabase.from('ingredients').select('id, name');
    const ingMap = Object.fromEntries((ings || []).map(i => [i.name, i.id]));
    const { data: existingPi } = await supabase.from('product_ingredients').select('product_id, ingredient_id');
    const piSet = new Set((existingPi || []).map(r => `${r.product_id}:${r.ingredient_id}`));
    const rows = [];
    for (const [p, i, q] of SEED_RECIPES) {
      const pid = prodIds[p], iid = ingMap[i];
      if (pid && iid && !piSet.has(`${pid}:${iid}`)) {
        rows.push({ product_id: pid, ingredient_id: iid, quantity: q });
      }
    }
    if (rows.length) await supabase.from('product_ingredients').insert(rows);
  },
};
