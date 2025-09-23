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
    icon: Ticket,
    title: "Smart Ticket Management",
    description:
      "Create, assign, and track support tickets with priority levels, due dates, and status updates.",
  },
  {
    icon: Users,
    title: "Client Management",
    description:
      "Organize client information, track communication history, and manage multiple accounts seamlessly.",
  },
  {
    icon: Clock,
    title: "Time Tracking",
    description:
      "Log billable and non-billable hours with detailed descriptions and automatic ticket integration.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description:
      "Get insights into team performance, client activity, and time allocation with detailed reporting.",
  },
  {
    icon: Shield,
    title: "Multi-Tenant Security",
    description:
      "Enterprise-grade security with isolated tenant data and role-based access controls.",
  },
  {
    icon: Zap,
    title: "Real-Time Updates",
    description:
      "Stay synchronized with live updates, notifications, and collaborative features.",
  },
  {
    icon: Calendar,
    title: "Due Date Management",
    description:
      "Never miss deadlines with automatic reminders and overdue ticket tracking.",
  },
  {
    icon: MessageSquare,
    title: "Team Collaboration",
    description:
      "Comment on tickets, mention team members, and keep everyone in the loop.",
  },
  {
    icon: Target,
    title: "Priority Management",
    description:
      "Organize work by priority levels and ensure critical issues get immediate attention.",
  },
];

export function Features() {
  return (
    <div className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Everything you need to deliver great support
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Powerful features designed to streamline your workflow and improve
            customer satisfaction.
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
