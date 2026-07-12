import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PartnerDto } from './partners.dto';
import { PartnersService } from './partners.service';

describe('PartnersService', () => {
  it('normalizes customer codes and contact fields before storing them', async () => {
    const prisma = {
      customer: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'customer-1', ...data })),
      },
    };
    const service = new PartnersService(prisma as never);

    const result = await service.createCustomer({
      code: ' kh-001 ',
      name: ' Công ty Khách Hàng ',
      phone: ' 0909000000 ',
    });

    expect(result).toMatchObject({ code: 'KH-001', name: 'Công ty Khách Hàng', phone: '0909000000' });
  });

  it('normalizes supplier codes and contact fields before storing them', async () => {
    const prisma = {
      supplier: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'supplier-1', ...data })),
      },
    };
    const service = new PartnersService(prisma as never);

    const result = await service.createSupplier({
      code: ' ncc-001 ',
      name: ' Nhà cung cấp A ',
      taxCode: ' 0123456789 ',
    });

    expect(result).toMatchObject({ code: 'NCC-001', name: 'Nhà cung cấp A', taxCode: '0123456789' });
  });

  it('allows optional contact fields to be cleared from the form', async () => {
    const dto = plainToInstance(PartnerDto, { code: 'KH-001', name: 'Khách A', email: '   ', phone: '' });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.email).toBeUndefined();
    expect(dto.phone).toBeUndefined();
  });
});
