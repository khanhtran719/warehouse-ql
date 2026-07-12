import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Button } from 'antd';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmAction } from './ConfirmAction';

describe('ConfirmAction', () => {
  it('does not execute an irreversible action until the user confirms', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmAction title="Xác nhận phiếu nhập?" onConfirm={onConfirm}>
        <Button>Xác nhận</Button>
      </ConfirmAction>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(await screen.findByText('Xác nhận phiếu nhập?')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Đồng ý' }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });
});
