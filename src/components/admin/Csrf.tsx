export function Csrf({ token }: { token: string }) {
  return <input type="hidden" name="csrf" value={token} />
}
