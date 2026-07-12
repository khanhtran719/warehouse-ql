import { Button, DatePicker, Form, Input, InputNumber, Select, Space } from 'antd';
import dayjs from 'dayjs';
import type { ExportType, Partner, Product, VoucherItemInput } from '../types';

type VoucherFormValues = {
  date: dayjs.Dayjs;
  exportType?: ExportType;
  partnerId?: string;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerTaxCode?: string;
  supplierName?: string;
  supplierAddress?: string;
  supplierPhone?: string;
  supplierTaxCode?: string;
  note?: string;
  items: VoucherItemInput[];
};

export type VoucherSubmit = {
  date: string;
  exportType?: ExportType;
  partnerId?: string;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerTaxCode?: string;
  supplierName?: string;
  supplierAddress?: string;
  supplierPhone?: string;
  supplierTaxCode?: string;
  note?: string;
  items: VoucherItemInput[];
};

type VoucherFormProps = {
  products: Product[];
  mode: 'import' | 'export';
  onSubmit: (values: VoucherSubmit) => void;
  loading?: boolean;
  initialValue?: VoucherSubmit;
  submitLabel?: string;
  onProductSearch?: (search: string) => void;
  productsLoading?: boolean;
  partners?: Partner[];
  onPartnerSearch?: (search: string) => void;
  partnersLoading?: boolean;
};

export function VoucherForm({
  products,
  mode,
  onSubmit,
  loading,
  initialValue,
  submitLabel = 'Lưu phiếu nháp',
  onProductSearch,
  productsLoading,
  partners = [],
  onPartnerSearch,
  partnersLoading,
}: VoucherFormProps) {
  const [form] = Form.useForm<VoucherFormValues>();
  const selectedPartnerId = Form.useWatch('partnerId', form);
  const isExport = mode === 'export';

  function submit(values: VoucherFormValues) {
    onSubmit({
      date: values.date.format('YYYY-MM-DD'),
      exportType: values.exportType,
      partnerId: values.partnerId,
      customerName: values.customerName,
      customerAddress: values.customerAddress,
      customerPhone: values.customerPhone,
      customerTaxCode: values.customerTaxCode,
      supplierName: values.supplierName,
      supplierAddress: values.supplierAddress,
      supplierPhone: values.supplierPhone,
      supplierTaxCode: values.supplierTaxCode,
      note: values.note,
      items: values.items,
    });
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={submit}
      initialValues={{
        date: initialValue ? dayjs(initialValue.date) : dayjs(),
        exportType: initialValue?.exportType ?? 'SALE',
        partnerId: initialValue?.partnerId,
        customerName: initialValue?.customerName,
        customerAddress: initialValue?.customerAddress,
        customerPhone: initialValue?.customerPhone,
        customerTaxCode: initialValue?.customerTaxCode,
        supplierName: initialValue?.supplierName,
        supplierAddress: initialValue?.supplierAddress,
        supplierPhone: initialValue?.supplierPhone,
        supplierTaxCode: initialValue?.supplierTaxCode,
        note: initialValue?.note,
        items: initialValue?.items ?? [{ quantity: 1, unitPrice: 0 }],
      }}
    >
      <div className="form-grid">
        <Form.Item name="date" label={isExport ? 'Ngày xuất' : 'Ngày nhập'} rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        {isExport && (
          <Form.Item name="exportType" label="Loại xuất">
            <Select
              options={[
                { value: 'SALE', label: 'Bán hàng' },
                { value: 'INTERNAL', label: 'Nội bộ' },
                { value: 'DAMAGE', label: 'Hư hỏng/mất' },
              ]}
            />
          </Form.Item>
        )}
      </div>

      <Form.Item name="partnerId" label={isExport ? 'Chọn khách hàng' : 'Chọn nhà cung cấp'}>
        <Select
          allowClear
          showSearch
          placeholder={isExport ? 'Tìm và chọn khách hàng' : 'Tìm và chọn nhà cung cấp'}
          filterOption={onPartnerSearch ? false : undefined}
          onSearch={onPartnerSearch}
          loading={partnersLoading}
          options={partners.map((partner) => ({ value: partner.id, label: `${partner.code} - ${partner.name}` }))}
          onChange={(partnerId) => {
            const partner = partners.find((item) => item.id === partnerId);
            if (!partner) return;
            form.setFieldsValue(
              isExport
                ? {
                    customerName: partner.name,
                    customerAddress: partner.address ?? undefined,
                    customerPhone: partner.phone ?? undefined,
                    customerTaxCode: partner.taxCode ?? undefined,
                  }
                : {
                    supplierName: partner.name,
                    supplierAddress: partner.address ?? undefined,
                    supplierPhone: partner.phone ?? undefined,
                    supplierTaxCode: partner.taxCode ?? undefined,
                  },
            );
          }}
        />
      </Form.Item>

      {isExport && (
        <>
          <div className="form-grid">
            <Form.Item name="customerName" label="Tên khách hàng trên phiếu">
              <Input disabled={Boolean(selectedPartnerId)} />
            </Form.Item>
            <Form.Item name="customerAddress" label="Địa chỉ">
              <Input disabled={Boolean(selectedPartnerId)} />
            </Form.Item>
            <Form.Item name="customerPhone" label="Điện thoại">
              <Input disabled={Boolean(selectedPartnerId)} />
            </Form.Item>
            <Form.Item name="customerTaxCode" label="Mã số thuế">
              <Input disabled={Boolean(selectedPartnerId)} />
            </Form.Item>
          </div>
        </>
      )}

      {!isExport && (
        <div className="form-grid">
          <Form.Item name="supplierName" label="Tên nhà cung cấp trên phiếu">
            <Input disabled={Boolean(selectedPartnerId)} />
          </Form.Item>
          <Form.Item name="supplierAddress" label="Địa chỉ">
            <Input disabled={Boolean(selectedPartnerId)} />
          </Form.Item>
          <Form.Item name="supplierPhone" label="Điện thoại">
            <Input disabled={Boolean(selectedPartnerId)} />
          </Form.Item>
          <Form.Item name="supplierTaxCode" label="Mã số thuế">
            <Input disabled={Boolean(selectedPartnerId)} />
          </Form.Item>
        </div>
      )}

      <Form.List name="items">
        {(fields, { add, remove }) => (
          <>
            {fields.map((field) => (
              <div className="line-items" key={field.key}>
                <Space align="start" wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Form.Item name={[field.name, 'productId']} label="Hàng hoá" rules={[{ required: true }]}>
                    <Select
                      showSearch
                      style={{ width: 260 }}
                      optionFilterProp="label"
                      filterOption={onProductSearch ? false : undefined}
                      onSearch={onProductSearch}
                      loading={productsLoading}
                      options={products.map((product) => ({
                        value: product.id,
                        label: `${product.code} - ${product.name}`,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item name={[field.name, 'quantity']} label="Số lượng" rules={[{ required: true }]}>
                    <InputNumber min={0.001} style={{ width: 130 }} />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'unitPrice']}
                    label={isExport ? 'Giá bán' : 'Giá nhập'}
                    rules={[{ required: true }]}
                  >
                    <InputNumber min={0} style={{ width: 150 }} />
                  </Form.Item>
                  <Button danger onClick={() => remove(field.name)} disabled={fields.length === 1}>
                    Xoá
                  </Button>
                </Space>
              </div>
            ))}
            <Button onClick={() => add({ quantity: 1, unitPrice: 0 })}>+ Thêm dòng hàng</Button>
          </>
        )}
      </Form.List>

      <Form.Item name="note" label="Ghi chú" style={{ marginTop: 16 }}>
        <Input.TextArea rows={2} />
      </Form.Item>

      <Button type="primary" htmlType="submit" loading={loading}>
        {submitLabel}
      </Button>
    </Form>
  );
}
