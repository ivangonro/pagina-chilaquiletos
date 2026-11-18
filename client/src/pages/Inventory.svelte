<script>
  import { onMount } from 'svelte';
  import { api, money } from '../lib/api.js';

  let ingredients = $state([]);
  let movements = $state([]);
  let showForm = $state(false);
  let editing = $state(null);
  let form = $state({ name: '', unit: 'unidad', min_stock: 0 });
  let movementForm = $state({ ingredient_id: null, type: 'entrada', quantity: 0, reason: '' });
  let error = $state('');

  async function load() {
    [ingredients, movements] = await Promise.all([
      api('/inventory/ingredients'),
      api('/inventory/movements'),
    ]);
  }
  onMount(load);

  function openNew() {
    editing = null;
    form = { name: '', unit: 'unidad', min_stock: 0 };
    showForm = true;
  }
  function openEdit(i) {
    editing = i;
    form = { name: i.name, unit: i.unit, min_stock: i.min_stock };
    showForm = true;
  }

  async function save() {
    error = '';
    try {
      if (editing) await api(`/inventory/ingredients/${editing.id}`, { method: 'PUT', body: form });
      else await api('/inventory/ingredients', { method: 'POST', body: { ...form, stock: 0 } });
      showForm = false;
      await load();
    } catch (e) { error = e.message; }
  }

  async function move() {
    error = '';
    try {
      await api(`/inventory/ingredients/${movementForm.ingredient_id}/movements`, { method: 'POST', body: movementForm });
      movementForm = { ingredient_id: null, type: 'entrada', quantity: 0, reason: '' };
      await load();
    } catch (e) { error = e.message; }
  }
</script>

<h2>Inventario</h2>
{#if error}<p class="error">{error}</p>{/if}

<div class="grid cols-2">
  <div class="card" style="padding:0;overflow:hidden">
    <div class="row spread" style="padding:16px 16px 0">
      <h3 style="margin:0">Ingredientes</h3>
      <button class="primary small" on:click={openNew}>+ Nuevo</button>
    </div>
    <table>
      <thead><tr><th>Ingrediente</th><th>Stock</th><th>Mín.</th><th>Estado</th><th></th></tr></thead>
      <tbody>
        {#each ingredients as i}
          <tr>
            <td>{i.name}<div class="muted" style="font-size:0.75rem">{i.unit}</div></td>
            <td><strong>{i.stock}</strong></td>
            <td class="muted">{i.min_stock}</td>
            <td>{#if i.low_stock}<span class="badge cancelado">Bajo</span>{:else}<span class="badge listo">OK</span>{/if}</td>
            <td><button class="small" on:click={() => openEdit(i)}>Editar</button></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="grid" style="align-content:start">
    <div class="card">
      <h3>Registrar movimiento</h3>
      <label>Ingrediente</label>
      <select bind:value={movementForm.ingredient_id}>
        <option value={null}>Seleccionar…</option>
        {#each ingredients as i}<option value={i.id}>{i.name} ({i.unit})</option>{/each}
      </select>
      <div class="row" style="margin-top:10px">
        <div style="flex:1">
          <label>Tipo</label>
          <select bind:value={movementForm.type}>
            <option value="entrada">Entrada</option>
            <option value="salida">Salida</option>
            <option value="ajuste">Ajuste (stock exacto)</option>
          </select>
        </div>
        <div style="flex:1">
          <label>Cantidad</label>
          <input type="number" step="0.01" min="0" bind:value={movementForm.quantity} />
        </div>
      </div>
      <label>Motivo</label>
      <input bind:value={movementForm.reason} placeholder="Compra, merma, etc." />
      <button class="primary" style="margin-top:14px" on:click={move} disabled={!movementForm.ingredient_id}>Guardar</button>
    </div>

    <div class="card" style="padding:0;overflow:hidden">
      <h3 style="padding:16px 16px 0;margin:0">Movimientos recientes</h3>
      <table>
        <thead><tr><th>Fecha</th><th>Ingrediente</th><th>Tipo</th><th>Cant.</th></tr></thead>
        <tbody>
          {#each movements.slice(0, 15) as m}
            <tr>
              <td class="muted">{m.created_at}</td>
              <td>{m.ingredient_name}</td>
              <td>{m.type}</td>
              <td>{m.quantity} {m.unit}</td>
            </tr>
          {/each}
          {#if movements.length === 0}<tr><td colspan="4" class="muted">Sin movimientos</td></tr>{/if}
        </tbody>
      </table>
    </div>
  </div>
</div>

{#if showForm}
  <div class="overlay" on:click={() => showForm = false}>
    <div class="card modal" on:click|stopPropagation>
      <h3>{editing ? 'Editar ingrediente' : 'Nuevo ingrediente'}</h3>
      <label>Nombre</label>
      <input bind:value={form.name} />
      <label>Unidad</label>
      <input bind:value={form.unit} placeholder="kg, lt, pieza…" />
      <label>Stock mínimo</label>
      <input type="number" step="0.01" min="0" bind:value={form.min_stock} />
      <div class="row" style="margin-top:16px;justify-content:flex-end">
        <button on:click={() => showForm = false}>Cancelar</button>
        <button class="primary" on:click={save}>Guardar</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 10; }
  .modal { width: 380px; }
</style>
