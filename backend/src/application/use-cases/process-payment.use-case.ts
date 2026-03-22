import { Inject, Injectable } from '@nestjs/common';
import { Transaction } from '../../domain/entities/transaction.entity';
import { TRANSACTION_REPOSITORY } from '../../domain/ports/repositories/transaction.repository.port';
import type { TransactionRepositoryPort } from '../../domain/ports/repositories/transaction.repository.port';
import { PRODUCT_REPOSITORY } from '../../domain/ports/repositories/product.repository.port';
import type { ProductRepositoryPort } from '../../domain/ports/repositories/product.repository.port';
import { PAYMENT_GATEWAY } from '../../domain/ports/services/payment-gateway.port';
import type { PaymentGatewayPort } from '../../domain/ports/services/payment-gateway.port';
import { Result, ok, err } from '../../domain/value-objects/result';

export interface ProcessPaymentInput {
  transactionId: string;
  cardNumber: string;
  cardCvc: string;
  cardExpMonth: string;
  cardExpYear: string;
  cardHolder: string;
  installments: number;
  legalId: string;
  legalIdType: string;
}

@Injectable()
export class ProcessPaymentUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: TransactionRepositoryPort,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: PaymentGatewayPort,
  ) {}

  async execute(input: ProcessPaymentInput): Promise<Result<Transaction>> {
    // Step 1: Fetch transaction
    const transaction = await this.transactionRepository.findById(input.transactionId);
    if (!transaction) return err(`Transaction ${input.transactionId} not found`);
    if (!transaction.isPending()) return err(`Transaction is not in PENDING status`);

    // Step 2: Get acceptance token
    let acceptanceToken: string;
    try {
      acceptanceToken = await this.paymentGateway.getAcceptanceToken();
    } catch (error) {
      return err(`Failed to get acceptance token: ${(error as Error).message}`);
    }

    // Step 3: Tokenize card
    let cardToken: string;
    try {
      const tokenResult = await this.paymentGateway.tokenizeCard({
        number: input.cardNumber,
        cvc: input.cardCvc,
        expMonth: input.cardExpMonth,
        expYear: input.cardExpYear,
        cardHolder: input.cardHolder,
      });
      cardToken = tokenResult.token;
    } catch (error) {
      await this.transactionRepository.update(transaction.id, {
        status: 'ERROR' as any,
        gatewayStatus: `Card tokenization failed: ${(error as Error).message}`,
      });
      return err(`Card tokenization failed: ${(error as Error).message}`);
    }

    // Step 4: Process payment
    let paymentResult;
    try {
      paymentResult = await this.paymentGateway.processPayment(
        {
          amountInCents: transaction.totalAmountInCents,
          currency: transaction.currency,
          customerEmail: transaction.customerEmail,
          customerName: transaction.customerName,
          customerPhone: transaction.customerPhone,
          legalId: input.legalId,
          legalIdType: input.legalIdType,
          cardToken,
          installments: input.installments,
          reference: transaction.reference,
          deliveryAddress: transaction.deliveryAddress,
          deliveryCity: transaction.deliveryCity,
          deliveryRegion: transaction.deliveryRegion,
          deliveryCountry: transaction.deliveryCountry,
          deliveryPostalCode: transaction.deliveryPostalCode,
        },
        acceptanceToken,
      );
    } catch (error) {
      await this.transactionRepository.update(transaction.id, {
        status: 'ERROR' as any,
        gatewayStatus: (error as Error).message,
      });
      return err(`Payment processing failed: ${(error as Error).message}`);
    }

    // Step 5: Update transaction based on result
    if (paymentResult.status === 'APPROVED') {
      transaction.markApproved(paymentResult.gatewayTransactionId, paymentResult.rawResponse);

      // Step 6: Update product stock
      const product = await this.productRepository.findById(transaction.productId);
      if (product) {
        product.decreaseStock(transaction.quantity);
        await this.productRepository.updateStock(product.id, product.stock);
      }
    } else {
      transaction.markDeclined(paymentResult.gatewayTransactionId, paymentResult.rawResponse);
    }

    const updatedTransaction = await this.transactionRepository.update(transaction.id, {
      status: transaction.status,
      gatewayTransactionId: transaction.gatewayTransactionId,
      gatewayStatus: transaction.gatewayStatus,
      gatewayResponse: transaction.gatewayResponse,
      updatedAt: transaction.updatedAt,
    });

    return ok(updatedTransaction);
  }
}
