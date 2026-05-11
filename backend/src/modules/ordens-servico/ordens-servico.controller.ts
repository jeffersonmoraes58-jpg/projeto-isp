import { Controller, Get, Post, Put, Param, Body, Query } from '@nestjs/common';
import { OrdensServicoService } from './ordens-servico.service';
import { CreateOsDto } from './dto/create-os.dto';

@Controller('ordens-servico')
export class OrdensServicoController {
  constructor(private readonly service: OrdensServicoService) {}

  @Get('stats')
  getStats() { return this.service.getStats(); }

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('tipo') tipo?: string,
    @Query('tecnicoId') tecnicoId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      status, tipo, tecnicoId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() dto: CreateOsDto) { return this.service.create(dto); }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto); }

  @Put(':id/iniciar')
  iniciar(@Param('id') id: string) { return this.service.iniciar(id); }

  @Put(':id/concluir')
  concluir(@Param('id') id: string, @Body('observacaoTecnico') obs?: string) {
    return this.service.concluir(id, obs);
  }

  @Put(':id/cancelar')
  cancelar(@Param('id') id: string) { return this.service.cancelar(id); }
}
