import { Router } from 'express';
import { store } from '../store/index.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { ah } from '../middleware/asyncHandler.js';

const router = Router();
router.use(authRequired);

const VALID_TRANSITIONS = ['pendiente', 'preparando', 'listo', 'entregado', 'cancelado'];

// Crear pedido (cajero/admin)
router.post('/', requireRole('admin', 'cajero'), ah(async (req, res) => {
  const { customer_name = '', table_number = '', payment_method = '', items = [] } = req.body || {};
  if (!items.length) return res.status(400).json({ error: 'El pedido no tiene items' });

  const products = await store.listProducts();
  const byId = new Map(products.map(p => [p.id, p]));
  const validated = items.map(it => {
    const p = byId.get(Number(it.product_id));
    if (!p) throw Object.assign(new Error(`Producto ${it.product_id} no existe`), { status: 400 });
    if (!p.available) throw Object.assign(new Error(`"${p.name}" no está disponible`), { status: 400 });
    const qty = parseInt(it.quantity, 10);
    if (!qty || qty < 1) throw Object.assign(new Error('Cantidad inválida'), { status: 400 });
    return { product: p, quantity: qty, unit_price: p.price, subtotal: p.price * qty };
  });

  const order = await store.createOrder({
    customer_name, table_number, payment_method, items: validated, userId: req.user.id,
  });
  res.status(201).json(order);
}));

// Listar pedidos con filtros
router.get('/', ah(async (req, res) => {
  res.json(await store.listOrders({ status: req.query.status || undefined }));
}));

router.get('/:id', ah(async (req, res) => {
  const order = await store.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
  res.json(order);
}));

// Avanzar estado del pedido (cocina/admin/cajero)
router.patch('/:id/status', requireRole('admin', 'cajero', 'cocina'), ah(async (req, res) => {
  const order = await store.getOrderRaw(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
  const { status } = req.body || {};
  if (!VALID_TRANSITIONS.includes(status)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  if (['entregado', 'cancelado'].includes(order.status)) {
    return res.status(400).json({ error: 'El pedido ya está cerrado' });
  }
  if (status === 'entregado') {
    await store.setOrderStatus(order.id, status);
    await store.deductStock(order.id);
  } else {
    await store.setOrderStatus(order.id, status);
  }
  res.json(await store.getOrder(order.id));
}));

// Reporte de ventas
router.get('/reports/sales', requireRole('admin', 'cajero'), ah(async (req, res) => {
  res.json(await store.salesReport({ from: req.query.from, to: req.query.to }));
}));

export default router;
