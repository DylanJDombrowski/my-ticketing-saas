import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to transform your support workflow?
          </h2>
          <p className="mt-6 text-lg leading-8 text-blue-100">
            Join thousands of teams who trust our platform to deliver
            exceptional customer service. Start your free trial today and see
            the difference.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link href="/register">
              <Button
                size="lg"
                variant="outline"
                className="text-blue-600 border-white hover:bg-white"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link
              href="/login"
              className="text-sm font-semibold leading-6 text-white hover:text-blue-100"
            >
              Already have an account? Sign in <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3 text-center">
            <div>
              <div className="text-2xl font-bold text-white">10,000+</div>
              <div className="text-blue-100">Tickets Processed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">500+</div>
              <div className="text-blue-100">Happy Customers</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">99.9%</div>
              <div className="text-blue-100">Uptime</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
