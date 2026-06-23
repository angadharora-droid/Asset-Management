import { SENSITIVE_CATS } from '../constants/categories.js';

// Suggests a CAPEX / OPEX / Low Value Controlled classification from the
// estimated value, useful-life answer and category — same rules as the
// original artifact.
export function suggestClassification({ estimatedValue, usefulLifeOver12, categoryCode }) {
  const val = parseFloat(estimatedValue) || 0;

  if (val > 30000 && usefulLifeOver12 !== 'No') return 'CAPEX';
  if (val > 0 && val <= 30000) {
    return SENSITIVE_CATS.includes(categoryCode) ? 'Low Value Controlled' : 'OPEX';
  }
  return 'Pending Review';
}
