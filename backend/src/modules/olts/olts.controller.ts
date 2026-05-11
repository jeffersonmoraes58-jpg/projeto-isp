import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { OltsService } from './olts.service';
import { CreateOltDto } from './dto/create-olt.dto';
import { UpdateOltDto } from './dto/update-olt.dto';

@Controller('olts')
export class OltsController {
  constructor(private readonly oltsService: OltsService) {}

  @Post()
  create(@Body() dto: CreateOltDto) {
    return this.oltsService.create(dto);
  }

  @Get()
  findAll() {
    return this.oltsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.oltsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOltDto) {
    return this.oltsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.oltsService.remove(id);
  }

  @Get(':id/testar')
  testarConexao(@Param('id') id: string) {
    return this.oltsService.testarConexao(id);
  }

  @Post(':id/provisionar')
  provisionar(
    @Param('id') id: string,
    @Body() body: { serial: string; ponSlot: number; ponPorta: number; onuId: number },
  ) {
    return this.oltsService.provisionarOnu(id, body.serial, body.ponSlot, body.ponPorta, body.onuId);
  }
}
