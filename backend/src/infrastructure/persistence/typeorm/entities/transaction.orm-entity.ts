import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { TransactionStatus } from '../../../../domain/entities/transaction.entity';

@Entity('transactions')
export class TransactionOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 100 })
  reference: string;

  @Column({ name: 'product_id', length: 36 })
  productId: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'amount_in_cents', type: 'bigint' })
  amountInCents: number;

  @Column({ name: 'base_fee_in_cents', type: 'bigint' })
  baseFeeInCents: number;

  @Column({ name: 'delivery_fee_in_cents', type: 'bigint' })
  deliveryFeeInCents: number;

  @Column({ name: 'total_amount_in_cents', type: 'bigint' })
  totalAmountInCents: number;

  @Column({ length: 10, default: 'COP' })
  currency: string;

  @Column({ name: 'customer_email', length: 200 })
  customerEmail: string;

  @Column({ name: 'customer_name', length: 200 })
  customerName: string;

  @Column({ name: 'customer_phone', length: 50 })
  customerPhone: string;

  @Column({ name: 'delivery_address', length: 300 })
  deliveryAddress: string;

  @Column({ name: 'delivery_city', length: 100 })
  deliveryCity: string;

  @Column({ name: 'delivery_region', length: 100 })
  deliveryRegion: string;

  @Column({ name: 'delivery_country', length: 10, default: 'CO' })
  deliveryCountry: string;

  @Column({ name: 'delivery_postal_code', length: 20 })
  deliveryPostalCode: string;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ name: 'gateway_transaction_id', length: 200, nullable: true })
  gatewayTransactionId: string | null;

  @Column({ name: 'gateway_status', length: 100, nullable: true })
  gatewayStatus: string | null;

  @Column({ name: 'gateway_response', type: 'jsonb', nullable: true })
  gatewayResponse: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
