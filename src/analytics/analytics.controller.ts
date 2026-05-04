import { Controller, Get, Param } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard/:elderId')
  getDashboard(@Param('elderId') elderId: string) {
    return this.analyticsService.getDashboard(elderId);
  }

  @Get('patterns/:elderId')
  getPatterns(@Param('elderId') elderId: string) {
    return this.analyticsService.getPatterns(elderId);
  }

  @Get('timeline/:elderId')
  getTimeline(@Param('elderId') elderId: string) {
    return this.analyticsService.getTimeline(elderId);
  }

  @Get('routine/:elderId')
  getDailyRoutine(@Param('elderId') elderId: string) {
    return this.analyticsService.getDailyRoutine(elderId);
  }
}
