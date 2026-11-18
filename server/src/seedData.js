// Datos semilla compartidos por las implementaciones SQLite y Supabase.
// Las recetas referencian productos e ingredientes por nombre.

export const SEED_USERS = [
  { name: 'Administrador', email: 'admin@chilaquileto.com', password: 'admin123', role: 'admin' },
  { name: 'Cajero Demo', email: 'cajero@chilaquileto.com', password: 'cajero123', role: 'cajero' },
  { name: 'Cocina Demo', email: 'cocina@chilaquileto.com', password: 'cocina123', role: 'cocina' },
];

export const SEED_CATEGORIES = [
  { name: 'Chilaquiles', sort_order: 1 },
  { name: 'Desayunos', sort_order: 2 },
  { name: 'Bebidas', sort_order: 3 },
  { name: 'Extras', sort_order: 4 },
];

// [categoria, nombre, descripcion, precio, disponible]
export const SEED_PRODUCTS = [
  ['Chilaquiles', 'Chilaquiles Rojos Clásicos', 'Totopos en salsa roja de jitomate, queso fresco, crema y cebolla', 95, 1],
  ['Chilaquiles', 'Chilaquiles Verdes', 'Salsa verde de tomatillo, epazote, queso y crema', 95, 1],
  ['Chilaquiles', 'Chilaquiles Suaves', 'Versión sin picante, ideal para niños', 85, 1],
  ['Chilaquiles', 'Chilaquiles con Huevos', 'Huevos al gusto sobre chilaquiles rojos', 115, 1],
  ['Chilaquiles', 'Chilaquiles con Pollo', 'Pollo deshebrado, aguacate y salsa roja', 130, 1],
  ['Chilaquiles', 'Chilaquiles con Chorizo', 'Chorizo mexicano y salsa verde', 125, 1],
  ['Desayunos', 'Huevos Rancheros', 'Huevos estrellados con frijoles y tortillas', 90, 1],
  ['Desayunos', 'Molletes', 'Baguette con frijoles, pico de gallo y queso gratinado', 65, 1],
  ['Desayunos', 'Hotcakes', 'Tres hotcakes con miel o mermelada', 85, 1],
  ['Desayunos', 'Burrito de Desayuno', 'Huevo, chorizo, papa y frijol en tortilla de harina', 110, 1],
  ['Bebidas', 'Café de Olla', 'Café con piloncillo y canela', 35, 1],
  ['Bebidas', 'Jamaica (Agua Fresca)', 'Flor de jamaica con azúcar', 40, 1],
  ['Bebidas', 'Horchata', 'Arroz, canela y azúcar', 45, 1],
  ['Bebidas', 'Refresco', 'Botella individual', 25, 1],
  ['Extras', 'Guacamole', 'Aguacate, jitomate, cebolla y chile', 45, 1],
  ['Extras', 'Queso Extra', 'Queso fresco adicional', 15, 1],
  ['Extras', 'Crema Adicional', 'Cucharada de crema', 10, 1],
  ['Extras', 'Aguacate', 'Rebanada de aguacate', 25, 1],
];

// [nombre, unidad, stock, stock_minimo]
export const SEED_INGREDIENTS = [
  ['Totopos', 'kg', 15, 5],
  ['Salsa Roja', 'lt', 8, 3],
  ['Salsa Verde', 'lt', 8, 3],
  ['Queso Fresco', 'kg', 6, 2],
  ['Crema', 'lt', 4, 1],
  ['Huevos', 'pieza', 60, 12],
  ['Pollo', 'kg', 10, 3],
  ['Chorizo', 'kg', 5, 2],
  ['Aguacate', 'pieza', 20, 5],
  ['Cebolla', 'kg', 7, 2],
  ['Jitomate', 'kg', 12, 4],
  ['Frijoles', 'kg', 9, 3],
  ['Tortillas', 'paquete', 18, 6],
  ['Piloncillo', 'kg', 4, 1],
  ['Canela', 'kg', 1.5, 0.5],
  ['Café', 'kg', 3, 1],
  ['Jamaica', 'kg', 2, 0.5],
  ['Arroz', 'kg', 5, 2],
  ['Harina', 'kg', 20, 5],
  ['Refresco', 'pieza', 20, 5],
];

// [producto, ingrediente, cantidad_por_porcion]
export const SEED_RECIPES = [
  ['Chilaquiles Rojos Clásicos', 'Totopos', 0.12], ['Chilaquiles Rojos Clásicos', 'Salsa Roja', 0.15],
  ['Chilaquiles Rojos Clásicos', 'Queso Fresco', 0.04], ['Chilaquiles Rojos Clásicos', 'Crema', 0.03],
  ['Chilaquiles Rojos Clásicos', 'Cebolla', 0.02],
  ['Chilaquiles Verdes', 'Totopos', 0.12], ['Chilaquiles Verdes', 'Salsa Verde', 0.15],
  ['Chilaquiles Verdes', 'Queso Fresco', 0.04], ['Chilaquiles Verdes', 'Crema', 0.03],
  ['Chilaquiles Suaves', 'Totopos', 0.12], ['Chilaquiles Suaves', 'Salsa Roja', 0.12],
  ['Chilaquiles Suaves', 'Queso Fresco', 0.03],
  ['Chilaquiles con Huevos', 'Totopos', 0.12], ['Chilaquiles con Huevos', 'Salsa Roja', 0.15],
  ['Chilaquiles con Huevos', 'Queso Fresco', 0.04], ['Chilaquiles con Huevos', 'Crema', 0.03],
  ['Chilaquiles con Huevos', 'Huevos', 2], ['Chilaquiles con Huevos', 'Cebolla', 0.02],
  ['Chilaquiles con Pollo', 'Totopos', 0.12], ['Chilaquiles con Pollo', 'Salsa Roja', 0.15],
  ['Chilaquiles con Pollo', 'Pollo', 0.15], ['Chilaquiles con Pollo', 'Aguacate', 0.25],
  ['Chilaquiles con Pollo', 'Queso Fresco', 0.04],
  ['Chilaquiles con Chorizo', 'Totopos', 0.12], ['Chilaquiles con Chorizo', 'Salsa Verde', 0.15],
  ['Chilaquiles con Chorizo', 'Chorizo', 0.1], ['Chilaquiles con Chorizo', 'Queso Fresco', 0.04],
  ['Huevos Rancheros', 'Huevos', 2], ['Huevos Rancheros', 'Frijoles', 0.15],
  ['Huevos Rancheros', 'Tortillas', 2], ['Huevos Rancheros', 'Jitomate', 0.08],
  ['Molletes', 'Tortillas', 1], ['Molletes', 'Frijoles', 0.12],
  ['Molletes', 'Queso Fresco', 0.05], ['Molletes', 'Jitomate', 0.06],
  ['Hotcakes', 'Harina', 0.15],
  ['Burrito de Desayuno', 'Tortillas', 1], ['Burrito de Desayuno', 'Huevos', 2],
  ['Burrito de Desayuno', 'Chorizo', 0.08], ['Burrito de Desayuno', 'Frijoles', 0.1],
  ['Café de Olla', 'Café', 0.015], ['Café de Olla', 'Piloncillo', 0.02], ['Café de Olla', 'Canela', 0.005],
  ['Jamaica (Agua Fresca)', 'Jamaica', 0.05],
  ['Horchata', 'Arroz', 0.05], ['Horchata', 'Canela', 0.005],
  ['Refresco', 'Refresco', 1],
  ['Guacamole', 'Aguacate', 0.5], ['Guacamole', 'Jitomate', 0.1],
  ['Guacamole', 'Cebolla', 0.05],
  ['Queso Extra', 'Queso Fresco', 0.05],
  ['Crema Adicional', 'Crema', 0.03],
  ['Aguacate', 'Aguacate', 0.25],
];
