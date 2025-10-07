import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Ticket,
  Users,
  Clock,
  BarChart3,
  Shield,
  Zap,
  Calendar,
  MessageSquare,
  Target,
} from "lucide-react";

const features = [
  {
    icon: Clock,
    title: "Smart Time Tracking",
    description:
      "Track billable hours with a built-in timer, detailed descriptions, and automatic project integration.",
  },
  {
    icon: Users,
    title: "Client Management",
    description:
      "Organize client information, track communication history, and manage multiple accounts seamlessly.",
  },
  {
    icon: Ticket,
    title: "Project & Task Tracking",
    description:
      "Create and track work items with priority levels, due dates, and status updates for complete visibility.",
  },
  {
    icon: BarChart3,
    title: "Professional Invoicing",
    description:
      "Generate beautiful PDF invoices from tracked time, accept online payments, and get paid faster.",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description:
      "Enterprise-grade security with isolated data and role-based access controls for your team.",
  },
  {
    icon: Zap,
    title: "Accept Payments",
    description:
      "Connect your Stripe account and let clients pay invoices instantly with credit cards.",
  },
  {
    icon: Calendar,
    title: "Reports & Analytics",
    description:
      "Get insights into billable hours, revenue trends, and client profitability with detailed reporting.",
  },
  {
    icon: MessageSquare,
    title: "Client Portal",
    description:
      "Give clients secure access to view their invoices, tasks, and payment history.",
  },
  {
    icon: Target,
    title: "SLA Monitoring",
    description:
      "Set service level agreements and get automatic alerts when response times are at risk.",
  },
];

export function Features() {
  return (
    <div className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center rounded-full bg-purple-50 px-4 py-1.5 text-sm font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10 mb-4">
            <Target className="mr-1.5 h-3.5 w-3.5" />
            Powerful Features
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Everything you need to run your business
          </h2>
          <p className="mt-6 text-lg text-gray-600 leading-relaxed">
            From time tracking to invoicing, Billable has all the tools you need to manage
            clients, track billable hours, and get paid faster—all in one streamlined platform.
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
