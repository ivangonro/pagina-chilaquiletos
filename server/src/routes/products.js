import { Router } from 'express';
import { store } from '../store/index.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { ah } from '../middleware/asyncHandler.js';

const router = Router();
router.use(authRequired);

// Categorías
router.get('/categories', ah(async (req, res) => {
  res.json(await store.listCategories());
}));

router.post('/categories', requireRole('admin'), ah(async (req, res) => {
  const { name, sort_order = 0 } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  res.status(201).json(await store.createCategory({ name, sort_order }));
}));

router.put('/categories/:id', requireRole('admin'), ah(async (req, res) => {
  const { name, sort_order } = req.body || {};
  const result = await store.updateCategory(req.params.id, { name, sort_order });
  if (!result) return res.status(404).json({ error: 'Categoría no encontrada' });
  res.json(result);
}));

router.delete('/categories/:id', requireRole('admin'), ah(async (req, res) => {
  res.json(await store.deleteCategory(req.params.id));
}));

// Productos (montado en /api/products)
router.get('/', ah(async (req, res) => {
  const { category_id, available } = req.query;
  res.json(await store.listProducts({
    category_id: category_id ? Number(category_id) : undefined,
    available: available === undefined ? undefined : available === 'true',
  }));
}));

router.post('/', requireRole('admin'), ah(async (req, res) => {
  const { category_id, name, description = '', price, available = 1, image_url = '', ingredients = [] } = req.body || {};
  if (!category_id || !name || price == null) {
    return res.status(400).json({ error: 'category_id, name y price son requeridos' });
  }
  res.status(201).json(await store.createProduct({ category_id, name, description, price, available, image_url, ingredients }));
}));

router.put('/:id', requireRole('admin'), ah(async (req, res) => {
  const result = await store.updateProduct(req.params.id, req.body || {});
  if (!result) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(result);
}));

router.delete('/:id', requireRole('admin'), ah(async (req, res) => {
  res.json(await store.deleteProduct(req.params.id));
}));

export default router;
