import type { ActivityCardDto } from '@sh/shared';
import { Link } from 'react-router';
import { CalendarIcon, MapPinIcon } from '../../components/icons.js';
import { formatCardWhen, formatOpenSpots } from '../../lib/format.js';
import styles from './ActivityCard.module.css';
import { ActivityTypeArt, TypeChip } from './ActivityTypeArt.js';

/**
 * An activity in a list (FR15, FR17): title, type, date, start and end time, location and open
 * spots. The whole card opens the detail view (FR18).
 */
export function ActivityCard({ activity }: { activity: ActivityCardDto }) {
  return (
    <Link to={`/activities/${activity.id}`} className={styles.card}>
      <ActivityTypeArt type={activity.type} variant="thumb" />
      <div className={styles.body}>
        <TypeChip type={activity.type} />
        <h3 className={styles.title}>{activity.title}</h3>
        <p className={styles.line}>
          <CalendarIcon width={16} height={16} aria-hidden="true" />
          <span>{formatCardWhen(activity.startAt, activity.endAt)}</span>
        </p>
        <p className={styles.line}>
          <MapPinIcon width={16} height={16} aria-hidden="true" />
          <span>{activity.location}</span>
        </p>
        <span className={styles.spots}>{formatOpenSpots(activity.openSpots)}</span>
      </div>
    </Link>
  );
}
