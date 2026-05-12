import { IsString, IsOptional, IsUUID, IsInt, Min, Max } from 'class-validator';

export class CreateContratoDto {
  @IsUUID() clienteId: string;
  @IsOptional() @IsString() apelido?: string;

  @IsString() usuarioPppoe: string;
  @IsString() senhaPppoe: string;

  @IsOptional() @IsString() serialOnu?: string;
  @IsOptional() @IsString() macOnu?: string;
  @IsOptional() @IsString() modeloOnu?: string;
  @IsOptional() @IsString() ipFixo?: string;

  @IsOptional() @IsString() logradouro?: string;
  @IsOptional() @IsString() numero?: string;
  @IsOptional() @IsString() complemento?: string;
  @IsOptional() @IsString() bairro?: string;
  @IsOptional() @IsString() cidade?: string;
  @IsOptional() @IsString() uf?: string;
  @IsOptional() @IsString() cep?: string;

  @IsOptional() @IsUUID() planoId?: string;
  @IsOptional() @IsInt() @Min(1) @Max(31) diaVencimento?: number;
}

export class UpdateContratoDto {
  @IsOptional() @IsString() apelido?: string;
  @IsOptional() @IsString() usuarioPppoe?: string;
  @IsOptional() @IsString() senhaPppoe?: string;
  @IsOptional() @IsString() serialOnu?: string;
  @IsOptional() @IsString() macOnu?: string;
  @IsOptional() @IsString() modeloOnu?: string;
  @IsOptional() @IsString() ipFixo?: string;
  @IsOptional() @IsString() logradouro?: string;
  @IsOptional() @IsString() numero?: string;
  @IsOptional() @IsString() complemento?: string;
  @IsOptional() @IsString() bairro?: string;
  @IsOptional() @IsString() cidade?: string;
  @IsOptional() @IsString() uf?: string;
  @IsOptional() @IsString() cep?: string;
  @IsOptional() @IsUUID() planoId?: string;
  @IsOptional() @IsInt() @Min(1) @Max(31) diaVencimento?: number;
}
