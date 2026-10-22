import { useQuery } from '@apollo/client';
import { PLACES } from '@/features/persons/graphql/personQueries';

/** Id of the list; a place field refers to it with `list={PLACE_LIST_ID}` */
export const PLACE_LIST_ID = 'place-suggestions';

/**
 * Suggestions for the place fields of a form: the places already used in the family tree. The browser shows the
 * matching ones while typing (`<datalist>`, works with keyboard and screen reader); any other text stays allowed.
 */
export function PlaceSuggestions() {
  // Fresh at every opening of the form – a place entered a moment ago is suggested at once
  const { data } = useQuery<{ places: string[] }>(PLACES, { fetchPolicy: 'network-only' });
  return (
    <datalist id={PLACE_LIST_ID} data-testid="place-suggestions">
      {data?.places.map((place) => (
        <option key={place} value={place} />
      ))}
    </datalist>
  );
}
