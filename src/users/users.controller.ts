import { Controller, Get, Post, Body, Param, Put } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  create(@Body() body: any) {
    return this.usersService.create(body);
  }

  @Post('login')
  login(@Body() body: any) {
    return this.usersService.login(body.email, body.password);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // Endpoints para Settings
  @Get(':id/settings')
  getSettings(@Param('id') id: string) {
    // Simula devolver la configuración de Laura
    return {
      alertas: true,
      notificaciones: true,
      privacidad: 'alta',
      volumen: 80
    };
  }

  @Get(':email')
  getUserByEmail(@Param('email') email: string) {
    return this.usersService.findByEmail(email);
  }

  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.usersService.findUserById(id);
  }

  @Put(':id/settings')
  updateSettings(@Param('id') id: string, @Body() body: any) {
    // Simula guardar la configuración
    return { status: 'success', message: 'Configuración actualizada' };
  }
}
