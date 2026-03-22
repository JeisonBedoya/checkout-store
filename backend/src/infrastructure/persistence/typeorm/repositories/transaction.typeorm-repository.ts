import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../../../../domain/entities/transaction.entity';
import { TransactionRepositoryPort } from '../../../../domain/ports/repositories/transaction.repository.port';
import { TransactionOrmEntity } from '../entities/transaction.orm-entity';

@Injectable()
export class TransactionTypeOrmRepository implements TransactionRepositoryPort {
  constructor(
    @InjectRepository(TransactionOrmEntity)
    private readonly repo: Repository<TransactionOrmEntity>,
  ) {}

  async create(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const entity = this.repo.create(data as any);
    const saved = await this.repo.save(entity) as unknown as TransactionOrmEntity;
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Transaction | null> {
    const entity = await this.repo.findOneBy({ id });
    return entity ? this.toDomain(entity) : null;
  }

  async findByReference(reference: string): Promise<Transaction | null> {
    const entity = await this.repo.findOneBy({ reference });
    return entity ? this.toDomain(entity) : null;
  }

  async update(id: string, data: Partial<Transaction>): Promise<Transaction> {
    await this.repo.update(id, data as any);
    const entity = await this.repo.findOneByOrFail({ id });
    return this.toDomain(entity);
  }

  private toDomain(entity: TransactionOrmEntity): Transaction {
    return new Transaction(
      entity.id,
      entity.reference,
      entity.productId,
      entity.quantity,
      Number(entity.amountInCents),
      Number(entity.baseFeeInCents),
      Number(entity.deliveryFeeInCents),
      Number(entity.totalAmountInCents),
      entity.currency,
      entity.customerEmail,
      entity.customerName,
      entity.customerPhone,
      entity.deliveryAddress,
      entity.deliveryCity,
      entity.deliveryRegion,
      entity.deliveryCountry,
      entity.deliveryPostalCode,
      entity.status,
      entity.gatewayTransactionId,
      entity.gatewayStatus,
      entity.gatewayResponse,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
