import { Button, DatePicker, Form, Input, InputNumber, Select, Space } from 'antd';
import dayjs from 'dayjs';
import type { ExportType, Product, VoucherItemInput } from '../types';

type VoucherFormValues = {
  date: dayjs.Dayjs;
  exportType?: ExportType;
  note?: string;
  items: VoucherItemInput[];
};

export type VoucherSubmit = {
  date: string;
  exportType?: ExportType;
  note?: string;
  items: VoucherItemInput[];
};

type VoucherFormProps = {
  products: Product[];
  mode: 'import' | 'export';
  onSubmit: (values: VoucherSubmit) => void;
  loading?: boolean;
};

export function VoucherForm({ products, mode, onSubmit, loading }: VoucherFormProps) {
  const [form] = Form.useForm<VoucherFormValues>();
  const isExport = mode === 'export';

  function submit(values: VoucherFormValues) {
    onSubmit({
      date: values.date.toISOString(),
      exportType: values.exportType,
      note: values.note,
      items: values.items,
    });
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={submit}
      initialValues={{ date: dayjs(), exportType: 'SALE', items: [{ quantity: 1, unitPrice: 0 }] }}
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

      <Form.List name="items">
        {(fields, { add, remove }) => (
          <>
            {fields.map((field) => (
              <div className="line-items" key={field.key}>
                <Space align="start" wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Form.Item {...field} name={[field.name, 'productId']} label="Hàng hoá" rules={[{ required: true }]}>
                    <Select
                      showSearch
                      style={{ width: 260 }}
                      optionFilterProp="label"
                      options={products.map((product) => ({
                        value: product.id,
                        label: `${product.code} - ${product.name}`,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item {...field} name={[field.name, 'quantity']} label="Số lượng" rules={[{ required: true }]}>
                    <InputNumber min={0.001} style={{ width: 130 }} />
                  </Form.Item>
                  <Form.Item {...field} name={[field.name, 'unitPrice']} label={isExport ? 'Giá bán' : 'Giá nhập'} rules={[{ required: true }]}>
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
        Tạo phiếu nháp
      </Button>
    </Form>
  );
}
