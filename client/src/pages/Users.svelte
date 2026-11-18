<script>
  import { onMount } from 'svelte';
  import { api } from '../lib/api.js';
  import { auth } from '../lib/auth.svelte.js';

  let users = $state([]);
  let showForm = $state(false);
  let editing = $state(null);
  let error = $state('');
  let form = $state({ name: '', email: '', password: '', role: 'cajero' });

  async function load() { users = await api('/users'); }
  onMount(load);

  function openNew() { editing = null; form = { name: '', email: '', password: '', role: 'cajero' }; showForm = true; }
  function openEdit(u) { editing = u; form = { name: u.name, email: u.email, password: '', role: u.role }; showForm = true; }

  async function save() {
    error = '';
    try {
      const body = { name: form.name, email: form.email, role: form.role };
      if (form.password) body.password = form.password;
      if (editing) {
        body.active = editing.active;
        await api(`/users/${editing.id}`, { method: 'PUT', body });
      } else {
        body.password = form.password;
        await api('/users', { method: 'POST', body });
      }
      showForm = false;
      await load();
    } catch (e) { error = e.message; }
  }

  async function toggleActive(u) {
    await api(`/users/${u.id}`, { method: 'PUT', body: { active: u.active ? 0 : 1 } });
    await load();
  }
</script>

<h2>Usuarios</h2>
<div class="row spread" style="margin-bottom:16px">
  <p class="muted" style="margin:0">Gestiona cajeros, cocina y administradores</p>
  <button class="primary" on:click={openNew}>+ Usuario</button>
</div>

<div class="card" style="padding:0;overflow:hidden">
  <table>
    <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
    <tbody>
      {#each users as u}
        <tr>
          <td><strong>{u.name}</strong>{#if u.id === auth.user?.id} <span class="muted">(tú)</span>{/if}</td>
          <td>{u.email}</td>
          <td><span class="badge preparando">{u.role}</span></td>
          <td>{u.active ? 'Activo' : 'Inactivo'}</td>
          <td class="row">
            <button class="small" on:click={() => openEdit(u)}>Editar</button>
            {#if u.id !== auth.user?.id}
              <button class="small {u.active ? 'danger' : ''}" on:click={() => toggleActive(u)}>
                {u.active ? 'Desactivar' : 'Activar'}
              </button>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

{#if showForm}
  <div class="overlay" on:click={() => showForm = false}>
    <div class="card modal" on:click|stopPropagation>
      <h3>{editing ? 'Editar usuario' : 'Nuevo usuario'}</h3>
      {#if error}<p class="error">{error}</p>{/if}
      <label>Nombre</label>
      <input bind:value={form.name} />
      <label>Email</label>
      <input type="email" bind:value={form.email} />
      <label>Rol</label>
      <select bind:value={form.role}>
        <option value="admin">Admin</option>
        <option value="cajero">Cajero</option>
        <option value="cocina">Cocina</option>
      </select>
      <label>{editing ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}</label>
      <input type="password" bind:value={form.password} />
      <div class="row" style="margin-top:16px;justify-content:flex-end">
        <button on:click={() => showForm = false}>Cancelar</button>
        <button class="primary" on:click={save}>Guardar</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 10; }
  .modal { width: 400px; }
</style>
