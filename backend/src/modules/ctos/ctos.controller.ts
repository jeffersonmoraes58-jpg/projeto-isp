import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { CtosService } from './ctos.service';
import { CreateCtoDto } from './dto/create-cto.dto';

@Controller('ctos')
export class CtosController {
  constructor(private readonly ctosService: CtosService) {}

  @Post()
  create(@Body() dto: CreateCtoDto) {
    return this.ctosService.create(dto);
  }

  @Get()
  findAll() {
    return this.ctosService.findAll();
  }

  @Get('mapa')
  getMapSummary() {
    return this.ctosService.getMapSummary();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ctosService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateCtoDto>) {
    return this.ctosService.update(id, dto);
  }

  @Get(':id/diagnostico')
  diagnosticar(@Param('id') id: string) {
    return this.ctosService.diagnosticarCorteCabo(id);
  }

  @Put('portas/:portaId/associar')
  associar(
    @Param('portaId') portaId: string,
    @Body('clienteId') clienteId?: string,
    @Body('contratoId') contratoId?: string,
  ) {
    return this.ctosService.associar(portaId, clienteId, contratoId);
  }

  @Delete('portas/:portaId/liberar')
  liberarPorta(@Param('portaId') portaId: string) {
    return this.ctosService.liberarPorta(portaId);
  }
}
