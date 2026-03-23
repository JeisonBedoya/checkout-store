import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { ProductOrmEntity } from './infrastructure/persistence/typeorm/entities/product.orm-entity';
import { TransactionOrmEntity } from './infrastructure/persistence/typeorm/entities/transaction.orm-entity';

import { ProductTypeOrmRepository } from './infrastructure/persistence/typeorm/repositories/product.typeorm-repository';
import { TransactionTypeOrmRepository } from './infrastructure/persistence/typeorm/repositories/transaction.typeorm-repository';
import { PaymentGatewayAdapter } from './infrastructure/payment-gateway/payment-gateway.adapter';

import { GetProductsUseCase } from './application/use-cases/get-products.use-case';
import { CreateTransactionUseCase } from './application/use-cases/create-transaction.use-case';
import { ProcessPaymentUseCase } from './application/use-cases/process-payment.use-case';

import { ProductsController } from './infrastructure/http/controllers/products.controller';
import { TransactionsController } from './infrastructure/http/controllers/transactions.controller';

import { PRODUCT_REPOSITORY } from './domain/ports/repositories/product.repository.port';
import { TRANSACTION_REPOSITORY } from './domain/ports/repositories/transaction.repository.port';
import { PAYMENT_GATEWAY } from './domain/ports/services/payment-gateway.port';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USERNAME', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: config.get('DB_NAME', 'checkout_store'),
        entities: [ProductOrmEntity, TransactionOrmEntity],
        synchronize: config.get('NODE_ENV', 'development') !== 'production',
        logging: config.get('NODE_ENV') === 'development',
        ssl: config.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),
    TypeOrmModule.forFeature([ProductOrmEntity, TransactionOrmEntity]),
    HttpModule,
  ],
  controllers: [ProductsController, TransactionsController],
  providers: [
    { provide: PRODUCT_REPOSITORY, useClass: ProductTypeOrmRepository },
    { provide: TRANSACTION_REPOSITORY, useClass: TransactionTypeOrmRepository },
    { provide: PAYMENT_GATEWAY, useClass: PaymentGatewayAdapter },
    GetProductsUseCase,
    CreateTransactionUseCase,
    ProcessPaymentUseCase,
  ],
})
export class AppModule {}
