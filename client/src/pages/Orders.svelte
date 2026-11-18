<script>
  import { api, money, fmtDate } from '../lib/api.js';
  import { auth } from '../lib/auth.svelte.js';

  let orders = $state([]);
  let filter = $state('');
  let selected = $state(null);
  let error = $state('');

  const NEXT = { pendiente: 'preparando', preparando: 'listo', listo: 'entregado' };
  const NEXT_LABEL = { pendiente: 'Iniciar', preparando: 'Marcar listo', listo: 'Entregar' };

  async function load() {
    orders = await api('/orders' + (filter ? `?status=${filter}` : ''));
  }
  $effect(() => { filter; load(); });

  async function open(id) {
    selected = await api(`/orders/${id}`);
    error = '';
  }

  async function setStatus(id, status) {
    try {
      await api(`/orders/${id}/status`, { method: 'PATCH', body: { status } });
      await load();
      if (selected?.id === id) selected = await api(`/orders/${id}`);
    } catch (e) {
      error = e.message;
    }
  }
</script>

<h2>Pedidos</h2>
{#if error}<p class="error">{error}</p>{/if}
<div class="row" style="margin-bottom:16px">
  <select bind:value={filter} style="width:auto">
    <option value="">Todos</option>
    <option value="pendiente">Pendientes</option>
    <option value="preparando">Preparando</option>
    <option value="listo">Listos</option>
    <option value="entregado">Entregados</option>
    <option value="cancelado">Cancelados</option>
  </select>
</div>

<div class="orders-grid">
  <div class="card" style="padding:0;overflow:hidden">
    <table>
      <thead><tr><th>#</th><th>Cliente</th><th>Items</th><th>Total</th><th>Estado</th><th>Hora</th></tr></thead>
      <tbody>
        {#each orders as o}
          <tr class="clickable" class:sel={selected?.id === o.id} on:click={() => open(o.id)}>
            <td>{o.order_number}</td>
            <td>{o.customer_name || o.table_number || '—'}</td>
            <td>{o.item_count}</td>
            <td>{money(o.total)}</td>
            <td><span class="badge {o.status}">{o.status}</span></td>
            <td class="muted">{fmtDate(o.created_at)}</td>
          </tr>
        {/each}
        {#if orders.length === 0}<tr><td colspan="6" class="muted">Sin pedidos</td></tr>{/if}
      </tbody>
    </table>
  </div>

  {#if selected}
    <div class="card">
      <div class="row spread">
        <h3 style="margin:0">Pedido #{selected.order_number}</h3>
        <span class="badge {selected.status}">{selected.status}</span>
      </div>
      <p class="muted">
        {selected.customer_name || 'Sin cliente'}{selected.table_number ? ` · Mesa ${selected.table_number}` : ''}
        · {fmtDate(selected.created_at)} · {selected.created_by_name || ''}
        {#if selected.payment_method}· Pago: {selected.payment_method}{/if}
      </p>
      <table>
        <thead><tr><th>Producto</th><th>Cant.</th><th>P. Unit.</th><th>Subtotal</th></tr></thead>
        <tbody>
          {#each selected.items as i}
            <tr><td>{i.product_name}</td><td>{i.quantity}</td><td>{money(i.unit_price)}</td><td>{money(i.subtotal)}</td></tr>
          {/each}
        </tbody>
      </table>
      <div class="row spread" style="margin-top:10px"><strong>Total</strong><strong>{money(selected.total)}</strong></div>
      {#if !['entregado','cancelado'].includes(selected.status)}
        <div class="row" style="margin-top:16px">
          {#if NEXT[selected.status]}
            <button class="primary" on:click={() => setStatus(selected.id, NEXT[selected.status])}>
              {NEXT_LABEL[selected.status]}
            </button>
          {/if}
          {#if auth.user?.role !== 'cocina' || selected.status === 'preparando'}
            <button class="danger" on:click={() => setStatus(selected.id, 'cancelado')}>Cancelar</button>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .orders-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 20px; align-items: start; }
  tr.clickable { cursor: pointer; }
  tr.sel { background: var(--panel2); }
  @media (max-width: 900px) { .orders-grid { grid-template-columns: 1fr; } }
</style>
