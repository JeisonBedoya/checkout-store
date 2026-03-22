import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { createHash } from 'crypto';
import { firstValueFrom } from 'rxjs';
import {
  PaymentGatewayPort,
  CardTokenRequest,
  CardTokenResponse,
  PaymentRequest,
  PaymentResponse,
} from '../../domain/ports/services/payment-gateway.port';

@Injectable()
export class PaymentGatewayAdapter implements PaymentGatewayPort {
  private readonly logger = new Logger(PaymentGatewayAdapter.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private get baseUrl(): string {
    return this.configService.get<string>('PAYMENT_GATEWAY_URL', 'https://api-sandbox.co.uat.wompi.dev/v1');
  }

  private get publicKey(): string {
    return this.configService.get<string>('PAYMENT_PUBLIC_KEY', '');
  }

  private get privateKey(): string {
    return this.configService.get<string>('PAYMENT_PRIVATE_KEY', '');
  }

  private get integrityKey(): string {
    return this.configService.get<string>('PAYMENT_INTEGRITY_KEY', '');
  }

  async tokenizeCard(card: CardTokenRequest): Promise<CardTokenResponse> {
    const url = `${this.baseUrl}/tokens/cards`;
    this.logger.log(`Tokenizing card ending in ${card.number.slice(-4)}`);

    const response = await firstValueFrom(
      this.httpService.post(
        url,
        {
          number: card.number,
          cvc: card.cvc,
          exp_month: card.expMonth,
          exp_year: card.expYear,
          card_holder: card.cardHolder,
        },
        {
          headers: {
            Authorization: `Bearer ${this.publicKey}`,
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    const data = response.data?.data;
    return {
      token: data.id,
      brand: data.brand,
      lastFour: data.last_four,
      expMonth: data.exp_month,
      expYear: data.exp_year,
    };
  }

  async getAcceptanceToken(): Promise<string> {
    const url = `${this.baseUrl}/merchants/${this.publicKey}`;
    this.logger.log('Fetching acceptance token');

    const response = await firstValueFrom(this.httpService.get(url));
    return response.data?.data?.presigned_acceptance?.acceptance_token;
  }

  generateIntegritySignature(reference: string, amountInCents: number, currency: string): string {
    const raw = `${reference}${amountInCents}${currency}${this.integrityKey}`;
    return createHash('sha256').update(raw).digest('hex');
  }

  async processPayment(request: PaymentRequest, acceptanceToken: string): Promise<PaymentResponse> {
    const url = `${this.baseUrl}/transactions`;
    const signature = this.generateIntegritySignature(
      request.reference,
      request.amountInCents,
      request.currency,
    );

    this.logger.log(`Processing payment for reference ${request.reference}`);

    const payload = {
      acceptance_token: acceptanceToken,
      amount_in_cents: request.amountInCents,
      currency: request.currency,
      customer_email: request.customerEmail,
      payment_method: {
        type: 'CARD',
        installments: request.installments,
        token: request.cardToken,
      },
      reference: request.reference,
      signature,
      customer_data: {
        phone_number: request.customerPhone,
        full_name: request.customerName,
        legal_id: request.legalId,
        legal_id_type: request.legalIdType,
      },
      shipping_address: {
        address_line_1: request.deliveryAddress,
        country: request.deliveryCountry,
        region: request.deliveryRegion,
        city: request.deliveryCity,
        phone_number: request.customerPhone,
        postal_code: request.deliveryPostalCode,
      },
    };

    const response = await firstValueFrom(
      this.httpService.post(url, payload, {
        headers: {
          Authorization: `Bearer ${this.privateKey}`,
          'Content-Type': 'application/json',
        },
      }),
    );

    const txData = response.data?.data;
    const status = txData?.status;

    return {
      gatewayTransactionId: txData?.id ?? '',
      status: this.mapStatus(status),
      statusMessage: txData?.status_message ?? status,
      rawResponse: response.data,
    };
  }

  private mapStatus(status: string): PaymentResponse['status'] {
    const map: Record<string, PaymentResponse['status']> = {
      APPROVED: 'APPROVED',
      DECLINED: 'DECLINED',
      PENDING: 'PENDING',
      VOIDED: 'VOIDED',
      ERROR: 'ERROR',
    };
    return map[status] ?? 'ERROR';
  }
}
