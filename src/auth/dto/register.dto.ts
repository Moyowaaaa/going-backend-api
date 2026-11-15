import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

export class RegisterDto {
  /**
   * Email address for the new account. Must be unique.
   * @example ada@going.example
   */
  @IsEmail()
  email: string;

  /**
   * Given name.
   * @example Ada
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  firstName: string;

  /**
   * Family name.
   * @example Lovelace
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  lastName: string;

  /**
   * Password. 8 to 72 characters. Stored as a hash and never returned.
   * @example correct-horse-battery
   */
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
