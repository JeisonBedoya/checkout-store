import { Controller, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { GetProductsUseCase } from '../../../application/use-cases/get-products.use-case';

@Controller('products')
export class ProductsController {
  constructor(private readonly getProductsUseCase: GetProductsUseCase) {}

  @Get()
  async findAll() {
    const result = await this.getProductsUseCase.execute();
    if (!result.success) {
      throw new HttpException(result.error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return { data: result.value };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.getProductsUseCase.executeById(id);
    if (!result.success) {
      throw new HttpException(result.error, HttpStatus.NOT_FOUND);
    }
    return { data: result.value };
  }
}
