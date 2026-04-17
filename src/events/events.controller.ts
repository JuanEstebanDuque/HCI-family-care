import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { EventsService, EventUpdateDto } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post('arduino')
  createFromArduino(@Body() body: EventUpdateDto) {
    return this.eventsService.createFromArduino(body);
  }

  @Get('elder/:id')
  findAllByElder(@Param('id') id: string) {
    return this.eventsService.findAllByElder(id);
  }
}
