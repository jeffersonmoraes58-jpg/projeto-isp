import { IsEmail, IsString, MinLength, IsOptional, IsIn } from 'class-validator';

export class CreateUserDto {
  @IsString() nome: string;
  @IsEmail() email: string;
  @IsString() @MinLength(6) senha: string;
  @IsOptional() @IsIn(['ADMIN', 'OPERADOR']) role?: 'ADMIN' | 'OPERADOR';
}
