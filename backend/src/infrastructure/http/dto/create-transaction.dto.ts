import { IsEmail, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsEmail()
  customerEmail: string;

  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  @IsString()
  @IsNotEmpty()
  deliveryAddress: string;

  @IsString()
  @IsNotEmpty()
  deliveryCity: string;

  @IsString()
  @IsNotEmpty()
  deliveryRegion: string;

  @IsString()
  @IsNotEmpty()
  deliveryCountry: string;

  @IsString()
  @IsNotEmpty()
  deliveryPostalCode: string;
}
