import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.ativo) throw new UnauthorizedException('Credenciais inválidas');

    const valid = await bcrypt.compare(dto.senha, user.senha);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    const payload = { sub: user.id, email: user.email, role: user.role, nome: user.nome };
    return {
      access_token: this.jwt.sign(payload),
      user: { id: user.id, nome: user.nome, email: user.email, role: user.role },
    };
  }

  async criarUsuario(dto: CreateUserDto) {
    const existe = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existe) throw new ConflictException('E-mail já cadastrado');

    const hash = await bcrypt.hash(dto.senha, 10);
    const { senha, ...created } = await this.prisma.user.create({
      data: { nome: dto.nome, email: dto.email, senha: hash, role: dto.role ?? 'OPERADOR' },
    });
    return created;
  }

  async listarUsuarios() {
    return this.prisma.user.findMany({
      select: { id: true, nome: true, email: true, role: true, ativo: true, createdAt: true },
      orderBy: { nome: 'asc' },
    });
  }

  async toggleAtivo(id: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    return this.prisma.user.update({
      where: { id },
      data: { ativo: !user.ativo },
      select: { id: true, nome: true, email: true, role: true, ativo: true },
    });
  }

  async alterarSenha(userId: string, senhaAtual: string, novaSenha: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const valid = await bcrypt.compare(senhaAtual, user.senha);
    if (!valid) throw new UnauthorizedException('Senha atual incorreta');

    const hash = await bcrypt.hash(novaSenha, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { senha: hash } });
    return { message: 'Senha alterada com sucesso' };
  }

  async seedAdmin() {
    const count = await this.prisma.user.count();
    if (count > 0) return;
    const hash = await bcrypt.hash('admin123', 10);
    await this.prisma.user.create({
      data: { nome: 'Administrador', email: 'admin@isp.local', senha: hash, role: 'ADMIN' },
    });
    console.log('Usuário admin criado: admin@isp.local / admin123');
  }
}
