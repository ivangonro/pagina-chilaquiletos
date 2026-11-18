<script>
  import { onMount } from 'svelte';
  import { api, money, fmtDate } from '../lib/api.js';
  import { auth } from '../lib/auth.svelte.js';

  let stats = $state(null);
  let sales = $state([]);
  let activeOrders = $state([]);
  let lowStock = $state([]);

  onMount(async () => {
    const [orders, ingredients] = await Promise.all([
      api('/orders'),
      api('/inventory/ingredients').catch(() => []),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const todayOrders = orders.filter(o => o.created_at?.startsWith(today) && o.status !== 'cancelado');
    stats = {
      todayRevenue: todayOrders.reduce((s, o) => s + o.total, 0),
      todayOrders: todayOrders.length,
      pending: orders.filter(o => ['pendiente', 'preparando'].includes(o.status)).length,
    };
    activeOrders = orders.filter(o => !['entregado', 'cancelado'].includes(o.status)).slice(0, 6);
    sales = await api('/orders/reports/sales');
    lowStock = ingredients.filter(i => i.low_stock);
  });
</script>

<h2>Inicio</h2>
{#if stats}
  <div class="grid cols-4">
    <div class="card"><div class="muted">Ventas de hoy</div><div class="big">{money(stats.todayRevenue)}</div></div>
    <div class="card"><div class="muted">Pedidos hoy</div><div class="big">{stats.todayOrders}</div></div>
    <div class="card"><div class="muted">Pedidos activos</div><div class="big">{stats.pending}</div></div>
    <div class="card"><div class="muted">Stock bajo</div><div class="big">{lowStock.length}</div></div>
  </div>
{/if}

<div class="grid cols-2" style="margin-top:20px">
  <div class="card">
    <h3>Pedidos activos</h3>
    {#if activeOrders.length === 0}<p class="muted">No hay pedidos activos</p>{/if}
    {#each activeOrders as o}
      <div class="row spread" style="padding:8px 0;border-bottom:1px solid var(--border)">
        <div>
          <strong>#{o.order_number}</strong> {o.customer_name || o.table_number || ''}
          <div class="muted" style="font-size:0.8rem">{fmtDate(o.created_at)} · {o.created_by_name || ''}</div>
        </div>
        <div class="row">
          <span class="badge {o.status}">{o.status}</span>
          <span>{money(o.total)}</span>
        </div>
      </div>
    {/each}
  </div>

  <div class="card">
    <h3>Ventas por día</h3>
    <table>
      <thead><tr><th>Día</th><th>Pedidos</th><th>Ingresos</th></tr></thead>
      <tbody>
        {#each sales.slice(0, 10) as s}
          <tr><td>{s.day}</td><td>{s.orders}</td><td>{money(s.revenue)}</td></tr>
        {/each}
        {#if sales.length === 0}<tr><td colspan="3" class="muted">Sin ventas registradas</td></tr>{/if}
      </tbody>
    </table>
    {#if lowStock.length}
      <h3 style="margin-top:20px">Ingredientes con stock bajo</h3>
      {#each lowStock as i}
        <div class="row spread" style="padding:6px 0">
          <span>{i.name}</span>
          <span class="badge cancelado">{i.stock} {i.unit}</span>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .big { font-size: 1.8rem; font-weight: 700; color: var(--accent2); }
  h3 { margin-top: 0; }
</style>
