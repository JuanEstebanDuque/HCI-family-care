import { Controller, Get, Post, Body } from '@nestjs/common';
import { PairingsService } from './pairings.service';

@Controller('pairings')
export class PairingsController {
  constructor(private readonly pairingsService: PairingsService) {}

  @Post()
  create(@Body('caregiver_id') caregiver_id: string, @Body('elder_id') elder_id: string) {
    return this.pairingsService.create(caregiver_id, elder_id);
  }

  @Get()
  findAll() {
    return this.pairingsService.findAll();
  }
}
