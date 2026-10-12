"use client"

import * as React from "react"
import { useActionState } from "react"
import { cn } from "cn"
import { loginAction, type AuthActionResponse } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SpinnerGapIcon, WarningCircleIcon } from "@phosphor-icons/react"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [state, formAction, isPending] = useActionState<
    AuthActionResponse | null,
    FormData
  >(loginAction, null)

  return (
    <form
      action={formAction}
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Masuk ke Akun Anda</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Masukkan email dan password untuk mengakses sistem ERP
          </p>
        </div>

        {state?.error && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
            <WarningCircleIcon className="size-4 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="admin@bazma.sch.id"
            autoComplete="email"
            required
            disabled={isPending}
          />
        </Field>

        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <a
              href="#"
              className="ml-auto text-sm underline-offset-4 hover:underline text-muted-foreground"
            >
              Lupa password?
            </a>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            disabled={isPending}
          />
        </Field>

        <Field>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <span className="flex items-center gap-2">
                <SpinnerGapIcon className="size-4 animate-spin" />
                Memproses...
              </span>
            ) : (
              "Masuk"
            )}
          </Button>
        </Field>

        <FieldDescription className="text-center">
          Belum memiliki akun? Hubungi administrator sistem.
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
