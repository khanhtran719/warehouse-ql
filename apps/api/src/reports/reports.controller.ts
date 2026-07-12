import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DateRangeDto } from './dto';
import { ReportsService } from './reports.service';

@UseGuards(AuthGuard('jwt'))
@Controller('reports')
export class ReportsController {
  constructor(private service: ReportsService) {}
  @Get('overview') overview(@Query() q: DateRangeDto) {
    return this.service.overview(q.from, q.to);
  }
  @Get('daily') daily(@Query() q: DateRangeDto) {
    return this.service.daily(q.from, q.to);
  }
}
