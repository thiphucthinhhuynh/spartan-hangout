import {
  ACTIVITY_TYPE_LABELS,
  activitySearchSchema,
  MESSAGES,
  type ActivitySearchCriteria,
  type ActivityType,
} from '@sh/shared';
import { useSearchParams } from 'react-router';
import { PageHeader } from '../../app/layouts/PageHeader.js';
import { XIcon } from '../../components/icons.js';
import { formatShortDate, formatTimeOfDay } from '../../lib/format.js';
import { validateForm } from '../../lib/zodForm.js';
import { ActivityList } from '../activities/ActivityList.js';
import { criteriaToParams, useActivitySearch } from './api.js';
import styles from './discover.module.css';
import { CRITERIA_KEYS, SearchFilters, type CriteriaValues } from './SearchFilters.js';

/** How each criterion reads in the "active filters" row. */
function describe(key: (typeof CRITERIA_KEYS)[number], value: string): string {
  switch (key) {
    case 'type':
      return ACTIVITY_TYPE_LABELS[value as ActivityType] ?? value;
    case 'fromDate':
      return `From ${formatShortDate(value)}`;
    case 'toDate':
      return `Until ${formatShortDate(value)}`;
    case 'earliestStart':
      return `Starts ${formatTimeOfDay(value)} or later`;
    case 'latestStart':
      return `Starts by ${formatTimeOfDay(value)}`;
    case 'location':
      return `“${value}”`;
  }
}

/**
 * Search (FR16–FR17). The criteria live in the URL, so results can be shared, reloaded and reached
 * with Back. Every criterion applies together; with none, every activity FR17 allows is listed.
 */
export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const values = Object.fromEntries(
    CRITERIA_KEYS.map((key) => [key, params.get(key) ?? '']),
  ) as CriteriaValues;

  const validation = validateForm(activitySearchSchema, values);
  let criteria: ActivitySearchCriteria = {};
  if (validation.success) {
    const { page: _page, pageSize: _pageSize, ...rest } = validation.data;
    criteria = rest;
  }
  const search = useActivitySearch(criteria, validation.success);
  const active = CRITERIA_KEYS.filter((key) => values[key] !== '');

  function apply(next: Partial<CriteriaValues>) {
    setParams(criteriaToParams(next), { replace: true });
  }

  function remove(key: (typeof CRITERIA_KEYS)[number]) {
    apply({ ...values, [key]: '' });
  }

  return (
    <>
      <PageHeader title="Search activities" subtitle="Combine any filters you like." />

      <div className={styles.searchLayout}>
        <SearchFilters
          // Remount when the URL changes (Back, a chip, "Clear all") so the form shows it.
          key={params.toString()}
          initial={values}
          errors={validation.success ? {} : validation.errors}
          onSearch={apply}
          onClear={() => apply({})}
        />

        <section aria-labelledby="results-heading" className={styles.results}>
          <h2 id="results-heading" className={styles.sectionTitle}>
            {active.length === 0 ? 'All upcoming activities' : 'Results'}
          </h2>

          {active.length > 0 && (
            <ul className={styles.activeCriteria} aria-label="Active filters">
              {active.map((key) => (
                <li key={key}>
                  <button
                    type="button"
                    className={styles.criterionPill}
                    onClick={() => remove(key)}
                  >
                    {describe(key, values[key])}
                    <XIcon width={14} height={14} aria-hidden="true" />
                    <span className="sr-only"> (remove filter)</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {validation.success ? (
            <ActivityList query={search} emptyTitle={MESSAGES.noActivities} />
          ) : (
            <p className={styles.fieldError}>Fix the highlighted filters to see results.</p>
          )}
        </section>
      </div>
    </>
  );
}
