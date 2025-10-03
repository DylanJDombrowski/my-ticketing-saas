'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Clock, AlertTriangle, CheckCircle, XCircle, Settings } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { createBrowserClient } from '@/lib/supabase'
import { toast } from 'sonner'

interface SLARule {
  id: string
  client_id: string | null
  ticket_priority: 'low' | 'medium' | 'high' | 'urgent'
  response_time_hours: number | null
  resolution_time_hours: number | null
  is_active: boolean
  client?: {
    name: string
  }
}

interface SLAStatus {
  ticket_id: string
  ticket_title: string
  client_name: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  created_at: string
  response_time_hours: number | null
  resolution_time_hours: number | null
  time_since_created: number
  time_to_response: number | null
  response_sla_status: 'compliant' | 'at_risk' | 'breached' | 'n/a'
  resolution_sla_status: 'compliant' | 'at_risk' | 'breached' | 'n/a'
  response_progress: number
  resolution_progress: number
}

interface SLAMonitorProps {
  onManageRules?: () => void
}

export function SLAMonitor({ onManageRules }: SLAMonitorProps) {
  const { profile } = useAuthStore()
  const [slaRules, setSlaRules] = useState<SLARule[]>([])
  const [slaStatuses, setSlaStatuses] = useState<SLAStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total_tickets: 0,
    compliant: 0,
    at_risk: 0,
    breached: 0,
    compliance_rate: 0
  })

  const supabase = createBrowserClient()

  useEffect(() => {
    if (profile?.tenant_id) {
      loadSLAData()
    }
  }, [profile?.tenant_id])

  const loadSLAData = async () => {
    if (!profile?.tenant_id) return

    try {
      setLoading(true)

      // Load SLA rules
      const { data: rules, error: rulesError } = await supabase
        .from('sla_rules')
        .select(`
          *,
          client:clients(name)
        `)
        .eq('is_active', true)
        .order('ticket_priority', { ascending: false })

      if (rulesError) throw rulesError

      setSlaRules(rules || [])

      // Load tickets with SLA status calculation
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          id,
          title,
          priority,
          status,
          created_at,
          updated_at,
          client:clients(name)
        `)
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: true })

      if (ticketsError) throw ticketsError

      // Calculate SLA statuses
      const slaStatuses = calculateSLAStatuses(tickets || [], rules || [])
      setSlaStatuses(slaStatuses)

      // Calculate summary stats
      const stats = calculateSLAStats(slaStatuses)
      setStats(stats)

    } catch (error) {
      console.error('Error loading SLA data:', error)
      toast.error('Failed to load SLA monitoring data')
    } finally {
      setLoading(false)
    }
  }

  const calculateSLAStatuses = (tickets: any[], rules: SLARule[]): SLAStatus[] => {
    return tickets.map(ticket => {
      const now = new Date()
      const createdAt = new Date(ticket.created_at)
      const timeSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60) // hours

      // Find applicable SLA rule
      const rule = rules.find(r =>
        (r.client_id === ticket.client?.id || r.client_id === null) &&
        r.ticket_priority === ticket.priority
      ) || rules.find(r =>
        r.client_id === null && r.ticket_priority === ticket.priority
      )

      let responseProgress = 0
      let resolutionProgress = 0
      let responseSLAStatus: 'compliant' | 'at_risk' | 'breached' | 'n/a' = 'n/a'
      let resolutionSLAStatus: 'compliant' | 'at_risk' | 'breached' | 'n/a' = 'n/a'

      // Calculate response SLA status
      // Note: first_response_at tracking would require additional schema changes
      if (rule?.response_time_hours) {
        responseProgress = Math.min(100, (timeSinceCreated / rule.response_time_hours) * 100)
        if (responseProgress >= 100) {
          responseSLAStatus = 'breached'
        } else if (responseProgress >= 80) {
          responseSLAStatus = 'at_risk'
        } else {
          responseSLAStatus = 'compliant'
        }
      }

      // Calculate resolution SLA status
      // For open/in_progress tickets, check time since creation
      if (rule?.resolution_time_hours) {
        if (ticket.status === 'resolved' || ticket.status === 'closed') {
          // Use updated_at as proxy for resolution time
          const resolutionTime = (new Date(ticket.updated_at).getTime() - createdAt.getTime()) / (1000 * 60 * 60)
          resolutionSLAStatus = resolutionTime <= rule.resolution_time_hours ? 'compliant' : 'breached'
          resolutionProgress = 100
        } else {
          resolutionProgress = Math.min(100, (timeSinceCreated / rule.resolution_time_hours) * 100)
          if (resolutionProgress >= 100) {
            resolutionSLAStatus = 'breached'
          } else if (resolutionProgress >= 80) {
            resolutionSLAStatus = 'at_risk'
          } else {
            resolutionSLAStatus = 'compliant'
          }
        }
      }

      return {
        ticket_id: ticket.id,
        ticket_title: ticket.title,
        client_name: ticket.client?.name || 'Unknown',
        priority: ticket.priority,
        status: ticket.status,
        created_at: ticket.created_at,
        response_time_hours: rule?.response_time_hours || null,
        resolution_time_hours: rule?.resolution_time_hours || null,
        time_since_created: timeSinceCreated,
        time_to_response: ticket.first_response_at ?
          (new Date(ticket.first_response_at).getTime() - createdAt.getTime()) / (1000 * 60 * 60) :
          null,
        response_sla_status: responseSLAStatus,
        resolution_sla_status: resolutionSLAStatus,
        response_progress: responseProgress,
        resolution_progress: resolutionProgress
      }
    })
  }

  const calculateSLAStats = (statuses: SLAStatus[]) => {
    const total = statuses.length
    let compliant = 0
    let atRisk = 0
    let breached = 0

    statuses.forEach(status => {
      const overallStatus = getOverallSLAStatus(status)
      if (overallStatus === 'compliant') compliant++
      else if (overallStatus === 'at_risk') atRisk++
      else if (overallStatus === 'breached') breached++
    })

    return {
      total_tickets: total,
      compliant,
      at_risk: atRisk,
      breached,
      compliance_rate: total > 0 ? Math.round((compliant / total) * 100) : 100
    }
  }

  const getOverallSLAStatus = (status: SLAStatus): 'compliant' | 'at_risk' | 'breached' | 'n/a' => {
    const statuses = [status.response_sla_status, status.resolution_sla_status]
      .filter(s => s !== 'n/a')

    if (statuses.includes('breached')) return 'breached'
    if (statuses.includes('at_risk')) return 'at_risk'
    if (statuses.includes('compliant')) return 'compliant'
    return 'n/a'
  }

  const getSLABadgeVariant = (status: string) => {
    switch (status) {
      case 'compliant': return 'default'
      case 'at_risk': return 'secondary'
      case 'breached': return 'destructive'
      default: return 'outline'
    }
  }

  const getSLAIcon = (status: string) => {
    switch (status) {
      case 'compliant': return <CheckCircle className="h-4 w-4" />
      case 'at_risk': return <AlertTriangle className="h-4 w-4" />
      case 'breached': return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const formatTimeRemaining = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`
    } else if (hours < 24) {
      return `${Math.round(hours)}h`
    } else {
      return `${Math.round(hours / 24)}d`
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* SLA Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tickets</p>
                <p className="text-2xl font-bold">{stats.total_tickets}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Compliant</p>
                <p className="text-2xl font-bold text-green-600">{stats.compliant}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">At Risk</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.at_risk}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Breached</p>
                <p className="text-2xl font-bold text-red-600">{stats.breached}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>SLA Compliance Rate</CardTitle>
          <Button variant="outline" size="sm" onClick={onManageRules}>
            <Settings className="h-4 w-4 mr-2" />
            Manage Rules
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Compliance</span>
              <span className="font-medium">{stats.compliance_rate}%</span>
            </div>
            <Progress value={stats.compliance_rate} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Active Tickets SLA Status */}
      <Card>
        <CardHeader>
          <CardTitle>Active Tickets SLA Status</CardTitle>
        </CardHeader>
        <CardContent>
          {slaStatuses.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No active tickets to monitor
            </div>
          ) : (
            <div className="space-y-4">
              {slaStatuses.map(status => {
                const overallStatus = getOverallSLAStatus(status)
                return (
                  <div key={status.ticket_id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant={getSLABadgeVariant(overallStatus)}>
                          {getSLAIcon(overallStatus)}
                          <span className="ml-1 capitalize">{overallStatus}</span>
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {status.priority}
                        </Badge>
                        <span className="font-medium">{status.ticket_title}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {status.client_name}
                      </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Response SLA */}
                      {status.response_time_hours && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Response SLA</span>
                            <span className="font-medium">
                              {status.time_to_response ?
                                `Responded in ${formatTimeRemaining(status.time_to_response)}` :
                                `${formatTimeRemaining(status.response_time_hours - status.time_since_created)} remaining`
                              }
                            </span>
                          </div>
                          <Progress
                            value={status.response_progress}
                            className={`h-2 ${
                              status.response_sla_status === 'breached' ? 'bg-red-100' :
                              status.response_sla_status === 'at_risk' ? 'bg-yellow-100' :
                              'bg-green-100'
                            }`}
                          />
                        </div>
                      )}

                      {/* Resolution SLA */}
                      {status.resolution_time_hours && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Resolution SLA</span>
                            <span className="font-medium">
                              {formatTimeRemaining(status.resolution_time_hours - status.time_since_created)} remaining
                            </span>
                          </div>
                          <Progress
                            value={status.resolution_progress}
                            className={`h-2 ${
                              status.resolution_sla_status === 'breached' ? 'bg-red-100' :
                              status.resolution_sla_status === 'at_risk' ? 'bg-yellow-100' :
                              'bg-green-100'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SLA Rules Summary */}
      {slaRules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active SLA Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {slaRules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">
                      {rule.ticket_priority}
                    </Badge>
                    <span className="text-sm">
                      {rule.client?.name || 'All Clients'}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {rule.response_time_hours && `Response: ${rule.response_time_hours}h`}
                    {rule.response_time_hours && rule.resolution_time_hours && ' • '}
                    {rule.resolution_time_hours && `Resolution: ${rule.resolution_time_hours}h`}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}