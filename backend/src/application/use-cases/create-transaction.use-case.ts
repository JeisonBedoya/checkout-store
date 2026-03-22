import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Transaction, TransactionStatus } from '../../domain/entities/transaction.entity';
import { PRODUCT_REPOSITORY } from '../../domain/ports/repositories/product.repository.port';
import type { ProductRepositoryPort } from '../../domain/ports/repositories/product.repository.port';
import { TRANSACTION_REPOSITORY } from '../../domain/ports/repositories/transaction.repository.port';
import type { TransactionRepositoryPort } from '../../domain/ports/repositories/transaction.repository.port';
import { Result, ok, err } from '../../domain/value-objects/result';

export const BASE_FEE_IN_CENTS = 300000; // 3,000 COP
export const DELIVERY_FEE_IN_CENTS = 500000; // 5,000 COP

export interface CreateTransactionInput {
  productId: string;
  quantity: number;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryRegion: string;
  deliveryCountry: string;
  deliveryPostalCode: string;
}

@Injectable()
export class CreateTransactionUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: TransactionRepositoryPort,
  ) {}

  async execute(input: CreateTransactionInput): Promise<Result<Transaction>> {
    // Step 1: Validate product exists
    const product = await this.productRepository.findById(input.productId);
    if (!product) return err(`Product ${input.productId} not found`);

    // Step 2: Validate stock
    if (!product.hasStock(input.quantity)) {
      return err(`Insufficient stock. Available: ${product.stock}`);
    }

    // Step 3: Calculate amounts
    const productAmountInCents = product.price * input.quantity;
    const totalAmountInCents =
      productAmountInCents + BASE_FEE_IN_CENTS + DELIVERY_FEE_IN_CENTS;

    // Step 4: Create transaction record
    try {
      const reference = `TXN-${uuidv4()}`;
      const transaction = await this.transactionRepository.create({
        reference,
        productId: input.productId,
        quantity: input.quantity,
        amountInCents: productAmountInCents,
        baseFeeInCents: BASE_FEE_IN_CENTS,
        deliveryFeeInCents: DELIVERY_FEE_IN_CENTS,
        totalAmountInCents,
        currency: 'COP',
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        deliveryAddress: input.deliveryAddress,
        deliveryCity: input.deliveryCity,
        deliveryRegion: input.deliveryRegion,
        deliveryCountry: input.deliveryCountry,
        deliveryPostalCode: input.deliveryPostalCode,
        status: TransactionStatus.PENDING,
        gatewayTransactionId: null,
        gatewayStatus: null,
        gatewayResponse: null,
      });

      return ok(transaction);
    } catch (error) {
      return err(`Failed to create transaction: ${(error as Error).message}`);
    }
  }
}
