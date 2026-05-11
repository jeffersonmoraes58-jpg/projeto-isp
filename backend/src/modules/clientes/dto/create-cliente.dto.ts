import { IsString, IsEmail, IsOptional, IsInt, Min, Max, IsUUID } from 'class-validator';

export class CreateClienteDto {
  @IsString() nome: string;
  @IsString() cpfCnpj: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() telefone?: string;
  @IsOptional() @IsString() celular?: string;
  @IsOptional() @IsString() cep?: string;
  @IsOptional() @IsString() logradouro?: string;
  @IsOptional() @IsString() numero?: string;
  @IsOptional() @IsString() complemento?: string;
  @IsOptional() @IsString() bairro?: string;
  @IsOptional() @IsString() cidade?: string;
  @IsOptional() @IsString() uf?: string;

  @IsString() usuarioPppoe: string;
  @IsString() senhaPppoe: string;
  @IsOptional() @IsString() ipFixo?: string;

  @IsOptional() @IsString() serialOnu?: string;
  @IsOptional() @IsString() macOnu?: string;
  @IsOptional() @IsString() modeloOnu?: string;

  @IsOptional() @IsUUID() planoId?: string;
  @IsOptional() @IsInt() @Min(1) @Max(31) diaVencimento?: number;
}
