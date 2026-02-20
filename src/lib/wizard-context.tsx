"use client"

import React, { createContext, useContext, useState, ReactNode, Suspense } from "react"
import { useQueryState, parseAsStringEnum } from "nuqs"
import { WizardStep } from "@/types"

interface WizardContextType {
  step: WizardStep
  setStep: (step: WizardStep) => void
  error: string | null
  setError: (error: string | null) => void
  isLoading: boolean
  setLoading: (loading: boolean) => void
  resetWizard: () => void
}

const WizardContext = createContext<WizardContextType | undefined>(undefined)

function WizardProviderContent({ children }: { children: ReactNode }) {
  const [urlStep, setUrlStep] = useQueryState(
    "step",
    parseAsStringEnum<WizardStep>(Object.values(["upload", "configure", "preview"]) as WizardStep[])
      .withDefault("upload")
  )
  
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const resetWizard = () => {
    setUrlStep("upload")
    setError(null)
    setLoading(false)
  }

  return (
    <WizardContext.Provider
      value={{
        step: urlStep,
        setStep: setUrlStep,
        error,
        setError,
        isLoading: loading,
        setLoading,
        resetWizard,
      }}
    >
      {children}
    </WizardContext.Provider>
  )
}

export function WizardProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <WizardProviderContent>{children}</WizardProviderContent>
    </Suspense>
  )
}

export function useWizard() {
  const context = useContext(WizardContext)
  if (context === undefined) {
    // For Next.js prerendering, return a safe default instead of throwing
    return {
      step: "upload" as WizardStep,
      setStep: () => {},
      error: null,
      setError: () => {},
      isLoading: false,
      setLoading: () => {},
      resetWizard: () => {},
    }
  }
  return context
}
