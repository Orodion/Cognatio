import { useTranslation } from 'react-i18next';

interface FirstNameUnknownCheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Box "First name unknown": the person is saved with the placeholder, which the app shows in the language of the UI */
export function FirstNameUnknownCheckbox({ id, checked, onChange }: FirstNameUnknownCheckboxProps) {
  const { t } = useTranslation();
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm text-muted-foreground">
      <input id={id} type="checkbox" className="h-4 w-4 accent-primary" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {t('form.firstNameUnknown')}
    </label>
  );
}
