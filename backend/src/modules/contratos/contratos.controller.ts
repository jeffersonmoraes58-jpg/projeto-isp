import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ContratosService } from './contratos.service';
import { CreateContratoDto, UpdateContratoDto } from './dto/create-contrato.dto';

@Controller('contratos')
export class ContratosController {
  constructor(private readonly contratosService: ContratosService) {}

  @Get()
  findByCliente(@Query('clienteId') clienteId: string) {
    return this.contratosService.findByCliente(clienteId);
  }

  @Post()
  create(@Body() dto: CreateContratoDto) {
    return this.contratosService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContratoDto) {
    return this.contratosService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contratosService.remove(id);
  }

  @Put(':id/bloquear')
  bloquear(@Param('id') id: string) {
    return this.contratosService.bloquear(id);
  }

  @Put(':id/desbloquear')
  desbloquear(@Param('id') id: string) {
    return this.contratosService.desbloquear(id);
  }
}
