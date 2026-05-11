import { IsString, IsEnum, IsOptional, IsUUID, IsDateString } from 'class-validator';

export enum TipoOS { INSTALACAO = 'INSTALACAO', MANUTENCAO = 'MANUTENCAO', SUPORTE = 'SUPORTE', RETIRADA = 'RETIRADA', VISITA = 'VISITA' }
export enum PrioridadeOS { BAIXA = 'BAIXA', MEDIA = 'MEDIA', ALTA = 'ALTA', URGENTE = 'URGENTE' }

export class CreateOsDto {
  @IsEnum(TipoOS) tipo: TipoOS;
  @IsEnum(PrioridadeOS) @IsOptional() prioridade?: PrioridadeOS;
  @IsString() titulo: string;
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @IsUUID() clienteId?: string;
  @IsOptional() @IsUUID() tecnicoId?: string;
  @IsOptional() @IsString() endereco?: string;
  @IsOptional() @IsDateString() agendadoPara?: string;
}
