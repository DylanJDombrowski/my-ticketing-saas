'use client'

import { useState } from 'react'
import { SLAMonitor } from '@/components/sla-monitor'
import { SLARulesModal } from '@/components/modals/sla-rules-modal'

export default function SLAPage() {
  const [showRulesModal, setShowRulesModal] = useState(false)

  const handleManageRules = () => {
    setShowRulesModal(true)
  }

  const handleRulesModalClose = () => {
    setShowRulesModal(false)
  }

  const handleRulesSuccess = () => {
    // The SLAMonitor component will automatically refresh when rules change
    // because it loads data on mount and when the modal closes
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">SLA Monitoring</h1>
        <p className="text-muted-foreground">
          Monitor service level agreements and track ticket response and resolution times
        </p>
      </div>

      <SLAMonitor onManageRules={handleManageRules} />

      <SLARulesModal
        open={showRulesModal}
        onClose={handleRulesModalClose}
        onSuccess={handleRulesSuccess}
      />
    </div>
  )
}