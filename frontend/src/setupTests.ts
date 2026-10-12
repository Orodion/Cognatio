import '@testing-library/jest-dom/vitest';
import i18n from '@/i18n';

// Output translation keys instead of texts: tests stay independent of wording and language
void i18n.changeLanguage('cimode');
