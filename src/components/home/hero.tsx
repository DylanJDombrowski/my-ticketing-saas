"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, CreditCard, Bell } from "lucide-react";

export function Hero() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
              <Zap className="mr-1.5 h-3.5 w-3.5" />
              Try free - 1 invoice/month, no credit card required
            </span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
            Invoice clients in 60 seconds.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Get paid via Stripe.
            </span>
          </h1>
          <p className="mt-6 text-xl leading-8 text-gray-600 max-w-2xl mx-auto">
            The stupid-simple invoicing tool for freelancers who just want to get paid.
            No projects. No timesheets. No bullshit.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                Sign In
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-sm text-gray-500">
            No credit card required • Free forever plan available
          </p>

          <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-3 lg:gap-12">
            <div className="flex flex-col items-center p-6 rounded-xl bg-white shadow-md hover:shadow-lg transition-shadow">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-gray-900">
                Stupidly Fast
              </h3>
              <p className="mt-2 text-sm text-gray-600 text-center leading-relaxed">
                Create an invoice in 60 seconds. Your clients pay with one click.
              </p>
            </div>

            <div className="flex flex-col items-center p-6 rounded-xl bg-white shadow-md hover:shadow-lg transition-shadow">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                <CreditCard className="h-7 w-7 text-white" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-gray-900">
                Stripe-Native
              </h3>
              <p className="mt-2 text-sm text-gray-600 text-center leading-relaxed">
                Payments go straight to your Stripe account. No middleman.
              </p>
            </div>

            <div className="flex flex-col items-center p-6 rounded-xl bg-white shadow-md hover:shadow-lg transition-shadow">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                <Bell className="h-7 w-7 text-white" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-gray-900">
                Auto Reminders
              </h3>
              <p className="mt-2 text-sm text-gray-600 text-center leading-relaxed">
                One-click payment reminders when invoices go unpaid. No awkward emails.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
        <div
          className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-blue-300 to-purple-300 opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>
    </div>
  );
}
