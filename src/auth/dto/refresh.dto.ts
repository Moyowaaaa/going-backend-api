import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RefreshDto {
  /**
   * Refresh token from a login or previous refresh response.
   * @example 9f2c41a7b6e84d3f0a5c11e9d7b2a8f4c6e0d3b1a9f7c5e2d8b4a6f0c3e1d9b7a5f2c4e8
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  refreshToken: string;
}

export class LogoutDto {
  /**
   * Refresh token to revoke. Omit it to revoke every session of the caller.
   * @example 9f2c41a7b6e84d3f0a5c11e9d7b2a8f4c6e0d3b1a9f7c5e2d8b4a6f0c3e1d9b7a5f2c4e8
   */
  @IsOptional()
  @IsString()
  @MaxLength(512)
  refreshToken?: string;
}
