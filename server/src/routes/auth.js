import { Router } from 'express';
import { store } from '../store/index.js';
import { signToken, authRequired } from '../middleware/auth.js';
import { ah } from '../middleware/asyncHandler.js';

const router = Router();

router.post('/login', ah(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }
  const user = await store.findUserByEmail(email);
  if (!user || !store.verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
}));

router.get('/me', authRequired, ah(async (req, res) => {
  const user = await store.findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(publicUser(user));
}));

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

export default router;
