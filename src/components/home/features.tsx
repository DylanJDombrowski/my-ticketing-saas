import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  Clock,
  FileText,
  CreditCard,
  Bell,
  Shield,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Professional Invoices",
    description:
      "Beautiful PDF invoices that look great and get paid. Create one in under 60 seconds.",
  },
  {
    icon: CreditCard,
    title: "Stripe Payments",
    description:
      "Connect your Stripe account. Clients pay with one click. Money goes straight to you.",
  },
  {
    icon: Bell,
    title: "Payment Reminders",
    description:
      "One-click reminders for overdue invoices. No awkward follow-up emails needed.",
  },
  {
    icon: Clock,
    title: "Optional Time Tracking",
    description:
      "Track billable hours if you want. Or just create invoices directly. Your choice.",
  },
  {
    icon: Users,
    title: "Client Management",
    description:
      "Keep track of your clients and their contact info. Simple and organized.",
  },
  {
    icon: Shield,
    title: "Secure & Reliable",
    description:
      "Bank-level security. Your data is encrypted and backed up. Always.",
  },
];

export function Features() {
  return (
    <div className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center rounded-full bg-purple-50 px-4 py-1.5 text-sm font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10 mb-4">
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Simple & Powerful
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Everything you need. Nothing you don&apos;t.
          </h2>
          <p className="mt-6 text-lg text-gray-600 leading-relaxed">
            Billable focuses on getting you paid fast. Create invoices, accept payments,
            and track what matters—without the bloat.
          </p>
        </div>

        <div className="mx-auto mt-20 grid max-w-2xl grid-cols-1 gap-6 lg:max-w-none lg:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white"
            >
              <CardHeader>
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="mt-6 text-xl font-bold">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed text-gray-600">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
