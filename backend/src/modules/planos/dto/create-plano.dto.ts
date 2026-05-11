import { IsString, IsInt, Min, IsNumber } from 'class-validator';

export class CreatePlanoDto {
  @IsString() nome: string;
  @IsInt() @Min(1) velocidadeUp: number;
  @IsInt() @Min(1) velocidadeDn: number;
  @IsNumber() @Min(0) valor: number;
}
