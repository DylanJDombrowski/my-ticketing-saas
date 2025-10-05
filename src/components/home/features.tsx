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
    title: "Project & Ticket Tracking",
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
      "Give clients secure access to view their invoices, tickets, and payment history.",
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
    <div className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Everything you need to run your business
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Powerful features designed to help you track time, manage clients, and get paid faster.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="mt-4 text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
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
