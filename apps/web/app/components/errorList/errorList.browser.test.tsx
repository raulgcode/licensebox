import { render } from 'vitest-browser-react';
import { ErrorList } from './errorList';
import { page } from 'vitest/browser';

test('Should render nothing when there are no errors', async () => {
  render(<ErrorList errors={undefined} />);
  await expect.element(page.getByRole('listitem')).not.toBeInTheDocument();
});

test('Should render error messages when errors are provided', async () => {
  render(
    <ErrorList
      errors={{
        email: ['Email is required', 'Email must be valid'],
        password: ['Password is required'],
      }}
    />,
  );

  await expect.element(page.getByText('Email is required')).toBeVisible();
  await expect.element(page.getByText('Email must be valid')).toBeVisible();
  await expect.element(page.getByText('Password is required')).toBeVisible();
});
