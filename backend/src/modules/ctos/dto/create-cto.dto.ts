import { IsString, IsInt, IsOptional, IsIn, IsNumber, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCtoDto {
  @IsString() nome: string;
  @IsOptional() @IsString() endereco?: string;
  @IsNumber() @Type(() => Number) latitude: number;
  @IsNumber() @Type(() => Number) longitude: number;
  @IsInt() @IsIn([8, 16, 32]) capacidade: number;
  @IsUUID() oltId: string;
  @IsOptional() @IsUUID() ponPortId?: string;
  @IsOptional() @IsString() observacao?: string;
}
