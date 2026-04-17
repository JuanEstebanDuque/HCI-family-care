import { Controller, Get, Post, Body, Put, Param, Delete } from '@nestjs/common';
import { TestService } from './test.service';

@Controller('test')
export class TestController {
  constructor(private readonly testService: TestService) {}

  @Post('create')
  create(@Body('message') message: string) {
    if (!message) return { error: "Proporciona un campo 'message' en el JSON" };
    return this.testService.create(message);
  }

  @Get()
  findAll() {
    return this.testService.findAll();
  }

  @Put('update/:id')
  update(@Param('id') id: string, @Body('message') message: string) {
    return this.testService.update(id, message);
  }

  @Delete('delete/:id')
  remove(@Param('id') id: string) {
    return this.testService.remove(id);
  }
}
