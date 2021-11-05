export function isPasswordValid(password: string) {
  return /(?!^[0-9]+$)(?!^[a-z]+$)(?!^[^A-Z]+$)^.{8,16}$/.test(password);
}
