import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { RemindersService } from './reminders.service';

@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post()
  create(@Body() body: any) {
    return this.remindersService.create(body);
  }

  @Get(':elderId')
  findByElder(@Param('elderId') elderId: string) {
    return this.remindersService.findByElder(elderId);
  }
  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.remindersService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.remindersService.remove(id);
  }
}
