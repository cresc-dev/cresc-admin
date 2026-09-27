# Insights observation contract

Companion backend: https://github.com/cresc-dev/cresc-go/pull/25

The metric and review corrections are adapted from reactnativecn/pushy-admin #64, source head `0f5bef0f8b45893f53000857bb59680ee76c95a8`. This is an insights-only port, not a repository-wide copy.

## Counts without unsupported conclusions

Remove historical activation UUIDs / today's check UUIDs as coverage, and retained activation / download UUIDs as conversion. Show retained observations separately, with unavailable values distinct from zero. They are neither currently running devices nor permanent complete history.

Version offers, download successes/failures, patch failures, activations and rollbacks are independent report counts. A patch failure can be followed by successful full-download recovery. Experiment offers are not proof of device participation. Ratios state the relevant report population and sample size; rollback labels describe rollback reports only, not overall version health. Shared thresholds apply to the per-app and service-status views.

Request ratios exclude an unavailable request day from both numerator and denominator, including hit outcomes, package requests and refusal details. Independent hourly/device observations remain visible. Explicit observed zero values are valid; legacy device zeroes with no availability status remain unknown. Failure breakdowns consume availability status across all dimensions and distinguish unavailable windows from observed empty filters. Unknown failure reasons merge into a single `other` group. Version glances rank returned candidates by offer-plus-report volume before selecting the first five, without mutating the query cache.

## Preserve the Cresc calendar

Cresc keeps `a2:` UTC-hour storage, hourly event settlement and hourly HLL unions. It aggregates hours into the caller's timezone rather than Pushy's separate fixed business-day/UTC-day readers. Preserve the request adapter, timezone header/profile handling and response `timezone`; billing and quota calendars are not changed.

The server's `window.today` and exact RFC3339 boundaries describe the same read-start snapshot as the data. The client uses that date, not a later browser date or hardcoded UTC+8. For legacy payloads it uses the echoed response timezone, falling back to the browser calendar only when that timezone is absent or invalid. Unknown exact boundaries remain unknown.

Cresc's existing nearest-UTC-hour grid is explicit in `bucketAlignment`. For half-hour and quarter-hour zones, displayed boundaries can differ from local midnight. `incompleteDates` tells the client when an aligned bucket has not finished; near Kolkata midnight, even the previous calendar date can still be incomplete. Daily means exclude today, future dates and every server-marked incomplete date, while keeping those observations visible in charts and window totals. DST 23/25-hour aggregation remains a backend property.

The page displays the actual returned timezone and boundaries, last successful refresh, every-minute refresh cadence, stale-data warnings and best-effort collection limits. It does not import Pushy's legacy UTC/business-calendar notices or Beijing-date fallback. Realtime curves, region panels and release-effectiveness observations keep their existing independent controls and documented scopes.

## Scope and availability

Application summaries use backend totals before top-50 truncation. Legacy responses are labelled returned-version subtotals. Filtering a table does not silently filter an application total. Native-package filtering hides cumulative device and lag metrics that lack a package dimension.

Native-package device observations retain their distinct 14-day availability and `partial/unavailable/expired` states; requests retain 35 days. Peaks are peaks of available observed days, not inferred installation counts. Do not add daily distinct estimates. Missing reports do not establish healthy/no-failure conclusions.

## Localization and product boundaries

English remains the default language. Both canonical locale JSON files contain the corrected keys; there is no runtime override of stale duplicate keys. Only the `app_insights` namespace is migrated, preserving Cresc's independently shipped `app_insights.release` translations and all other product, billing, authentication and administration copy. Keep the target constants file's global types and absence of Pushy-only deployment status keys.

The existing request stack, cookie-session support, Stripe/payment UI, API URLs, package dependencies, build configuration, release metrics, assets and CI gates are unchanged.

## Tests and rollout

Tests retain the source's final metric, null-response, unavailable-population, unknown-reason, filtering, ranking, threshold and rendering regressions. Cresc-specific tests cover returned-zone dates, legacy-zone fallback, stable read-start dates, fractional-zone boundaries and incomplete previous-day exclusion. Existing release-effectiveness and localization checks remain enabled.

Deploy the backend before this console. Old backend responses remain usable with explicit legacy/availability limitations. No schema migration, production-data mutation, merge or deployment is part of the port. True current-version device share and linked-attempt upgrade success require additional collection models and are not fabricated from the existing counters.
