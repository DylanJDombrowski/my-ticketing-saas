"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  Shield,
} from "lucide-react";

interface ClientInfo {
  id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  address?: string;
  tenant: {
    id: string;
    name: string;
    email: string;
    company_name?: string;
  };
}

interface PortalInfo {
  token: string;
  expires_at: string | null;
  last_accessed: string;
}

interface ClientPortalLayoutProps {
  client: ClientInfo;
  portal_info: PortalInfo;
  children: React.ReactNode;
}

export function ClientPortalLayout({
  client,
  portal_info,
  children,
}: ClientPortalLayoutProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const isExpiringSoon = () => {
    if (!portal_info.expires_at) return false;
    const expiryDate = new Date(portal_info.expires_at);
    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 7;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Building2 className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {client.tenant.company_name || client.tenant.name}
                  </h1>
                  <p className="text-sm text-gray-500">Client Portal</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {client.name}
                </p>
                <p className="text-xs text-gray-500">{client.email}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Client Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{client.name}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{client.email}</span>
                  </div>

                  {client.company && (
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{client.company}</span>
                    </div>
                  )}

                  {client.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{client.phone}</span>
                    </div>
                  )}

                  {client.address && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{client.address}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Portal Access Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Portal Access
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Last accessed</p>
                      <p className="text-sm">
                        {formatDateTime(portal_info.last_accessed)}
                      </p>
                    </div>
                  </div>

                  {portal_info.expires_at && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500">Access expires</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm">
                            {formatDate(portal_info.expires_at)}
                          </p>
                          {isExpiringSoon() && (
                            <Badge variant="destructive" className="text-xs">
                              Expires Soon
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Support Contact */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Need Help?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">
                    Contact our support team for assistance:
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <a
                        href={`mailto:${client.tenant.email}`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {client.tenant.email}
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">{children}</div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>
              © 2025 {client.tenant.company_name || client.tenant.name}. All
              rights reserved.
            </p>
            <p className="mt-1">
              Powered by {client.tenant.company_name || client.tenant.name}{" "}
              Client Portal
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
