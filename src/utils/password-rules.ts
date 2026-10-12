import type { FormRule } from 'antd';
import { isPasswordValid } from '@/utils/helper';

/**
 * Password format rule: empty values pass (leave "required" to a separate
 * rule or the input's required attribute); a non-empty value must satisfy
 * isPasswordValid. Each page passes its own i18n message.
 */
export function passwordFormatRule(message: string): FormRule {
  return {
    validator: (_, value: string) =>
      !value || isPasswordValid(value)
        ? Promise.resolve()
        : Promise.reject(Error(message)),
  };
}

/**
 * Confirm-password rule: the value must equal the `field` value.
 * With allowEmpty, an empty value passes (a separate required rule reports
 * it); without it, an empty value is compared too and fails when the other
 * field has a value.
 */
export function confirmPasswordRule({
  field,
  message,
  allowEmpty,
}: {
  field: string;
  message: string;
  allowEmpty: boolean;
}): FormRule {
  return ({ getFieldValue }) => ({
    validator: (_, value: string) =>
      (allowEmpty && !value) || value === getFieldValue(field)
        ? Promise.resolve()
        : Promise.reject(Error(message)),
  });
}
