import { Controller, Get, Put, Param, Query } from '@nestjs/common';
import { AlarmesService } from './alarmes.service';

@Controller('alarmes')
export class AlarmesController {
  constructor(private readonly alarmesService: AlarmesService) {}

  @Get()
  findAll(@Query('resolvido') resolvido?: string) {
    if (resolvido === undefined) return this.alarmesService.findAll();
    return this.alarmesService.findAll(resolvido === 'true');
  }

  @Put(':id/resolver')
  resolver(@Param('id') id: string) {
    return this.alarmesService.resolver(id);
  }
}
