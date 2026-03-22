import { DataSource } from 'typeorm';
import { ProductOrmEntity } from '../entities/product.orm-entity';

const products = [
  {
    name: 'Sony WH-1000XM5 Headphones',
    description:
      'Industry-leading noise canceling with Dual Noise Sensor technology. Next-level music with 8 microphones for clear calls. Up to 30-hour battery life with quick charge.',
    price: 129900000, // 1,299,000 COP in cents
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    stock: 10,
    category: 'Electronics',
  },
  {
    name: 'Apple AirPods Pro (2nd Gen)',
    description:
      'Active Noise Cancellation up to 2x more powerful. Adaptive Transparency lets outside sound in. Personalized Spatial Audio with dynamic head tracking.',
    price: 99900000, // 999,000 COP in cents
    imageUrl: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400',
    stock: 15,
    category: 'Electronics',
  },
  {
    name: 'Samsung Galaxy Watch 6',
    description:
      'Advanced health monitoring with body composition analysis. Enhanced sleep coaching. Sapphire Crystal glass for superior scratch resistance.',
    price: 89900000, // 899,000 COP in cents
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
    stock: 8,
    category: 'Wearables',
  },
  {
    name: 'Logitech MX Master 3S Mouse',
    description:
      'Ultra-fast MagSpeed electromagnetic scrolling. 8K DPI any-surface tracking. Ergonomic design for all-day comfort.',
    price: 49900000, // 499,000 COP in cents
    imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400',
    stock: 20,
    category: 'Accessories',
  },
  {
    name: 'iPad Air (5th Generation)',
    description:
      '10.9-inch Liquid Retina display. M1 chip for powerful performance. USB-C with 2x faster transfer. Center Stage keeps you in frame automatically.',
    price: 259900000, // 2,599,000 COP in cents
    imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400',
    stock: 5,
    category: 'Tablets',
  },
  {
    name: 'JBL Charge 5 Bluetooth Speaker',
    description:
      'Powerful JBL Pro Sound. IP67 waterproof & dustproof. 20 hours of playtime. Built-in power bank to charge your devices.',
    price: 59900000, // 599,000 COP in cents
    imageUrl: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400',
    stock: 12,
    category: 'Audio',
  },
];

export async function seedProducts(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(ProductOrmEntity);
  const count = await repo.count();
  if (count > 0) {
    console.log('Products already seeded, skipping...');
    return;
  }
  await repo.save(products.map((p) => repo.create(p)));
  console.log(`Seeded ${products.length} products`);
}
