import { Router } from 'express';
import { store } from '../store/index.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { ah } from '../middleware/asyncHandler.js';

const router = Router();
router.use(authRequired);

router.get('/ingredients', ah(async (req, res) => {
  res.json(await store.listIngredients());
}));

router.post('/ingredients', requireRole('admin'), ah(async (req, res) => {
  const { name, unit = 'unidad', stock = 0, min_stock = 0 } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  res.status(201).json(await store.createIngredient({ name, unit, stock, min_stock }));
}));

router.put('/ingredients/:id', requireRole('admin'), ah(async (req, res) => {
  const result = await store.updateIngredient(req.params.id, req.body || {});
  if (!result) return res.status(404).json({ error: 'Ingrediente no encontrado' });
  res.json(result);
}));

// Entrada/salida/ajuste manual de stock
router.post('/ingredients/:id/movements', requireRole('admin'), ah(async (req, res) => {
  const { type, quantity, reason = '' } = req.body || {};
  const qty = parseFloat(quantity);
  if (!['entrada', 'salida', 'ajuste'].includes(type) || isNaN(qty) || qty < 0) {
    return res.status(400).json({ error: 'Movimiento inválido' });
  }
  const result = await store.addMovement(req.params.id, { type, quantity: qty, reason });
  if (!result) return res.status(404).json({ error: 'Ingrediente no encontrado' });
  res.json(result);
}));

router.get('/movements', requireRole('admin'), ah(async (req, res) => {
  res.json(await store.listMovements());
}));

export default router;
