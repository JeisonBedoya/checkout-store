import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpException,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CreateTransactionUseCase } from '../../../application/use-cases/create-transaction.use-case';
import { ProcessPaymentUseCase } from '../../../application/use-cases/process-payment.use-case';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { ProcessPaymentDto } from '../dto/process-payment.dto';
import { Inject } from '@nestjs/common';
import { TRANSACTION_REPOSITORY } from '../../../domain/ports/repositories/transaction.repository.port';
import type { TransactionRepositoryPort } from '../../../domain/ports/repositories/transaction.repository.port';

@Controller('transactions')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class TransactionsController {
  constructor(
    private readonly createTransactionUseCase: CreateTransactionUseCase,
    private readonly processPaymentUseCase: ProcessPaymentUseCase,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: TransactionRepositoryPort,
  ) {}

  @Post()
  async create(@Body() dto: CreateTransactionDto) {
    const result = await this.createTransactionUseCase.execute(dto);
    if (!result.success) {
      throw new HttpException(result.error, HttpStatus.BAD_REQUEST);
    }
    return { data: result.value };
  }

  @Post(':id/pay')
  async pay(@Param('id') id: string, @Body() dto: ProcessPaymentDto) {
    const result = await this.processPaymentUseCase.execute({
      transactionId: id,
      ...dto,
    });
    if (!result.success) {
      throw new HttpException(result.error, HttpStatus.BAD_REQUEST);
    }
    return { data: result.value };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const transaction = await this.transactionRepository.findById(id);
    if (!transaction) {
      throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
    }
    return { data: transaction };
  }
}
