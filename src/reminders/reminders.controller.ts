import { Controller, Get, Post, Body, Param } from '@nestjs/common';
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
}
