export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Có lỗi xảy ra. Vui lòng thử lại.';
}
