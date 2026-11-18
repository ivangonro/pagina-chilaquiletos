<script>
  import { onMount } from 'svelte';
  import { api, money } from '../lib/api.js';
  import { navigate } from '../lib/router.js';

  let categories = $state([]);
  let products = $state([]);
  let cart = $state([]);
  let customer_name = $state('');
  let table_number = $state('');
  let payment_method = $state('efectivo');
  let error = $state('');
  let saving = $state(false);
  let selectedCat = $state(null);

  onMount(async () => {
    categories = await api('/products/categories');
    products = await api('/products?available=true');
    selectedCat = categories[0]?.id ?? null;
  });

  let filtered = $derived(selectedCat ? products.filter(p => p.category_id === selectedCat) : products);
  let total = $derived(cart.reduce((s, i) => s + i.subtotal, 0));

  function add(p) {
    const found = cart.find(i => i.product_id === p.id);
    if (found) { found.quantity++; found.subtotal = found.quantity * found.unit_price; }
    else cart.push({ product_id: p.id, name: p.name, unit_price: p.price, quantity: 1, subtotal: p.price });
    cart = cart;
  }

  function changeQty(id, delta) {
    const item = cart.find(i => i.product_id === id);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) cart = cart.filter(i => i.product_id !== id);
    else item.subtotal = item.quantity * item.unit_price;
    cart = cart;
  }

  async function submit() {
    error = '';
    if (!cart.length) { error = 'Agrega al menos un producto'; return; }
    saving = true;
    try {
      await api('/orders', {
        method: 'POST',
        body: {
          customer_name, table_number, payment_method,
          items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        },
      });
      cart = [];
      customer_name = ''; table_number = '';
      navigate('/pedidos');
    } catch (e) {
      error = e.message;
    } finally {
      saving = false;
    }
  }
</script>

<h2>Punto de Venta</h2>
<div class="pos">
  <div>
    <div class="row" style="margin-bottom:14px;flex-wrap:wrap">
      {#each categories as c}
        <button class:primary={selectedCat === c.id} class="small" on:click={() => selectedCat = c.id}>{c.name}</button>
      {/each}
    </div>
    <div class="grid cols-3">
      {#each filtered as p}
        <button class="prod" on:click={() => add(p)}>
          <div class="pname">{p.name}</div>
          <div class="pdesc muted">{p.description}</div>
          <div class="pprice">{money(p.price)}</div>
        </button>
      {/each}
      {#if filtered.length === 0}<p class="muted">No hay productos en esta categoría</p>{/if}
    </div>
  </div>

  <div class="card cart">
    <h3>Ticket</h3>
    {#if cart.length === 0}<p class="muted">Carrito vacío</p>{/if}
    {#each cart as item}
      <div class="row spread" style="padding:6px 0">
        <div>{item.name}</div>
        <div class="row">
          <button class="small" on:click={() => changeQty(item.product_id, -1)}>−</button>
          <span style="min-width:24px;text-align:center">{item.quantity}</span>
          <button class="small" on:click={() => changeQty(item.product_id, 1)}>+</button>
          <span style="min-width:64px;text-align:right">{money(item.subtotal)}</span>
        </div>
      </div>
    {/each}
    <hr style="border-color:var(--border)" />
    <div class="row spread"><strong>Total</strong><strong>{money(total)}</strong></div>
    <label>Cliente (opcional)</label>
    <input bind:value={customer_name} placeholder="Nombre" />
    <label>Mesa (opcional)</label>
    <input bind:value={table_number} placeholder="#1" />
    <label>Pago</label>
    <select bind:value={payment_method}>
      <option value="efectivo">Efectivo</option>
      <option value="tarjeta">Tarjeta</option>
      <option value="transferencia">Transferencia</option>
    </select>
    {#if error}<p class="error">{error}</p>{/if}
    <button class="primary" style="width:100%;margin-top:14px" on:click={submit} disabled={saving}>
      {saving ? 'Guardando…' : 'Crear pedido'}
    </button>
  </div>
</div>

<style>
  .pos { display: grid; grid-template-columns: 1fr 340px; gap: 20px; align-items: start; }
  .grid.cols-3 { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
  .prod { text-align: left; padding: 12px; display: flex; flex-direction: column; gap: 4px; min-height: 90px; }
  .pname { font-weight: 600; }
  .pdesc { font-size: 0.78rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: -webkit-box-orient: vertical; overflow: hidden; }
  .pprice { color: var(--accent2); font-weight: 700; margin-top: auto; }
  .cart { position: sticky; top: 20px; }
  @media (max-width: 900px) { .pos { grid-template-columns: 1fr; } }
</style>
