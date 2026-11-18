<script>
  import { onMount } from 'svelte';
  import { path, navigate } from './lib/router.js';
  import { auth, loadMe, logout } from './lib/auth.svelte.js';
  import Login from './pages/Login.svelte';
  import Dashboard from './pages/Dashboard.svelte';
  import POS from './pages/POS.svelte';
  import Orders from './pages/Orders.svelte';
  import Inventory from './pages/Inventory.svelte';
  import MenuAdmin from './pages/MenuAdmin.svelte';
  import Users from './pages/Users.svelte';

  const links = [
    { path: '/', label: 'Inicio', roles: ['admin', 'cajero', 'cocina'] },
    { path: '/pos', label: 'Punto de Venta', roles: ['admin', 'cajero'] },
    { path: '/pedidos', label: 'Pedidos', roles: ['admin', 'cajero', 'cocina'] },
    { path: '/menu', label: 'Menú', roles: ['admin'] },
    { path: '/inventario', label: 'Inventario', roles: ['admin'] },
    { path: '/usuarios', label: 'Usuarios', roles: ['admin'] },
  ];

  const pages = { '/': Dashboard, '/pos': POS, '/pedidos': Orders, '/menu': MenuAdmin, '/inventario': Inventory, '/usuarios': Users };

  onMount(loadMe);

  let visibleLinks = $derived(links.filter(l => auth.user && l.roles.includes(auth.user.role)));
  let current = $derived($path);
  let Page = $derived(pages[current] || Dashboard);

  $effect(() => {
    if (auth.ready && !auth.user && current !== '/login') navigate('/login');
    if (auth.ready && auth.user && current === '/login') navigate('/');
  });

  function allowed(p) {
    const link = links.find(l => l.path === p);
    return !link || (auth.user && link.roles.includes(auth.user.role));
  }
</script>

{#if !auth.ready}
  <div style="padding:40px;text-align:center" class="muted">Cargando…</div>
{:else if !auth.user}
  <Login />
{:else if current === '/login'}
  <div style="padding:40px;text-align:center" class="muted">Redirigiendo…</div>
{:else if !allowed(current)}
  <div style="padding:40px" class="card"><p class="error">No tienes permisos para ver esta sección.</p></div>
{:else}
  <div class="layout">
    <aside>
      <h1>CHILAQUILETO</h1>
      <nav>
        {#each visibleLinks as l}
          <a href={'#' + l.path} class:active={current === l.path} on:click|preventDefault={() => navigate(l.path)}>{l.label}</a>
        {/each}
      </nav>
      <div class="userbox">
        <div>{auth.user.name}</div>
        <div class="muted">{auth.user.role}</div>
        <button class="small" on:click={() => { logout(); navigate('/login'); }}>Salir</button>
      </div>
    </aside>
    <main>
      <Page />
    </main>
  </div>
{/if}

<style>
  .layout { display: flex; min-height: 100vh; }
  aside {
    width: 220px; background: var(--panel); border-right: 1px solid var(--border);
    padding: 20px 14px; display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh;
  }
  aside h1 { font-size: 1.1rem; color: var(--accent2); margin: 0 0 20px; letter-spacing: 0.08em; }
  nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
  nav a { padding: 10px 12px; border-radius: 8px; color: var(--muted); }
  nav a.active, nav a:hover { background: var(--panel2); color: var(--text); }
  .userbox { border-top: 1px solid var(--border); padding-top: 14px; font-size: 0.9rem; }
  .userbox .muted { text-transform: uppercase; font-size: 0.75rem; }
  main { flex: 1; padding: 28px; max-width: 1200px; }
  h2 { margin-top: 0; }
</style>
