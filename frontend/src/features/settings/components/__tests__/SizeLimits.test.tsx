import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { SET_SIZE_LIMITS, SIZE_LIMITS } from '@/features/settings/graphql/systemQueries';
import { gbToMb } from '@/features/settings/lib/sizeLimits';
import { SizeLimits } from '../SizeLimits';

// Tests run in cimode: texts are the keys themselves
const limits = (importMb = 2048, backupMb = 2048) => ({
  __typename: 'SizeLimits',
  importMb,
  backupMb,
  defaultMb: 2048,
  minMb: 64,
  maxMb: 1048576,
});

const query = (importMb?: number, backupMb?: number): MockedResponse => ({
  request: { query: SIZE_LIMITS },
  result: { data: { sizeLimits: limits(importMb, backupMb) } },
  maxUsageCount: Infinity,
});

async function setup(mocks: MockedResponse[] = [query()]) {
  render(
    <MockedProvider mocks={mocks}>
      <SizeLimits />
    </MockedProvider>,
  );
  return {
    importField: (await screen.findByLabelText('settings.limits.import')) as HTMLInputElement,
    backupField: screen.getByLabelText('settings.limits.backup') as HTMLInputElement,
    save: screen.getByRole('button', { name: 'settings.limits.save' }),
    reset: screen.getByRole('button', { name: 'settings.limits.reset' }),
  };
}

describe('gbToMb', () => {
  it('turns gigabytes into whole megabytes within the allowed range', () => {
    const range = { minMb: 64, maxMb: 1048576 };
    expect(gbToMb('2', range)).toBe(2048);
    expect(gbToMb('1,5', range)).toBe(1536);
    expect(gbToMb('0.0625', range)).toBe(64);
    expect(gbToMb('0.05', range)).toBeNull();
    expect(gbToMb('1025', range)).toBeNull();
    expect(gbToMb('', range)).toBeNull();
    expect(gbToMb('viel', range)).toBeNull();
  });
});

describe('SizeLimits', () => {
  it('shows the limits in gigabytes without a warning', async () => {
    const { importField, backupField, save, reset } = await setup([query(2048, 3072)]);

    await waitFor(() => expect(backupField.value).toBe('3'));
    expect(importField.value).toBe('2');
    expect(screen.queryByText('settings.limits.memoryWarning')).toBeNull();
    // nothing changed, nothing to restore
    expect(save).toBeDisabled();
    expect(reset).toBeEnabled();
  });

  it('warns above 4 GB that twice the file size is needed as memory', async () => {
    const { importField } = await setup();

    fireEvent.change(importField, { target: { value: '4' } });
    expect(screen.queryByText('settings.limits.memoryWarning')).toBeNull();

    fireEvent.change(importField, { target: { value: '4.5' } });
    expect(screen.getByText('settings.limits.memoryWarning')).toBeInTheDocument();
  });

  it('saves the new limits in megabytes and confirms', async () => {
    const saved = limits(8192, 2048);
    let called = false;
    const { importField, save } = await setup([
      query(),
      {
        request: { query: SET_SIZE_LIMITS, variables: { importMb: 8192, backupMb: 2048 } },
        result: () => {
          called = true;
          return { data: { setSizeLimits: saved } };
        },
      },
    ]);

    fireEvent.change(importField, { target: { value: '8' } });
    fireEvent.click(save);

    expect(await screen.findByText('settings.limits.saved')).toBeInTheDocument();
    expect(called).toBe(true);
  });

  it('does not save an invalid value', async () => {
    const { importField, save } = await setup();

    fireEvent.change(importField, { target: { value: '0.01' } });
    expect(save).toBeDisabled();
    expect(importField).toHaveAttribute('aria-invalid', 'true');
  });

  it('puts the default back into the fields', async () => {
    const { importField, backupField, reset } = await setup([query(6144, 10240)]);
    await waitFor(() => expect(importField.value).toBe('6'));

    fireEvent.click(reset);

    expect(importField.value).toBe('2');
    expect(backupField.value).toBe('2');
    expect(reset).toBeDisabled();
  });
});
