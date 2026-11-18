import { Router } from 'express';
import { store } from '../store/index.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { ah } from '../middleware/asyncHandler.js';

const router = Router();
router.use(authRequired, requireRole('admin'));

router.get('/', ah(async (req, res) => {
  res.json(await store.listUsers());
}));

router.post('/', ah(async (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password || !['admin', 'cajero', 'cocina'].includes(role)) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }
  try {
    res.status(201).json(await store.createUser({ name, email, password, role }));
  } catch (e) {
    res.status(e.message.includes('registrado') ? 409 : 500).json({ error: e.message });
  }
}));

router.put('/:id', ah(async (req, res) => {
  const result = await store.updateUser(req.params.id, req.body || {});
  if (!result) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(result);
}));

export default router;
