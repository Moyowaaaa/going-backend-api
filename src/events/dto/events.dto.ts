import { IsEmail, IsString, MinLength } from 'class-validator';

export class ICreateEventDTO {
  @IsString()
  @MinLength(2)
  title: string;
}
