import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../../../domain/entities/product.entity';
import { ProductRepositoryPort } from '../../../../domain/ports/repositories/product.repository.port';
import { ProductOrmEntity } from '../entities/product.orm-entity';

@Injectable()
export class ProductTypeOrmRepository implements ProductRepositoryPort {
  constructor(
    @InjectRepository(ProductOrmEntity)
    private readonly repo: Repository<ProductOrmEntity>,
  ) {}

  async findAll(): Promise<Product[]> {
    const entities = await this.repo.find({ order: { createdAt: 'ASC' } });
    return entities.map(this.toDomain);
  }

  async findById(id: string): Promise<Product | null> {
    const entity = await this.repo.findOneBy({ id });
    return entity ? this.toDomain(entity) : null;
  }

  async updateStock(id: string, newStock: number): Promise<void> {
    await this.repo.update(id, { stock: newStock });
  }

  private toDomain(entity: ProductOrmEntity): Product {
    return new Product(
      entity.id,
      entity.name,
      entity.description,
      Number(entity.price),
      entity.imageUrl,
      entity.stock,
      entity.category,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
