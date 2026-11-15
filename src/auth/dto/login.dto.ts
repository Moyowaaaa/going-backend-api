import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

export class LoginDto {
  /**
   * Email address of an existing account.
   * @example ada@going.example
   */
  @IsEmail()
  email: string;

  /**
   * Account password. 8 to 72 characters.
   * @example correct-horse-battery
   */
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
