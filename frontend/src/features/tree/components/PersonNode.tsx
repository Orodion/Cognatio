import { Handle, Position } from '@xyflow/react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Crosshair, User } from 'lucide-react';
import type { Person } from '@/features/persons/types/person';
import { formatPersonName, formatLifeDates, getInitials } from '@/features/persons/lib/personUtils';
import { Avatar } from '@/components/ui/Avatar';
import { MourningRibbon } from '@/features/persons/components/MourningRibbon';
import { cn } from '@/lib/utils';
import { useAppearanceStore } from '@/stores/appearanceStore';
import { DENSITY, cardStyle } from '@/features/tree/lib/cardStyle';

interface PersonNodeProps {
  data: {
    person: Person;
    /** Highlighted starting person of the view */
    isFocus?: boolean;
    /** Makes the person the focus person; without a callback no button is shown */
    onFocus?: (personId: string) => void;
  };
}

export function PersonNode({ data }: PersonNodeProps) {
  const navigate = useNavigate();
  // Also subscribes to language changes so e.g. the birth name suffix is translated again
  const { t } = useTranslation();
  const { person, isFocus, onFocus } = data;
  // Border colours, corners, density and font are chosen under Settings → Appearance
  const appearance = useAppearanceStore();
  const density = DENSITY[appearance.cardDensity];

  return (
    <div
      className={cn(
        // Fixed width (the layout assumes it): long names wrap instead of widening the card
        'relative flex w-[220px] cursor-pointer flex-col items-center border-solid bg-card shadow-xs transition-shadow hover:shadow-md',
        density.padding,
        isFocus && 'border-primary ring-2 ring-primary',
      )}
      style={cardStyle(appearance, person.gender, !!isFocus)}
      data-testid="person-card"
      data-focus={isFocus || undefined}
      onClick={() => navigate(`/persons/${person.id}`)}
    >
      <Handle type="target" position={Position.Top} className="bg-muted-foreground!" />
      <Handle id="partner-target" type="target" position={Position.Left} className="bg-muted-foreground!" />

      <MourningRibbon person={person} className="absolute left-2 top-2 h-5 w-5" />

      {onFocus && !isFocus && (
        <button
          type="button"
          data-export-hidden="true"
          className="nodrag absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          title={t('tree.focus.set')}
          aria-label={t('tree.focus.setFor', { name: formatPersonName(person) })}
          onClick={(e) => {
            e.stopPropagation();
            onFocus(person.id);
          }}
        >
          <Crosshair className="h-4 w-4" />
        </button>
      )}

      {appearance.showPhoto &&
        (person.profilePictureUrl ? (
          <Avatar initials={getInitials(person)} imageUrl={person.profilePictureUrl} size={density.avatar} className={density.gap} />
        ) : (
          <div className={cn('flex items-center justify-center rounded-full bg-muted', density.iconBox, density.gap)}>
            <User className={cn('text-muted-foreground', density.icon)} />
          </div>
        ))}

      <div className="text-center">
        {/* Real link: reachable by keyboard; clicking the whole card remains for the mouse */}
        <Link
          to={`/persons/${person.id}`}
          className={cn('nodrag wrap-break-word font-semibold hover:underline', density.name)}
          onClick={(e) => e.stopPropagation()}
        >
          {formatPersonName(person)}
        </Link>
        {appearance.showDates && <div className={cn('mt-1 text-muted-foreground', density.dates)}>{formatLifeDates(person)}</div>}
      </div>

      <Handle type="source" position={Position.Bottom} className="bg-muted-foreground!" />
      <Handle id="partner-source" type="source" position={Position.Right} className="bg-muted-foreground!" />
    </div>
  );
}
