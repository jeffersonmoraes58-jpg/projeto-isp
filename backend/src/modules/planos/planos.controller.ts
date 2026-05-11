import { Controller, Get, Post, Put, Param, Body } from '@nestjs/common';
import { PlanosService } from './planos.service';
import { CreatePlanoDto } from './dto/create-plano.dto';
import { UpdatePlanoDto } from './dto/update-plano.dto';

@Controller('planos')
export class PlanosController {
  constructor(private readonly planosService: PlanosService) {}

  @Post()
  create(@Body() dto: CreatePlanoDto) {
    return this.planosService.create(dto);
  }

  @Get()
  findAll() {
    return this.planosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.planosService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePlanoDto) {
    return this.planosService.update(id, dto);
  }

  @Put(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.planosService.toggleAtivo(id);
  }
}
