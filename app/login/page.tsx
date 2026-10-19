"use client"
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form"
import { RowsIcon } from "@phosphor-icons/react"

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <RowsIcon className="size-4" />
            </div>
            ERP Bazma
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <Suspense fallback={<LoginForm />}>
              <LoginFormFromQuery searchParams={searchParams} />
            </Suspense>
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-background to-secondary/30 flex items-center justify-center p-12">
          <div className="max-w-md space-y-4 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Sistem Informasi ERP Bazma</h2>
            <p className="text-muted-foreground text-sm">
              Platform terintegrasi untuk pengelolaan data operasional, akademik, dan inventaris sekolah.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

async function LoginFormFromQuery({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const params = await searchParams;
  const callbackUrl = Array.isArray(params.callbackUrl) ? params.callbackUrl[0] : params.callbackUrl;
  return <LoginForm callbackUrl={callbackUrl} />;
}
