const Product = require('../models/Product');
const Category = require('../models/Category');

const defaultProducts = [
  {
    slug: 'apple-airpods-pro-2',
    name: 'Apple AirPods Pro 2',
    category: 'Audio',
    price: 879,
    compareAtPrice: 999,
    rating: 4.8,
    stock: 24,
    image: 'https://dummyimage.com/900x900/eef2f7/1a1c1e.png&text=Apple+AirPods+Pro+2',
    summary: 'Active noise cancellation, USB-C case, immersive sound for daily use.',
    description: 'A premium wireless audio choice for shoppers who want comfort, call clarity, and reliable battery life in a compact everyday carry.',
    featured: true,
    specs: {
      Battery: 'Up to 30 hours with case',
      Connectivity: 'Bluetooth 5.3',
      Warranty: '1 year',
    },
  },
  {
    slug: 'samsung-galaxy-s25-ultra',
    name: 'Samsung Galaxy S25 Ultra',
    category: 'Mobiles',
    price: 4899,
    compareAtPrice: 5199,
    rating: 4.9,
    stock: 16,
    image: 'https://dummyimage.com/900x900/eef2f7/1a1c1e.png&text=Samsung+Galaxy+S25+Ultra',
    summary: 'Flagship Android performance with vivid display, AI tools, and elite camera zoom.',
    description: 'A premium smartphone pick for users who want a large display, multitasking power, strong battery life, and a versatile camera system.',
    featured: true,
    specs: {
      Display: '6.8-inch AMOLED',
      Storage: '256 GB',
      Camera: '200 MP main',
    },
  },
  {
    slug: 'sony-playstation-5-slim',
    name: 'PlayStation 5 Slim',
    category: 'Gaming',
    price: 2099,
    compareAtPrice: 2299,
    rating: 4.8,
    stock: 12,
    image: 'https://dummyimage.com/900x900/eef2f7/1a1c1e.png&text=PlayStation+5+Slim',
    summary: 'Next-gen gaming performance in a slimmer console for your living room.',
    description: 'Ideal for console gaming fans looking for strong performance, exclusive titles, and a cleaner shelf presence in the updated slim design.',
    featured: false,
    specs: {
      Storage: '1 TB SSD',
      Resolution: 'Up to 4K',
      Includes: 'DualSense controller',
    },
  },
  {
    slug: 'razer-blackwidow-v4-pro',
    name: 'Razer BlackWidow V4 Pro',
    category: 'Gaming',
    price: 329,
    compareAtPrice: 399,
    rating: 4.7,
    stock: 18,
    image: 'https://dummyimage.com/900x900/eef2f7/1a1c1e.png&text=Razer+BlackWidow+V4+Pro',
    summary: 'Mechanical RGB gaming keyboard with macro controls and wrist rest.',
    description: 'A high-performance gaming keyboard for competitive play with tactile switches, programmable keys, and durable construction.',
    featured: false,
    specs: {
      Switches: 'Green mechanical',
      Lighting: 'Per-key RGB',
      Connection: 'USB-C',
    },
  },
  {
    slug: 'crystal-chandelier-8-light',
    name: 'Crystal Chandelier 8-Light',
    category: 'Wiring',
    price: 699,
    compareAtPrice: 820,
    rating: 4.6,
    stock: 14,
    image: 'https://dummyimage.com/900x900/eef2f7/1a1c1e.png&text=Crystal+Chandelier+8-Light',
    summary: 'Modern chandelier fixture for living rooms, halls, and staircases.',
    description: 'Decorative ceiling chandelier with multi-bulb support and standard electrical mounting for residential installations.',
    featured: true,
    specs: {
      BulbType: 'E14 / E12 compatible',
      Material: 'Crystal and metal',
      Voltage: '220-240V',
    },
  },
  {
    slug: 'led-bulb-12w-daylight',
    name: 'LED Bulb 12W Daylight',
    category: 'Wiring',
    price: 6,
    compareAtPrice: 9,
    rating: 4.5,
    stock: 240,
    image: 'https://dummyimage.com/900x900/eef2f7/1a1c1e.png&text=LED+Bulb+12W+Daylight',
    summary: 'Energy-efficient bulb for home and office electrical lighting.',
    description: 'High-efficiency LED bulb designed for low power consumption and stable brightness in houses and commercial spaces.',
    featured: false,
    specs: {
      Power: '12W',
      ColorTemp: '6500K',
      Base: 'E27',
    },
  },
  {
    slug: 'smart-wall-switch-2-gang',
    name: 'Smart Wall Switch 2-Gang',
    category: 'Electronics',
    price: 39,
    compareAtPrice: 49,
    rating: 4.4,
    stock: 86,
    image: 'https://dummyimage.com/900x900/eef2f7/1a1c1e.png&text=Smart+Wall+Switch+2-Gang',
    summary: 'Dual-channel smart switch for lights and appliance control.',
    description: 'In-wall smart switch module suitable for modern homes and building renovations with app and voice-assistant support.',
    featured: false,
    specs: {
      Channels: '2',
      Control: 'App + manual',
      Voltage: '110-240V AC',
    },
  },
  {
    slug: 'distribution-board-12-way',
    name: 'Distribution Board 12-Way',
    category: 'Electronics',
    price: 149,
    compareAtPrice: 179,
    rating: 4.3,
    stock: 34,
    image: 'https://dummyimage.com/900x900/eef2f7/1a1c1e.png&text=Distribution+Board+12-Way',
    summary: 'Electrical panel board for home and small-building circuits.',
    description: 'Compact distribution board for construction and retrofit projects to organize breakers and protect line circuits.',
    featured: false,
    specs: {
      Slots: '12-way',
      Mounting: 'Surface or flush',
      Protection: 'IP40',
    },
  },
  {
    slug: 'mcb-circuit-breaker-20a',
    name: 'MCB Circuit Breaker 20A',
    category: 'Electronics',
    price: 18,
    compareAtPrice: 24,
    rating: 4.4,
    stock: 120,
    image: 'https://dummyimage.com/900x900/eef2f7/1a1c1e.png&text=MCB+Circuit+Breaker+20A',
    summary: 'Miniature circuit breaker for residential and building safety.',
    description: 'Reliable overcurrent protection component for home circuits, renovation projects, and under-construction building panels.',
    featured: false,
    specs: {
      Rating: '20A',
      Poles: '1P',
      Standard: 'IEC compliant',
    },
  },
  {
    slug: 'electrical-cable-3x2-5mm-100m',
    name: 'Electrical Cable 3x2.5mm 100m',
    category: 'Electronics',
    price: 129,
    compareAtPrice: 149,
    rating: 4.5,
    stock: 52,
    image: 'https://dummyimage.com/900x900/eef2f7/1a1c1e.png&text=Electrical+Cable+3x2.5mm+100m',
    summary: 'Copper electrical cable roll for sockets, switches, and lighting lines.',
    description: 'Construction-grade wiring cable used for powering rooms, outlets, and building circuits with dependable conductivity.',
    featured: false,
    specs: {
      Core: 'Copper',
      Size: '3x2.5mm',
      Length: '100m roll',
    },
  },
  {
    slug: 'lg-oled-c4-55',
    name: 'LG OLED C4 55"',
    category: 'TVs',
    price: 3799,
    compareAtPrice: 4199,
    rating: 4.9,
    stock: 11,
    image: 'https://dummyimage.com/900x900/eef2f7/1a1c1e.png&text=LG+OLED+C4+55',
    summary: 'Deep contrast, rich color, and premium cinema quality for living room entertainment.',
    description: 'A strong flagship TV choice for movies, sports, and gaming with vivid OLED blacks, modern smart features, and elegant wall-friendly styling.',
    featured: true,
    specs: {
      Panel: 'OLED Evo',
      Refresh: '144 Hz',
      Smart: 'webOS',
    },
  },
];

async function bootstrapProducts() {
  for (const item of defaultProducts) {
    await Product.findOneAndUpdate(
      { slug: item.slug },
      { $set: item },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  // Normalize old categories from earlier versions so the new journey is clean.
  await Product.updateMany({ category: 'Home' }, { $set: { category: 'Wiring' } });
  await Product.updateMany({ category: 'Kitchen' }, { $set: { category: 'Electronics' } });

  const productCategories = await Product.distinct('category');
  const normalizedCategories = [...new Set(productCategories.map((name) => String(name || '').trim()).filter(Boolean))];

  for (const name of normalizedCategories) {
    await Category.findOneAndUpdate(
      { name },
      { $set: { name } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  console.log(`Upserted ${defaultProducts.length} products, normalized legacy categories, and synced ${normalizedCategories.length} categories`);
}

module.exports = {
  bootstrapProducts,
};
