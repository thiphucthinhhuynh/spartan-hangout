import { ACTIVITY_TYPE_LABELS, type StudentCardDto } from '@sh/shared';
import { Link } from 'react-router';
import { Avatar } from '../../components/Avatar.js';
import { ConnectButton } from './ConnectButton.js';
import styles from './people.module.css';

/** A student in a list (FR44): name, shared interests, Connect. The name opens the profile. */
export function StudentCard({ student }: { student: StudentCardDto }) {
  return (
    <div className={styles.card}>
      <Avatar name={student.displayName} seed={student.id} />
      <div className={styles.cardBody}>
        <Link to={`/users/${student.id}`} className={styles.name}>
          {student.displayName}
        </Link>
        {student.sharedInterests.length > 0 && (
          <p className={styles.shared}>
            <span className="sr-only">Shared interests: </span>
            {student.sharedInterests.map((type) => (
              <span key={type} className={styles.tag}>
                {ACTIVITY_TYPE_LABELS[type]}
              </span>
            ))}
          </p>
        )}
      </div>
      <div className={styles.cardAction}>
        <ConnectButton studentId={student.id} state={student.connectionState} />
      </div>
    </div>
  );
}
