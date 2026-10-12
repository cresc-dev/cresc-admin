import { describe, expect, test } from 'bun:test';
import type { FormInstance, FormRule } from 'antd';
import { confirmPasswordRule, passwordFormatRule } from './password-rules';

/** Runs the rule's validator; `fields` stands in for the other form values. */
async function runRule(
  rule: FormRule,
  value: string | undefined,
  fields: Record<string, string | undefined> = {},
) {
  const form = {
    getFieldValue: (name: string) => fields[name],
  } as unknown as FormInstance;
  const resolved = typeof rule === 'function' ? rule(form) : rule;
  try {
    // Only the validator result matters here; the rule argument is unused.
    await resolved.validator?.({} as never, value, () => {});
    return null;
  } catch (error) {
    return (error as Error).message;
  }
}

describe('passwordFormatRule', () => {
  const rule = passwordFormatRule('bad format');

  test('empty values pass', async () => {
    expect(await runRule(rule, '')).toBeNull();
    expect(await runRule(rule, undefined)).toBeNull();
  });

  test('a valid password passes', async () => {
    expect(await runRule(rule, 'Passw0rd')).toBeNull();
  });

  test('an invalid password reports the given message', async () => {
    expect(await runRule(rule, 'short')).toBe('bad format');
  });
});

describe('confirmPasswordRule', () => {
  test('passes when it matches the target field', async () => {
    const rule = confirmPasswordRule({
      field: 'pwd',
      message: 'mismatch',
      allowEmpty: false,
    });
    expect(await runRule(rule, 'Passw0rd', { pwd: 'Passw0rd' })).toBeNull();
    expect(await runRule(rule, 'Other0rd', { pwd: 'Passw0rd' })).toBe(
      'mismatch',
    );
  });

  test('allowEmpty=false compares empty values too', async () => {
    const rule = confirmPasswordRule({
      field: 'pwd',
      message: 'mismatch',
      allowEmpty: false,
    });
    expect(await runRule(rule, '', { pwd: 'Passw0rd' })).toBe('mismatch');
    expect(await runRule(rule, undefined, { pwd: undefined })).toBeNull();
  });

  test('allowEmpty=true lets empty values through', async () => {
    const rule = confirmPasswordRule({
      field: 'newPassword',
      message: 'mismatch',
      allowEmpty: true,
    });
    expect(await runRule(rule, '', { newPassword: 'Passw0rd' })).toBeNull();
    expect(await runRule(rule, 'Other0rd', { newPassword: 'Passw0rd' })).toBe(
      'mismatch',
    );
  });
});
