/** Async boundary required by Module Federation before any shared singleton (React) is used. */
void import('./bootstrap').then(({ mount }) => mount());
