import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/current-user.decorator';
import { CreateImportDto, ListVoucherDto } from './dto';
import { StockImportsService } from './stock-imports.service';

@UseGuards(AuthGuard('jwt'))
@Controller('stock-imports')
export class StockImportsController {
  constructor(private service: StockImportsService) {}
  @Get() list(@Query() q: ListVoucherDto) { return this.service.list(q); }
  @Post() create(@Body() dto: CreateImportDto, @CurrentUser() user: CurrentUser) { return this.service.create(dto, user.id); }
  @Get(':id') get(@Param('id') id: string) { return this.service.get(id); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: CreateImportDto) { return this.service.update(id, dto); }
  @Post(':id/confirm') confirm(@Param('id') id: string, @CurrentUser() user: CurrentUser) { return this.service.confirm(id, user.id); }
  @Post(':id/cancel') cancel(@Param('id') id: string) { return this.service.cancel(id); }
}
