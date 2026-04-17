import { Body, Controller, Get, Post } from '@nestjs/common';
import { StatusService, StatusUpdateDto } from './status.service';

@Controller('status')
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Post('update')
  updateStatus(@Body() updateDto: StatusUpdateDto) {
    if (!updateDto || !updateDto.sensor_id || !updateDto.module) {
      return { success: false, error: 'Invalid payload format' };
    }
    return this.statusService.processUpdate(updateDto);
  }

  @Get()
  getAllStatuses() {
    return this.statusService.getAllStatuses();
  }
}
