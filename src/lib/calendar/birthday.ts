// Account birthdays use the Gregorian calendar. Observe Feb 29 on Feb 28 in a common year.
export function birthdayGreeting(date: Date, birth: Date): string | undefined {
  const age = date.getFullYear() - birth.getFullYear();
  if (age < 0 || date.getMonth() !== birth.getMonth()) return;
  let day = birth.getDate();
  if (birth.getMonth() === 1 && day === 29) day = new Date(date.getFullYear(), 2, 0).getDate();
  if (date.getDate() !== day) return;
  return age === 0 ? '出生的这一天，欢迎来到世界。' : `${age} 岁生日快乐！`;
}
