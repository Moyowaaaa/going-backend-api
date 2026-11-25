import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CheckInDto {
  @ApiProperty({
    description: 'The qrToken from the buyer ticket.',
    example: 'b7f2c1d90e8a4b6fa3c2d1e0f9b8a7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0',
  })
  @IsString()
  @MinLength(10)
  qrToken: string;
}
