import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { CurrentUser, type CurrentUser as CurrentUserValue } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { AdjustStockDto } from './stock-adjustments.dto';
import { StockAdjustmentsService } from './stock-adjustments.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('stock-adjustments')
export class StockAdjustmentsController {
  constructor(private service: StockAdjustmentsService) {}

  @Roles(UserRole.ADMIN)
  @Post('products/:productId')
  adjustProduct(
    @Param('productId') productId: string,
    @Body() dto: AdjustStockDto,
    @CurrentUser() user: CurrentUserValue,
  ) {
    return this.service.adjustProduct(productId, dto, user.id);
  }
}
