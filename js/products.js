
// Fetch products from server API and expose helper functions
window.PRODUCTS = [];

async function fetchProducts() {
  try {
    const res = await fetch('/api/products');
    const data = await res.json();
    window.PRODUCTS = data.map((d) => ({
      id: d.id,
      category: d.category,
      name: d.name,
      price: d.price,
      desc: d.desc,
      image: d.image || '',
      specs: d.specs || {}
    }));
    return window.PRODUCTS;
  } catch (e) {
    console.error('Failed to fetch products', e);
    return [];
  }
}

async function fetchProduct(id) {
  try {
    const res = await fetch(`/api/products/${id}`);
    if (!res.ok) return null;
    const d = await res.json();
    return {
      id: d.id,
      category: d.category,
      name: d.name,
      price: d.price,
      desc: d.desc,
      image: d.image || '',
      specs: d.specs || {}
    };
  } catch (e) {
    console.error('Failed to fetch product', e);
    return null;
  }
}

function findProduct(id) {
  return window.PRODUCTS.find((p) => p.id === Number(id));
}

function searchProducts(q) {
  if (!q) return window.PRODUCTS;
  q = q.toLowerCase();
  return window.PRODUCTS.filter(
    (p) =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.desc || '').toLowerCase().includes(q) ||
      ((p.category || '') && p.category.toLowerCase().includes(q))
  );
}

window.fetchProducts = fetchProducts;
window.fetchProduct = fetchProduct;
window.findProduct = findProduct;
window.searchProducts = searchProducts;

// Populate products immediately so other pages (cart/checkout) can rely on `window.PRODUCTS`
if (!window.PRODUCTS || !window.PRODUCTS.length) {
  fetchProducts().catch(() => {});
}
