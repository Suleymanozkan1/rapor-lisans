'use client'

import { startTransition, type FormEvent } from 'react'

/**
 * React resets a form after its action runs. When the action returns a
 * validation error or a conflict, that would discard everything the admin
 * typed, so these forms submit through onSubmit instead and keep their
 * values. Without JavaScript the form still posts through `action`.
 */
export function keepValuesOnSubmit(dispatch: (fd: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const submitter = (e.nativeEvent as SubmitEvent).submitter
    startTransition(() => dispatch(new FormData(e.currentTarget, submitter)))
  }
}
