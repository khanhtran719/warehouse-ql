import { Popconfirm } from 'antd';
import type { ReactElement } from 'react';

type ConfirmActionProps = {
  title: string;
  description?: string;
  onConfirm: () => void;
  children: ReactElement;
};

export function ConfirmAction({ title, description, onConfirm, children }: ConfirmActionProps) {
  return (
    <Popconfirm title={title} description={description} okText="Đồng ý" cancelText="Bỏ qua" onConfirm={onConfirm}>
      {children}
    </Popconfirm>
  );
}
