import { Controller, Get, Post, Put, Param, Body, Query } from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  create(@Body() dto: CreateClienteDto) {
    return this.clientesService.create(dto);
  }

  @Get()
  findAll(@Query('status') status?: string, @Query('inadimplente') inadimplente?: string) {
    return this.clientesService.findAll({
      status,
      inadimplente: inadimplente === 'true',
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientesService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClienteDto) {
    return this.clientesService.update(id, dto);
  }

  @Put(':id/bloquear')
  bloquear(@Param('id') id: string) {
    return this.clientesService.bloquearPppoe(id);
  }

  @Put(':id/desbloquear')
  desbloquear(@Param('id') id: string) {
    return this.clientesService.desbloquearPppoe(id);
  }
}
