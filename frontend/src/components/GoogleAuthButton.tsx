import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { useTranslation } from 'react-i18next'

interface GoogleAuthButtonProps {
  onSuccess: (credential: string) => void
  onError: () => void
}

/** Bouton "Continuer avec Google", utilisé aussi bien pour la connexion que
 * l'inscription — c'est le backend qui décide de l'un ou l'autre selon que
 * l'email Google est déjà associé à un compte (cf. POST /api/auth/google/). */
export function GoogleAuthButton({ onSuccess, onError }: GoogleAuthButtonProps) {
  const { t } = useTranslation()
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

  if (!clientId) {
    return (
      <div
        className="flex w-full cursor-not-allowed items-center justify-center rounded-full border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-400"
        title={t('auth.googleUnavailable')}
      >
        {t('auth.googleUnavailable')}
      </div>
    )
  }

  return (
    <div className="flex justify-center [&>div]:w-full">
      <GoogleLogin
        onSuccess={(credentialResponse: CredentialResponse) => {
          if (credentialResponse.credential) {
            onSuccess(credentialResponse.credential)
          } else {
            onError()
          }
        }}
        onError={onError}
        width="320"
        shape="pill"
        text="continue_with"
      />
    </div>
  )
}
