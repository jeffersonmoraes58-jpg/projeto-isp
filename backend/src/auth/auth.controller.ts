import { Controller, Post, Get, Put, Body, Param, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  me(@Request() req: any) {
    return req.user;
  }

  @Put('me/senha')
  alterarSenha(@Request() req: any, @Body() body: { senhaAtual: string; novaSenha: string }) {
    return this.authService.alterarSenha(req.user.id, body.senhaAtual, body.novaSenha);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post('usuarios')
  criarUsuario(@Body() dto: CreateUserDto) {
    return this.authService.criarUsuario(dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get('usuarios')
  listarUsuarios() {
    return this.authService.listarUsuarios();
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Put('usuarios/:id/toggle')
  toggleAtivo(@Param('id') id: string) {
    return this.authService.toggleAtivo(id);
  }
}
