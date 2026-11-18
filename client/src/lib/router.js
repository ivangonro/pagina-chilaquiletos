import { writable } from 'svelte/store';

function parse() {
  const h = location.hash.replace(/^#/, '');
  return h || '/';
}

export const path = writable(parse());
window.addEventListener('hashchange', () => path.set(parse()));

export function navigate(p) {
  location.hash = '#' + p;
}
