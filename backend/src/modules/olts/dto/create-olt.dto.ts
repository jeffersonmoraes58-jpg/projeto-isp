import { IsString, IsInt, IsOptional, IsBoolean, Min, Max } from 'class-validator';

export class CreateOltDto {
  @IsString() nome: string;
  @IsString() ip: string;
  @IsString() marca: string;
  @IsString() modelo: string;
  @IsOptional() @IsInt() @Min(1) @Max(65535) portaGerencia?: number;
  @IsOptional() @IsString() comunidadeSnmp?: string;
  @IsOptional() @IsString() versaoSnmp?: string;
  @IsOptional() @IsString() usuario?: string;
  @IsOptional() @IsString() senha?: string;
  @IsOptional() @IsBoolean() ativo?: boolean;
}
