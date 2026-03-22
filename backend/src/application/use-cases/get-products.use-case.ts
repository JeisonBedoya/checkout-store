import { Inject, Injectable } from '@nestjs/common';
import { Product } from '../../domain/entities/product.entity';
import { PRODUCT_REPOSITORY } from '../../domain/ports/repositories/product.repository.port';
import type { ProductRepositoryPort } from '../../domain/ports/repositories/product.repository.port';
import { Result, ok, err } from '../../domain/value-objects/result';

@Injectable()
export class GetProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,
  ) {}

  async execute(): Promise<Result<Product[]>> {
    try {
      const products = await this.productRepository.findAll();
      return ok(products);
    } catch (error) {
      return err(`Failed to retrieve products: ${(error as Error).message}`);
    }
  }

  async executeById(id: string): Promise<Result<Product>> {
    try {
      const product = await this.productRepository.findById(id);
      if (!product) return err(`Product with id ${id} not found`);
      return ok(product);
    } catch (error) {
      return err(`Failed to retrieve product: ${(error as Error).message}`);
    }
  }
}
