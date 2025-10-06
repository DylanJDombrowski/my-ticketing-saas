import React from 'react';
import Link from 'next/link';

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Support Center</h1>
          <p className="text-xl text-gray-600">We&apos;re here to help you get the most out of Billable</p>
        </div>

        {/* Contact Section */}
        <section className="bg-white rounded-lg shadow-md p-8 mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Support</h2>
          <div className="space-y-4">
            <p className="text-gray-700 leading-relaxed">
              Have a question or need assistance? Our support team is ready to help.
            </p>
            <div className="flex items-center space-x-3 text-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <a href="mailto:support@trybillable.com" className="text-blue-600 hover:text-blue-700 font-medium">
                support@trybillable.com
              </a>
            </div>
            <p className="text-gray-600 text-sm">
              We typically respond within 24 hours during business days.
            </p>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-semibold text-gray-900 mb-8 text-center">Frequently Asked Questions</h2>

          <div className="space-y-6">
            {/* General Questions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">?</span>
                Getting Started
              </h3>

              <div className="space-y-4 ml-11">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">How do I create my first invoice?</h4>
                  <p className="text-gray-700">
                    After signing up, navigate to the Invoices section in your dashboard. Click &quot;Create Invoice&quot; and fill in your client details, add line items or import from time entries, and send it directly to your client.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Can I try Billable for free?</h4>
                  <p className="text-gray-700">
                    Yes! Our free tier allows you to create and send 1 invoice per month. This is perfect for trying out the platform and seeing if it fits your needs.
                  </p>
                </div>
              </div>
            </div>

            {/* Billing & Subscriptions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="bg-green-100 text-green-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">$</span>
                Billing & Subscriptions
              </h3>

              <div className="space-y-4 ml-11">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">How do I upgrade my plan?</h4>
                  <p className="text-gray-700">
                    Visit your Account Settings and click on &quot;Billing & Plans.&quot; You can upgrade, downgrade, or cancel your subscription at any time. Changes take effect at the start of your next billing cycle.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">What payment methods do you accept?</h4>
                  <p className="text-gray-700">
                    We accept all major credit cards (Visa, MasterCard, American Express, Discover) and process payments securely through our payment provider.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Can I cancel my subscription?</h4>
                  <p className="text-gray-700">
                    Yes, you can cancel anytime from your account settings. You&apos;ll continue to have access until the end of your current billing period, and you can export your data before canceling.
                  </p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="bg-purple-100 text-purple-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">✓</span>
                Features & Functionality
              </h3>

              <div className="space-y-4 ml-11">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Can I track time for multiple clients?</h4>
                  <p className="text-gray-700">
                    Absolutely! Billable allows you to manage unlimited clients, create tickets for each client, and track time entries against specific tickets. All time entries can be converted into invoices.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Does Billable support recurring invoices?</h4>
                  <p className="text-gray-700">
                    Yes, you can set up recurring invoices for retainer clients or subscription services. Configure the frequency (weekly, monthly, quarterly, annually) and Billable will automatically generate and send them.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Can I customize my invoices?</h4>
                  <p className="text-gray-700">
                    Yes! You can customize invoice templates with your logo, brand colors, payment terms, and custom notes. You can also configure different payment methods for your clients.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">How does the ticketing system work?</h4>
                  <p className="text-gray-700">
                    Create tickets for client requests or projects, assign them statuses (Open, In Progress, Resolved, Closed), track time against them, and convert billable hours into invoices—all in one platform.
                  </p>
                </div>
              </div>
            </div>

            {/* Security & Data */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">🔒</span>
                Security & Data
              </h3>

              <div className="space-y-4 ml-11">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Is my data secure?</h4>
                  <p className="text-gray-700">
                    Yes. We use industry-standard encryption (SSL/TLS) for all data in transit and at rest. Your data is stored in secure, SOC 2 compliant data centers with regular backups.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Can I export my data?</h4>
                  <p className="text-gray-700">
                    Yes, you can export all your data (clients, tickets, time entries, invoices) at any time in CSV or PDF format. You own your data and can take it with you.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Do you comply with GDPR?</h4>
                  <p className="text-gray-700">
                    Yes, Billable is GDPR compliant. We provide data processing agreements, allow data export/deletion, and maintain transparent privacy practices. See our{' '}
                    <a href="/privacy-policy" className="text-blue-600 hover:text-blue-700">Privacy Policy</a> for details.
                  </p>
                </div>
              </div>
            </div>

            {/* Integrations */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="bg-yellow-100 text-yellow-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">⚡</span>
                Integrations & API
              </h3>

              <div className="space-y-4 ml-11">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Does Billable have an API?</h4>
                  <p className="text-gray-700">
                    API access is available on Business and Enterprise plans. Our RESTful API allows you to integrate Billable with your existing tools and workflows.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">What integrations are available?</h4>
                  <p className="text-gray-700">
                    We&apos;re actively building integrations with popular tools. Contact us at{' '}
                    <a href="mailto:support@trybillable.com" className="text-blue-600 hover:text-blue-700">
                      support@trybillable.com
                    </a>{' '}
                    to request specific integrations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Still Need Help */}
        <section className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-8 text-center text-white">
          <h2 className="text-2xl font-semibold mb-4">Still Need Help?</h2>
          <p className="text-blue-100 mb-6">
            Can&apos;t find the answer you&apos;re looking for? Our support team is here to help.
          </p>
          <a
            href="mailto:support@trybillable.com"
            className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            Contact Support
          </a>
        </section>

        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
          <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
