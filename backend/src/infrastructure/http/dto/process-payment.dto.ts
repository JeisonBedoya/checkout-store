import { IsNotEmpty, IsNumber, IsString, Min, Max, Length, Matches } from 'class-validator';

export class ProcessPaymentDto {
  @IsString()
  @IsNotEmpty()
  @Length(13, 19)
  @Matches(/^\d+$/, { message: 'Card number must contain only digits' })
  cardNumber: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 4)
  @Matches(/^\d+$/, { message: 'CVC must contain only digits' })
  cardCvc: string;

  @IsString()
  @Length(2, 2)
  @Matches(/^(0[1-9]|1[0-2])$/, { message: 'Invalid exp month' })
  cardExpMonth: string;

  @IsString()
  @Length(2, 4)
  cardExpYear: string;

  @IsString()
  @IsNotEmpty()
  cardHolder: string;

  @IsNumber()
  @Min(1)
  @Max(36)
  installments: number;

  @IsString()
  @IsNotEmpty()
  legalId: string;

  @IsString()
  @IsNotEmpty()
  legalIdType: string;
}
