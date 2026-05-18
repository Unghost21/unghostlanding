// Registration payload validation. Pure function, no deps.

const VALID_TRACKS = ['Tech', 'Sales', 'Marketing', 'Social Media', 'Freelancing', 'Founders'];
const VALID_YEARS = ['1st', '2nd', '3rd', '4th', 'Graduate'];

const URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

function validateRegistration(b) {
  const errors = [];
  const req = (k, max = 200) => {
    if (!b[k] || typeof b[k] !== 'string' || !b[k].trim()) errors.push(`${k} is required`);
    else if (b[k].length > max) errors.push(`${k} too long`);
  };
  const opt = (k, max = 300) => {
    if (b[k] && (typeof b[k] !== 'string' || b[k].length > max)) errors.push(`${k} invalid`);
  };

  req('name', 100);
  req('email', 150);
  req('phone', 25);
  req('college', 200);
  req('city', 100);
  req('track', 50);
  req('study_year', 20);
  req('motivation', 1000);
  opt('portfolio_url', 300);
  opt('linkedin_url', 300);
  opt('github_url', 300);

  if (b.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email)) errors.push('invalid email');
  if (b.phone && !/^[\d\s+()\-]{7,25}$/.test(b.phone)) errors.push('invalid phone');
  if (b.track && !VALID_TRACKS.includes(b.track)) errors.push('invalid track');
  if (b.study_year && !VALID_YEARS.includes(b.study_year)) errors.push('invalid study_year');
  if (b.motivation && b.motivation.trim().length < 50) errors.push('motivation must be at least 50 characters');

  for (const k of ['portfolio_url', 'linkedin_url', 'github_url']) {
    if (b[k] && b[k].trim() && !URL_RE.test(b[k].trim())) errors.push(`${k} must be a valid URL`);
  }

  return errors;
}

module.exports = { validateRegistration, VALID_TRACKS, VALID_YEARS };
