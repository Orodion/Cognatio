import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { PersonPicker } from '@/features/persons/components/PersonPicker';

interface PersonChooserProps {
  id: string;
  open: boolean;
  value: string;
  onChoose: (personId: string) => void;
  onClose: () => void;
}

/** Dialog to choose a person of the open family tree */
export function PersonChooser({ id, open, value, onChoose, onClose }: PersonChooserProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>{t('statistics.scope.choosePerson')}</DialogTitle>
      </DialogHeader>
      <PersonPicker id={id} value={value} onChange={onChoose} />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
