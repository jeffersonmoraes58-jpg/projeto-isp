import { Controller, Get, Post, Put, Param, Body } from '@nestjs/common';
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
}
