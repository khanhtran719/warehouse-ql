import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type CurrentUser = { id: string; username: string; role: string; name: string };
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): CurrentUser => {
  return ctx.switchToHttp().getRequest().user;
});
