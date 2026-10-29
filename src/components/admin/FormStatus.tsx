import type { ActionState } from '@/app/admin/actions'

export function FormStatus({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <div className="notice notice--danger" role="alert">
        <p>{state.error}</p>
        {state.fields ? (
          <ul>
            {Object.entries(state.fields).map(([k, v]) => (
              <li key={k}>
                {k}: {v}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    )
  }
  if (state.ok) {
    return (
      <div className="notice notice--ok" role="status">
        <p>{state.ok}</p>
      </div>
    )
  }
  return null
}
