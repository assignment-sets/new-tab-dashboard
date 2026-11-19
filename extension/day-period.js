export function dayPeriod(date) {
  const hour = date.getHours();
  if (hour < 5 || hour >= 20) return 'Night';
  if (hour < 6) return 'Dawn';
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}
