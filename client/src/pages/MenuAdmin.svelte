<script>
  import { onMount } from 'svelte';
  import { api, money } from '../lib/api.js';

  let categories = $state([]);
  let products = $state([]);
  let ingredients = $state([]);
  let editing = $state(null);
  let showForm = $state(false);
  let error = $state('');
  let form = $state(emptyForm());
  let newCat = $state('');

  function emptyForm() {
    return {
      category_id: null, name: '', description: '', price: 0,
      available: 1, ingredients: [],
    };
  }

  async function load() {
    [categories, products, ingredients] = await Promise.all([
      api('/products/categories'),
      api('/products'),
      api('/inventory/ingredients'),
    ]);
  }
  onMount(load);

  function openNew() { editing = null; form = emptyForm(); form.category_id = categories[0]?.id ?? null; showForm = true; }
  function openEdit(p) {
    editing = p;
    form = {
      category_id: p.category_id, name: p.name, description: p.description,
      price: p.price, available: p.available,
      ingredients: (p.ingredients || []).map(i => ({ ingredient_id: i.ingredient_id, quantity: i.quantity })),
    };
    showForm = true;
  }

  function toggleIngredient(id) {
    const idx = form.ingredients.findIndex(i => i.ingredient_id === id);
    if (idx >= 0) form.ingredients.splice(idx, 1);
    else form.ingredients.push({ ingredient_id: id, quantity: 0.1 });
    form.ingredients = form.ingredients;
  }
  function ingQty(id, e) {
    const ing = form.ingredients.find(i => i.ingredient_id === id);
    if (ing) { ing.quantity = parseFloat(e.target.value) || 0; }
  }

  async function save() {
    error = '';
    try {
      const body = { ...form, ingredients: form.ingredients.filter(i => i.quantity > 0) };
      if (editing) await api(`/products/${editing.id}`, { method: 'PUT', body });
      else await api('/products', { method: 'POST', body });
      showForm = false;
      await load();
    } catch (e) { error = e.message; }
  }

  async function remove(id) {
    if (!confirm('¿Eliminar este producto?')) return;
    await api(`/products/${id}`, { method: 'DELETE' });
    await load();
  }

  async function toggleAvailable(p) {
    await api(`/products/${p.id}`, { method: 'PUT', body: { available: p.available ? 0 : 1 } });
    await load();
  }

  async function addCategory() {
    if (!newCat.trim()) return;
    await api('/products/categories', { method: 'POST', body: { name: newCat.trim() } });
    newCat = '';
    await load();
  }
</script>

<h2>Gestión de Menú</h2>
<div class="row spread" style="margin-bottom:16px">
  <div class="row">
    {#each categories as c}<span class="badge preparando">{c.name}</span>{/each}
    <input bind:value={newCat} placeholder="Nueva categoría" style="width:160px" on:keydown={(e) => e.key === 'Enter' && addCategory()} />
    <button class="small" on:click={addCategory}>+ Cat.</button>
  </div>
  <button class="primary" on:click={openNew}>+ Producto</button>
</div>

<div class="card" style="padding:0;overflow:hidden">
  <table>
    <thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Receta</th><th>Disponible</th><th></th></tr></thead>
    <tbody>
      {#each products as p}
        <tr>
          <td><strong>{p.name}</strong><div class="muted" style="font-size:0.8rem">{p.description}</div></td>
          <td>{p.category_name}</td>
          <td>{money(p.price)}</td>
          <td class="muted">{(p.ingredients || []).length} insumos</td>
          <td>
            <button class="small" on:click={() => toggleAvailable(p)}>
              {p.available ? 'Sí' : 'No'}
            </button>
          </td>
          <td class="row">
            <button class="small" on:click={() => openEdit(p)}>Editar</button>
            <button class="small danger" on:click={() => remove(p.id)}>✕</button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

{#if showForm}
  <div class="overlay" on:click={() => showForm = false}>
    <div class="card modal" on:click|stopPropagation>
      <h3>{editing ? 'Editar producto' : 'Nuevo producto'}</h3>
      {#if error}<p class="error">{error}</p>{/if}
      <label>Nombre</label>
      <input bind:value={form.name} />
      <label>Categoría</label>
      <select bind:value={form.category_id}>
        {#each categories as c}<option value={c.id}>{c.name}</option>{/each}
      </select>
      <label>Descripción</label>
      <input bind:value={form.description} />
      <div class="row">
        <div style="flex:1"><label>Precio</label><input type="number" step="0.01" min="0" bind:value={form.price} /></div>
        <div style="flex:1"><label>Disponible</label>
          <select bind:value={form.available}><option value={1}>Sí</option><option value={0}>No</option></select>
        </div>
      </div>
      <label>Receta (insumos por porción)</label>
      <div class="recipe">
        {#each ingredients as ing}
          {@const sel = form.ingredients.find(i => i.ingredient_id === ing.id)}
          <label class="check">
            <input type="checkbox" checked={!!sel} on:change={() => toggleIngredient(ing.id)} />
            {ing.name} ({ing.unit})
            {#if sel}
              <input type="number" step="0.01" min="0" value={sel.quantity} on:input={(e) => ingQty(ing.id, e)} style="width:80px;padding:4px" />
            {/if}
          </label>
        {/each}
      </div>
      <div class="row" style="margin-top:16px;justify-content:flex-end">
        <button on:click={() => showForm = false}>Cancelar</button>
        <button class="primary" on:click={save}>Guardar</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 10; }
  .modal { width: 480px; max-height: 85vh; overflow-y: auto; }
  .recipe { max-height: 220px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px; padding: 8px; }
  .check { display: flex; align-items: center; gap: 8px; margin: 4px 0; font-size: 0.9rem; color: var(--text); }
  .check input[type="checkbox"] { width: auto; }
</style>
