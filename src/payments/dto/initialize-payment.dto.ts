import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Where the provider should return the buyer after checkout. The client sends
 * a web URL or an app deep link; the service appends the order reference.
 */
export class InitializePaymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  returnUrl?: string;
}
