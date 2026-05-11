import { Controller, Get, Post, Put, Param, Body, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
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

  @Get('exportar')
  async exportar(
    @Query('status') status: string | undefined,
    @Query('inadimplente') inadimplente: string | undefined,
    @Res() res: Response,
  ) {
    const csv = await this.clientesService.exportarCsv({
      status,
      inadimplente: inadimplente === 'true',
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="clientes.csv"');
    res.send('﻿' + csv);
  }

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('inadimplente') inadimplente?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.clientesService.findAll({
      status,
      inadimplente: inadimplente === 'true',
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
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
