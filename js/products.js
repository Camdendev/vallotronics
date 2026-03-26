
const PRODUCTS = [
  {
    id: 1,
    category: 'CPU',
    name: 'Ryzen 7 5800X',
    price: 329.99,
    desc: '8-core desktop processor, AM4',
    image: 'https://www.bhphotovideo.com/images/fb/amd_100_100000063wof_ryzen_7_5800x_3_8_1598376.jpg',
    specs: { cores: 8, threads: 16, clock: '3.8GHz' }
  },
  {
    id: 2,
    category: 'GPU',
    name: 'ASUS GeForce RTX 4070',
    price: 599.99,
    desc: 'High-performance gaming GPU',
    image: 'https://m.media-amazon.com/images/I/81rryZLBohL._AC_SL1500_.jpg',
    specs: { vram: '12GB', tdp: '200W' }
  },
  {
    id: 3,
    category: 'Motherboard',
    name: 'ASUS ROG Strix B550-F',
    price: 199.99,
    desc: 'ATX AM4 motherboard with robust power delivery',
    image: 'https://m.media-amazon.com/images/I/81S9D7bqEzL._AC_SL1500_.jpg',
    specs: { chipset: 'B550', form: 'ATX' }
  },
  {
    id: 4,
    category: 'RAM',
    name: 'Corsair Vengeance 32GB (2x16) DDR4-3600',
    price: 129.99,
    desc: 'High-speed memory kit for gaming and work',
    image: 'https://m.media-amazon.com/images/I/61wCOVcyvFL._AC_SX522_.jpg',
    specs: { size: '32GB', speed: '3600MHz' }
  },
  {
    id: 5,
    category: 'SSD',
    name: 'Samsung 970 EVO Plus 1TB',
    price: 119.99,
    desc: 'NVMe M.2 SSD with fast read/write',
    image: 'https://m.media-amazon.com/images/I/61ZL9Qpo1-L._AC_SL1320_.jpg',
    specs: { type: 'NVMe', capacity: '1TB' }
  },
  {
    id: 6,
    category: 'PSU',
    name: 'Seasonic Focus GX-750',
    price: 119.99,
    desc: '750W 80+ Gold modular PSU',
    image: 'https://m.media-amazon.com/images/I/816Ka97cDyL._SL1500_.jpg',
    specs: { wattage: '750W', efficiency: '80+ Gold' }
  },
  {
    id: 7,
    category: 'Case',
    name: 'NZXT H510',
    price: 79.99,
    desc: 'Mid-tower case with modern aesthetics',
    image: 'https://m.media-amazon.com/images/I/51wAv5q4adL._AC_SL1000_.jpg',
    specs: { type: 'Mid Tower' }
  },
  {
    id: 8,
    category: 'Cooler',
    name: 'Noctua NH-D15',
    price: 99.99,
    desc: 'Top-tier air cooler for CPUs',
    image: 'https://m.media-amazon.com/images/I/91Hw1zcAIjL._AC_SL1500_.jpg',
    specs: { type: 'Air Cooler' }
  }
];

function findProduct(id) {
  return PRODUCTS.find((p) => p.id === Number(id));
}

function searchProducts(q) {
  if (!q) return PRODUCTS;
  q = q.toLowerCase();

  return PRODUCTS.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.desc.toLowerCase().includes(q) ||
      (p.category && p.category.toLowerCase().includes(q))
  );
}
