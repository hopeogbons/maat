import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SignInDialog } from './SignInDialog'
import { intendedPath, onSignInRequest } from './signInBridge'

/** Mounted once, so the power button can open the dialog from anywhere. */
export function SignInGate() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => onSignInRequest(() => setOpen(true)), [])

  return (
    <SignInDialog
      open={open}
      onClose={() => setOpen(false)}
      onSignedIn={() => {
        setOpen(false)
        navigate(intendedPath())
      }}
    />
  )
}
