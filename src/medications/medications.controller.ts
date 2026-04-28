import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { MedicationsService } from './medications.service';

@Controller('medications')
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Post()
  create(@Body() createMedicationDto: any) {
    return this.medicationsService.create(createMedicationDto);
  }

  @Get('elder/:id')
  findAllByElder(@Param('id') id: string) {
    return this.medicationsService.findAllByElder(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.medicationsService.remove(id);
  }
}
