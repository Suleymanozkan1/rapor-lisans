export function LoadError({ message }: { message: string }) {
  return (
    <div className="notice notice--danger" role="alert">
      <p>{message}</p>
    </div>
  )
}
