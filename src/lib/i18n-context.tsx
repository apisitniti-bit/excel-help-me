"use client"

import React, { createContext, useContext, ReactNode } from "react"
import { th } from "./i18n"

type Dictionary = typeof th

const I18nContext = createContext<Dictionary>(th)

export function I18nProvider({ children }: { children: ReactNode }) {
  return (
    <I18nContext.Provider value={th}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  return useContext(I18nContext)
}
