import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Try Billable for free",
    features: [
      "1 invoice per month",
      "Up to 3 clients",
      "Basic time tracking",
      "Client management",
      "Email support",
      "No credit card required",
    ],
    cta: "Get Started Free",
    popular: false,
    featured: false,
  },
  {
    name: "Starter",
    price: "$19",
    period: "/month",
    description: "Perfect for freelancers",
    features: [
      "Unlimited invoices",
      "Unlimited clients",
      "Time tracking & reporting",
      "Accept online payments",
      "Custom branding",
      "Email support",
      "Mobile app access",
    ],
    cta: "Start 14-Day Trial",
    popular: true,
    featured: false,
  },
  {
    name: "Professional",
    price: "$49",
    period: "/month",
    description: "Best for small teams",
    features: [
      "Everything in Starter",
      "Up to 5 team members",
      "Client portal access",
      "Recurring invoices",
      "Advanced reports & analytics",
      "Priority support",
      "SLA monitoring",
      "API access",
    ],
    cta: "Start 14-Day Trial",
    popular: false,
    featured: true,
  },
  {
    name: "Business",
    price: "$99",
    period: "/month",
    description: "For growing agencies",
    features: [
      "Everything in Professional",
      "Unlimited team members",
      "White-label invoices",
      "Dedicated account manager",
      "Custom integrations",
      "Advanced security",
      "Custom contracts",
      "99.9% uptime SLA",
    ],
    cta: "Contact Sales",
    popular: false,
    featured: false,
  },
];

export function Pricing() {
  return (
    <div className="py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center rounded-full bg-green-50 px-4 py-1.5 text-sm font-medium text-green-700 ring-1 ring-inset ring-green-700/10 mb-4">
            <Check className="mr-1.5 h-3.5 w-3.5" />
            Transparent Pricing
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Start free, scale as you grow
          </h2>
          <p className="mt-6 text-lg text-gray-600 leading-relaxed">
            Choose the plan that fits your needs. All paid plans include a 14-day free trial.
            No credit card required to start.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-6 lg:max-w-none lg:grid-cols-4">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${
                plan.popular
                  ? "ring-2 ring-blue-500 shadow-xl scale-105 lg:scale-105"
                  : plan.featured
                  ? "ring-2 ring-purple-500 shadow-xl"
                  : "shadow-md"
              } hover:shadow-2xl transition-all duration-300 bg-white`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <span className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
                    MOST POPULAR
                  </span>
                </div>
              )}
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <span className="bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
                    BEST VALUE
                  </span>
                </div>
              )}

              <CardHeader className="text-center pb-6 pt-8">
                <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                <div className="mt-6">
                  <span className="text-5xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-gray-600 text-lg">{plan.period}</span>
                  )}
                </div>
                <CardDescription className="mt-3 text-base">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700 leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href={plan.name === "Business" ? "/support" : "/register"} className="block">
                  <Button
                    className={`w-full ${
                      plan.popular || plan.featured
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                        : ""
                    }`}
                    variant={plan.popular || plan.featured ? "default" : "outline"}
                    size="lg"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center space-y-3">
          <p className="text-sm text-gray-600">
            All paid plans include a 14-day free trial. No credit card required.
          </p>
          <p className="text-sm text-gray-500">
            Need a custom plan?{" "}
            <a href="/support" className="text-blue-600 hover:text-blue-700 font-medium">
              Contact our sales team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
