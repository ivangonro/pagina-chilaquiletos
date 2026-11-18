<script>
  import { login } from '../lib/auth.svelte.js';
  import { navigate } from '../lib/router.js';

  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  async function submit(e) {
    e.preventDefault();
    error = '';
    loading = true;
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<div class="login-wrap">
  <form class="card" on:submit={submit}>
    <h1>CHILAQUILETO</h1>
    <p class="muted">Sistema de administración</p>
    {#if error}<p class="error">{error}</p>{/if}
    <label>Email</label>
    <input type="email" bind:value={email} required placeholder="admin@chilaquileto.com" />
    <label>Contraseña</label>
    <input type="password" bind:value={password} required />
    <button class="primary" type="submit" disabled={loading} style="width:100%;margin-top:16px">
      {loading ? 'Entrando…' : 'Entrar'}
    </button>
    <div class="muted demo">
      Demo: admin@chilaquileto.com / admin123 · cajero@chilaquileto.com / cajero123 · cocina@chilaquileto.com / cocina123
    </div>
  </form>
</div>

<style>
  .login-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
  form { width: 360px; }
  h1 { color: var(--accent2); margin: 0; }
  .demo { font-size: 0.75rem; margin-top: 18px; line-height: 1.5; }
</style>
